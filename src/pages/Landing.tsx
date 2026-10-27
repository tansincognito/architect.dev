import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Logo } from "../components/Shell";
import { PromptBox } from "../components/PromptBox";
import { Btn, HairGrid, Label } from "../components/ui";
import { SUGGESTIONS } from "../lib/data";
import { useStore } from "../lib/store";

const FLOW = [
  ["01", "Describe", "State the business outcome in plain language. No specification document required."],
  ["02", "Review the plan", "Approve scope, agents, data access and estimated cost before any work begins."],
  ["03", "Build", "Architect assembles the application and shows a live preview as it progresses."],
  ["04", "Refine", "Request changes in conversation, point at the screen, or hand over to engineering."],
  ["05", "Govern", "A 12-point production checklist covering security, cost, oversight and compliance."],
  ["06", "Deploy", "Controlled rollouts, approval gates, full audit history and one-click rollback."],
];

export default function Landing() {
  const nav = useNavigate();
  const { user } = useStore();
  const start = (prompt?: string) => {
    if (prompt) sessionStorage.setItem("arch.pendingPrompt", prompt);
    nav(user ? "/app" : "/signin?mode=signup");
  };

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="h-[50px] border-b border-line px-4 md:px-8 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2">
          <Btn variant="ghost" size="sm" onClick={() => nav("/signin")}>
            Sign in
          </Btn>
          <Btn variant="secondary" size="sm" onClick={() => nav("/signin")}>
            Contact sales
          </Btn>
          <Btn variant="primary" size="sm" onClick={() => start()}>
            Get started
          </Btn>
        </div>
      </header>

      <section className="max-w-[1100px] mx-auto px-4 md:px-8 pt-16 md:pt-24 pb-12">
        <Label className="mb-4">architect 2.0 · the agent builder platform</Label>
        <h1 className="font-sans text-[2.1rem] md:text-[2.8rem] font-semibold tracking-[-0.03em] leading-[1.08] m-0 max-w-[1000px]">
          Build and deploy AI agents for your business.
          <br />
          <span className="text-dim">With the oversight your organisation expects.</span>
        </h1>
        <p className="text-muted text-[1.05rem] mt-5 max-w-[620px] leading-relaxed">
          Business teams describe the outcome; engineering teams keep full control of the code. Architect plans, builds and operates agentic
          applications on LangGraph, CrewAI, the OpenAI and Claude Agent SDKs, or your existing codebase — with governance built in.
        </p>

        <div className="mt-10">
          <PromptBox suggestions={SUGGESTIONS.slice(0, 3)} onSubmit={({ prompt }) => start(prompt)} />
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Btn variant="secondary" size="sm" onClick={() => start()}>
            Import an existing repository <ArrowRight size={11} />
          </Btn>
          <Btn variant="ghost" size="sm" onClick={() => start()}>
            Browse solution templates
          </Btn>
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-4 md:px-8 pb-16">
        <Label className="mb-3">how it works</Label>
        <HairGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {FLOW.map(([id, t, d]) => (
            <div key={id} className="bg-bg p-5">
              <div className="font-mono text-[0.55rem] text-dim tracking-[0.1em]">{id}</div>
              <div className="text-[1.05rem] font-semibold mt-2">{t}</div>
              <div className="text-[0.82rem] text-muted mt-1 leading-relaxed">{d}</div>
            </div>
          ))}
        </HairGrid>
      </section>

      <section className="max-w-[1100px] mx-auto px-4 md:px-8 pb-24 grid md:grid-cols-2 gap-4">
        <div className="border border-line rounded-lg p-6">
          <Label>business view</Label>
          <div className="text-[1.2rem] font-semibold mt-2">For business and operations leaders</div>
          <ul className="mt-3 space-y-2 text-[0.88rem] text-muted list-none p-0">
            <li>→ Conversation and live preview; no code exposure</li>
            <li>→ Approve plans, costs and agent actions</li>
            <li>→ A single readiness score in place of technical detail</li>
            <li>→ Plain-language explanations of any component</li>
          </ul>
        </div>
        <div className="bg-ink text-[#eee] border border-ink-line rounded-lg p-6">
          <Label className="!text-[#555]">developer view</Label>
          <div className="text-[1.2rem] font-semibold mt-2">For engineering teams</div>
          <ul className="mt-3 space-y-2 text-[0.88rem] text-[#999] list-none p-0">
            <li>→ Code editor, terminal, diffs and branches</li>
            <li>→ Choice of agent framework and model routing</li>
            <li>→ Traces, evaluations, budgets and rollbacks</li>
            <li>
              → <span className="font-mono text-neon">architect pull</span> into your own IDE
            </li>
          </ul>
        </div>
      </section>

      <footer className="border-t border-line px-4 md:px-8 py-6 text-[0.75rem] text-dim flex justify-between">
        <span>Architect 2.0 · Prototype</span>
        <span>All workflows are simulated</span>
      </footer>
    </div>
  );
}
