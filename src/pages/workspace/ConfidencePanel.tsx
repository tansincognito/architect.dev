import { useState } from "react";
import { Check, FlaskConical, Info } from "lucide-react";
import { Badge, Btn, HairGrid, Label, Pills, Spinner, Toggle, cx } from "../../components/ui";
import { useShared, useStore } from "../../lib/store";

export interface ConfidenceMethod {
  id: string;
  name: string;
  plain: string;
  how: string;
  cost: string;
  reliability: "low" | "medium" | "high";
}

export const METHODS: ConfidenceMethod[] = [
  { id: "self", name: "AI self-assessment", plain: "The AI rates how certain it is about its own answer.", how: "token log-probabilities + self-rating prompt", cost: "No extra cost", reliability: "low" },
  { id: "consistency", name: "Consistency check", plain: "The same question is answered several times; agreement means confidence.", how: "n samples @ temperature 0.7, majority agreement", cost: "+3–5× model cost", reliability: "high" },
  { id: "grounding", name: "Evidence support", plain: "How well the answer is backed by your documents and data.", how: "citation coverage + retrieval similarity", cost: "+5% cost", reliability: "medium" },
  { id: "judge", name: "Independent reviewer", plain: "A second AI model checks the answer before it is used.", how: "LLM-as-judge with rubric, different model family", cost: "+40% cost", reliability: "high" },
  { id: "history", name: "Track record", plain: "How often similar past cases were correct, learned from reviews and approvals.", how: "isotonic calibration on eval + approval outcomes", cost: "No extra cost", reliability: "high" },
  { id: "rules", name: "Business rules", plain: "Your own rules raise or lower the score, e.g. VIP customers or large amounts.", how: "additive adjustments evaluated after scoring", cost: "No extra cost", reliability: "medium" },
];

export interface ConfidenceConfig {
  mode: "single" | "blend";
  single: string;
  weights: Record<string, number>;
  enabled: Record<string, boolean>;
  autoAt: number;
  reviewAt: number;
  samples: number;
  judgeModel: string;
  rules: { when: string; adjust: number; on: boolean }[];
}

export const defaultConfidence = (): ConfidenceConfig => ({
  mode: "blend",
  single: "history",
  weights: { self: 10, consistency: 25, grounding: 25, judge: 0, history: 40, rules: 0 },
  enabled: { self: true, consistency: true, grounding: true, judge: false, history: true, rules: true },
  autoAt: 90,
  reviewAt: 60,
  samples: 3,
  judgeModel: "opus-4.5",
  rules: [
    { when: "Customer tier is Enterprise", adjust: -10, on: true },
    { when: "Amount exceeds $1,000", adjust: -20, on: true },
    { when: "Customer has contacted us 3+ times this week", adjust: -10, on: false },
  ],
});

export function useConfidence(projectId: string) {
  return useShared<ConfidenceConfig>(`confidence.${projectId}`, defaultConfidence);
}

const REL_SCORE = { low: 0.55, medium: 0.75, high: 0.92 };

/** Simulated outcome on the last 1,000 tickets — deterministic so sliders feel real. */
function simulate(c: ConfidenceConfig) {
  const active = c.mode === "single" ? [c.single] : METHODS.map((m) => m.id).filter((id) => c.enabled[id] && c.weights[id] > 0);
  const totalW = c.mode === "single" ? 1 : active.reduce((s, id) => s + c.weights[id], 0) || 1;
  const quality =
    c.mode === "single"
      ? REL_SCORE[METHODS.find((m) => m.id === c.single)!.reliability]
      : active.reduce((s, id) => s + REL_SCORE[METHODS.find((m) => m.id === id)!.reliability] * (c.weights[id] / totalW), 0);
  const auto = Math.max(5, Math.round(100 - c.autoAt * 0.75 - (1 - quality) * 20));
  const escalate = Math.max(2, Math.round(c.reviewAt * 0.12));
  const review = Math.max(0, 100 - auto - escalate);
  const accuracy = Math.min(99.6, 80 + quality * 12 + (c.autoAt - 70) * 0.18).toFixed(1);
  const costMult =
    1 +
    (active.includes("consistency") ? (c.samples - 1) * (c.mode === "single" ? 1 : c.weights.consistency / totalW) : 0) +
    (active.includes("judge") ? 0.4 : 0) +
    (active.includes("grounding") ? 0.05 : 0);
  return { auto, review, escalate, accuracy, costMult: costMult.toFixed(2), quality };
}

const SAMPLE = [
  { t: "#4811 How do I export my data to csv?", parts: { self: 96, consistency: 100, grounding: 94, judge: 95, history: 97, rules: 0 } },
  { t: "#4812 Charged twice for march invoice", parts: { self: 91, consistency: 100, grounding: 88, judge: 90, history: 86, rules: -10 } },
  { t: "#4815 you people are useless, cancel now", parts: { self: 78, consistency: 67, grounding: 41, judge: 55, history: 52, rules: 0 } },
];

export function ConfidencePanel({ projectId }: { projectId: string }) {
  const { mode: view, toast } = useStore();
  const [c, setC] = useConfidence(projectId);
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);
  const sim = simulate(c);
  const set = (patch: Partial<ConfidenceConfig>) => setC({ ...c, ...patch });

  const score = (parts: Record<string, number>) => {
    if (c.mode === "single") return c.single === "rules" ? Math.max(0, 80 + parts.rules) : parts[c.single];
    const ids = METHODS.map((m) => m.id).filter((id) => id !== "rules" && c.enabled[id] && c.weights[id] > 0);
    const w = ids.reduce((s, id) => s + c.weights[id], 0) || 1;
    const base = ids.reduce((s, id) => s + parts[id] * (c.weights[id] / w), 0);
    return Math.max(0, Math.min(100, Math.round(base + (c.enabled.rules ? parts.rules : 0))));
  };
  const band = (s: number) => (s >= c.autoAt ? "acts automatically" : s >= c.reviewAt ? "needs permission" : "escalated");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[1.4rem] font-semibold tracking-[-0.02em] m-0">Confidence scoring</h2>
        <p className="text-[0.85rem] text-muted mt-1 max-w-[720px]">
          Choose how Architect decides how sure an agent is about each answer, and what happens at each level of confidence. The score shown next to every ticket, draft and approval request uses this setting.
        </p>
      </div>

      {/* 1. method */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <Label>1 · how confidence is calculated</Label>
          <Pills
            items={[
              { value: "blend" as const, label: "combine methods" },
              { value: "single" as const, label: "single method" },
            ]}
            value={c.mode}
            onChange={(m) => set({ mode: m })}
          />
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
          {METHODS.map((m) => {
            const on = c.mode === "single" ? c.single === m.id : c.enabled[m.id];
            return (
              <div key={m.id} className={cx("border rounded-lg p-4 transition-colors", on ? "border-fg bg-surface" : "border-line")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[0.9rem] font-semibold">{m.name}</div>
                  {c.mode === "single" ? (
                    <button onClick={() => set({ single: m.id })} className={cx("w-4 h-4 rounded-full border shrink-0 mt-0.5 cursor-pointer", on ? "border-[5px] border-fg" : "border-line-2")} aria-label={`use ${m.name}`} />
                  ) : (
                    <Toggle on={on} onChange={(v) => set({ enabled: { ...c.enabled, [m.id]: v } })} label={m.name} />
                  )}
                </div>
                <div className="text-[0.78rem] text-muted mt-1 leading-relaxed">{m.plain}</div>
                {view === "dev" && <div className="font-mono text-[0.6rem] text-dim mt-1.5">{m.how}</div>}
                <div className="flex items-center gap-2 mt-3">
                  <Badge tone={m.reliability === "high" ? "neon" : m.reliability === "medium" ? "neutral" : "warn"}>{m.reliability} reliability</Badge>
                  <span className="text-[0.7rem] text-dim">{m.cost}</span>
                </div>
                {c.mode === "blend" && on && m.id !== "rules" && (
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={c.weights[m.id]}
                      onChange={(e) => set({ weights: { ...c.weights, [m.id]: Number(e.target.value) } })}
                      className="flex-1 accent-[#b8f000]"
                      aria-label={`${m.name} weight`}
                    />
                    <span className="font-mono text-[0.7rem] w-10 text-right">{c.weights[m.id]}%</span>
                  </div>
                )}
                {view === "dev" && on && m.id === "consistency" && (
                  <div className="mt-2 flex items-center gap-2 text-[0.72rem] text-muted">
                    Samples
                    <select value={c.samples} onChange={(e) => set({ samples: Number(e.target.value) })} className="bg-bg border border-line-2 rounded px-1.5 py-0.5 font-mono text-[0.68rem] text-fg">
                      {[3, 5, 7].map((n) => (
                        <option key={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                )}
                {view === "dev" && on && m.id === "judge" && (
                  <div className="mt-2 flex items-center gap-2 text-[0.72rem] text-muted">
                    Reviewer model
                    <select value={c.judgeModel} onChange={(e) => set({ judgeModel: e.target.value })} className="bg-bg border border-line-2 rounded px-1.5 py-0.5 font-mono text-[0.68rem] text-fg">
                      <option>opus-4.5</option>
                      <option>gpt-4.1</option>
                      <option>gemini-2.5-pro</option>
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {c.mode === "blend" && (
          <div className="flex items-center gap-2 text-[0.75rem] text-dim mt-2">
            <Info size={12} /> Weights are normalised automatically. Business rules adjust the final score after blending.
          </div>
        )}
      </section>

      {/* business rules */}
      {(c.mode === "blend" ? c.enabled.rules : c.single === "rules") && (
        <section>
          <Label className="mb-2">business rules</Label>
          <div className="border border-line rounded-lg overflow-hidden">
            {c.rules.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-line last:border-0">
                <span className="text-[0.85rem] flex-1">When {r.when.charAt(0).toLowerCase() + r.when.slice(1)}</span>
                <span className={cx("font-mono text-[0.75rem]", r.adjust < 0 ? "text-danger" : "text-live")}>
                  {r.adjust > 0 ? "+" : ""}
                  {r.adjust} pts
                </span>
                <Toggle on={r.on} onChange={(v) => set({ rules: c.rules.map((x, j) => (j === i ? { ...x, on: v } : x)) })} />
              </div>
            ))}
          </div>
          <button
            onClick={() => set({ rules: [...c.rules, { when: "Message mentions legal action", adjust: -30, on: true }] })}
            className="text-[0.78rem] text-dim hover:text-fg mt-2 cursor-pointer"
          >
            + Add rule
          </button>
        </section>
      )}

      {/* 2. thresholds */}
      <section>
        <Label className="mb-3">2 · what happens at each level</Label>
        <div className="relative h-9 rounded-lg overflow-hidden flex text-[0.72rem] font-medium">
          <div className="bg-danger/15 text-danger flex items-center justify-center" style={{ width: `${c.reviewAt}%` }}>
            Escalate
          </div>
          <div className="bg-warn/15 text-warn flex items-center justify-center" style={{ width: `${c.autoAt - c.reviewAt}%` }}>
            Needs permission
          </div>
          <div className="bg-neon-soft text-neon-ink flex items-center justify-center" style={{ width: `${100 - c.autoAt}%` }}>
            Automatic
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <div>
            <div className="flex justify-between text-[0.82rem]">
              <span>Act automatically at or above</span>
              <span className="font-mono font-bold">{c.autoAt}%</span>
            </div>
            <input type="range" min={c.reviewAt + 5} max={99} value={c.autoAt} onChange={(e) => set({ autoAt: Number(e.target.value) })} className="w-full accent-[#b8f000]" aria-label="automatic threshold" />
          </div>
          <div>
            <div className="flex justify-between text-[0.82rem]">
              <span>Escalate to a person below</span>
              <span className="font-mono font-bold">{c.reviewAt}%</span>
            </div>
            <input type="range" min={20} max={c.autoAt - 5} value={c.reviewAt} onChange={(e) => set({ reviewAt: Number(e.target.value) })} className="w-full accent-[#b8f000]" aria-label="escalation threshold" />
          </div>
        </div>
        <div className="text-[0.75rem] text-dim mt-1">Between the two thresholds, the action waits in Approvals. Blocked actions are never taken, regardless of confidence.</div>
      </section>

      {/* 3. impact */}
      <section>
        <Label className="mb-2">3 · expected impact · simulated on your last 1,000 tickets</Label>
        <HairGrid className="grid-cols-2 md:grid-cols-5">
          {[
            ["Handled automatically", `${sim.auto}%`],
            ["Sent for permission", `${sim.review}%`],
            ["Escalated", `${sim.escalate}%`],
            ["Accuracy of automatic actions", `${sim.accuracy}%`],
            ["Cost per run", `${sim.costMult}×`],
          ].map(([k, v]) => (
            <div key={k} className="bg-bg p-4">
              <div className="text-[0.72rem] text-dim">{k}</div>
              <div className="font-mono text-[1.3rem] font-bold mt-0.5">{v}</div>
            </div>
          ))}
        </HairGrid>
      </section>

      {/* 4. test */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <Label>4 · test on real examples</Label>
          <Btn
            size="sm"
            onClick={() => {
              setTesting(true);
              setTimeout(() => (setTesting(false), setTested(true)), 900);
            }}
          >
            {testing ? <Spinner /> : <FlaskConical size={11} />} Score sample tickets
          </Btn>
        </div>
        {tested && (
          <div className="border border-line rounded-lg overflow-hidden rise">
            {SAMPLE.map((s) => {
              const sc = score(s.parts);
              const b = band(sc);
              return (
                <div key={s.t} className="px-4 py-3 border-b border-line last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[0.85rem] flex-1">{s.t}</span>
                    <span className="font-mono text-[0.9rem] font-bold">{sc}%</span>
                    <Badge tone={b === "acts automatically" ? "neon" : b === "needs permission" ? "warn" : "danger"}>{b}</Badge>
                  </div>
                  {view === "dev" && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 font-mono text-[0.6rem] text-dim">
                      {METHODS.filter((m) => (c.mode === "single" ? m.id === c.single : c.enabled[m.id])).map((m) => (
                        <span key={m.id}>
                          {m.id}: {m.id === "rules" ? s.parts.rules : `${s.parts[m.id as keyof typeof s.parts]}%`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {view === "dev" && (
        <section className="grid lg:grid-cols-2 gap-4">
          <div>
            <Label className="mb-2">calibration · predicted vs actual accuracy</Label>
            <div className="border border-line rounded-lg p-4">
              <div className="flex items-end gap-1.5 h-28">
                {[0.52, 0.61, 0.7, 0.78, 0.86, 0.93, 0.97].map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end gap-0.5 h-24">
                      <div className="flex-1 bg-surface-2 rounded-t-[2px]" style={{ height: `${(0.4 + i * 0.09) * 100}%` }} />
                      <div className="flex-1 bg-neon rounded-t-[2px]" style={{ height: `${v * 100}%` }} />
                    </div>
                    <span className="font-mono text-[0.5rem] text-dim">{40 + i * 9}</span>
                  </div>
                ))}
              </div>
              <div className="text-[0.72rem] text-dim mt-2">Grey: predicted confidence · Lime: observed accuracy. Expected calibration error 0.031.</div>
            </div>
          </div>
          <div>
            <Label className="mb-2">policy as code · architect.yaml</Label>
            <pre className="bg-ink border border-ink-line rounded-lg p-4 font-mono text-[0.62rem] text-[#bbb] leading-relaxed m-0 overflow-auto h-[170px]">
              {`confidence:
  mode: ${c.mode}
${
  c.mode === "single"
    ? `  method: ${c.single}`
    : `  weights:\n${METHODS.filter((m) => c.enabled[m.id] && m.id !== "rules")
        .map((m) => `    ${m.id}: ${(c.weights[m.id] / 100).toFixed(2)}`)
        .join("\n")}`
}
  consistency_samples: ${c.samples}
  judge_model: ${c.judgeModel}
  thresholds:
    automatic: ${(c.autoAt / 100).toFixed(2)}
    escalate_below: ${(c.reviewAt / 100).toFixed(2)}
  rules:
${c.rules
  .filter((r) => r.on)
  .map((r) => `    - when: "${r.when}"\n      adjust: ${r.adjust / 100}`)
  .join("\n")}`}
            </pre>
          </div>
        </section>
      )}

      <div className="flex gap-2">
        <Btn variant="primary" onClick={() => toast("Confidence settings saved · applies to new runs immediately · recorded in audit log")}>
          <Check size={12} /> Save confidence settings
        </Btn>
        <Btn variant="ghost" onClick={() => setC(defaultConfidence())}>
          Reset to recommended
        </Btn>
      </div>
    </div>
  );
}
