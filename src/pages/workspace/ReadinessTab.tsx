import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ConfidencePanel } from "./ConfidencePanel";
import { PermissionsPanel } from "./PermissionsPanel";
import { Check, Sparkles, X } from "lucide-react";
import { Badge, Bar, Btn, Label, Pills, Spinner, Toggle, cx } from "../../components/ui";
import { AREAS, areaScore, fixedValue, initialValues, totalScore, type Area, type Values } from "../../lib/readiness";
import { useShared, useStore } from "../../lib/store";
import { useProject } from "./Workspace";

export function useReadiness(projectId: string) {
  return useShared<Values>(`readiness.${projectId}`, initialValues);
}

function scoreTone(s: number) {
  return s >= 80 ? "var(--live)" : s >= 50 ? "var(--warn)" : "var(--danger)";
}

export function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={6} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={scoreTone(score)}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - score / 100)}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="rotate-90 origin-center font-mono font-bold" fontSize={size / 4} fill="var(--fg)">
        {score}
      </text>
    </svg>
  );
}

function ChecklistView() {
  const p = useProject();
  const nav = useNavigate();
  const { mode, toast } = useStore();
  const [values, setValues] = useReadiness(p.id);
  const [active, setActive] = useState<string>(AREAS[0].id);
  const [fixing, setFixing] = useState<string | null>(null);

  const score = totalScore(values);
  const area = AREAS.find((a) => a.id === active)!;
  const failing = AREAS.flatMap((a) => a.controls.filter((c) => !c.pass(values[`${a.id}.${c.id}`])).map((c) => ({ a, c })));

  const set = (key: string, v: boolean | string | number) => setValues({ ...values, [key]: v });

  const fixArea = (a: Area | null) => {
    setFixing(a?.id ?? "all");
    setTimeout(() => {
      const next = { ...values };
      (a ? [a] : AREAS).forEach((ar) =>
        ar.controls.forEach((c) => {
          const k = `${ar.id}.${c.id}`;
          if (!c.pass(next[k])) next[k] = fixedValue(c);
        }),
      );
      setValues(next);
      setFixing(null);
      toast(a ? `${a.name}: remediation applied · submitted for review` : "All remediations applied · pull request #42 opened for review");
    }, 1400);
  };

  if (mode === "simple") {
    return (
      <div className="flex-1 max-w-[860px] w-full mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center gap-8 border border-line rounded-xl p-6">
          <ScoreRing score={score} />
          <div className="flex-1">
            <Label>governance & production readiness</Label>
            <div className="font-sans text-[1.3rem] font-semibold tracking-[-0.02em] mt-1">
              {score >= 85 ? "Approved for production use" : score >= 60 ? "Minor gaps remain before production" : "Not yet ready for production"}
            </div>
            <div className="text-[0.85rem] text-muted mt-1">
              {failing.length} controls require attention · Architect can remediate them automatically
            </div>
            <div className="flex gap-2 mt-4">
              <Btn variant="primary" onClick={() => fixArea(null)} disabled={!failing.length || !!fixing}>
                {fixing ? <Spinner /> : <Sparkles size={11} />} Remediate all
              </Btn>
              <Btn onClick={() => nav(`/app/p/${p.id}/deploy`)}>Proceed to deployment →</Btn>
            </div>
          </div>
        </div>
        <div className="mt-6 border border-line rounded-lg overflow-hidden">
          {AREAS.map((a) => {
            const s = areaScore(a, values);
            const bad = a.controls.filter((c) => !c.pass(values[`${a.id}.${c.id}`]));
            return (
              <div key={a.id} className="flex items-center gap-4 px-4 py-3 border-b border-line last:border-0">
                <span className={cx("w-5 h-5 rounded-full flex items-center justify-center shrink-0", s === 100 ? "bg-neon text-[#0a0a0a]" : "bg-surface-2 text-dim")}>
                  {s === 100 ? <Check size={11} /> : <X size={11} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.88rem] font-semibold">{a.plain}</div>
                  {bad.length > 0 && <div className="text-[0.75rem] text-dim truncate">Outstanding: {bad.map((c) => c.plain).join("; ")}</div>}
                </div>
                {bad.length > 0 && (
                  <Btn size="sm" onClick={() => fixArea(a)} disabled={!!fixing}>
                    {fixing === a.id ? <Spinner /> : "Remediate"}
                  </Btn>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const areaFailing = area.controls.filter((c) => !c.pass(values[`${area.id}.${c.id}`]));

  return (
    <div className="flex-1 grid lg:grid-cols-[300px_1fr] min-h-0">
      <aside className="border-r border-line flex flex-col min-h-0">
        <div className="p-5 border-b border-line flex items-center gap-4">
          <ScoreRing score={score} size={84} />
          <div>
            <Label>readiness score</Label>
            <div className="text-[0.8rem] text-muted mt-1">{failing.length} controls failing</div>
            <Btn size="sm" variant="primary" className="mt-2" onClick={() => fixArea(null)} disabled={!failing.length || !!fixing}>
              {fixing === "all" ? <Spinner /> : <Sparkles size={10} />} Remediate all
            </Btn>
          </div>
        </div>
        <div className="overflow-auto flex-1 py-1">
          {AREAS.map((a, i) => {
            const s = areaScore(a, values);
            return (
              <button
                key={a.id}
                onClick={() => setActive(a.id)}
                className={cx("w-full text-left px-5 py-2.5 flex items-center gap-3 cursor-pointer", active === a.id ? "bg-surface" : "hover:bg-surface/60")}
              >
                <span className="font-mono text-[0.52rem] text-dim w-4">{String(i + 1).padStart(2, "0")}</span>
                <span className={cx("text-[0.82rem] flex-1", active === a.id ? "text-fg font-semibold" : "text-muted")}>{a.name}</span>
                <span className="w-10">
                  <Bar value={s} tone={s >= 80 ? "neon" : s >= 50 ? "warn" : "danger"} />
                </span>
                <span className="font-mono text-[0.55rem] text-dim w-7 text-right">{s}%</span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="px-4 md:px-8 py-6 overflow-auto">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="font-sans text-[1.5rem] font-semibold tracking-[-0.02em] m-0">{area.name}</h2>
            <p className="text-[0.82rem] text-muted mt-1">{area.plain}</p>
          </div>
          {areaFailing.length > 0 && (
            <Btn onClick={() => fixArea(area)} disabled={!!fixing}>
              {fixing === area.id ? <Spinner /> : <Sparkles size={11} />} Remediate {areaFailing.length}
            </Btn>
          )}
        </div>
        <div className="border border-line rounded-lg overflow-hidden">
          {area.controls.map((c) => {
            const k = `${area.id}.${c.id}`;
            const v = values[k];
            const ok = c.pass(v);
            return (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3.5 border-b border-line last:border-0">
                <span className={cx("w-[6px] h-[6px] rounded-full shrink-0")} style={{ background: ok ? "var(--live)" : "var(--danger)" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[0.85rem]">{c.label}</div>
                  <div className="text-[0.75rem] text-dim">{c.plain}</div>
                </div>
                {!ok && <Badge tone="danger">failing</Badge>}
                {c.type === "toggle" && <Toggle on={v === true} onChange={(x) => set(k, x)} label={c.label} />}
                {c.type === "select" && (
                  <select value={String(v)} onChange={(e) => set(k, e.target.value)} className="bg-bg border border-line-2 rounded-md px-2 py-1 font-mono text-[0.62rem] text-fg">
                    {c.options!.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                )}
                {c.type === "number" && (
                  <span className="flex items-center gap-1">
                    <input
                      type="number"
                      value={Number(v)}
                      onChange={(e) => set(k, Number(e.target.value))}
                      className="w-20 bg-bg border border-line-2 rounded-md px-2 py-1 font-mono text-[0.62rem] text-fg text-right"
                    />
                    <span className="font-mono text-[0.55rem] text-dim w-12">{c.unit}</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-5 bg-ink border border-ink-line rounded-lg p-4">
          <Label className="!text-[#555] mb-2">policy as code · architect.yaml · {area.id}</Label>
          <pre className="font-mono text-[0.62rem] text-[#aaa] m-0 leading-relaxed">
            {`${area.id}:\n` +
              area.controls
                .map((c) => `  ${c.id}: ${JSON.stringify(values[`${area.id}.${c.id}`])}${c.unit ? `  # ${c.unit}` : ""}`)
                .join("\n")}
          </pre>
        </div>
      </section>
    </div>
  );
}

const VIEWS = [
  { value: "checklist" as const, label: "readiness checklist" },
  { value: "confidence" as const, label: "confidence" },
  { value: "permissions" as const, label: "permissions" },
];

export default function GovernanceTab() {
  const p = useProject();
  const [params, setParams] = useSearchParams();
  const view = (params.get("view") as "checklist" | "confidence" | "permissions") ?? "checklist";
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-line px-4 md:px-8 py-2 flex items-center gap-3">
        <Pills items={VIEWS} value={view} onChange={(v) => setParams(v === "checklist" ? {} : { view: v })} />
      </div>
      {view === "checklist" ? (
        <ChecklistView />
      ) : (
        <div className="flex-1 overflow-auto px-4 md:px-8 py-6 max-w-[1200px] w-full">
          {view === "confidence" ? <ConfidencePanel projectId={p.id} /> : <PermissionsPanel projectId={p.id} />}
        </div>
      )}
    </div>
  );
}
