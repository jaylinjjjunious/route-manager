CREATE TABLE IF NOT EXISTS habit_state (
  id TEXT PRIMARY KEY,
  task_name TEXT NOT NULL,
  target_minutes INTEGER NOT NULL,
  last_minutes INTEGER NOT NULL,
  logs_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
