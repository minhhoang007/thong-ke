import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';

// DATABASE_PATH env var lets Railway (or any host) point to a persistent volume.
// Default: ./data/xoso.db relative to CWD (works for local dev and Railway without volume).
const DB_PATH = process.env.DATABASE_PATH ?? join(process.cwd(), 'data', 'xoso.db');

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS draws (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  draw_date   TEXT NOT NULL,
  province    TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS results (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  draw_id     INTEGER NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  prize_name  TEXT NOT NULL,
  value       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_draws_date     ON draws(draw_date);
CREATE INDEX IF NOT EXISTS idx_draws_prov_date ON draws(province, draw_date);
CREATE INDEX IF NOT EXISTS idx_results_draw    ON results(draw_id);
CREATE INDEX IF NOT EXISTS idx_results_prize   ON results(prize_name);
`;

let _db;

export function getDb() {
  if (!_db) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.exec(MIGRATION_SQL);
  }
  return _db;
}
