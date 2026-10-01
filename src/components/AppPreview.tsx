import { cx } from "./ui";

const TICKETS = [
  { id: "#4812", subj: "Charged twice for march invoice", tag: "refund", urg: "high", conf: 0.94 },
  { id: "#4811", subj: "How do I export my data to csv?", tag: "how-to", urg: "low", conf: 0.98 },
  { id: "#4810", subj: "SSO login loop on safari", tag: "bug", urg: "high", conf: 0.87 },
  { id: "#4809", subj: "Can we upgrade mid-cycle?", tag: "billing", urg: "med", conf: 0.91 },
  { id: "#4808", subj: "API rate limit questions", tag: "how-to", urg: "low", conf: 0.96 },
];

const TAG_COLOR: Record<string, string> = {
  refund: "#dc2626",
  "how-to": "#5dba00",
  bug: "#d97706",
  billing: "#2563eb",
};

/**
 * Fake generated app ("support triage" inbox). `stage` 0-4 progressively reveals
 * sections so the build flow can show the preview filling in.
 */
export function AppPreview({
  stage = 4,
  selectable,
  selected,
  onSelect,
  device = "desktop",
}: {
  stage?: number;
  selectable?: boolean;
  selected?: string | null;
  onSelect?: (el: string) => void;
  device?: "desktop" | "tablet" | "mobile";
}) {
  const pick = (el: string) => (selectable ? () => onSelect?.(el) : undefined);
  const sel = (el: string) =>
    cx(
      selectable && "cursor-pointer hover:outline hover:outline-2 hover:outline-[#b8f000]/70 hover:outline-offset-2 rounded",
      selected === el && "outline outline-2 outline-[#b8f000] outline-offset-2 rounded",
    );
  const narrow = device !== "desktop";

  return (
    <div className="bg-white text-[#111] h-full w-full overflow-auto font-sans text-[12px]" style={{ colorScheme: "light" }}>
      {stage >= 1 ? (
        <div onClick={pick("navbar")} className={cx("flex items-center justify-between px-4 h-11 border-b border-[#eee]", sel("navbar"))}>
          <div className="font-bold tracking-tight">helpdesk<span className="text-[#5dba00]">.ai</span></div>
          {!narrow && (
            <div className="flex gap-4 text-[#888] text-[11px]">
              <span className="text-[#111] font-medium">inbox</span>
              <span>analytics</span>
              <span>settings</span>
            </div>
          )}
          <div className="w-6 h-6 rounded-full bg-[#eee]" />
        </div>
      ) : (
        <div className="h-11 shimmer" />
      )}

      <div className={cx("p-4 grid gap-4", narrow ? "grid-cols-1" : "grid-cols-[1fr_260px]")}>
        <div>
          {stage >= 2 ? (
            <div onClick={pick("stats")} className={cx("grid grid-cols-3 gap-2 mb-4", sel("stats"))}>
              {[
                ["open", "128"],
                ["auto-resolved", "61%"],
                ["avg first reply", "42s"],
              ].map(([k, v]) => (
                <div key={k} className="border border-[#eee] rounded-lg p-2.5">
                  <div className="text-[10px] text-[#999]">{k}</div>
                  <div className="text-[18px] font-bold tracking-tight">{v}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[58px] rounded-lg shimmer" />
              ))}
            </div>
          )}

          {stage >= 3 ? (
            <div onClick={pick("ticket-list")} className={cx("border border-[#eee] rounded-lg overflow-hidden", sel("ticket-list"))}>
              {TICKETS.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-[#f2f2f2] last:border-0">
                  <span className="text-[10px] text-[#aaa] w-10">{t.id}</span>
                  <span className="flex-1 truncate">{t.subj}</span>
                  <span className="text-[9px] px-1.5 py-px rounded" style={{ color: TAG_COLOR[t.tag], background: `${TAG_COLOR[t.tag]}15` }}>
                    {t.tag}
                  </span>
                  {!narrow && <span className="text-[10px] text-[#aaa] w-9 text-right">{Math.round(t.conf * 100)}%</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 rounded shimmer" />
              ))}
            </div>
          )}
        </div>

        {stage >= 4 ? (
          <div onClick={pick("draft-panel")} className={cx("border border-[#eee] rounded-lg p-3 h-fit", sel("draft-panel"))}>
            <div className="text-[10px] text-[#999] mb-1">#4812 · drafted reply</div>
            <div className="text-[11px] leading-relaxed text-[#444]">
              Hi Dana — sorry about the double charge. I've flagged a refund of <b>$240</b> for approval; you'll see it within 3–5 days.
            </div>
            <div className="mt-3 text-[10px] bg-[#fff7e6] text-[#b45309] border border-[#fde3b0] rounded px-2 py-1">
              refund &gt; $100 · needs human approval
            </div>
            <div className="flex gap-1.5 mt-3">
              <button className="flex-1 bg-[#111] text-white rounded-md py-1.5 text-[11px]">approve & send</button>
              <button className="border border-[#ddd] rounded-md px-2 text-[11px]">edit</button>
            </div>
          </div>
        ) : (
          !narrow && <div className="h-[180px] rounded-lg shimmer" />
        )}
      </div>
    </div>
  );
}
