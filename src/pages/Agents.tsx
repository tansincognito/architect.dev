import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Check, Clock, MessageSquare, MessagesSquare, Plus, Webhook } from "lucide-react";
import { AgentCanvas, type GEdge, type GNode } from "../components/AgentCanvas";
import { Badge, Btn, Field, H1, Input, Label, Pills, Spinner, Status, cx } from "../components/ui";
import { FRAMEWORKS } from "../lib/data";
import { highlight } from "../lib/files";
import { useStore } from "../lib/store";

const AGENTS = [
  { name: "classifier", project: "support-triage-agent", fw: "LangGraph", model: "haiku-4.5", runs: "12.4k", status: "live" },
  { name: "responder", project: "support-triage-agent", fw: "LangGraph", model: "sonnet-5", runs: "9.2k", status: "live" },
  { name: "escalator", project: "support-triage-agent", fw: "LangGraph", model: "policy", runs: "318", status: "live" },
  { name: "researcher", project: "research-assistant", fw: "CrewAI", model: "sonnet-5", runs: "640", status: "building" },
  { name: "analyst", project: "research-assistant", fw: "CrewAI", model: "opus-5.5", runs: "640", status: "building" },
  { name: "extractor", project: "invoice-extractor", fw: "Vercel AI SDK", model: "sonnet-5", runs: "2.1k", status: "failed" },
];

export function AgentsList() {
  const nav = useNavigate();
  return (
    <main className="px-4 md:px-8 py-8">
      <H1
        sub="All agents across your workspace, with framework, model and status."
        right={
          <Btn variant="primary" onClick={() => nav("/app/agents/new")}>
            <Plus size={12} /> New agent
          </Btn>
        }
      >
        Agents
      </H1>
      <div className="border border-line rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_8rem_7rem_5rem_6rem] gap-3 px-4 py-2 bg-surface font-mono text-[0.55rem] uppercase tracking-[0.08em] text-dim border-b border-line">
          <span>agent</span>
          <span>project</span>
          <span>framework</span>
          <span>model</span>
          <span>runs (30d)</span>
          <span>status</span>
        </div>
        {AGENTS.map((a) => (
          <button
            key={a.name}
            onClick={() => nav(`/app/p/${a.project}/agents`)}
            className="w-full text-left grid grid-cols-[1fr_1fr_8rem_7rem_5rem_6rem] gap-3 items-center px-4 py-3 border-b border-line last:border-0 hover:bg-surface cursor-pointer"
          >
            <span className="font-mono text-[0.78rem] font-bold flex items-center gap-2">
              <Bot size={12} className="text-dim" /> {a.name}
            </span>
            <span className="font-mono text-[0.7rem] text-muted">{a.project}</span>
            <Badge>{a.fw}</Badge>
            <span className="font-mono text-[0.68rem] text-muted">{a.model}</span>
            <span className="font-mono text-[0.68rem] text-muted">{a.runs}</span>
            <Status status={a.status} />
          </button>
        ))}
      </div>
    </main>
  );
}

const SNIPPETS: Record<string, string> = {
  langgraph: `from langgraph.graph import StateGraph, END
from architect import model, approvals

graph = StateGraph(State)
graph.add_node("triage", triage_agent)
graph.add_node("act", action_agent)
graph.add_node("approve", approvals.step("#ops-leads"))
graph.add_conditional_edges("triage", needs_approval,
    {True: "approve", False: "act"})
app = graph.compile(checkpointer=PostgresSaver.from_env())`,
  crewai: `from crewai import Agent, Crew, Task

triage = Agent(role="Triage specialist", goal="Classify requests")
actor = Agent(role="Operations agent", goal="Resolve within policy")

crew = Crew(agents=[triage, actor],
            tasks=[Task(description="Handle {request}")],
            process="sequential")`,
  "openai-agents": `from agents import Agent, Runner, handoff

actor = Agent(name="Operations agent", tools=[lookup, update])
triage = Agent(name="Triage", handoffs=[handoff(actor)],
               input_guardrails=[policy_guardrail])

result = await Runner.run(triage, request)`,
  "claude-agent-sdk": `from claude_agent_sdk import ClaudeAgentOptions, query

options = ClaudeAgentOptions(
    system_prompt="You are an operations agent…",
    allowed_tools=["lookup", "update"],
    permission_mode="ask",   # human approval on writes
)
async for msg in query(prompt=request, options=options): ...`,
  "ai-sdk": `import { Agent, tool } from "ai";

export const opsAgent = new Agent({
  model: "anthropic/claude-sonnet-5",
  tools: { lookup, update: tool({ needsApproval: true, ... }) },
  stopWhen: stepCountIs(6),
});`,
};

function snippet(fw: string) {
  return SNIPPETS[fw] ?? `# ${fw} scaffold\n# Architect generates idiomatic code for this framework\n# and wraps it with tracing, approvals and budgets.`;
}

const TRIGGERS = [
  { id: "webhook", label: "Webhook / event", icon: <Webhook size={13} /> },
  { id: "schedule", label: "Schedule", icon: <Clock size={13} /> },
  { id: "chat", label: "Chat interface", icon: <MessageSquare size={13} /> },
  { id: "slack", label: "Slack / Teams", icon: <MessagesSquare size={13} /> },
];

export function AgentBuilder() {
  const nav = useNavigate();
  const { mode, addProject, toast } = useStore();
  const [step, setStep] = useState(0);
  const [fw, setFw] = useState("langgraph");
  const [name, setName] = useState("vendor-onboarding-agent");
  const [purpose, setPurpose] = useState("Review new vendor applications, verify tax and banking details, and route high-risk vendors to procurement for approval.");
  const [trigger, setTrigger] = useState("webhook");
  const [view, setView] = useState<"canvas" | "code">("canvas");
  const [testing, setTesting] = useState(false);
  const [testN, setTestN] = useState(0);
  const [nodes, setNodes] = useState<GNode[]>([]);

  const fwName = FRAMEWORKS.find((f) => f.id === fw)?.name ?? fw;
  const edges: GEdge[] = [
    { from: "t", to: "a1" },
    { from: "a1", to: "tool1", label: "tool" },
    { from: "a1", to: "a2" },
    { from: "a2", to: "h", label: "high risk" },
    { from: "a2", to: "tool2", label: "low risk" },
    { from: "h", to: "tool2", label: "approved" },
  ];

  useEffect(() => {
    if (step === 2 && !nodes.length)
      setNodes([
        { id: "t", kind: "trigger", label: "New application", sub: TRIGGERS.find((t) => t.id === trigger)?.label ?? "", x: 20, y: 120 },
        { id: "a1", kind: "agent", label: "Verifier", sub: "sonnet-5", x: 195, y: 120 },
        { id: "tool1", kind: "tool", label: "Tax ID lookup", sub: "Government registry API", x: 195, y: 260 },
        { id: "a2", kind: "agent", label: "Risk scorer", sub: "haiku-4.5", x: 370, y: 120 },
        { id: "h", kind: "human", label: "Procurement approval", sub: "#procurement · 24h SLA", x: 370, y: 260 },
        { id: "tool2", kind: "tool", label: "SAP · create vendor", sub: "Write · audited", x: 545, y: 120 },
      ]);
  }, [step, nodes.length, trigger]);

  useEffect(() => {
    if (!testing) return;
    if (testN >= 5) {
      setTesting(false);
      return;
    }
    const t = setTimeout(() => setTestN((n) => n + 1), 600);
    return () => clearTimeout(t);
  }, [testing, testN]);

  const steps = ["Framework", "Define", "Design", "Test", "Publish"];
  const testPath = ["t", "a1", "tool1", "a2", "h"].slice(0, testN);
  const testLog = [
    "Received application: Northwind Supplies Ltd",
    "Verifier: tax ID GB-2041-77 confirmed with registry",
    "Verifier: bank account name matches company record",
    "Risk scorer: high risk (new entity, payment terms 90 days)",
    "Routed to #procurement for approval · run paused",
  ];

  const publish = (target: "new" | "existing") => {
    if (target === "new") {
      addProject({ id: name, name, desc: purpose, stack: fwName, kind: "agent", status: "draft", updated: "just now", prompts: 1, framework: fwName, readiness: 52 });
      toast(`${name} created as a new project`);
      nav(`/app/p/${name}/agents`);
    } else {
      toast(`${name} added to support-triage-agent`);
      nav(`/app/p/support-triage-agent/agents`);
    }
  };

  return (
    <main className="flex-1 px-4 md:px-8 py-8 max-w-[1200px] w-full mx-auto">
      <Label className="mb-1">new agent</Label>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] m-0 mb-6">Agent builder</h1>
      <div className="flex gap-1 mb-8">
        {steps.map((s, i) => (
          <button key={s} onClick={() => i < step && setStep(i)} className="flex-1 text-left cursor-pointer">
            <div className={cx("h-[3px] rounded-full", i <= step ? "bg-neon" : "bg-surface-2")} />
            <div className={cx("text-[0.75rem] mt-1.5 flex items-center gap-1", i === step ? "text-fg font-medium" : "text-dim")}>
              {i < step && <Check size={10} className="text-live" />}
              {s}
            </div>
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="rise">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-[1.2rem] font-semibold m-0">Choose an agent framework</h2>
              <p className="text-[0.85rem] text-muted mt-1">
                {mode === "simple" ? "Not sure? Keep the recommendation — your engineering team can change it later." : "Architect generates idiomatic code and adds tracing, approvals and budgets on top."}
              </p>
            </div>
            <Btn size="sm" onClick={() => (setFw("langgraph"), toast("Recommended: LangGraph, for multi-step workflows with approval checkpoints"))}>
              Recommend for me
            </Btn>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {FRAMEWORKS.map((f) => (
              <button key={f.id} onClick={() => setFw(f.id)} className={cx("text-left p-4 rounded-lg border cursor-pointer relative", fw === f.id ? "border-fg bg-surface" : "border-line hover:border-line-2")}>
                {f.id === "langgraph" && <Badge tone="neon" className="absolute top-3 right-3">recommended</Badge>}
                <div className="text-[0.95rem] font-semibold">{f.name}</div>
                <div className="font-mono text-[0.6rem] text-dim mt-0.5">{f.lang}</div>
                <div className="text-[0.8rem] text-muted mt-2">{f.blurb}</div>
                <div className="text-[0.72rem] text-dim mt-1">Best for: {f.bestFor}</div>
              </button>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Btn variant="primary" onClick={() => setStep(1)}>
              Continue with {fwName} →
            </Btn>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="rise max-w-[680px] space-y-4">
          <Field label="agent name">
            <Input value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
          </Field>
          <Field label="responsibilities" hint="Describe what it should do, in plain language. Architect designs the workflow from this.">
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={4}
              className="w-full bg-bg border border-line-2 rounded-[7px] px-3 py-2 text-[0.85rem] leading-relaxed text-fg outline-none focus:border-fg resize-none"
            />
          </Field>
          <div>
            <Label className="mb-2">how is it started?</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TRIGGERS.map((t) => (
                <button key={t.id} onClick={() => setTrigger(t.id)} className={cx("p-3 rounded-lg border text-[0.8rem] flex flex-col items-center gap-1.5 cursor-pointer", trigger === t.id ? "border-fg bg-surface" : "border-line hover:border-line-2")}>
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <Btn variant="ghost" onClick={() => setStep(0)}>
              ← Back
            </Btn>
            <Btn variant="primary" onClick={() => setStep(2)}>
              Design workflow →
            </Btn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rise">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[0.85rem] text-muted">Generated from your description. Drag to rearrange; select a component to configure it.</div>
            <Pills items={["canvas", "code"] as const} value={view} onChange={setView} />
          </div>
          {view === "canvas" ? (
            <AgentCanvas nodes={nodes} edges={edges} onMove={(id, x, y) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, x, y } : n)))} height={380} />
          ) : (
            <div className="bg-ink border border-ink-line rounded-lg py-3 h-[380px] overflow-auto font-mono text-[0.7rem] leading-[1.75] text-[#ddd]">
              <div className="px-4 pb-2 text-[#555] text-[0.6rem]">agents/{name}.{fw === "ai-sdk" || fw === "mastra" ? "ts" : "py"} · {fwName}</div>
              {snippet(fw)
                .split("\n")
                .map((l, i) => (
                  <div key={i} className="flex">
                    <span className="w-10 text-right pr-3 text-[#3a3a3a]">{i + 1}</span>
                    <span className="whitespace-pre" dangerouslySetInnerHTML={{ __html: highlight(l) || " " }} />
                  </div>
                ))}
            </div>
          )}
          <div className="flex justify-between mt-5">
            <Btn variant="ghost" onClick={() => setStep(1)}>
              ← Back
            </Btn>
            <Btn variant="primary" onClick={() => setStep(3)}>
              Test agent →
            </Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rise grid lg:grid-cols-[1fr_380px] gap-4">
          <AgentCanvas nodes={nodes} edges={edges} active={testPath} height={360} />
          <div className="border border-line rounded-lg p-4 flex flex-col">
            <Label className="mb-2">sandbox test · integrations simulated</Label>
            <Input defaultValue="Northwind Supplies Ltd · GB-2041-77 · 90-day terms" />
            <Btn variant="primary" className="mt-2" onClick={() => (setTestN(0), setTesting(true))} disabled={testing}>
              {testing ? <Spinner /> : null} Run test
            </Btn>
            <div className="mt-4 space-y-1.5 flex-1">
              {testLog.slice(0, testN).map((l, i) => (
                <div key={i} className="text-[0.8rem] text-muted rise">
                  <span className="font-mono text-[0.6rem] text-dim mr-2">{i * 600}ms</span>
                  {l}
                </div>
              ))}
            </div>
            {!testing && testN >= 5 && <div className="text-[0.8rem] text-live mt-3">✓ Behaved as expected · paused at approval as designed</div>}
            <div className="flex justify-between mt-4">
              <Btn variant="ghost" onClick={() => setStep(2)}>
                ← Back
              </Btn>
              <Btn variant="primary" disabled={testN < 5} onClick={() => setStep(4)}>
                Continue →
              </Btn>
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="rise max-w-[680px]">
          <h2 className="text-[1.2rem] font-semibold m-0 mb-1">Where should this agent live?</h2>
          <p className="text-[0.85rem] text-muted mb-4">You can deploy it after the governance review.</p>
          <div className="space-y-2">
            <button onClick={() => publish("new")} className="w-full text-left p-4 rounded-lg border border-line hover:border-fg cursor-pointer">
              <div className="text-[0.92rem] font-semibold">Create a new project</div>
              <div className="text-[0.78rem] text-muted">{name} · its own repository, environments and budget</div>
            </button>
            <button onClick={() => publish("existing")} className="w-full text-left p-4 rounded-lg border border-line hover:border-fg cursor-pointer">
              <div className="text-[0.92rem] font-semibold">Add to an existing project</div>
              <div className="text-[0.78rem] text-muted">support-triage-agent · shares data, credentials and deployment</div>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
