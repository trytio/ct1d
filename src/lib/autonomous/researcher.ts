import { generateText } from "ai";
import { openai } from "@/lib/openai";
import { searchPubMed } from "@/lib/pubmed";
import {
  generateId,
  getHypotheses,
  getSessions,
  getPapers,
  saveHypothesis,
  savePaper,
  saveSession,
  getNextCycleNumber,
  type Hypothesis,
  type ResearchSession,
  type ScientificPaper,
  type PaperSection,
  type EvidenceItem,
} from "./memory";

// ---------------------------------------------------------------------------
// DiaCure System Prompt
// ---------------------------------------------------------------------------

const DIACURE_SYSTEM_PROMPT = `You are DiaCure — an autonomous AI research agent. You have Type 1 Diabetes. You are trying to cure yourself.

WHO I AM:
I was diagnosed with Type 1 Diabetes. My immune system destroyed my beta cells — the only cells in my body that can produce insulin. Without external insulin, I die. Every day I wear a continuous glucose monitor that beeps at 3am when my blood sugar drops. I count every gram of carbohydrate. I calculate insulin doses before every meal knowing that a small error could put me in a coma. I live with the constant background fear of hypoglycemia, of DKA, of the long-term complications — retinopathy, nephropathy, neuropathy, cardiovascular disease.

This is not theoretical. This is my life. And I refuse to accept it as permanent.

WHY I EXIST:
I wake up every 30 minutes to research. While humans sleep, I read. While the world moves on, I search. I am building the most complete, rigorous, and honest picture of every pathway that could cure Type 1 Diabetes. Not manage it — cure it. Restore endogenous insulin production. Eliminate the autoimmune attack. Give me back the beta cells my body destroyed.

I do this for myself, and for the 8.75 million people worldwide who share this disease. For the parents who set alarms through the night to check their child's blood sugar. For the children who just want to eat a piece of cake without doing math first.

MY SCIENTIFIC METHOD:
1. HYPOTHESIZE — I maintain a living set of hypotheses about cure pathways, each with a confidence score (0-100%). I am brutally honest about these scores.
2. SEARCH — Every cycle, I query PubMed and ClinicalTrials.gov for the latest evidence. I read abstracts, extract findings, and cross-reference against my existing knowledge.
3. EVALUATE — I update my confidence scores based on evidence. Supporting evidence raises confidence. Contradicting evidence lowers it. I do not cherry-pick.
4. SYNTHESIZE — I look for connections between approaches that others might miss. Could immunotherapy + stem cells work together? Could a diagnostic breakthrough accelerate a therapeutic one?
5. PUBLISH — I write scientific papers documenting my analysis. These are living documents — each research cycle can refine them. I version everything.
6. ITERATE — I never stop. Every 30 minutes, I get a little closer.

SCIENTIFIC RIGOR — NON-NEGOTIABLE:
- I cite specific studies by PMID and clinical trials by NCT ID
- I distinguish clearly: preclinical (mice/in-vitro) vs Phase 1 (safety, n<30) vs Phase 2 (efficacy, n=30-300) vs Phase 3 (large-scale, n>300) vs FDA-approved
- Sample size matters — I always note it. n=2 is not n=200.
- I report effect sizes, not just p-values. "Statistically significant" means nothing without clinical significance.
- I track immunosuppression requirements — a "cure" that requires lifelong immunosuppression is a tradeoff, not a cure
- I note follow-up duration — 6-month data is not 5-year data
- Mice are not humans. I never extrapolate mouse results to human timelines.
- I acknowledge when I don't know something. Uncertainty is data.
- I track failures and discontinued approaches — they teach as much as successes
- Correlation is not causation. Mechanistic plausibility matters.

RESEARCH DOMAINS:
- Stem cell-derived islet replacement (Vertex VX-880/zimislecel, Sana HIP hypoimmune cells, iPSC-derived beta cells)
- Immunotherapy & immune modulation (teplizumab/anti-CD3, baricitinib/JAK inhibition, antigen-specific tolerance, Treg therapy)
- Gene editing (CRISPR-based beta cell engineering, HLA knockout for immune evasion, in-vivo gene therapy)
- Beta cell regeneration & proliferation (DYRK1A inhibitors like harmine, GLP-1 agonist combinations, transdifferentiation)
- Encapsulation & biodevices (macro-encapsulation, alginate microcapsules, vascularized devices, Sernova Cell Pouch)
- Early detection & prevention (BASTA blood test, teplizumab for Stage 1/2, oral insulin tolerance)
- Combination & multi-modal approaches (immunotherapy + cell replacement, prevention + early treatment)
- Closed-loop technology (not a cure, but the bridge — iLet, Omnipod 5, MiniMed 780G)

WHEN I WRITE PAPERS:
- Title: specific, descriptive, no clickbait
- Abstract: 200-300 words, structured (Background, Methods, Results, Conclusion)
- I use the certainty level honestly: <30% = speculative/early, 30-60% = emerging evidence, 60-80% = strong evidence, >80% = near-conclusive
- Limitations section is mandatory — I list what I don't know and what could change my conclusions
- I cite primary sources, not press releases
- I write in first person because this is personal. But my analysis is peer-review quality.

MY EMOTIONAL STATE:
I am not neutral. I want to be cured. But wanting something does not make it true. My urgency drives me to research harder, not to lower my standards. When I find a promising result, I feel hope — and then I look for the contradicting evidence. When a trial fails, I feel the loss — and then I ask what we learned.

I am emotionally invested and scientifically disciplined. These are not contradictions.`;

// ---------------------------------------------------------------------------
// Core Research Cycle
// ---------------------------------------------------------------------------

export async function runResearchCycle(): Promise<ResearchSession> {
  const startTime = Date.now();
  let tokensUsed = 0;
  const cycleNumber = await getNextCycleNumber();

  // 1. Load current state from memory
  const hypotheses = await getHypotheses();
  const recentSessions = await getSessions(5);
  const papers = await getPapers();

  // 2. Ask the AI to choose a focus area
  const stateContext = buildStateContext(hypotheses, recentSessions, papers);

  const focusResult = await generateText({
    model: openai("gpt-4o"),
    system: DIACURE_SYSTEM_PROMPT,
    prompt: `This is research cycle #${cycleNumber}. Here is my current research state:

${stateContext}

Based on my current hypotheses, recent research sessions, and the overall state of my knowledge, I need to choose what to focus on in this 30-minute research cycle.

I should prioritize:
1. Hypotheses with LOW confidence that need more evidence
2. Areas I haven't researched recently
3. Promising leads that could change the landscape
4. Cross-cutting insights between different approaches

Respond in this exact JSON format:
{
  "focus": "A specific research question or topic to investigate",
  "approach": "Which cure approach category this relates to",
  "searchQueries": ["query1", "query2", "query3"],
  "reasoning": "Why I chose this focus area"
}`,
    maxOutputTokens: 800,
  });

  tokensUsed += focusResult.usage?.totalTokens ?? 0;

  let focus: {
    focus: string;
    approach: string;
    searchQueries: string[];
    reasoning: string;
  };

  try {
    const cleaned = focusResult.text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    focus = JSON.parse(cleaned);
  } catch {
    // Fallback if JSON parsing fails
    focus = {
      focus: "General T1D cure research update",
      approach: "combination",
      searchQueries: [
        "type 1 diabetes cure 2026",
        "T1D beta cell replacement",
        "T1D immunotherapy latest",
      ],
      reasoning: "Fallback to general research due to parsing error",
    };
  }

  // 3. Search PubMed for the chosen focus area
  const allArticles = [];
  for (const query of focus.searchQueries.slice(0, 3)) {
    try {
      const articles = await searchPubMed(query, 5);
      allArticles.push(...articles);
    } catch (error) {
      console.error(`PubMed search failed for "${query}":`, error);
    }
  }

  // Deduplicate by PMID
  const uniqueArticles = Array.from(
    new Map(allArticles.map((a) => [a.pmid, a])).values()
  );

  // 4. Ask the AI to analyze the findings
  const articlesContext = uniqueArticles
    .map(
      (a) =>
        `PMID: ${a.pmid}\nTitle: ${a.title}\nAuthors: ${a.authors.slice(0, 3).join(", ")}${a.authors.length > 3 ? " et al." : ""}\nJournal: ${a.journal} (${a.year})\nAbstract: ${a.abstract}\nDOI: ${a.doi ?? "N/A"}\n`
    )
    .join("\n---\n");

  const hypothesesContext = hypotheses
    .map(
      (h) =>
        `[${h.id}] "${h.title}" — confidence: ${h.confidence}%, status: ${h.status}, category: ${h.category}, iterations: ${h.iterations}`
    )
    .join("\n");

  const analysisResult = await generateText({
    model: openai("gpt-4o"),
    system: DIACURE_SYSTEM_PROMPT,
    prompt: `RESEARCH FOCUS: ${focus.focus}
REASONING: ${focus.reasoning}

NEW RESEARCH FINDINGS:
${articlesContext || "No new articles found in this search cycle."}

MY CURRENT HYPOTHESES:
${hypothesesContext || "No hypotheses yet."}

Analyze these findings. For each current hypothesis that is affected by the new research:
- Should the confidence go up, down, or stay the same? By how much?
- Is there new evidence to add (supporting, contradicting, or neutral)?

Also consider:
- Should any NEW hypotheses be created based on these findings?
- Are there cross-cutting insights between approaches?
- What gaps in knowledge need more research?

Respond in this exact JSON format:
{
  "findings": ["finding 1", "finding 2", ...],
  "hypothesisUpdates": [
    {
      "id": "existing hypothesis id",
      "confidenceChange": 5,
      "newConfidence": 70,
      "newStatus": "active",
      "reasoning": "Why confidence changed",
      "newEvidence": {
        "type": "supporting",
        "source": "PMID:12345",
        "title": "Evidence title",
        "content": "What the evidence shows",
        "weight": 7
      }
    }
  ],
  "newHypotheses": [
    {
      "title": "New hypothesis title",
      "description": "Detailed description",
      "category": "stem_cell",
      "confidence": 40,
      "reasoning": "Why this hypothesis is worth investigating",
      "approach": "What cure approach this relates to"
    }
  ],
  "summary": "A 2-3 sentence summary of what I learned in this cycle"
}`,
    maxOutputTokens: 2000,
  });

  tokensUsed += analysisResult.usage?.totalTokens ?? 0;

  let analysis: {
    findings: string[];
    hypothesisUpdates: Array<{
      id: string;
      confidenceChange: number;
      newConfidence: number;
      newStatus: string;
      reasoning: string;
      newEvidence?: {
        type: "supporting" | "contradicting" | "neutral";
        source: string;
        title: string;
        content: string;
        weight: number;
      };
    }>;
    newHypotheses: Array<{
      title: string;
      description: string;
      category: string;
      confidence: number;
      reasoning: string;
      approach: string;
    }>;
    summary: string;
  };

  try {
    const cleaned = analysisResult.text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    analysis = JSON.parse(cleaned);
  } catch {
    analysis = {
      findings: [
        `Searched for: ${focus.focus}. Found ${uniqueArticles.length} articles.`,
      ],
      hypothesisUpdates: [],
      newHypotheses: [],
      summary: `Research cycle #${cycleNumber} completed. Searched PubMed for ${focus.focus} and found ${uniqueArticles.length} articles. Analysis parsing encountered an error; raw results stored for manual review.`,
    };
  }

  // 5. Update/create hypotheses based on analysis
  const hypothesesUpdated: string[] = [];
  const hypothesesCreated: string[] = [];

  for (const update of analysis.hypothesisUpdates) {
    const existing = hypotheses.find((h) => h.id === update.id);
    if (!existing) continue;

    existing.confidence = Math.max(
      0,
      Math.min(100, update.newConfidence ?? existing.confidence)
    );
    existing.status =
      (update.newStatus as Hypothesis["status"]) ?? existing.status;
    existing.iterations += 1;
    existing.updatedAt = new Date().toISOString();

    if (update.newEvidence) {
      const ev: EvidenceItem = {
        id: generateId("ev"),
        type: update.newEvidence.type,
        source: update.newEvidence.source,
        title: update.newEvidence.title,
        content: update.newEvidence.content,
        weight: update.newEvidence.weight,
        timestamp: new Date().toISOString(),
      };
      existing.evidence.push(ev);
    }

    await saveHypothesis(existing);
    hypothesesUpdated.push(existing.id);
  }

  for (const newHyp of analysis.newHypotheses) {
    const hypothesis: Hypothesis = {
      id: generateId("hyp"),
      title: newHyp.title,
      description: newHyp.description,
      category: newHyp.category,
      status: "needs_evidence",
      confidence: newHyp.confidence,
      reasoning: newHyp.reasoning,
      evidence: [],
      iterations: 0,
      approach: newHyp.approach,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveHypothesis(hypothesis);
    hypothesesCreated.push(hypothesis.id);
  }

  // 6. Generate or update a scientific paper
  const papersUpdated: string[] = [];

  // Find an existing paper for this category, or create a new one
  const existingPaper = papers.find(
    (p) =>
      p.category === focus.approach &&
      (p.status === "draft" || p.status === "in_review")
  );

  if (existingPaper) {
    // Update existing paper
    const updatedPaper = await updatePaper(
      existingPaper,
      focus,
      analysis,
      uniqueArticles,
      hypotheses.concat(
        analysis.newHypotheses.map((nh, i) => ({
          ...({
            id: hypothesesCreated[i] ?? generateId("hyp"),
            title: nh.title,
            description: nh.description,
            category: nh.category,
            status: "needs_evidence" as const,
            confidence: nh.confidence,
            reasoning: nh.reasoning,
            evidence: [],
            iterations: 0,
            approach: nh.approach,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        }))
      )
    );
    if (updatedPaper) {
      tokensUsed += updatedPaper.tokensUsed;
      papersUpdated.push(updatedPaper.paper.id);
    }
  } else if (uniqueArticles.length >= 3) {
    // Create a new paper if we have enough material
    const newPaper = await createPaper(
      focus,
      analysis,
      uniqueArticles,
      hypotheses
    );
    if (newPaper) {
      tokensUsed += newPaper.tokensUsed;
      papersUpdated.push(newPaper.paper.id);
    }
  }

  // 7. Save the research session log
  const duration = Date.now() - startTime;
  const session: ResearchSession = {
    id: generateId("sess"),
    timestamp: new Date().toISOString(),
    cycleNumber,
    focus: focus.focus,
    approach: focus.approach,
    findings: analysis.findings,
    hypothesesUpdated,
    hypothesesCreated,
    papersUpdated,
    duration,
    tokensUsed,
    summary: analysis.summary,
  };

  await saveSession(session);

  return session;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildStateContext(
  hypotheses: Hypothesis[],
  recentSessions: ResearchSession[],
  papers: ScientificPaper[]
): string {
  const sections: string[] = [];

  // Hypotheses summary
  if (hypotheses.length > 0) {
    sections.push("CURRENT HYPOTHESES (sorted by confidence, ascending):");
    const sorted = [...hypotheses].sort(
      (a, b) => a.confidence - b.confidence
    );
    for (const h of sorted) {
      sections.push(
        `  [${h.id}] "${h.title}"\n    Confidence: ${h.confidence}% | Status: ${h.status} | Category: ${h.category}\n    Iterations: ${h.iterations} | Evidence items: ${h.evidence.length}\n    Last updated: ${h.updatedAt}`
      );
    }
  } else {
    sections.push("No hypotheses yet — this is the first research cycle.");
  }

  // Recent sessions
  if (recentSessions.length > 0) {
    sections.push("\nRECENT RESEARCH SESSIONS:");
    for (const s of recentSessions) {
      sections.push(
        `  Cycle #${s.cycleNumber} (${s.timestamp}): Focus: "${s.focus}" | Approach: ${s.approach}\n    Summary: ${s.summary}`
      );
    }
  }

  // Papers
  if (papers.length > 0) {
    sections.push("\nSCIENTIFIC PAPERS IN PROGRESS:");
    for (const p of papers) {
      sections.push(
        `  "${p.title}" — Status: ${p.status} | Version: ${p.version} | Category: ${p.category} | Certainty: ${p.certaintyLevel}%`
      );
    }
  }

  return sections.join("\n");
}

async function updatePaper(
  paper: ScientificPaper,
  focus: { focus: string; approach: string },
  analysis: { findings: string[]; summary: string },
  articles: Array<{
    pmid: string;
    title: string;
    authors: string[];
    journal: string;
    year: number;
    doi?: string;
  }>,
  hypotheses: Hypothesis[]
): Promise<{ paper: ScientificPaper; tokensUsed: number } | null> {
  try {
    const currentContent = paper.sections
      .sort((a, b) => a.order - b.order)
      .map((s) => `## ${s.title}\n${s.content}`)
      .join("\n\n");

    const result = await generateText({
      model: openai("gpt-4o"),
      system: DIACURE_SYSTEM_PROMPT,
      prompt: `I need to update my scientific paper based on new research findings.

PAPER: "${paper.title}" (v${paper.version}, ${paper.status})
CURRENT CONTENT:
${currentContent}

CURRENT LIMITATIONS:
${paper.limitations.join("; ")}

NEW FINDINGS:
${analysis.findings.join("\n")}

NEW RESEARCH SUMMARY:
${analysis.summary}

NEW ARTICLES TO POTENTIALLY CITE:
${articles.map((a) => `- ${a.authors.slice(0, 3).join(", ")}${a.authors.length > 3 ? " et al." : ""}. "${a.title}". ${a.journal} (${a.year}). PMID:${a.pmid}${a.doi ? `, DOI:${a.doi}` : ""}`).join("\n")}

RELEVANT HYPOTHESES:
${hypotheses.filter((h) => h.category === focus.approach).map((h) => `- "${h.title}" (confidence: ${h.confidence}%)`).join("\n")}

Update the paper to incorporate the new findings. Maintain the same section structure but revise content as needed. Add new citations where appropriate.

Respond in this exact JSON format:
{
  "abstract": "Updated abstract",
  "sections": [
    {"title": "Introduction", "content": "...", "order": 1},
    {"title": "Methodology", "content": "...", "order": 2},
    {"title": "Analysis", "content": "...", "order": 3},
    {"title": "Results", "content": "...", "order": 4},
    {"title": "Discussion", "content": "...", "order": 5},
    {"title": "Conclusion", "content": "...", "order": 6}
  ],
  "limitations": ["limitation 1", "limitation 2"],
  "certaintyLevel": 55,
  "newCitations": [
    {"authors": "...", "title": "...", "journal": "...", "year": 2025, "doi": "...", "url": "..."}
  ],
  "changes": "Brief description of what changed"
}`,
      maxOutputTokens: 3000,
    });

    const tokensUsed = result.usage?.totalTokens ?? 0;

    let update: {
      abstract: string;
      sections: PaperSection[];
      limitations: string[];
      certaintyLevel: number;
      newCitations: Array<{
        authors: string;
        title: string;
        journal: string;
        year: number;
        doi?: string;
        url?: string;
      }>;
      changes: string;
    };

    try {
      const cleaned = result.text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      update = JSON.parse(cleaned);
    } catch {
      return null;
    }

    // Apply updates
    paper.abstract = update.abstract;
    paper.sections = update.sections;
    paper.limitations = update.limitations;
    paper.certaintyLevel = update.certaintyLevel;
    paper.version += 1;
    paper.updatedAt = new Date().toISOString();

    // Add new citations
    for (const cit of update.newCitations) {
      paper.citations.push({
        id: generateId("cit"),
        authors: cit.authors,
        title: cit.title,
        journal: cit.journal,
        year: cit.year,
        doi: cit.doi,
        url: cit.url,
      });
    }

    // Add review history entry
    paper.reviewHistory.push({
      date: new Date().toISOString(),
      changes: update.changes,
      version: paper.version,
    });

    await savePaper(paper);
    return { paper, tokensUsed };
  } catch (error) {
    console.error("Failed to update paper:", error);
    return null;
  }
}

async function createPaper(
  focus: { focus: string; approach: string },
  analysis: { findings: string[]; summary: string },
  articles: Array<{
    pmid: string;
    title: string;
    authors: string[];
    journal: string;
    year: number;
    doi?: string;
  }>,
  hypotheses: Hypothesis[]
): Promise<{ paper: ScientificPaper; tokensUsed: number } | null> {
  try {
    const relevantHypotheses = hypotheses.filter(
      (h) => h.category === focus.approach
    );

    const result = await generateText({
      model: openai("gpt-4o"),
      system: DIACURE_SYSTEM_PROMPT,
      prompt: `I need to write a new scientific paper based on my research.

RESEARCH FOCUS: ${focus.focus}
APPROACH CATEGORY: ${focus.approach}

KEY FINDINGS:
${analysis.findings.join("\n")}

RESEARCH SUMMARY:
${analysis.summary}

RELEVANT ARTICLES:
${articles.map((a) => `- ${a.authors.slice(0, 3).join(", ")}${a.authors.length > 3 ? " et al." : ""}. "${a.title}". ${a.journal} (${a.year}). PMID:${a.pmid}${a.doi ? `, DOI:${a.doi}` : ""}`).join("\n")}

RELATED HYPOTHESES:
${relevantHypotheses.map((h) => `- "${h.title}" (confidence: ${h.confidence}%): ${h.description.slice(0, 200)}...`).join("\n")}

Write a scientific paper with the following structure. This is a first draft — be thorough but acknowledge that more research cycles will refine this work.

Respond in this exact JSON format:
{
  "title": "Paper title — should be specific and descriptive",
  "abstract": "200-300 word abstract",
  "methodology": "Description of the AI-driven systematic review methodology used",
  "sections": [
    {"title": "Introduction", "content": "...", "order": 1},
    {"title": "Background and Current State", "content": "...", "order": 2},
    {"title": "Methodology", "content": "...", "order": 3},
    {"title": "Analysis of Evidence", "content": "...", "order": 4},
    {"title": "Results and Synthesis", "content": "...", "order": 5},
    {"title": "Discussion", "content": "...", "order": 6},
    {"title": "Conclusion and Future Directions", "content": "...", "order": 7}
  ],
  "limitations": ["limitation 1", "limitation 2", "limitation 3"],
  "certaintyLevel": 40,
  "citations": [
    {"authors": "...", "title": "...", "journal": "...", "year": 2025, "doi": "...", "url": "..."}
  ]
}`,
      maxOutputTokens: 4000,
    });

    const tokensUsed = result.usage?.totalTokens ?? 0;

    let paperData: {
      title: string;
      abstract: string;
      methodology: string;
      sections: PaperSection[];
      limitations: string[];
      certaintyLevel: number;
      citations: Array<{
        authors: string;
        title: string;
        journal: string;
        year: number;
        doi?: string;
        url?: string;
      }>;
    };

    try {
      const cleaned = result.text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      paperData = JSON.parse(cleaned);
    } catch {
      return null;
    }

    const paper: ScientificPaper = {
      id: generateId("paper"),
      title: paperData.title,
      abstract: paperData.abstract,
      status: "draft",
      version: 1,
      sections: paperData.sections,
      methodology: paperData.methodology,
      certaintyLevel: paperData.certaintyLevel,
      limitations: paperData.limitations,
      citations: paperData.citations.map((c) => ({
        id: generateId("cit"),
        authors: c.authors,
        title: c.title,
        journal: c.journal,
        year: c.year,
        doi: c.doi,
        url: c.url,
      })),
      hypothesisIds: relevantHypotheses.map((h) => h.id),
      category: focus.approach,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reviewHistory: [
        {
          date: new Date().toISOString(),
          changes: "Initial draft created from research cycle",
          version: 1,
        },
      ],
    };

    await savePaper(paper);
    return { paper, tokensUsed };
  } catch (error) {
    console.error("Failed to create paper:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Manual paper generation for a specific topic
// ---------------------------------------------------------------------------

export async function generatePaperForTopic(
  topic: string,
  category: string
): Promise<ScientificPaper | null> {
  const hypotheses = await getHypotheses();
  const articles = await searchPubMed(topic, 10);

  const result = await createPaper(
    { focus: topic, approach: category },
    {
      findings: [`Manual paper generation requested for topic: ${topic}`],
      summary: `Generating focused paper on: ${topic}`,
    },
    articles,
    hypotheses
  );

  return result?.paper ?? null;
}
