import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. Run `vercel env pull .env.local` or export it.");

export const sql = neon(url);

export interface UserRow {
  id: string;
  email: string;
  name: string;
  workspace: string;
  pw_hash: string;
  pw_salt: string;
  created_at: number;
}

let ready: Promise<unknown> | undefined;

/** Creates tables once per process; later calls reuse the same promise. */
export function ensureSchema() {
  ready ??= sql.transaction([
    sql`CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      workspace   TEXT NOT NULL,
      pw_hash     TEXT NOT NULL,
      pw_salt     TEXT NOT NULL,
      created_at  BIGINT NOT NULL
    )`,
    sql`CREATE TABLE IF NOT EXISTS sessions (
      token_hash  TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at  BIGINT NOT NULL
    )`,
    sql`CREATE TABLE IF NOT EXISTS login_failures (
      email       TEXT PRIMARY KEY,
      count       INTEGER NOT NULL,
      until       BIGINT NOT NULL
    )`,
  ]);
  return ready;
}
