import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Plus } from "lucide-react";
import { Badge, Btn, Field, Input, Modal, Pills, cx } from "../../components/ui";
import { useStore } from "../../lib/store";
import { useProject } from "./Workspace";

const SECTIONS = ["general", "credentials", "access", "audit log", "danger zone"] as const;
type Section = (typeof SECTIONS)[number];

interface Secret {
  key: string;
  env: string;
  updated: string;
  by: string;
}

const secretsFor = (me: string): Secret[] => [
  { key: "ZENDESK_TOKEN", env: "production", updated: "12 days ago", by: me },
  { key: "ZENDESK_TOKEN", env: "staging", updated: "12 days ago", by: me },
  { key: "STRIPE_RESTRICTED_KEY", env: "production", updated: "1 month ago", by: "priya@acme.com" },
  { key: "DATABASE_URL", env: "all", updated: "managed", by: "Architect" },
];

const auditFor = (me: string) => [
  ["2026-10-01 18:42", me, "Deployed v24 to production (canary)", "deploy"],
  ["2026-10-01 18:30", "Architect", "Applied 10 governance remediations (PR #42)", "governance"],
  ["2026-10-01 17:55", "priya@acme.com", "Approved refund $180 on #4790", "approval"],
  ["2026-10-01 11:02", me, "Revealed secret ZENDESK_TOKEN (staging)", "security"],
  ["2026-09-30 09:14", me, "Granted Marcus Lee viewer access", "access"],
];

export default function SettingsTab() {
  const p = useProject();
  const nav = useNavigate();
  const { toast, updateProject, user } = useStore();
  const me = user?.email ?? "you@acme.com";
  const [section, setSection] = useState<Section>("general");
  const [env, setEnv] = useState<"all" | "production" | "staging">("all");
  const [revealed, setRevealed] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [secrets, setSecrets] = useState(() => secretsFor(me));
  const [newKey, setNewKey] = useState("");
  const [delOpen, setDelOpen] = useState(false);
  const [confirm, setConfirm] = useState("");

  return (
    <div className="flex-1 grid grid-cols-[200px_1fr] min-h-0">
      <aside className="border-r border-line py-4">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={cx(
              "w-full text-left px-5 py-2 text-[0.82rem] capitalize cursor-pointer",
              section === s ? "bg-surface text-fg font-semibold" : "text-muted hover:text-fg",
              s === "danger zone" && "text-danger",
            )}
          >
            {s}
          </button>
        ))}
      </aside>

      <section className="px-4 md:px-8 py-6 overflow-auto max-w-[860px]">
        {section === "general" && (
          <div className="space-y-4 rise">
            <h2 className="text-[1.4rem] font-semibold tracking-[-0.02em] m-0">General</h2>
            <Field label="project name">
              <Input defaultValue={p.name} />
            </Field>
            <Field label="description">
              <Input defaultValue={p.desc} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="business owner">
                <Input defaultValue={`${user?.name ?? "You"} (Head of Customer Operations)`} />
              </Field>
              <Field label="technical owner">
                <Input defaultValue="Priya Sharma (Platform Engineering)" />
              </Field>
              <Field label="cost centre">
                <Input defaultValue="CS-OPS-114" />
              </Field>
              <Field label="data classification">
                <select className="w-full bg-bg border border-line-2 rounded-[7px] px-2 py-2 text-[0.85rem] text-fg" defaultValue="Confidential (customer PII)">
                  <option>Public</option>
                  <option>Internal</option>
                  <option>Confidential (customer PII)</option>
                  <option>Restricted</option>
                </select>
              </Field>
            </div>
            <Btn variant="primary" onClick={() => toast("Project settings saved")}>
              Save changes
            </Btn>
          </div>
        )}

        {section === "credentials" && (
          <div className="rise">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h2 className="text-[1.4rem] font-semibold tracking-[-0.02em] m-0">Credentials vault</h2>
                <p className="text-[0.85rem] text-muted mt-1">API keys and secrets are encrypted and never stored in code. Every access is logged.</p>
              </div>
              <Btn variant="primary" size="sm" onClick={() => setAddOpen(true)}>
                <Plus size={11} /> Add secret
              </Btn>
            </div>
            <Pills items={["all", "production", "staging"] as const} value={env} onChange={setEnv} className="mb-3" />
            <div className="border border-line rounded-lg overflow-hidden">
              {secrets
                .filter((s) => env === "all" || s.env === env || s.env === "all")
                .map((s, i) => {
                  const id = `${s.key}.${s.env}`;
                  return (
                    <div key={i} className="grid grid-cols-[1fr_6rem_1fr_auto] items-center gap-3 px-4 py-3 border-b border-line last:border-0">
                      <div>
                        <div className="font-mono text-[0.75rem] font-bold flex items-center gap-1.5">
                          <KeyRound size={10} className="text-dim" /> {s.key}
                        </div>
                        <div className="font-mono text-[0.68rem] text-dim mt-0.5">{revealed === id ? "zd_live_8f2a…91c4" : "••••••••••••••••"}</div>
                      </div>
                      <Badge tone={s.env === "production" ? "neon" : "neutral"}>{s.env}</Badge>
                      <div className="text-[0.72rem] text-dim">
                        Updated {s.updated} · {s.by}
                      </div>
                      {s.by !== "Architect" ? (
                        <button
                          onClick={() => {
                            setRevealed(revealed === id ? null : id);
                            if (revealed !== id) toast("Secret revealed for 30 seconds · access logged");
                          }}
                          className="text-dim hover:text-fg cursor-pointer"
                          aria-label="reveal"
                        >
                          {revealed === id ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      ) : (
                        <Badge>managed</Badge>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {section === "access" && (
          <div className="rise">
            <h2 className="text-[1.4rem] font-semibold tracking-[-0.02em] m-0 mb-1">Project access</h2>
            <p className="text-[0.85rem] text-muted mb-4">Inherited from workspace roles unless overridden here.</p>
            <div className="border border-line rounded-lg overflow-hidden">
              {[
                [user?.name ?? "You", me, "Owner"],
                ["Priya Sharma", "priya@acme.com", "Editor"],
                ["Support Leads (group)", "#support-leads", "Approver"],
                ["Marcus Lee", "marcus@acme.com", "Viewer"],
              ].map(([n, e, r]) => (
                <div key={e} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-0">
                  <span className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-[0.72rem] font-semibold">{n[0]}</span>
                  <div className="flex-1">
                    <div className="text-[0.85rem] font-medium">{n}</div>
                    <div className="text-[0.72rem] text-dim">{e}</div>
                  </div>
                  <select defaultValue={r} onChange={(ev) => toast(`${n}: role changed to ${ev.target.value}`)} className="bg-bg border border-line-2 rounded-md px-2 py-1 text-[0.78rem] text-fg">
                    <option>Owner</option>
                    <option>Editor</option>
                    <option>Approver</option>
                    <option>Viewer</option>
                  </select>
                </div>
              ))}
            </div>
            <Btn size="sm" className="mt-3" onClick={() => nav("/app/team")}>
              Manage workspace members →
            </Btn>
          </div>
        )}

        {section === "audit log" && (
          <div className="rise">
            <div className="flex items-end justify-between mb-4">
              <h2 className="text-[1.4rem] font-semibold tracking-[-0.02em] m-0">Audit log</h2>
              <Btn size="sm" onClick={() => toast(`Audit log export (CSV) sent to ${me}`)}>
                Export
              </Btn>
            </div>
            <div className="border border-line rounded-lg overflow-hidden">
              {auditFor(me).map(([t, who, what, kind]) => (
                <div key={t} className="grid grid-cols-[9rem_10rem_1fr_6rem] gap-3 items-center px-4 py-2.5 border-b border-line last:border-0">
                  <span className="font-mono text-[0.62rem] text-dim">{t}</span>
                  <span className="text-[0.78rem] truncate">{who}</span>
                  <span className="text-[0.8rem] text-muted truncate">{what}</span>
                  <Badge tone={kind === "security" ? "warn" : "neutral"}>{kind}</Badge>
                </div>
              ))}
            </div>
            <div className="text-[0.72rem] text-dim mt-2">Exportable as CSV</div>
          </div>
        )}

        {section === "danger zone" && (
          <div className="rise space-y-3">
            <h2 className="text-[1.4rem] font-semibold tracking-[-0.02em] m-0 mb-2">Danger zone</h2>
            {[
              ["Pause all agents", "Agents stop processing immediately. The application remains available.", "Pause agents", () => toast("All agents paused · kill switch engaged")],
              ["Archive project", "Stops all deployments. Data is retained for 90 days and can be restored.", "Archive", () => (updateProject(p.id, { status: "draft" }), toast("Project archived"))],
            ].map(([t, d, a, fn]) => (
              <div key={t as string} className="border border-line rounded-lg p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-[0.88rem] font-semibold">{t as string}</div>
                  <div className="text-[0.78rem] text-muted">{d as string}</div>
                </div>
                <Btn variant="danger" size="sm" onClick={fn as () => void}>
                  {a as string}
                </Btn>
              </div>
            ))}
            <div className="border border-danger/40 rounded-lg p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-[0.88rem] font-semibold">Delete project</div>
                <div className="text-[0.78rem] text-muted">Permanently removes the project, deployments and data. This cannot be undone.</div>
              </div>
              <Btn variant="danger" size="sm" onClick={() => setDelOpen(true)}>
                Delete
              </Btn>
            </div>
          </div>
        )}
      </section>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add secret">
        <div className="space-y-3">
          <Field label="name">
            <Input value={newKey} onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))} placeholder="SALESFORCE_API_KEY" autoFocus />
          </Field>
          <Field label="value" hint="Encrypted on submit. Not visible again without re-authentication.">
            <Input type="password" placeholder="••••••••" />
          </Field>
          <Field label="environment">
            <select className="w-full bg-bg border border-line-2 rounded-[7px] px-2 py-2 text-[0.85rem] text-fg">
              <option>production</option>
              <option>staging</option>
              <option>all</option>
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={() => setAddOpen(false)}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            disabled={!newKey}
            onClick={() => {
              setSecrets((s) => [{ key: newKey, env: "production", updated: "just now", by: "you" }, ...s]);
              setAddOpen(false);
              setNewKey("");
              toast(`${newKey} stored in vault`);
            }}
          >
            Save secret
          </Btn>
        </div>
      </Modal>

      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete project">
        <p className="text-[0.85rem] text-muted mt-0">
          This permanently deletes <b className="text-fg">{p.name}</b>, all deployments, data and history. Type the project name to confirm.
        </p>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={p.name} />
        <div className="flex justify-end gap-2 mt-4">
          <Btn variant="ghost" onClick={() => setDelOpen(false)}>
            Cancel
          </Btn>
          <Btn
            variant="danger"
            disabled={confirm !== p.name}
            onClick={() => {
              setDelOpen(false);
              toast(`${p.name} scheduled for deletion · owners notified`);
              nav("/app/projects");
            }}
          >
            Delete permanently
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
