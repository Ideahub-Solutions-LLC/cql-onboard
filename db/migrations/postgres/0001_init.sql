CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  assigned_email TEXT,
  data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  step INTEGER NOT NULL DEFAULT 0,
  checklist TEXT NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  submitted_at TEXT,
  pricing_snapshot TEXT
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  size INTEGER NOT NULL,
  type TEXT NOT NULL,
  object_key TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS secrets (
  application_id TEXT PRIMARY KEY,
  ciphertext TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS applications_updated_at_idx ON applications (updated_at DESC);
CREATE INDEX IF NOT EXISTS applications_assigned_email_idx ON applications (lower(assigned_email));
CREATE INDEX IF NOT EXISTS attachments_application_id_idx ON attachments (application_id, created_at);
