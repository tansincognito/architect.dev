import { useState } from "react";
import { Ban, CheckCircle2, Hand, Play, Plus } from "lucide-react";
import { Badge, Btn, Field, Input, Label, Modal, Toggle, cx } from "../../components/ui";
import { useShared, useStore } from "../../lib/store";
import { useConfidence } from "./ConfidencePanel";

export type PermState = "allowed" | "permission" | "blocked";

export interface ActionRule {
  id: string;
  name: string;
  plain: string;
  tool: string;
  scope: "read" | "write" | "delete" | "exec";
  agents: string;
  state: PermState;
  condition?: string;
  approver?: string;
  /** Monetary tiers for actions with an amount (e.g. refunds). */
  tiers?: { autoUpTo: number; blockAbove: number };
  decisions24h: number;
}

const DEFAULT_RULES: ActionRule[] = [
  { id: "read", name: "Read tickets and customer history", plain: "Look up the ticket and the customer's previous conversations.", tool: "zendesk.read", scope: "read", agents: "all agents", state: "allowed", decisions24h: 1284 },
  { id: "search", name: "Search the help centre", plain: "Find relevant articles to base answers on.", tool: "search_docs", scope: "read", agents: "responder", state: "allowed", decisions24h: 1102 },
  { id: "draft", name: "Draft replies", plain: "Prepare a reply for a person to review.", tool: "drafts.create", scope: "write", agents: "responder", state: "allowed", decisions24h: 1240 },
  { id: "reply", name: "Send replies to customers", plain: "Send the drafted reply directly to the customer.", tool: "zendesk.reply", scope: "write", agents: "responder", state: "allowed", condition: "only when confidence is in the automatic range", decisions24h: 781 },
  { id: "refund", name: "Issue refunds", plain: "Refund a charge to the customer's card.", tool: "stripe.refund", scope: "write", agents: "escalator", state: "permission", approver: "#support-leads", tiers: { autoUpTo: 100, blockAbove: 1000 }, decisions24h: 46 },
  { id: "plan", name: "Change a subscription plan", plain: "Upgrade or downgrade a customer's plan.", tool: "stripe.update_subscription", scope: "write", agents: "escalator", state: "permission", approver: "#billing-team", decisions24h: 9 },
  { id: "bulk", name: "Email more than 100 customers", plain: "Send one message to a large group of customers.", tool: "email.bulk_send", scope: "write", agents: "all agents", state: "permission", approver: "#marketing-approvals", decisions24h: 1 },
  { id: "export", name: "Export customer data", plain: "Download customer records outside Architect.", tool: "data.export", scope: "read", agents: "all agents", state: "blocked", decisions24h: 0 },
  { id: "delete", name: "Delete customer records", plain: "Permanently remove a customer or ticket.", tool: "zendesk.delete", scope: "delete", agents: "all agents", state: "blocked", decisions24h: 0 },
  { id: "card", name: "View full card details", plain: "See complete payment card numbers.", tool: "stripe.read_card", scope: "read", agents: "all agents", state: "blocked", decisions24h: 2 },
  { id: "exec", name: "Run code or shell commands", plain: "Execute arbitrary code outside the sandbox.", tool: "sandbox.exec", scope: "exec", agents: "all agents", state: "blocked", decisions24h: 0 },
];

const CATALOGUE = [
  { name: "Create Jira issues", tool: "jira.create_issue", scope: "write" as const, plain: "Open an engineering ticket for product bugs." },
  { name: "Post in Slack channels", tool: "slack.post", scope: "write" as const, plain: "Notify teams about urgent tickets." },
  { name: "Update CRM records", tool: "salesforce.update", scope: "write" as const, plain: "Write ticket outcomes back to Salesforce." },
  { name: "Issue account credits", tool: "billing.credit", scope: "write" as const, plain: "Apply a goodwill credit to the account." },
];

const COLS: { state: PermState; title: string; plain: string; icon: React.ReactNode; tone: string }[] = [
  { state: "allowed", title: "Allowed", plain: "Agents may do this on their own.", icon: <CheckCircle2 size={14} />, tone: "text-live" },
  { state: "permission", title: "Requires permission", plain: "A person must approve each time.", icon: <Hand size={14} />, tone: "text-warn" },
  { state: "blocked", title: "Blocked", plain: "Never allowed, whatever the circumstances.", icon: <Ban size={14} />, tone: "text-danger" },
];

export function usePermissions(projectId: string) {
  return useShared<{ rules: ActionRule[]; lowConfidence: boolean; unknownDefault: PermState }>(`permissions.${projectId}`, () => ({
    rules: DEFAULT_RULES,
    lowConfidence: true,
    unknownDefault: "permission",
  }));
}

function tierText(r: ActionRule) {
  if (!r.tiers) return null;
  return `Automatic up to $${r.tiers.autoUpTo} · approval up to $${r.tiers.blockAbove.toLocaleString()} · blocked above`;
}

export function PermissionsPanel({ projectId }: { projectId: string }) {
  const { mode, toast } = useStore();
  const [p, setP] = usePermissions(projectId);
  const [conf] = useConfidence(projectId);
  const [edit, setEdit] = useState<ActionRule | null>(null);
  const [adding, setAdding] = useState(false);
  const [simAction, setSimAction] = useState("refund");
  const [simAmount, setSimAmount] = useState(240);
  const [simConf, setSimConf] = useState(94);
  const [simResult, setSimResult] = useState<{ state: PermState; why: string } | null>(null);

  const update = (id: string, patch: Partial<ActionRule>) => setP({ ...p, rules: p.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });

  const evaluate = () => {
    const r = p.rules.find((x) => x.id === simAction)!;
    let state: PermState = r.state;
    let why = `rule "${r.name}" → ${r.state}`;
    if (r.state !== "blocked" && r.tiers) {
      if (simAmount > r.tiers.blockAbove) (state = "blocked"), (why = `amount $${simAmount} > block limit $${r.tiers.blockAbove}`);
      else if (simAmount > r.tiers.autoUpTo) (state = "permission"), (why = `amount $${simAmount} > automatic limit $${r.tiers.autoUpTo}`);
      else (state = "allowed"), (why = `amount $${simAmount} ≤ automatic limit $${r.tiers.autoUpTo}`);
    }
    if (state === "allowed" && p.lowConfidence && simConf < conf.autoAt) {
      state = "permission";
      why += ` · confidence ${simConf}% < automatic threshold ${conf.autoAt}%`;
    }
    setSimResult({ state, why });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[1.4rem] font-semibold tracking-[-0.02em] m-0">Agent permissions</h2>
          <p className="text-[0.85rem] text-muted mt-1 max-w-[720px]">Decide what agents may do on their own, what needs a person's approval, and what is never allowed. Changes take effect immediately and are recorded in the audit log.</p>
        </div>
        <Btn onClick={() => setAdding(true)}>
          <Plus size={12} /> Add action
        </Btn>
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        {COLS.map((col) => {
          const items = p.rules.filter((r) => r.state === col.state);
          return (
            <div key={col.state} className="bg-surface/60 border border-line rounded-xl p-3 flex flex-col">
              <div className="px-1 pb-3">
                <div className={cx("flex items-center gap-2 text-[0.92rem] font-semibold", col.tone)}>
                  {col.icon} {col.title}
                  <span className="font-mono text-[0.65rem] text-dim font-normal ml-auto">{items.length}</span>
                </div>
                <div className="text-[0.75rem] text-dim mt-0.5">{col.plain}</div>
              </div>
              <div className="space-y-2 flex-1">
                {items.map((r) => (
                  <button key={r.id} onClick={() => setEdit(r)} className="w-full text-left bg-bg border border-line rounded-lg p-3 hover:border-line-2 cursor-pointer">
                    <div className="text-[0.85rem] font-medium">{r.name}</div>
                    <div className="text-[0.72rem] text-dim mt-0.5">{r.plain}</div>
                    {(r.condition || r.tiers || r.approver) && (
                      <div className="mt-2 space-y-1">
                        {r.condition && <div className="text-[0.7rem] text-muted">· {r.condition}</div>}
                        {r.tiers && <div className="text-[0.7rem] text-muted">· {tierText(r)}</div>}
                        {r.approver && r.state === "permission" && <div className="text-[0.7rem] text-muted">· Approver: {r.approver}</div>}
                      </div>
                    )}
                    {mode === "dev" && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Badge>{r.tool}</Badge>
                        <Badge tone={r.scope === "read" ? "neutral" : r.scope === "write" ? "warn" : "danger"}>{r.scope}</Badge>
                        <span className="font-mono text-[0.55rem] text-dim ml-auto">{r.decisions24h}/24h</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <section>
        <Label className="mb-2">safeguards</Label>
        <div className="border border-line rounded-lg overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 border-b border-line">
            <div>
              <div className="text-[0.88rem]">Low confidence always requires permission</div>
              <div className="text-[0.75rem] text-dim">Any allowed action is held for approval when confidence is below {conf.autoAt}% (set under Confidence).</div>
            </div>
            <Toggle on={p.lowConfidence} onChange={(v) => setP({ ...p, lowConfidence: v })} />
          </div>
          <div className="flex items-center justify-between gap-4 px-4 py-3.5">
            <div>
              <div className="text-[0.88rem]">New or unlisted actions default to</div>
              <div className="text-[0.75rem] text-dim">Applies when an agent gains a new tool or integration.</div>
            </div>
            <select value={p.unknownDefault} onChange={(e) => setP({ ...p, unknownDefault: e.target.value as PermState })} className="bg-bg border border-line-2 rounded-md px-2 py-1.5 text-[0.8rem] text-fg">
              <option value="permission">Requires permission</option>
              <option value="blocked">Blocked</option>
              <option value="allowed">Allowed</option>
            </select>
          </div>
        </div>
      </section>

      {mode === "dev" && (
        <section className="grid lg:grid-cols-2 gap-4">
          <div>
            <Label className="mb-2">policy tester</Label>
            <div className="border border-line rounded-lg p-4 space-y-3">
              <Field label="action">
                <select value={simAction} onChange={(e) => (setSimAction(e.target.value), setSimResult(null))} className="w-full bg-bg border border-line-2 rounded-[7px] px-2 py-2 text-[0.82rem] text-fg">
                  {p.rules.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.tool} — {r.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="amount ($)">
                  <Input type="number" value={simAmount} onChange={(e) => (setSimAmount(Number(e.target.value)), setSimResult(null))} />
                </Field>
                <Field label="confidence (%)">
                  <Input type="number" value={simConf} onChange={(e) => (setSimConf(Number(e.target.value)), setSimResult(null))} />
                </Field>
              </div>
              <Btn size="sm" onClick={evaluate}>
                <Play size={11} /> Evaluate
              </Btn>
              {simResult && (
                <div className="rise border border-line rounded-md p-3">
                  <Badge tone={simResult.state === "allowed" ? "neon" : simResult.state === "permission" ? "warn" : "danger"}>{simResult.state === "permission" ? "requires permission" : simResult.state}</Badge>
                  <div className="font-mono text-[0.62rem] text-muted mt-1.5">{simResult.why}</div>
                </div>
              )}
            </div>
          </div>
          <div>
            <Label className="mb-2">policy as code · architect.yaml</Label>
            <pre className="bg-ink border border-ink-line rounded-lg p-4 font-mono text-[0.62rem] text-[#bbb] leading-relaxed m-0 overflow-auto h-[300px]">
              {`permissions:
  default: ${p.unknownDefault}
  low_confidence_requires_approval: ${p.lowConfidence}
  rules:
${p.rules
  .map(
    (r) =>
      `    - tool: ${r.tool}\n      agents: ${r.agents}\n      effect: ${r.state}` +
      (r.tiers ? `\n      tiers: { allow_lte: ${r.tiers.autoUpTo}, block_gt: ${r.tiers.blockAbove} }` : "") +
      (r.approver && r.state === "permission" ? `\n      approver: "${r.approver}"` : "") +
      (r.condition ? `\n      when: confidence >= ${conf.autoAt / 100}` : ""),
  )
  .join("\n")}`}
            </pre>
          </div>
        </section>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.name}>
        {edit && (
          <div className="space-y-4">
            <p className="text-[0.85rem] text-muted m-0">{edit.plain}</p>
            <div>
              <Label className="mb-2">agents may</Label>
              <div className="grid grid-cols-3 gap-2">
                {COLS.map((col) => (
                  <button
                    key={col.state}
                    onClick={() => setEdit({ ...edit, state: col.state })}
                    className={cx("border rounded-lg p-2.5 text-[0.8rem] flex flex-col items-center gap-1 cursor-pointer", edit.state === col.state ? "border-fg bg-surface font-semibold" : "border-line hover:border-line-2")}
                  >
                    <span className={col.tone}>{col.icon}</span>
                    {col.title}
                  </button>
                ))}
              </div>
            </div>
            {edit.tiers && edit.state !== "blocked" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="automatic up to ($)">
                  <Input type="number" value={edit.tiers.autoUpTo} onChange={(e) => setEdit({ ...edit, tiers: { ...edit.tiers!, autoUpTo: Number(e.target.value) } })} />
                </Field>
                <Field label="blocked above ($)">
                  <Input type="number" value={edit.tiers.blockAbove} onChange={(e) => setEdit({ ...edit, tiers: { ...edit.tiers!, blockAbove: Number(e.target.value) } })} />
                </Field>
              </div>
            )}
            {edit.state === "permission" && (
              <Field label="who approves">
                <Input value={edit.approver ?? ""} onChange={(e) => setEdit({ ...edit, approver: e.target.value })} placeholder="#team-channel or person" />
              </Field>
            )}
            {mode === "dev" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="tool">
                  <Input value={edit.tool} readOnly />
                </Field>
                <Field label="applies to agents">
                  <Input value={edit.agents} onChange={(e) => setEdit({ ...edit, agents: e.target.value })} />
                </Field>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setEdit(null)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  update(edit.id, edit);
                  toast(`${edit.name}: ${edit.state === "permission" ? "requires permission" : edit.state} · recorded in audit log`);
                  setEdit(null);
                }}
              >
                Save
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add an action">
        <p className="text-[0.82rem] text-muted mt-0">Actions available from your connected integrations. New actions start as "{p.unknownDefault === "permission" ? "requires permission" : p.unknownDefault}".</p>
        <div className="border border-line rounded-lg overflow-hidden">
          {CATALOGUE.filter((c) => !p.rules.some((r) => r.tool === c.tool)).map((c) => (
            <button
              key={c.tool}
              onClick={() => {
                setP({ ...p, rules: [...p.rules, { id: c.tool, name: c.name, plain: c.plain, tool: c.tool, scope: c.scope, agents: "all agents", state: p.unknownDefault, decisions24h: 0 }] });
                setAdding(false);
                toast(`${c.name} added`);
              }}
              className="w-full text-left px-4 py-3 border-b border-line last:border-0 hover:bg-surface cursor-pointer"
            >
              <div className="text-[0.85rem] font-medium">{c.name}</div>
              <div className="text-[0.72rem] text-dim">
                {c.plain}
                {mode === "dev" && <span className="font-mono"> · {c.tool}</span>}
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
