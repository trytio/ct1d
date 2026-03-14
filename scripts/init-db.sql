-- ═══════════════════════════════════════════════════════════════════════
-- CT1D — PostgreSQL Schema
-- AI-Powered Type 1 Diabetes Research Database
-- ═══════════════════════════════════════════════════════════════════════
--
-- Tables:
--   hypotheses  — AI-generated research hypotheses with confidence tracking
--   evidence    — Supporting/contradicting evidence linked to hypotheses
--   sessions    — Autonomous research session logs
--   papers      — AI-synthesized scientific papers
--   knowledge   — Accumulated knowledge entries
--
-- All JSONB columns store structured data that varies per entry.
-- Indexes on category, status, and timestamps for fast querying.
-- ═══════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Hypotheses ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hypotheses (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  category      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'promising', 'needs_evidence', 'disproven', 'validated')),
  confidence    INTEGER NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  reasoning     TEXT NOT NULL DEFAULT '',
  approach      TEXT NOT NULL DEFAULT '',
  iterations    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hypotheses_category ON hypotheses(category);
CREATE INDEX IF NOT EXISTS idx_hypotheses_status ON hypotheses(status);
CREATE INDEX IF NOT EXISTS idx_hypotheses_updated ON hypotheses(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_hypotheses_approach ON hypotheses(approach);

-- ── Evidence ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS evidence (
  id            TEXT PRIMARY KEY,
  hypothesis_id TEXT NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('supporting', 'contradicting', 'neutral')),
  source        TEXT NOT NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL,
  weight        INTEGER NOT NULL DEFAULT 5 CHECK (weight >= 1 AND weight <= 10),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_hypothesis ON evidence(hypothesis_id);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(type);
CREATE INDEX IF NOT EXISTS idx_evidence_source ON evidence(source);

-- ── Research Sessions ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
  id                  TEXT PRIMARY KEY,
  cycle_number        INTEGER NOT NULL,
  focus               TEXT NOT NULL,
  approach            TEXT NOT NULL DEFAULT '',
  findings            JSONB NOT NULL DEFAULT '[]',
  hypotheses_updated  JSONB NOT NULL DEFAULT '[]',
  hypotheses_created  JSONB NOT NULL DEFAULT '[]',
  papers_updated      JSONB NOT NULL DEFAULT '[]',
  duration_ms         INTEGER NOT NULL DEFAULT 0,
  tokens_used         INTEGER NOT NULL DEFAULT 0,
  summary             TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_cycle ON sessions(cycle_number);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);

-- ── Scientific Papers ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS papers (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  abstract        TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'in_review', 'published')),
  version         INTEGER NOT NULL DEFAULT 1,
  sections        JSONB NOT NULL DEFAULT '[]',
  methodology     TEXT NOT NULL DEFAULT '',
  certainty_level INTEGER NOT NULL DEFAULT 0 CHECK (certainty_level >= 0 AND certainty_level <= 100),
  limitations     JSONB NOT NULL DEFAULT '[]',
  citations       JSONB NOT NULL DEFAULT '[]',
  hypothesis_ids  JSONB NOT NULL DEFAULT '[]',
  category        TEXT NOT NULL DEFAULT '',
  review_history  JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_papers_status ON papers(status);
CREATE INDEX IF NOT EXISTS idx_papers_category ON papers(category);
CREATE INDEX IF NOT EXISTS idx_papers_updated ON papers(updated_at DESC);

-- ── Knowledge Entries ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS knowledge (
  id          TEXT PRIMARY KEY,
  topic       TEXT NOT NULL,
  content     TEXT NOT NULL,
  sources     JSONB NOT NULL DEFAULT '[]',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_topic ON knowledge(topic);

-- ── Seed data migration helper ──────────────────────────────────────
-- This function can be called to check if initial seed data needs loading
CREATE OR REPLACE FUNCTION needs_seed_data() RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (SELECT 1 FROM hypotheses LIMIT 1);
END;
$$ LANGUAGE plpgsql;
