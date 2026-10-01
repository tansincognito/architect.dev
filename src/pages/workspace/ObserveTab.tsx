import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, Brain, Hand, Search, Wrench } from "lucide-react";
import { Badge, Bar, Btn, HairGrid, Input, Label, Modal, Pills, Status, cx } from "../../components/ui";
import { useStore } from "../../lib/store";
import { useProject } from "./Workspace";

interface Span {
  name: string;
  kind: "agent" | "llm" | "tool" | "human";
  start: number;
  dur: number;
  depth: number;
  model?: string;
  tokens?: number;
  cost?: number;
  input?: string;
  output?: string;
  error?: boolean;
}

interface Trace {
  id: string;
  input: string;
  status: "passed" | "failed" | "pending";
  dur: number;
  cost: number;
  when: string;
  agentVer: string;
  spans: Span[];
}

const SPANS: Span[] = [
  { name: "graph.run", kind: "agent", start: 0, dur: 2140, depth: 0 },
  { name: "classifier", kind: "agent", start: 20, dur: 410, depth: 1 },
  { name: "llm · classify", kind: "llm", start: 30, dur: 380, depth: 2, model: "haiku-4.5", tokens: 812, cost: 0.0008, input: "Ticket #4812: Charged twice for march invoice…", output: '{"intent":"refund","urgency":"high","confidence":0.94}' },
  { name: "responder", kind: "agent", start: 440, dur: 1220, depth: 1 },
  { name: "tool · search_docs", kind: "tool", start: 450, dur: 180, depth: 2, input: '{"q":"double charge refund policy"}', output: "3 docs · refund-policy.md (0.89)" },
  { name: "llm · draft_reply", kind: "llm", start: 640, dur: 1010, depth: 2, model: "sonnet-4.5", tokens: 2410, cost: 0.0121, input: "system: you are a support agent… context: refund-policy.md", output: "Hi Dana — sorry about the double charge…" },
  { name: "escalator", kind: "agent", start: 1670, dur: 460, depth: 1 },
  { name: "policy · refund > $100", kind: "tool", start: 1680, dur: 40, depth: 2, output: "requires_approval=true" },
  { name: "human · approval", kind: "human", start: 1730, dur: 400, depth: 2, output: "pending · #support-leads" },
];

const TRACES: Trace[] = [
  { id: "tr_8f2a", input: "#4812 Charged twice for march invoice", status: "pending", dur: 2.14, cost: 0.013, when: "6m ago", agentVer: "v23", spans: SPANS },
  { id: "tr_8f29", input: "#4811 How do I export my data to csv?", status: "passed", dur: 1.21, cost: 0.006, when: "9m ago", agentVer: "v23", spans: SPANS.slice(0, 6) },
  { id: "tr_8f28", input: "#4810 SSO login loop on safari", status: "passed", dur: 1.94, cost: 0.011, when: "14m ago", agentVer: "v23", spans: SPANS.slice(0, 6) },
  {
    id: "tr_8f27",
    input: "#4809 Can we upgrade mid-cycle?",
    status: "failed",
    dur: 30.0,
    cost: 0.004,
    when: "22m ago",
    agentVer: "v23",
    spans: [...SPANS.slice(0, 4), { name: "tool · search_docs", kind: "tool", start: 450, dur: 29500, depth: 2, error: true, output: "TimeoutError: search_docs exceeded 10s ×3 retries" }],
  },
  { id: "tr_8f26", input: "#4808 API rate limit questions", status: "passed", dur: 1.33, cost: 0.007, when: "31m ago", agentVer: "v22", spans: SPANS.slice(0, 6) },
];

const KIND_ICON = { agent: <Bot size={10} />, llm: <Brain size={10} />, tool: <Wrench size={10} />, human: <Hand size={10} /> };
const KIND_COLOR = { agent: "var(--fg)", llm: "#7c3aed", tool: "var(--info)", human: "var(--warn)" };

function TraceDetail({ t, onBack }: { t: Trace; onBack: () => void }) {
  const [sel, setSel] = useState<Span>(t.spans.find((s) => s.error) ?? t.spans[2] ?? t.spans[0]);
  const { toast } = useStore();
  const total = Math.max(...t.spans.map((s) => s.start + s.dur));
  return (
    <div className="rise">
      <button onClick={onBack} className="text-[0.75rem] text-dim hover:text-fg inline-flex items-center gap-1 mb-4 cursor-pointer">
        <ArrowLeft size={10} /> All traces
      </button>
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <div className="text-[1.05rem] font-semibold">{t.input}</div>
          <div className="text-[0.75rem] text-dim mt-1">
            {t.id} · agent {t.agentVer} · prompt v12 · {t.dur}s · ${t.cost.toFixed(3)}
          </div>
        </div>
        <div className="flex gap-2">
          <Btn size="sm" onClick={() => toast("Added to evaluation dataset 'support-regressions'")}>
            Add to evaluation set
          </Btn>
          <Btn size="sm" onClick={() => toast("Replaying in a sandbox against the current version")}>
            Replay
          </Btn>
        </div>
      </div>
      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        <div className="border border-line rounded-lg overflow-hidden">
          {t.spans.map((s, i) => (
            <button
              key={i}
              onClick={() => setSel(s)}
              className={cx("w-full grid grid-cols-[220px_1fr_60px] items-center gap-3 px-3 py-2 border-b border-line last:border-0 cursor-pointer text-left", sel === s ? "bg-surface" : "hover:bg-surface/60")}
            >
              <span className="font-mono text-[0.62rem] flex items-center gap-1.5 truncate" style={{ paddingLeft: s.depth * 14 }}>
                <span style={{ color: KIND_COLOR[s.kind] }}>{KIND_ICON[s.kind]}</span>
                <span className={s.error ? "text-danger" : ""}>{s.name}</span>
              </span>
              <span className="relative h-3">
                <span
                  className="absolute top-0 h-3 rounded-[2px]"
                  style={{
                    left: `${(s.start / total) * 100}%`,
                    width: `${Math.max(1, (s.dur / total) * 100)}%`,
                    background: s.error ? "var(--danger)" : KIND_COLOR[s.kind],
                    opacity: s.kind === "agent" ? 0.25 : 0.75,
                  }}
                />
              </span>
              <span className="font-mono text-[0.55rem] text-dim text-right">{s.dur >= 1000 ? `${(s.dur / 1000).toFixed(1)}s` : `${s.dur}ms`}</span>
            </button>
          ))}
        </div>
        <div className="border border-line rounded-lg p-4 space-y-3 h-fit">
          <div className="flex items-center justify-between">
            <span className="text-[0.88rem] font-semibold">{sel.name}</span>
            <Badge tone={sel.error ? "danger" : "neutral"}>{sel.kind}</Badge>
          </div>
          {sel.model && (
            <div className="grid grid-cols-3 gap-2 font-mono text-[0.58rem]">
              <div>
                <div className="text-dim">model</div>
                {sel.model}
              </div>
              <div>
                <div className="text-dim">tokens</div>
                {sel.tokens}
              </div>
              <div>
                <div className="text-dim">cost</div>${sel.cost}
              </div>
            </div>
          )}
          {sel.input && (
            <div>
              <Label className="mb-1">input</Label>
              <pre className="bg-surface border border-line rounded p-2 font-mono text-[0.58rem] whitespace-pre-wrap break-all m-0">{sel.input}</pre>
            </div>
          )}
          {sel.output && (
            <div>
              <Label className="mb-1">output</Label>
              <pre className={cx("border rounded p-2 font-mono text-[0.58rem] whitespace-pre-wrap break-all m-0", sel.error ? "bg-danger/5 border-danger/30 text-danger" : "bg-surface border-line")}>{sel.output}</pre>
            </div>
          )}
          {sel.error && (
            <Btn size="sm" variant="primary" onClick={() => toast("Remediation proposed: longer timeout and caching · submitted for review")}>
              Remediate
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

const LOGS = [
  ["12:04:11", "info", "classifier", "ticket #4812 → refund (0.94)"],
  ["12:04:12", "info", "responder", "draft generated · 2410 tok"],
  ["12:04:13", "warn", "escalator", "approval required: refund $240"],
  ["11:58:40", "error", "search_docs", "TimeoutError after 3 retries"],
  ["11:58:10", "info", "worker", "scaled 2 → 3 (queue depth 41)"],
  ["11:51:02", "info", "deploy", "v23 promoted to 100%"],
];

export default function ObserveTab() {
  const p = useProject();
  const nav = useNavigate();
  const { mode } = useStore();
  const [view, setView] = useState<"traces" | "metrics" | "logs" | "cost">("traces");
  const [open, setOpen] = useState<Trace | null>(null);
  const [q, setQ] = useState("");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budget, setBudget] = useState(200);

  if (mode === "simple") {
    return (
      <div className="flex-1 max-w-[900px] w-full mx-auto px-4 md:px-8 py-8">
        <h2 className="font-sans text-[1.5rem] font-semibold tracking-[-0.02em] m-0">Performance summary</h2>
        <p className="text-[0.82rem] text-muted mt-1 mb-6">Last 7 days · {p.name}</p>
        <HairGrid className="grid-cols-2 md:grid-cols-4 mb-6">
          {[
            ["Tickets handled", "1,284"],
            ["Resolved without escalation", "61%"],
            ["Average response time", "42s"],
            ["Operating cost", "$14.20"],
          ].map(([k, v]) => (
            <div key={k} className="bg-bg p-4">
              <div className="text-[0.72rem] text-dim">{k}</div>
              <div className="font-mono text-[1.4rem] font-bold tracking-[-0.03em]">{v}</div>
            </div>
          ))}
        </HairGrid>
        <Label className="mb-2">items requiring attention</Label>
        <div className="border border-line rounded-lg overflow-hidden">
          {[
            ["Knowledge base search timed out 4 times today", "Architect can resolve this automatically", "Resolve"],
            ["3 refunds awaiting your approval", "Oldest request: 6 minutes", "Review"],
            ["Customer satisfaction 4.6 / 5", "Up from 4.3 last week", null],
          ].map(([t, d, a]) => (
            <div key={t} className="flex items-center gap-4 px-4 py-3 border-b border-line last:border-0">
              <div className="flex-1">
                <div className="text-[0.88rem] font-semibold">{t}</div>
                <div className="text-[0.75rem] text-dim">{d}</div>
              </div>
              {a && (
                <Btn size="sm" onClick={() => nav(a === "Review" ? "/app/approvals" : `/app/p/${p.id}`)}>
                  {a}
                </Btn>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const traces = TRACES.filter((t) => t.input.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex-1 px-4 md:px-8 py-6 overflow-auto">
      {open ? (
        <TraceDetail t={open} onBack={() => setOpen(null)} />
      ) : (
        <>
          <div className="flex items-center justify-between mb-5 gap-4">
            <Pills items={["traces", "metrics", "logs", "cost"] as const} value={view} onChange={setView} />
            <span className="text-[0.75rem] text-dim">Production · last 24 hours · exported to Datadog</span>
          </div>

          {view === "traces" && (
            <>
              <div className="relative mb-3 max-w-[360px]">
                <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter traces" className="pl-8" />
              </div>
              <div className="border border-line rounded-lg overflow-hidden">
                <div className="grid grid-cols-[5rem_1fr_5rem_5rem_4rem_5rem] gap-3 px-4 py-2 border-b border-line bg-surface font-mono text-[0.52rem] uppercase tracking-[0.08em] text-dim">
                  <span>id</span>
                  <span>input</span>
                  <span>status</span>
                  <span>duration</span>
                  <span>cost</span>
                  <span>when</span>
                </div>
                {traces.map((t) => (
                  <button key={t.id} onClick={() => setOpen(t)} className="w-full text-left grid grid-cols-[5rem_1fr_5rem_5rem_4rem_5rem] gap-3 items-center px-4 py-2.5 border-b border-line last:border-0 hover:bg-surface cursor-pointer">
                    <span className="text-[0.75rem] text-dim">{t.id}</span>
                    <span className="font-mono text-[0.65rem] truncate">{t.input}</span>
                    <Status status={t.status} />
                    <span className={cx("font-mono text-[0.6rem]", t.dur > 10 ? "text-danger" : "text-muted")}>{t.dur}s</span>
                    <span className="text-[0.78rem] text-muted">${t.cost.toFixed(3)}</span>
                    <span className="text-[0.75rem] text-dim">{t.when}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {view === "metrics" && (
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { t: "runs per hour", d: [12, 18, 22, 30, 28, 41, 38, 52, 47, 44, 39, 50], u: "" },
                { t: "response time p95 (s)", d: [2.1, 2.0, 2.3, 1.9, 2.4, 2.2, 1.8, 1.9, 2.0, 1.7, 1.8, 1.8], u: "s" },
                { t: "error rate (%)", d: [0.2, 0.4, 0.3, 0.2, 1.8, 0.6, 0.3, 0.2, 0.3, 0.2, 0.3, 0.3], u: "%" },
                { t: "tool health · search_docs", d: [99, 99, 98, 99, 71, 92, 99, 99, 98, 99, 99, 99], u: "%" },
              ].map((m) => {
                const max = Math.max(...m.d);
                return (
                  <div key={m.t} className="border border-line rounded-lg p-4">
                    <div className="flex justify-between">
                      <Label>{m.t}</Label>
                      <span className="text-[0.88rem] font-semibold">
                        {m.d[m.d.length - 1]}
                        {m.u}
                      </span>
                    </div>
                    <div className="flex items-end gap-1 h-24 mt-3">
                      {m.d.map((v, i) => (
                        <div key={i} className="flex-1 rounded-t-[2px]" style={{ height: `${(v / max) * 100}%`, background: i === m.d.length - 1 ? "var(--neon)" : "var(--surface-2)" }} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {view === "logs" && (
            <div className="bg-ink border border-ink-line rounded-lg p-4 font-mono text-[0.62rem] leading-[1.9]">
              {LOGS.map(([t, lvl, src, msg], i) => (
                <div key={i} className="text-[#999]">
                  <span className="text-[#555]">{t}</span> <span className={lvl === "error" ? "text-[#f87171]" : lvl === "warn" ? "text-[#fbbf24]" : "text-neon"}>{lvl.padEnd(5)}</span>{" "}
                  <span className="text-[#ccc]">[{src}]</span> {msg}
                </div>
              ))}
            </div>
          )}

          {view === "cost" && (
            <div className="grid lg:grid-cols-[1fr_320px] gap-4">
              <div className="border border-line rounded-lg p-5">
                <Label className="mb-3">spend by model · month to date</Label>
                {[
                  ["sonnet-4.5 · responder", 9.8],
                  ["haiku-4.5 · classifier", 2.1],
                  ["embeddings · search_docs", 1.4],
                  ["gpt-4.1 · fallback", 0.9],
                ].map(([k, v]) => (
                  <div key={k as string} className="mb-3">
                    <div className="flex justify-between font-mono text-[0.62rem] mb-1">
                      <span>{k}</span>
                      <span>${(v as number).toFixed(2)}</span>
                    </div>
                    <Bar value={((v as number) / 10) * 100} />
                  </div>
                ))}
                <div className="text-[0.75rem] text-dim mt-4">Recommendation: caching repeated knowledge-base searches would save ~$1.10/month</div>
              </div>
              <div className="border border-line rounded-lg p-5">
                <Label>budget</Label>
                <div className="font-mono text-[2rem] font-bold tracking-[-0.04em] mt-1">
                  $14.20 <span className="text-[0.7rem] text-dim font-normal">/ ${budget}</span>
                </div>
                <Bar value={(14.2 / budget) * 100} className="mt-2" />
                <div className="text-[0.75rem] text-dim mt-2">Alert at 80% · agents paused at 100%</div>
                <Btn size="sm" className="mt-4" onClick={() => setBudgetOpen(true)}>
                  Edit budget
                </Btn>
              </div>
            </div>
          )}
        </>
      )}
      <Modal open={budgetOpen} onClose={() => setBudgetOpen(false)} title="Monthly budget">
        <Label className="mb-1.5">cap ($)</Label>
        <Input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} />
        <div className="text-[0.75rem] text-dim mt-2">When reached: pause agents and notify #support-leads</div>
        <div className="flex justify-end mt-4">
          <Btn variant="primary" onClick={() => setBudgetOpen(false)}>
            Save
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
