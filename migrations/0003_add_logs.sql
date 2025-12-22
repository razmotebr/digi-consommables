CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  actor_type TEXT,
  actor_id TEXT,
  action TEXT NOT NULL,
  target TEXT,
  details TEXT
);

CREATE INDEX IF NOT EXISTS idx_logs_ts ON logs (ts);
