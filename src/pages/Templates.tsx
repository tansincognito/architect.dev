import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, LayoutTemplate } from "lucide-react";
import { AppPreview } from "../components/AppPreview";
import { Badge, Btn, H1, Label, Modal, Pills } from "../components/ui";
import { useStore } from "../lib/store";
import { TEMPLATES } from "../lib/data";

type Tpl = (typeof TEMPLATES)[number];

export default function Templates() {
  const nav = useNavigate();
  const { toast } = useStore();
  const [filter, setFilter] = useState<"all" | "agent" | "app">("all");
  const [open, setOpen] = useState<Tpl | null>(null);
  const list = TEMPLATES.filter((t) => filter === "all" || t.tag === filter);

  return (
    <main className="px-4 md:px-8 py-8">
      <H1
        sub="Production-ready solutions from Architect and partners, each with governance controls pre-configured."
        right={
          <>
            <Pills items={["all", "agent", "app"] as const} value={filter} onChange={setFilter} />
            <Btn size="sm" onClick={() => toast("Submit a published project for review by the Architect marketplace team")}>
              Publish a solution
            </Btn>
          </>
        }
      >
        Marketplace
      </H1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {list.map((t) => (
          <button key={t.id} onClick={() => setOpen(t)} className="text-left border border-line rounded-lg overflow-hidden hover:border-line-2 cursor-pointer group">
            <div className="h-[120px] bg-surface border-b border-line flex items-center justify-center text-dim group-hover:text-fg transition-colors">
              {t.tag === "agent" ? <Bot size={26} /> : <LayoutTemplate size={26} />}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.92rem] font-semibold">{t.name}</span>
                <Badge>{t.fw}</Badge>
              </div>
              <div className="text-[0.78rem] text-muted mt-1">{t.desc}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-mono text-[0.6rem] text-dim">{t.uses} organisations</span>
                <span className="text-[0.7rem] text-dim">{["Architect", "Architect", "Partner · Deloitte", "Architect"][TEMPLATES.indexOf(t) % 4]}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name} width={760}>
        {open && (
          <div className="grid md:grid-cols-[1fr_240px] gap-5">
            <div className="h-[300px] border border-line rounded-lg overflow-hidden">
              <AppPreview />
            </div>
            <div className="space-y-3">
              <p className="text-[0.85rem] text-muted m-0">{open.desc}</p>
              <div>
                <Label className="mb-1">includes</Label>
                <ul className="list-none p-0 m-0 text-[0.8rem] space-y-1">
                  <li>3 agents · 4 integrations</li>
                  <li>Approval policy pre-configured</li>
                  <li>120-case evaluation dataset</li>
                  <li>Governance score: 86 / 100</li>
                </ul>
              </div>
              <div>
                <Label className="mb-1">framework</Label>
                <div className="text-[0.82rem]">{open.fw}</div>
              </div>
              <Btn variant="primary" className="w-full" onClick={() => nav("/app/new", { state: { prompt: `${open.name}: ${open.desc}`, framework: open.fw } })}>
                Use this template
              </Btn>
              <div className="text-[0.72rem] text-dim">You will review and customise the plan before anything is built.</div>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
