import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Plus } from "lucide-react";
import { AgentCanvas, type GNode, type NodeKind } from "../../components/AgentCanvas";
import { Badge, Btn, Field, Input, Label, Pills, Spinner, Toggle, cx } from "../../components/ui";
import { FILES, highlight } from "../../lib/files";
import { graphFor, runPathFor, scenarioFor, sourceFor } from "../../lib/scenarios";
import { useStore } from "../../lib/store";
import { useProject } from "./Workspace";

const MODELS = ["haiku-4.5", "sonnet-5", "opus-5.5"];
const MODEL_LABEL: Record<string, string> = {
  "haiku-4.5": "Claude Haiku 4.5 (fast, low cost)",
  "sonnet-5": "Claude Sonnet 5 (balanced)",
  "opus-5.5": "Claude Opus 5.5 (most capable)",
};

const ADDABLE: { kind: NodeKind; label: string; sub: string }[] = [
  { kind: "agent", label: "Agent", sub: "Describe its responsibility" },
  { kind: "tool", label: "API connector", sub: "Call an internal or external API" },
  { kind: "tool", label: "MCP: Linear", sub: "Create and update issues" },
  { kind: "human", label: "Approval step", sub: "Require human sign-off" },
  { kind: "memory", label: "Knowledge memory", sub: "Retain facts across sessions" },
];

export default function AgentsTab() {
  const p = useProject();
  const { mode, toast } = useStore();
  const nav = useNavigate();
  const scenario = scenarioFor(p);
  const a = scenario.agents;
  const graph = graphFor(scenario, p);
  const runPath = runPathFor(scenario);
  const [nodes, setNodes] = useState<GNode[]>(graph.nodes);
  const [sel, setSel] = useState<string | null>(a.names[1]);
  const [view, setView] = useState<"canvas" | "code">("canvas");
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [input, setInput] = useState(a.test.input);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (step >= runPath.length) {
      setRunning(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), 550);
    return () => clearTimeout(t);
  }, [running, step, runPath.length]);

  const node = nodes.find((n) => n.id === sel);
  const active = runPath.slice(0, step);
  const tools = [a.tool[0], sourceFor(scenario, p.answers?.source).tool, ...a.extraTools];
  const versions = p.isNew
    ? [["v1", "Initial version", "live"]]
    : [
        ["v12", "Clearer, more concise tone", "live"],
        ["v11", "Restricted to approved content", ""],
        ["v10", "Initial version", ""],
      ];

  const addNode = (a: (typeof ADDABLE)[number]) => {
    const id = `${a.label.replace(/\W+/g, "_")}_${nodes.length}`;
    setNodes((x) => [...x, { id, kind: a.kind, label: a.label, sub: a.sub, x: 830, y: 290 }]);
    setSel(id);
    setAdding(false);
    toast(`${a.label} added · connect it on the canvas or describe the connection in the workspace`);
  };

  return (
    <div className="flex-1 grid lg:grid-cols-[1fr_340px] min-h-0">
      <section className="px-4 md:px-6 py-5 overflow-auto">
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-sans text-[1.2rem] font-semibold tracking-[-0.02em] m-0">Agents</h2>
            <Badge>{p.framework ?? "LangGraph"}</Badge>
            {mode === "dev" && <Pills items={["canvas", "code"] as const} value={view} onChange={setView} />}
          </div>
          <div className="flex gap-2 relative">
            <Btn size="sm" onClick={() => setAdding((x) => !x)}>
              <Plus size={10} /> Add component
            </Btn>
            {adding && (
              <div className="absolute right-0 top-8 w-[220px] bg-bg border border-line-2 rounded-lg shadow-xl z-20 py-1 rise">
                {ADDABLE.map((a) => (
                  <button key={a.label} onClick={() => addNode(a)} className="w-full text-left px-3 py-2 hover:bg-surface cursor-pointer">
                    <div className="text-[0.82rem]">{a.label}</div>
                    <div className="text-[0.7rem] text-dim">{a.sub}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {view === "canvas" ? (
          <AgentCanvas
            nodes={nodes}
            edges={graph.edges}
            selected={sel}
            onSelect={setSel}
            onMove={(id, x, y) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, x, y } : n)))}
            active={active}
            height={380}
          />
        ) : (
          <div className="bg-ink border border-ink-line rounded-lg py-2 h-[380px] overflow-auto font-mono text-[0.66rem] leading-[1.7] text-[#ddd]">
            {FILES["agents/graph.py"].split("\n").map((l, i) => (
              <div key={i} className="flex">
                <span className="w-10 text-right pr-3 text-[#3a3a3a]">{i + 1}</span>
                <span className="whitespace-pre" dangerouslySetInnerHTML={{ __html: highlight(l) || " " }} />
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 border border-line rounded-lg">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-line">
            <Label className="flex-1">test in sandbox · integrations simulated, no customer impact</Label>
          </div>
          <div className="p-3 flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} />
            <Btn variant="primary" onClick={() => (setStep(0), setRunning(true))} disabled={running}>
              {running ? <Spinner /> : <Play size={11} />} Run test
            </Btn>
          </div>
          {step > 0 && (
            <div className="px-3 pb-3 font-mono text-[0.6rem] space-y-1">
              {a.test.log.slice(0, step).map((l, i) => (
                <div key={i} className={cx("rise", i === step - 1 && running ? "text-fg" : "text-muted")}>
                  <span className="text-dim mr-2">{String(i * 180).padStart(4, " ")}ms</span>
                  {l}
                </div>
              ))}
              {!running && step >= runPath.length && <div className="text-live pt-1">✓ Test complete · {runPath.length} steps · $0.013 · trace tr_sbx_01</div>}
            </div>
          )}
        </div>
      </section>

      <aside className="border-l border-line px-5 py-5 overflow-auto space-y-4 bg-surface/40">
        {node ? (
          <>
            <div>
              <Label>{node.kind}</Label>
              <div className="text-[1.05rem] font-semibold mt-0.5">{node.label}</div>
              <div className="text-[0.75rem] text-dim">{node.sub}</div>
            </div>
            {node.kind === "agent" && (
              <>
                <Field label={mode === "simple" ? "responsibilities" : `system prompt · ${versions[0][0]}`}>
                  <textarea
                    key={node.id}
                    defaultValue={node.id === a.names[1] ? a.prompt : `You are the ${node.label.replace(/_/g, " ")} for Acme. Do one job well and report your confidence.`}
                    rows={5}
                    className="w-full bg-bg border border-line-2 rounded-[7px] px-3 py-2 text-[0.82rem] leading-relaxed text-fg outline-none focus:border-fg resize-none"
                  />
                </Field>
                <Field label="model">
                  <select
                    key={node.id}
                    className="w-full bg-bg border border-line-2 rounded-[7px] px-2 py-2 font-mono text-[0.65rem] text-fg"
                    defaultValue={MODELS.find((m) => node.sub.startsWith(m)) ?? "auto"}
                  >
                    {MODELS.map((m) => (
                      <option key={m} value={m}>
                        {MODEL_LABEL[m]}
                      </option>
                    ))}
                    <option value="byo">Another provider (OpenAI, Google, open-weight)</option>
                    <option value="auto">Automatic routing by complexity</option>
                  </select>
                </Field>
                <div className="border border-line rounded-lg p-3 space-y-1.5">
                  <Label>confidence & permissions</Label>
                  <div className="text-[0.78rem] text-muted">Confidence: combined methods · automatic at 90%</div>
                  <div className="flex gap-3">
                    <button onClick={() => nav(`/app/p/${p.id}/readiness?view=confidence`)} className="text-[0.75rem] text-neon-ink hover:underline cursor-pointer">
                      Configure confidence →
                    </button>
                    <button onClick={() => nav(`/app/p/${p.id}/readiness?view=permissions`)} className="text-[0.75rem] text-neon-ink hover:underline cursor-pointer">
                      Edit permissions →
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5">tools</Label>
                  {tools.map((t, i) => (
                    <div key={t} className="flex items-center justify-between py-1.5">
                      <span className="font-mono text-[0.62rem]">{t}</span>
                      <Toggle on={i < 2} onChange={() => toast(`${t} access updated · recorded in audit log`)} />
                    </div>
                  ))}
                </div>
                {mode === "dev" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="temperature">
                      <Input defaultValue="0.3" />
                    </Field>
                    <Field label="max steps">
                      <Input defaultValue="6" />
                    </Field>
                  </div>
                )}
                <div>
                  <Label className="mb-1.5">versions</Label>
                  {versions.map(([v, d, s]) => (
                    <div key={v} className="flex items-center justify-between py-1.5 border-b border-line last:border-0">
                      <span className="font-mono text-[0.62rem]">
                        <b>{v}</b> <span className="text-dim">{d}</span>
                      </span>
                      {s ? <Badge tone="neon">live</Badge> : <button onClick={() => toast(`${v} restored as a new draft version`)} className="text-[0.7rem] text-dim hover:text-fg cursor-pointer">Restore</button>}
                    </div>
                  ))}
                </div>
              </>
            )}
            {node.kind === "human" && (
              <>
                <Field label="approvers">
                  <Input defaultValue={a.human.split(" · ")[0]} />
                </Field>
                <Field label="timeout">
                  <select className="w-full bg-bg border border-line-2 rounded-[7px] px-2 py-2 font-mono text-[0.65rem] text-fg">
                    <option>4 hours, then escalate to on-call manager</option>
                    <option>24 hours, then automatically decline</option>
                  </select>
                </Field>
              </>
            )}
            {(node.kind === "tool" || node.kind === "memory" || node.kind === "trigger") && (
              <div className="space-y-3">
                <Field label="timeout">
                  <Input defaultValue="10s" />
                </Field>
                <div className="flex items-center justify-between">
                  <span className="text-[0.8rem]">Requires approval</span>
                  <Toggle on={node.sub.includes("approval")} onChange={() => toast("Policy updated")} />
                </div>
                <div className="text-[0.75rem] text-dim">Availability 99.2% · p95 response 180ms</div>
              </div>
            )}
            <Btn variant="primary" className="w-full" onClick={() => toast(`${node.label} saved · restore point created`)}>
              Save changes
            </Btn>
          </>
        ) : (
          <div className="font-mono text-[0.62rem] text-dim">Select a component to configure it</div>
        )}
      </aside>
    </div>
  );
}
