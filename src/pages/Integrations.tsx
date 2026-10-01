import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Badge, Btn, Field, H1, HairGrid, Input, Label, Modal, Pills, Spinner, Status, Toggle } from "../components/ui";
import { useStore } from "../lib/store";

interface Integration {
  name: string;
  cat: string;
  desc: string;
  connected: boolean;
}

const ALL: Integration[] = [
  { name: "GitHub", cat: "source & deploy", desc: "Repositories, pull requests, Actions", connected: true },
  { name: "GitLab", cat: "source & deploy", desc: "Cloud and self-managed", connected: false },
  { name: "Vercel", cat: "source & deploy", desc: "Deploy applications", connected: true },
  { name: "AWS", cat: "source & deploy", desc: "Deploy to your own account", connected: false },
  { name: "Zendesk", cat: "business apps", desc: "Tickets and customer data", connected: true },
  { name: "Salesforce", cat: "business apps", desc: "CRM objects and Service Cloud", connected: false },
  { name: "ServiceNow", cat: "business apps", desc: "ITSM incidents and requests", connected: false },
  { name: "SAP S/4HANA", cat: "business apps", desc: "Vendors, purchase orders, finance", connected: false },
  { name: "Slack", cat: "business apps", desc: "Approvals and notifications", connected: true },
  { name: "Microsoft Teams", cat: "business apps", desc: "Approvals and notifications", connected: false },
  { name: "Snowflake", cat: "data", desc: "Warehouse queries for agents", connected: false },
  { name: "Postgres", cat: "data", desc: "Managed or bring your own", connected: true },
  { name: "Datadog", cat: "observability", desc: "Export traces and metrics", connected: true },
  { name: "Splunk", cat: "observability", desc: "Audit log streaming", connected: false },
];

const PROVIDERS = [
  { name: "Anthropic", models: "Claude Opus, Sonnet, Haiku", key: "Architect-managed", on: true },
  { name: "OpenAI", models: "GPT-4.1, o-series", key: "Architect-managed", on: true },
  { name: "Azure OpenAI", models: "Your Azure tenant", key: "Your key", on: false },
  { name: "AWS Bedrock", models: "Your account", key: "Your key", on: false },
];

const MCP = [
  { name: "linear", url: "mcp.linear.app", tools: 12, status: "healthy" },
  { name: "internal-hr-api", url: "mcp.acme.internal/hr", tools: 5, status: "healthy" },
  { name: "jira", url: "mcp.atlassian.com", tools: 18, status: "degraded" },
];

export default function Integrations() {
  const { toast } = useStore();
  const [items, setItems] = useState(ALL);
  const [cat, setCat] = useState<"all" | "source & deploy" | "business apps" | "data" | "observability">("all");
  const [connecting, setConnecting] = useState<Integration | null>(null);
  const [phase, setPhase] = useState<"scopes" | "working">("scopes");
  const [mcpOpen, setMcpOpen] = useState(false);
  const [mcp, setMcp] = useState(MCP);
  const [mcpUrl, setMcpUrl] = useState("");

  const list = items.filter((i) => cat === "all" || i.cat === cat);

  const toggle = (i: Integration) => {
    if (i.connected) {
      setItems((x) => x.map((y) => (y.name === i.name ? { ...y, connected: false } : y)));
      toast(`${i.name} disconnected`);
    } else {
      setPhase("scopes");
      setConnecting(i);
    }
  };

  return (
    <main className="px-4 md:px-8 py-8 space-y-10">
      <div>
        <H1 sub={`${items.filter((i) => i.connected).length} connected · managed by workspace administrators`} right={<Pills items={["all", "source & deploy", "business apps", "data", "observability"] as const} value={cat} onChange={setCat} />}>
          Integrations
        </H1>
        <HairGrid className="grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
          {list.map((i) => (
            <div key={i.name} className="bg-bg p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[0.92rem] font-semibold">{i.name}</span>
                <Toggle on={i.connected} onChange={() => toggle(i)} label={i.name} />
              </div>
              <div className="text-[0.78rem] text-muted">{i.desc}</div>
              <div className="mt-2.5">
                <Badge tone={i.connected ? "neon" : "neutral"}>{i.connected ? "connected" : "not connected"}</Badge>
              </div>
            </div>
          ))}
        </HairGrid>
      </div>

      <div>
        <Label className="mb-1">ai model providers</Label>
        <p className="text-[0.82rem] text-muted mt-0 mb-3">Use Architect-managed access, or bring your own keys to keep traffic within your cloud tenancy.</p>
        <div className="border border-line rounded-lg overflow-hidden">
          {PROVIDERS.map((p) => (
            <div key={p.name} className="flex items-center gap-4 px-4 py-3 border-b border-line last:border-0">
              <div className="flex-1">
                <div className="text-[0.88rem] font-semibold">{p.name}</div>
                <div className="text-[0.75rem] text-dim">{p.models}</div>
              </div>
              <Badge>{p.key}</Badge>
              <Btn size="sm" onClick={() => toast(p.on ? `${p.name} settings opened` : `Enter your ${p.name} credentials to enable`)}>
                {p.on ? "Configure" : "Add key"}
              </Btn>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-end justify-between mb-3">
          <div>
            <Label className="mb-1">tool servers (mcp)</Label>
            <p className="text-[0.82rem] text-muted m-0">Model Context Protocol servers give agents governed access to internal systems.</p>
          </div>
          <Btn size="sm" onClick={() => setMcpOpen(true)}>
            <Plus size={11} /> Add server
          </Btn>
        </div>
        <div className="border border-line rounded-lg overflow-hidden">
          {mcp.map((m) => (
            <div key={m.name} className="grid grid-cols-[1fr_1fr_5rem_6rem] gap-3 items-center px-4 py-3 border-b border-line last:border-0">
              <span className="font-mono text-[0.75rem] font-bold">{m.name}</span>
              <span className="font-mono text-[0.65rem] text-dim truncate">{m.url}</span>
              <span className="text-[0.75rem] text-muted">{m.tools} tools</span>
              <Status status={m.status} />
            </div>
          ))}
        </div>
      </div>

      <Modal open={!!connecting} onClose={() => setConnecting(null)} title={`Connect ${connecting?.name}`}>
        {phase === "scopes" ? (
          <>
            <Label className="mb-2">access requested</Label>
            {["Read records", "Create and update records (agents require approval for writes)", "Receive webhook events"].map((s) => (
              <div key={s} className="flex items-center gap-2 text-[0.82rem] py-1">
                <Check size={12} className="text-live" /> {s}
              </div>
            ))}
            <Field label="available to">
              <select className="w-full bg-bg border border-line-2 rounded-[7px] px-2 py-2 text-[0.85rem] text-fg mt-1">
                <option>All projects in this workspace</option>
                <option>Selected projects only</option>
              </select>
            </Field>
            <div className="flex justify-end gap-2 mt-5">
              <Btn variant="ghost" onClick={() => setConnecting(null)}>
                Cancel
              </Btn>
              <Btn
                variant="primary"
                onClick={() => {
                  setPhase("working");
                  setTimeout(() => {
                    setItems((x) => x.map((y) => (y.name === connecting!.name ? { ...y, connected: true } : y)));
                    toast(`${connecting!.name} connected`);
                    setConnecting(null);
                  }, 1200);
                }}
              >
                Continue to {connecting?.name}
              </Btn>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-[0.88rem] text-muted py-6">
            <Spinner /> Completing authorisation with {connecting?.name}
          </div>
        )}
      </Modal>

      <Modal open={mcpOpen} onClose={() => setMcpOpen(false)} title="Add MCP server">
        <div className="space-y-3">
          <Field label="server url">
            <Input value={mcpUrl} onChange={(e) => setMcpUrl(e.target.value)} placeholder="https://mcp.acme.internal/finance" autoFocus />
          </Field>
          <Field label="authentication">
            <select className="w-full bg-bg border border-line-2 rounded-[7px] px-2 py-2 text-[0.85rem] text-fg">
              <option>OAuth 2.1</option>
              <option>API key (stored in vault)</option>
              <option>None (internal network)</option>
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Btn variant="ghost" onClick={() => setMcpOpen(false)}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            disabled={!mcpUrl}
            onClick={() => {
              const name = mcpUrl.replace(/https?:\/\//, "").split("/").pop() || "server";
              setMcp((m) => [...m, { name, url: mcpUrl.replace(/https?:\/\//, ""), tools: 7, status: "healthy" }]);
              setMcpOpen(false);
              setMcpUrl("");
              toast(`${name}: 7 tools discovered · available to agents after review`);
            }}
          >
            Connect and discover tools
          </Btn>
        </div>
      </Modal>
    </main>
  );
}
