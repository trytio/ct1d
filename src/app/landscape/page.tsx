"use client";

import { useState, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import {
  X,
  ExternalLink,
  MessageCircle,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Info,
} from "lucide-react";

import approachesData from "@/data/cure-approaches.json";
import categoriesData from "@/data/categories.json";
import {
  PHASE_LABELS,
  PHASE_COLORS,
  type CureApproach,
  type CategoryDefinition,
  type Phase,
  type Category,
} from "@/types/cure-approach";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const approaches = approachesData as CureApproach[];
const categories = categoriesData as CategoryDefinition[];

const CATEGORY_ORDER: Category[] = [
  "stem_cell",
  "immunotherapy",
  "gene_editing",
  "beta_cell_regeneration",
  "encapsulation",
  "combination",
  "artificial_pancreas",
];

const PHASE_ORDER: Phase[] = [
  "preclinical",
  "phase_1",
  "phase_1_2",
  "phase_2",
  "phase_3",
  "approved",
  "discontinued",
];

function getCategoryColor(categoryId: string): string {
  return categories.find((c) => c.id === categoryId)?.color ?? "#6B7280";
}

function getCategoryName(categoryId: string): string {
  return categories.find((c) => c.id === categoryId)?.name ?? categoryId;
}

// ---------------------------------------------------------------------------
// Custom Node Component
// ---------------------------------------------------------------------------
type ApproachNodeData = {
  approach: CureApproach;
  categoryColor: string;
  phaseColor: string;
  phaseLabel: string;
};

function ApproachNode({ data }: NodeProps<Node<ApproachNodeData>>) {
  const { approach, categoryColor, phaseColor, phaseLabel } = data;

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-border !border-0 !w-2 !h-2"
      />
      <div
        className="rounded-xl border border-border bg-surface px-4 py-3 shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl cursor-pointer"
        style={{
          borderLeftWidth: 3,
          borderLeftColor: categoryColor,
          minWidth: 180,
          maxWidth: 220,
        }}
      >
        <div className="text-xs font-medium text-muted truncate mb-1">
          {approach.organization}
        </div>
        <div className="text-sm font-semibold text-foreground leading-tight mb-2">
          {approach.name}
        </div>
        <span
          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: phaseColor }}
        >
          {phaseLabel}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-border !border-0 !w-2 !h-2"
      />
    </>
  );
}

const nodeTypes = { approach: ApproachNode };

// ---------------------------------------------------------------------------
// Layout computation
// ---------------------------------------------------------------------------
const COLUMN_WIDTH = 280;
const ROW_HEIGHT = 120;
const CATEGORY_GAP = 60;
const X_OFFSET = 80;
const Y_OFFSET = 80;

function buildNodesAndEdges(): { nodes: Node<ApproachNodeData>[]; edges: Edge[] } {
  const nodes: Node<ApproachNodeData>[] = [];
  const edges: Edge[] = [];

  // Group approaches by category
  const byCategory = new Map<Category, CureApproach[]>();
  for (const cat of CATEGORY_ORDER) {
    byCategory.set(cat, []);
  }
  for (const a of approaches) {
    const list = byCategory.get(a.category);
    if (list) list.push(a);
  }

  let yAccum = Y_OFFSET;

  for (const cat of CATEGORY_ORDER) {
    const items = byCategory.get(cat) ?? [];
    if (items.length === 0) continue;

    // Sort items within category by phase order
    items.sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase));

    for (let i = 0; i < items.length; i++) {
      const approach = items[i];
      const phaseIdx = PHASE_ORDER.indexOf(approach.phase);
      const x = X_OFFSET + phaseIdx * COLUMN_WIDTH;
      const y = yAccum + i * ROW_HEIGHT;

      nodes.push({
        id: approach.id,
        type: "approach",
        position: { x, y },
        data: {
          approach,
          categoryColor: getCategoryColor(approach.category),
          phaseColor: PHASE_COLORS[approach.phase],
          phaseLabel: PHASE_LABELS[approach.phase],
        },
      });
    }

    yAccum += items.length * ROW_HEIGHT + CATEGORY_GAP;
  }

  // Build edges from relatedApproachIds
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edgeSet = new Set<string>();

  for (const approach of approaches) {
    for (const relId of approach.relatedApproachIds) {
      if (!nodeIds.has(relId)) continue;
      const edgeKey = [approach.id, relId].sort().join("--");
      if (edgeSet.has(edgeKey)) continue;
      edgeSet.add(edgeKey);

      edges.push({
        id: `e-${approach.id}-${relId}`,
        source: approach.id,
        target: relId,
        animated: false,
        style: { stroke: "#374151", strokeWidth: 1.5 },
      });
    }
  }

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Detail Panel
// ---------------------------------------------------------------------------
function DetailPanel({
  approach,
  onClose,
}: {
  approach: CureApproach;
  onClose: () => void;
}) {
  const catColor = getCategoryColor(approach.category);
  const catName = getCategoryName(approach.category);

  return (
    <div className="absolute top-0 right-0 bottom-0 z-20 w-full max-w-md overflow-y-auto border-l border-border bg-surface/95 backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface/90 backdrop-blur-md px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: catColor }}
            />
            <span className="text-xs font-medium text-muted truncate">{catName}</span>
          </div>
          <h2 className="text-lg font-bold text-foreground leading-snug">
            {approach.name}
          </h2>
          <p className="text-sm text-muted mt-0.5">{approach.organization}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted hover:bg-surface-light hover:text-foreground transition-colors flex-shrink-0"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-5 py-5 space-y-6">
        {/* Phase badge */}
        <div className="flex items-center gap-2">
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: PHASE_COLORS[approach.phase] }}
          >
            {PHASE_LABELS[approach.phase]}
          </span>
        </div>

        {/* Plain language summary */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-primary-light flex-shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">In Plain Language</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            {approach.plainLanguageSummary}
          </p>
        </div>

        {/* Key Findings */}
        {approach.keyFindings.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-accent flex-shrink-0" />
              <h3 className="text-sm font-semibold text-foreground">Key Findings</h3>
            </div>
            <ul className="space-y-1.5">
              {approach.keyFindings.map((finding, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent flex-shrink-0 mt-0.5" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Challenges */}
        {approach.challenges.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
              <h3 className="text-sm font-semibold text-foreground">Challenges</h3>
            </div>
            <ul className="space-y-1.5">
              {approach.challenges.map((challenge, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted">
                  <span className="text-yellow-500 flex-shrink-0 mt-1">&#8226;</span>
                  <span>{challenge}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Studies */}
        {approach.keyStudies.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Key Studies</h3>
            <div className="space-y-2">
              {approach.keyStudies.map((study, i) => (
                <a
                  key={i}
                  href={study.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 rounded-lg border border-border bg-surface-light p-3 text-sm text-muted hover:border-primary/40 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-primary" />
                  <div>
                    <div className="text-foreground font-medium text-xs">{study.title}</div>
                    <div className="text-xs text-muted mt-0.5">
                      {study.journal} ({study.year})
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Talk to AI CTA */}
        <Link
          href="/chat"
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 hover:shadow-[0_0_24px_rgba(59,130,246,0.3)] w-full"
        >
          <MessageCircle className="h-4 w-4" />
          Talk to AI about this
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------
function Legend() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute top-4 left-4 z-10">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="rounded-lg border border-border bg-surface/90 backdrop-blur-md px-3 py-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
      >
        {collapsed ? "Show Legend" : "Legend"}
      </button>

      {!collapsed && (
        <div className="mt-2 rounded-xl border border-border bg-surface/95 backdrop-blur-xl p-4 shadow-lg space-y-4 max-w-[200px]">
          {/* Categories */}
          <div>
            <h4 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
              Categories
            </h4>
            <div className="space-y-1.5">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-[11px] text-muted">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Phases */}
          <div>
            <h4 className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2">
              Phases
            </h4>
            <div className="space-y-1.5">
              {PHASE_ORDER.map((phase) => (
                <div key={phase} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-5 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: PHASE_COLORS[phase] }}
                  />
                  <span className="text-[11px] text-muted">{PHASE_LABELS[phase]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Flow Component (must be inside ReactFlowProvider)
// ---------------------------------------------------------------------------
function LandscapeFlow() {
  const [selectedApproach, setSelectedApproach] = useState<CureApproach | null>(null);

  const { nodes, edges } = useMemo(() => buildNodesAndEdges(), []);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const approach = approaches.find((a) => a.id === node.id);
      if (approach) setSelectedApproach(approach);
    },
    []
  );

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="!bg-background"
      >
        <Background color="#374151" gap={20} size={1} />
        <Controls
          className="!bg-surface !border-border !rounded-lg !shadow-lg [&>button]:!bg-surface [&>button]:!border-border [&>button]:!text-muted [&>button:hover]:!bg-surface-light [&>button:hover]:!text-foreground [&>button>svg]:!fill-current"
          showInteractive={false}
        />
        <MiniMap
          className="!bg-surface !border-border !rounded-lg"
          nodeColor={(node) => {
            const data = node.data as ApproachNodeData | undefined;
            return data?.categoryColor ?? "#374151";
          }}
          maskColor="rgba(10, 14, 26, 0.7)"
        />
      </ReactFlow>

      <Legend />

      {selectedApproach && (
        <DetailPanel
          approach={selectedApproach}
          onClose={() => setSelectedApproach(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LandscapePage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border bg-surface/50 backdrop-blur-sm px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Cure <span className="gradient-text">Landscape</span>
          </h1>
          <p className="mt-1.5 text-sm text-muted sm:text-base">
            Every path being explored to cure T1D
          </p>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 relative">
        <ReactFlowProvider>
          <LandscapeFlow />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
