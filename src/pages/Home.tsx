import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bot, Download, Lightbulb, ShieldAlert, Store } from "lucide-react";
import { PromptBox } from "../components/PromptBox";
import { ProjectList } from "../components/ProjectList";
import { Btn, HairGrid, Label } from "../components/ui";
import { ACTIVITY, SUGGESTIONS } from "../lib/data";
import { useStore } from "../lib/store";

const CONNECT = ["Gmail", "Slack", "Teams", "Notion", "GitHub", "HubSpot", "Salesforce", "Zendesk"];

export default function Home() {
  const nav = useNavigate();
  const { projects, user, mode } = useStore();
  const mine = projects.filter((p) => !p.sharedBy);

  useEffect(() => {
    const pending = sessionStorage.getItem("arch.pendingPrompt");
    if (pending) {
      sessionStorage.removeItem("arch.pendingPrompt");
      nav("/app/new", { state: { prompt: pending } });
    }
  }, [nav]);

  const starts = [
    { icon: <Lightbulb size={14} />, t: "What should I build?", d: "Recommendations for your team", to: "/app/discover" },
    { icon: <Download size={14} />, t: "Import a project", d: "GitHub, GitLab, archive or Git URL", to: "/app/import" },
    { icon: <Bot size={14} />, t: "Agent Studio", d: "Design an agent in any framework", to: "/app/agents/new" },
    { icon: <Store size={14} />, t: "Marketplace", d: "Production-ready solutions", to: "/app/marketplace" },
  ];

  return (
    <>
      <section className="px-4 md:px-8 pt-14 pb-10 border-b border-line">
        <div className="max-w-[860px] mx-auto text-center">
          <div className="text-[0.85rem] text-dim mb-3">
            Good evening, <span className="text-fg capitalize">{user?.name}</span>
          </div>
          <h1 className="font-sans text-[2.6rem] md:text-[3.2rem] font-semibold tracking-[-0.03em] leading-none m-0">Architect</h1>
          <p className="text-[1.02rem] text-muted mt-3 mb-8">The agent builder platform for business executives and engineering teams.</p>
          <div className="text-left">
            <PromptBox suggestions={SUGGESTIONS.slice(0, 3)} onSubmit={(v) => nav("/app/new", { state: v })} />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-5 text-[0.8rem] text-dim">
            <span>Connect with</span>
            {CONNECT.map((c) => (
              <button key={c} onClick={() => nav("/app/integrations")} className="inline-flex items-center gap-1.5 text-muted hover:text-fg cursor-pointer">
                <span className="w-5 h-5 rounded-[5px] border border-line-2 bg-surface flex items-center justify-center font-mono text-[0.55rem] font-bold">{c[0]}</span>
                {c}
              </button>
            ))}
            <button onClick={() => nav("/app/integrations")} className="text-muted hover:text-fg underline underline-offset-2 cursor-pointer">
              and many more
            </button>
          </div>
        </div>

        <HairGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 max-w-[1100px] mx-auto mt-10">
          {starts.map((s) => (
            <button key={s.t} onClick={() => nav(s.to)} className="bg-bg hover:bg-surface p-4 text-left flex items-center gap-3 cursor-pointer transition-colors group">
              <span className="text-dim group-hover:text-fg">{s.icon}</span>
              <span className="flex-1">
                <span className="block text-[0.88rem] font-semibold">{s.t}</span>
                <span className="block text-[0.75rem] text-dim">{s.d}</span>
              </span>
              <ArrowRight size={12} className="text-dim group-hover:text-fg" />
            </button>
          ))}
        </HairGrid>
      </section>

      <main className="flex-1 px-4 md:px-8 py-8 grid lg:grid-cols-[1fr_320px] gap-8">
        <ProjectList projects={mine} limit={5} />

        <aside className="space-y-6">
          <div className="border border-warn/40 bg-warn/5 rounded-lg p-4">
            <div className="flex items-center gap-2 text-[0.88rem] font-semibold">
              <ShieldAlert size={13} className="text-warn" /> 2 agent actions awaiting your approval
            </div>
            <div className="text-[0.78rem] text-muted mt-1.5">Refund of $240 on ticket #4812 · Bulk email to 1,204 customers</div>
            <Btn size="sm" className="mt-3" onClick={() => nav("/app/approvals")}>
              Review
            </Btn>
          </div>

          <div>
            <Label className="mb-2">recent activity</Label>
            {ACTIVITY.map((a, i) => (
              <div key={i} className="py-2.5 border-b border-line last:border-0">
                <div className="text-[0.8rem] text-muted leading-relaxed">
                  <span className="text-fg">{a.who}</span> {a.what}
                </div>
                <div className="font-mono text-[0.55rem] text-dim mt-0.5">{a.when}</div>
              </div>
            ))}
          </div>

          {mode === "dev" && (
            <div className="bg-ink border border-ink-line rounded-lg p-4">
              <Label className="!text-[#555] mb-2">cli</Label>
              <pre className="font-mono text-[0.62rem] text-[#bbb] m-0 leading-relaxed whitespace-pre-wrap">
                <span className="text-[#555]">$</span> npm i -g @architect/cli{"\n"}
                <span className="text-[#555]">$</span> architect login{"\n"}
                <span className="text-[#555]">$</span> architect pull support-triage-agent
              </pre>
            </div>
          )}
        </aside>
      </main>
    </>
  );
}
