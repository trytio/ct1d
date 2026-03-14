import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { openai } from "@/lib/openai";

export async function POST(request: NextRequest) {
  let body: { title?: string; abstract?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { title, abstract } = body;

  if (!title || !abstract) {
    return NextResponse.json(
      { error: "Missing required fields: title, abstract" },
      { status: 400 }
    );
  }

  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      system:
        "You are a medical research translator. Summarize this T1D research in 2-3 sentences that a parent of a newly diagnosed child could understand. Focus on what it means for a cure. Be honest — don't overpromise.",
      prompt: `Title: ${title}\n\nAbstract: ${abstract}`,
    });

    return NextResponse.json({ summary: text });
  } catch (error) {
    console.error("Summarization error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary. Please try again later." },
      { status: 502 }
    );
  }
}
