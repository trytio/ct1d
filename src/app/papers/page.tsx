"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  BookOpen,
  Activity,
  Filter,
  ArrowUpDown,
  Quote,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ScientificPaper {
  id: string;
  title: string;
  abstract: string;
  status: "draft" | "in_review" | "published";
  version: number;
  sections: { title: string; content: string; order: number }[];
  methodology: string;
  certaintyLevel: number;
  limitations: string[];
  citations: {
    id: string;
    authors: string;
    title: string;
    journal: string;
    year: number;
    doi?: string;
    url?: string;
  }[];
  hypothesisIds: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
  reviewHistory: { date: string; changes: string; version: number }[];
}

interface AgentStatus {
  lastCycleAt?: string;
  totalSessions?: number;
  currentFocus?: string;
}

// ---------------------------------------------------------------------------
// Category color mapping (matches categories.json)
// ---------------------------------------------------------------------------
const CATEGORY_COLORS: Record<string, string> = {
  stem_cell: "#8B5CF6",
  immunotherapy: "#3B82F6",
  gene_editing: "#EC4899",
  beta_cell_regeneration: "#10B981",
  encapsulation: "#F59E0B",
  combination: "#F97316",
  artificial_pancreas: "#06B6D4",
};

const CATEGORY_LABELS: Record<string, string> = {
  stem_cell: "Stem Cell",
  immunotherapy: "Immunotherapy",
  gene_editing: "Gene Editing",
  beta_cell_regeneration: "Beta Cell Regen",
  encapsulation: "Encapsulation",
  combination: "Combination",
  artificial_pancreas: "Artificial Pancreas",
};

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  draft: { label: "Draft", color: "#EAB308", bg: "rgba(234, 179, 8, 0.12)" },
  in_review: {
    label: "In Review",
    color: "#3B82F6",
    bg: "rgba(59, 130, 246, 0.12)",
  },
  published: {
    label: "Published",
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.12)",
  },
};

// ---------------------------------------------------------------------------
// Certainty bar color
// ---------------------------------------------------------------------------
function certaintyColor(level: number): string {
  if (level < 30) return "#EF4444";
  if (level < 60) return "#EAB308";
  if (level < 80) return "#10B981";
  return "#22C55E";
}

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------
type SortKey = "date" | "certainty" | "version";

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
function PaperSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-surface p-6">
      <div className="h-5 w-3/4 rounded bg-surface-light" />
      <div className="mt-3 flex gap-2">
        <div className="h-5 w-20 rounded-full bg-surface-light" />
        <div className="h-5 w-16 rounded-full bg-surface-light" />
      </div>
      <div className="mt-4 h-2 w-full rounded bg-surface-light" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-surface-light" />
        <div className="h-3 w-5/6 rounded bg-surface-light" />
        <div className="h-3 w-4/6 rounded bg-surface-light" />
      </div>
      <div className="mt-4 flex gap-4">
        <div className="h-4 w-16 rounded bg-surface-light" />
        <div className="h-4 w-24 rounded bg-surface-light" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent Status Card
// ---------------------------------------------------------------------------
function AgentStatusCard({ status }: { status: AgentStatus | null }) {
  const isAlive = useMemo(() => {
    if (!status?.lastCycleAt) return false;
    const elapsed = Date.now() - new Date(status.lastCycleAt).getTime();
    return elapsed < 35 * 60 * 1000; // 35 minutes
  }, [status]);

  if (!status) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-8 rounded-2xl border border-border bg-surface p-5"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-light">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Autonomous Research Engine
            </h3>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              {isAlive ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  Active
                </>
              ) : (
                <>
                  <span className="inline-flex h-2 w-2 rounded-full bg-muted/50" />
                  Idle
                </>
              )}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {status.lastCycleAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last cycle:{" "}
                {new Date(status.lastCycleAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            {status.totalSessions != null && (
              <span>Sessions: {status.totalSessions}</span>
            )}
            {status.currentFocus && (
              <span className="truncate">Focus: {status.currentFocus}</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Paper Card
// ---------------------------------------------------------------------------
function PaperCard({ paper, index }: { paper: ScientificPaper; index: number }) {
  const statusCfg = STATUS_CONFIG[paper.status] ?? STATUS_CONFIG.draft;
  const catColor = CATEGORY_COLORS[paper.category] ?? "#6B7280";
  const catLabel =
    CATEGORY_LABELS[paper.category] ?? paper.category.replace(/_/g, " ");
  const certColor = certaintyColor(paper.certaintyLevel);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
    >
      <Link
        href={`/papers/${paper.id}`}
        className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:border-primary/40 hover:shadow-[0_0_24px_rgba(59,130,246,0.08)]"
      >
        {/* Title */}
        <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary-light transition-colors">
          {paper.title}
        </h3>

        {/* Badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${catColor}18`,
              color: catColor,
            }}
          >
            {catLabel}
          </span>
        </div>

        {/* Certainty bar */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted">Certainty</span>
            <span className="font-mono font-medium" style={{ color: certColor }}>
              {paper.certaintyLevel}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-light">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${paper.certaintyLevel}%`,
                backgroundColor: certColor,
              }}
            />
          </div>
        </div>

        {/* Abstract */}
        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted">
          {paper.abstract}
        </p>

        {/* Meta row */}
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-4 text-xs text-muted">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            v{paper.version}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(paper.updatedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          {paper.citations.length > 0 && (
            <span className="flex items-center gap-1">
              <Quote className="h-3 w-3" />
              {paper.citations.length} citation
              {paper.citations.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function PapersPage() {
  const [papers, setPapers] = useState<ScientificPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("date");

  // Fetch papers
  useEffect(() => {
    async function fetchPapers() {
      setLoading(true);
      try {
        const res = await fetch("/api/papers");
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        setPapers(data.papers ?? []);
      } catch {
        setPapers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchPapers();
  }, []);

  // Fetch agent status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch("/api/autonomous/status");
        if (!res.ok) return;
        const data = await res.json();
        setAgentStatus(data);
      } catch {
        // Agent status is optional
      }
    }
    fetchStatus();
  }, []);

  // Derived: unique categories
  const categories = useMemo(() => {
    const cats = new Set(papers.map((p) => p.category));
    return Array.from(cats).sort();
  }, [papers]);

  // Filter + sort
  const filteredPapers = useMemo(() => {
    let result = papers;

    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter);
    }

    const sorted = [...result];
    switch (sortBy) {
      case "date":
        sorted.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        break;
      case "certainty":
        sorted.sort((a, b) => b.certaintyLevel - a.certaintyLevel);
        break;
      case "version":
        sorted.sort((a, b) => b.version - a.version);
        break;
    }

    return sorted;
  }, [papers, statusFilter, categoryFilter, sortBy]);

  // Stats
  const stats = useMemo(() => {
    const total = papers.length;
    const drafts = papers.filter((p) => p.status === "draft").length;
    const published = papers.filter((p) => p.status === "published").length;
    const avgCertainty =
      total > 0
        ? Math.round(
            papers.reduce((sum, p) => sum + p.certaintyLevel, 0) / total
          )
        : 0;
    return { total, drafts, published, avgCertainty };
  }, [papers]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-3xl font-bold tracking-tight sm:text-4xl"
        >
          <span className="gradient-text">Research Papers</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className="mt-2 text-muted"
        >
          Scientific documents authored by CT1D&apos;s autonomous research engine
        </motion.p>
      </div>

      {/* Agent status card */}
      <AgentStatusCard status={agentStatus} />

      {/* Stats bar */}
      {!loading && papers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            { label: "Total Papers", value: stats.total, color: "text-foreground" },
            { label: "Drafts", value: stats.drafts, color: "text-yellow-400" },
            { label: "Published", value: stats.published, color: "text-green-400" },
            {
              label: "Avg Certainty",
              value: `${stats.avgCertainty}%`,
              color: "text-primary-light",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-center"
            >
              <div className={`text-xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs text-muted">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Filters + Sort */}
      {!loading && papers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="mb-8 space-y-4"
        >
          {/* Status filter */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted" />
            {[
              { value: "all", label: "All" },
              { value: "draft", label: "Drafts" },
              { value: "in_review", label: "In Review" },
              { value: "published", label: "Published" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? "bg-primary text-white"
                    : "border border-border bg-surface text-muted hover:text-foreground hover:border-primary/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Category filter + Sort */}
          <div className="flex flex-wrap items-center gap-3">
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    categoryFilter === "all"
                      ? "bg-accent text-white"
                      : "border border-border bg-surface text-muted hover:text-foreground hover:border-accent/50"
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => {
                  const color = CATEGORY_COLORS[cat] ?? "#6B7280";
                  const label =
                    CATEGORY_LABELS[cat] ?? cat.replace(/_/g, " ");
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        categoryFilter === cat
                          ? "text-white"
                          : "border border-border bg-surface text-muted hover:text-foreground hover:border-primary/50"
                      }`}
                      style={
                        categoryFilter === cat
                          ? { backgroundColor: color }
                          : undefined
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Sort */}
            <div className="ml-auto flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="date">Latest Updated</option>
                <option value="certainty">Certainty Level</option>
                <option value="version">Version</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <PaperSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Paper cards */}
      {!loading && filteredPapers.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredPapers.map((paper, i) => (
            <PaperCard key={paper.id} paper={paper} index={i} />
          ))}
        </div>
      )}

      {/* Filtered empty state */}
      {!loading &&
        papers.length > 0 &&
        filteredPapers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted/40" />
            <p className="text-lg font-medium text-muted">
              No papers match the current filters.
            </p>
            <p className="mt-1 text-sm text-muted/60">
              Try adjusting your status or category filter.
            </p>
          </div>
        )}

      {/* Empty state — no papers at all */}
      {!loading && papers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-surface">
            <BookOpen className="h-9 w-9 text-muted/40" />
          </div>
          <p className="text-lg font-medium text-muted">
            No research papers yet
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted/60">
            CT1D&apos;s research engine hasn&apos;t generated papers yet. The
            autonomous agent writes research papers every 30 minutes as it
            investigates T1D cure approaches.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-muted/50">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Waiting for the agent to generate its first paper...
          </div>
        </div>
      )}
    </div>
  );
}
