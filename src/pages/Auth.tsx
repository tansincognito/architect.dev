import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Check, Code2, Sparkles, Users } from "lucide-react";
import { Logo } from "../components/Shell";
import { Btn, Field, GithubMark, Input, Label, Pills, Spinner, cx } from "../components/ui";
import { useStore, type Mode } from "../lib/store";
import { api, ApiError } from "../lib/api";

function AuthFrame({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_440px] bg-bg text-fg">
      <div className="flex flex-col">
        <header className="h-[50px] border-b border-line px-4 md:px-8 flex items-center">
          <button onClick={() => nav("/")} className="cursor-pointer">
            <Logo />
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-[400px] rise">{children}</div>
        </div>
      </div>
      <aside className="hidden lg:flex bg-ink border-l border-ink-line text-[#ddd] p-10 flex-col justify-end">{aside}</aside>
    </div>
  );
}

const TERMINAL_LINES = [
  "> Customer support agent that triages Zendesk tickets",
  "  ✓ Plan approved: 3 screens · 3 agents · 2 integrations",
  "  ✓ Governance: refunds over $100 require approval",
  "  ✓ Readiness review passed (88/100)",
  "  ✓ Deployed to production with audit trail",
];

function TerminalAside() {
  const [n, setN] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x >= TERMINAL_LINES.length ? 1 : x + 1)), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="font-mono">
      <div className="text-[0.55rem] uppercase tracking-[0.1em] text-[#555] mb-4">from request to production</div>
      <div className="space-y-2.5 text-[0.85rem] font-sans">
        {TERMINAL_LINES.slice(0, n).map((l, i) => (
          <div key={i} className={cx("rise", i === 0 ? "text-[#f0f0f0]" : "text-[#888]")}>
            {l.includes("✓") ? (
              <>
                <span className="text-neon">  ✓</span>
                {l.replace("  ✓", "")}
              </>
            ) : (
              l
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SignIn() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { signIn } = useStore();
  const [tab, setTab] = useState<"sign in" | "sign up">(params.get("mode") === "signup" ? "sign up" : "sign in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signingUp = tab === "sign up";
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= (signingUp ? 8 : 1) && (!signingUp || name.trim().length > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { user } = signingUp ? await api.signup({ name: name.trim(), email, password }) : await api.login({ email, password });
      signIn(user);
      nav(signingUp ? "/onboarding" : "/app");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server. Is the API running?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame aside={<TerminalAside />}>
      <h1 className="font-sans text-[1.6rem] font-semibold tracking-[-0.02em] m-0">{signingUp ? "Create your account" : "Sign in to Architect"}</h1>
      <p className="text-[0.82rem] text-muted mt-1.5 mb-6">{signingUp ? "$10 of free credits · no payment details required" : "Use the email and password you registered with."}</p>

      <Pills items={["sign in", "sign up"] as const} value={tab} onChange={(t) => (setTab(t), setError(null))} className="mb-5" />

      <form onSubmit={submit} className="space-y-3">
        {signingUp && (
          <Field label="full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
          </Field>
        )}
        <Field label="work email address">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" autoComplete="email" autoFocus={!signingUp} />
        </Field>
        <Field label="password" hint={signingUp ? "At least 8 characters." : undefined}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signingUp ? "new-password" : "current-password"} />
        </Field>
        {error && <div className="text-[0.8rem] text-danger rise">{error}</div>}
        <Btn variant="primary" size="lg" className="w-full" disabled={!valid || busy}>
          {busy && <Spinner />} {signingUp ? "Create account" : "Sign in"}
        </Btn>
      </form>

      <div className="flex justify-between mt-6 text-[0.75rem] text-dim">
        <button onClick={() => (setTab(signingUp ? "sign in" : "sign up"), setError(null))} className="hover:text-fg cursor-pointer">
          {signingUp ? "Already have an account? Sign in" : "New to Architect? Create an account"}
        </button>
        <span>Terms · Privacy</span>
      </div>
    </AuthFrame>
  );
}

const GOALS = [
  "Customer service automation",
  "Internal operations tooling",
  "Document processing",
  "Sales & revenue workflows",
  "Modernise an existing application",
  "Evaluating the platform",
];

export function Onboarding() {
  const nav = useNavigate();
  const { user, authLoading, signIn, setMode, toast } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name ?? "");
  const [workspace, setWorkspace] = useState("acme");
  const [role, setRole] = useState<Mode | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [gh, setGh] = useState<"idle" | "connecting" | "done">("idle");

  const steps = ["Profile", "Your role", "Priorities", "Source control", "Team"];

  if (!authLoading && !user) return <Navigate to="/signin?mode=signup" replace />;

  const finish = async () => {
    try {
      const { user: updated } = await api.updateMe({ name, workspace });
      signIn(updated);
    } catch {
      toast("Could not save your profile; you can update it later in Account settings");
    }
    setMode(role ?? "simple");
    nav(goals.includes("Modernise an existing application") ? "/app/import" : "/app");
  };

  const next = () => (step < steps.length - 1 ? setStep(step + 1) : finish());

  return (
    <AuthFrame
      aside={
        <div className="font-mono">
          <div className="text-[0.55rem] uppercase tracking-[0.1em] text-[#555] mb-5">setup</div>
          <ol className="space-y-3 list-none p-0 m-0">
            {steps.map((s, i) => (
              <li key={s} className={cx("flex items-center gap-3 text-[0.72rem]", i === step ? "text-[#f0f0f0]" : i < step ? "text-[#888]" : "text-[#444]")}>
                <span
                  className={cx(
                    "w-5 h-5 rounded-full border flex items-center justify-center text-[0.55rem]",
                    i < step ? "bg-neon border-neon text-[#0a0a0a]" : i === step ? "border-neon text-neon" : "border-[#333]",
                  )}
                >
                  {i < step ? <Check size={10} /> : i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      }
    >
      <div className="flex gap-1 mb-8">
        {steps.map((_, i) => (
          <div key={i} className={cx("h-[3px] flex-1 rounded-full", i <= step ? "bg-neon" : "bg-surface-2")} />
        ))}
      </div>

      {step === 0 && (
        <div className="rise space-y-4">
          <h1 className="font-sans text-[1.5rem] font-semibold tracking-[-0.02em] m-0">Set up your workspace</h1>
          <Field label="full name">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="organisation" hint={`${workspace || "acme"}.architect.app · members can be invited later`}>
            <Input value={workspace} onChange={(e) => setWorkspace(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="rise">
          <h1 className="font-sans text-[1.5rem] font-semibold tracking-[-0.02em] m-0">Which best describes your role?</h1>
          <p className="text-[0.82rem] text-muted mt-1.5 mb-5">This sets your default view. You can switch at any time from the top bar.</p>
          <div className="space-y-2.5">
            {[
              { v: "simple" as const, icon: <Sparkles size={14} />, t: "Business or operations leader", d: "Describe outcomes, review plans and approve decisions. Code stays out of view." },
              { v: "dev" as const, icon: <Code2 size={14} />, t: "Engineer or technical lead", d: "Full access to code, terminal, frameworks, traces, evaluations and CLI." },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setRole(o.v)}
                className={cx(
                  "w-full text-left p-4 rounded-lg border transition-all cursor-pointer flex gap-3",
                  role === o.v ? "border-fg bg-surface" : "border-line hover:border-line-2",
                )}
              >
                <span className={cx("mt-0.5", role === o.v ? "text-neon-ink" : "text-dim")}>{o.icon}</span>
                <span className="flex-1">
                  <span className="block text-[0.92rem] font-semibold">{o.t}</span>
                  <span className="block text-[0.78rem] text-muted mt-1">{o.d}</span>
                </span>
                <span className={cx("w-4 h-4 rounded-full border mt-0.5", role === o.v ? "border-[5px] border-fg" : "border-line-2")} />
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rise">
          <h1 className="font-sans text-[1.5rem] font-semibold tracking-[-0.02em] m-0">What are your initial priorities?</h1>
          <p className="text-[0.82rem] text-muted mt-1.5 mb-5">Select all that apply. We will tailor templates and recommendations.</p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => {
              const on = goals.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => setGoals((x) => (on ? x.filter((y) => y !== g) : [...x, g]))}
                  className={cx(
                    "text-[0.8rem] px-3 py-1.5 rounded-full border cursor-pointer transition-all",
                    on ? "bg-neon border-neon text-[#0a0a0a] font-semibold" : "border-line-2 text-muted hover:text-fg",
                  )}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rise">
          <h1 className="font-sans text-[1.5rem] font-semibold tracking-[-0.02em] m-0">Connect source control</h1>
          <p className="text-[0.82rem] text-muted mt-1.5 mb-5">
            Every change is recorded as a commit in your repository. Required to import existing code. {role === "simple" && "Optional — your engineering team can connect this later."}
          </p>
          <div className="border border-line rounded-lg p-4 flex items-center gap-3">
            <GithubMark size={22} />
            <div className="flex-1">
              <div className="text-[0.88rem] font-semibold">GitHub Enterprise</div>
              <div className="text-[0.75rem] text-dim">
                {gh === "done" ? "Connected as @ajay · 3 organisations · 41 repositories" : "Read and write access to selected repositories only"}
              </div>
            </div>
            {gh === "done" ? (
              <span className="font-mono text-[0.6rem] text-neon-ink inline-flex items-center gap-1">
                <Check size={11} /> Connected
              </span>
            ) : (
              <Btn
                variant="dark"
                size="sm"
                onClick={() => {
                  setGh("connecting");
                  setTimeout(() => setGh("done"), 1100);
                }}
              >
                {gh === "connecting" ? <Spinner /> : "Connect"}
              </Btn>
            )}
          </div>
          {gh === "done" && (
            <div className="mt-3 text-[0.75rem] text-dim">
              Access: <span className="text-fg">selected repositories only</span> · manage in Integrations
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="rise">
          <h1 className="font-sans text-[1.5rem] font-semibold tracking-[-0.02em] m-0">Invite your team</h1>
          <p className="text-[0.82rem] text-muted mt-1.5 mb-5">Editors build, viewers review, and approvers authorise agent actions.</p>
          <TeamInvite />
        </div>
      )}

      <div className="flex justify-between items-center mt-8">
        <Btn variant="ghost" size="md" onClick={() => (step ? setStep(step - 1) : nav("/signin"))}>
          ← Back
        </Btn>
        <div className="flex gap-2">
          {(step === 3 || step === 4) && (
            <Btn variant="ghost" onClick={next}>
              Skip
            </Btn>
          )}
          <Btn variant="primary" onClick={next} disabled={(step === 0 && !name) || (step === 1 && !role)}>
            {step === steps.length - 1 ? "Go to workspace →" : "Continue →"}
          </Btn>
        </div>
      </div>
    </AuthFrame>
  );
}

function TeamInvite() {
  const [rows, setRows] = useState([{ email: "", role: "editor" }]);
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder="colleague@company.com"
            value={r.email}
            onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, email: e.target.value } : y)))}
          />
          <select
            value={r.role}
            onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, role: e.target.value } : y)))}
            className="bg-bg border border-line-2 rounded-[7px] px-2 font-mono text-[0.65rem] text-fg"
          >
            <option>editor</option>
            <option>viewer</option>
            <option>approver</option>
            <option>admin</option>
          </select>
        </div>
      ))}
      <button onClick={() => setRows((x) => [...x, { email: "", role: "editor" }])} className="text-[0.75rem] text-dim hover:text-fg inline-flex items-center gap-1 cursor-pointer">
        <Users size={10} /> Add another
      </button>
      <Label className="!mt-4">or share an invitation link</Label>
      <div className="font-mono text-[0.62rem] bg-surface border border-line rounded-md px-3 py-2 text-muted">architect.app/join/acme-7f3k</div>
    </div>
  );
}
