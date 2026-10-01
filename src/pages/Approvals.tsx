import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Check, Clock, X } from "lucide-react";
import { Badge, Btn, H1, Label, Pills, Toggle, cx } from "../components/ui";
import { useStore } from "../lib/store";

interface Approval {
  id: string;
  title: string;
  project: string;
  agent: string;
  risk: "high" | "medium";
  age: string;
  sla: string;
  reason: string;
  context: [string, string][];
  proposed: string;
  status: "pending" | "approved" | "declined";
  decidedBy?: string;
}

const ITEMS: Approval[] = [
  {
    id: "ap_77",
    title: "Refund $240 to Dana Whitfield",
    project: "support-triage-agent",
    agent: "escalator v3",
    risk: "medium",
    age: "6 min",
    sla: "3h 54m remaining",
    reason: "Refund exceeds the $100 automatic limit. Customer was charged twice for the March invoice (both charges verified in Stripe).",
    context: [
      ["Ticket", "#4812 · Charged twice for march invoice"],
      ["Customer", "Dana Whitfield · Acme Pro · customer since 2023"],
      ["Evidence", "Stripe charges ch_3P… and ch_3Q… on 2026-03-01"],
      ["Classifier confidence", "0.94"],
    ],
    proposed: "stripe.refund(charge='ch_3Q…', amount=24000)\nzendesk.reply(ticket=4812, body=<drafted reply>)",
    status: "pending",
  },
  {
    id: "ap_78",
    title: "Send bulk email to 1,204 customers",
    project: "research-assistant",
    agent: "writer v5",
    risk: "high",
    age: "22 min",
    sla: "23h 38m remaining",
    reason: "Bulk external communication requires marketing approval under the communications policy.",
    context: [
      ["Audience", "Segment: enterprise customers, EMEA"],
      ["Subject", "Q3 market brief: what changed in procurement"],
      ["Policy", "COMMS-04 · external email > 100 recipients"],
    ],
    proposed: "email.bulk_send(segment='ent-emea', template='q3-brief')",
    status: "pending",
  },
  {
    id: "ap_76",
    title: "Refund $180 to Kai Nakamura",
    project: "support-triage-agent",
    agent: "escalator v3",
    risk: "medium",
    age: "2h",
    sla: "",
    reason: "Refund exceeds automatic limit.",
    context: [["Ticket", "#4790"]],
    proposed: "stripe.refund(amount=18000)",
    status: "approved",
    decidedBy: "Priya Sharma",
  },
];

export default function Approvals() {
  const nav = useNavigate();
  const { toast } = useStore();
  const [items, setItems] = useState(ITEMS);
  const [tab, setTab] = useState<"pending" | "decided" | "policies">("pending");
  const [sel, setSel] = useState<string>(ITEMS[0].id);
  const [note, setNote] = useState("");

  const list = items.filter((i) => (tab === "pending" ? i.status === "pending" : i.status !== "pending"));
  const cur = items.find((i) => i.id === sel && list.includes(i)) ?? list[0];

  const decide = (d: "approved" | "declined") => {
    if (!cur) return;
    setItems((x) => x.map((i) => (i.id === cur.id ? { ...i, status: d, decidedBy: "You" } : i)));
    toast(d === "approved" ? `Approved · ${cur.agent} resumed` : "Declined · agent notified and customer reply held");
    setNote("");
  };

  return (
    <main className="px-4 md:px-8 py-8 flex-1 flex flex-col">
      <H1 sub="Actions that agents may not take without human authorisation." right={<Pills items={["pending", "decided", "policies"] as const} value={tab} onChange={setTab} />}>
        Approvals
      </H1>

      {tab === "policies" ? (
        <div className="border border-line rounded-lg overflow-hidden max-w-[880px]">
          {[
            ["Refunds over $100", "support-triage-agent", "#support-leads", "4h → escalate to on-call", true],
            ["External email to more than 100 recipients", "All projects", "#marketing-approvals", "24h → decline", true],
            ["Vendor creation in SAP", "vendor-onboarding-agent", "#procurement", "24h → decline", true],
            ["Payouts over $10,000", "claims-processor", "Finance controllers", "8h → escalate to CFO office", false],
          ].map(([t, scope, who, sla, on]) => (
            <div key={t as string} className="flex items-center gap-4 px-4 py-3.5 border-b border-line last:border-0">
              <div className="flex-1">
                <div className="text-[0.88rem] font-medium">{t as string}</div>
                <div className="text-[0.75rem] text-dim">
                  {scope as string} · approvers: {who as string} · {sla as string}
                </div>
              </div>
              <Toggle on={on as boolean} onChange={() => toast("Policy updated · recorded in audit log")} />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="border border-dashed border-line-2 rounded-lg py-16 text-center">
          <Check size={20} className="mx-auto text-live" />
          <div className="text-[0.95rem] font-semibold mt-2">No pending approvals</div>
          <div className="text-[0.8rem] text-muted mt-1">You will be notified by email and Slack when an agent needs a decision.</div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[360px_1fr] border border-line rounded-lg overflow-hidden flex-1 min-h-[480px]">
          <div className="border-r border-line">
            {list.map((i) => (
              <button key={i.id} onClick={() => setSel(i.id)} className={cx("w-full text-left px-4 py-3.5 border-b border-line cursor-pointer", cur?.id === i.id ? "bg-surface" : "hover:bg-surface/60")}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.85rem] font-semibold truncate">{i.title}</span>
                  {i.status === "pending" ? <Badge tone={i.risk === "high" ? "danger" : "warn"}>{i.risk} risk</Badge> : <Badge tone={i.status === "approved" ? "neon" : "danger"}>{i.status}</Badge>}
                </div>
                <div className="font-mono text-[0.6rem] text-dim mt-1">
                  {i.project} · {i.agent} · {i.age} ago
                </div>
              </button>
            ))}
          </div>
          {cur && (
            <div className="p-6 overflow-auto">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-[1.3rem] font-semibold tracking-[-0.02em] m-0">{cur.title}</h2>
                  <div className="text-[0.78rem] text-dim mt-1 flex items-center gap-1.5">
                    <Bot size={11} /> Requested by {cur.agent} in {cur.project}
                  </div>
                </div>
                {cur.sla && (
                  <span className="text-[0.75rem] text-warn inline-flex items-center gap-1">
                    <Clock size={11} /> {cur.sla}
                  </span>
                )}
              </div>
              <div className="mt-5">
                <Label className="mb-1.5">agent's reasoning</Label>
                <p className="text-[0.88rem] leading-relaxed m-0">{cur.reason}</p>
              </div>
              <div className="mt-5 border border-line rounded-lg overflow-hidden">
                {cur.context.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[10rem_1fr] gap-3 px-4 py-2.5 border-b border-line last:border-0">
                    <span className="text-[0.75rem] text-dim">{k}</span>
                    <span className="text-[0.82rem]">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <Label className="mb-1.5">proposed action</Label>
                <pre className="bg-ink text-[#ccc] border border-ink-line rounded-md p-3 font-mono text-[0.68rem] m-0 whitespace-pre-wrap">{cur.proposed}</pre>
              </div>
              {cur.status === "pending" ? (
                <>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Add a note for the audit record (optional)"
                    className="w-full mt-5 bg-bg border border-line-2 rounded-[7px] px-3 py-2 text-[0.85rem] text-fg outline-none focus:border-fg resize-none"
                  />
                  <div className="flex gap-2 mt-3">
                    <Btn variant="primary" onClick={() => decide("approved")}>
                      <Check size={12} /> Approve
                    </Btn>
                    <Btn onClick={() => toast("Opened in the workspace with this draft for editing")}>Edit before approving</Btn>
                    <Btn variant="danger" onClick={() => decide("declined")}>
                      <X size={12} /> Decline
                    </Btn>
                    <Btn variant="ghost" onClick={() => nav(`/app/p/${cur.project}/observe`)}>
                      View full trace
                    </Btn>
                  </div>
                </>
              ) : (
                <div className="mt-5 text-[0.85rem] text-muted">
                  {cur.status === "approved" ? "Approved" : "Declined"} by {cur.decidedBy} · recorded in the audit log
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
