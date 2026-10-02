import { useRef, useState } from "react";
import { Bot, Database, Hand, Play, Wrench, Zap } from "lucide-react";
import { cx } from "./ui";

export type NodeKind = "trigger" | "agent" | "tool" | "memory" | "human";

export interface GNode {
  id: string;
  kind: NodeKind;
  label: string;
  sub: string;
  x: number;
  y: number;
}

export interface GEdge {
  from: string;
  to: string;
  label?: string;
}

const ICON: Record<NodeKind, React.ReactNode> = {
  trigger: <Zap size={11} />,
  agent: <Bot size={11} />,
  tool: <Wrench size={11} />,
  memory: <Database size={11} />,
  human: <Hand size={11} />,
};

const ACCENT: Record<NodeKind, string> = {
  trigger: "var(--neon)",
  agent: "var(--fg)",
  tool: "var(--info)",
  memory: "#7c3aed",
  human: "var(--warn)",
};

const W = 150;
const H = 54;

export function AgentCanvas({
  nodes,
  edges,
  selected,
  onSelect,
  onMove,
  active = [],
  height = 400,
}: {
  nodes: GNode[];
  edges: GEdge[];
  selected?: string | null;
  onSelect?: (id: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  active?: string[];
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <div
      ref={ref}
      className="relative overflow-auto rounded-lg border border-line"
      style={{
        height,
        backgroundImage: "radial-gradient(var(--line-2) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
        backgroundColor: "var(--surface)",
      }}
      onMouseMove={(e) => {
        if (!drag || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        onMove?.(drag.id, Math.max(0, e.clientX - r.left + ref.current.scrollLeft - drag.dx), Math.max(0, e.clientY - r.top + ref.current.scrollTop - drag.dy));
      }}
      onMouseUp={() => setDrag(null)}
      onMouseLeave={() => setDrag(null)}
    >
      <svg className="absolute inset-0 pointer-events-none" width={1040} height={Math.max(height, 400)}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--dim)" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = byId[e.from];
          const b = byId[e.to];
          if (!a || !b) return null;
          const horiz = Math.abs(a.y - b.y) < 40;
          const x1 = horiz ? a.x + W : a.x + W / 2;
          const y1 = horiz ? a.y + H / 2 : a.y + (b.y > a.y ? H : 0);
          const x2 = horiz ? b.x : b.x + W / 2;
          const y2 = horiz ? b.y + H / 2 : b.y + (b.y > a.y ? 0 : H);
          const hot = active.includes(e.from) && active.includes(e.to);
          const path = horiz ? `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}` : `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`;
          return (
            <g key={i}>
              <path d={path} fill="none" stroke={hot ? "var(--neon)" : "var(--line-2)"} strokeWidth={hot ? 2 : 1.5} markerEnd="url(#arrow)" />
              {e.label && (
                <text x={(x1 + x2) / 2 + 4} y={(y1 + y2) / 2 - 4} fontSize={9} fontFamily="JetBrains Mono" fill="var(--dim)">
                  {e.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {nodes.map((n) => (
        <div
          key={n.id}
          onMouseDown={(e) => {
            const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            setDrag({ id: n.id, dx: e.clientX - r.left, dy: e.clientY - r.top });
            onSelect?.(n.id);
          }}
          className={cx(
            "absolute bg-bg border rounded-lg px-3 py-2 select-none cursor-grab active:cursor-grabbing transition-shadow",
            selected === n.id ? "border-fg shadow-[0_0_0_3px_var(--neon-soft)]" : "border-line-2",
            active.includes(n.id) && "shadow-[0_0_0_3px_rgba(184,240,0,0.45)]",
          )}
          style={{ left: n.x, top: n.y, width: W, height: H }}
        >
          <div className="flex items-center gap-1.5 font-mono text-[0.66rem] font-bold">
            <span style={{ color: ACCENT[n.kind] }}>{ICON[n.kind]}</span>
            {n.label}
            {active[active.length - 1] === n.id && <Play size={8} className="ml-auto text-neon-ink" />}
          </div>
          <div className="font-mono text-[0.53rem] text-dim mt-0.5 truncate">{n.sub}</div>
        </div>
      ))}
    </div>
  );
}
