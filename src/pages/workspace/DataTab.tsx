import { useState } from "react";
import { Database, Download, Plus, Upload } from "lucide-react";
import { Badge, Btn, Label, Modal, Pills, cx } from "../../components/ui";
import { useStore } from "../../lib/store";

const TABLES: Record<string, { cols: string[]; rows: string[][]; count: string }> = {
  tickets: {
    cols: ["id", "subject", "label", "urgency", "confidence", "status"],
    count: "12,481",
    rows: [
      ["#4812", "Charged twice for march invoice", "refund", "high", "0.94", "awaiting_approval"],
      ["#4811", "How do I export my data to csv?", "how-to", "low", "0.98", "resolved"],
      ["#4810", "SSO login loop on safari", "bug", "high", "0.87", "open"],
      ["#4809", "Can we upgrade mid-cycle?", "billing", "med", "0.91", "resolved"],
      ["#4808", "API rate limit questions", "how-to", "low", "0.96", "resolved"],
    ],
  },
  drafts: {
    cols: ["id", "ticket_id", "agent_version", "tokens", "sent"],
    count: "9,207",
    rows: [
      ["d_901", "#4812", "responder v12", "2410", "false"],
      ["d_900", "#4811", "responder v12", "1180", "true"],
      ["d_899", "#4809", "responder v12", "1402", "true"],
    ],
  },
  approvals: {
    cols: ["id", "action", "amount", "approver", "decision", "decided_at"],
    count: "318",
    rows: [
      ["ap_77", "zendesk.refund", "$240", "—", "pending", "—"],
      ["ap_76", "zendesk.refund", "$180", "priya@acme.com", "approved", "2026-09-30 16:02"],
      ["ap_75", "email.bulk_send", "1,204", "elena@acme.com", "declined", "2026-09-29 11:40"],
    ],
  },
};

const SCHEMA = `table tickets {
  id          text    primary key
  subject     text
  body        text
  label       enum(refund, billing, bug, how-to, churn-risk)
  urgency     enum(low, med, high)
  confidence  float
  status      text
  customer_id text    -> customers.id
}

table drafts {
  id            text  primary key
  ticket_id     text  -> tickets.id
  agent_version text
  tokens        int
  sent          bool
}

table approvals {
  id         text  primary key
  action     text
  amount     text
  approver   text
  decision   enum(pending, approved, declined)
  decided_at timestamptz
}`;

export default function DataTab() {
  const { toast } = useStore();
  const [table, setTable] = useState("tickets");
  const [view, setView] = useState<"rows" | "schema">("rows");
  const [importOpen, setImportOpen] = useState(false);
  const t = TABLES[table];

  return (
    <div className="flex-1 grid grid-cols-[220px_1fr] min-h-0">
      <aside className="border-r border-line bg-surface/40 py-3">
        <div className="px-4 pb-2 flex items-center justify-between">
          <Label>tables</Label>
          <Badge>postgres 16</Badge>
        </div>
        {Object.entries(TABLES).map(([name, v]) => (
          <button
            key={name}
            onClick={() => setTable(name)}
            className={cx("w-full text-left px-4 py-2 flex items-center gap-2 cursor-pointer", table === name ? "bg-surface-2" : "hover:bg-surface")}
          >
            <Database size={11} className="text-dim" />
            <span className="font-mono text-[0.72rem] flex-1">{name}</span>
            <span className="font-mono text-[0.58rem] text-dim">{v.count}</span>
          </button>
        ))}
        <button onClick={() => toast("Describe the new table in the workspace conversation")} className="px-4 py-2 text-[0.75rem] text-dim hover:text-fg inline-flex items-center gap-1 cursor-pointer">
          <Plus size={10} /> New table
        </button>
        <div className="px-4 pt-4 mt-3 border-t border-line space-y-1.5">
          <Label>data policies</Label>
          <div className="text-[0.75rem] text-muted">Encrypted at rest (AES-256)</div>
          <div className="text-[0.75rem] text-muted">Daily backups · 30-day retention</div>
          <div className="text-[0.75rem] text-muted">Region: US-East</div>
        </div>
      </aside>

      <section className="px-4 md:px-6 py-5 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-[1.1rem] font-bold m-0">{table}</h2>
            <Pills items={["rows", "schema"] as const} value={view} onChange={setView} />
          </div>
          <div className="flex gap-2">
            <Btn size="sm" onClick={() => setImportOpen(true)}>
              <Upload size={11} /> Import
            </Btn>
            <Btn size="sm" onClick={() => toast(`${table}.csv export started · you will be notified when ready`)}>
              <Download size={11} /> Export
            </Btn>
          </div>
        </div>

        {view === "rows" ? (
          <div className="border border-line rounded-lg overflow-x-auto">
            <table className="w-full font-mono text-[0.68rem] border-collapse">
              <thead>
                <tr className="bg-surface">
                  {t.cols.map((c) => (
                    <th key={c} className="text-left px-3 py-2 text-[0.55rem] uppercase tracking-[0.08em] text-dim font-normal border-b border-line">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r, i) => (
                  <tr key={i} className="border-b border-line last:border-0 hover:bg-surface">
                    {r.map((cell, j) => (
                      <td key={j} className="px-3 py-2 whitespace-nowrap">
                        {cell === "pending" || cell === "awaiting_approval" ? <Badge tone="warn">{cell}</Badge> : cell === "declined" ? <Badge tone="danger">{cell}</Badge> : cell === "approved" ? <Badge tone="neon">{cell}</Badge> : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-3 py-2 text-[0.72rem] text-dim border-t border-line bg-surface/50">
              Showing {t.rows.length} of {t.count} rows · read-only in production; edits apply to the staging database
            </div>
          </div>
        ) : (
          <pre className="bg-ink border border-ink-line rounded-lg p-4 font-mono text-[0.68rem] text-[#bbb] leading-relaxed m-0 overflow-auto">{SCHEMA}</pre>
        )}
      </section>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title={`Import into ${table}`}>
        <div className="border-2 border-dashed border-line-2 rounded-lg py-10 text-center">
          <Upload size={18} className="mx-auto text-dim" />
          <div className="text-[0.85rem] mt-2">Drop a CSV or Excel file</div>
          <div className="text-[0.72rem] text-dim mt-1">Columns are matched automatically; you review the mapping before import.</div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={() => setImportOpen(false)}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={() => {
              setImportOpen(false);
              toast("tickets-q3.csv · 2,140 rows mapped · imported to staging");
            }}
          >
            Use sample file
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
