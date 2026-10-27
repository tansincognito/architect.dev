import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CornerDownLeft, Search } from "lucide-react";
import { useStore } from "../lib/store";
import { cx } from "./ui";

interface Cmd {
  group: string;
  label: string;
  hint?: string;
  run: () => void;
}

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, projects, mode, setMode, theme, setTheme, toast } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  const go = (to: string) => () => nav(to);

  const cmds = useMemo<Cmd[]>(
    () => [
      { group: "create", label: "New application from a description", hint: "N", run: go("/app") },
      { group: "create", label: "Import an existing project", hint: "I", run: go("/app/import") },
      { group: "create", label: "New agent", hint: "A", run: go("/app/agents/new") },
      { group: "create", label: "Browse the marketplace", run: go("/app/marketplace") },
      { group: "create", label: "What should I build?", run: go("/app/discover") },
      { group: "create", label: "Prompt library", run: go("/app/prompts") },
      ...projects.map((p) => ({ group: "projects", label: p.name, hint: p.stack, run: go(`/app/p/${p.id}`) })),
      { group: "actions", label: "Deploy support-triage-agent", hint: "prod", run: go("/app/p/support-triage-agent/deploy") },
      { group: "actions", label: "Open approvals", run: go("/app/approvals") },
      { group: "actions", label: "Run quality evaluation · support-triage-agent", run: go("/app/p/support-triage-agent/evals") },
      { group: "actions", label: "View activity traces · support-triage-agent", run: go("/app/p/support-triage-agent/observe") },
      {
        group: "preferences",
        label: `Switch to ${mode === "dev" ? "business" : "developer"} view`,
        run: () => {
          setMode(mode === "dev" ? "simple" : "dev");
          toast(`${mode === "dev" ? "Business" : "Developer"} view`);
        },
      },
      { group: "preferences", label: `Switch to ${theme === "light" ? "dark" : "light"} theme`, run: () => setTheme(theme === "light" ? "dark" : "light") },
      { group: "navigate", label: "Integrations", run: go("/app/integrations") },
      { group: "navigate", label: "Usage", run: go("/app/usage") },
      { group: "navigate", label: "Published projects", run: go("/app/published") },
      { group: "navigate", label: "Shared with me", run: go("/app/shared") },
      { group: "navigate", label: "Design systems", run: go("/app/design-systems") },
      { group: "navigate", label: "How it works", run: go("/app/how-it-works") },
      { group: "navigate", label: "Resources", run: go("/app/resources") },
      { group: "navigate", label: "Members & roles", run: go("/app/team") },
      { group: "navigate", label: "API keys & CLI", run: go("/app/settings?tab=api") },
      { group: "navigate", label: "Documentation", run: go("/app/docs") },
    ],
    [projects, mode, theme],
  );

  const filtered = cmds.filter((c) => (c.label + " " + c.group).toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    if (paletteOpen) {
      setQ("");
      setIdx(0);
    }
  }, [paletteOpen]);

  useEffect(() => {
    setIdx(0);
  }, [q]);

  if (!paletteOpen) return null;

  const run = (c: Cmd) => {
    setPaletteOpen(false);
    c.run();
  };

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[150] flex items-start justify-center pt-[14vh] px-4 bg-black/30 backdrop-blur-[2px]" onClick={() => setPaletteOpen(false)}>
      <div className="rise w-full max-w-[560px] bg-bg border border-line-2 rounded-xl shadow-[0_24px_70px_rgba(0,0,0,0.25)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-line">
          <Search size={13} className="text-dim" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setPaletteOpen(false);
              if (e.key === "ArrowDown") (e.preventDefault(), setIdx((i) => Math.min(filtered.length - 1, i + 1)));
              if (e.key === "ArrowUp") (e.preventDefault(), setIdx((i) => Math.max(0, i - 1)));
              if (e.key === "Enter" && filtered[idx]) run(filtered[idx]);
            }}
            placeholder="Type a command or search projects"
            className="flex-1 bg-transparent outline-none text-[0.9rem] placeholder:text-dim"
          />
          <span className="font-mono text-[0.55rem] text-dim border border-line rounded-[3px] px-1">esc</span>
        </div>
        <div className="max-h-[52vh] overflow-auto py-1.5">
          {filtered.length === 0 && <div className="font-mono text-[0.65rem] text-dim px-4 py-6 text-center">No matches. Press Enter to ask Architect.</div>}
          {filtered.map((c, i) => {
            const header = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <div key={c.group + c.label}>
                {header && <div className="font-mono text-[0.52rem] uppercase tracking-[0.1em] text-dim px-4 pt-2.5 pb-1">{header}</div>}
                <button
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => run(c)}
                  className={cx(
                    "w-full flex items-center justify-between px-4 py-2 text-[0.82rem] cursor-pointer text-left",
                    i === idx ? "bg-surface text-fg" : "text-muted",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {i === idx && <span className="text-neon-ink font-bold">›</span>}
                    {c.label}
                  </span>
                  <span className="flex items-center gap-2 text-[0.55rem] text-dim">
                    {c.hint}
                    {i === idx && <CornerDownLeft size={10} />}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
