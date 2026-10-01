import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUp, BookOpen, Search, X } from "lucide-react";
import { useStore } from "../lib/store";
import { Btn, Field, Input, Label, Pills, cx } from "./ui";

const ANSWERS: [RegExp, string, string?][] = [
  [/deploy|production|release/i, "Open your project and choose Deploy. Architect runs pre-deployment checks, builds a preview for sign-off, then promotes it using a canary rollout.", "/app/p/support-triage-agent/deploy"],
  [/approv/i, "Agent actions that exceed your policies wait in Approvals. You can approve, edit or decline each one, and every decision is recorded.", "/app/approvals"],
  [/credit|cost|price|bill/i, "Credits are used when Architect builds or changes software. Usage shows spend by project; agent runtime appears under Billing.", "/app/usage"],
  [/import|github|repo/i, "Use Import to bring an existing repository. Architect analyses it, lists the agents and risks it finds, and opens it as a project.", "/app/import"],
  [/idea|what.*build|start/i, "Try 'What should I build' — answer three questions about your team and Architect recommends high-value agents to start with.", "/app/discover"],
];

const ARTICLES = [
  ["Writing an effective request", "2 min"],
  ["Understanding the governance score", "4 min"],
  ["Setting up approval policies", "3 min"],
  ["Publishing and sharing a project", "2 min"],
  ["Connecting Slack, Teams and Gmail", "3 min"],
];

interface Msg {
  role: "user" | "ai";
  text: string;
  href?: string;
}

export function HelpPanel() {
  const { helpOpen, setHelpOpen, toast } = useStore();
  const nav = useNavigate();
  const [tab, setTab] = useState<"assistant" | "help centre" | "contact">("assistant");
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "ai", text: "Hello. I can explain any part of Architect or take you to the right place. What would you like to do?" }]);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  if (!helpOpen) return null;

  const send = (t: string) => {
    if (!t.trim()) return;
    const hit = ANSWERS.find(([re]) => re.test(t));
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setText("");
    setTimeout(
      () =>
        setMsgs((m) => [
          ...m,
          hit ? { role: "ai", text: hit[1], href: hit[2] } : { role: "ai", text: "I have passed this to our support team; you will receive a reply by email within one business day. Meanwhile, the Docs may help.", href: "/app/docs" },
        ]),
      600,
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[95] bg-black/10" onClick={() => setHelpOpen(false)} />
      <aside className="rise fixed top-0 right-0 h-screen w-full max-w-[400px] bg-bg border-l border-line-2 shadow-[-12px_0_40px_rgba(0,0,0,0.12)] z-[96] flex flex-col">
        <div className="flex items-center justify-between px-5 h-[54px] border-b border-line">
          <span className="text-[0.95rem] font-semibold">Help & support</span>
          <button onClick={() => setHelpOpen(false)} className="text-dim hover:text-fg cursor-pointer" aria-label="close">
            <X size={15} />
          </button>
        </div>
        <div className="px-5 pt-3">
          <Pills items={["assistant", "help centre", "contact"] as const} value={tab} onChange={setTab} />
        </div>

        {tab === "assistant" && (
          <>
            <div className="flex-1 overflow-auto px-5 py-4 space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={cx("rise", m.role === "user" && "flex justify-end")}>
                  <div className={cx("text-[0.85rem] leading-relaxed rounded-[10px] px-3 py-2 max-w-[90%]", m.role === "user" ? "bg-surface border border-line" : "")}>
                    {m.text}
                    {m.href && (
                      <button
                        onClick={() => {
                          setHelpOpen(false);
                          nav(m.href!);
                        }}
                        className="block mt-1.5 text-[0.78rem] text-neon-ink font-medium hover:underline cursor-pointer"
                      >
                        Take me there →
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {msgs.length === 1 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {["How do I deploy?", "What should I build first?", "How are credits charged?", "How do approvals work?"].map((s) => (
                    <button key={s} onClick={() => send(s)} className="text-[0.75rem] border border-line-2 rounded-full px-2.5 py-1 text-muted hover:text-fg cursor-pointer">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div ref={end} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(text);
              }}
              className="p-4 border-t border-line flex gap-2"
            >
              <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a question" />
              <button type="submit" className="bg-neon text-[#0a0a0a] rounded-md w-9 shrink-0 flex items-center justify-center cursor-pointer" aria-label="send">
                <ArrowUp size={14} />
              </button>
            </form>
          </>
        )}

        {tab === "help centre" && (
          <div className="flex-1 overflow-auto px-5 py-4">
            <div className="relative mb-3">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles" className="pl-8" />
            </div>
            <Label className="mb-1">popular articles</Label>
            {ARTICLES.filter(([t]) => t.toLowerCase().includes(q.toLowerCase())).map(([t, d]) => (
              <button key={t} onClick={() => (setHelpOpen(false), nav("/app/docs"))} className="w-full text-left flex items-center gap-2.5 py-2.5 border-b border-line cursor-pointer hover:text-neon-ink">
                <BookOpen size={12} className="text-dim" />
                <span className="text-[0.85rem] flex-1">{t}</span>
                <span className="font-mono text-[0.6rem] text-dim">{d}</span>
              </button>
            ))}
            <div className="mt-5 border border-line rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="text-[0.82rem] font-semibold">System status</div>
                <div className="text-[0.72rem] text-live">All systems operational</div>
              </div>
              <span className="w-2 h-2 rounded-full bg-live" />
            </div>
          </div>
        )}

        {tab === "contact" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setHelpOpen(false);
              toast("Support request #SR-2041 created · reply within one business day");
            }}
            className="flex-1 overflow-auto px-5 py-4 space-y-3"
          >
            <Field label="topic">
              <select className="w-full bg-bg border border-line-2 rounded-[7px] px-2 py-2 text-[0.85rem] text-fg">
                <option>Question about a project</option>
                <option>Billing and credits</option>
                <option>Report a problem</option>
                <option>Request a feature</option>
              </select>
            </Field>
            <Field label="details">
              <textarea rows={6} className="w-full bg-bg border border-line-2 rounded-[7px] px-3 py-2 text-[0.85rem] text-fg outline-none focus:border-fg resize-none" placeholder="Describe what you need" />
            </Field>
            <div className="text-[0.75rem] text-dim">The current project and recent activity are attached automatically to help us respond faster.</div>
            <Btn variant="primary" type="submit" className="w-full">
              Send request
            </Btn>
          </form>
        )}
      </aside>
    </>
  );
}
