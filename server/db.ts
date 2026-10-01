import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DB_PATH = process.env.ARCHITECT_DB ?? join(dirname(fileURLToPath(import.meta.url)), "data", "architect.db");
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    workspace   TEXT NOT NULL,
    pw_hash     TEXT NOT NULL,
    pw_salt     TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  INTEGER NOT NULL
  );
`);

export interface UserRow {
  id: string;
  email: string;
  name: string;
  workspace: string;
  pw_hash: string;
  pw_salt: string;
  created_at: number;
}
