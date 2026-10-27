import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Archive, Check, Frame, GitBranch, Link2, Lock, Search } from "lucide-react";
import { Badge, Bar, Btn, Field, GithubMark, Input, Label, Spinner, cx } from "../components/ui";
import { useStore } from "../lib/store";

type Source = "github" | "gitlab" | "zip" | "url" | "figma";
type Stage = "source" | "pick" | "analyse" | "report";

const SOURCES: { id: Source; name: string; d: string; icon: React.ReactNode }[] = [
  { id: "github", name: "GitHub", d: "Organisation or personal repositories", icon: <GithubMark size={16} /> },
  { id: "gitlab", name: "GitLab", d: "Cloud or self-managed", icon: <GitBranch size={16} /> },
  { id: "url", name: "Git URL", d: "Any HTTPS or SSH remote", icon: <Link2 size={16} /> },
  { id: "zip", name: "Archive upload", d: ".zip or .tar.gz up to 500 MB", icon: <Archive size={16} /> },
  { id: "figma", name: "Figma design", d: "Generate an application from a design file", icon: <Frame size={16} /> },
];

const REPOS = [
  { name: "acme/billing-dash", lang: "TypeScript", updated: "2d ago" },
  { name: "acme/claims-processor", lang: "Python", updated: "5d ago" },
  { name: "acme/hr-helpdesk-bot", lang: "Python", updated: "3w ago" },
  { name: "acme/web", lang: "TypeScript", updated: "1h ago" },
];

const ANALYSIS = [
  "Cloning repository (main, 1,842 commits)",
  "Detecting languages and frameworks",
  "Indexing 412 files for search and context",
  "Locating existing AI agents and prompts",
  "Scanning for exposed credentials",
  "Mapping data models and external services",
  "Running existing test suite",
  "Calculating governance baseline",
];

export default function Import() {
  const nav = useNavigate();
  const { addProject, toast } = useStore();
  const [source, setSource] = useState<Source>("github");
  const [stage, setStage] = useState<Stage>("source");
  const [repo, setRepo] = useState("acme/claims-processor");
  const [url, setUrl] = useState("");
  const [q, setQ] = useState("");
  const [n, setN] = useState(0);

  useEffect(() => {
    if (stage !== "analyse") return;
    if (n >= ANALYSIS.length) {
      const t = setTimeout(() => setStage("report"), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN((x) => x + 1), 420);
    return () => clearTimeout(t);
  }, [stage, n]);

  const id = (source === "url" && url ? url.split("/").pop()?.replace(".git", "") : repo.split("/")[1]) || "imported-project";

  const open = () => {
    addProject({
      id,
      name: id,
      desc: "Imported and indexed. Ready for changes.",
      stack: "Python · FastAPI · LangChain",
      kind: "imported",
      status: "draft",
      updated: "just now",
      prompts: 0,
      repo,
      framework: "LangChain",
      readiness: 41,
    });
    toast(`${id} imported · Architect has full context of the codebase`);
    nav(`/app/p/${id}`);
  };

  return (
    <main className="flex-1 max-w-[880px] w-full mx-auto px-4 md:px-8 py-10">
      <Label className="mb-1">import project</Label>
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.02em] m-0">Bring an existing application into Architect</h1>
      <p className="text-[0.88rem] text-muted mt-1.5 mb-8">Architect analyses the code, identifies agents and risks, then lets your team continue with full context.</p>

      <div className="flex gap-1 mb-8">
        {["Source", "Select", "Analysis", "Report"].map((s, i) => {
          const idx = ["source", "pick", "analyse", "report"].indexOf(stage);
          return (
            <div key={s} className="flex-1">
              <div className={cx("h-[3px] rounded-full", i <= idx ? "bg-neon" : "bg-surface-2")} />
              <div className={cx("text-[0.72rem] mt-1.5", i === idx ? "text-fg font-medium" : "text-dim")}>{s}</div>
            </div>
          );
        })}
      </div>

      {stage === "source" && (
        <div className="rise">
          <div className="grid sm:grid-cols-2 gap-2">
            {SOURCES.map((s) => (
              <button key={s.id} onClick={() => setSource(s.id)} className={cx("text-left p-4 rounded-lg border flex gap-3 items-start cursor-pointer", source === s.id ? "border-fg bg-surface" : "border-line hover:border-line-2")}>
                <span className="mt-0.5">{s.icon}</span>
                <span>
                  <span className="block text-[0.9rem] font-semibold">{s.name}</span>
                  <span className="block text-[0.75rem] text-muted">{s.d}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Btn variant="primary" onClick={() => setStage("pick")}>
              Continue →
            </Btn>
          </div>
        </div>
      )}

      {stage === "pick" && (
        <div className="rise">
          {source === "github" || source === "gitlab" ? (
            <>
              <div className="relative mb-2">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search repositories" className="pl-8" />
              </div>
              <div className="border border-line rounded-lg overflow-hidden">
                {REPOS.filter((r) => r.name.includes(q)).map((r) => (
                  <button key={r.name} onClick={() => setRepo(r.name)} className={cx("w-full text-left px-4 py-3 border-b border-line last:border-0 flex items-center gap-3 cursor-pointer", repo === r.name ? "bg-surface" : "hover:bg-surface/60")}>
                    <Lock size={11} className="text-dim" />
                    <span className="font-mono text-[0.78rem] flex-1">{r.name}</span>
                    <span className="text-[0.72rem] text-dim">{r.lang}</span>
                    <span className="text-[0.72rem] text-dim w-14 text-right">{r.updated}</span>
                    {repo === r.name && <Check size={13} className="text-live" />}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Field label="branch">
                  <Input defaultValue="main" />
                </Field>
                <Field label="root directory" hint="For monorepos">
                  <Input defaultValue="/" />
                </Field>
              </div>
            </>
          ) : source === "url" ? (
            <Field label="repository url" hint="Private repositories require a deploy key, which Architect will generate.">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="git@gitlab.acme.internal:ops/claims-processor.git" autoFocus />
            </Field>
          ) : source === "zip" ? (
            <button onClick={() => toast("claims-processor.zip selected (38 MB)")} className="w-full border-2 border-dashed border-line-2 rounded-lg py-14 text-center cursor-pointer hover:border-fg">
              <Archive size={20} className="mx-auto text-dim" />
              <div className="text-[0.9rem] mt-2">Drop an archive or click to browse</div>
              <div className="text-[0.75rem] text-dim mt-1">We will create a private repository for it in your organisation</div>
            </button>
          ) : (
            <Field label="figma file or frame url">
              <Input placeholder="https://www.figma.com/design/…" autoFocus />
            </Field>
          )}
          <div className="flex justify-between mt-6">
            <Btn variant="ghost" onClick={() => setStage("source")}>
              ← Back
            </Btn>
            <Btn variant="primary" onClick={() => (setN(0), setStage("analyse"))}>
              Import and analyse →
            </Btn>
          </div>
        </div>
      )}

      {stage === "analyse" && (
        <div className="rise border border-line rounded-xl p-6">
          <div className="flex justify-between mb-2">
            <span className="text-[0.9rem] font-semibold">Analysing {repo}</span>
            <span className="font-mono text-[0.7rem] text-dim">
              {Math.min(n, ANALYSIS.length)}/{ANALYSIS.length}
            </span>
          </div>
          <Bar value={(n / ANALYSIS.length) * 100} className="mb-5" />
          {ANALYSIS.map((a, i) => (
            <div key={a} className={cx("flex items-center gap-2.5 py-1.5 text-[0.85rem]", i < n ? "text-muted" : i === n ? "text-fg" : "text-dim")}>
              <span className="w-4 flex justify-center">{i < n ? <Check size={12} className="text-live" /> : i === n ? <Spinner className="!w-2.5 !h-2.5" /> : <span className="w-1 h-1 rounded-full bg-line-2" />}</span>
              {a}
            </div>
          ))}
        </div>
      )}

      {stage === "report" && (
        <div className="rise space-y-5">
          <div className="grid sm:grid-cols-4 gap-px bg-line border border-line rounded-lg overflow-hidden">
            {[
              ["Stack", "Python · FastAPI"],
              ["Agent framework", "LangChain 0.3"],
              ["Files indexed", "412"],
              ["Governance baseline", "41 / 100"],
            ].map(([k, v]) => (
              <div key={k} className="bg-bg p-4">
                <div className="text-[0.72rem] text-dim">{k}</div>
                <div className="text-[1rem] font-semibold mt-0.5">{v}</div>
              </div>
            ))}
          </div>

          <div>
            <Label className="mb-2">agents found</Label>
            <div className="border border-line rounded-lg overflow-hidden">
              {[
                ["claims_triage", "agents/triage.py", "gpt-4o · 3 tools"],
                ["document_reader", "agents/reader.py", "gpt-4o-mini · OCR tool"],
                ["fraud_checker", "agents/fraud.py", "rule-based + LLM review"],
              ].map(([n2, f, d]) => (
                <div key={n2} className="flex items-center gap-3 px-4 py-2.5 border-b border-line last:border-0">
                  <span className="font-mono text-[0.75rem] font-bold w-40">{n2}</span>
                  <span className="font-mono text-[0.68rem] text-dim flex-1">{f}</span>
                  <span className="text-[0.75rem] text-muted">{d}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2">findings</Label>
            <div className="border border-line rounded-lg overflow-hidden">
              {[
                ["danger", "API key committed in config/settings.py (line 14)", "Move to vault"],
                ["warn", "No human approval on payouts above $10,000", "Add approval step"],
                ["warn", "No tracing or evaluation configured", "Enable"],
                ["neutral", "Test coverage 34% · 61 tests passing", null],
              ].map(([tone, t, a]) => (
                <div key={t} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
                  <AlertTriangle size={13} className={tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "text-dim"} />
                  <span className="text-[0.85rem] flex-1">{t}</span>
                  {a && <Badge tone={tone as "danger" | "warn"}>{a}</Badge>}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-line rounded-lg p-4">
            <Label className="mb-2">suggested first requests</Label>
            <ul className="list-none p-0 m-0 space-y-1.5 text-[0.85rem]">
              <li>→ "Move all credentials to the vault and rotate the exposed key"</li>
              <li>→ "Require manager approval for payouts over $10,000"</li>
              <li>→ "Add a dashboard showing claims processed per day"</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setStage("source")}>
              Import another
            </Btn>
            <Btn variant="primary" size="lg" onClick={open}>
              Open project →
            </Btn>
          </div>
        </div>
      )}
    </main>
  );
}
