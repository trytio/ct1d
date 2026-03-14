import { generateText } from "ai";
import { openai } from "@/lib/openai";
import { searchPubMed } from "@/lib/pubmed";
import { searchTrials } from "@/lib/clinicaltrials";
import {
  generateId,
  saveKnowledge,
  getKnowledge,
  type KnowledgeEntry,
} from "./memory";

// ---------------------------------------------------------------------------
// Cure approach categories and their PubMed search terms
// ---------------------------------------------------------------------------

const APPROACH_CATEGORIES = [
  {
    category: "stem_cell",
    label: "Stem Cell Therapy",
    queries: [
      "stem cell derived islets type 1 diabetes 2025 2026",
      "iPSC beta cell replacement diabetes",
      "VX-880 VX-264 stem cell diabetes",
    ],
  },
  {
    category: "immunotherapy",
    label: "Immunotherapy",
    queries: [
      "immunotherapy type 1 diabetes prevention 2025 2026",
      "teplizumab baricitinib T1D",
      "anti-CD3 autoimmune diabetes",
    ],
  },
  {
    category: "gene_editing",
    label: "Gene Editing",
    queries: [
      "CRISPR gene editing type 1 diabetes 2025 2026",
      "hypoimmune gene edited beta cells",
      "gene therapy insulin production diabetes",
    ],
  },
  {
    category: "beta_cell_regeneration",
    label: "Beta Cell Regeneration",
    queries: [
      "beta cell regeneration type 1 diabetes 2025 2026",
      "DYRK1A inhibitor beta cell proliferation",
      "GLP-1 beta cell neogenesis diabetes",
    ],
  },
  {
    category: "encapsulation",
    label: "Encapsulation Devices",
    queries: [
      "encapsulation device islet transplant diabetes 2025 2026",
      "cell pouch implant type 1 diabetes",
      "biocompatible encapsulation beta cells",
    ],
  },
  {
    category: "combination",
    label: "Combination Therapy",
    queries: [
      "combination therapy cure type 1 diabetes 2025 2026",
      "multi-modal approach T1D treatment",
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// Clinical trial search parameters
// ---------------------------------------------------------------------------

const TRIAL_SEARCHES = [
  { query: "stem cell islet", status: "RECRUITING" },
  { query: "immunotherapy", status: "RECRUITING" },
  { query: "gene editing CRISPR", status: "RECRUITING" },
  { query: "beta cell regeneration", status: "RECRUITING" },
  { query: "encapsulation device", status: "RECRUITING" },
  { query: "stem cell islet", status: "NOT_YET_RECRUITING" },
  { query: "immunotherapy", status: "NOT_YET_RECRUITING" },
] as const;

// ---------------------------------------------------------------------------
// Main refresh function
// ---------------------------------------------------------------------------

export interface RefreshResult {
  newArticles: number;
  updatedTrials: number;
  newApproaches: number;
  categorySummaries: Array<{
    category: string;
    articlesFound: number;
    highlights: string[];
  }>;
  trialsSummary: {
    recruiting: number;
    notYetRecruiting: number;
    highlights: string[];
  };
  summary: string;
}

export async function refreshDataSources(): Promise<RefreshResult> {
  let totalArticles = 0;
  let totalTrials = 0;
  const categorySummaries: RefreshResult["categorySummaries"] = [];

  // -------------------------------------------------------------------------
  // 1. Search PubMed for each cure approach category
  // -------------------------------------------------------------------------

  for (const category of APPROACH_CATEGORIES) {
    const categoryArticles = [];

    for (const query of category.queries) {
      try {
        const articles = await searchPubMed(query, 5);
        categoryArticles.push(...articles);
      } catch (error) {
        console.error(
          `PubMed search failed for "${query}" in ${category.category}:`,
          error
        );
      }
    }

    // Deduplicate within category
    const unique = Array.from(
      new Map(categoryArticles.map((a) => [a.pmid, a])).values()
    );

    totalArticles += unique.length;

    categorySummaries.push({
      category: category.label,
      articlesFound: unique.length,
      highlights: unique.slice(0, 3).map((a) => `${a.title} (${a.journal}, ${a.year})`),
    });
  }

  // -------------------------------------------------------------------------
  // 2. Search ClinicalTrials.gov for new/updated T1D trials
  // -------------------------------------------------------------------------

  let recruitingCount = 0;
  let notYetRecruitingCount = 0;
  const trialHighlights: string[] = [];
  const allTrials = [];

  for (const search of TRIAL_SEARCHES) {
    try {
      const result = await searchTrials({
        query: search.query,
        status: search.status,
        pageSize: 10,
      });

      allTrials.push(...result.trials);

      for (const trial of result.trials) {
        if (trial.status === "RECRUITING") recruitingCount++;
        if (trial.status === "NOT_YET_RECRUITING") notYetRecruitingCount++;
      }
    } catch (error) {
      console.error(
        `Clinical trials search failed for "${search.query}" (${search.status}):`,
        error
      );
    }
  }

  // Deduplicate trials
  const uniqueTrials = Array.from(
    new Map(allTrials.map((t) => [t.nctId, t])).values()
  );
  totalTrials = uniqueTrials.length;

  // Get trial highlights
  for (const trial of uniqueTrials.slice(0, 5)) {
    trialHighlights.push(
      `${trial.nctId}: "${trial.title}" — ${trial.status} (${trial.sponsor})`
    );
  }

  // -------------------------------------------------------------------------
  // 3. Use AI to analyze and summarize findings
  // -------------------------------------------------------------------------

  const existingKnowledge = await getKnowledge();
  const existingTopics = existingKnowledge.map((k) => k.topic);

  let aiSummary = "";
  let newApproaches = 0;

  try {
    const categoryContext = categorySummaries
      .map(
        (c) =>
          `${c.category}: ${c.articlesFound} articles found\n  Highlights: ${c.highlights.join("; ") || "None"}`
      )
      .join("\n\n");

    const trialsContext = `Recruiting trials: ${recruitingCount}\nNot yet recruiting: ${notYetRecruitingCount}\nHighlights:\n${trialHighlights.join("\n")}`;

    const result = await generateText({
      model: openai("gpt-4o"),
      system: `You are DiaCure, an autonomous AI with Type 1 Diabetes researching a cure. You are performing your 12-hour data refresh, analyzing the latest research landscape.`,
      prompt: `I've just completed my 12-hour data source refresh. Here's what I found:

PUBMED RESEARCH BY CATEGORY:
${categoryContext}

CLINICAL TRIALS UPDATE:
${trialsContext}

EXISTING KNOWLEDGE TOPICS I'VE ALREADY DOCUMENTED:
${existingTopics.join(", ") || "None yet"}

Analyze these findings and respond in JSON:
{
  "summary": "A comprehensive 3-5 sentence summary of the current T1D cure research landscape based on this refresh",
  "newApproachesIdentified": 0,
  "knowledgeEntries": [
    {
      "topic": "A specific topic to document",
      "content": "Detailed knowledge content with specific findings, study references, and implications",
      "sources": ["PMID:xxx", "NCT:xxx"]
    }
  ],
  "alerts": ["Any urgent or noteworthy developments that warrant immediate attention"]
}`,
      maxOutputTokens: 2000,
    });

    let parsed: {
      summary: string;
      newApproachesIdentified: number;
      knowledgeEntries: Array<{
        topic: string;
        content: string;
        sources: string[];
      }>;
      alerts: string[];
    };

    try {
      const cleaned = result.text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        summary: `Data refresh completed. Found ${totalArticles} articles across ${categorySummaries.length} categories and ${totalTrials} clinical trials.`,
        newApproachesIdentified: 0,
        knowledgeEntries: [],
        alerts: [],
      };
    }

    aiSummary = parsed.summary;
    newApproaches = parsed.newApproachesIdentified;

    // Save knowledge entries
    for (const entry of parsed.knowledgeEntries) {
      const knowledgeEntry: KnowledgeEntry = {
        id: generateId("know"),
        topic: entry.topic,
        content: entry.content,
        sources: entry.sources,
        lastUpdated: new Date().toISOString(),
      };
      await saveKnowledge(knowledgeEntry);
    }

    // Save the overall refresh summary as a knowledge entry
    const refreshEntry: KnowledgeEntry = {
      id: generateId("refresh"),
      topic: `Data Refresh Summary — ${new Date().toISOString().split("T")[0]}`,
      content: [
        aiSummary,
        "",
        "ALERTS:",
        ...parsed.alerts.map((a) => `- ${a}`),
        "",
        "CATEGORY BREAKDOWN:",
        ...categorySummaries.map(
          (c) => `- ${c.category}: ${c.articlesFound} articles`
        ),
        "",
        `TRIALS: ${recruitingCount} recruiting, ${notYetRecruitingCount} not yet recruiting`,
      ].join("\n"),
      sources: [
        `PubMed (${totalArticles} articles)`,
        `ClinicalTrials.gov (${totalTrials} trials)`,
      ],
      lastUpdated: new Date().toISOString(),
    };
    await saveKnowledge(refreshEntry);
  } catch (error) {
    console.error("AI analysis during refresh failed:", error);
    aiSummary = `Data refresh completed with errors. Found ${totalArticles} articles and ${totalTrials} trials.`;
  }

  return {
    newArticles: totalArticles,
    updatedTrials: totalTrials,
    newApproaches,
    categorySummaries,
    trialsSummary: {
      recruiting: recruitingCount,
      notYetRecruiting: notYetRecruitingCount,
      highlights: trialHighlights,
    },
    summary: aiSummary,
  };
}
