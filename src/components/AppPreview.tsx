import { SCENARIOS, type Scenario } from "../lib/scenarios";
import { cx } from "./ui";

/**
 * Fake generated app for a scenario. `stage` 0-4 progressively reveals
 * sections so the build flow can show the preview filling in. `changes` are
 * chat requests applied after the initial build, rendered as new sections.
 */
export function AppPreview({
  scenario = SCENARIOS.support,
  stage = 4,
  changes = [],
  selectable,
  selected,
  onSelect,
  device = "desktop",
}: {
  scenario?: Scenario;
  stage?: number;
  changes?: string[];
  selectable?: boolean;
  selected?: string | null;
  onSelect?: (el: string) => void;
  device?: "desktop" | "tablet" | "mobile";
}) {
  const { preview, brand, nav } = scenario;
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
          <div className="font-bold tracking-tight">
            {brand[0]}
            <span className="text-[#5dba00]">{brand[1]}</span>
          </div>
          {!narrow && (
            <div className="flex gap-4 text-[#888] text-[11px]">
              {nav.map((n, i) => (
                <span key={n} className={i === 0 ? "text-[#111] font-medium" : undefined}>
                  {n}
                </span>
              ))}
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
              {preview.stats.map(([k, v]) => (
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
            <div onClick={pick("list")} className={cx("border border-[#eee] rounded-lg overflow-hidden", sel("list"))}>
              {preview.rows.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-[#f2f2f2] last:border-0">
                  <span className="text-[10px] text-[#aaa] w-14 shrink-0">{t.id}</span>
                  <span className="flex-1 truncate">{t.title}</span>
                  <span className="text-[9px] px-1.5 py-px rounded" style={{ color: preview.tags[t.tag], background: `${preview.tags[t.tag]}15` }}>
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

          {stage >= 4 &&
            changes.map((c, i) => (
              <div key={i} onClick={pick(`change-${i + 1}`)} className={cx("mt-4 border border-[#b8f000] bg-[#f8fde8] rounded-lg p-3 rise", sel(`change-${i + 1}`))}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold">{c}</span>
                  <span className="text-[9px] text-[#5dba00] font-medium uppercase tracking-wide">new</span>
                </div>
                <div className="flex items-end gap-1 h-10">
                  {[40, 65, 50, 80, 60, 90, 72].map((h, j) => (
                    <div key={j} className="flex-1 bg-[#d9f28a] rounded-sm" style={{ height: `${(h + i * 7) % 100}%` }} />
                  ))}
                </div>
              </div>
            ))}
        </div>

        {stage >= 4 ? (
          <div onClick={pick("panel")} className={cx("border border-[#eee] rounded-lg p-3 h-fit", sel("panel"))}>
            <div className="text-[10px] text-[#999] mb-1">{preview.panel.kicker}</div>
            <div className="text-[11px] leading-relaxed text-[#444]">{preview.panel.body}</div>
            <div className="mt-3 text-[10px] bg-[#fff7e6] text-[#b45309] border border-[#fde3b0] rounded px-2 py-1">{preview.panel.flag}</div>
            <div className="flex gap-1.5 mt-3">
              <button className="flex-1 bg-[#111] text-white rounded-md py-1.5 text-[11px]">{preview.panel.primary}</button>
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
