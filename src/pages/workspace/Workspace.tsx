import { useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { Check, ExternalLink, GitBranch, Globe, Rocket, Share2 } from "lucide-react";
import { Badge, Btn, Field, Input, Label, Modal, Status, Toggle, cx } from "../../components/ui";
import { useStore } from "../../lib/store";
import type { Project } from "../../lib/data";

const TABS: { to: string; label: string; dev?: boolean }[] = [
  { to: "", label: "workspace" },
  { to: "code", label: "code", dev: true },
  { to: "agents", label: "agents" },
  { to: "data", label: "data", dev: true },
  { to: "github", label: "github" },
  { to: "readiness", label: "governance" },
  { to: "deploy", label: "deploy" },
  { to: "observe", label: "monitoring" },
  { to: "evals", label: "quality", dev: true },
  { to: "settings", label: "settings" },
];

export function useProject(): Project {
  const { id } = useParams();
  const { projects } = useStore();
  return (
    projects.find((p) => p.id === id) ?? {
      id: id ?? "unknown",
      name: id ?? "unknown",
      desc: "",
      stack: "Next.js",
      kind: "app",
      status: "draft",
      updated: "now",
      prompts: 0,
      readiness: 40,
    }
  );
}

export default function Workspace() {
  const p = useProject();
  const { mode } = useStore();
  const nav = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const tabs = TABS.filter((t) => mode === "dev" || !t.dev);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-line px-4 md:px-8 flex items-center justify-between gap-4 h-[46px]">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => nav("/app/projects")} className="font-mono text-[0.62rem] text-dim hover:text-fg cursor-pointer">
              Projects /
            </button>
            <span className="font-mono text-[0.82rem] font-bold truncate">{p.name}</span>
            <Status status={p.status} pulse={p.status === "building"} />
            {p.published && <Badge tone="neon">published</Badge>}
            {p.sharedBy && <Badge>shared by {p.sharedBy}</Badge>}
          </div>
          {mode === "dev" && (
            <span className="hidden md:inline-flex items-center gap-1 font-mono text-[0.58rem] text-muted bg-surface border border-line rounded px-1.5 py-[2px]">
              <GitBranch size={10} /> main
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {p.url && (
            <a href="#" onClick={(e) => e.preventDefault()} className="hidden md:inline-flex items-center gap-1 text-[0.75rem] text-dim hover:text-fg">
              {p.url} <ExternalLink size={10} />
            </a>
          )}
          <Btn size="sm" onClick={() => setShareOpen(true)}>
            <Share2 size={11} /> Share
          </Btn>
          <Btn size="sm" onClick={() => setPublishOpen(true)}>
            <Globe size={11} /> {p.published ? "Published" : "Publish"}
          </Btn>
          <Btn variant="primary" size="sm" onClick={() => nav(`/app/p/${p.id}/deploy`)}>
            <Rocket size={11} /> Deploy
          </Btn>
        </div>
      </div>
      <nav className="border-b border-line px-4 md:px-8 flex gap-px overflow-x-auto">
        {tabs.map((t) => (
          <NavLink
            key={t.label}
            to={t.to}
            end={t.to === ""}
            className={({ isActive }) =>
              cx(
                "font-mono text-[0.6rem] uppercase tracking-[0.06em] px-3 py-2.5 border-b-2 -mb-px whitespace-nowrap transition-colors",
                isActive ? "border-neon text-fg" : "border-transparent text-dim hover:text-muted",
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </div>
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} project={p} />
      <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} project={p} />
    </div>
  );
}

function ShareModal({ open, onClose, project }: { open: boolean; onClose: () => void; project: Project }) {
  const { toast } = useStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Editor");
  const [people, setPeople] = useState([
    ["Ajay", "Owner"],
    ["Priya Sharma", "Editor"],
    ["#support-leads", "Approver"],
  ]);
  const [linkOn, setLinkOn] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={`Share ${project.name}`}>
      <div className="flex gap-2">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Name, email or group" autoFocus />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="bg-bg border border-line-2 rounded-[7px] px-2 text-[0.82rem] text-fg">
          <option>Editor</option>
          <option>Approver</option>
          <option>Viewer</option>
        </select>
        <Btn
          variant="primary"
          disabled={!email}
          onClick={() => {
            setPeople((x) => [...x, [email, role]]);
            toast(`${email} invited as ${role.toLowerCase()}`);
            setEmail("");
          }}
        >
          Invite
        </Btn>
      </div>
      <Label className="mt-5 mb-1">people with access</Label>
      {people.map(([n, r]) => (
        <div key={n} className="flex items-center justify-between py-2 border-b border-line last:border-0">
          <span className="text-[0.85rem]">{n}</span>
          <span className="text-[0.78rem] text-muted">{r}</span>
        </div>
      ))}
      <div className="flex items-center justify-between mt-4 border border-line rounded-lg p-3">
        <div>
          <div className="text-[0.85rem] font-medium">Anyone in the organisation with the link can view</div>
          <div className="text-[0.72rem] text-dim">Viewers see the workspace and preview but cannot make changes.</div>
        </div>
        <Toggle on={linkOn} onChange={setLinkOn} />
      </div>
      <div className="flex justify-end mt-4">
        <Btn onClick={() => toast("Project link copied")}>Copy link</Btn>
      </div>
    </Modal>
  );
}

function PublishModal({ open, onClose, project }: { open: boolean; onClose: () => void; project: Project }) {
  const { toast, updateProject } = useStore();
  const nav = useNavigate();
  const [audience, setAudience] = useState("organisation");
  const [slug, setSlug] = useState(project.id);
  return (
    <Modal open={open} onClose={onClose} title={project.published ? "Publishing settings" : `Publish ${project.name}`}>
      <p className="text-[0.85rem] text-muted mt-0">Publishing makes the latest production version available to people outside the build team.</p>
      <Label className="mb-2">who can use it</Label>
      {[
        ["organisation", "Everyone in Acme Corp", "Listed in the organisation's app gallery"],
        ["link", "Anyone with the link", "No sign-in required. Suitable for customer-facing tools."],
        ["people", "Specific people or groups", "Access managed from Share"],
      ].map(([k, t, d]) => (
        <button key={k} onClick={() => setAudience(k)} className={cx("w-full text-left p-3 rounded-lg border mb-2 cursor-pointer flex gap-3", audience === k ? "border-fg bg-surface" : "border-line hover:border-line-2")}>
          <span className={cx("w-4 h-4 rounded-full border mt-0.5 shrink-0", audience === k ? "border-[5px] border-fg" : "border-line-2")} />
          <span>
            <span className="block text-[0.85rem] font-medium">{t}</span>
            <span className="block text-[0.72rem] text-dim">{d}</span>
          </span>
        </button>
      ))}
      <Field label="address">
        <div className="flex items-center gap-1">
          <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
          <span className="font-mono text-[0.72rem] text-dim whitespace-nowrap">.architect.app</span>
        </div>
      </Field>
      <div className="flex justify-between items-center mt-5">
        {project.published ? (
          <button
            onClick={() => {
              updateProject(project.id, { published: false });
              onClose();
              toast("Unpublished · the link no longer works");
            }}
            className="text-[0.78rem] text-danger cursor-pointer"
          >
            Unpublish
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            onClick={() => {
              updateProject(project.id, { published: true, url: `${slug}.architect.app`, views: project.views ?? 0 });
              onClose();
              toast(`Published at ${slug}.architect.app`);
              if (!project.published) nav("/app/published");
            }}
          >
            <Check size={12} /> {project.published ? "Save" : "Publish"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
