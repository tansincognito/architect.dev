import { useState } from "react";
import { Database, FileText, Frame, GitBranch, Mic, Plus, X } from "lucide-react";
import { useStore } from "../lib/store";
import { FRAMEWORKS } from "../lib/data";
import { cx } from "./ui";

const ATTACH: [string, string, React.ReactNode][] = [
  ["Upload a document", "requirements-brief.pdf", <FileText size={12} />],
  ["Attach a Figma design", "Figma · service-desk-v2", <Frame size={12} />],
  ["Link a GitHub repository", "acme/support-triage", <GitBranch size={12} />],
  ["Add a knowledge base", "Knowledge base · Help centre", <Database size={12} />],
];

const VOICE_SAMPLE = "Build an agent that answers employee questions about our travel and expense policy";

export interface PromptSubmit {
  prompt: string;
  attachments: string[];
  stack: string;
  framework: string;
}

export function PromptBox({
  suggestions,
  onSubmit,
  busy,
  placeholder = "Describe the application or agent you need…",
  className,
  compact,
}: {
  suggestions?: string[];
  onSubmit: (v: PromptSubmit) => void;
  busy?: boolean;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}) {
  const { mode } = useStore();
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [stack, setStack] = useState("auto");
  const [framework, setFramework] = useState("auto");
  const [menu, setMenu] = useState(false);
  const [listening, setListening] = useState(false);

  const dictate = () => {
    if (listening) return;
    setListening(true);
    let i = 0;
    const words = VOICE_SAMPLE.split(" ");
    const t = setInterval(() => {
      i++;
      setPrompt(words.slice(0, i).join(" "));
      if (i >= words.length) {
        clearInterval(t);
        setListening(false);
      }
    }, 140);
  };

  const submit = () => {
    if (!prompt.trim() || busy) return;
    onSubmit({ prompt: prompt.trim(), attachments, stack, framework });
  };

  const selectCls =
    "bg-transparent border border-[#222] rounded-[5px] font-mono text-[0.58rem] text-[#888] px-1.5 py-[3px] outline-none cursor-pointer hover:border-[#444]";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className={cx(
        "bg-ink border border-ink-line rounded-[14px] px-5 py-4 md:px-7 md:py-6 flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <span className="font-mono text-[0.58rem] text-[#555] tracking-[0.1em] uppercase shrink-0">prompt</span>
        {suggestions && (
          <div className="flex gap-1.5 overflow-x-auto">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPrompt(s)}
                className="border border-[#222] rounded-full px-2.5 py-[3px] text-[#777] font-sans text-[0.68rem] whitespace-nowrap hover:border-[#444] hover:text-[#aaa] transition-all cursor-pointer"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 flex-1 min-h-0">
        <span className="font-mono text-neon text-base leading-[1.6rem] font-bold select-none pt-[2px]">&gt;</span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={compact ? 2 : 4}
          placeholder={listening ? "Listening…" : placeholder}
          className="flex-1 bg-transparent border-none outline-none resize-none text-[#f0f0f0] font-sans text-[1.05rem] leading-[1.6] placeholder:text-[#3a3a3a] min-h-0"
        />
      </div>

      {attachments.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mt-2">
          {attachments.map((a) => (
            <span key={a} className="inline-flex items-center gap-1.5 bg-[#161616] border border-[#262626] rounded-[5px] px-2 py-1 font-mono text-[0.58rem] text-[#aaa]">
              {a}
              <button type="button" onClick={() => setAttachments((x) => x.filter((y) => y !== a))} className="text-[#666] hover:text-white cursor-pointer">
                <X size={9} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="relative">
            <button
              type="button"
              title="Attach"
              onClick={() => setMenu((m) => !m)}
              className="w-7 h-7 rounded-full border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444] flex items-center justify-center cursor-pointer"
            >
              <Plus size={13} />
            </button>
            {menu && (
              <div className="absolute left-0 bottom-9 w-[220px] bg-[#141414] border border-[#2a2a2a] rounded-lg shadow-xl z-30 py-1 rise">
                {ATTACH.map(([label, value, icon]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setAttachments((a) => [...new Set([...a, value])]);
                      setMenu(false);
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-[0.78rem] text-[#bbb] hover:bg-[#1e1e1e] hover:text-white cursor-pointer"
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {mode === "dev" ? (
            <>
              <select value={stack} onChange={(e) => setStack(e.target.value)} className={selectCls} aria-label="stack">
                <option value="auto">Stack: auto</option>
                <option>next.js</option>
                <option>react + vite</option>
                <option>python · fastapi</option>
                <option>sveltekit</option>
              </select>
              <select value={framework} onChange={(e) => setFramework(e.target.value)} className={selectCls} aria-label="agent framework">
                <option value="auto">Agent framework: auto</option>
                {FRAMEWORKS.map((f) => (
                  <option key={f.id}>{f.name}</option>
                ))}
              </select>
            </>
          ) : (
            <span className="font-mono text-[0.58rem] text-[#333] hidden md:inline">Shift+Enter for a new line · Enter to submit</span>
          )}
        </div>
        <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dictate}
          title="Dictate"
          className={cx(
            "w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer transition-all",
            listening ? "bg-neon border-neon text-[#0a0a0a] pulse-dot" : "border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444]",
          )}
        >
          <Mic size={13} />
        </button>
        <button
          type="submit"
          disabled={busy || !prompt.trim()}
          className={cx(
            "bg-neon text-[#0a0a0a] rounded-[7px] px-5 py-2 font-sans text-[0.82rem] font-semibold whitespace-nowrap transition-all",
            prompt.trim() ? "opacity-100 cursor-pointer" : "opacity-40 cursor-not-allowed",
          )}
        >
          {busy ? "Analysing…" : "Generate plan ↵"}
        </button>
        </div>
      </div>
    </form>
  );
}
