-- =====================================================================
-- BookForge AI - Enterprise Database Schema (PostgreSQL)
-- Supports Project Isolation, RBAC, Book Bible, Versioning, 
-- Audit Logging, Cost Tracking, and System Settings / Kill Switch.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Users & Roles (RBAC)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'AUTHOR' CHECK (role IN ('FOUNDER', 'ADMIN', 'AUTHOR', 'READER')),
  subscription_plan TEXT NOT NULL DEFAULT 'FREE' CHECK (subscription_plan IN ('FREE', 'PRO', 'STUDIO', 'ENTERPRISE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Book Projects (Project Isolation: owner_id foreign key)
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  idea TEXT NOT NULL,
  genre TEXT NOT NULL,
  tone TEXT NOT NULL,
  length_label TEXT NOT NULL,
  target_words INTEGER NOT NULL DEFAULT 80000,
  target_chapters INTEGER NOT NULL DEFAULT 32,
  synopsis TEXT NOT NULL DEFAULT '',
  cover_style TEXT NOT NULL DEFAULT 'Nordisk filmatisk',
  phase TEXT NOT NULL DEFAULT 'setup' CHECK (phase IN ('setup', 'planned', 'writing', 'complete')),
  progress INTEGER NOT NULL DEFAULT 0,
  active_chapter INTEGER NOT NULL DEFAULT 1,
  acts INTEGER NOT NULL DEFAULT 4,
  pov TEXT NOT NULL DEFAULT '1 (Tredjeperson begrenset)',
  ending TEXT NOT NULL DEFAULT 'Lukket',
  author TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_books_owner ON books(owner_id);

-- 3. Chapters
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  act INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'writing', 'verified', 'completed')),
  word_target INTEGER NOT NULL DEFAULT 2500,
  current_words INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL DEFAULT '',
  pov_character TEXT NOT NULL DEFAULT '',
  conflict TEXT NOT NULL DEFAULT '',
  continuity_notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(book_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_chapters_book_num ON chapters(book_id, chapter_number);

-- 4. Book Bible (Canonical World Knowledge Engine)
CREATE TABLE IF NOT EXISTS book_bibles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID UNIQUE NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  characters JSONB NOT NULL DEFAULT '[]'::jsonb,
  locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  continuity_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  plot_threads JSONB NOT NULL DEFAULT '[]'::jsonb,
  foreshadowing JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Book Version Snapshots (Time-Travel / Git for Books)
CREATE TABLE IF NOT EXISTS book_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  chapter_count INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER NOT NULL DEFAULT 0,
  snapshot JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(book_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_book_versions ON book_versions(book_id, version_number);

-- 6. Audit Logs (Security & Compliance Tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id TEXT NOT NULL,
  actor_role TEXT NOT NULL DEFAULT 'AUTHOR',
  action TEXT NOT NULL,
  project_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILURE', 'BLOCKED')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- 7. Cost Tracking & Token Guard (AI Financial Defense)
CREATE TABLE IF NOT EXISTS cost_records (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id TEXT NOT NULL,
  project_id TEXT,
  action TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gemini-3.8-flash',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cost_records_user ON cost_records(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_records_project ON cost_records(project_id);

-- 8. System Settings (Emergency Kill Switch & Platform Config)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by TEXT NOT NULL DEFAULT 'SYSTEM',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Initial default settings
INSERT INTO system_settings (key, value, updated_by)
VALUES (
  'emergency_kill_switch',
  '{"active": false, "reason": null, "activatedBy": null, "activatedAt": null}'::jsonb,
  'SYSTEM'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value, updated_by)
VALUES (
  'platform_limits',
  '{"maxConcurrentJobsPerUser": 2, "maxBudgetUsdPerBook": 25.0, "rateLimitPerHour": 120}'::jsonb,
  'SYSTEM'
)
ON CONFLICT (key) DO NOTHING;

-- 9. Organizations (Multi-tenant Platform Hierarchy)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'STUDIO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Sessions (Secure Authentication)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 11. Generation Jobs (Full-Book Orchestration State & Checkpointing)
CREATE TABLE IF NOT EXISTS generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  phase TEXT NOT NULL DEFAULT 'specification',
  total_chapters INTEGER NOT NULL DEFAULT 32,
  completed_chapters INTEGER NOT NULL DEFAULT 0,
  total_words INTEGER NOT NULL DEFAULT 80000,
  generated_words INTEGER NOT NULL DEFAULT 0,
  current_chapter INTEGER NOT NULL DEFAULT 1,
  current_chapter_words INTEGER NOT NULL DEFAULT 0,
  current_chapter_target INTEGER NOT NULL DEFAULT 2500,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  elapsed_ms BIGINT NOT NULL DEFAULT 0,
  active_jobs INTEGER NOT NULL DEFAULT 0,
  retrying INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  chapter_states JSONB NOT NULL DEFAULT '{}'::jsonb,
  checkpoint JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gen_jobs_project ON generation_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_gen_jobs_status ON generation_jobs(status);

-- 12. Generation Chunks (Chunk-level Persistent Recovery)
CREATE TABLE IF NOT EXISTS generation_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES generation_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  tokens_used JSONB,
  is_continuation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, chapter_number, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_gen_chunks_job_chap ON generation_chunks(job_id, chapter_number);

-- 13. Creative Assets (Cover Art, Illustrations, Visual Bible)
CREATE TABLE IF NOT EXISTS creative_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('cover_front', 'cover_back', 'illustration', 'character_portrait', 'map')),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  url TEXT,
  svg_data TEXT,
  aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creative_assets_project ON creative_assets(project_id);

