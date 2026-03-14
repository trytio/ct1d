import {
  getMemoryStats,
  getHypotheses,
  getSessions,
  getPapers,
} from "@/lib/autonomous/memory";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [stats, hypotheses, recentSessions, papers] = await Promise.all([
      getMemoryStats(),
      getHypotheses(),
      getSessions(5),
      getPapers(),
    ]);

    // Hypothesis breakdown by status
    const hypothesisByStatus = {
      active: hypotheses.filter((h) => h.status === "active").length,
      promising: hypotheses.filter((h) => h.status === "promising").length,
      needs_evidence: hypotheses.filter((h) => h.status === "needs_evidence")
        .length,
      disproven: hypotheses.filter((h) => h.status === "disproven").length,
      validated: hypotheses.filter((h) => h.status === "validated").length,
    };

    // Top hypotheses by confidence
    const topHypotheses = [...hypotheses]
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map((h) => ({
        id: h.id,
        title: h.title,
        confidence: h.confidence,
        status: h.status,
        category: h.category,
        iterations: h.iterations,
        evidenceCount: (h.evidence ?? []).length,
      }));

    // Focus areas (from recent sessions)
    const focusAreas = recentSessions.map((s) => ({
      focus: s.focus,
      approach: s.approach,
      cycleNumber: s.cycleNumber,
      timestamp: s.timestamp,
    }));

    // Paper stats
    const papersByStatus = {
      draft: papers.filter((p) => p.status === "draft").length,
      in_review: papers.filter((p) => p.status === "in_review").length,
      published: papers.filter((p) => p.status === "published").length,
    };

    // Last session details
    const lastSession = recentSessions[0] ?? null;

    return NextResponse.json({
      overview: {
        totalHypotheses: hypotheses.length,
        hypothesisByStatus,
        totalSessions: stats.sessions,
        totalPapers: papers.length,
        papersByStatus,
        totalKnowledgeEntries: stats.knowledgeEntries,
        lastSessionTimestamp: stats.lastSession,
      },
      topHypotheses,
      currentFocusAreas: focusAreas,
      lastSession: lastSession
        ? {
            id: lastSession.id,
            cycleNumber: lastSession.cycleNumber,
            focus: lastSession.focus,
            approach: lastSession.approach,
            findings: lastSession.findings,
            hypothesesUpdated: lastSession.hypothesesUpdated.length,
            hypothesesCreated: lastSession.hypothesesCreated.length,
            papersUpdated: lastSession.papersUpdated.length,
            duration: lastSession.duration,
            tokensUsed: lastSession.tokensUsed,
            summary: lastSession.summary,
            timestamp: lastSession.timestamp,
          }
        : null,
      papers: papers.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        version: p.version,
        category: p.category,
        certaintyLevel: p.certaintyLevel,
        sectionsCount: p.sections.length,
        citationsCount: p.citations.length,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    console.error("[DiaCure] Status endpoint failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve status",
      },
      { status: 500 }
    );
  }
}
