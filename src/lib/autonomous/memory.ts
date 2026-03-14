import { query, withTransaction } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Hypothesis {
  id: string;
  title: string;
  description: string;
  category: string;
  status:
    | "active"
    | "promising"
    | "needs_evidence"
    | "disproven"
    | "validated";
  confidence: number;
  reasoning: string;
  evidence: EvidenceItem[];
  iterations: number;
  approach: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceItem {
  id: string;
  type: "supporting" | "contradicting" | "neutral";
  source: string;
  title: string;
  content: string;
  weight: number;
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
  duration: number;
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
  certaintyLevel: number;
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
// Helpers
// ---------------------------------------------------------------------------

/** Generate a short unique ID: prefix + timestamp-based + random suffix. */
export function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${ts}_${rand}`;
}

// ---------------------------------------------------------------------------
// Hypotheses
// ---------------------------------------------------------------------------

export async function saveHypothesis(h: Hypothesis): Promise<void> {
  await query(
    `INSERT INTO hypotheses (id, title, description, category, status, confidence, reasoning, approach, iterations, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       category = EXCLUDED.category,
       status = EXCLUDED.status,
       confidence = EXCLUDED.confidence,
       reasoning = EXCLUDED.reasoning,
       approach = EXCLUDED.approach,
       iterations = EXCLUDED.iterations,
       updated_at = EXCLUDED.updated_at`,
    [
      h.id, h.title, h.description, h.category, h.status,
      h.confidence, h.reasoning, h.approach, h.iterations,
      h.createdAt, h.updatedAt,
    ]
  );
}

export async function getHypotheses(): Promise<Hypothesis[]> {
  const result = await query(
    `SELECT h.*,
       COALESCE(
         json_agg(
           json_build_object(
             'id', e.id, 'type', e.type, 'source', e.source,
             'title', e.title, 'content', e.content, 'weight', e.weight,
             'timestamp', e.created_at
           )
         ) FILTER (WHERE e.id IS NOT NULL), '[]'
       ) AS evidence
     FROM hypotheses h
     LEFT JOIN evidence e ON e.hypothesis_id = h.id
     GROUP BY h.id
     ORDER BY h.updated_at DESC`
  );

  return result.rows.map(rowToHypothesis);
}

export async function getHypothesis(id: string): Promise<Hypothesis | null> {
  const result = await query(
    `SELECT h.*,
       COALESCE(
         json_agg(
           json_build_object(
             'id', e.id, 'type', e.type, 'source', e.source,
             'title', e.title, 'content', e.content, 'weight', e.weight,
             'timestamp', e.created_at
           )
         ) FILTER (WHERE e.id IS NOT NULL), '[]'
       ) AS evidence
     FROM hypotheses h
     LEFT JOIN evidence e ON e.hypothesis_id = h.id
     WHERE h.id = $1
     GROUP BY h.id`,
    [id]
  );

  if (result.rows.length === 0) return null;
  return rowToHypothesis(result.rows[0]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToHypothesis(row: any): Hypothesis {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    confidence: row.confidence,
    reasoning: row.reasoning,
    approach: row.approach,
    iterations: row.iterations,
    evidence: typeof row.evidence === "string"
      ? JSON.parse(row.evidence)
      : row.evidence,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export async function saveEvidence(
  e: EvidenceItem,
  hypothesisId: string
): Promise<void> {
  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO evidence (id, hypothesis_id, type, source, title, content, weight, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         type = EXCLUDED.type,
         source = EXCLUDED.source,
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         weight = EXCLUDED.weight`,
      [e.id, hypothesisId, e.type, e.source, e.title, e.content, e.weight, e.timestamp]
    );

    // Touch the parent hypothesis
    await client.query(
      `UPDATE hypotheses SET updated_at = NOW() WHERE id = $1`,
      [hypothesisId]
    );
  });
}

// ---------------------------------------------------------------------------
// Research Sessions
// ---------------------------------------------------------------------------

export async function saveSession(s: ResearchSession): Promise<void> {
  await query(
    `INSERT INTO sessions (id, cycle_number, focus, approach, findings, hypotheses_updated, hypotheses_created, papers_updated, duration_ms, tokens_used, summary, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO UPDATE SET
       summary = EXCLUDED.summary,
       findings = EXCLUDED.findings`,
    [
      s.id, s.cycleNumber, s.focus, s.approach,
      JSON.stringify(s.findings),
      JSON.stringify(s.hypothesesUpdated),
      JSON.stringify(s.hypothesesCreated),
      JSON.stringify(s.papersUpdated),
      s.duration, s.tokensUsed, s.summary, s.timestamp,
    ]
  );
}

export async function getSessions(limit?: number): Promise<ResearchSession[]> {
  const sql = limit
    ? `SELECT * FROM sessions ORDER BY created_at DESC LIMIT $1`
    : `SELECT * FROM sessions ORDER BY created_at DESC`;
  const result = await query(sql, limit ? [limit] : []);
  return result.rows.map(rowToSession);
}

export async function getNextCycleNumber(): Promise<number> {
  const result = await query(
    `SELECT COALESCE(MAX(cycle_number), 0) + 1 AS next FROM sessions`
  );
  return result.rows[0].next;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSession(row: any): ResearchSession {
  return {
    id: row.id,
    timestamp: row.created_at?.toISOString?.() ?? row.created_at,
    cycleNumber: row.cycle_number,
    focus: row.focus,
    approach: row.approach,
    findings: row.findings ?? [],
    hypothesesUpdated: row.hypotheses_updated ?? [],
    hypothesesCreated: row.hypotheses_created ?? [],
    papersUpdated: row.papers_updated ?? [],
    duration: row.duration_ms,
    tokensUsed: row.tokens_used,
    summary: row.summary,
  };
}

// ---------------------------------------------------------------------------
// Scientific Papers
// ---------------------------------------------------------------------------

export async function savePaper(p: ScientificPaper): Promise<void> {
  await query(
    `INSERT INTO papers (id, title, abstract, status, version, sections, methodology, certainty_level, limitations, citations, hypothesis_ids, category, review_history, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT (id) DO UPDATE SET
       title = EXCLUDED.title,
       abstract = EXCLUDED.abstract,
       status = EXCLUDED.status,
       version = EXCLUDED.version,
       sections = EXCLUDED.sections,
       methodology = EXCLUDED.methodology,
       certainty_level = EXCLUDED.certainty_level,
       limitations = EXCLUDED.limitations,
       citations = EXCLUDED.citations,
       hypothesis_ids = EXCLUDED.hypothesis_ids,
       category = EXCLUDED.category,
       review_history = EXCLUDED.review_history,
       updated_at = EXCLUDED.updated_at`,
    [
      p.id, p.title, p.abstract, p.status, p.version,
      JSON.stringify(p.sections), p.methodology, p.certaintyLevel,
      JSON.stringify(p.limitations), JSON.stringify(p.citations),
      JSON.stringify(p.hypothesisIds), p.category,
      JSON.stringify(p.reviewHistory),
      p.createdAt, p.updatedAt,
    ]
  );
}

export async function getPapers(): Promise<ScientificPaper[]> {
  const result = await query(
    `SELECT * FROM papers ORDER BY updated_at DESC`
  );
  return result.rows.map(rowToPaper);
}

export async function getPaper(id: string): Promise<ScientificPaper | null> {
  const result = await query(`SELECT * FROM papers WHERE id = $1`, [id]);
  if (result.rows.length === 0) return null;
  return rowToPaper(result.rows[0]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPaper(row: any): ScientificPaper {
  return {
    id: row.id,
    title: row.title,
    abstract: row.abstract,
    status: row.status,
    version: row.version,
    sections: row.sections ?? [],
    methodology: row.methodology,
    certaintyLevel: row.certainty_level,
    limitations: row.limitations ?? [],
    citations: row.citations ?? [],
    hypothesisIds: row.hypothesis_ids ?? [],
    category: row.category,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at,
    updatedAt: row.updated_at?.toISOString?.() ?? row.updated_at,
    reviewHistory: row.review_history ?? [],
  };
}

// ---------------------------------------------------------------------------
// Knowledge Entries
// ---------------------------------------------------------------------------

export async function saveKnowledge(entry: KnowledgeEntry): Promise<void> {
  await query(
    `INSERT INTO knowledge (id, topic, content, sources, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       topic = EXCLUDED.topic,
       content = EXCLUDED.content,
       sources = EXCLUDED.sources,
       updated_at = EXCLUDED.updated_at`,
    [entry.id, entry.topic, entry.content, JSON.stringify(entry.sources), entry.lastUpdated]
  );
}

export async function getKnowledge(): Promise<KnowledgeEntry[]> {
  const result = await query(`SELECT * FROM knowledge ORDER BY updated_at DESC`);
  return result.rows.map((row) => ({
    id: row.id,
    topic: row.topic,
    content: row.content,
    sources: row.sources ?? [],
    lastUpdated: row.updated_at?.toISOString?.() ?? row.updated_at,
  }));
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export async function getMemoryStats(): Promise<MemoryStats> {
  const result = await query(`
    SELECT
      (SELECT COUNT(*) FROM hypotheses)::int AS hypotheses,
      (SELECT COUNT(*) FROM sessions)::int AS sessions,
      (SELECT COUNT(*) FROM papers)::int AS papers,
      (SELECT COUNT(*) FROM knowledge)::int AS knowledge_entries,
      (SELECT created_at FROM sessions ORDER BY created_at DESC LIMIT 1) AS last_session
  `);

  const row = result.rows[0];
  return {
    hypotheses: row.hypotheses,
    sessions: row.sessions,
    papers: row.papers,
    knowledgeEntries: row.knowledge_entries,
    lastSession: row.last_session?.toISOString?.() ?? row.last_session ?? null,
  };
}
