import { readFile, writeFile, readdir, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Hypothesis {
  id: string;
  title: string;
  description: string;
  category: string; // stem_cell, immunotherapy, gene_editing, etc.
  status:
    | "active"
    | "promising"
    | "needs_evidence"
    | "disproven"
    | "validated";
  confidence: number; // 0-100
  reasoning: string;
  evidence: EvidenceItem[];
  iterations: number;
  approach: string; // What cure approach this relates to
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceItem {
  id: string;
  type: "supporting" | "contradicting" | "neutral";
  source: string; // PubMed PMID, ClinicalTrials NCT, etc.
  title: string;
  content: string;
  weight: number; // 1-10 based on study quality
  timestamp: string;
}

export interface ResearchSession {
  id: string;
  timestamp: string;
  cycleNumber: number;
  focus: string;
  approach: string;
  findings: string[];
  hypothesesUpdated: string[];
  hypothesesCreated: string[];
  papersUpdated: string[];
  duration: number; // ms
  tokensUsed: number;
  summary: string;
}

export interface ScientificPaper {
  id: string;
  title: string;
  abstract: string;
  status: "draft" | "in_review" | "published";
  version: number;
  sections: PaperSection[];
  methodology: string;
  certaintyLevel: number; // 0-100
  limitations: string[];
  citations: Citation[];
  hypothesisIds: string[];
  category: string;
  createdAt: string;
  updatedAt: string;
  reviewHistory: { date: string; changes: string; version: number }[];
}

export interface PaperSection {
  title: string;
  content: string;
  order: number;
}

export interface Citation {
  id: string;
  authors: string;
  title: string;
  journal: string;
  year: number;
  doi?: string;
  url?: string;
}

export interface KnowledgeEntry {
  id: string;
  topic: string;
  content: string;
  sources: string[];
  lastUpdated: string;
}

export interface MemoryStats {
  hypotheses: number;
  sessions: number;
  papers: number;
  knowledgeEntries: number;
  lastSession: string | null;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const MEMORY_ROOT = path.join(process.cwd(), "src", "data", "memory");

const DIRS = {
  hypotheses: path.join(MEMORY_ROOT, "hypotheses"),
  sessions: path.join(MEMORY_ROOT, "sessions"),
  papers: path.join(MEMORY_ROOT, "papers"),
  knowledge: path.join(MEMORY_ROOT, "knowledge"),
  evidence: path.join(MEMORY_ROOT, "evidence"),
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a short unique ID: prefix + timestamp-based + random suffix. */
export function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${ts}_${rand}`;
}

async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function listJsonFiles(dirPath: string): Promise<string[]> {
  await ensureDir(dirPath);
  try {
    const files = await readdir(dirPath);
    return files.filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
}

async function loadAllFromDir<T>(dirPath: string): Promise<T[]> {
  const files = await listJsonFiles(dirPath);
  const items: T[] = [];
  for (const file of files) {
    const item = await readJsonFile<T>(path.join(dirPath, file));
    if (item) items.push(item);
  }
  return items;
}

// ---------------------------------------------------------------------------
// Hypotheses
// ---------------------------------------------------------------------------

export async function saveHypothesis(h: Hypothesis): Promise<void> {
  const filePath = path.join(DIRS.hypotheses, `${h.id}.json`);
  await writeJsonFile(filePath, h);
}

export async function getHypotheses(): Promise<Hypothesis[]> {
  // Load individual hypothesis files (exclude seed.json which is an array)
  await ensureDir(DIRS.hypotheses);
  const files = await readdir(DIRS.hypotheses);
  const individualFiles = files.filter(
    (f) => f.endsWith(".json") && f !== "seed.json"
  );

  let hypotheses: Hypothesis[] = [];

  if (individualFiles.length > 0) {
    for (const file of individualFiles) {
      const h = await readJsonFile<Hypothesis>(
        path.join(DIRS.hypotheses, file)
      );
      if (h && h.id && h.title) hypotheses.push(h);
    }
  } else {
    // No individual files — load from seed.json and split into individual files
    const seedPath = path.join(DIRS.hypotheses, "seed.json");
    const seeds = await readJsonFile<Hypothesis[]>(seedPath);
    if (seeds && Array.isArray(seeds)) {
      for (const seed of seeds) {
        await saveHypothesis(seed);
      }
      hypotheses = seeds;
    }
  }

  return hypotheses.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getHypothesis(id: string): Promise<Hypothesis | null> {
  return readJsonFile<Hypothesis>(path.join(DIRS.hypotheses, `${id}.json`));
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export async function saveEvidence(
  e: EvidenceItem,
  hypothesisId: string
): Promise<void> {
  // Store evidence in its own directory for global lookup
  const evidencePath = path.join(DIRS.evidence, `${e.id}.json`);
  await writeJsonFile(evidencePath, { ...e, hypothesisId });

  // Also attach evidence to the hypothesis
  const hypothesis = await getHypothesis(hypothesisId);
  if (hypothesis) {
    const exists = hypothesis.evidence.some((ex) => ex.id === e.id);
    if (!exists) {
      hypothesis.evidence.push(e);
    } else {
      hypothesis.evidence = hypothesis.evidence.map((ex) =>
        ex.id === e.id ? e : ex
      );
    }
    hypothesis.updatedAt = new Date().toISOString();
    await saveHypothesis(hypothesis);
  }
}

// ---------------------------------------------------------------------------
// Research Sessions
// ---------------------------------------------------------------------------

export async function saveSession(s: ResearchSession): Promise<void> {
  const filePath = path.join(DIRS.sessions, `${s.id}.json`);
  await writeJsonFile(filePath, s);
}

export async function getSessions(limit?: number): Promise<ResearchSession[]> {
  const sessions = await loadAllFromDir<ResearchSession>(DIRS.sessions);
  sessions.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return limit ? sessions.slice(0, limit) : sessions;
}

export async function getNextCycleNumber(): Promise<number> {
  const sessions = await getSessions();
  if (sessions.length === 0) return 1;
  return Math.max(...sessions.map((s) => s.cycleNumber)) + 1;
}

// ---------------------------------------------------------------------------
// Scientific Papers
// ---------------------------------------------------------------------------

export async function savePaper(p: ScientificPaper): Promise<void> {
  const filePath = path.join(DIRS.papers, `${p.id}.json`);
  await writeJsonFile(filePath, p);
}

export async function getPapers(): Promise<ScientificPaper[]> {
  const papers = await loadAllFromDir<ScientificPaper>(DIRS.papers);
  return papers.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getPaper(id: string): Promise<ScientificPaper | null> {
  return readJsonFile<ScientificPaper>(path.join(DIRS.papers, `${id}.json`));
}

// ---------------------------------------------------------------------------
// Knowledge Entries
// ---------------------------------------------------------------------------

export async function saveKnowledge(entry: KnowledgeEntry): Promise<void> {
  const filePath = path.join(DIRS.knowledge, `${entry.id}.json`);
  await writeJsonFile(filePath, entry);
}

export async function getKnowledge(): Promise<KnowledgeEntry[]> {
  return loadAllFromDir<KnowledgeEntry>(DIRS.knowledge);
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getMemoryStats(): Promise<MemoryStats> {
  const [hypotheses, sessions, papers, knowledge] = await Promise.all([
    listJsonFiles(DIRS.hypotheses),
    listJsonFiles(DIRS.sessions),
    listJsonFiles(DIRS.papers),
    listJsonFiles(DIRS.knowledge),
  ]);

  // Exclude seed.json from hypothesis count
  const hypothesisCount = hypotheses.filter((f) => f !== "seed.json").length;

  let lastSession: string | null = null;
  if (sessions.length > 0) {
    const allSessions = await getSessions(1);
    if (allSessions.length > 0) {
      lastSession = allSessions[0].timestamp;
    }
  }

  return {
    hypotheses: hypothesisCount,
    sessions: sessions.length,
    papers: papers.length,
    knowledgeEntries: knowledge.length,
    lastSession,
  };
}
