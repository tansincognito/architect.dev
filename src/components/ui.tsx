import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "secondary" | "ghost" | "dark" | "danger";
type BtnSize = "sm" | "md" | "lg";

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: "bg-neon text-[#0a0a0a] font-semibold hover:brightness-95 border border-transparent",
  secondary: "bg-bg text-fg border border-line-2 hover:bg-surface",
  ghost: "bg-transparent text-muted border border-transparent hover:text-fg hover:bg-surface",
  dark: "bg-ink text-[#f0f0f0] border border-ink-line hover:bg-[#1a1a1a]",
  danger: "bg-transparent text-danger border border-danger/40 hover:bg-danger/10",
};

const BTN_SIZE: Record<BtnSize, string> = {
  sm: "text-[0.74rem] px-2.5 py-1 rounded-[5px] gap-1.5",
  md: "text-[0.8rem] px-3.5 py-2 rounded-[7px] gap-2",
  lg: "text-[0.88rem] px-5 py-2.5 rounded-[8px] gap-2",
};

export function Btn({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center font-sans font-medium whitespace-nowrap transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        BTN_VARIANT[variant],
        BTN_SIZE[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("font-mono text-[0.58rem] uppercase tracking-[0.08em] text-dim", className)}>{children}</div>
  );
}

export function H1({ children, sub, right }: { children: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="font-sans text-[1.75rem] font-semibold tracking-[-0.02em] leading-none m-0">{children}</h1>
        {sub && <p className="text-[0.85rem] text-muted mt-1.5">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("font-mono", className)}>{children}</span>;
}

type Tone = "neon" | "neutral" | "warn" | "danger" | "info" | "dark";
const TONE: Record<Tone, string> = {
  neon: "text-neon-ink bg-neon-soft border-neon-line",
  neutral: "text-muted bg-surface border-line",
  warn: "text-warn bg-warn/10 border-warn/30",
  danger: "text-danger bg-danger/10 border-danger/30",
  info: "text-info bg-info/10 border-info/30",
  dark: "text-[#ddd] bg-ink border-ink-line",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.06em] border rounded-[3px] px-1.5 py-[1px] whitespace-nowrap",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const STATUS_COLOR: Record<string, string> = {
  live: "var(--live)",
  ready: "var(--live)",
  passed: "var(--live)",
  healthy: "var(--live)",
  building: "var(--warn)",
  running: "var(--warn)",
  pending: "var(--warn)",
  degraded: "var(--warn)",
  draft: "var(--dim)",
  idle: "var(--dim)",
  failed: "var(--danger)",
  error: "var(--danger)",
};

export function Status({ status, pulse }: { status: string; pulse?: boolean }) {
  const color = STATUS_COLOR[status] ?? "var(--dim)";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cx("w-[5px] h-[5px] rounded-full", pulse && "pulse-dot")}
        style={{ background: color }}
      />
      <span className="font-mono text-[0.58rem] tracking-[0.04em]" style={{ color }}>
        {status}
      </span>
    </span>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cx(
        "relative w-[34px] h-[19px] rounded-full border transition-all duration-200 cursor-pointer shrink-0",
        on ? "bg-neon border-[#a8e000]" : "bg-surface-2 border-line-2",
      )}
    >
      <span
        className={cx(
          "absolute top-[2px] w-[13px] h-[13px] rounded-full transition-all duration-200",
          on ? "left-[16px] bg-[#0a0a0a]" : "left-[2px] bg-line-2",
        )}
      />
    </button>
  );
}

export function Pills<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: readonly T[] | { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const norm = (items as (T | { value: T; label: ReactNode })[]).map((i) =>
    typeof i === "string" ? { value: i, label: i } : i,
  );
  return (
    <div className={cx("flex gap-0.5 flex-wrap", className)}>
      {norm.map((i) => (
        <button
          key={i.value}
          type="button"
          onClick={() => onChange(i.value)}
          className={cx(
            "font-mono text-[0.6rem] uppercase tracking-[0.06em] px-2.5 py-1 rounded-[4px] border transition-all duration-100 cursor-pointer inline-flex items-center gap-1.5",
            value === i.value ? "bg-surface-2 border-line-2 text-fg" : "bg-transparent border-transparent text-dim hover:text-muted",
          )}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx(
        "bg-bg border border-line rounded-lg",
        onClick && "cursor-pointer hover:border-line-2 transition-colors",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Grid of cells separated by 1px hairlines (signature v1 pattern). */
export function HairGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("grid gap-px bg-line border border-line rounded-lg overflow-hidden", className)}>{children}</div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cx(
        "w-full bg-bg border border-line-2 rounded-[7px] px-3 py-2 font-sans text-[0.85rem] text-fg placeholder:text-dim outline-none focus:border-fg transition-colors",
        className,
      )}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <Label className="mb-1.5">{label}</Label>
      {children}
      {hint && <div className="text-[0.72rem] text-dim mt-1">{hint}</div>}
    </label>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="font-mono text-[0.55rem] text-muted bg-surface border border-line rounded-[3px] px-1 py-px">
      {children}
    </kbd>
  );
}

export function Bar({ value, className, tone = "neon" }: { value: number; className?: string; tone?: "neon" | "warn" | "danger" }) {
  const color = tone === "neon" ? "var(--neon)" : tone === "warn" ? "var(--warn)" : "var(--danger)";
  return (
    <div className={cx("h-[3px] bg-surface-2 rounded-full overflow-hidden", className)}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx("inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin", className)}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="rise w-full bg-bg border border-line-2 rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] max-h-[76vh] overflow-auto"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
            <div className="text-[0.95rem] font-semibold">{title}</div>
            <button onClick={onClose} className="text-dim hover:text-fg cursor-pointer" aria-label="close">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-line-2 rounded-lg py-12 px-6 text-center">
      <div className="text-[0.95rem] font-semibold">{title}</div>
      {body && <div className="text-[0.82rem] text-muted mt-1.5 max-w-sm mx-auto">{body}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Row({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cx(
        "px-3 py-3.5 border-b border-line last:border-b-0 rounded-md transition-colors",
        onClick && "cursor-pointer hover:bg-surface",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function GithubMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function GoogleMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}
