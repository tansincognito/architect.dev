import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Copy, Download, Plus } from "lucide-react";
import { Badge, Bar, Btn, Field, H1, HairGrid, Input, Label, Modal, Pills, Toggle, cx } from "../components/ui";
import { useStore } from "../lib/store";
import { api, ApiError } from "../lib/api";

/* ---------------- credits ---------------- */

export function Credits() {
  const { credits, toast } = useStore();
  const [topup, setTopup] = useState(false);
  const usage = [
    ["support-triage-agent", "Change request · confidence per category", 3, "2m ago"],
    ["support-triage-agent", "Initial build", 42, "1h ago"],
    ["research-assistant", "Add weekly management summary", 12, "3h ago"],
    ["billing-dashboard", "Import and analysis", 20, "1d ago"],
    ["invoice-extractor", "Governance remediation", 7, "2d ago"],
  ] as const;
  const byProject = [
    ["support-triage-agent", 1840],
    ["research-assistant", 1210],
    ["invoice-extractor", 640],
    ["billing-dashboard", 470],
  ] as const;

  return (
    <main className="px-4 md:px-8 py-8 max-w-[1100px]">
      <H1 sub="Credits are consumed when Architect builds or changes software. Agent runtime is billed separately under Billing.">Usage</H1>
      <div className="border border-line rounded-lg p-7 mb-6 flex flex-wrap items-end gap-8">
        <div>
          <Label className="mb-1.5">balance</Label>
          <div className="font-mono text-[3.5rem] font-bold text-neon-ink tracking-[-0.05em] leading-none">{credits}</div>
        </div>
        <div className="pb-1.5">
          <div className="text-[0.78rem] text-dim mb-1">Renews in 14 days</div>
          <Bar value={83.2} className="w-[200px]" />
          <div className="font-mono text-[0.62rem] text-dim mt-1">4,160 of 5,000 used this cycle</div>
        </div>
        <div className="ml-auto flex gap-2">
          <Btn onClick={() => toast("Usage report (CSV) sent to your email")}>
            <Download size={12} /> Export usage
          </Btn>
          <Btn variant="primary" onClick={() => setTopup(true)}>
            Purchase credits
          </Btn>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <Label className="mb-2">by project · this cycle</Label>
          <div className="border border-line rounded-lg p-4 space-y-3">
            {byProject.map(([p, v]) => (
              <div key={p}>
                <div className="flex justify-between text-[0.8rem] mb-1">
                  <span className="font-mono text-[0.72rem]">{p}</span>
                  <span>{v.toLocaleString()}</span>
                </div>
                <Bar value={(v / 1840) * 100} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <Label className="mb-2">recent usage</Label>
          <div className="border border-line rounded-lg overflow-hidden">
            {usage.map(([p, l, c, t], i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line last:border-0">
                <div className="min-w-0">
                  <div className="text-[0.82rem] truncate">{l}</div>
                  <div className="font-mono text-[0.6rem] text-dim">
                    {p} · {t}
                  </div>
                </div>
                <span className="font-mono text-[0.68rem] text-neon-ink bg-neon-soft border border-neon-line rounded-[3px] px-1.5 py-px">-{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={topup} onClose={() => setTopup(false)} title="Purchase credits">
        <div className="grid grid-cols-3 gap-2">
          {[
            ["2,500", "$40"],
            ["10,000", "$150"],
            ["50,000", "$650"],
          ].map(([c, p], i) => (
            <button key={c} className={cx("border rounded-lg p-3 text-left cursor-pointer", i === 1 ? "border-fg bg-surface" : "border-line hover:border-line-2")}>
              <div className="font-mono text-[1rem] font-bold">{c}</div>
              <div className="text-[0.78rem] text-muted">{p}</div>
            </button>
          ))}
        </div>
        <div className="text-[0.78rem] text-dim mt-3">Charged to the invoice account on file (Acme Corp · PO 2026-114). Credits do not expire.</div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={() => setTopup(false)}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={() => (setTopup(false), toast("10,000 credits added · invoice to follow"))}>
            Confirm purchase
          </Btn>
        </div>
      </Modal>
    </main>
  );
}

/* ---------------- billing ---------------- */

export function Billing() {
  const { toast } = useStore();
  const plans = [
    { name: "Team", price: "$49", per: "per seat / month", feats: ["5,000 credits / month", "Business and developer views", "Community support"], current: false },
    { name: "Business", price: "$99", per: "per seat / month", feats: ["25,000 credits / month", "Audit log and approvals", "Standard support"], current: true },
    { name: "Enterprise", price: "Custom", per: "annual agreement", feats: ["Unlimited projects", "Deploy to your own cloud", "Dedicated success manager"], current: false },
  ];
  return (
    <main className="px-4 md:px-8 py-8 max-w-[1100px]">
      <H1 sub="Acme Corp · billed annually by invoice">Billing</H1>
      <HairGrid className="grid-cols-1 md:grid-cols-3 mb-8">
        {plans.map((p) => (
          <div key={p.name} className={cx("p-6 relative", p.current ? "bg-surface" : "bg-bg")}>
            {p.current && <Badge tone="neon" className="absolute top-4 right-4">current plan</Badge>}
            <Label>{p.name}</Label>
            <div className="text-[1.8rem] font-semibold tracking-[-0.02em] mt-2">{p.price}</div>
            <div className="text-[0.75rem] text-dim">{p.per}</div>
            <ul className="list-none p-0 mt-4 space-y-1.5 text-[0.82rem] text-muted">
              {p.feats.map((f) => (
                <li key={f}>→ {f}</li>
              ))}
            </ul>
            {!p.current && (
              <Btn size="sm" className="mt-5" onClick={() => toast(p.name === "Enterprise" ? "Your account team will contact you within one business day" : `Changed to ${p.name} at next renewal`)}>
                {p.name === "Enterprise" ? "Contact sales" : "Change plan"}
              </Btn>
            )}
          </div>
        ))}
      </HairGrid>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div>
          <Label className="mb-2">invoices</Label>
          <div className="border border-line rounded-lg overflow-hidden">
            {[
              ["INV-2026-0914", "Sep 2026", "$4,212.40", "paid"],
              ["INV-2026-0814", "Aug 2026", "$3,980.10", "paid"],
              ["INV-2026-0714", "Jul 2026", "$3,640.00", "paid"],
            ].map(([n, m, a, s]) => (
              <div key={n} className="grid grid-cols-[1fr_6rem_6rem_4rem_auto] gap-3 items-center px-4 py-3 border-b border-line last:border-0">
                <span className="font-mono text-[0.72rem]">{n}</span>
                <span className="text-[0.8rem] text-muted">{m}</span>
                <span className="text-[0.82rem]">{a}</span>
                <Badge tone="neon">{s}</Badge>
                <button onClick={() => toast(`${n}.pdf downloaded`)} className="text-dim hover:text-fg cursor-pointer" aria-label="download">
                  <Download size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="border border-line rounded-lg p-4">
            <Label className="mb-2">this cycle</Label>
            {[
              ["Seats (24 × $99)", "$2,376.00"],
              ["Agent runtime", "$1,412.80"],
              ["Model usage (pass-through)", "$423.60"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-[0.8rem] py-1">
                <span className="text-muted">{k}</span>
                <span>{v}</span>
              </div>
            ))}
            <div className="flex justify-between text-[0.88rem] font-semibold border-t border-line mt-2 pt-2">
              <span>Forecast</span>
              <span>$4,212.40</span>
            </div>
          </div>
          <div className="border border-line rounded-lg p-4">
            <Label className="mb-2">billing contact</Label>
            <div className="text-[0.82rem]">finance@acme.com · PO 2026-114</div>
            <button onClick={() => toast("Billing details opened")} className="text-[0.75rem] text-dim hover:text-fg mt-1 cursor-pointer">
              Update
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------------- team ---------------- */

const MEMBERS = [
  { n: "Priya Sharma", e: "priya@acme.com", r: "Admin", t: "Platform Engineering", last: "2h ago", view: "Developer" },
  { n: "Marcus Lee", e: "marcus@acme.com", r: "Viewer", t: "Finance", last: "1d ago", view: "Business" },
  { n: "Elena García", e: "elena@acme.com", r: "Approver", t: "Support Leadership", last: "3h ago", view: "Business" },
  { n: "Tom Becker", e: "tom@acme.com", r: "Editor", t: "Platform Engineering", last: "5h ago", view: "Developer" },
];

export function Team() {
  const { toast, user, mode } = useStore();
  const members = [
    { n: user?.name ?? "You", e: user?.email ?? "", r: "Owner", t: "Customer Operations", last: "now", view: mode === "dev" ? "Developer" : "Business" },
    ...MEMBERS,
  ];
  const [invite, setInvite] = useState(false);
  const [pending, setPending] = useState(["sam@acme.com · Editor"]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Editor");
  return (
    <main className="px-4 md:px-8 py-8 max-w-[1100px]">
      <H1
        sub="24 seats in use"
        right={
          <Btn variant="primary" onClick={() => setInvite(true)}>
            <Plus size={12} /> Invite members
          </Btn>
        }
      >
        Members & roles
      </H1>
      <div className="border border-line rounded-lg overflow-hidden mb-6">
        {members.map((m) => (
          <div key={m.e} className="grid grid-cols-[2rem_1fr_10rem_6rem_6rem_7rem] gap-3 items-center px-4 py-3 border-b border-line last:border-0">
            <span className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-[0.72rem] font-semibold">{m.n[0]}</span>
            <div>
              <div className="text-[0.85rem] font-medium">{m.n}</div>
              <div className="text-[0.72rem] text-dim">
                {m.e} · {m.t}
              </div>
            </div>
            <select defaultValue={m.r} onChange={(e) => toast(`${m.n}: role changed to ${e.target.value}`)} className="bg-bg border border-line-2 rounded-md px-2 py-1 text-[0.78rem] text-fg" disabled={m.r === "Owner"}>
              {["Owner", "Admin", "Editor", "Approver", "Viewer"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <Badge>{m.view}</Badge>
            <span className="text-[0.72rem] text-dim">{m.last}</span>
            <span />
          </div>
        ))}
      </div>
      {pending.length > 0 && (
        <>
          <Label className="mb-2">pending invitations</Label>
          {pending.map((p) => (
            <div key={p} className="flex items-center justify-between border border-line rounded-lg px-4 py-2.5 mb-2 text-[0.82rem]">
              {p}
              <button onClick={() => setPending((x) => x.filter((y) => y !== p))} className="text-[0.75rem] text-dim hover:text-danger cursor-pointer">
                Revoke
              </button>
            </div>
          ))}
        </>
      )}
      <div className="mt-6">
        <Label className="mb-2">role permissions</Label>
        <div className="border border-line rounded-lg overflow-x-auto">
          <table className="w-full text-[0.78rem] border-collapse">
            <thead>
              <tr className="bg-surface text-dim">
                <th className="text-left px-4 py-2 font-normal">Permission</th>
                {["Admin", "Editor", "Approver", "Viewer"].map((r) => (
                  <th key={r} className="px-3 py-2 font-normal">
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Build and change projects", 1, 1, 0, 0],
                ["Deploy to production", 1, 0, 0, 0],
                ["Approve agent actions", 1, 0, 1, 0],
                ["Manage credentials", 1, 0, 0, 0],
                ["View monitoring and audit log", 1, 1, 1, 1],
              ].map(([p, ...v]) => (
                <tr key={p as string} className="border-t border-line">
                  <td className="px-4 py-2">{p}</td>
                  {v.map((x, i) => (
                    <td key={i} className="text-center">
                      {x ? "✓" : <span className="text-dim">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={invite} onClose={() => setInvite(false)} title="Invite members">
        <div className="space-y-3">
          <Field label="email addresses" hint="Separate multiple addresses with commas">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@acme.com" autoFocus />
          </Field>
          <Field label="role">
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-bg border border-line-2 rounded-[7px] px-2 py-2 text-[0.85rem] text-fg">
              {["Admin", "Editor", "Approver", "Viewer"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={() => setInvite(false)}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            disabled={!email.includes("@")}
            onClick={() => {
              setPending((p) => [...p, `${email} · ${role}`]);
              setInvite(false);
              setEmail("");
              toast("Invitation sent");
            }}
          >
            Send invitation
          </Btn>
        </div>
      </Modal>
    </main>
  );
}

/* ---------------- account settings ---------------- */

export function Settings() {
  const [params] = useSearchParams();
  const { user, signIn, mode, setMode, theme, setTheme, toast } = useStore();
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"profile" | "password" | null>(null);
  const [tab, setTab] = useState<"profile" | "api" | "notifications">(params.get("tab") === "api" ? "api" : "profile");
  const [keys, setKeys] = useState([{ name: "ci-deploy", created: "2026-08-02", last: "1h ago", scope: "deploy" }]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [creating, setCreating] = useState(false);

  return (
    <main className="px-4 md:px-8 py-8 max-w-[900px]">
      <H1 right={<Pills items={["profile", "api", "notifications"] as const} value={tab} onChange={setTab} />}>Account settings</H1>

      {tab === "profile" && (
        <div className="space-y-4 rise">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="full name">
              <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
            </Field>
            <Field label="email">
              <Input defaultValue={user?.email} disabled />
            </Field>
          </div>
          <div className="flex items-center justify-between border border-line rounded-lg p-4">
            <div>
              <div className="text-[0.88rem] font-semibold">Default view</div>
              <div className="text-[0.78rem] text-muted">Business hides code and infrastructure. Developer shows everything.</div>
            </div>
            <Pills items={[{ value: "simple" as const, label: "business" }, { value: "dev" as const, label: "developer" }]} value={mode} onChange={setMode} />
          </div>
          <div className="flex items-center justify-between border border-line rounded-lg p-4">
            <div>
              <div className="text-[0.88rem] font-semibold">Appearance</div>
              <div className="text-[0.78rem] text-muted">Light or dark theme</div>
            </div>
            <Pills items={["light", "dark"] as const} value={theme} onChange={setTheme} />
          </div>
          <Btn
            variant="primary"
            disabled={!profileName.trim() || saving === "profile"}
            onClick={async () => {
              setSaving("profile");
              try {
                const { user: updated } = await api.updateMe({ name: profileName.trim() });
                signIn(updated);
                toast("Profile saved");
              } catch (err) {
                toast(err instanceof ApiError ? err.message : "Could not save profile");
              } finally {
                setSaving(null);
              }
            }}
          >
            Save
          </Btn>
          <form
            className="border border-line rounded-lg p-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving("password");
              setPwError(null);
              try {
                await api.changePassword(pw);
                setPw({ current: "", next: "" });
                toast("Password changed · other sessions signed out");
              } catch (err) {
                setPwError(err instanceof ApiError ? err.message : "Could not change password");
              } finally {
                setSaving(null);
              }
            }}
          >
            <div className="text-[0.88rem] font-semibold">Change password</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="current password">
                <Input type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              </Field>
              <Field label="new password" hint="At least 8 characters.">
                <Input type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
              </Field>
            </div>
            {pwError && <div className="text-[0.8rem] text-danger">{pwError}</div>}
            <Btn type="submit" disabled={!pw.current || pw.next.length < 8 || saving === "password"}>
              Update password
            </Btn>
          </form>
        </div>
      )}

      {tab === "api" && (
        <div className="space-y-6 rise">
          <div>
            <div className="flex items-end justify-between mb-2">
              <Label>api keys</Label>
              <Btn size="sm" onClick={() => setCreating(true)}>
                <Plus size={11} /> Create key
              </Btn>
            </div>
            <div className="border border-line rounded-lg overflow-hidden">
              {keys.map((k) => (
                <div key={k.name} className="grid grid-cols-[1fr_6rem_8rem_6rem_auto] gap-3 items-center px-4 py-3 border-b border-line last:border-0">
                  <span className="font-mono text-[0.75rem] font-bold">{k.name}</span>
                  <Badge>{k.scope}</Badge>
                  <span className="text-[0.72rem] text-dim">Created {k.created}</span>
                  <span className="text-[0.72rem] text-dim">Used {k.last}</span>
                  <button onClick={() => (setKeys((x) => x.filter((y) => y.name !== k.name)), toast(`${k.name} revoked`))} className="text-[0.75rem] text-danger cursor-pointer">
                    Revoke
                  </button>
                </div>
              ))}
            </div>
            {newKey && (
              <div className="mt-3 border border-neon-line bg-neon-soft rounded-lg p-4 rise">
                <div className="text-[0.85rem] font-semibold">Copy this key now. It will not be shown again.</div>
                <div className="flex items-center gap-2 mt-2">
                  <code className="font-mono text-[0.72rem] bg-bg border border-line rounded px-2 py-1 flex-1">{newKey}</code>
                  <Btn size="sm" onClick={() => toast("Copied to clipboard")}>
                    <Copy size={11} /> Copy
                  </Btn>
                </div>
              </div>
            )}
          </div>
          <div>
            <Label className="mb-2">command-line interface</Label>
            <pre className="bg-ink text-[#bbb] border border-ink-line rounded-lg p-4 font-mono text-[0.7rem] leading-relaxed m-0">
              <span className="text-[#555]"># install</span>
              {"\n"}npm i -g @architect/cli{"\n\n"}
              <span className="text-[#555]"># authenticate, then work locally</span>
              {"\n"}architect login{"\n"}architect pull support-triage-agent{"\n"}architect dev{"          "}
              <span className="text-[#555]"># local preview with sandboxed agents</span>
              {"\n"}architect push{"         "}
              <span className="text-[#555]"># sync changes back; opens a pull request</span>
            </pre>
          </div>
          <div className="flex items-center justify-between border border-line rounded-lg p-4">
            <div>
              <div className="text-[0.88rem] font-semibold">VS Code & JetBrains extensions</div>
              <div className="text-[0.78rem] text-muted">Two-way sync, traces inline, and Architect chat inside the IDE.</div>
            </div>
            <Btn size="sm" onClick={() => toast("Opening the VS Code Marketplace")}>
              Install
            </Btn>
          </div>
        </div>
      )}

      {tab === "notifications" && (
        <div className="border border-line rounded-lg overflow-hidden rise">
          {[
            ["Approval requests", "Email · Slack", true],
            ["Deployment results", "Email", true],
            ["Quality regressions", "Email · Slack", true],
            ["Budget alerts (80% and 100%)", "Email", true],
            ["Weekly executive summary", "Email, Mondays 08:00", false],
          ].map(([t, ch, on]) => (
            <div key={t as string} className="flex items-center justify-between px-4 py-3.5 border-b border-line last:border-0">
              <div>
                <div className="text-[0.88rem]">{t as string}</div>
                <div className="text-[0.72rem] text-dim">{ch as string}</div>
              </div>
              <Toggle on={on as boolean} onChange={() => toast("Notification preference saved")} />
            </div>
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Create API key">
        <div className="space-y-3">
          <Field label="name">
            <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="github-actions" autoFocus />
          </Field>
          <Field label="scope">
            <select className="w-full bg-bg border border-line-2 rounded-[7px] px-2 py-2 text-[0.85rem] text-fg">
              <option>read</option>
              <option>deploy</option>
              <option>admin</option>
            </select>
          </Field>
          <Field label="expires">
            <select className="w-full bg-bg border border-line-2 rounded-[7px] px-2 py-2 text-[0.85rem] text-fg">
              <option>90 days</option>
              <option>1 year</option>
              <option>Never (not recommended)</option>
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={() => setCreating(false)}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            disabled={!keyName}
            onClick={() => {
              setKeys((k) => [...k, { name: keyName, created: "2026-10-01", last: "never", scope: "read" }]);
              setNewKey(`arch_live_${Math.random().toString(36).slice(2, 10)}…`);
              setCreating(false);
              setKeyName("");
            }}
          >
            Create
          </Btn>
        </div>
      </Modal>
    </main>
  );
}

/* ---------------- docs ---------------- */

export function Docs() {
  const sections = [
    ["01", "Getting started", "From first request to production in under an hour."],
    ["02", "Writing effective requests", "How to describe outcomes, constraints and policies."],
    ["03", "Governance & the readiness checklist", "The 12 control areas and how each is enforced."],
    ["04", "Approvals & human oversight", "Designing approval policies, SLAs and escalation paths."],
    ["05", "Agent frameworks", "LangGraph, CrewAI, OpenAI and Claude Agent SDKs, Vercel AI SDK and more."],
    ["06", "Importing existing applications", "Repository analysis, findings and remediation."],
    ["07", "Deployment & rollback", "Environments, rollout strategies and recovery."],
    ["08", "Security & access", "Roles, credentials, encryption and the audit log."],
    ["09", "CLI, API & IDE extensions", "Working from your own tools with two-way sync."],
  ];
  return (
    <main className="px-4 md:px-8 py-8 max-w-[960px]">
      <H1 sub="Guides for business and technical teams.">Documentation</H1>
      <div className="flex flex-col gap-px bg-line border border-line rounded-lg overflow-hidden">
        {sections.map(([id, t, d]) => (
          <div key={id} className="bg-bg hover:bg-surface px-5 py-4 grid grid-cols-[2rem_1fr_auto] gap-4 items-center cursor-pointer transition-colors">
            <span className="font-mono text-[0.55rem] text-dim tracking-[0.1em]">{id}</span>
            <div>
              <div className="text-[0.92rem] font-semibold">{t}</div>
              <div className="text-[0.78rem] text-muted">{d}</div>
            </div>
            <span className="text-dim">→</span>
          </div>
        ))}
      </div>
    </main>
  );
}
