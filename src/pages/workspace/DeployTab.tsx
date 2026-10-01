import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Check, Cloud, ExternalLink, Globe, RotateCcw, Server, X } from "lucide-react";
import { Badge, Bar, Btn, Field, Input, Label, Modal, Pills, Spinner, Status, cx } from "../../components/ui";
import { totalScore } from "../../lib/readiness";
import { useShared, useStore } from "../../lib/store";
import { useProject } from "./Workspace";
import { useReadiness } from "./ReadinessTab";

type Phase = "idle" | "configure" | "checks" | "build" | "preview" | "rollout" | "live";

interface Deploy {
  v: number;
  env: string;
  status: "live" | "ready" | "failed" | "rolled back";
  commit: string;
  msg: string;
  when: string;
  by: string;
}

const HISTORY: Deploy[] = [
  { v: 23, env: "production", status: "live", commit: "a1f9c2e", msg: "Show confidence per ticket category", when: "2h ago", by: "ajay" },
  { v: 22, env: "preview", status: "ready", commit: "77be010", msg: "Approval policy for refunds over $100", when: "1d ago", by: "architect" },
  { v: 21, env: "production", status: "rolled back", commit: "e03d1aa", msg: "Responder model upgrade", when: "2d ago", by: "priya" },
  { v: 20, env: "production", status: "ready", commit: "51c7f8b", msg: "Analytics dashboard", when: "3d ago", by: "ajay" },
];

const TARGETS = [
  { id: "architect", name: "Architect Cloud", icon: <Cloud size={14} />, d: "Fully managed · application, agents and data" },
  { id: "vercel", name: "Vercel", icon: <Globe size={14} />, d: "Application on Vercel · agents as functions" },
  { id: "aws", name: "AWS (your account)", icon: <Server size={14} />, d: "ECS and RDS provisioned via Terraform" },
  { id: "docker", name: "Container image", icon: <Server size={14} />, d: "Publish to your registry · self-hosted" },
];

const BUILD_LOG = [
  "cloning acme/support-triage@a1f9c2e",
  "detected next.js 16 + python 3.13 agents",
  "installing dependencies (cached)",
  "building app · 41 routes",
  "packaging agents: classifier, responder, escalator",
  "running 8 smoke tests … passed",
  "migrating database (1 pending migration)",
  "uploading build output · 14.2 MB",
  "provisioning workers (1–8 autoscale)",
  "health check /api/health … 200",
];

export default function DeployTab() {
  const p = useProject();
  const nav = useNavigate();
  const { mode, toast, updateProject } = useStore();
  const [values] = useReadiness(p.id);
  const readiness = totalScore(values);
  const [history, setHistory] = useShared<Deploy[]>(`deploys.${p.id}`, () => HISTORY);
  const [phase, setPhase] = useState<Phase>("idle");
  const [env, setEnv] = useState<"preview" | "staging" | "production">("preview");
  const [target, setTarget] = useState("architect");
  const [region, setRegion] = useState("us-east");
  const [checks, setChecks] = useState(0);
  const [logN, setLogN] = useState(0);
  const [strategy, setStrategy] = useState<"instant" | "canary" | "blue-green">("canary");
  const [rollout, setRollout] = useState(0);
  const [domainOpen, setDomainOpen] = useState(false);
  const [rollbackOf, setRollbackOf] = useState<Deploy | null>(null);
  const [nextV, setNextV] = useState((history[0]?.v ?? 0) + 1);

  const CHECKS = [
    { label: "Governance score", detail: `${readiness}/100 · minimum 60`, ok: readiness >= 60, fix: `/app/p/${p.id}/readiness` },
    { label: "Automated tests", detail: "39 of 39 passed", ok: true },
    { label: "Quality evaluation", detail: "Accuracy 0.93 (baseline 0.91)", ok: true },
    { label: "Security scan", detail: "No credentials in code · 4 held in vault", ok: true },
    { label: "Cost estimate", detail: "~$18/month at current volume", ok: true },
  ];
  const blocked = CHECKS.some((c) => !c.ok);

  useEffect(() => {
    if (phase !== "checks") return;
    if (checks >= CHECKS.length) return;
    const t = setTimeout(() => setChecks((c) => c + 1), 450);
    return () => clearTimeout(t);
  }, [phase, checks, CHECKS.length]);

  useEffect(() => {
    if (phase !== "build") return;
    if (logN >= BUILD_LOG.length) {
      const t = setTimeout(() => setPhase("preview"), 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLogN((n) => n + 1), 320);
    return () => clearTimeout(t);
  }, [phase, logN]);

  useEffect(() => {
    if (phase !== "rollout") return;
    if (rollout >= 100) {
      const t = setTimeout(() => {
        setPhase("live");
        updateProject(p.id, { status: "live", url: p.url ?? `${p.id}.architect.app` });
        setHistory([{ v: nextV, env: "production", status: "live", commit: "c4e19ab", msg: "latest changes", when: "just now", by: "you" }, ...history.map((h) => (h.status === "live" ? { ...h, status: "ready" as const } : h))]);
        toast(`Version ${nextV} is live in production`);
      }, 400);
      return () => clearTimeout(t);
    }
    const step = strategy === "instant" ? 100 : strategy === "canary" ? (rollout < 10 ? 10 : rollout < 50 ? 40 : 50) : 100;
    const t = setTimeout(() => setRollout((r) => Math.min(100, r + step)), strategy === "instant" ? 600 : 1300);
    return () => clearTimeout(t);
  }, [phase, rollout, strategy]);

  const start = () => {
    setNextV((history[0]?.v ?? 0) + 1);
    setChecks(0);
    setLogN(0);
    setRollout(0);
    setPhase("checks");
  };

  const previewUrl = `${p.id}-v${nextV}.preview.architect.app`;

  return (
    <div className="flex-1 grid lg:grid-cols-[1fr_360px] min-h-0">
      <section className="px-4 md:px-8 py-6 overflow-auto">
        {phase === "idle" && (
          <div className="rise">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="font-sans text-[1.5rem] font-semibold tracking-[-0.02em] m-0">Deployments</h2>
                <p className="text-[0.82rem] text-muted mt-1">
                  {p.status === "live" ? `Production: v${history.find((h) => h.status === "live")?.v ?? "—"} · ${p.url}` : "Not yet deployed"}
                </p>
              </div>
              <Btn variant="primary" size="lg" onClick={() => setPhase("configure")}>
                New deployment
              </Btn>
            </div>
            <Label className="mb-2">release history</Label>
            <div className="border border-line rounded-lg overflow-hidden">
              {history.map((d) => (
                <div key={d.v} className="grid grid-cols-[3rem_1fr_auto_auto] md:grid-cols-[3rem_1fr_6rem_6rem_auto] items-center gap-4 px-4 py-3 border-b border-line last:border-0">
                  <span className="font-mono text-[0.68rem] font-bold">v{d.v}</span>
                  <div className="min-w-0">
                    <div className="font-mono text-[0.68rem] truncate">{d.msg}</div>
                    <div className="font-mono text-[0.55rem] text-dim">
                      {mode === "dev" && `${d.commit} · `}
                      {d.by} · {d.when}
                    </div>
                  </div>
                  <span className="hidden md:block">
                    <Badge tone={d.env === "production" ? "neon" : "neutral"}>{d.env}</Badge>
                  </span>
                  <span className="hidden md:block">
                    <Status status={d.status === "rolled back" ? "failed" : d.status} />
                  </span>
                  {d.status !== "live" && d.env === "production" && d.status !== "rolled back" ? (
                    <Btn size="sm" variant="ghost" onClick={() => setRollbackOf(d)}>
                      <RotateCcw size={10} /> Roll back to this version
                    </Btn>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === "configure" && (
          <div className="rise max-w-[640px]">
            <h2 className="font-sans text-[1.5rem] font-semibold tracking-[-0.02em] m-0 mb-6">New deployment · v{nextV}</h2>
            <Label className="mb-2">environment</Label>
            <Pills items={["preview", "staging", "production"] as const} value={env} onChange={setEnv} className="mb-2" />
            <div className="text-[0.75rem] text-dim mb-6">
              {env === "preview" ? "Private URL for review and sign-off. No customer traffic." : env === "staging" ? "Mirrors production configuration using test data." : "A preview is built first, then promoted using your rollout strategy."}
            </div>
            <Label className="mb-2">target</Label>
            <div className="grid sm:grid-cols-2 gap-2 mb-6">
              {TARGETS.filter((t) => mode === "dev" || t.id === "architect" || t.id === "vercel").map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTarget(t.id)}
                  className={cx("text-left p-3.5 rounded-lg border flex gap-3 cursor-pointer", target === t.id ? "border-fg bg-surface" : "border-line hover:border-line-2")}
                >
                  <span className="text-dim mt-0.5">{t.icon}</span>
                  <span>
                    <span className="block text-[0.88rem] font-semibold">{t.name}</span>
                    <span className="block text-[0.75rem] text-dim">{t.d}</span>
                  </span>
                </button>
              ))}
            </div>
            {mode === "dev" && (
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                <Field label="region">
                  <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full bg-bg border border-line-2 rounded-[7px] px-2 py-2 font-mono text-[0.7rem] text-fg">
                    <option>us-east</option>
                    <option>eu-west</option>
                    <option>ap-south (mumbai)</option>
                  </select>
                </Field>
                <Field label="branch / commit">
                  <Input defaultValue="main @ c4e19ab" />
                </Field>
              </div>
            )}
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={() => setPhase("idle")}>
                Cancel
              </Btn>
              <Btn variant="primary" onClick={start}>
                Run pre-deployment checks →
              </Btn>
            </div>
          </div>
        )}

        {phase === "checks" && (
          <div className="rise max-w-[640px]">
            <h2 className="font-sans text-[1.5rem] font-semibold tracking-[-0.02em] m-0 mb-1">Pre-deployment checks</h2>
            <p className="text-[0.82rem] text-muted mb-6">Deployment is blocked if any required check fails.</p>
            <div className="border border-line rounded-lg overflow-hidden">
              {CHECKS.map((c, i) => (
                <div key={c.label} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
                  <span className="w-4 flex justify-center">
                    {i < checks ? c.ok ? <Check size={12} className="text-live" /> : <X size={12} className="text-danger" /> : i === checks ? <Spinner className="!w-2.5 !h-2.5" /> : <span className="w-1 h-1 rounded-full bg-line-2" />}
                  </span>
                  <span className="text-[0.85rem] flex-1">{c.label}</span>
                  {i < checks && <span className={cx("text-[0.78rem]", c.ok ? "text-dim" : "text-danger")}>{c.detail}</span>}
                  {i < checks && !c.ok && c.fix && (
                    <Btn size="sm" onClick={() => nav(c.fix!)}>
                      Resolve →
                    </Btn>
                  )}
                </div>
              ))}
            </div>
            {checks >= CHECKS.length && (
              <div className="mt-5 rise">
                {blocked ? (
                  <div className="flex items-center gap-2 text-[0.82rem] text-danger mb-3">
                    <AlertTriangle size={12} /> Governance score is below the required minimum of 60. Resolve failing controls to continue.
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <Btn variant="ghost" onClick={() => setPhase("configure")}>
                    ← Back
                  </Btn>
                  <Btn variant="primary" disabled={blocked} onClick={() => setPhase("build")}>
                    Build and deploy to {env === "production" ? "preview" : env} →
                  </Btn>
                  {blocked && mode === "dev" && (
                    <Btn variant="danger" onClick={() => (toast("Override recorded in the audit log"), setPhase("build"))}>
                      Override (administrator)
                    </Btn>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {(phase === "build" || phase === "preview" || phase === "rollout" || phase === "live") && (
          <div className="rise">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-sans text-[1.5rem] font-semibold tracking-[-0.02em] m-0">v{nextV}</h2>
              <Status status={phase === "build" ? "building" : phase === "rollout" ? "running" : phase === "live" ? "live" : "ready"} pulse={phase === "build" || phase === "rollout"} />
            </div>
            <div className="bg-ink border border-ink-line rounded-lg p-4 font-mono text-[0.62rem] text-[#888] leading-relaxed h-[230px] overflow-auto">
              {BUILD_LOG.slice(0, logN).map((l, i) => (
                <div key={i}>
                  <span className="text-[#444] mr-3">{String(i * 2 + 1).padStart(2, "0")}s</span>
                  {l.includes("passed") || l.includes("200") ? <span className="text-neon">{l}</span> : l}
                </div>
              ))}
              {phase === "build" && <span className="caret" />}
            </div>

            {phase !== "build" && (
              <div className="mt-5 border border-neon-line bg-neon-soft rounded-lg p-4 flex items-center justify-between gap-4 rise">
                <div>
                  <div className="text-[0.88rem] font-semibold flex items-center gap-2">
                    <Check size={12} /> Preview ready for review
                  </div>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-[0.8rem] text-muted inline-flex items-center gap-1 mt-0.5">
                    {previewUrl} <ExternalLink size={10} />
                  </a>
                </div>
                <Btn size="sm" onClick={() => toast("Secure preview link copied · expires in 7 days")}>
                  Share for sign-off
                </Btn>
              </div>
            )}

            {phase === "preview" && env !== "production" && (
              <div className="flex gap-2 mt-4">
                <Btn variant="ghost" onClick={() => setPhase("idle")}>
                  Done
                </Btn>
                <Btn variant="primary" onClick={() => setEnv("production")}>
                  Promote to production →
                </Btn>
              </div>
            )}

            {phase === "preview" && env === "production" && (
              <div className="mt-5 rise">
                <Label className="mb-2">rollout strategy</Label>
                <div className="grid sm:grid-cols-3 gap-2">
                  {(
                    [
                      ["canary", "10% → 50% → 100%", "Automatic rollback if errors exceed 2%"],
                      ["blue-green", "Switch all traffic at once", "Previous version kept on standby for 1 hour"],
                      ["instant", "100% immediately", "Fastest; highest risk"],
                    ] as const
                  ).map(([id, t, d]) => (
                    <button
                      key={id}
                      onClick={() => setStrategy(id)}
                      className={cx("text-left p-3 rounded-lg border cursor-pointer", strategy === id ? "border-fg bg-surface" : "border-line hover:border-line-2")}
                    >
                      <div className="text-[0.88rem] font-semibold">{id}</div>
                      <div className="text-[0.75rem] text-muted">{t}</div>
                      <div className="text-[0.7rem] text-dim">{d}</div>
                    </button>
                  ))}
                </div>
                <Btn variant="primary" size="lg" className="mt-4" onClick={() => setPhase("rollout")}>
                  Promote v{nextV} to production
                </Btn>
              </div>
            )}

            {(phase === "rollout" || phase === "live") && (
              <div className="mt-5 border border-line rounded-lg p-4 rise">
                <div className="flex justify-between items-baseline mb-2">
                  <Label>{phase === "live" ? "rollout complete" : `rolling out · ${strategy}`}</Label>
                  <span className="text-[0.88rem] font-semibold">{rollout}% traffic</span>
                </div>
                <Bar value={rollout} className="!h-[6px]" />
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {[
                    ["Error rate", "0.3%", "vs 0.4% previously"],
                    ["Response time (p95)", "1.8s", "vs 2.1s previously"],
                    ["Live quality score", "0.93", "vs 0.91 previously"],
                  ].map(([k, v, d]) => (
                    <div key={k}>
                      <div className="text-[0.7rem] text-dim">{k}</div>
                      <div className="font-mono text-[0.95rem] font-bold">{v}</div>
                      <div className="font-mono text-[0.52rem] text-live">{d}</div>
                    </div>
                  ))}
                </div>
                {phase === "rollout" && (
                  <div className="flex gap-2 mt-4">
                    <Btn variant="danger" size="sm" onClick={() => (setPhase("idle"), toast("Rollout stopped · traffic returned to the previous version"))}>
                      Stop and roll back
                    </Btn>
                  </div>
                )}
                {phase === "live" && (
                  <div className="flex gap-2 mt-4">
                    <Btn variant="primary" size="sm" onClick={() => nav(`/app/p/${p.id}/observe`)}>
                      View monitoring →
                    </Btn>
                    <Btn size="sm" onClick={() => setDomainOpen(true)}>
                      Add custom domain
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setPhase("idle")}>
                      Back to history
                    </Btn>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <aside className="border-l border-line px-5 py-6 space-y-6 bg-surface/40">
        <div>
          <Label className="mb-2">environments</Label>
          {[
            ["production", p.status === "live" ? (p.url ?? `${p.id}.architect.app`) : "—", p.status === "live" ? "live" : "idle"],
            ["staging", `${p.id}.staging.architect.app`, "ready"],
            ["preview", "Per branch and pull request", "ready"],
          ].map(([e, u, s]) => (
            <div key={e} className="py-2.5 border-b border-line last:border-0">
              <div className="flex justify-between">
                <span className="font-mono text-[0.68rem] font-bold">{e}</span>
                <Status status={s} />
              </div>
              <div className="text-[0.75rem] text-dim truncate">{u}</div>
            </div>
          ))}
        </div>
        <div>
          <Label className="mb-2">domains</Label>
          <div className="text-[0.8rem] text-muted">{p.url ?? `${p.id}.architect.app`}</div>
          <button onClick={() => setDomainOpen(true)} className="text-[0.75rem] text-dim hover:text-fg mt-1 cursor-pointer">
            + Add custom domain
          </button>
        </div>
        <div>
          <Label className="mb-2">governance gate</Label>
          <div className="flex items-center gap-2">
            <Bar value={readiness} className="flex-1" tone={readiness >= 80 ? "neon" : readiness >= 60 ? "warn" : "danger"} />
            <span className="font-mono text-[0.62rem]">{readiness}</span>
          </div>
          <button onClick={() => nav(`/app/p/${p.id}/readiness`)} className="text-[0.75rem] text-dim hover:text-fg mt-1 cursor-pointer">
            View checklist →
          </button>
        </div>
        {mode === "dev" && (
          <div className="bg-ink border border-ink-line rounded-lg p-3">
            <Label className="!text-[#555] mb-1.5">cli</Label>
            <pre className="font-mono text-[0.58rem] text-[#aaa] m-0 whitespace-pre-wrap">
              $ architect deploy --env production --strategy canary{"\n"}$ architect rollback v22
            </pre>
          </div>
        )}
      </aside>

      <DomainModal open={domainOpen} onClose={() => setDomainOpen(false)} />
      <Modal open={!!rollbackOf} onClose={() => setRollbackOf(null)} title={`roll back to v${rollbackOf?.v}?`}>
        <p className="text-[0.85rem] text-muted m-0 leading-relaxed">
          Production traffic will move to v{rollbackOf?.v} ("{rollbackOf?.msg}") within approximately 10 seconds. Agent state is preserved; database migrations made after v{rollbackOf?.v} are <b>not</b> reverted. This action is recorded in the audit log.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={() => setRollbackOf(null)}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={() => {
              const target = rollbackOf!;
              setHistory(history.map((h) => (h.v === target.v ? { ...h, status: "live" } : h.status === "live" ? { ...h, status: "rolled back" } : h)));
              setRollbackOf(null);
              toast(`Rolled back · v${target.v} is now live`);
            }}
          >
            Confirm rollback
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

function DomainModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useStore();
  const [domain, setDomain] = useState("");
  const [step, setStep] = useState<"enter" | "dns" | "verifying" | "done">("enter");
  useEffect(() => {
    if (open) {
      setStep("enter");
      setDomain("");
    }
  }, [open]);
  useEffect(() => {
    if (step !== "verifying") return;
    const t = setTimeout(() => setStep("done"), 1500);
    return () => clearTimeout(t);
  }, [step]);
  return (
    <Modal open={open} onClose={onClose} title="custom domain">
      {step === "enter" && (
        <>
          <Field label="domain">
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="support.acme.com" autoFocus />
          </Field>
          <div className="flex justify-end mt-4">
            <Btn variant="primary" disabled={!domain.includes(".")} onClick={() => setStep("dns")}>
              Continue
            </Btn>
          </div>
        </>
      )}
      {step === "dns" && (
        <>
          <p className="text-[0.8rem] text-muted mt-0">Add the following record with your DNS provider:</p>
          <div className="grid grid-cols-[4rem_1fr_1fr] gap-px bg-line border border-line rounded-md overflow-hidden font-mono text-[0.62rem]">
            {["type", "name", "value", "CNAME", domain.split(".")[0], "cname.architect.app"].map((x, i) => (
              <div key={i} className={cx("bg-bg px-2.5 py-2", i < 3 && "text-dim text-[0.55rem] uppercase")}>
                {x}
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <Btn variant="primary" onClick={() => setStep("verifying")}>
              Verify
            </Btn>
          </div>
        </>
      )}
      {step === "verifying" && (
        <div className="font-mono text-[0.65rem] text-muted flex items-center gap-2 py-4">
          <Spinner /> Verifying DNS and issuing TLS certificate
        </div>
      )}
      {step === "done" && (
        <>
          <div className="font-mono text-[0.7rem] flex items-center gap-2">
            <Check size={12} className="text-live" /> {domain} is live with HTTPS
          </div>
          <div className="flex justify-end mt-4">
            <Btn
              variant="primary"
              onClick={() => {
                toast(`${domain} connected`);
                onClose();
              }}
            >
              Done
            </Btn>
          </div>
        </>
      )}
    </Modal>
  );
}
