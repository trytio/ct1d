import cureApproaches from "@/data/cure-approaches.json";
import type { CureApproach } from "@/types/cure-approach";

const approaches = cureApproaches as CureApproach[];

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
  "as", "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "both",
  "each", "few", "more", "most", "other", "some", "such", "no", "nor",
  "not", "only", "own", "same", "so", "than", "too", "very", "just",
  "because", "but", "and", "or", "if", "while", "about", "what", "which",
  "who", "whom", "this", "that", "these", "those", "am", "it", "its",
  "i", "me", "my", "myself", "we", "our", "you", "your", "he", "him",
  "she", "her", "they", "them", "tell", "explain", "describe", "know",
  "think", "work", "works", "working", "latest", "current", "new",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function scoreApproach(approach: CureApproach, queryTokens: string[]): number {
  let score = 0;

  const nameTokens = tokenize(approach.name);
  const orgTokens = tokenize(approach.organization);
  const categoryTokens = tokenize(approach.category.replace(/_/g, " "));
  const descTokens = tokenize(approach.description);
  const summaryTokens = tokenize(approach.plainLanguageSummary);
  const tagTokens = approach.tags.flatMap((tag) => tokenize(tag));
  const mechanismTokens = tokenize(approach.mechanism);
  const findingsTokens = approach.keyFindings.flatMap((f) => tokenize(f));

  for (const qt of queryTokens) {
    // Exact matches in name get highest weight
    if (nameTokens.some((t) => t === qt)) score += 10;
    // Partial matches in name
    else if (nameTokens.some((t) => t.includes(qt) || qt.includes(t))) score += 7;

    // Tag matches are very valuable (curated keywords)
    if (tagTokens.some((t) => t === qt)) score += 8;
    else if (tagTokens.some((t) => t.includes(qt) || qt.includes(t))) score += 5;

    // Organization matches
    if (orgTokens.some((t) => t === qt)) score += 6;
    else if (orgTokens.some((t) => t.includes(qt) || qt.includes(t))) score += 4;

    // Category matches
    if (categoryTokens.some((t) => t === qt)) score += 5;
    else if (categoryTokens.some((t) => t.includes(qt) || qt.includes(t))) score += 3;

    // Description matches
    if (descTokens.some((t) => t === qt)) score += 3;
    else if (descTokens.some((t) => t.includes(qt) || qt.includes(t))) score += 1;

    // Summary matches
    if (summaryTokens.some((t) => t === qt)) score += 2;

    // Mechanism matches
    if (mechanismTokens.some((t) => t === qt)) score += 2;

    // Key findings matches
    if (findingsTokens.some((t) => t === qt)) score += 2;
  }

  // Bonus for phase-specific queries
  const phaseKeywords: Record<string, string[]> = {
    approved: ["approved", "available", "fda", "cleared", "market"],
    phase_3: ["phase3", "phase-3", "pivotal", "late-stage"],
    phase_2: ["phase2", "phase-2"],
    phase_1: ["phase1", "phase-1", "early"],
    preclinical: ["preclinical", "pre-clinical", "mice", "mouse", "animal"],
    discontinued: ["discontinued", "failed", "stopped", "failure"],
  };

  for (const [phase, keywords] of Object.entries(phaseKeywords)) {
    if (
      queryTokens.some((qt) => keywords.some((kw) => kw.includes(qt) || qt.includes(kw))) &&
      approach.phase === phase
    ) {
      score += 5;
    }
  }

  return score;
}

function formatApproachContext(approach: CureApproach): string {
  const lines: string[] = [];

  lines.push(`### ${approach.name} (${approach.organization})`);
  lines.push(`Phase: ${approach.phase.replace(/_/g, " ").toUpperCase()}`);
  lines.push(`Category: ${approach.category.replace(/_/g, " ")}`);
  lines.push(`Last Updated: ${approach.lastUpdated}`);
  lines.push("");
  lines.push(`Description: ${approach.description}`);
  lines.push("");
  lines.push(`Plain Language: ${approach.plainLanguageSummary}`);
  lines.push("");
  lines.push(`Mechanism: ${approach.mechanism}`);
  lines.push("");

  if (approach.keyFindings.length > 0) {
    lines.push("Key Findings:");
    for (const finding of approach.keyFindings) {
      lines.push(`- ${finding}`);
    }
    lines.push("");
  }

  if (approach.challenges.length > 0) {
    lines.push("Challenges:");
    for (const challenge of approach.challenges) {
      lines.push(`- ${challenge}`);
    }
    lines.push("");
  }

  if (approach.keyStudies.length > 0) {
    lines.push("Key Studies:");
    for (const study of approach.keyStudies) {
      lines.push(`- "${study.title}" — ${study.journal} (${study.year})`);
    }
    lines.push("");
  }

  if (approach.relatedApproachIds.length > 0) {
    const relatedNames = approach.relatedApproachIds
      .map((id) => approaches.find((a) => a.id === id)?.name)
      .filter(Boolean);
    if (relatedNames.length > 0) {
      lines.push(`Related Approaches: ${relatedNames.join(", ")}`);
    }
  }

  return lines.join("\n");
}

export function searchKnowledgeBase(query: string): string {
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    // If no meaningful tokens, return a general overview
    return approaches
      .slice(0, 3)
      .map(formatApproachContext)
      .join("\n\n---\n\n");
  }

  const scored = approaches
    .map((approach) => ({
      approach,
      score: scoreApproach(approach, queryTokens),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Return top 3-5 results depending on score distribution
  const topResults = scored.slice(0, Math.min(5, scored.length));

  if (topResults.length === 0) {
    // No matches — return the most notable approaches as general context
    return approaches
      .filter((a) => a.phase === "approved" || a.phase === "phase_3")
      .slice(0, 3)
      .map(formatApproachContext)
      .join("\n\n---\n\n");
  }

  // Only include results that have a meaningful score (at least 25% of top score)
  const threshold = topResults[0].score * 0.25;
  const meaningful = topResults.filter((item) => item.score >= threshold);

  return meaningful
    .map((item) => formatApproachContext(item.approach))
    .join("\n\n---\n\n");
}
