"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ChevronLeft,
  FileText,
  Clock,
  BookOpen,
  AlertTriangle,
  ExternalLink,
  MessageCircle,
  Beaker,
  Quote,
  History,
  ListTree,
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

// ---------------------------------------------------------------------------
// Category + Status config
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
// Certainty color
// ---------------------------------------------------------------------------
function certaintyColor(level: number): string {
  if (level < 30) return "#EF4444";
  if (level < 60) return "#EAB308";
  if (level < 80) return "#10B981";
  return "#22C55E";
}

// ---------------------------------------------------------------------------
// Certainty Arc (SVG)
// ---------------------------------------------------------------------------
function CertaintyArc({ level }: { level: number }) {
  const radius = 54;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  // We use a 270-degree arc (3/4 of circle)
  const arcLength = circumference * 0.75;
  const filledLength = (level / 100) * arcLength;
  const dashOffset = arcLength - filledLength;
  const color = certaintyColor(level);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg
          width={radius * 2}
          height={radius * 2}
          viewBox={`0 0 ${radius * 2} ${radius * 2}`}
          className="-rotate-[135deg]"
        >
          {/* Background arc */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="var(--surface-light, #1F2937)"
            strokeWidth={stroke}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${filledLength} ${circumference}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold"
            style={{ color }}
          >
            {level}%
          </span>
        </div>
      </div>
      <span className="mt-1 text-xs font-medium text-muted">
        Certainty Level
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table of Contents
// ---------------------------------------------------------------------------
function TableOfContents({
  paper,
  activeSection,
  onNavigate,
}: {
  paper: ScientificPaper;
  activeSection: string;
  onNavigate: (id: string) => void;
}) {
  const sortedSections = [...paper.sections].sort(
    (a, b) => a.order - b.order
  );

  const tocItems = [
    { id: "abstract", label: "Abstract" },
    ...sortedSections.map((s) => ({
      id: `section-${s.order}`,
      label: s.title,
    })),
    { id: "methodology", label: "Methodology" },
    { id: "limitations", label: "Limitations" },
    { id: "citations", label: "Citations" },
    { id: "review-history", label: "Review History" },
  ];

  return (
    <nav className="space-y-0.5">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
        <ListTree className="h-3.5 w-3.5" />
        Contents
      </div>
      {tocItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`block w-full rounded-lg px-3 py-1.5 text-left text-xs transition-colors ${
            activeSection === item.id
              ? "bg-primary/10 font-medium text-primary-light"
              : "text-muted hover:bg-surface-light hover:text-foreground"
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function PaperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [paper, setPaper] = useState<ScientificPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("abstract");
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch paper
  useEffect(() => {
    async function fetchPaper() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/papers?id=${encodeURIComponent(id)}`);
        if (res.status === 404) {
          setError("Paper not found.");
          return;
        }
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        setPaper(data.paper);
      } catch {
        setError("Failed to load paper. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchPaper();
  }, [id]);

  // Scroll handler for active section tracking
  useEffect(() => {
    if (!contentRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    const sections = contentRef.current.querySelectorAll("[data-section]");
    sections.forEach((s) => observer.observe(s));

    return () => observer.disconnect();
  }, [paper]);

  // Navigate to section
  const navigateToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted">Loading paper...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error || !paper) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 text-muted/40" />
        <p className="text-lg font-medium text-muted">
          {error ?? "Paper not found."}
        </p>
        <Link
          href="/papers"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-surface-light"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Papers
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[paper.status] ?? STATUS_CONFIG.draft;
  const catColor = CATEGORY_COLORS[paper.category] ?? "#6B7280";
  const catLabel =
    CATEGORY_LABELS[paper.category] ?? paper.category.replace(/_/g, " ");
  const sortedSections = [...paper.sections].sort(
    (a, b) => a.order - b.order
  );
  const sortedHistory = [...paper.reviewHistory].sort(
    (a, b) => b.version - a.version
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link
          href="/papers"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Papers
        </Link>
      </motion.div>

      {/* Paper header */}
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 rounded-2xl border border-border bg-surface p-6 sm:p-8"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
              {paper.title}
            </h1>
            <p className="mt-2 text-sm text-muted">
              Authored by CT1D Autonomous Research Engine
            </p>

            {/* Badges */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: statusCfg.bg,
                  color: statusCfg.color,
                }}
              >
                {statusCfg.label}
              </span>
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${catColor}18`,
                  color: catColor,
                }}
              >
                {catLabel}
              </span>
            </div>

            {/* Meta */}
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                Version {paper.version}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Created{" "}
                {new Date(paper.createdAt).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Updated{" "}
                {new Date(paper.updatedAt).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Certainty arc */}
          <div className="flex shrink-0 justify-center lg:justify-end">
            <CertaintyArc level={paper.certaintyLevel} />
          </div>
        </div>
      </motion.header>

      {/* Main content area: sidebar + body */}
      <div className="flex gap-8">
        {/* Sidebar - Table of Contents */}
        <motion.aside
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="hidden w-56 shrink-0 lg:block"
        >
          <div className="sticky top-24 rounded-2xl border border-border bg-surface p-4">
            <TableOfContents
              paper={paper}
              activeSection={activeSection}
              onNavigate={navigateToSection}
            />
          </div>
        </motion.aside>

        {/* Paper body */}
        <motion.div
          ref={contentRef}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="min-w-0 flex-1"
        >
          {/* Abstract */}
          <section
            id="abstract"
            data-section
            className="mb-10 scroll-mt-24 rounded-2xl border-l-4 border-accent bg-surface p-6"
          >
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
              <BookOpen className="h-5 w-5 text-accent" />
              Abstract
            </h2>
            <div className="prose prose-invert prose-sm max-w-none text-muted prose-p:leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {paper.abstract}
              </ReactMarkdown>
            </div>
          </section>

          {/* Paper Sections */}
          {sortedSections.map((section) => (
            <section
              key={section.order}
              id={`section-${section.order}`}
              data-section
              className="mb-10 scroll-mt-24"
            >
              <h2 className="mb-4 text-xl font-bold text-foreground">
                {section.title}
              </h2>
              <div className="prose prose-invert prose-sm max-w-none text-muted prose-headings:text-foreground prose-p:leading-relaxed prose-a:text-primary-light prose-strong:text-foreground prose-code:text-accent-light prose-pre:bg-surface-light prose-pre:border prose-pre:border-border">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {section.content}
                </ReactMarkdown>
              </div>
            </section>
          ))}

          {/* Methodology */}
          {paper.methodology && (
            <section
              id="methodology"
              data-section
              className="mb-10 scroll-mt-24"
            >
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground">
                <Beaker className="h-5 w-5 text-primary" />
                Methodology
              </h2>
              <div className="prose prose-invert prose-sm max-w-none text-muted prose-p:leading-relaxed prose-a:text-primary-light prose-strong:text-foreground prose-code:text-accent-light">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {paper.methodology}
                </ReactMarkdown>
              </div>
            </section>
          )}

          {/* Limitations */}
          {paper.limitations.length > 0 && (
            <section
              id="limitations"
              data-section
              className="mb-10 scroll-mt-24"
            >
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                Limitations
              </h2>
              <ul className="space-y-2">
                {paper.limitations.map((limitation, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400/70" />
                    <span className="text-sm leading-relaxed text-muted">
                      {limitation}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Citations */}
          {paper.citations.length > 0 && (
            <section
              id="citations"
              data-section
              className="mb-10 scroll-mt-24"
            >
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground">
                <Quote className="h-5 w-5 text-primary-light" />
                Citations
              </h2>
              <ol className="space-y-3">
                {paper.citations.map((citation, i) => {
                  const citUrl =
                    citation.url ??
                    (citation.doi
                      ? `https://doi.org/${citation.doi}`
                      : null);
                  return (
                    <li
                      key={citation.id}
                      className="rounded-lg border border-border bg-surface p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-light text-xs font-bold text-muted">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1 text-sm leading-relaxed">
                          <span className="text-muted">
                            {citation.authors}.
                          </span>{" "}
                          <span className="font-medium text-foreground">
                            &ldquo;{citation.title}.&rdquo;
                          </span>{" "}
                          <span className="italic text-muted">
                            {citation.journal}
                          </span>
                          , {citation.year}.
                          {citation.doi && (
                            <span className="ml-1 text-muted">
                              DOI: {citation.doi}
                            </span>
                          )}
                          {citUrl && (
                            <a
                              href={citUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 inline-flex items-center gap-1 text-primary hover:text-primary-light transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="text-xs">Open</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* Review History */}
          {paper.reviewHistory.length > 0 && (
            <section
              id="review-history"
              data-section
              className="mb-10 scroll-mt-24"
            >
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-foreground">
                <History className="h-5 w-5 text-muted" />
                Review History
              </h2>
              <div className="relative space-y-0">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />

                {sortedHistory.map((entry, i) => (
                  <div key={i} className="relative flex gap-4 pb-4">
                    {/* Dot */}
                    <div
                      className={`relative z-10 mt-1 flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full border-2 ${
                        i === 0
                          ? "border-primary bg-primary/20"
                          : "border-border bg-surface"
                      }`}
                    >
                      <div
                        className={`h-2 w-2 rounded-full ${
                          i === 0 ? "bg-primary" : "bg-muted/50"
                        }`}
                      />
                    </div>
                    {/* Content */}
                    <div className="min-w-0 flex-1 rounded-lg border border-border bg-surface p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold ${
                            i === 0 ? "text-primary" : "text-muted"
                          }`}
                        >
                          v{entry.version}
                        </span>
                        <span className="text-xs text-muted/60">
                          {new Date(entry.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {entry.changes}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Talk to AI button */}
          <div className="mb-8 flex justify-center">
            <Link
              href={`/chat?q=${encodeURIComponent(
                `Tell me about the research paper "${paper.title}" and its findings about T1D cure approaches.`
              )}`}
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-6 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <MessageCircle className="h-4 w-4" />
              Talk to AI about this paper
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
