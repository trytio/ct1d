"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Filter } from "lucide-react";

import timelineData from "@/data/timeline-events.json";
import categoriesData from "@/data/categories.json";
import type { TimelineEvent } from "@/types/timeline";
import type { CategoryDefinition, Category } from "@/types/cure-approach";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const events = (timelineData as TimelineEvent[]).sort((a, b) => {
  if (a.year !== b.year) return a.year - b.year;
  return (a.month ?? 0) - (b.month ?? 0);
});

const categories = categoriesData as CategoryDefinition[];

const MONTH_NAMES = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type FilterCategory = Category | "general" | "all";

const filterOptions: { id: FilterCategory; label: string; color: string }[] = [
  { id: "all", label: "All", color: "#E8ECF4" },
  { id: "general", label: "General", color: "#9CA3AF" },
  ...categories.map((c) => ({ id: c.id as FilterCategory, label: c.name, color: c.color })),
];

function getCategoryColor(categoryId: string): string {
  if (categoryId === "general") return "#9CA3AF";
  return categories.find((c) => c.id === categoryId)?.color ?? "#9CA3AF";
}

function getCategoryName(categoryId: string): string {
  if (categoryId === "general") return "General";
  return categories.find((c) => c.id === categoryId)?.name ?? categoryId;
}

// ---------------------------------------------------------------------------
// Timeline Card
// ---------------------------------------------------------------------------
function TimelineCard({
  event,
  index,
  isLeft,
}: {
  event: TimelineEvent;
  index: number;
  isLeft: boolean;
}) {
  const color = getCategoryColor(event.category);
  const isMajor = event.significance === "major";
  const isIncremental = event.significance === "incremental";

  return (
    <div
      className={`relative flex w-full items-start gap-0 md:gap-8 ${
        isLeft ? "md:flex-row-reverse" : "md:flex-row"
      }`}
    >
      {/* Card side */}
      <div className={`w-full md:w-1/2 ${isLeft ? "md:pr-0 md:pl-0" : "md:pl-0 md:pr-0"}`}>
        <motion.div
          initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`relative rounded-xl border bg-surface transition-all ${
            isMajor
              ? "border-border/80 shadow-lg"
              : "border-border"
          } ${isIncremental ? "px-4 py-3" : "px-5 py-4"}`}
          style={
            isMajor
              ? {
                  boxShadow: `0 0 30px ${color}15, 0 0 60px ${color}08`,
                  borderColor: `${color}40`,
                }
              : undefined
          }
        >
          {/* Category accent bar */}
          <div
            className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl"
            style={{ backgroundColor: color }}
          />

          {/* Year */}
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`font-bold tracking-tight ${
                isMajor ? "text-xl text-foreground" : "text-base text-foreground"
              }`}
            >
              {event.year}
              {event.month ? (
                <span className="text-muted font-normal text-sm ml-1">
                  {MONTH_NAMES[event.month]}
                </span>
              ) : null}
            </span>
          </div>

          {/* Title */}
          <h3
            className={`font-semibold leading-snug text-foreground ${
              isMajor ? "text-base" : isIncremental ? "text-sm" : "text-sm"
            }`}
          >
            {event.title}
          </h3>

          {/* Description */}
          <p
            className={`mt-2 leading-relaxed text-muted ${
              isIncremental ? "text-xs" : "text-sm"
            }`}
          >
            {event.description}
          </p>

          {/* Footer: category badge + source */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              {getCategoryName(event.category)}
            </span>

            {event.source && (
              <a
                href={event.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary-light transition-colors"
              >
                {event.source.title}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </motion.div>
      </div>

      {/* Center dot — positioned on the timeline line */}
      <div className="absolute left-4 md:left-1/2 md:-translate-x-1/2 z-10">
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: 0.05, type: "spring", stiffness: 300 }}
          className={`rounded-full border-[3px] border-surface ${
            isMajor ? "h-5 w-5" : "h-3.5 w-3.5"
          }`}
          style={{ backgroundColor: color }}
        />
      </div>

      {/* Spacer for the opposite side (desktop only) */}
      <div className="hidden md:block md:w-1/2" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function TimelinePage() {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  const filteredEvents = useMemo(() => {
    if (activeFilter === "all") return events;
    return events.filter((e) => e.category === activeFilter);
  }, [activeFilter]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-surface/50 backdrop-blur-sm px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Breakthrough <span className="gradient-text">Timeline</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted sm:text-base">
            100+ years of progress toward a cure
          </p>
        </div>
      </div>

      {/* Filter chips */}
      <div className="sticky top-16 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Filter className="h-4 w-4 text-muted flex-shrink-0" />
            {filterOptions.map((opt) => {
              const isActive = activeFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setActiveFilter(opt.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all flex-shrink-0 ${
                    isActive
                      ? "text-white shadow-sm"
                      : "border border-border bg-surface text-muted hover:text-foreground hover:border-border/80"
                  }`}
                  style={
                    isActive
                      ? { backgroundColor: opt.color === "#E8ECF4" ? "#374151" : opt.color }
                      : undefined
                  }
                >
                  {opt.id !== "all" && opt.id !== "general" && (
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: isActive ? "#fff" : opt.color,
                      }}
                    />
                  )}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <div className="relative">
          {/* Vertical timeline line */}
          <div
            className="absolute left-[22px] md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5"
            style={{
              background:
                "linear-gradient(to bottom, #1F293700, #374151 10%, #374151 80%, #3B82F6 95%, #10B981)",
            }}
          />

          {/* Events */}
          <div className="space-y-8 sm:space-y-10">
            {filteredEvents.map((event, index) => (
              <div
                key={event.id}
                className="relative pl-12 md:pl-0"
              >
                <TimelineCard
                  event={event}
                  index={index}
                  isLeft={index % 2 === 0}
                />
              </div>
            ))}
          </div>

          {/* End marker */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, type: "spring" }}
            className="relative mt-12 flex justify-center md:justify-center"
          >
            <div className="absolute left-[22px] md:left-1/2 md:-translate-x-1/2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-surface glow">
                <span className="gradient-text text-sm font-bold">...</span>
              </div>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-16 text-center text-sm text-muted"
          >
            The journey continues. A cure is closer than ever.
          </motion.p>
        </div>
      </div>
    </div>
  );
}
