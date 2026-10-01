export type ProjectStatus = "live" | "building" | "draft" | "failed";
export type ProjectKind = "app" | "agent" | "imported";

export interface Project {
  id: string;
  name: string;
  desc: string;
  stack: string;
  kind: ProjectKind;
  status: ProjectStatus;
  updated: string;
  prompts: number;
  framework?: string;
  repo?: string;
  readiness: number;
  url?: string;
  /** Published to the organisation's app gallery / public link. */
  published?: boolean;
  /** Set when another member shared this project with you. */
  sharedBy?: string;
  views?: number;
}

export const PROJECTS: Project[] = [
  {
    id: "support-triage-agent",
    name: "support-triage-agent",
    desc: "Classifies inbound tickets, drafts replies and escalates refunds for approval.",
    stack: "Next.js · LangGraph",
    kind: "agent",
    status: "live",
    updated: "2m ago",
    prompts: 64,
    framework: "LangGraph",
    repo: "acme/support-triage",
    readiness: 82,
    url: "support-triage.architect.app",
    published: true,
    views: 1284,
  },
  {
    id: "landing-page-v3",
    name: "landing-page-v3",
    desc: "Corporate marketing site with pricing and lead capture.",
    stack: "React",
    kind: "app",
    status: "live",
    updated: "1h ago",
    prompts: 47,
    readiness: 91,
    url: "landing-v3.architect.app",
    published: true,
    views: 9310,
  },
  {
    id: "research-assistant",
    name: "research-assistant",
    desc: "Multi-agent team (researcher, analyst, writer) producing weekly briefings.",
    stack: "Python · CrewAI",
    kind: "agent",
    status: "building",
    updated: "3h ago",
    prompts: 122,
    framework: "CrewAI",
    readiness: 54,
  },
  {
    id: "billing-dashboard",
    name: "billing-dashboard",
    desc: "Imported from GitHub. Internal finance reporting dashboard.",
    stack: "Next.js · Postgres",
    kind: "imported",
    status: "draft",
    updated: "3d ago",
    prompts: 18,
    repo: "acme/billing-dash",
    readiness: 38,
  },
  {
    id: "invoice-extractor",
    name: "invoice-extractor",
    desc: "Extracts invoice data from PDFs. Amounts over $5,000 require approval.",
    stack: "TypeScript · Vercel AI SDK",
    kind: "agent",
    status: "failed",
    updated: "5d ago",
    prompts: 31,
    framework: "Vercel AI SDK",
    readiness: 61,
  },
];

export const SHARED_PROJECTS: Project[] = [
  {
    id: "hr-onboarding-assistant",
    name: "hr-onboarding-assistant",
    desc: "Answers new-joiner questions from HR policies; books IT equipment.",
    stack: "Next.js · Claude Agent SDK",
    kind: "agent",
    status: "live",
    updated: "4h ago",
    prompts: 38,
    framework: "Claude Agent SDK",
    readiness: 88,
    url: "hr-onboarding.architect.app",
    sharedBy: "Priya Sharma",
  },
  {
    id: "q3-pipeline-forecast",
    name: "q3-pipeline-forecast",
    desc: "Weekly revenue forecast from Salesforce with commentary for leadership.",
    stack: "Python · LangGraph",
    kind: "agent",
    status: "draft",
    updated: "2d ago",
    prompts: 21,
    framework: "LangGraph",
    readiness: 63,
    sharedBy: "Marcus Lee",
  },
];

export const SUGGESTIONS = [
  "Customer support agent that triages Zendesk tickets",
  "Finance dashboard with approval workflows",
  "Research agent that produces a weekly market brief",
  "Internal assistant that answers from our policy documents",
];

export interface Framework {
  id: string;
  name: string;
  lang: string;
  blurb: string;
  bestFor: string;
}

export const FRAMEWORKS: Framework[] = [
  { id: "langgraph", name: "LangGraph", lang: "Python / TS", blurb: "Stateful graphs with checkpoints.", bestFor: "complex control flow" },
  { id: "crewai", name: "CrewAI", lang: "Python", blurb: "Role-based multi-agent crews.", bestFor: "collaborating specialists" },
  { id: "openai-agents", name: "OpenAI Agents SDK", lang: "Python / TS", blurb: "Handoffs, guardrails, tracing.", bestFor: "tool-heavy assistants" },
  { id: "claude-agent-sdk", name: "Claude Agent SDK", lang: "Python / TS", blurb: "Agent loop with tools, MCP, subagents.", bestFor: "coding + ops agents" },
  { id: "ai-sdk", name: "Vercel AI SDK", lang: "TypeScript", blurb: "Streaming UI + tool calling.", bestFor: "web-native agents" },
  { id: "mastra", name: "Mastra", lang: "TypeScript", blurb: "Workflows, memory, evals built in.", bestFor: "TS backends" },
  { id: "autogen", name: "AutoGen", lang: "Python", blurb: "Conversational multi-agent.", bestFor: "agent debates / research" },
  { id: "llamaindex", name: "LlamaIndex", lang: "Python / TS", blurb: "Data agents over your docs.", bestFor: "RAG-heavy agents" },
  { id: "custom", name: "Custom", lang: "Any", blurb: "Bring your own loop. We wrap it.", bestFor: "existing code" },
];

export const CLARIFY_QUESTIONS = [
  {
    id: "users",
    q: "Who will use this application?",
    options: ["Internal staff only", "External customers", "Both internal and external"],
  },
  {
    id: "data",
    q: "Which system holds the source data?",
    options: ["Zendesk", "Shared email inbox", "Salesforce Service Cloud", "File upload (CSV)"],
  },
  {
    id: "autonomy",
    q: "What level of autonomy should the agent have?",
    options: ["Draft only; staff send every reply", "Auto-resolve routine requests", "Fully autonomous within policy"],
  },
];

export interface PlanItem {
  kind: "page" | "agent" | "tool" | "data" | "integration";
  name: string;
  detail: string;
}

export const PLAN: PlanItem[] = [
  { kind: "page", name: "/inbox", detail: "Ticket queue with AI classification and confidence" },
  { kind: "page", name: "/ticket/:id", detail: "Conversation view with drafted reply; approve or edit" },
  { kind: "page", name: "/analytics", detail: "Volume, automation rate and customer satisfaction" },
  { kind: "agent", name: "classifier", detail: "Determines intent and urgency · low-cost model" },
  { kind: "agent", name: "responder", detail: "Drafts replies based on approved help-centre content" },
  { kind: "agent", name: "escalator", detail: "Routes refunds above $100 to an authorised approver" },
  { kind: "tool", name: "search_docs", detail: "Searches the help centre knowledge base" },
  { kind: "tool", name: "zendesk.update_ticket", detail: "Writes replies back to Zendesk; requires approval" },
  { kind: "data", name: "tickets, drafts, approvals", detail: "Managed Postgres · 3 tables" },
  { kind: "integration", name: "zendesk", detail: "OAuth · read and write access" },
];

export const BUILD_STEPS = [
  { label: "Setting up application structure", files: ["package.json", "app/layout.tsx", "app/page.tsx"] },
  { label: "Creating data model", files: ["db/schema.ts", "db/migrations/0001_init.sql"] },
  { label: "Configuring classifier agent", files: ["agents/classifier.py", "agents/graph.py"] },
  { label: "Configuring responder and escalation agents", files: ["agents/responder.py", "agents/escalator.py", "tools/search_docs.py"] },
  { label: "Building ticket inbox", files: ["app/inbox/page.tsx", "components/TicketRow.tsx"] },
  { label: "Building ticket view and approval controls", files: ["app/ticket/[id]/page.tsx", "components/ApproveBar.tsx"] },
  { label: "Connecting Zendesk", files: ["lib/zendesk.ts", ".env.example"] },
  { label: "Running automated tests", files: ["tests/smoke.test.ts"] },
];

export const TEMPLATES = [
  { id: "support", name: "Support triage agent", tag: "agent", fw: "LangGraph", uses: "2.4k", desc: "Classify, draft and escalate tickets. Zendesk or Intercom." },
  { id: "rag", name: "Policy & knowledge assistant", tag: "agent", fw: "LlamaIndex", uses: "5.1k", desc: "Answers from internal documents with source citations." },
  { id: "research", name: "Market research team", tag: "agent", fw: "CrewAI", uses: "1.8k", desc: "Researcher, analyst and writer. Scheduled briefings." },
  { id: "saas", name: "Internal operations portal", tag: "app", fw: "Next.js", uses: "9.3k", desc: "Roles, approvals and a reporting dashboard." },
  { id: "slack", name: "IT operations assistant", tag: "agent", fw: "Claude Agent SDK", uses: "1.1k", desc: "Answers staff queries in Slack; runs runbooks with approval." },
  { id: "extract", name: "Document extraction", tag: "agent", fw: "Vercel AI SDK", uses: "2.0k", desc: "Contracts and invoices to structured data, with review." },
  { id: "landing", name: "Corporate website", tag: "app", fw: "React", uses: "14k", desc: "Product pages, pricing, lead capture and analytics." },
  { id: "sales", name: "Sales development agent", tag: "agent", fw: "OpenAI Agents SDK", uses: "870", desc: "Researches accounts, drafts outreach and logs to CRM." },
];

export const ACTIVITY = [
  { who: "You", what: "deployed support-triage-agent to production", when: "2m ago", tone: "neon" as const },
  { who: "Escalation agent", what: "requested approval for a $240 refund on ticket #4812", when: "6m ago", tone: "warn" as const },
  { who: "Quality evaluation", what: "detected a 4% accuracy decline on research-assistant", when: "1h ago", tone: "danger" as const },
  { who: "Priya Sharma", what: "commented on landing-page-v3", when: "2h ago", tone: "neutral" as const },
];
