import { Hono, type Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { ensureSchema, sql, type UserRow } from "./db.ts";

const scryptAsync = promisify(scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;
const COOKIE = "arch_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Env = { Variables: { user: UserRow } };
export const app = new Hono<Env>().basePath("/api");

app.use("*", async (_c, next) => {
  await ensureSchema();
  return next();
});

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

async function startSession(c: Context, userId: string) {
  const token = randomBytes(32).toString("base64url");
  await sql`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${sha256(token)}, ${userId}, ${Date.now() + SESSION_MS})`;
  await sql`DELETE FROM sessions WHERE expires_at < ${Date.now()}`;
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

/** 5 failed logins per email per 15 minutes, stored in the database so it holds across serverless instances. */
async function tooManyAttempts(email: string) {
  const [f] = await sql`SELECT count, until FROM login_failures WHERE email = ${email}`;
  return !!f && f.count >= 5 && Number(f.until) > Date.now();
}
async function recordFailure(email: string) {
  const now = Date.now();
  await sql`INSERT INTO login_failures (email, count, until) VALUES (${email}, 1, ${now + 15 * 60 * 1000})
    ON CONFLICT (email) DO UPDATE SET
      count = CASE WHEN login_failures.until < ${now} THEN 1 ELSE login_failures.count + 1 END,
      until = ${now + 15 * 60 * 1000}`;
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
  if ((await sql`SELECT 1 FROM users WHERE email = ${email}`).length) return c.json({ error: "An account with this email already exists. Sign in instead." }, 409);

  const { hash, salt } = await hashPassword(password);
  const user: UserRow = { id: randomUUID(), email, name, workspace, pw_hash: hash, pw_salt: salt, created_at: Date.now() };
  await sql`INSERT INTO users (id, email, name, workspace, pw_hash, pw_salt, created_at) VALUES (${user.id}, ${user.email}, ${user.name}, ${user.workspace}, ${user.pw_hash}, ${user.pw_salt}, ${user.created_at})`;
  await startSession(c, user.id);
  return c.json({ user: publicUser(user) }, 201);
});

app.post("/auth/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (await tooManyAttempts(email)) return c.json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
  const [user] = (await sql`SELECT * FROM users WHERE email = ${email}`) as UserRow[];
  if (!user || !(await verifyPassword(password, user))) {
    await recordFailure(email);
    return c.json({ error: "Incorrect email or password." }, 401);
  }
  await sql`DELETE FROM login_failures WHERE email = ${email}`;
  await startSession(c, user.id);
  return c.json({ user: publicUser(user) });
});

app.post("/auth/logout", async (c) => {
  const token = getCookie(c, COOKIE);
  if (token) await sql`DELETE FROM sessions WHERE token_hash = ${sha256(token)}`;
  deleteCookie(c, COOKIE, { path: "/" });
  return c.json({ ok: true });
});

/* Everything below requires a valid session. */
app.use("*", async (c, next) => {
  if (c.req.path.startsWith("/api/auth/") && c.req.path !== "/api/auth/me" && c.req.path !== "/api/auth/password") return next();
  const token = getCookie(c, COOKIE);
  const [row] = token
    ? ((await sql`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ${sha256(token)} AND s.expires_at > ${Date.now()}`) as UserRow[])
    : [];
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
  await sql`UPDATE users SET pw_hash = ${hash}, pw_salt = ${salt} WHERE id = ${user.id}`;
  // Sign out every other session.
  const token = getCookie(c, COOKIE)!;
  await sql`DELETE FROM sessions WHERE user_id = ${user.id} AND token_hash != ${sha256(token)}`;
  return c.json({ ok: true });
});

app.patch("/me", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : user.name;
  const workspace = typeof body.workspace === "string" && body.workspace.trim() ? body.workspace.trim() : user.workspace;
  await sql`UPDATE users SET name = ${name}, workspace = ${workspace} WHERE id = ${user.id}`;
  return c.json({ user: publicUser({ ...user, name, workspace }) });
});
