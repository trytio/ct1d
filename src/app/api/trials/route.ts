import { NextRequest, NextResponse } from "next/server";
import { searchTrials } from "@/lib/clinicaltrials";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const query = searchParams.get("query") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const phase = searchParams.get("phase") ?? undefined;
  const pageSizeParam = searchParams.get("pageSize");
  const pageToken = searchParams.get("pageToken") ?? undefined;

  const pageSize = pageSizeParam ? Number(pageSizeParam) : 20;

  if (pageSize < 1 || pageSize > 100) {
    return NextResponse.json(
      { error: "pageSize must be between 1 and 100" },
      { status: 400 }
    );
  }

  try {
    const result = await searchTrials({
      query,
      status,
      phase,
      pageSize,
      pageToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("ClinicalTrials.gov search error:", error);
    return NextResponse.json(
      { error: "Failed to search clinical trials. Please try again later." },
      { status: 502 }
    );
  }
}
