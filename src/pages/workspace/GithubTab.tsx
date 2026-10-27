import { useState } from "react";
import { Check, GitBranch, GitCommitHorizontal, GitPullRequest, Lock, RefreshCw, Search } from "lucide-react";
import { Badge, Btn, Field, GithubMark, Input, Label, Modal, Pills, Spinner, Toggle, cx } from "../../components/ui";
import { scenarioFor } from "../../lib/scenarios";
import { handleOf, useShared, useStore } from "../../lib/store";
import { useProject } from "./Workspace";

const REPOS = ["acme/support-triage", "acme/billing-dash", "acme/web", "acme/data-pipelines", "acme/infra"];

interface Commit {
  sha: string;
  msg: string;
  by: string;
  human: boolean;
  when: string;
  src: string;
}

interface PR {
  n: number;
  title: string;
  branch: string;
  checks: string;
  reviewers: string;
}

const sha = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16).padStart(7, "0").slice(0, 7);
const branchOf = (s: string) => "architect/" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").split("-").slice(0, 4).join("-");

interface GhState {
  connected: boolean;
  repo: string;
  strategy: string;
}

export default function GithubTab() {
  const p = useProject();
  const { toast, user, updateProject } = useStore();
  const scenario = scenarioFor(p);
  const first = user?.name.split(" ")[0] ?? "you";
  const handle = handleOf(user);
  const [changes] = useShared<string[]>(`changes.${p.id}`, () => []);
  const [gh, setGh] = useShared<GhState>(`github.${p.id}`, () => ({ connected: !!p.repo, repo: p.repo ?? "", strategy: "pull request per change" }));
  const [step, setStep] = useState<"intro" | "auth" | "repo" | "strategy" | "linking">("intro");
  const [mode, setMode] = useState<"create new" | "link existing">("create new");
  const [org, setOrg] = useState("acme");
  const [name, setName] = useState(p.id);
  const [pick, setPick] = useState("");
  const [q, setQ] = useState("");
  const [strategy, setStrategy] = useState("pull request per change");
  const [prOpen, setPrOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [protect, setProtect] = useState({ review: true, evals: true, signed: false });

  if (!gh.connected) {
    return (
      <div className="flex-1 max-w-[640px] w-full mx-auto px-4 py-10">
        {step === "intro" && (
          <div className="rise text-center">
            <GithubMark size={34} />
            <h2 className="text-[1.5rem] font-semibold tracking-[-0.02em] mt-4 mb-1">Connect this project to GitHub</h2>
            <p className="text-[0.85rem] text-muted max-w-[460px] mx-auto">
              Every change made in Architect becomes a commit in your repository. Engineers can work in their own tools and changes sync back automatically.
            </p>
            <Btn variant="dark" size="lg" className="mt-6" onClick={() => setStep("auth")}>
              <GithubMark /> Connect GitHub
            </Btn>
          </div>
        )}
        {step === "auth" && (
          <div className="rise border border-line rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <GithubMark size={22} />
              <div>
                <div className="text-[0.95rem] font-semibold">Authorise Architect</div>
                <div className="text-[0.75rem] text-dim">github.com/apps/architect-dev</div>
              </div>
            </div>
            <Label className="mb-2">requested permissions</Label>
            {["Read and write code on selected repositories", "Create branches and pull requests", "Read organisation membership", "Receive push and pull request events"].map((x) => (
              <div key={x} className="flex items-center gap-2 text-[0.8rem] py-1">
                <Check size={12} className="text-live" /> {x}
              </div>
            ))}
            <div className="flex justify-end gap-2 mt-5">
              <Btn variant="ghost" onClick={() => setStep("intro")}>
                Cancel
              </Btn>
              <Btn variant="primary" onClick={() => setStep("repo")}>
                Authorise
              </Btn>
            </div>
          </div>
        )}
        {step === "repo" && (
          <div className="rise">
            <h2 className="text-[1.4rem] font-semibold tracking-[-0.02em] m-0 mb-4">Choose a repository</h2>
            <Pills items={["create new", "link existing"] as const} value={mode} onChange={setMode} className="mb-4" />
            {mode === "create new" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-[160px_1fr] gap-2">
                  <Field label="owner">
                    <select value={org} onChange={(e) => setOrg(e.target.value)} className="w-full bg-bg border border-line-2 rounded-[7px] px-2 py-2 text-[0.85rem] text-fg">
                      <option>acme</option>
                      <option>acme-labs</option>
                      <option>{handle}</option>
                    </select>
                  </Field>
                  <Field label="repository name">
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                </div>
                <div className="flex items-center gap-2 text-[0.8rem] text-muted">
                  <Lock size={12} /> Private repository · visible to members of {org}
                </div>
              </div>
            ) : (
              <div>
                <div className="relative mb-2">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search repositories" className="pl-8" />
                </div>
                <div className="border border-line rounded-lg overflow-hidden">
                  {[...REPOS, `${handle}/sandbox`].filter((r) => r.includes(q)).map((r) => (
                    <button key={r} onClick={() => setPick(r)} className={cx("w-full text-left px-3 py-2.5 border-b border-line last:border-0 flex items-center gap-2 cursor-pointer", pick === r ? "bg-surface" : "hover:bg-surface/60")}>
                      <Lock size={10} className="text-dim" />
                      <span className="font-mono text-[0.75rem] flex-1">{r}</span>
                      {pick === r && <Check size={12} className="text-live" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <Btn variant="ghost" onClick={() => setStep("auth")}>
                Back
              </Btn>
              <Btn variant="primary" disabled={mode === "link existing" && !pick} onClick={() => setStep("strategy")}>
                Continue
              </Btn>
            </div>
          </div>
        )}
        {step === "strategy" && (
          <div className="rise">
            <h2 className="text-[1.4rem] font-semibold tracking-[-0.02em] m-0 mb-1">How should changes reach the repository?</h2>
            <p className="text-[0.85rem] text-muted mb-4">Choose the level of review your engineering team requires.</p>
            {[
              ["pull request per change", "Each request opens a pull request for review. Recommended for production systems."],
              ["daily batched pull request", "Changes collect on a branch and are proposed once per day."],
              ["commit directly to main", "Fastest. Suitable for prototypes and internal tools."],
            ].map(([k, d]) => (
              <button key={k} onClick={() => setStrategy(k)} className={cx("w-full text-left p-4 rounded-lg border mb-2 cursor-pointer", strategy === k ? "border-fg bg-surface" : "border-line hover:border-line-2")}>
                <div className="text-[0.9rem] font-semibold capitalize">{k}</div>
                <div className="text-[0.78rem] text-muted mt-0.5">{d}</div>
              </button>
            ))}
            <div className="flex justify-end gap-2 mt-3">
              <Btn variant="ghost" onClick={() => setStep("repo")}>
                Back
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  setStep("linking");
                  setTimeout(() => {
                    const repo = mode === "create new" ? `${org}/${name}` : pick;
                    setGh({ connected: true, repo, strategy });
                    updateProject(p.id, { repo });
                    toast("Repository connected · initial commit pushed");
                  }, 1400);
                }}
              >
                Connect repository
              </Btn>
            </div>
          </div>
        )}
        {step === "linking" && (
          <div className="flex items-center justify-center gap-2 text-[0.9rem] text-muted py-20">
            <Spinner /> Pushing project history and configuring webhooks
          </div>
        )}
      </div>
    );
  }

  const perChange = gh.strategy === "pull request per change";
  const prs: PR[] = p.isNew
    ? perChange
      ? changes.map((c, i) => ({ n: changes.length - i, title: c, branch: branchOf(c), checks: i === changes.length - 1 ? "running" : "passing", reviewers: "—" })).reverse()
      : []
    : [
        { n: 42, title: "Governance remediations (10 controls)", branch: "architect/governance-fixes", checks: "passing", reviewers: "priya-sharma" },
        { n: 41, title: scenario.followUp.ask, branch: branchOf(scenario.followUp.ask), checks: "running", reviewers: "—" },
      ];
  const commits: Commit[] = p.isNew
    ? [
        ...(perChange ? [] : changes.map((c) => ({ sha: sha(c), msg: c, by: "Architect", human: false, when: "just now", src: `requested by ${first}` })).reverse()),
        { sha: sha(p.id), msg: `Initial build: ${scenario.label.toLowerCase()}`, by: "Architect", human: false, when: "just now", src: `requested by ${first}` },
      ]
    : [
        { sha: "c4e19ab", msg: "Enable prompt-injection filter and PII redaction", by: "Architect", human: false, when: "12m ago", src: "governance remediation" },
        { sha: "a1f9c2e", msg: scenario.changelog[0], by: "Architect", human: false, when: "2h ago", src: `requested by ${first}` },
        { sha: "9d02b7f", msg: "Tighten approval timeout to 4h", by: "priya-sharma", human: true, when: "5h ago", src: "VS Code · architect sync" },
        { sha: "77be010", msg: scenario.changelog[1], by: "Architect", human: false, when: "1d ago", src: `requested by ${first}` },
      ];
  const nextPr = (prs[0]?.n ?? 0) + 1;
  const prDraft = p.isNew ? (changes[changes.length - 1] ?? "Initial build review") : "Enable prompt-injection filter and PII redaction";

  return (
    <div className="flex-1 grid lg:grid-cols-[1fr_320px] min-h-0">
      <section className="px-4 md:px-8 py-6 overflow-auto">
        <div className="flex items-center justify-between mb-5 gap-4">
          <div className="flex items-center gap-3">
            <GithubMark size={20} />
            <div>
              <div className="font-mono text-[0.9rem] font-bold">{gh.repo}</div>
              <div className="text-[0.75rem] text-dim">
                {syncing ? "Syncing…" : `In sync · last synced ${p.isNew ? "just now" : "12 minutes ago"}`} · {gh.strategy}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Btn
              size="sm"
              onClick={() => {
                setSyncing(true);
                setTimeout(() => (setSyncing(false), toast("Pulled 1 commit from main · preview updated")), 1100);
              }}
            >
              {syncing ? <Spinner /> : <RefreshCw size={11} />} Sync now
            </Btn>
            <Btn size="sm" variant="primary" onClick={() => setPrOpen(true)}>
              <GitPullRequest size={11} /> Open pull request
            </Btn>
          </div>
        </div>

        <Label className="mb-2">open pull requests</Label>
        <div className="border border-line rounded-lg overflow-hidden mb-6">
          {prs.length === 0 && (
            <div className="px-4 py-5 text-[0.8rem] text-dim">
              {perChange ? "No open pull requests. Each change you request in the workspace opens one here." : "Changes are committed according to your strategy; no pull requests are open."}
            </div>
          )}
          {prs.map((pr) => (
            <div key={pr.n} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
              <GitPullRequest size={13} className="text-live" />
              <div className="flex-1 min-w-0">
                <div className="text-[0.85rem] font-medium truncate">
                  {pr.title} <span className="text-dim font-normal">#{pr.n}</span>
                </div>
                <div className="font-mono text-[0.6rem] text-dim">
                  {pr.branch} → main · reviewer: {pr.reviewers}
                </div>
              </div>
              <Badge tone={pr.checks === "passing" ? "neon" : "warn"}>checks {pr.checks}</Badge>
              <Btn size="sm" variant="ghost" onClick={() => toast(`Opening #${pr.n} on GitHub`)}>
                View
              </Btn>
            </div>
          ))}
        </div>

        <Label className="mb-2">recent commits · main</Label>
        <div className="border border-line rounded-lg overflow-hidden">
          {commits.map((c) => (
            <div key={c.sha} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
              <GitCommitHorizontal size={13} className="text-dim" />
              <div className="flex-1 min-w-0">
                <div className="text-[0.85rem] truncate">{c.msg}</div>
                <div className="text-[0.72rem] text-dim">
                  <span className={c.human ? "text-fg" : "text-neon-ink"}>{c.by}</span> · {c.src} · {c.when}
                </div>
              </div>
              <span className="font-mono text-[0.62rem] text-dim">{c.sha}</span>
            </div>
          ))}
        </div>
      </section>

      <aside className="border-l border-line px-5 py-6 space-y-6 bg-surface/40">
        <div>
          <Label className="mb-2">branch protection</Label>
          {(
            [
              ["review", "Require one approving review"],
              ["evals", "Run quality evaluation on every pull request"],
              ["signed", "Require signed commits"],
            ] as const
          ).map(([k, l]) => (
            <div key={k} className="flex items-center justify-between py-2">
              <span className="text-[0.8rem]">{l}</span>
              <Toggle on={protect[k]} onChange={(v) => setProtect({ ...protect, [k]: v })} />
            </div>
          ))}
        </div>
        <div>
          <Label className="mb-2">branches</Label>
          {["main", ...prs.map((x) => x.branch)].map((b) => (
            <div key={b} className="font-mono text-[0.68rem] py-1.5 flex items-center gap-1.5">
              <GitBranch size={10} className="text-dim" /> {b}
            </div>
          ))}
        </div>
        <div>
          <Label className="mb-2">local development</Label>
          <pre className="bg-ink text-[#aaa] border border-ink-line rounded-md p-3 font-mono text-[0.6rem] m-0 whitespace-pre-wrap">
            git clone git@github.com:{gh.repo}.git{"\n"}architect link {p.id}
          </pre>
        </div>
        <button onClick={() => (setGh({ ...gh, connected: false }), setStep("intro"))} className="text-[0.75rem] text-danger hover:underline cursor-pointer">
          Disconnect repository
        </button>
      </aside>

      <Modal open={prOpen} onClose={() => setPrOpen(false)} title="Open pull request" width={600}>
        <div className="space-y-3">
          <Field label="title">
            <Input defaultValue={prDraft} />
          </Field>
          <Field label="description · generated by Architect">
            <textarea
              rows={8}
              className="w-full bg-bg border border-line-2 rounded-[7px] px-3 py-2 text-[0.8rem] leading-relaxed text-fg outline-none focus:border-fg resize-none"
              defaultValue={`## Summary\n${prDraft}.\n\n## Verification\n- ${scenario.tests}/${scenario.tests} automated tests passing\n- Quality evaluation: no regressions against the current baseline\n\nRequested by: ${first}`}
            />
          </Field>
          <div className="text-[0.75rem] text-dim">{branchOf(prDraft)} → main · reviewers: priya-sharma (auto-assigned via CODEOWNERS)</div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={() => setPrOpen(false)}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={() => {
              setPrOpen(false);
              toast(`Pull request #${nextPr} opened · reviewers notified`);
            }}
          >
            Create pull request
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
