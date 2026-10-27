export const FILES: Record<string, string> = {
  "agents/graph.py": `from langgraph.graph import StateGraph, END
from langgraph.checkpoint.postgres import PostgresSaver

from agents.classifier import classify
from agents.responder import draft_reply
from agents.escalator import needs_approval, request_approval
from state import TicketState

graph = StateGraph(TicketState)
graph.add_node("classify", classify)
graph.add_node("respond", draft_reply)
graph.add_node("escalate", request_approval)

graph.set_entry_point("classify")
graph.add_edge("classify", "respond")
graph.add_conditional_edges(
    "respond",
    needs_approval,
    {True: "escalate", False: END},
)
graph.add_edge("escalate", END)

# durable state: resume any ticket after a crash
app = graph.compile(checkpointer=PostgresSaver.from_env())
`,
  "agents/classifier.py": `from architect import model, traced
from state import TicketState

LABELS = ["refund", "billing", "bug", "how-to", "churn-risk"]

@traced(agent="classifier", version="v7")
def classify(state: TicketState) -> TicketState:
    result = model("haiku-4.5").structured(
        prompt=f"Classify this ticket into one of {LABELS}.\\n{state.body}",
        schema={"label": str, "urgency": str, "confidence": float},
        timeout=10,
        retries=3,
    )
    return state.update(**result)
`,
  "agents/escalator.py": `from architect import approvals, policy
from state import TicketState

REFUND_LIMIT = 100  # USD — above this, a human approves

def needs_approval(state: TicketState) -> bool:
    return state.label == "refund" and state.amount > REFUND_LIMIT

def request_approval(state: TicketState) -> TicketState:
    approvals.request(
        action="zendesk.refund",
        payload={"ticket": state.id, "amount": state.amount},
        approvers="#support-leads",
        timeout="4h",
        on_timeout="escalate",
    )
    return state.update(status="awaiting_approval")
`,
  "app/inbox/page.tsx": `import { db } from "@/db";
import { TicketRow } from "@/components/TicketRow";

export default async function Inbox() {
  const tickets = await db.tickets.findMany({
    where: { status: "open" },
    orderBy: { urgency: "desc" },
  });

  return (
    <main className="p-4">
      <Stats />
      {tickets.map((t) => (
        <TicketRow key={t.id} ticket={t} />
      ))}
    </main>
  );
}
`,
  "components/TicketRow.tsx": `export function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="text-xs text-gray-400">{ticket.id}</span>
      <span className="flex-1 truncate">{ticket.subject}</span>
      <Tag label={ticket.label} />
      <span className="hidden md:inline text-xs">
        {Math.round(ticket.confidence * 100)}%
      </span>
    </div>
  );
}
`,
  "architect.yaml": `name: support-triage-agent
framework: langgraph
runtime:
  app: nextjs
  agents: python3.13
models:
  default: sonnet-5
  routes:
    classifier: haiku-4.5
  fallback: gpt-4.1
guardrails:
  approval: "refunds > $100"
  injection_filter: false
budget:
  monthly_usd: 200
`,
  ".env.example": `ZENDESK_SUBDOMAIN=
ZENDESK_TOKEN=        # stored in vault, not here
DATABASE_URL=
`,
};

export const TREE = [
  { dir: "agents", files: ["graph.py", "classifier.py", "escalator.py"] },
  { dir: "app/inbox", files: ["page.tsx"] },
  { dir: "components", files: ["TicketRow.tsx"] },
  { dir: "", files: ["architect.yaml", ".env.example"] },
];

const KW = /\b(from|import|def|return|class|export|default|async|await|const|function|if|else|for|in|True|False|None|type|interface)\b/g;

/** Tiny highlighter — enough to read as code in a prototype. Returns HTML. */
export function highlight(line: string) {
  const esc = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const commentIdx = esc.search(/(#|\/\/)(?![^"]*"[^"]*$)/);
  const code = commentIdx >= 0 ? esc.slice(0, commentIdx) : esc;
  const comment = commentIdx >= 0 ? esc.slice(commentIdx) : "";
  const colored = code
    .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, '<span style="color:#a3e635">$1</span>')
    .replace(KW, '<span style="color:#c084fc">$1</span>')
    .replace(/\b(\d+(\.\d+)?)\b/g, '<span style="color:#fbbf24">$1</span>');
  return colored + (comment ? `<span style="color:#555">${comment}</span>` : "");
}
