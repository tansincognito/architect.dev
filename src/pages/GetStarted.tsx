import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Calendar, Check, Copy, ExternalLink, GraduationCap, MessagesSquare, Play, Sparkles, Upload, Users, Video } from "lucide-react";
import { AppPreview } from "../components/AppPreview";
import { Badge, Bar, Btn, Field, H1, HairGrid, Input, Label, Modal, Pills, Spinner, cx } from "../components/ui";
import { useStore } from "../lib/store";

/* ---------------- how it works ---------------- */

const STEPS = [
  ["Describe the outcome", "Write what you need in plain language — or speak it. Attach documents, designs or a repository for context.", "Customer support agent that triages Zendesk tickets"],
  ["Answer a few questions", "Architect asks about users, data sources and how much autonomy the agent should have.", "External customers · Zendesk · Draft only"],
  ["Approve the plan", "Review screens, agents, integrations, approval rules and the cost estimate before any work begins.", "3 screens · 3 agents · 42 credits"],
  ["Watch it build", "The application appears in a live preview as it is assembled and tested.", "8 of 8 automated tests passing"],
  ["Refine and govern", "Request changes in conversation, point at the screen, and close governance gaps with one click.", "Governance score 74 → 92"],
  ["Deploy and monitor", "Release with a preview for sign-off, a gradual rollout, approvals for sensitive actions and full monitoring.", "Live · 1,284 tickets handled this week"],
];

export function HowItWorks() {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  return (
    <main className="px-4 md:px-8 py-8 max-w-[1100px]">
      <H1 sub="From a sentence to a governed, production application in six steps.">How it works</H1>
      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <div className="border border-line rounded-lg overflow-hidden h-fit">
          {STEPS.map(([t, d], k) => (
            <button key={t} onClick={() => setI(k)} className={cx("w-full text-left px-4 py-3.5 border-b border-line last:border-0 cursor-pointer flex gap-3", i === k ? "bg-surface" : "hover:bg-surface/60")}>
              <span className={cx("w-6 h-6 rounded-full flex items-center justify-center font-mono text-[0.62rem] shrink-0", k < i ? "bg-neon text-[#0a0a0a]" : k === i ? "border border-fg" : "border border-line-2 text-dim")}>
                {k < i ? <Check size={11} /> : k + 1}
              </span>
              <span>
                <span className={cx("block text-[0.88rem]", i === k ? "font-semibold" : "")}>{t}</span>
                {i === k && <span className="block text-[0.78rem] text-muted mt-1 leading-relaxed">{d}</span>}
              </span>
            </button>
          ))}
        </div>
        <div>
          <div className="border border-line rounded-lg overflow-hidden h-[340px] relative">
            <AppPreview stage={Math.min(4, i)} />
            <div className="absolute bottom-3 left-3 right-3 bg-ink text-[#eee] rounded-md px-3 py-2 text-[0.8rem] flex items-center gap-2 rise" key={i}>
              <Sparkles size={12} className="text-neon" /> {STEPS[i][2]}
            </div>
          </div>
          <div className="flex justify-between mt-4">
            <Btn variant="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
              ← Previous
            </Btn>
            {i < STEPS.length - 1 ? (
              <Btn onClick={() => setI(i + 1)}>Next step →</Btn>
            ) : (
              <Btn variant="primary" onClick={() => nav("/app")}>
                Start your first project →
              </Btn>
            )}
          </div>
          <div className="mt-6 border border-line rounded-lg p-4 flex items-center gap-4">
            <div className="w-24 h-14 bg-ink rounded flex items-center justify-center text-neon">
              <Play size={18} />
            </div>
            <div className="flex-1">
              <div className="text-[0.88rem] font-semibold">Watch the 4-minute walkthrough</div>
              <div className="text-[0.75rem] text-dim">From request to production with a customer support agent</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------------- prompt library ---------------- */

const PROMPTS = [
  { cat: "Customer service", t: "Ticket triage and drafting", p: "Build an agent that classifies incoming Zendesk tickets by intent and urgency, drafts replies from our help centre, and routes refunds over $100 to a team lead for approval." },
  { cat: "Customer service", t: "Customer health monitor", p: "Create a dashboard that flags accounts at risk of churn based on ticket volume, sentiment and product usage, with a weekly summary email to account managers." },
  { cat: "Finance", t: "Invoice processing", p: "Build an agent that extracts line items from supplier invoices, matches them to purchase orders, and sends mismatches above $5,000 to the finance controller." },
  { cat: "Finance", t: "Expense policy assistant", p: "Create an assistant that answers employee questions about the travel and expense policy and flags claims that exceed limits." },
  { cat: "HR", t: "New-joiner assistant", p: "Build an onboarding assistant that answers questions from our HR handbook in Slack and books IT equipment with manager approval." },
  { cat: "Sales", t: "Account research brief", p: "Create an agent that researches a target account from public sources and our CRM, then writes a one-page brief before each sales meeting." },
  { cat: "Operations", t: "Vendor onboarding", p: "Build a workflow that verifies new vendor tax and banking details, scores risk, and routes high-risk vendors to procurement." },
  { cat: "Leadership", t: "Weekly executive digest", p: "Create an agent that compiles key metrics from Salesforce, Zendesk and Jira into a concise Monday briefing for the leadership team." },
];

export function PromptLibrary() {
  const nav = useNavigate();
  const { toast } = useStore();
  const cats = ["All", ...new Set(PROMPTS.map((p) => p.cat))];
  const [cat, setCat] = useState("All");
  return (
    <main className="px-4 md:px-8 py-8 max-w-[1100px]">
      <H1 sub="Proven requests written by our solutions team. Use one as-is or adapt it to your organisation.">Prompt library</H1>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={cx("text-[0.8rem] px-3 py-1.5 rounded-full border cursor-pointer", cat === c ? "bg-fg text-bg border-fg" : "border-line-2 text-muted hover:text-fg")}>
            {c}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {PROMPTS.filter((p) => cat === "All" || p.cat === cat).map((p) => (
          <div key={p.t} className="border border-line rounded-lg p-5 flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-[0.95rem] font-semibold">{p.t}</span>
              <Badge>{p.cat}</Badge>
            </div>
            <p className="text-[0.82rem] text-muted leading-relaxed mt-2 mb-4 flex-1">"{p.p}"</p>
            <div className="flex gap-2">
              <Btn size="sm" variant="primary" onClick={() => nav("/app/new", { state: { prompt: p.p } })}>
                Use this prompt
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => toast("Prompt copied")}>
                <Copy size={11} /> Copy
              </Btn>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

/* ---------------- what should I build ---------------- */

const Q = [
  { id: "dept", q: "Which part of the organisation do you lead?", o: ["Customer service", "Finance", "HR / People", "Sales", "Operations", "IT"] },
  { id: "pain", q: "Where does your team lose the most time?", o: ["Answering repetitive questions", "Reviewing documents", "Moving data between systems", "Preparing reports", "Approvals and follow-ups"] },
  { id: "tools", q: "Which systems does your team use daily?", o: ["Salesforce", "Zendesk", "Slack / Teams", "SAP / ERP", "Google Workspace", "Jira"] },
];

const RECS = [
  { t: "Ticket triage and drafting agent", impact: "~14 hours saved per agent per week", effort: "Ready in about 1 hour", fit: 94, p: PROMPTS[0].p },
  { t: "Weekly executive digest", impact: "Replaces 3 hours of manual reporting each week", effort: "Ready in about 30 minutes", fit: 81, p: PROMPTS[7].p },
  { t: "Customer health monitor", impact: "Earlier warning on at-risk revenue", effort: "Ready in about 2 hours", fit: 76, p: PROMPTS[1].p },
];

export function Discover() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState<Record<string, string[]>>({});
  const [thinking, setThinking] = useState(false);
  const done = step >= Q.length;

  const next = () => {
    if (step === Q.length - 1) {
      setThinking(true);
      setTimeout(() => (setThinking(false), setStep(Q.length)), 1200);
    } else setStep(step + 1);
  };

  return (
    <main className="px-4 md:px-8 py-8 max-w-[860px] w-full mx-auto">
      <H1 sub="Answer three questions and Architect will recommend the agents with the highest return for your team.">What should I build?</H1>
      {!done && !thinking && (
        <div className="rise" key={step}>
          <div className="flex gap-1 mb-6">
            {Q.map((_, i) => (
              <div key={i} className={cx("h-[3px] flex-1 rounded-full", i <= step ? "bg-neon" : "bg-surface-2")} />
            ))}
          </div>
          <div className="text-[1.15rem] font-semibold mb-4">{Q[step].q}</div>
          <div className="flex flex-wrap gap-2">
            {Q[step].o.map((o) => {
              const on = ans[Q[step].id]?.includes(o);
              return (
                <button
                  key={o}
                  onClick={() => setAns((a) => ({ ...a, [Q[step].id]: on ? a[Q[step].id].filter((x) => x !== o) : [...(a[Q[step].id] ?? []), o] }))}
                  className={cx("text-[0.85rem] px-3.5 py-2 rounded-full border cursor-pointer", on ? "bg-fg text-bg border-fg" : "border-line-2 text-muted hover:text-fg")}
                >
                  {o}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between mt-8">
            <Btn variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
              ← Back
            </Btn>
            <Btn variant="primary" disabled={!ans[Q[step].id]?.length} onClick={next}>
              {step === Q.length - 1 ? "See recommendations" : "Continue →"}
            </Btn>
          </div>
        </div>
      )}
      {thinking && (
        <div className="flex items-center gap-2 text-[0.9rem] text-muted py-16 justify-center">
          <Spinner /> Matching your answers against 1,200 deployed solutions
        </div>
      )}
      {done && (
        <div className="rise space-y-3">
          <Label>recommended for you</Label>
          {RECS.map((r, i) => (
            <div key={r.t} className={cx("border rounded-lg p-5", i === 0 ? "border-fg" : "border-line")}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[1rem] font-semibold">{r.t}</span>
                    {i === 0 && <Badge tone="neon">best match</Badge>}
                  </div>
                  <div className="text-[0.8rem] text-muted mt-1">
                    {r.impact} · {r.effort}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-[1.2rem] font-bold">{r.fit}%</div>
                  <div className="text-[0.68rem] text-dim">fit</div>
                </div>
              </div>
              <Bar value={r.fit} className="mt-3" />
              <Btn size="sm" variant={i === 0 ? "primary" : "secondary"} className="mt-4" onClick={() => nav("/app/new", { state: { prompt: r.p } })}>
                Build this <ArrowRight size={11} />
              </Btn>
            </div>
          ))}
          <button onClick={() => (setStep(0), setAns({}))} className="text-[0.8rem] text-dim hover:text-fg cursor-pointer">
            Start again
          </button>
        </div>
      )}
    </main>
  );
}

/* ---------------- resources ---------------- */

export function Resources() {
  const { toast } = useStore();
  const [tab, setTab] = useState<"courses" | "guides" | "webinars" | "case studies">("courses");
  const courses = [
    ["AI agents for business leaders", "6 lessons · 45 min", 100],
    ["Designing approval policies", "4 lessons · 30 min", 50],
    ["Measuring agent ROI", "5 lessons · 40 min", 0],
    ["Agent engineering with LangGraph", "8 lessons · 2 h", 0],
  ] as const;
  return (
    <main className="px-4 md:px-8 py-8 max-w-[1100px]">
      <H1 sub="Courses, guides and events for business and technical teams." right={<Pills items={["courses", "guides", "webinars", "case studies"] as const} value={tab} onChange={setTab} />}>
        Resources
      </H1>
      {tab === "courses" && (
        <div className="grid md:grid-cols-2 gap-3">
          {courses.map(([t, d, p]) => (
            <div key={t} className="border border-line rounded-lg p-5">
              <div className="flex items-center gap-2">
                <GraduationCap size={15} className="text-dim" />
                <span className="text-[0.95rem] font-semibold">{t}</span>
              </div>
              <div className="text-[0.75rem] text-dim mt-1">{d}</div>
              <Bar value={p} className="mt-4" />
              <div className="flex items-center justify-between mt-3">
                <span className="text-[0.75rem] text-muted">{p === 100 ? "Completed · certificate issued" : p ? `${p}% complete` : "Not started"}</span>
                <Btn size="sm" onClick={() => toast(`Opening ${t}`)}>
                  {p === 100 ? "Review" : p ? "Continue" : "Start"}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === "guides" && (
        <div className="border border-line rounded-lg overflow-hidden">
          {["Building a business case for AI agents", "Change management when introducing agents", "Writing approval policies auditors accept", "Choosing an agent framework"].map((g) => (
            <div key={g} className="flex items-center gap-3 px-4 py-3.5 border-b border-line last:border-0">
              <BookOpen size={13} className="text-dim" />
              <span className="text-[0.88rem] flex-1">{g}</span>
              <Badge>pdf</Badge>
            </div>
          ))}
        </div>
      )}
      {tab === "webinars" && (
        <div className="grid md:grid-cols-2 gap-3">
          {[
            ["Live: governance for agentic applications", "Thu 9 Oct · 17:00 IST", true],
            ["Recorded: from pilot to production in 30 days", "48 min", false],
          ].map(([t, d, live]) => (
            <div key={t as string} className="border border-line rounded-lg p-5">
              <div className="flex items-center gap-2">
                {live ? <Calendar size={14} className="text-dim" /> : <Video size={14} className="text-dim" />}
                <span className="text-[0.92rem] font-semibold">{t as string}</span>
              </div>
              <div className="text-[0.78rem] text-dim mt-1">{d as string}</div>
              <Btn size="sm" className="mt-4" onClick={() => toast(live ? "Registered · calendar invitation sent" : "Opening recording")}>
                {live ? "Register" : "Watch"}
              </Btn>
            </div>
          ))}
        </div>
      )}
      {tab === "case studies" && (
        <HairGrid className="grid-cols-1 md:grid-cols-3">
          {[
            ["Retail", "61% of support tickets resolved without escalation"],
            ["Insurance", "Claims intake time reduced from 2 days to 3 hours"],
            ["Logistics", "Vendor onboarding cut from 9 days to 1"],
          ].map(([i, r]) => (
            <div key={i} className="bg-bg p-5">
              <Label>{i}</Label>
              <div className="text-[1rem] font-semibold mt-2 leading-snug">{r}</div>
              <button className="text-[0.78rem] text-dim hover:text-fg mt-3 inline-flex items-center gap-1 cursor-pointer">
                Read the case study <ArrowRight size={11} />
              </button>
            </div>
          ))}
        </HairGrid>
      )}
    </main>
  );
}

/* ---------------- design systems ---------------- */

interface DS {
  name: string;
  colors: string[];
  font: string;
  radius: string;
  default?: boolean;
}

export function DesignSystems() {
  const { toast } = useStore();
  const [list, setList] = useState<DS[]>([
    { name: "Acme corporate", colors: ["#0b3d91", "#f5f7fb", "#ff6b35", "#111827"], font: "Inter", radius: "6px", default: true },
    { name: "Architect default", colors: ["#0a0a0a", "#ffffff", "#b8f000", "#666666"], font: "Instrument Sans", radius: "8px" },
  ]);
  const [creating, setCreating] = useState(false);
  const [source, setSource] = useState<"website" | "figma" | "manual">("website");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("https://acme.com");

  return (
    <main className="px-4 md:px-8 py-8 max-w-[1100px]">
      <H1
        sub="Brand guidelines Architect applies to every application it builds for your organisation."
        right={
          <Btn variant="primary" onClick={() => setCreating(true)}>
            New design system
          </Btn>
        }
      >
        Design systems
      </H1>
      <div className="grid md:grid-cols-2 gap-3">
        {list.map((d) => (
          <div key={d.name} className="border border-line rounded-lg overflow-hidden">
            <div className="h-[120px] p-4 flex flex-col justify-between" style={{ background: d.colors[1], color: d.colors[3], fontFamily: d.font }}>
              <div className="text-[1.1rem] font-semibold">Quarterly review</div>
              <div className="flex gap-2">
                <span className="text-[0.75rem] px-3 py-1.5 text-white" style={{ background: d.colors[0], borderRadius: d.radius }}>
                  Primary action
                </span>
                <span className="text-[0.75rem] px-3 py-1.5" style={{ border: `1px solid ${d.colors[0]}`, borderRadius: d.radius }}>
                  Secondary
                </span>
              </div>
            </div>
            <div className="p-4 border-t border-line">
              <div className="flex items-center justify-between">
                <span className="text-[0.92rem] font-semibold">{d.name}</span>
                {d.default ? (
                  <Badge tone="neon">organisation default</Badge>
                ) : (
                  <button onClick={() => (setList((x) => x.map((y) => ({ ...y, default: y.name === d.name }))), toast(`${d.name} set as default`))} className="text-[0.75rem] text-dim hover:text-fg cursor-pointer">
                    Set as default
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {d.colors.map((c) => (
                  <span key={c} className="w-5 h-5 rounded border border-line" style={{ background: c }} title={c} />
                ))}
                <span className="text-[0.72rem] text-dim ml-2">
                  {d.font} · radius {d.radius}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="New design system">
        <Pills items={["website", "figma", "manual"] as const} value={source} onChange={setSource} className="mb-4" />
        {source === "website" && (
          <Field label="extract from your website" hint="Architect reads colours, typography and spacing from the page.">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
        )}
        {source === "figma" && (
          <Field label="figma library url">
            <Input placeholder="https://www.figma.com/design/…" />
          </Field>
        )}
        {source === "manual" && (
          <button className="w-full border-2 border-dashed border-line-2 rounded-lg py-8 text-center cursor-pointer">
            <Upload size={16} className="mx-auto text-dim" />
            <div className="text-[0.82rem] mt-2">Upload brand guidelines (PDF)</div>
          </button>
        )}
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={() => setCreating(false)}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={() => {
              setBusy(true);
              setTimeout(() => {
                setList((x) => [...x, { name: "Acme marketing", colors: ["#7c3aed", "#faf5ff", "#f59e0b", "#1f2937"], font: "Poppins", radius: "12px" }]);
                setBusy(false);
                setCreating(false);
                toast("Design system extracted · 4 colours, 2 typefaces, 9 components");
              }, 1300);
            }}
          >
            {busy ? <Spinner /> : null} Create
          </Btn>
        </div>
      </Modal>
    </main>
  );
}

/* ---------------- community ---------------- */

export function Community() {
  const { toast } = useStore();
  return (
    <main className="px-4 md:px-8 py-8 max-w-[1100px]">
      <H1 sub="Learn from other builders, share what you have made and get help from the Architect team.">Community</H1>
      <div className="grid md:grid-cols-3 gap-3 mb-8">
        {[
          [<MessagesSquare size={16} />, "Discord", "4,800 members · active daily", "Join Discord"],
          [<Users size={16} />, "Executive roundtable", "Monthly session for business leaders", "Request an invitation"],
          [<Calendar size={16} />, "Office hours", "Thursdays with a solutions engineer", "Book a slot"],
        ].map(([icon, t, d, a]) => (
          <div key={t as string} className="border border-line rounded-lg p-5">
            <div className="text-dim">{icon}</div>
            <div className="text-[0.95rem] font-semibold mt-2">{t as string}</div>
            <div className="text-[0.78rem] text-muted mt-1">{d as string}</div>
            <Btn size="sm" className="mt-4" onClick={() => toast(`${a as string} · opening`)}>
              {a as string} <ExternalLink size={10} />
            </Btn>
          </div>
        ))}
      </div>
      <Label className="mb-2">recent discussions</Label>
      <div className="border border-line rounded-lg overflow-hidden">
        {[
          ["How are you measuring ROI on support agents?", "32 replies", "#business-leaders"],
          ["Approval timeouts: escalate or auto-decline?", "18 replies", "#governance"],
          ["LangGraph vs CrewAI for document workflows", "41 replies", "#engineering"],
        ].map(([t, r, c]) => (
          <div key={t} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
            <span className="text-[0.88rem] flex-1">{t}</span>
            <span className="font-mono text-[0.62rem] text-dim">{c}</span>
            <span className="text-[0.75rem] text-muted w-20 text-right">{r}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
