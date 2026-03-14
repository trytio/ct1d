import { NextRequest, NextResponse } from "next/server";
import cureApproaches from "@/data/cure-approaches.json";
import type { CureApproach, Category } from "@/types/cure-approach";

const approaches = cureApproaches as CureApproach[];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") as Category | null;

  let filtered = approaches;

  if (category) {
    const validCategories: Category[] = [
      "stem_cell",
      "immunotherapy",
      "gene_editing",
      "beta_cell_regeneration",
      "encapsulation",
      "combination",
      "artificial_pancreas",
    ];

    if (!validCategories.includes(category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Valid values: ${validCategories.join(", ")}`,
        },
        { status: 400 }
      );
    }

    filtered = approaches.filter((a) => a.category === category);
  }

  return NextResponse.json({ approaches: filtered });
}
