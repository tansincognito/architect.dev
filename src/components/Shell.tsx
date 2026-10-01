import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Building2,
  Check,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Code2,
  Compass,
  Gift,
  Globe,
  GraduationCap,
  HelpCircle,
  Home,
  KeyRound,
  LayoutGrid,
  Lightbulb,
  LogOut,
  MessagesSquare,
  Moon,
  Palette,
  PlayCircle,
  Plug,
  Plus,
  Search,
  Settings as SettingsIcon,
  Share2,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
} from "lucide-react";
import { useStore } from "../lib/store";
import { Btn, Input, Label, Modal, cx } from "./ui";
import { CommandPalette } from "./CommandPalette";
import { HelpPanel } from "./HelpPanel";
import { ErrorBoundary } from "./ErrorBoundary";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cx("font-mono font-bold text-[0.9rem] tracking-[-0.02em] inline-flex items-center gap-1.5", className)}>
      {compact ? "a_" : "architect_"}
      {!compact && <span className="text-[0.5rem] font-bold bg-neon text-[#0a0a0a] rounded-[3px] px-1 py-px tracking-[0.04em]">2.0</span>}
    </span>
  );
}

export function ModeSwitch() {
  const { mode, setMode, toast } = useStore();
  const opts = [
    { v: "simple" as const, label: "business", icon: <Sparkles size={10} /> },
    { v: "dev" as const, label: "developer", icon: <Code2 size={10} /> },
  ];
  return (
    <div className="flex items-center bg-surface border border-line rounded-[6px] p-[2px]" title="Business view hides code and infrastructure detail. Developer view shows everything.">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => {
            setMode(o.v);
            toast(o.v === "dev" ? "Developer view: code, terminal and infrastructure visible" : "Business view: focused on outcomes and governance");
          }}
          className={cx(
            "font-mono text-[0.58rem] uppercase tracking-[0.06em] px-2 py-[3px] rounded-[4px] inline-flex items-center gap-1 cursor-pointer transition-all",
            mode === o.v ? "bg-bg text-fg shadow-[0_1px_2px_rgba(0,0,0,0.08)] border border-line-2" : "text-dim border border-transparent hover:text-muted",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function useOutside(ref: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [ref, close]);
}

function Notifications() {
  const { notices, markAllRead } = useStore();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  const unread = notices.filter((n) => !n.read).length;
  const toneColor = { neon: "var(--live)", warn: "var(--warn)", danger: "var(--danger)", neutral: "var(--dim)" };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative text-muted hover:text-fg p-1.5 rounded-[5px] hover:bg-surface cursor-pointer" aria-label="notifications">
        <Bell size={15} />
        {unread > 0 && <span className="absolute top-1 right-1 w-[6px] h-[6px] rounded-full bg-neon border border-bg" />}
      </button>
      {open && (
        <div className="rise absolute right-0 top-9 w-[340px] bg-bg border border-line-2 rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.12)] z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-line">
            <Label>notifications</Label>
            <button onClick={markAllRead} className="text-[0.72rem] text-muted hover:text-fg cursor-pointer">
              Mark all as read
            </button>
          </div>
          {notices.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setOpen(false);
                if (n.href) nav(n.href);
              }}
              className="w-full text-left flex gap-2.5 px-3.5 py-3 border-b border-line last:border-0 hover:bg-surface cursor-pointer"
            >
              <span className="mt-1.5 w-[5px] h-[5px] rounded-full shrink-0" style={{ background: toneColor[n.tone] }} />
              <span className="flex-1 min-w-0">
                <span className={cx("block text-[0.8rem]", n.read ? "text-muted" : "text-fg font-semibold")}>{n.title}</span>
                <span className="block text-[0.72rem] text-dim truncate">{n.body}</span>
              </span>
              <span className="font-mono text-[0.55rem] text-dim">{n.when}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- sidebar ---------------- */

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  badge?: string;
  devOnly?: boolean;
}

const SECTIONS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: "/app", label: "Home", icon: <Home size={15} />, end: true },
      { to: "/app/agents", label: "Agent Studio", icon: <Bot size={15} /> },
    ],
  },
  {
    title: "projects",
    items: [
      { to: "/app/projects", label: "My projects", icon: <LayoutGrid size={15} /> },
      { to: "/app/published", label: "Published projects", icon: <Globe size={15} /> },
      { to: "/app/shared", label: "Shared with me", icon: <Share2 size={15} /> },
    ],
  },
  {
    title: "operate",
    items: [
      { to: "/app/approvals", label: "Approvals", icon: <ShieldCheck size={15} />, badge: "2" },
      { to: "/app/integrations", label: "Integrations", icon: <Plug size={15} /> },
      { to: "/app/usage", label: "Usage", icon: <BarChart3 size={15} /> },
      { to: "/app/settings?tab=api", label: "API & CLI", icon: <KeyRound size={15} />, devOnly: true },
    ],
  },
  {
    title: "get started",
    items: [
      { to: "/app/how-it-works", label: "How it works", icon: <PlayCircle size={15} /> },
      { to: "/app/prompts", label: "Prompt library", icon: <Sparkles size={15} /> },
      { to: "/app/marketplace", label: "Marketplace", icon: <Store size={15} /> },
      { to: "/app/discover", label: "What should I build", icon: <Lightbulb size={15} /> },
      { to: "/app/resources", label: "Resources", icon: <GraduationCap size={15} /> },
      { to: "/app/docs", label: "Docs", icon: <BookOpen size={15} /> },
      { to: "/app/design-systems", label: "Design systems", icon: <Palette size={15} /> },
      { to: "/app/community", label: "Community", icon: <MessagesSquare size={15} /> },
    ],
  },
];

const ORGS = ["Acme Corp", "Acme Labs", "Personal workspace"];

function OrgSwitcher({ collapsed }: { collapsed: boolean }) {
  const { org, setOrg, toast } = useStore();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  return (
    <div className="relative px-2" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={org}
        className={cx("flex items-center gap-2 border border-line rounded-lg bg-surface hover:border-line-2 cursor-pointer", collapsed ? "justify-center w-9 h-9 mx-auto" : "w-full px-2.5 py-2")}
      >
        <span className="w-5 h-5 rounded-[5px] bg-fg text-bg text-[0.6rem] font-bold flex items-center justify-center shrink-0">{org[0]}</span>
        {!collapsed && (
          <>
            <span className="text-[0.82rem] font-medium truncate flex-1 text-left">{org}</span>
            <ChevronsUpDown size={12} className="text-dim" />
          </>
        )}
      </button>
      {open && (
        <div className="rise absolute left-2 top-11 w-[230px] bg-bg border border-line-2 rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.14)] z-[60] py-1">
          <Label className="px-3 py-1.5">organisations</Label>
          {ORGS.map((o) => (
            <button
              key={o}
              onClick={() => {
                setOrg(o);
                setOpen(false);
                toast(`Switched to ${o}`);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[0.82rem] hover:bg-surface cursor-pointer"
            >
              <Building2 size={12} className="text-dim" />
              <span className="flex-1 text-left">{o}</span>
              {o === org && <Check size={12} className="text-live" />}
            </button>
          ))}
          <div className="border-t border-line mt-1 pt-1">
            <button onClick={() => (setOpen(false), setCreating(true))} className="w-full flex items-center gap-2 px-3 py-2 text-[0.82rem] text-muted hover:text-fg hover:bg-surface cursor-pointer">
              <Plus size={12} /> Create organisation
            </button>
          </div>
        </div>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title="Create organisation">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Organisation name" autoFocus />
        <div className="text-[0.75rem] text-dim mt-2">Projects, members, credits and integrations are separate for each organisation.</div>
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={() => setCreating(false)}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            disabled={!name}
            onClick={() => {
              setOrg(name);
              setCreating(false);
              toast(`${name} created`);
              setName("");
            }}
          >
            Create
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

function AccountButton({ collapsed }: { collapsed: boolean }) {
  const { user, credits, signOut } = useStore();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  const item = "w-full text-left px-3.5 py-2 text-[0.82rem] text-muted hover:text-fg hover:bg-surface cursor-pointer flex items-center gap-2";
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="My account"
        className={cx("flex items-center gap-2 border border-line rounded-lg hover:border-line-2 cursor-pointer", collapsed ? "justify-center w-9 h-9 mx-auto" : "w-full px-2.5 py-2")}
      >
        <span className="w-6 h-6 rounded-full bg-neon flex items-center justify-center font-mono text-[0.62rem] font-bold text-[#0a0a0a] shrink-0">{user?.name?.[0]?.toUpperCase() ?? "A"}</span>
        {!collapsed && (
          <>
            <span className="text-[0.82rem] font-medium flex-1 text-left truncate">My account</span>
            <span className="font-mono text-[0.65rem] text-muted">{credits} cr</span>
          </>
        )}
      </button>
      {open && (
        <div className="rise absolute left-0 bottom-12 w-[230px] bg-bg border border-line-2 rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.14)] z-[60] py-1">
          <div className="px-3.5 py-2.5 border-b border-line mb-1">
            <div className="text-[0.85rem] font-semibold capitalize">{user?.name}</div>
            <div className="text-[0.72rem] text-dim">{user?.email}</div>
          </div>
          {(
            [
              ["Account settings", "/app/settings", <SettingsIcon size={12} />],
              ["Members & roles", "/app/team", <Building2 size={12} />],
              ["Billing", "/app/billing", <BarChart3 size={12} />],
            ] as const
          ).map(([label, to, icon]) => (
            <button key={label} className={item} onClick={() => (setOpen(false), nav(to))}>
              {icon} {label}
            </button>
          ))}
          <div className="border-t border-line mt-1 pt-1">
            <button className={item} onClick={() => signOut().then(() => nav("/signin"))}>
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReferralModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useStore();
  return (
    <Modal open={open} onClose={onClose} title="Get $10 of free credits">
      <p className="text-[0.85rem] text-muted mt-0">Invite a colleague. When they build their first project, you both receive $10 of credits.</p>
      <div className="flex gap-2">
        <Input readOnly value="architect.app/invite/acme-ajay" />
        <Btn onClick={() => toast("Invitation link copied")}>Copy</Btn>
      </div>
      <div className="flex gap-2 mt-3">
        <Input placeholder="colleague@company.com" />
        <Btn variant="primary" onClick={() => (onClose(), toast("Invitation sent"))}>
          Send
        </Btn>
      </div>
      <div className="text-[0.75rem] text-dim mt-3">3 invitations accepted · $30 earned</div>
    </Modal>
  );
}

function Sidebar() {
  const { mode, sidebarPinned, setSidebarPinned, theme, setTheme, setHelpOpen } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [hover, setHover] = useState(false);
  const [referral, setReferral] = useState(false);
  /* Full menu by default; the user can collapse it to an icon rail, and hovering the rail peeks the full menu. */
  const collapsedBase = !sidebarPinned;
  const collapsed = collapsedBase && !hover;

  const linkCls = (active: boolean) =>
    cx(
      "flex items-center gap-2.5 rounded-md text-[0.84rem] transition-colors",
      collapsed ? "justify-center w-9 h-9 mx-auto" : "px-2.5 py-[7px]",
      active ? "bg-surface-2 text-fg font-medium" : "text-muted hover:text-fg hover:bg-surface",
    );

  return (
    <div className={cx("relative shrink-0 transition-[width] duration-200", collapsedBase ? "w-[60px]" : "w-[248px]")}>
      <aside
        onMouseEnter={() => collapsedBase && setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={cx(
          "fixed top-0 left-0 h-screen bg-bg border-r border-line flex flex-col z-50 transition-[width,box-shadow] duration-200",
          collapsed ? "w-[60px]" : "w-[248px]",
          collapsedBase && hover && "shadow-[8px_0_30px_rgba(0,0,0,0.08)]",
        )}
      >
        <div className={cx("h-[54px] flex items-center shrink-0", collapsed ? "justify-center" : "px-4 justify-between")}>
          <button onClick={() => nav("/app")} className="cursor-pointer text-fg">
            <Logo compact={collapsed} />
          </button>
          {!collapsed && (
            <button onClick={() => setSidebarPinned(!sidebarPinned)} className="text-dim hover:text-fg cursor-pointer" title={sidebarPinned ? "Collapse sidebar" : "Pin sidebar open"}>
              {sidebarPinned ? <ChevronsLeft size={14} /> : <ChevronsRight size={14} />}
            </button>
          )}
        </div>

        <OrgSwitcher collapsed={collapsed} />

        <div className="px-2 mt-2">
          <button
            onClick={() => nav("/app")}
            title="New project"
            className={cx("flex items-center gap-2 bg-fg text-bg rounded-md text-[0.82rem] font-medium cursor-pointer hover:opacity-90", collapsed ? "justify-center w-9 h-9 mx-auto" : "w-full px-2.5 py-2")}
          >
            <Plus size={14} /> {!collapsed && "New project"}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
          {SECTIONS.map((sec, i) => (
            <div key={i} className={cx(i > 0 && "mt-3")}>
              {sec.title &&
                (collapsed ? <div className="h-px bg-line mx-3 my-2" /> : <div className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-dim px-2.5 pb-1 pt-1">{sec.title}</div>)}
              {sec.items
                .filter((it) => !it.devOnly || mode === "dev")
                .map((it) => (
                  <NavLink key={it.to} to={it.to} end={it.end} title={collapsed ? it.label : undefined} className={({ isActive }) => linkCls(isActive && (!it.to.includes("?") || loc.search.length > 0))}>
                    <span className="relative shrink-0">
                      {it.icon}
                      {collapsed && it.badge && <span className="absolute -top-1 -right-1 w-[7px] h-[7px] rounded-full bg-warn" />}
                    </span>
                    {!collapsed && <span className="flex-1 truncate">{it.label}</span>}
                    {!collapsed && it.badge && <span className="font-mono text-[0.58rem] bg-warn/15 text-warn rounded px-1.5">{it.badge}</span>}
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>

        <div className="px-2 pb-3 pt-2 border-t border-line space-y-1.5 shrink-0">
          <button
            onClick={() => setReferral(true)}
            title="Get $10 of free credits"
            className={cx(
              "flex items-center gap-2 rounded-md border border-neon-line bg-neon-soft text-neon-ink text-[0.78rem] font-medium cursor-pointer",
              collapsed ? "justify-center w-9 h-9 mx-auto" : "w-full justify-center px-2.5 py-2",
            )}
          >
            <Gift size={13} /> {!collapsed && "Get $10 of free credits"}
          </button>
          <AccountButton collapsed={collapsed} />
          <div className={cx("flex items-center", collapsed ? "flex-col gap-1" : "justify-between")}>
            <button
              onClick={() => setHelpOpen(true)}
              title="Help & support"
              className={cx("flex items-center gap-2 text-[0.82rem] text-muted hover:text-fg cursor-pointer rounded-md hover:bg-surface", collapsed ? "w-9 h-9 justify-center" : "px-2.5 py-2")}
            >
              <HelpCircle size={14} /> {!collapsed && "Help & support"}
            </button>
            <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} title="Toggle theme" className="text-dim hover:text-fg cursor-pointer p-2 rounded-md hover:bg-surface">
              {theme === "light" ? <Moon size={13} /> : <Sun size={13} />}
            </button>
          </div>
        </div>
      </aside>
      <ReferralModal open={referral} onClose={() => setReferral(false)} />
    </div>
  );
}

function TopBar() {
  const { credits, setPaletteOpen } = useStore();
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-40 h-[54px] bg-bg/90 backdrop-blur border-b border-line px-4 md:px-6 flex items-center justify-between gap-4">
      <button
        onClick={() => setPaletteOpen(true)}
        className="flex items-center gap-2 text-[0.8rem] text-dim bg-surface border border-line rounded-md px-3 py-1.5 hover:text-muted cursor-pointer w-full max-w-[360px]"
      >
        <Search size={13} /> Search projects, pages and actions
        <span className="ml-auto font-mono text-[0.55rem] border border-line-2 rounded-[3px] px-1">⌘K</span>
      </button>
      <div className="flex items-center gap-2.5 shrink-0">
        <ModeSwitch />
        <Notifications />
        <button onClick={() => nav("/app/usage")} className="font-mono text-[0.65rem] text-muted bg-surface border border-line rounded-md px-2.5 py-1 cursor-pointer hover:text-fg">
          {credits} credits
        </button>
      </div>
    </header>
  );
}

export function Toasts() {
  const { toasts } = useStore();
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="rise bg-ink text-[#eee] border border-ink-line text-[0.8rem] px-3.5 py-2 rounded-[7px] shadow-lg flex items-center gap-2">
          <span className="w-[5px] h-[5px] rounded-full bg-neon" />
          {t.text}
        </div>
      ))}
    </div>
  );
}

function AssistantButton() {
  const { setHelpOpen, helpOpen } = useStore();
  if (helpOpen) return null;
  return (
    <button
      onClick={() => setHelpOpen(true)}
      title="Ask Architect for help"
      className="fixed bottom-5 right-5 z-[90] w-12 h-12 rounded-full bg-ink border border-ink-line text-neon shadow-[0_8px_30px_rgba(0,0,0,0.25)] flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
    >
      <Compass size={20} />
    </button>
  );
}

export function AppShell() {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex bg-bg text-fg">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <ErrorBoundary resetKey={loc.pathname}>
          <Outlet />
        </ErrorBoundary>
      </div>
      <AssistantButton />
      <HelpPanel />
    </div>
  );
}

export function GlobalLayer() {
  const { setPaletteOpen } = useStore();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPaletteOpen]);
  return (
    <>
      <CommandPalette />
      <Toasts />
    </>
  );
}
