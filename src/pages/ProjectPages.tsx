import { useNavigate } from "react-router-dom";
import { Copy, Eye, Globe, Share2 } from "lucide-react";
import { ProjectList } from "../components/ProjectList";
import { Badge, Btn, Empty, H1, Status } from "../components/ui";
import { useStore } from "../lib/store";

export function MyProjects() {
  const { projects } = useStore();
  const nav = useNavigate();
  const mine = projects.filter((p) => !p.sharedBy);
  return (
    <main className="px-4 md:px-8 py-8">
      <ProjectList projects={mine} title="My projects" />
      <button onClick={() => nav("/app")} className="mt-5 w-full border border-dashed border-line-2 rounded-md py-3 text-[0.82rem] text-dim hover:text-fg hover:border-fg cursor-pointer">
        + New project
      </button>
    </main>
  );
}

export function PublishedProjects() {
  const { projects, toast } = useStore();
  const nav = useNavigate();
  const published = projects.filter((p) => p.published);
  return (
    <main className="px-4 md:px-8 py-8">
      <H1 sub="Applications available to people outside the build team, through a link or your organisation's app gallery.">Published projects</H1>
      {published.length === 0 ? (
        <Empty title="Nothing published yet" body="Open a project and choose Publish to make it available to colleagues or customers." />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {published.map((p) => (
            <div key={p.id} className="border border-line rounded-lg overflow-hidden">
              <div className="h-[110px] bg-surface border-b border-line flex items-center justify-center">
                <Globe size={24} className="text-dim" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[0.82rem] font-bold">{p.name}</span>
                  <Status status={p.status} />
                </div>
                <div className="text-[0.78rem] text-muted mt-1 line-clamp-2">{p.desc}</div>
                <div className="flex items-center gap-3 mt-3 text-[0.72rem] text-dim">
                  <span className="inline-flex items-center gap-1">
                    <Eye size={11} /> {(p.views ?? 0).toLocaleString()} visits
                  </span>
                  <Badge>{p.id === "landing-page-v3" ? "public link" : "organisation"}</Badge>
                </div>
                <div className="flex gap-2 mt-4">
                  <Btn size="sm" onClick={() => toast(`${p.url ?? p.id} copied`)}>
                    <Copy size={11} /> Copy link
                  </Btn>
                  <Btn size="sm" variant="ghost" onClick={() => nav(`/app/p/${p.id}`)}>
                    Manage
                  </Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export function SharedProjects() {
  const { projects } = useStore();
  const nav = useNavigate();
  const shared = projects.filter((p) => p.sharedBy);
  return (
    <main className="px-4 md:px-8 py-8">
      <H1 sub="Projects colleagues have shared with you. Your access level is set by the project owner.">Shared with me</H1>
      <div className="border border-line rounded-lg overflow-hidden">
        {shared.map((p) => (
          <button key={p.id} onClick={() => nav(`/app/p/${p.id}`)} className="w-full text-left grid grid-cols-[1fr_10rem_6rem_6rem] gap-4 items-center px-4 py-3.5 border-b border-line last:border-0 hover:bg-surface cursor-pointer">
            <div className="min-w-0">
              <div className="font-mono text-[0.8rem] font-bold flex items-center gap-2">
                <Share2 size={11} className="text-dim" /> {p.name}
              </div>
              <div className="text-[0.75rem] text-dim truncate">{p.desc}</div>
            </div>
            <span className="text-[0.78rem] text-muted">Shared by {p.sharedBy}</span>
            <Badge>{p.sharedBy === "Priya Sharma" ? "editor" : "viewer"}</Badge>
            <Status status={p.status} />
          </button>
        ))}
      </div>
    </main>
  );
}
