import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, HelpCircle, History, Monitor, MousePointerClick, RotateCcw, RotateCw, Smartphone, Tablet, X } from "lucide-react";
import { AppPreview } from "../../components/AppPreview";
import { Badge, Btn, Label, Spinner, cx } from "../../components/ui";
import { scenarioFor, type Scenario } from "../../lib/scenarios";
import { useShared, useStore } from "../../lib/store";
import { useProject } from "./Workspace";

interface Msg {
  id: number;
  role: "user" | "ai";
  text: string;
  steps?: string[];
  files?: string[];
  checkpoint?: number;
  pending?: boolean;
  target?: string;
}

function initialMsgs(s: Scenario, prompt: string, isNew: boolean): Msg[] {
  const first: Msg[] = [
    { id: 1, role: "user", text: prompt },
    {
      id: 2,
      role: "ai",
      text: s.summary,
      steps: [`${s.plan.length + 2} plan items delivered`, "21 files generated", `${s.tests} automated tests passing`],
      files: s.steps.slice(2, 5).map((x) => x.files[0]),
      checkpoint: 1,
    },
  ];
  if (isNew) return first;
  return [
    ...first,
    { id: 3, role: "user", text: s.followUp.ask },
    { id: 4, role: "ai", text: s.followUp.reply, steps: [`${s.followUp.files.length} files updated`], files: s.followUp.files, checkpoint: 2 },
  ];
}

export default function BuildTab() {
  const p = useProject();
  const scenario = scenarioFor(p);
  const { mode, spend, toast } = useStore();
  const [msgs, setMsgs] = useShared<Msg[]>(`chat.${p.id}`, () => initialMsgs(scenario, p.prompt ?? scenario.seedPrompt, !!p.isNew));
  const [changes, setChanges] = useShared<string[]>(`changes.${p.id}`, () => []);
  const [text, setText] = useState("");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeline, setTimeline] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const [explain, setExplain] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const checkpoints = msgs.filter((m) => m.checkpoint).map((m) => m.checkpoint!);
  const latest = checkpoints[checkpoints.length - 1] ?? 1;
  /** Restore point that holds the initial build; each later point adds one change. */
  const latestBase = p.isNew ? 1 : 2;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = () => {
    if (!text.trim()) return;
    const id = Date.now();
    const target = selected ?? undefined;
    const request = text.trim();
    const base: Msg[] = [...msgs, { id, role: "user", text: request, target }];
    setMsgs([...base, { id: id + 1, role: "ai", text: "", pending: true }]);
    setText("");
    setSelected(null);
    setPicking(false);
    setTimeout(() => {
      spend(3);
      setChanges([...changes, request]);
      setMsgs([
        ...base,
        {
          id: id + 1,
          role: "ai",
          text: target ? `The ${target} has been updated as requested. The preview reflects the change.` : `Added “${request}”. The preview has been updated.`,
          steps: ["1 file updated", "all tests passing"],
          files: [target ? `components/${target}.tsx` : `app${scenario.path}/page.tsx`],
          checkpoint: latest + 1,
        },
      ]);
    }, 1600);
  };

  const deviceW = { desktop: "100%", tablet: "768px", mobile: "390px" }[device];

  return (
    <div className="flex-1 grid lg:grid-cols-[400px_1fr] min-h-0" style={{ height: "calc(100vh - 54px - 46px - 37px)" }}>
      {/* chat */}
      <div className="border-r border-line flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 py-2 border-b border-line">
          <Label>conversation · {msgs.filter((m) => m.role === "user").length} requests</Label>
          <button
            onClick={() => setTimeline((t) => !t)}
            className={cx("text-[0.75rem] inline-flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded", timeline ? "bg-surface-2 text-fg" : "text-dim hover:text-fg")}
          >
            <History size={10} /> Version history ({checkpoints.length})
          </button>
        </div>

        {timeline && (
          <div className="border-b border-line bg-surface px-4 py-3 rise">
            <Label className="mb-2">restore points · select to preview, then restore</Label>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {checkpoints.map((c, i) => (
                <div key={c} className="flex items-center gap-1">
                  <button
                    onClick={() => setViewing(c === latest ? null : c)}
                    className={cx(
                      "font-mono text-[0.58rem] px-2 py-1 rounded border cursor-pointer whitespace-nowrap",
                      (viewing ?? latest) === c ? "bg-fg text-bg border-fg" : "border-line-2 text-muted hover:text-fg",
                    )}
                  >
                    #{c}
                    {c === latest && " · current"}
                  </button>
                  {i < checkpoints.length - 1 && <span className="w-3 h-px bg-line-2" />}
                </div>
              ))}
            </div>
            {viewing && (
              <div className="flex items-center justify-between mt-2.5 rise">
                <span className="text-[0.75rem] text-warn">Previewing restore point #{viewing} (read-only)</span>
                <div className="flex gap-1.5">
                  <Btn size="sm" variant="ghost" onClick={() => setViewing(null)}>
                    Cancel
                  </Btn>
                  <Btn
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      toast(`Restored point #${viewing}. Later changes preserved on a separate branch.`);
                      setMsgs(msgs.slice(0, msgs.findIndex((x) => x.checkpoint === viewing) + 1));
                      setChanges(changes.slice(0, Math.max(0, viewing - latestBase)));
                      setViewing(null);
                    }}
                  >
                    <RotateCcw size={10} /> Restore
                  </Btn>
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={listRef} className="flex-1 overflow-auto px-4 py-4 space-y-4">
          {msgs.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] bg-surface border border-line rounded-[10px] rounded-br-[3px] px-3 py-2 text-[0.85rem]">
                  {m.target && (
                    <div className="mb-1">
                      <Badge tone="neon">
                        <MousePointerClick size={9} /> {m.target}
                      </Badge>
                    </div>
                  )}
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className="rise">
                {m.pending ? (
                  <div className="text-[0.82rem] text-muted flex items-center gap-2">
                    <Spinner /> Working<span className="caret" />
                  </div>
                ) : (
                  <>
                    <div className="text-[0.88rem] leading-relaxed">{m.text}</div>
                    {m.steps && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.steps.map((s) => (
                          <span key={s} className="text-[0.72rem] text-muted inline-flex items-center gap-1 mr-2">
                            <Check size={9} className="text-live" /> {s}
                          </span>
                        ))}
                      </div>
                    )}
                    {mode === "dev" && m.files && (
                      <div className="mt-2 border border-line rounded-md overflow-hidden">
                        {m.files.map((f) => (
                          <div key={f} className="flex justify-between px-2.5 py-1 font-mono text-[0.58rem] border-b border-line last:border-0">
                            <span className="text-muted">{f}</span>
                            <span>
                              <span className="text-live">+{(f.length * 3) % 40 + 4}</span> <span className="text-danger">-{f.length % 7}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {m.checkpoint && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-mono text-[0.52rem] text-dim uppercase tracking-[0.08em]">restore point #{m.checkpoint}</span>
                        <button onClick={() => toast(`Reverted to the version before #${m.checkpoint}`)} className="font-mono text-[0.55rem] text-dim hover:text-fg inline-flex items-center gap-0.5 cursor-pointer">
                          <RotateCcw size={9} /> Undo
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ),
          )}
        </div>

        <div className="p-3 border-t border-line">
          {selected && (
            <div className="flex items-center justify-between mb-2 rise">
              <Badge tone="neon">
                <MousePointerClick size={9} /> editing: {selected}
              </Badge>
              <button onClick={() => setSelected(null)} className="text-dim hover:text-fg cursor-pointer">
                <X size={11} />
              </button>
            </div>
          )}
          <div className="bg-ink border border-ink-line rounded-[10px] p-2.5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder={selected ? `Describe the change to ${selected}` : "Request a change…"}
              className="w-full bg-transparent outline-none resize-none text-[0.88rem] text-[#eee] placeholder:text-[#555]"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <button
                  onClick={() => setPicking((x) => !x)}
                  title="click an element in the preview to edit it"
                  className={cx(
                    "text-[0.7rem] px-1.5 py-1 rounded inline-flex items-center gap-1 cursor-pointer",
                    picking ? "bg-neon text-[#0a0a0a]" : "text-[#666] hover:text-[#bbb]",
                  )}
                >
                  <MousePointerClick size={10} /> Select on screen
                </button>
                {mode === "simple" && (
                  <button
                    onClick={() => (setExplain((x) => !x), setPicking(true))}
                    className={cx("text-[0.7rem] px-1.5 py-1 rounded inline-flex items-center gap-1 cursor-pointer", explain ? "bg-[#222] text-[#eee]" : "text-[#666] hover:text-[#bbb]")}
                  >
                    <HelpCircle size={10} /> Explain
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[0.65rem] text-[#555]">~3 credits</span>
                <button onClick={send} disabled={!text.trim()} className="bg-neon text-[#0a0a0a] rounded-md w-6 h-6 flex items-center justify-center disabled:opacity-30 cursor-pointer">
                  <ArrowUp size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* preview */}
      <div className="bg-surface flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-line">
          <div className="flex items-center gap-1">
            {(
              [
                ["desktop", <Monitor size={12} />],
                ["tablet", <Tablet size={12} />],
                ["mobile", <Smartphone size={12} />],
              ] as const
            ).map(([d, icon]) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className={cx("p-1.5 rounded cursor-pointer", device === d ? "bg-bg text-fg border border-line-2" : "text-dim hover:text-fg border border-transparent")}
                aria-label={d}
              >
                {icon}
              </button>
            ))}
          </div>
          <div className="flex-1 max-w-[420px] text-[0.75rem] text-dim bg-bg border border-line rounded px-2.5 py-1 truncate">
            {p.id}.preview.architect.app{scenario.path}
          </div>
          <div className="flex items-center gap-2">
            {picking && <Badge tone="neon">select an element</Badge>}
            <button onClick={() => toast("Preview refreshed")} className="text-dim hover:text-fg cursor-pointer" aria-label="reload">
              <RotateCw size={12} />
            </button>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-auto flex justify-center relative">
          <div
            className={cx("h-full bg-white rounded-lg border overflow-hidden shadow-sm transition-all duration-300", picking ? "border-neon" : "border-line", viewing !== null && "opacity-60 grayscale")}
            style={{ width: deviceW, maxWidth: "100%" }}
          >
            <AppPreview
              scenario={scenario}
              changes={viewing !== null ? changes.slice(0, Math.max(0, viewing - latestBase)) : changes}
              device={device}
              stage={viewing === 1 ? 3 : 4}
              selectable={picking}
              selected={selected}
              onSelect={(el) => {
                setSelected(el);
                if (!explain) setPicking(false);
              }}
            />
          </div>
          {explain && selected && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-[420px] bg-ink text-[#ddd] border border-ink-line rounded-lg p-3.5 shadow-xl rise">
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-[0.55rem] uppercase tracking-[0.1em] text-neon">explain · {selected}</span>
                <button onClick={() => (setExplain(false), setSelected(null), setPicking(false))} className="text-[#666] hover:text-white cursor-pointer">
                  <X size={11} />
                </button>
              </div>
              <div className="text-[0.75rem] leading-relaxed">
                {selected.startsWith("change-") ? `Added by your request: “${changes[Number(selected.slice(7)) - 1]}”.` : scenario.explain[selected as keyof Scenario["explain"]]}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
