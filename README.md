# architect.dev

Architect 2.0 — a UI/UX prototype of an agent-builder platform for business executives and engineering teams.

Everything is simulated except **authentication**, which is real: email + password accounts (scrypt-hashed), httpOnly session cookies and a Neon Postgres database.

## Run

Requires Node.js 22.18 or later (uses TypeScript type stripping) and a Postgres `DATABASE_URL`, for example a free Neon database. With the Vercel project linked, `vercel env pull .env.local` fetches it.

```bash
npm install
npm run dev
```

- App: http://localhost:5180
- API: http://localhost:8787 (proxied under `/api`)

Tables are created on first request. In production the API runs as a Vercel Function (`api/index.ts`).

## Auth API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create an account (name, email, password ≥ 8 chars) and start a session |
| POST | `/api/auth/login` | Sign in; 5 failed attempts per email lock it for 15 minutes |
| POST | `/api/auth/logout` | End the current session |
| GET | `/api/auth/me` | Current user, or `null` when signed out |
| POST | `/api/auth/password` | Change password and sign out other sessions |
| PATCH | `/api/me` | Update name and workspace |
