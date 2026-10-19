CREATE TABLE IF NOT EXISTS shower_proofs (
  cycle_key TEXT PRIMARY KEY,
  folder_path TEXT NOT NULL,
  proof_name TEXT,
  proof_data_url TEXT,
  barcode_value TEXT,
  barcode_matched INTEGER NOT NULL DEFAULT 0,
  flash_available INTEGER NOT NULL DEFAULT 0,
  flash_used INTEGER NOT NULL DEFAULT 0,
  event_type TEXT NOT NULL,
  confirmed_at TEXT,
  uploaded_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
