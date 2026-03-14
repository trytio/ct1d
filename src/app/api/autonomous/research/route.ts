import { runResearchCycle } from "@/lib/autonomous/researcher";
import { getMemoryStats, getSessions } from "@/lib/autonomous/memory";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 minute timeout for research cycle

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.AUTONOMOUS_SECRET;

  // In development or if no secret is configured, allow all requests
  if (!secret || process.env.NODE_ENV === "development") {
    return true;
  }

  // Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  // Check query parameter (for Vercel Cron)
  const url = new URL(req.url);
  if (url.searchParams.get("secret") === secret) {
    return true;
  }

  // Vercel Cron sends CRON_SECRET in the Authorization header
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[DiaCure] Starting research cycle...");
    const session = await runResearchCycle();
    console.log(
      `[DiaCure] Research cycle #${session.cycleNumber} completed in ${session.duration}ms`
    );

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        cycleNumber: session.cycleNumber,
        focus: session.focus,
        approach: session.approach,
        findings: session.findings,
        hypothesesUpdated: session.hypothesesUpdated.length,
        hypothesesCreated: session.hypothesesCreated.length,
        papersUpdated: session.papersUpdated.length,
        duration: session.duration,
        tokensUsed: session.tokensUsed,
        summary: session.summary,
        timestamp: session.timestamp,
      },
    });
  } catch (error) {
    console.error("[DiaCure] Research cycle failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Research cycle failed",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const [stats, recentSessions] = await Promise.all([
      getMemoryStats(),
      getSessions(1),
    ]);

    const lastSession = recentSessions[0] ?? null;

    return NextResponse.json({
      status: "ready",
      stats,
      lastSession: lastSession
        ? {
            id: lastSession.id,
            cycleNumber: lastSession.cycleNumber,
            focus: lastSession.focus,
            summary: lastSession.summary,
            timestamp: lastSession.timestamp,
            duration: lastSession.duration,
          }
        : null,
    });
  } catch (error) {
    console.error("[DiaCure] Status check failed:", error);
    return NextResponse.json(
      {
        status: "error",
        error:
          error instanceof Error ? error.message : "Status check failed",
      },
      { status: 500 }
    );
  }
}
