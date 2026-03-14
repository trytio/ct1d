import { NextRequest, NextResponse } from "next/server";
import { searchPubMed } from "@/lib/pubmed";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("query");
  const maxResults = Number(searchParams.get("maxResults") ?? "10");

  if (!query) {
    return NextResponse.json(
      { error: "Missing required query parameter: query" },
      { status: 400 }
    );
  }

  if (maxResults < 1 || maxResults > 100) {
    return NextResponse.json(
      { error: "maxResults must be between 1 and 100" },
      { status: 400 }
    );
  }

  try {
    const articles = await searchPubMed(query, maxResults);

    return NextResponse.json({
      articles,
      totalCount: articles.length,
    });
  } catch (error) {
    console.error("PubMed search error:", error);
    return NextResponse.json(
      { error: "Failed to search PubMed. Please try again later." },
      { status: 502 }
    );
  }
}
