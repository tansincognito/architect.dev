export interface ApiUser {
  id: string;
  name: string;
  email: string;
  workspace: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: "same-origin",
    headers: init.body ? { "content-type": "application/json" } : undefined,
    ...init,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) });

export const api = {
  /** Resolves with user: null when there is no valid session. */
  me: () => request<{ user: ApiUser | null }>("/auth/me"),
  signup: (d: { name: string; email: string; password: string; workspace?: string }) => request<{ user: ApiUser }>("/auth/signup", json("POST", d)),
  login: (d: { email: string; password: string }) => request<{ user: ApiUser }>("/auth/login", json("POST", d)),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
  changePassword: (d: { current: string; next: string }) => request<{ ok: true }>("/auth/password", json("POST", d)),
  updateMe: (d: { name?: string; workspace?: string }) => request<{ user: ApiUser }>("/me", json("PATCH", d)),
};
