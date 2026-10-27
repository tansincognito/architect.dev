import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileCode2, GitBranch, Sparkles, X } from "lucide-react";
import { Badge, Btn, Label, Pills, cx } from "../../components/ui";
import { FILES, TREE, highlight } from "../../lib/files";
import { useStore } from "../../lib/store";

const DIFF = [
  { t: " ", l: "guardrails:" },
  { t: " ", l: '  approval: "refunds > $100"' },
  { t: "-", l: "  injection_filter: false" },
  { t: "+", l: "  injection_filter: true" },
  { t: "+", l: "  pii_redaction: logs" },
  { t: " ", l: "budget:" },
];

const TERM_REPLIES: Record<string, string[]> = {
  "npm test": ["> vitest run", " ✓ tests/smoke.test.ts (8)", " ✓ tests/agents.test.ts (31)", "", " Test Files  2 passed", " Tests  39 passed"],
  "architect run classifier": ['> input: "Charged twice for march invoice"', '{"label":"refund","urgency":"high","confidence":0.94}', "trace: tr_9a01 · 412ms · $0.0008"],
  "git status": ["On branch main", "Changes not staged:", "  modified: architect.yaml"],
  help: ["npm test · architect run <agent> · git status · architect deploy · clear"],
  "architect deploy": ["→ use the deploy tab, or add --env production --yes"],
};

export default function CodeTab() {
  const { toast } = useStore();
  const [openFiles, setOpenFiles] = useState(["agents/graph.py", "agents/escalator.py"]);
  const [active, setActive] = useState("agents/graph.py");
  const [panel, setPanel] = useState<"terminal" | "changes" | "problems">("terminal");
  const [term, setTerm] = useState<string[]>(["architect sandbox · node 24 · python 3.13 · type 'help'"]);
  const [cmd, setCmd] = useState("");
  const [selLine, setSelLine] = useState<number | null>(null);
  const [ask, setAsk] = useState("");
  const termEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    termEnd.current?.scrollIntoView();
  }, [term]);

  const open = (f: string) => {
    if (!openFiles.includes(f)) setOpenFiles((x) => [...x, f]);
    setActive(f);
    setSelLine(null);
  };

  const close = (f: string) => {
    const rest = openFiles.filter((x) => x !== f);
    setOpenFiles(rest);
    if (active === f && rest.length) setActive(rest[rest.length - 1]);
  };

  const run = () => {
    const c = cmd.trim();
    if (!c) return;
    if (c === "clear") {
      setTerm([]);
    } else {
      setTerm((t) => [...t, `$ ${c}`, ...(TERM_REPLIES[c] ?? [`command not found in sandbox: ${c}`])]);
    }
    setCmd("");
  };

  const lines = (FILES[active] ?? "").split("\n");

  return (
    <div className="flex-1 grid grid-cols-[220px_1fr] min-h-0" style={{ height: "calc(100vh - 54px - 46px - 37px)" }}>
      <aside className="border-r border-line overflow-auto bg-surface/40">
        <div className="flex items-center justify-between px-3 py-2 border-b border-line">
          <Label>files</Label>
          <span className="font-mono text-[0.55rem] text-dim inline-flex items-center gap-1">
            <GitBranch size={9} /> main
          </span>
        </div>
        {TREE.map((d) => (
          <div key={d.dir} className="py-1">
            {d.dir && (
              <div className="px-3 py-1 text-[0.75rem] text-dim flex items-center gap-1">
                <ChevronDown size={9} /> {d.dir}/
              </div>
            )}
            {d.files.map((f) => {
              const path = d.dir ? `${d.dir}/${f}` : f;
              return (
                <button
                  key={path}
                  onClick={() => open(path)}
                  className={cx("w-full text-left font-mono text-[0.62rem] py-1 flex items-center gap-1.5 cursor-pointer", d.dir ? "pl-7" : "pl-3", active === path ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")}
                >
                  <FileCode2 size={10} className="text-dim" />
                  {f}
                  {path === "architect.yaml" && <span className="ml-auto mr-2 text-warn text-[0.55rem]">M</span>}
                </button>
              );
            })}
          </div>
        ))}
      </aside>

      <div className="flex flex-col min-h-0 bg-ink text-[#ddd]">
        <div className="flex border-b border-ink-line overflow-x-auto shrink-0">
          {openFiles.map((f) => (
            <div
              key={f}
              className={cx("flex items-center gap-2 px-3 py-2 font-mono text-[0.6rem] border-r border-ink-line cursor-pointer", active === f ? "bg-[#151515] text-white" : "text-[#666] hover:text-[#aaa]")}
              onClick={() => setActive(f)}
            >
              {f.split("/").pop()}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  close(f);
                }}
                className="text-[#555] hover:text-white cursor-pointer"
              >
                <X size={9} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto font-mono text-[0.68rem] leading-[1.75] py-2 relative">
          {lines.map((l, i) => (
            <div key={i} onClick={() => setSelLine(i)} className={cx("flex cursor-text", selLine === i ? "bg-[#b8f000]/10" : "hover:bg-white/[0.02]")}>
              <span className="w-12 text-right pr-4 text-[#3a3a3a] select-none shrink-0">{i + 1}</span>
              <span className="whitespace-pre" dangerouslySetInnerHTML={{ __html: highlight(l) || " " }} />
            </div>
          ))}
          {selLine !== null && (
            <div className="sticky bottom-3 mx-auto w-fit flex items-center gap-2 bg-[#161616] border border-[#2a2a2a] rounded-lg px-2 py-1.5 shadow-xl rise">
              <Sparkles size={11} className="text-neon" />
              <input
                autoFocus
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && ask.trim()) {
                    toast(`Architect edited ${active}:${selLine + 1} · review under Changes`);
                    setAsk("");
                    setSelLine(null);
                    setPanel("changes");
                  }
                  if (e.key === "Escape") setSelLine(null);
                }}
                placeholder={`ask about line ${selLine + 1}… (e.g. explain, refactor, add test)`}
                className="bg-transparent outline-none font-mono text-[0.62rem] w-[320px] placeholder:text-[#555]"
              />
              <span className="font-mono text-[0.5rem] text-[#555]">⌘I</span>
            </div>
          )}
        </div>

        <div className="h-[200px] border-t border-ink-line flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3 py-1 border-b border-ink-line">
            <div data-theme="dark">
              <Pills
                items={[
                  { value: "terminal" as const, label: "terminal" },
                  { value: "changes" as const, label: <>changes <Badge tone="dark">1</Badge></> },
                  { value: "problems" as const, label: "problems" },
                ]}
                value={panel}
                onChange={setPanel}
              />
            </div>
          </div>
          {panel === "terminal" && (
            <div className="flex-1 overflow-auto px-3 py-2 font-mono text-[0.62rem] text-[#999]" onClick={() => document.getElementById("term-in")?.focus()}>
              {term.map((l, i) => (
                <div key={i} className={l.startsWith("$") ? "text-white" : l.includes("✓") || l.includes("passed") ? "text-neon" : ""}>
                  {l || " "}
                </div>
              ))}
              <div className="flex gap-2">
                <span className="text-neon">$</span>
                <input
                  id="term-in"
                  value={cmd}
                  onChange={(e) => setCmd(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && run()}
                  className="flex-1 bg-transparent outline-none text-white"
                  placeholder="npm test"
                />
              </div>
              <div ref={termEnd} />
            </div>
          )}
          {panel === "changes" && (
            <div className="flex-1 overflow-auto px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[0.6rem] text-[#aaa]">architect.yaml · from governance remediation</span>
                <div className="flex gap-1.5">
                  <Btn size="sm" variant="dark" onClick={() => toast("Change discarded")}>
                    Discard
                  </Btn>
                  <Btn size="sm" variant="primary" onClick={() => toast("Committed to main · c4e19ab")}>
                    Commit
                  </Btn>
                </div>
              </div>
              {DIFF.map((d, i) => (
                <div key={i} className={cx("font-mono text-[0.62rem] px-2", d.t === "+" ? "bg-[#5dba00]/15 text-[#a3e635]" : d.t === "-" ? "bg-[#dc2626]/15 text-[#f87171]" : "text-[#777]")}>
                  {d.t} {d.l}
                </div>
              ))}
            </div>
          )}
          {panel === "problems" && <div className="flex-1 px-3 py-2 font-mono text-[0.62rem] text-[#777]">No problems · type check passed · 0 lint warnings</div>}
        </div>
      </div>
    </div>
  );
}
