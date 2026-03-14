import { refreshDataSources } from "@/lib/autonomous/refresher";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 minute timeout for data refresh

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
    console.log("[DiaCure] Starting 12-hour data refresh...");
    const result = await refreshDataSources();
    console.log(
      `[DiaCure] Data refresh completed: ${result.newArticles} articles, ${result.updatedTrials} trials`
    );

    return NextResponse.json({
      success: true,
      result: {
        newArticles: result.newArticles,
        updatedTrials: result.updatedTrials,
        newApproaches: result.newApproaches,
        categorySummaries: result.categorySummaries,
        trialsSummary: result.trialsSummary,
        summary: result.summary,
      },
    });
  } catch (error) {
    console.error("[DiaCure] Data refresh failed:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Data refresh failed",
      },
      { status: 500 }
    );
  }
}
