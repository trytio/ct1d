"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Filter,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Clock,
  Users,
  MapPin,
  Building2,
  Loader2,
} from "lucide-react";
import {
  TRIAL_STATUS_LABELS,
  TRIAL_STATUS_COLORS,
} from "@/types/trial";
import type { ClinicalTrial, TrialSearchResult } from "@/types/trial";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "RECRUITING", label: "Recruiting" },
  { value: "ACTIVE_NOT_RECRUITING", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
];

const PHASE_OPTIONS = [
  { value: "", label: "All Phases" },
  { value: "PHASE1", label: "Phase 1" },
  { value: "PHASE2", label: "Phase 2" },
  { value: "PHASE3", label: "Phase 3" },
];

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
function TrialSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-surface p-6">
      <div className="h-5 w-3/4 rounded bg-surface-light" />
      <div className="mt-3 h-4 w-1/3 rounded bg-surface-light" />
      <div className="mt-4 flex gap-2">
        <div className="h-6 w-20 rounded-full bg-surface-light" />
        <div className="h-6 w-16 rounded-full bg-surface-light" />
      </div>
      <div className="mt-4 flex gap-4">
        <div className="h-4 w-24 rounded bg-surface-light" />
        <div className="h-4 w-24 rounded bg-surface-light" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trial Card
// ---------------------------------------------------------------------------
function TrialCard({
  trial,
  isExpanded,
  onToggle,
}: {
  trial: ClinicalTrial;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusColor =
    TRIAL_STATUS_COLORS[trial.status] ?? "#EF4444";
  const statusLabel =
    TRIAL_STATUS_LABELS[trial.status] ?? trial.status;

  // Derive a friendly phase label
  const phaseLabel = trial.phase
    ? trial.phase
        .replace("EARLY_PHASE1", "Early Phase 1")
        .replace("PHASE1", "Phase 1")
        .replace("PHASE2", "Phase 2")
        .replace("PHASE3", "Phase 3")
        .replace("PHASE4", "Phase 4")
        .replace("NA", "N/A")
    : "N/A";

  return (
    <div className="rounded-2xl border border-border bg-surface transition-all duration-200">
      {/* Clickable header */}
      <button onClick={onToggle} className="w-full p-6 text-left">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold leading-snug text-foreground">
              {trial.title}
            </h3>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
              <span className="font-mono">{trial.nctId}</span>
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

        {/* Sponsor */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          {trial.sponsor}
        </div>

        {/* Badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${statusColor}20`,
              color: statusColor,
            }}
          >
            {statusLabel}
          </span>
          <span className="inline-flex items-center rounded-full bg-surface-light px-2.5 py-0.5 text-xs font-medium text-muted">
            {phaseLabel}
          </span>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
          {trial.enrollment != null && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {trial.enrollment.toLocaleString()} enrolled
            </span>
          )}
          {trial.startDate && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Start: {trial.startDate}
            </span>
          )}
          {trial.completionDate && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Est. completion: {trial.completionDate}
            </span>
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-border px-6 pb-6 pt-4">
          {/* Summary */}
          {trial.summary && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground">
                Summary
              </h4>
              <p className="text-sm leading-relaxed text-muted">
                {trial.summary}
              </p>
            </div>
          )}

          {/* Interventions */}
          {trial.interventions.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground">
                Interventions
              </h4>
              <ul className="space-y-1">
                {trial.interventions.map((intervention, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted"
                  >
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {intervention}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Conditions */}
          {trial.conditions.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground">
                Conditions
              </h4>
              <div className="flex flex-wrap gap-2">
                {trial.conditions.map((condition, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-surface-light px-3 py-1 text-xs text-muted"
                  >
                    {condition}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Locations */}
          {trial.locations.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground">
                Locations
              </h4>
              <ul className="space-y-1">
                {trial.locations.map((location, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-muted"
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    {location}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ClinicalTrials.gov link */}
          <a
            href={trial.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <ExternalLink className="h-4 w-4" />
            View on ClinicalTrials.gov
          </a>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function TrialsPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("RECRUITING");
  const [phaseFilter, setPhaseFilter] = useState("");
  const [trials, setTrials] = useState<ClinicalTrial[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTrials = useCallback(
    async (opts?: { append?: boolean; pageToken?: string }) => {
      const { append = false, pageToken } = opts ?? {};

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams();
        const q = query.trim() || "type 1 diabetes";
        params.set("query", q);
        if (statusFilter) params.set("status", statusFilter);
        if (phaseFilter) params.set("phase", phaseFilter);
        params.set("pageSize", "10");
        if (pageToken) params.set("pageToken", pageToken);

        const res = await fetch(`/api/trials?${params.toString()}`);
        if (!res.ok) throw new Error("Fetch failed");

        const data: TrialSearchResult = await res.json();

        if (append) {
          setTrials((prev) => [...prev, ...data.trials]);
        } else {
          setTrials(data.trials);
        }

        setTotalCount(data.totalCount);
        setNextPageToken(data.nextPageToken);
        setHasSearched(true);
      } catch {
        if (!append) setTrials([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, statusFilter, phaseFilter]
  );

  // Initial load + debounced search on filter/query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchTrials();
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchTrials]);

  const handleLoadMore = () => {
    if (nextPageToken && !loadingMore) {
      fetchTrials({ append: true, pageToken: nextPageToken });
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="gradient-text">Clinical Trials</span>
        </h1>
        <p className="mt-2 text-muted">
          Find active trials for T1D cures
        </p>
      </div>

      {/* Search + Filters */}
      <div className="mb-8 space-y-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by intervention or keyword (e.g., stem cell, teplizumab)"
            className="w-full rounded-xl border border-border bg-surface py-3.5 pl-12 pr-4 text-sm text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-3">
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted" />
            <div className="flex gap-1 overflow-x-auto">
              {STATUS_OPTIONS.map((opt) => (
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
          </div>

          {/* Phase filter */}
          <div className="flex gap-1 overflow-x-auto">
            {PHASE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPhaseFilter(opt.value)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  phaseFilter === opt.value
                    ? "bg-accent text-white"
                    : "border border-border bg-surface text-muted hover:text-foreground hover:border-accent/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      {hasSearched && !loading && (
        <p className="mb-4 text-sm text-muted">
          {totalCount > 0
            ? `Showing ${trials.length} of ${totalCount.toLocaleString()} trials`
            : "No trials found"}
        </p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <TrialSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Trial cards */}
      {!loading && trials.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {trials.map((trial) => (
              <TrialCard
                key={trial.nctId}
                trial={trial}
                isExpanded={expandedId === trial.nctId}
                onToggle={() =>
                  setExpandedId(
                    expandedId === trial.nctId ? null : trial.nctId
                  )
                }
              />
            ))}
          </div>

          {/* Load more */}
          {nextPageToken && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-surface-light disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more trials"
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && hasSearched && trials.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FlaskConical className="mb-4 h-12 w-12 text-muted/40" />
          <p className="text-lg font-medium text-muted">No trials found.</p>
          <p className="mt-1 text-sm text-muted/60">
            Try adjusting your search or filters.
          </p>
        </div>
      )}
    </div>
  );
}
