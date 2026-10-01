# architect.dev

Architect 2.0 — a UI/UX prototype of an agent-builder platform for business executives and engineering teams.

Everything is simulated except **authentication**, which is real: email + password accounts (scrypt-hashed), httpOnly session cookies and a local SQLite database.

## Run

Requires Node.js 22.12 or later (uses the built-in `node:sqlite`).

```bash
npm install
npm run dev
```

- App: http://localhost:5180
- API: http://localhost:8787 (proxied under `/api`)

The database is created at `server/data/architect.db` on first run. Delete that folder to reset all accounts.

## Auth API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | Create an account (name, email, password ≥ 8 chars) and start a session |
| POST | `/api/auth/login` | Sign in; 5 failed attempts per email lock it for 15 minutes |
| POST | `/api/auth/logout` | End the current session |
| GET | `/api/auth/me` | Current user, or `null` when signed out |
| POST | `/api/auth/password` | Change password and sign out other sessions |
| PATCH | `/api/me` | Update name and workspace |
