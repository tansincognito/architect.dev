import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Download, LayoutTemplate } from "lucide-react";
import type { Project } from "../lib/data";
import { useStore } from "../lib/store";
import { Badge, Pills, Status } from "./ui";

const KIND_ICON = {
  agent: <Bot size={11} />,
  app: <LayoutTemplate size={11} />,
  imported: <Download size={11} />,
};

export function ProjectList({ projects, limit, title = "Projects", sub }: { projects: Project[]; limit?: number; title?: string; sub?: string }) {
  const nav = useNavigate();
  const { mode } = useStore();
  const [filter, setFilter] = useState<"all" | "live" | "building" | "draft" | "failed">("all");
  const filtered = (filter === "all" ? projects : projects.filter((p) => p.status === filter)).slice(0, limit);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="font-sans text-[1.75rem] font-semibold tracking-[-0.02em] m-0 leading-none">{title}</h2>
          <p className="text-[0.85rem] text-muted mt-1.5">
            {sub ?? `${projects.length} total · ${projects.filter((p) => p.status === "live").length} live`}
          </p>
        </div>
        <Pills items={["all", "live", "building", "draft", "failed"] as const} value={filter} onChange={setFilter} />
      </div>

      <div className="flex flex-col">
        {filtered.map((p, i) => (
          <div
            key={p.id}
            onClick={() => nav(`/app/p/${p.id}`)}
            className="grid grid-cols-[2rem_1fr_auto] md:grid-cols-[2rem_1fr_auto_auto_auto_auto] items-center gap-4 md:gap-6 px-3 py-3.5 border-b border-line last:border-0 rounded-md cursor-pointer hover:bg-surface transition-colors"
          >
            <span className="font-mono text-[0.55rem] text-dim tracking-[0.1em]">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <div className="font-mono text-[0.78rem] font-medium tracking-[-0.01em] flex items-center gap-2">
                <span className="text-dim">{KIND_ICON[p.kind]}</span>
                {p.name}
              </div>
              <div className="text-[0.75rem] text-dim mt-0.5 truncate">{mode === "dev" ? p.stack : p.desc}</div>
            </div>
            <span className="hidden md:block">
              {p.framework ? <Badge>{p.framework}</Badge> : p.kind === "imported" ? <Badge tone="info">imported</Badge> : null}
            </span>
            <span className="hidden md:flex items-center gap-1.5 text-[0.75rem] text-dim" title="production readiness">
              <span
                className="w-6 h-[3px] rounded-full"
                style={{ background: p.readiness >= 80 ? "var(--live)" : p.readiness >= 50 ? "var(--warn)" : "var(--danger)" }}
              />
              {p.readiness}%
            </span>
            <span className="hidden md:block text-[0.75rem] text-dim">{p.updated}</span>
            <Status status={p.status} pulse={p.status === "building"} />
          </div>
        ))}
      </div>
    </div>
  );
}
