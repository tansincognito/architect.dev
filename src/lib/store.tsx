import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PROJECTS, SHARED_PROJECTS, type Project } from "./data";

export type Mode = "simple" | "dev";
export type Theme = "light" | "dark";

export interface User {
  name: string;
  email: string;
  workspace: string;
}

export interface Notice {
  id: number;
  title: string;
  body: string;
  when: string;
  read: boolean;
  href?: string;
  tone: "neon" | "warn" | "danger" | "neutral";
}

export interface Toast {
  id: number;
  text: string;
}

interface Store {
  user: User | null;
  signIn: (u: User) => void;
  signOut: () => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  credits: number;
  spend: (n: number) => void;
  projects: Project[];
  addProject: (p: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  notices: Notice[];
  markAllRead: () => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  toasts: Toast[];
  toast: (text: string) => void;
  shared: Record<string, unknown>;
  setShared: (key: string, value: unknown) => void;
  org: string;
  setOrg: (o: string) => void;
  sidebarPinned: boolean;
  setSidebarPinned: (v: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
}

const Ctx = createContext<Store | null>(null);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`arch.${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`arch.${key}`, JSON.stringify(value));
  } catch {
    /* storage unavailable — prototype keeps working in memory */
  }
}

const INITIAL_NOTICES: Notice[] = [
  { id: 1, title: "Approval required", body: "Escalation agent requests a $240 refund on #4812", when: "6m", read: false, href: "/app/approvals", tone: "warn" },
  { id: 2, title: "Deployment succeeded", body: "support-triage-agent · production · v24", when: "2m", read: false, href: "/app/p/support-triage-agent/deploy", tone: "neon" },
  { id: 3, title: "Quality regression", body: "research-assistant accuracy 0.91 → 0.87", when: "1h", read: false, href: "/app/p/research-assistant/evals", tone: "danger" },
  { id: 4, title: "Budget at 80%", body: "invoice-extractor monthly model spend", when: "1d", read: true, href: "/app/p/invoice-extractor/readiness", tone: "neutral" },
];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => load("user", null));
  const [mode, setModeState] = useState<Mode>(() => load("mode", "simple"));
  const [theme, setThemeState] = useState<Theme>(() => load("theme", "light"));
  const [credits, setCredits] = useState(840);
  const [projects, setProjects] = useState<Project[]>([...PROJECTS, ...SHARED_PROJECTS]);
  const [notices, setNotices] = useState<Notice[]>(INITIAL_NOTICES);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [org, setOrgState] = useState<string>(() => load("org", "Acme Corp"));
  const [sidebarPinned, setPinnedState] = useState<boolean>(() => load("sidebarPinned.v2", true));
  const [helpOpen, setHelpOpen] = useState(false);
  const [shared, setSharedState] = useState<Record<string, unknown>>({});
  const setShared = useCallback((key: string, value: unknown) => setSharedState((s) => ({ ...s, [key]: value })), []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toast = useCallback((text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const value = useMemo<Store>(
    () => ({
      user,
      signIn: (u) => {
        setUser(u);
        save("user", u);
      },
      signOut: () => {
        setUser(null);
        save("user", null);
      },
      mode,
      setMode: (m) => {
        setModeState(m);
        save("mode", m);
      },
      theme,
      setTheme: (t) => {
        setThemeState(t);
        save("theme", t);
      },
      credits,
      spend: (n) => setCredits((c) => Math.max(0, c - n)),
      projects,
      addProject: (p) => setProjects((ps) => [p, ...ps.filter((x) => x.id !== p.id)]),
      updateProject: (id, patch) => setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      notices,
      markAllRead: () => setNotices((ns) => ns.map((n) => ({ ...n, read: true }))),
      paletteOpen,
      setPaletteOpen,
      toasts,
      toast,
      shared,
      setShared,
      org,
      setOrg: (o) => {
        setOrgState(o);
        save("org", o);
      },
      sidebarPinned,
      setSidebarPinned: (v) => {
        setPinnedState(v);
        save("sidebarPinned.v2", v);
      },
      helpOpen,
      setHelpOpen,
    }),
    [user, mode, theme, credits, projects, notices, paletteOpen, toasts, toast, shared, setShared, org, sidebarPinned, helpOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

/** Cross-page state for the prototype (e.g. readiness values read by deploy pre-flight). */
export function useShared<T>(key: string, init: () => T): [T, (v: T | ((prev: T) => T)) => void] {
  const { shared, setShared } = useStore();
  const value = (key in shared ? shared[key] : init()) as T;
  const set = (v: T | ((prev: T) => T)) => setShared(key, typeof v === "function" ? (v as (p: T) => T)(value) : v);
  return [value, set];
}
