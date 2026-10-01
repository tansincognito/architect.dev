import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { serve } from "@hono/node-server";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db, type UserRow } from "./db.ts";

const scryptAsync = promisify(scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;
const PORT = Number(process.env.API_PORT ?? 8787);
const COOKIE = "arch_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Env = { Variables: { user: UserRow } };
const app = new Hono<Env>().basePath("/api");

/* ---------------- helpers ---------------- */

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function hashPassword(pw: string, salt = randomBytes(16).toString("hex")) {
  const hash = (await scryptAsync(pw, salt, 64)).toString("hex");
  return { hash, salt };
}

async function verifyPassword(pw: string, user: UserRow) {
  const { hash } = await hashPassword(pw, user.pw_salt);
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.pw_hash, "hex"));
}

function startSession(c: Context, userId: string) {
  const token = randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(sha256(token), userId, Date.now() + SESSION_MS);
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
}

function publicUser(u: UserRow) {
  return { id: u.id, email: u.email, name: u.name, workspace: u.workspace };
}

/** Naive in-memory limiter: 5 failed logins per email per 15 minutes. */
const failures = new Map<string, { count: number; until: number }>();
function tooManyAttempts(email: string) {
  const f = failures.get(email);
  return !!f && f.count >= 5 && f.until > Date.now();
}
function recordFailure(email: string) {
  const f = failures.get(email);
  const fresh = !f || f.until < Date.now();
  failures.set(email, { count: fresh ? 1 : f!.count + 1, until: Date.now() + 15 * 60 * 1000 });
}

/* ---------------- auth ---------------- */

app.post("/auth/signup", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const password = String(body.password ?? "");
  const workspace = String(body.workspace ?? "acme").trim() || "acme";
  if (!EMAIL_RE.test(email)) return c.json({ error: "Enter a valid email address." }, 400);
  if (!name) return c.json({ error: "Enter your name." }, 400);
  if (password.length < 8) return c.json({ error: "Password must be at least 8 characters." }, 400);
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) return c.json({ error: "An account with this email already exists. Sign in instead." }, 409);

  const { hash, salt } = await hashPassword(password);
  const user: UserRow = { id: randomUUID(), email, name, workspace, pw_hash: hash, pw_salt: salt, created_at: Date.now() };
  db.prepare("INSERT INTO users (id, email, name, workspace, pw_hash, pw_salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    user.id,
    user.email,
    user.name,
    user.workspace,
    user.pw_hash,
    user.pw_salt,
    user.created_at,
  );
  startSession(c, user.id);
  return c.json({ user: publicUser(user) }, 201);
});

app.post("/auth/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (tooManyAttempts(email)) return c.json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  if (!user || !(await verifyPassword(password, user))) {
    recordFailure(email);
    return c.json({ error: "Incorrect email or password." }, 401);
  }
  failures.delete(email);
  startSession(c, user.id);
  return c.json({ user: publicUser(user) });
});

app.post("/auth/logout", (c) => {
  const token = getCookie(c, COOKIE);
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
  deleteCookie(c, COOKIE, { path: "/" });
  return c.json({ ok: true });
});

/* Everything below requires a valid session. */
app.use("*", async (c, next) => {
  if (c.req.path.startsWith("/api/auth/") && c.req.path !== "/api/auth/me" && c.req.path !== "/api/auth/password") return next();
  const token = getCookie(c, COOKIE);
  const row = token
    ? (db
        .prepare("SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?")
        .get(sha256(token), Date.now()) as UserRow | undefined)
    : undefined;
  if (!row) return c.req.path === "/api/auth/me" ? c.json({ user: null }) : c.json({ error: "Not signed in." }, 401);
  c.set("user", row);
  return next();
});

app.get("/auth/me", (c) => c.json({ user: publicUser(c.get("user")) }));

app.post("/auth/password", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  if (!(await verifyPassword(String(body.current ?? ""), user))) return c.json({ error: "Current password is incorrect." }, 400);
  const next = String(body.next ?? "");
  if (next.length < 8) return c.json({ error: "New password must be at least 8 characters." }, 400);
  const { hash, salt } = await hashPassword(next);
  db.prepare("UPDATE users SET pw_hash = ?, pw_salt = ? WHERE id = ?").run(hash, salt, user.id);
  // Sign out every other session.
  const token = getCookie(c, COOKIE)!;
  db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").run(user.id, sha256(token));
  return c.json({ ok: true });
});

app.patch("/me", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : user.name;
  const workspace = typeof body.workspace === "string" && body.workspace.trim() ? body.workspace.trim() : user.workspace;
  db.prepare("UPDATE users SET name = ?, workspace = ? WHERE id = ?").run(name, workspace, user.id);
  return c.json({ user: publicUser({ ...user, name, workspace }) });
});

/* Expired sessions are cleared hourly. */
setInterval(() => db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now()), 60 * 60 * 1000).unref();

serve({ fetch: app.fetch, port: PORT }, (info) => console.log(`architect api listening on http://localhost:${info.port}`));
