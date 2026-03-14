"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  FlaskConical,
  Clock,
  Users,
  Loader2,
} from "lucide-react";
import cureApproaches from "@/data/cure-approaches.json";
import categories from "@/data/categories.json";
import { PHASE_LABELS, PHASE_COLORS } from "@/types/cure-approach";
import type { CureApproach, Phase, Category, CategoryDefinition } from "@/types/cure-approach";
import type { PubMedArticle } from "@/types/research";

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-surface p-6">
      <div className="h-5 w-3/4 rounded bg-surface-light" />
      <div className="mt-3 h-4 w-1/2 rounded bg-surface-light" />
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-16 rounded-full bg-surface-light" />
        <div className="h-6 w-20 rounded-full bg-surface-light" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-surface-light" />
        <div className="h-3 w-5/6 rounded bg-surface-light" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Curated Research Tab
// ---------------------------------------------------------------------------
function CuratedTab() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const typedApproaches = cureApproaches as CureApproach[];
  const typedCategories = categories as CategoryDefinition[];

  const filtered =
    selectedCategory === "all"
      ? typedApproaches
      : typedApproaches.filter((a) => a.category === selectedCategory);

  return (
    <div>
      {/* Category filter bar */}
      <div className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            selectedCategory === "all"
              ? "bg-primary text-white"
              : "border border-border bg-surface text-muted hover:text-foreground hover:border-primary/50"
          }`}
        >
          All
        </button>
        {typedCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategory === cat.id
                ? "text-white"
                : "border border-border bg-surface text-muted hover:text-foreground hover:border-primary/50"
            }`}
            style={
              selectedCategory === cat.id
                ? { backgroundColor: cat.color }
                : undefined
            }
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Approach cards grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((approach) => {
          const isExpanded = expandedId === approach.id;
          const phaseLabel =
            PHASE_LABELS[approach.phase as Phase] ?? approach.phase;
          const phaseColor =
            PHASE_COLORS[approach.phase as Phase] ?? "#6B7280";
          const catDef = typedCategories.find((c) => c.id === approach.category);

          return (
            <div
              key={approach.id}
              className={`rounded-2xl border border-border bg-surface transition-all duration-200 ${
                isExpanded ? "md:col-span-2" : ""
              }`}
            >
              {/* Card header - always visible */}
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : approach.id)
                }
                className="w-full p-6 text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      {approach.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted">
                      {approach.organization}
                    </p>
                  </div>
                  <div className="shrink-0 pt-1">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-muted" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted" />
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: `${phaseColor}20`,
                      color: phaseColor,
                    }}
                  >
                    {phaseLabel}
                  </span>
                  {catDef && (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: `${catDef.color}20`,
                        color: catDef.color,
                      }}
                    >
                      {catDef.name}
                    </span>
                  )}
                </div>

                {/* Summary (truncated) */}
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {isExpanded
                    ? approach.plainLanguageSummary
                    : approach.plainLanguageSummary.length > 150
                      ? approach.plainLanguageSummary.slice(0, 150) + "..."
                      : approach.plainLanguageSummary}
                </p>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border px-6 pb-6 pt-4">
                  {/* Description */}
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-semibold text-foreground">
                      Description
                    </h4>
                    <p className="text-sm leading-relaxed text-muted">
                      {approach.description}
                    </p>
                  </div>

                  {/* Key Findings */}
                  {approach.keyFindings.length > 0 && (
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-semibold text-foreground">
                        Key Findings
                      </h4>
                      <ul className="space-y-1.5">
                        {approach.keyFindings.map((finding, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted"
                          >
                            <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Challenges */}
                  {approach.challenges.length > 0 && (
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-semibold text-foreground">
                        Challenges
                      </h4>
                      <ul className="space-y-1.5">
                        {approach.challenges.map((challenge, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-muted"
                          >
                            <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-500" />
                            {challenge}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key Studies */}
                  {approach.keyStudies.length > 0 && (
                    <div className="mb-4">
                      <h4 className="mb-2 text-sm font-semibold text-foreground">
                        Key Studies
                      </h4>
                      <ul className="space-y-2">
                        {approach.keyStudies.map((study, i) => (
                          <li key={i}>
                            <a
                              href={study.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-light transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                {study.title} &mdash;{" "}
                                <span className="text-muted">
                                  {study.journal} ({study.year})
                                </span>
                              </span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Ask AI button */}
                  <Link
                    href={`/chat?q=${encodeURIComponent(
                      `Tell me about ${approach.name} by ${approach.organization} and its potential as a T1D cure.`
                    )}`}
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    <Sparkles className="h-4 w-4" />
                    Ask AI about this
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FlaskConical className="mb-4 h-12 w-12 text-muted/40" />
          <p className="text-lg font-medium text-muted">
            No approaches found for this category.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live PubMed Tab
// ---------------------------------------------------------------------------
function PubMedTab() {
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<PubMedArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summarizing, setSummarizing] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchPubMed = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setArticles([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch(
        `/api/research/search?query=${encodeURIComponent(searchQuery)}&maxResults=10`
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setArticles(data.articles ?? []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      searchPubMed(query);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchPubMed]);

  const handleSummarize = async (article: PubMedArticle) => {
    if (summaries[article.pmid] || summarizing[article.pmid]) return;

    setSummarizing((prev) => ({ ...prev, [article.pmid]: true }));

    try {
      const res = await fetch("/api/research/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: article.title,
          abstract: article.abstract,
        }),
      });

      if (!res.ok) throw new Error("Summarization failed");
      const data = await res.json();
      setSummaries((prev) => ({ ...prev, [article.pmid]: data.summary }));
    } catch {
      setSummaries((prev) => ({
        ...prev,
        [article.pmid]: "Failed to generate summary. Please try again.",
      }));
    } finally {
      setSummarizing((prev) => ({ ...prev, [article.pmid]: false }));
    }
  };

  const formatAuthors = (authors: string[]) => {
    if (authors.length <= 3) return authors.join(", ");
    return authors.slice(0, 3).join(", ") + " et al.";
  };

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search PubMed for T1D research (e.g., stem cell therapy type 1 diabetes)"
          className="w-full rounded-xl border border-border bg-surface py-3.5 pl-12 pr-4 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
        />
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && articles.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <div
              key={article.pmid}
              className="flex flex-col rounded-2xl border border-border bg-surface p-6"
            >
              {/* Title */}
              <h3 className="text-sm font-semibold leading-snug text-foreground">
                {article.title}
              </h3>

              {/* Authors */}
              <p className="mt-2 text-xs text-muted">
                {formatAuthors(article.authors)}
              </p>

              {/* Journal + Year */}
              <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {article.journal} ({article.year})
                </span>
              </div>

              {/* Abstract (truncated) */}
              {article.abstract && (
                <p className="mt-3 text-xs leading-relaxed text-muted/80">
                  {article.abstract.length > 200
                    ? article.abstract.slice(0, 200) + "..."
                    : article.abstract}
                </p>
              )}

              {/* AI Summary */}
              {summaries[article.pmid] && (
                <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-accent">
                    <Sparkles className="h-3.5 w-3.5" />
                    Plain Language Summary
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/90">
                    {summaries[article.pmid]}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                {!summaries[article.pmid] && (
                  <button
                    onClick={() => handleSummarize(article)}
                    disabled={summarizing[article.pmid]}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                  >
                    {summarizing[article.pmid] ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Summarizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Summarize in plain language
                      </>
                    )}
                  </button>
                )}
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-light px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  PubMed
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && hasSearched && articles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="mb-4 h-12 w-12 text-muted/40" />
          <p className="text-lg font-medium text-muted">
            No results found.
          </p>
          <p className="mt-1 text-sm text-muted/60">
            Try different keywords or a broader search term.
          </p>
        </div>
      )}

      {/* Initial state */}
      {!loading && !hasSearched && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-muted/40" />
          <p className="text-lg font-medium text-muted">
            Search PubMed for the latest T1D research
          </p>
          <p className="mt-1 text-sm text-muted/60">
            Enter a search term above to find peer-reviewed studies.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
type Tab = "curated" | "pubmed";

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState<Tab>("curated");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="gradient-text">Research Explorer</span>
        </h1>
        <p className="mt-2 text-muted">
          Understanding the science behind a cure
        </p>
      </div>

      {/* Tab switcher */}
      <div className="mb-8 flex gap-1 rounded-xl bg-surface p-1 sm:inline-flex">
        <button
          onClick={() => setActiveTab("curated")}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "curated"
              ? "bg-surface-light text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          <FlaskConical className="h-4 w-4" />
          Curated Research
        </button>
        <button
          onClick={() => setActiveTab("pubmed")}
          className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "pubmed"
              ? "bg-surface-light text-foreground shadow-sm"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Search className="h-4 w-4" />
          Live PubMed Search
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "curated" ? <CuratedTab /> : <PubMedTab />}
    </div>
  );
}
