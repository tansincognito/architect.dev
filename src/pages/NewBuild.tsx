import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bot, Check, Database, FileCode2, Globe, Info, LayoutTemplate, Plug, Wrench, X } from "lucide-react";
import { AppPreview } from "../components/AppPreview";
import { Badge, Bar, Btn, Label, Spinner, cx } from "../components/ui";
import { BUILD_STEPS, CLARIFY_QUESTIONS, PLAN, type PlanItem } from "../lib/data";
import { useStore } from "../lib/store";
import type { PromptSubmit } from "../components/PromptBox";

type Stage = "thinking" | "clarify" | "plan" | "build" | "done";

const KIND_ICON: Record<PlanItem["kind"], React.ReactNode> = {
  page: <LayoutTemplate size={11} />,
  agent: <Bot size={11} />,
  tool: <Wrench size={11} />,
  data: <Database size={11} />,
  integration: <Plug size={11} />,
};

function slug(s: string) {
  const words = s.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter((w) => w.length > 2 && !["that", "the", "and", "with", "for"].includes(w));
  return words.slice(0, 3).join("-") || "new-project";
}

export default function NewBuild() {
  const nav = useNavigate();
  const loc = useLocation();
  const input = (loc.state ?? {}) as Partial<PromptSubmit>;
  const prompt = input.prompt ?? "customer support agent that triages zendesk tickets";
  const { mode, spend, addProject, toast } = useStore();

  const [stage, setStage] = useState<Stage>("thinking");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [plan, setPlan] = useState<PlanItem[]>(PLAN);
  const [refine, setRefine] = useState("");
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);

  const id = useMemo(() => slug(prompt), [prompt]);
  const credits = 12 + plan.length * 3;
  const framework = input.framework && input.framework !== "auto" ? input.framework : "LangGraph";

  useEffect(() => {
    if (stage !== "thinking") return;
    const t = setTimeout(() => setStage("clarify"), 1100);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== "build") return;
    if (step >= BUILD_STEPS.length) {
      const t = setTimeout(() => setStage("done"), 500);
      return () => clearTimeout(t);
    }
    const s = BUILD_STEPS[step];
    const timers = s.files.map((f, i) => setTimeout(() => setLog((l) => [...l, `+ ${f}`]), 180 * (i + 1)));
    const t = setTimeout(() => setStep((x) => x + 1), 260 + s.files.length * 200);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(t);
    };
  }, [stage, step]);

  const approve = () => {
    spend(credits);
    setStage("build");
  };

  const open = () => {
    addProject({
      id,
      name: id,
      desc: prompt,
      stack: `Next.js · ${framework}`,
      kind: "agent",
      status: "draft",
      updated: "just now",
      prompts: 1,
      framework,
      readiness: 46,
    });
    toast("Project created · restore point #1 saved");
    nav(`/app/p/${id}`, { state: { fresh: true } });
  };

  const previewStage = stage === "done" ? 4 : Math.min(4, Math.floor((step / BUILD_STEPS.length) * 5));
  const steps = ["requirements", "plan", "build"];
  const currentIdx = stage === "thinking" || stage === "clarify" ? 0 : stage === "plan" ? 1 : 2;

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-line px-4 md:px-8 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Label>new project</Label>
          <div className="text-[0.92rem] truncate mt-0.5">
            <span className="text-neon-ink font-bold">&gt;</span> {prompt}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <span
                className={cx(
                  "font-mono text-[0.58rem] uppercase tracking-[0.06em] px-2 py-1 rounded-[4px] inline-flex items-center gap-1",
                  i === currentIdx ? "bg-surface-2 text-fg border border-line-2" : i < currentIdx ? "text-neon-ink" : "text-dim",
                )}
              >
                {i < currentIdx && <Check size={9} />}
                {s}
              </span>
              {i < steps.length - 1 && <span className="text-dim text-[0.6rem]">—</span>}
            </div>
          ))}
        </div>
      </div>

      {stage === "thinking" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[0.9rem] text-muted flex items-center gap-2.5">
            <Spinner /> Analysing your request
            <span className="caret" />
          </div>
        </div>
      )}

      {stage === "clarify" && (
        <div className="flex-1 max-w-[720px] w-full mx-auto px-4 md:px-8 py-10 rise">
          <h1 className="font-sans text-[1.5rem] font-semibold tracking-[-0.02em] m-0">A few clarifying questions</h1>
          <p className="text-[0.82rem] text-muted mt-1.5 mb-8">Your answers shape the plan. If you skip, Architect will apply recommended defaults.</p>
          <div className="space-y-7">
            {CLARIFY_QUESTIONS.map((q, qi) => (
              <div key={q.id}>
                <div className="text-[0.88rem] font-semibold mb-2.5">
                  <span className="text-dim mr-2">{String(qi + 1).padStart(2, "0")}</span>
                  {q.q}
                </div>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((o) => (
                    <button
                      key={o}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}
                      className={cx(
                        "text-[0.82rem] px-3 py-1.5 rounded-full border cursor-pointer transition-all",
                        answers[q.id] === o ? "bg-fg text-bg border-fg" : "border-line-2 text-muted hover:text-fg",
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-10">
            <Btn variant="ghost" onClick={() => setStage("plan")}>
              Skip and use defaults
            </Btn>
            <Btn variant="primary" onClick={() => setStage("plan")}>
              Generate plan →
            </Btn>
          </div>
        </div>
      )}

      {stage === "plan" && (
        <div className="flex-1 grid lg:grid-cols-[1fr_340px] rise">
          <div className="px-4 md:px-8 py-8 border-r border-line">
            <div className="flex items-end justify-between mb-5">
              <div>
                <h1 className="font-sans text-[1.5rem] font-semibold tracking-[-0.02em] m-0">Proposed plan</h1>
                <p className="text-[0.82rem] text-muted mt-1.5">Remove items you do not need or request changes below. No work has started yet.</p>
              </div>
            </div>
            {(["page", "agent", "tool", "data", "integration"] as const).map((kind) => {
              const items = plan.filter((p) => p.kind === kind);
              if (!items.length) return null;
              return (
                <div key={kind} className="mb-5">
                  <Label className="mb-1.5">{{ page: "screens", agent: "agents", tool: "tools", data: "data", integration: "integrations" }[kind]}</Label>
                  <div className="border border-line rounded-lg overflow-hidden">
                    {items.map((p) => (
                      <div key={p.name} className="group flex items-center gap-3 px-3.5 py-2.5 border-b border-line last:border-0 hover:bg-surface">
                        <span className="text-dim">{KIND_ICON[p.kind]}</span>
                        <span className="font-mono text-[0.72rem] font-medium w-[180px] shrink-0 truncate">{p.name}</span>
                        <span className="text-[0.75rem] text-dim flex-1 truncate">{p.detail}</span>
                        <button
                          onClick={() => setPlan((x) => x.filter((y) => y !== p))}
                          className="opacity-0 group-hover:opacity-100 text-dim hover:text-danger cursor-pointer"
                          aria-label="remove"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!refine.trim()) return;
                setPlan((x) => [...x, { kind: "page", name: "/" + slug(refine).split("-")[0], detail: refine }]);
                setRefine("");
                toast("Plan updated");
              }}
              className="flex gap-2 mt-6"
            >
              <input
                value={refine}
                onChange={(e) => setRefine(e.target.value)}
                placeholder="Request a change, e.g. add a weekly summary report for management"
                className="flex-1 bg-surface border border-line rounded-[7px] px-3 py-2 text-[0.85rem] outline-none focus:border-line-2"
              />
              <Btn type="submit">Update plan</Btn>
            </form>
          </div>

          <aside className="px-4 md:px-6 py-8 space-y-5 bg-surface/50">
            <div>
              <Label className="mb-2">estimate</Label>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[2.4rem] font-bold tracking-[-0.05em] text-neon-ink leading-none">{credits}</span>
                <span className="text-[0.8rem] text-dim">credits · approx. 4 minutes</span>
              </div>
              <div className="text-[0.75rem] text-dim mt-1">Estimated operating cost: ~$18/month at 2,000 tickets</div>
            </div>
            <div className="border-t border-line pt-4 space-y-2.5">
              {[
                ["Framework", framework, "Suited to multi-step workflows with approval checkpoints"],
                ["Technology", input.stack && input.stack !== "auto" ? input.stack : "Next.js + Python agents", null],
                ["AI models", "Low-cost model for triage; advanced model for replies", "Routed by task complexity"],
                ["Approval policy", "Refunds over $100 require approval", null],
                ["Hosting", "Architect Cloud (US region)", null],
              ].map(([k, v, why]) => (
                <div key={k as string}>
                  <div className="flex justify-between gap-3">
                    <span className="text-[0.75rem] text-dim">{k}</span>
                    <span className="text-[0.8rem] text-right">{v}</span>
                  </div>
                  {why && mode === "dev" && <div className="font-mono text-[0.55rem] text-dim text-right">{why}</div>}
                </div>
              ))}
            </div>
            {mode === "simple" && (
              <div className="flex gap-2 text-[0.78rem] text-muted bg-bg border border-line rounded-md p-2.5">
                <Info size={12} className="shrink-0 mt-px" />
                Agents are AI components that each perform one task. Architect connects them and applies your approval and safety policies.
              </div>
            )}
            {mode === "dev" && (
              <div className="bg-ink border border-ink-line rounded-md p-3 font-mono text-[0.58rem] text-[#999] leading-relaxed">
                <div className="text-[#555] mb-1">tree</div>
                app/ inbox/ ticket/[id]/ analytics/
                <br />
                agents/ classifier.py responder.py escalator.py graph.py
                <br />
                tools/ search_docs.py zendesk.py
                <br />
                db/ schema.ts · tests/ · architect.yaml
              </div>
            )}
            <Btn variant="primary" size="lg" className="w-full" onClick={approve}>
              Approve and build · {credits} credits
            </Btn>
            <Btn variant="ghost" className="w-full" onClick={() => setStage("clarify")}>
              ← Back to questions
            </Btn>
          </aside>
        </div>
      )}

      {(stage === "build" || stage === "done") && (
        <div className="flex-1 grid lg:grid-cols-[380px_1fr] min-h-0">
          <div className="border-r border-line px-4 md:px-6 py-6 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <Label>{stage === "done" ? "complete" : "in progress"}</Label>
              <span className="text-[0.75rem] text-dim">
                {Math.min(step, BUILD_STEPS.length)}/{BUILD_STEPS.length}
              </span>
            </div>
            <Bar value={(step / BUILD_STEPS.length) * 100} className="mb-5" />
            <div className="space-y-2">
              {BUILD_STEPS.map((s, i) => (
                <div key={s.label} className={cx("flex items-center gap-2.5 text-[0.82rem]", i < step ? "text-muted" : i === step ? "text-fg" : "text-dim")}>
                  <span className="w-4 flex justify-center">
                    {i < step ? <Check size={11} className="text-live" /> : i === step && stage === "build" ? <Spinner className="!w-2.5 !h-2.5" /> : <span className="w-1 h-1 rounded-full bg-line-2" />}
                  </span>
                  {s.label}
                </div>
              ))}
            </div>
            {mode === "dev" && (
              <div className="mt-5 bg-ink border border-ink-line rounded-md p-3 font-mono text-[0.58rem] text-[#7a7a7a] h-[160px] overflow-auto flex flex-col-reverse">
                <div>
                  {log.map((l, i) => (
                    <div key={i}>
                      <span className="text-neon">{l.slice(0, 1)}</span>
                      {l.slice(1)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {stage === "done" && (
              <div className="mt-auto pt-6 rise">
                <div className="border border-neon-line bg-neon-soft rounded-lg p-4">
                  <div className="text-[0.88rem] font-semibold flex items-center gap-2">
                    <Check size={13} /> Ready for review
                  </div>
                  <div className="text-[0.78rem] text-muted mt-1">3 screens · 3 agents · 8 automated tests passing · restore point #1</div>
                </div>
                <Btn variant="primary" size="lg" className="w-full mt-3" onClick={open}>
                  Open project →
                </Btn>
              </div>
            )}
          </div>
          <div className="bg-surface p-4 md:p-6 flex flex-col min-h-[480px]">
            <div className="flex items-center gap-2 mb-2">
              <Globe size={11} className="text-dim" />
              <span className="text-[0.75rem] text-dim">preview · {id}.preview.architect.app</span>
              {stage === "build" && <Badge tone="warn">live</Badge>}
            </div>
            <div className="flex-1 rounded-lg border border-line overflow-hidden shadow-sm">
              <AppPreview stage={previewStage} />
            </div>
            {mode === "dev" && stage === "done" && (
              <div className="text-[0.75rem] text-dim mt-2 flex items-center gap-1.5">
                <FileCode2 size={10} /> 21 files · 1,284 lines · branch architect/initial
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
