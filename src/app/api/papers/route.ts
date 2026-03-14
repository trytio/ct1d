import { getPapers, getPaper } from "@/lib/autonomous/memory";
import { generatePaperForTopic } from "@/lib/autonomous/researcher";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const id = url.searchParams.get("id");

    // If a specific paper ID is requested
    if (id) {
      const paper = await getPaper(id);
      if (!paper) {
        return NextResponse.json(
          { error: "Paper not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ paper });
    }

    // List all papers, optionally filtered by status
    let papers = await getPapers();

    if (status) {
      papers = papers.filter((p) => p.status === status);
    }

    return NextResponse.json({
      papers: papers.map((p) => ({
        id: p.id,
        title: p.title,
        abstract: p.abstract,
        status: p.status,
        version: p.version,
        category: p.category,
        certaintyLevel: p.certaintyLevel,
        sectionsCount: p.sections.length,
        citationsCount: p.citations.length,
        limitations: p.limitations,
        hypothesisIds: p.hypothesisIds,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        reviewHistory: p.reviewHistory,
      })),
      total: papers.length,
    });
  } catch (error) {
    console.error("[DiaCure] Papers list failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to retrieve papers",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, category } = body as {
      topic?: string;
      category?: string;
    };

    if (!topic || !category) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: "topic" and "category". Example: {"topic": "DYRK1A inhibitors for beta cell regeneration", "category": "beta_cell_regeneration"}',
        },
        { status: 400 }
      );
    }

    const validCategories = [
      "stem_cell",
      "immunotherapy",
      "gene_editing",
      "beta_cell_regeneration",
      "encapsulation",
      "combination",
    ];

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        {
          error: `Invalid category "${category}". Must be one of: ${validCategories.join(", ")}`,
        },
        { status: 400 }
      );
    }

    console.log(
      `[DiaCure] Generating paper for topic: "${topic}" (${category})`
    );
    const paper = await generatePaperForTopic(topic, category);

    if (!paper) {
      return NextResponse.json(
        { error: "Failed to generate paper. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      paper: {
        id: paper.id,
        title: paper.title,
        abstract: paper.abstract,
        status: paper.status,
        version: paper.version,
        category: paper.category,
        certaintyLevel: paper.certaintyLevel,
        sectionsCount: paper.sections.length,
        citationsCount: paper.citations.length,
        createdAt: paper.createdAt,
      },
    });
  } catch (error) {
    console.error("[DiaCure] Paper generation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Paper generation failed",
      },
      { status: 500 }
    );
  }
}
