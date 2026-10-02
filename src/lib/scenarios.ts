import type { GEdge, GNode } from "../components/AgentCanvas";
import type { PlanItem, Project } from "./data";

/**
 * Scenario templates. The prototype has no real generator, so the prompt is
 * matched to the closest template and every downstream screen (questions,
 * plan, build steps, preview, agents, GitHub, deploy) reads from it.
 */

export type ScenarioId = "support" | "finance" | "research";

export interface Source {
  label: string;
  integration: string;
  detail: string;
  /** Tool the agents use against this system. */
  tool: string;
  toolDetail: string;
}

export interface Autonomy {
  label: string;
  policy: string;
}

export interface PreviewRow {
  id: string;
  title: string;
  tag: string;
  conf: number;
}

export interface Scenario {
  id: ScenarioId;
  label: string;
  keywords: string[];
  seedPrompt: string;
  framework: string;
  brand: [string, string];
  nav: string[];
  path: string;
  sourceQ: string;
  sources: Source[];
  autonomyQ: string;
  autonomy: Autonomy[];
  /** Plan items before the source integration is added. */
  plan: PlanItem[];
  steps: { label: string; files: string[] }[];
  tests: number;
  costNote: string;
  tree: string[];
  summary: string;
  followUp: { ask: string; reply: string; files: string[] };
  changelog: string[];
  preview: {
    stats: [string, string][];
    rows: PreviewRow[];
    tags: Record<string, string>;
    panel: { kicker: string; body: string; flag: string; primary: string };
  };
  explain: { navbar: string; stats: string; list: string; panel: string };
  agents: {
    trigger: string;
    /** Defaults to an event from the chosen source system. */
    triggerSub?: string;
    memory: [string, string];
    names: [string, string, string];
    subs: [string, string, string];
    tool: [string, string];
    human: string;
    condition: string;
    prompt: string;
    extraTools: string[];
    test: { input: string; log: string[] };
  };
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  support: {
    id: "support",
    label: "Customer support triage",
    keywords: ["support", "ticket", "zendesk", "helpdesk", "help desk", "customer service", "intercom", "triage", "complaint", "refund", "inbox"],
    seedPrompt: "Customer support agent that triages Zendesk tickets",
    framework: "LangGraph",
    brand: ["helpdesk", ".ai"],
    nav: ["inbox", "analytics", "settings"],
    path: "/inbox",
    sourceQ: "Which system holds your support tickets?",
    sources: [
      { label: "Zendesk", integration: "Zendesk", detail: "OAuth · read and write access", tool: "zendesk.update_ticket", toolDetail: "Writes replies back to Zendesk; requires approval" },
      { label: "Intercom", integration: "Intercom", detail: "OAuth · conversations read and write", tool: "intercom.reply", toolDetail: "Posts replies to Intercom conversations; requires approval" },
      { label: "Salesforce Service Cloud", integration: "Salesforce", detail: "Connected app · case read and write", tool: "salesforce.update_case", toolDetail: "Updates Salesforce cases; requires approval" },
      { label: "Shared email inbox", integration: "Gmail", detail: "OAuth · support@ mailbox only", tool: "gmail.send_reply", toolDetail: "Sends replies from the support mailbox; requires approval" },
    ],
    autonomyQ: "What level of autonomy should the agent have?",
    autonomy: [
      { label: "Draft only; staff send every reply", policy: "Every reply requires staff approval" },
      { label: "Auto-resolve routine requests", policy: "Refunds over $100 require approval" },
      { label: "Fully autonomous within policy", policy: "Refunds over $500 require approval" },
    ],
    plan: [
      { kind: "page", name: "/inbox", detail: "Ticket queue with AI classification and confidence" },
      { kind: "page", name: "/ticket/:id", detail: "Conversation view with drafted reply; approve or edit" },
      { kind: "page", name: "/analytics", detail: "Volume, automation rate and customer satisfaction" },
      { kind: "agent", name: "classifier", detail: "Determines intent and urgency · low-cost model" },
      { kind: "agent", name: "responder", detail: "Drafts replies based on approved help-centre content" },
      { kind: "agent", name: "escalator", detail: "Routes refunds above the limit to an authorised approver" },
      { kind: "tool", name: "search_docs", detail: "Searches the help centre knowledge base" },
      { kind: "data", name: "tickets, drafts, approvals", detail: "Managed Postgres · 3 tables" },
    ],
    steps: [
      { label: "Setting up application structure", files: ["package.json", "app/layout.tsx", "app/page.tsx"] },
      { label: "Creating data model", files: ["db/schema.ts", "db/migrations/0001_init.sql"] },
      { label: "Configuring classifier agent", files: ["agents/classifier.py", "agents/graph.py"] },
      { label: "Configuring responder and escalation agents", files: ["agents/responder.py", "agents/escalator.py", "tools/search_docs.py"] },
      { label: "Building ticket inbox", files: ["app/inbox/page.tsx", "components/TicketRow.tsx"] },
      { label: "Building ticket view and approval controls", files: ["app/ticket/[id]/page.tsx", "components/ApproveBar.tsx"] },
    ],
    tests: 8,
    costNote: "Estimated operating cost: ~$18/month at 2,000 tickets",
    tree: ["app/ inbox/ ticket/[id]/ analytics/", "agents/ classifier.py responder.py escalator.py graph.py", "tools/ search_docs.py", "db/ schema.ts · tests/ · architect.yaml"],
    summary: "Built the inbox, ticket view and analytics. Three agents: classifier, responder and escalator. Refunds above the approval limit wait for a member of staff.",
    followUp: {
      ask: "Show the confidence percentage next to each ticket category",
      reply: "Added a confidence column from the classifier output. Hidden on mobile.",
      files: ["components/TicketRow.tsx", "agents/classifier.py"],
    },
    changelog: ["Show confidence per ticket category", "Approval policy for refunds over $100", "Responder model upgrade", "Analytics dashboard"],
    preview: {
      stats: [
        ["open", "128"],
        ["auto-resolved", "61%"],
        ["avg first reply", "42s"],
      ],
      rows: [
        { id: "#4812", title: "Charged twice for March invoice", tag: "refund", conf: 0.94 },
        { id: "#4811", title: "How do I export my data to CSV?", tag: "how-to", conf: 0.98 },
        { id: "#4810", title: "SSO login loop on Safari", tag: "bug", conf: 0.87 },
        { id: "#4809", title: "Can we upgrade mid-cycle?", tag: "billing", conf: 0.91 },
        { id: "#4808", title: "API rate limit questions", tag: "how-to", conf: 0.96 },
      ],
      tags: { refund: "#dc2626", "how-to": "#5dba00", bug: "#d97706", billing: "#2563eb" },
      panel: {
        kicker: "#4812 · drafted reply",
        body: "Hi Dana — sorry about the double charge. I have flagged a refund of $240 for approval; you will see it within 3–5 days.",
        flag: "refund > $100 · needs human approval",
        primary: "approve & send",
      },
    },
    explain: {
      navbar: "Top navigation. Links to inbox, analytics and settings. Lives in app/layout.tsx.",
      stats: "Live counters computed from the tickets table every 30 seconds.",
      list: "Each row is a ticket. The tag and percentage come from the classifier agent.",
      panel: "The responder agent's draft. Because it is a refund above the limit, the escalator holds it for approval.",
    },
    agents: {
      trigger: "New ticket",
      memory: ["Customer memory", "Per-customer history"],
      names: ["classifier", "responder", "escalator"],
      subs: ["haiku-4.5", "sonnet-5", "policy rules"],
      tool: ["search_docs", "Help centre search"],
      human: "#support-leads · 4h SLA",
      condition: "refund > $100",
      prompt: "You are a courteous support agent for Acme. Draft a reply using only the help-centre articles. Never promise refunds; the escalator decides.",
      extraTools: ["stripe.lookup_charge", "mcp: linear"],
      test: {
        input: "Charged twice for March invoice, please refund $240",
        log: [
          "Trigger · ticket #4812 received",
          "Memory · loaded 3 previous tickets for this customer",
          "Classifier · refund · high urgency · 0.94 confidence",
          "Responder · drafting reply",
          "Knowledge search · refund-policy.md (0.89)",
          "Escalation · $240 refund exceeds $100 limit; approval required",
          "Approval · paused pending #support-leads",
        ],
      },
    },
  },

  finance: {
    id: "finance",
    label: "Expense approvals",
    keywords: ["expense", "reimburs", "spend", "finance", "claim", "receipt", "budget", "cfo", "policy violation", "travel", "approval workflow", "invoice", "cost centre", "cost center"],
    seedPrompt: "Finance dashboard with approval workflows",
    framework: "LangGraph",
    brand: ["spend", "wise"],
    nav: ["claims", "policy", "reports"],
    path: "/claims",
    sourceQ: "Where are expense claims submitted today?",
    sources: [
      { label: "SAP Concur", integration: "SAP Concur", detail: "OAuth · expense reports read and write", tool: "concur.update_report", toolDetail: "Approves or returns Concur reports; requires approval" },
      { label: "Expensify", integration: "Expensify", detail: "API key · reports read and write", tool: "expensify.update_report", toolDetail: "Approves or returns Expensify reports; requires approval" },
      { label: "Ramp", integration: "Ramp", detail: "OAuth · transactions and receipts", tool: "ramp.flag_transaction", toolDetail: "Flags or approves Ramp transactions; requires approval" },
      { label: "Spreadsheet or CSV upload", integration: "CSV import", detail: "Upload in the app · no external access", tool: "ledger.export_csv", toolDetail: "Exports approved claims for the ledger" },
    ],
    autonomyQ: "How much should the agent decide on its own?",
    autonomy: [
      { label: "Flag only; finance approves every claim", policy: "Every claim requires finance approval" },
      { label: "Auto-approve compliant claims under $500", policy: "Claims over $500 or with violations require approval" },
      { label: "Auto-approve all compliant claims", policy: "Only claims with policy violations require approval" },
    ],
    plan: [
      { kind: "page", name: "/claims", detail: "Claims queue with policy status and confidence" },
      { kind: "page", name: "/claims/:id", detail: "Receipt, extracted fields and policy findings; approve or return" },
      { kind: "page", name: "/reports", detail: "Spend by cost centre, violation trends and approval times" },
      { kind: "agent", name: "receipt_reader", detail: "Extracts merchant, amount, date and category from receipts" },
      { kind: "agent", name: "policy_checker", detail: "Checks every line against the travel and expense policy" },
      { kind: "agent", name: "approver_router", detail: "Routes exceptions to the cost-centre owner" },
      { kind: "tool", name: "policy_lookup", detail: "Searches the expense policy document" },
      { kind: "data", name: "claims, line_items, approvals", detail: "Managed Postgres · 3 tables" },
    ],
    steps: [
      { label: "Setting up application structure", files: ["package.json", "app/layout.tsx", "app/page.tsx"] },
      { label: "Creating data model", files: ["db/schema.ts", "db/migrations/0001_init.sql"] },
      { label: "Configuring receipt reader agent", files: ["agents/receipt_reader.py", "agents/graph.py"] },
      { label: "Configuring policy and routing agents", files: ["agents/policy_checker.py", "agents/approver_router.py", "tools/policy_lookup.py"] },
      { label: "Building claims queue", files: ["app/claims/page.tsx", "components/ClaimRow.tsx"] },
      { label: "Building claim review and approval controls", files: ["app/claims/[id]/page.tsx", "components/ApproveBar.tsx"] },
    ],
    tests: 11,
    costNote: "Estimated operating cost: ~$22/month at 1,500 claims",
    tree: ["app/ claims/ claims/[id]/ reports/", "agents/ receipt_reader.py policy_checker.py approver_router.py graph.py", "tools/ policy_lookup.py", "db/ schema.ts · tests/ · architect.yaml"],
    summary: "Built the claims queue, claim review and spend reports. Three agents: receipt reader, policy checker and approver router. Exceptions wait for the cost-centre owner.",
    followUp: {
      ask: "Group the spend report by cost centre",
      reply: "The spend report is now grouped by cost centre, with a total for each.",
      files: ["app/reports/page.tsx", "db/queries/spend.ts"],
    },
    changelog: ["Per-head limit for client entertainment", "Route travel over $1,500 to the CFO", "Receipt reader model upgrade", "Monthly spend report"],
    preview: {
      stats: [
        ["pending", "46"],
        ["auto-approved", "72%"],
        ["policy flags", "9"],
      ],
      rows: [
        { id: "EXP-2291", title: "Client dinner · 4 attendees · $612", tag: "violation", conf: 0.93 },
        { id: "EXP-2290", title: "Flight LHR to JFK · $1,840", tag: "travel", conf: 0.97 },
        { id: "EXP-2289", title: "Team lunch · $96", tag: "meals", conf: 0.95 },
        { id: "EXP-2288", title: "Design software licence · $240", tag: "software", conf: 0.89 },
        { id: "EXP-2287", title: "Hotel · 2 nights · $410", tag: "travel", conf: 0.96 },
      ],
      tags: { violation: "#dc2626", travel: "#2563eb", meals: "#5dba00", software: "#d97706" },
      panel: {
        kicker: "EXP-2291 · policy check",
        body: "Client dinner for 4 at $612 exceeds the $100 per-head meals limit by $212. Receipt and attendee list attached.",
        flag: "over policy limit · needs cost-centre approval",
        primary: "approve exception",
      },
    },
    explain: {
      navbar: "Top navigation. Links to claims, policy and reports. Lives in app/layout.tsx.",
      stats: "Live counters computed from the claims table every 30 seconds.",
      list: "Each row is a claim. The tag and percentage come from the policy checker agent.",
      panel: "The policy checker's finding. Because the claim breaks the per-head limit, the approver router holds it for the cost-centre owner.",
    },
    agents: {
      trigger: "New claim",
      memory: ["Employee history", "Prior claims and exceptions"],
      names: ["receipt_reader", "policy_checker", "approver_router"],
      subs: ["haiku-4.5", "sonnet-5", "policy rules"],
      tool: ["policy_lookup", "Expense policy search"],
      human: "Cost-centre owner · 24h SLA",
      condition: "violation",
      prompt: "You review expense claims for Acme. Compare each line with the expense policy and cite the clause you rely on. Never approve exceptions; the approver router decides.",
      extraTools: ["fx.convert", "mcp: netsuite"],
      test: {
        input: "Client dinner, 4 attendees, $612 at The Ivy",
        log: [
          "Trigger · claim EXP-2291 submitted",
          "Memory · 2 prior entertainment exceptions this quarter",
          "Receipt reader · merchant, $612.00, meals · 0.97 confidence",
          "Policy checker · comparing against meals limit",
          "Policy search · expense-policy.pdf §3.2 (0.92)",
          "Routing · $153 per head exceeds $100 limit; approval required",
          "Approval · paused pending cost-centre owner",
        ],
      },
    },
  },

  research: {
    id: "research",
    label: "Market research briefing",
    keywords: ["research", "market", "brief", "competitor", "analyst", "report", "news", "trend", "intelligence", "summar", "weekly", "landscape"],
    seedPrompt: "Research agent that produces a weekly market brief",
    framework: "CrewAI",
    brand: ["brief", "ly"],
    nav: ["briefs", "sources", "schedule"],
    path: "/briefs",
    sourceQ: "Which sources should the research team use?",
    sources: [
      { label: "Public web and news", integration: "Web search", detail: "API key · allow-listed news domains", tool: "web.search", toolDetail: "Searches allow-listed news and web sources" },
      { label: "Licensed research databases", integration: "Research database", detail: "Service account · read only", tool: "research_db.query", toolDetail: "Queries licensed market data; read only" },
      { label: "Internal documents (SharePoint)", integration: "SharePoint", detail: "OAuth · selected sites, read only", tool: "sharepoint.search", toolDetail: "Searches internal strategy documents; read only" },
    ],
    autonomyQ: "How should briefs be reviewed before distribution?",
    autonomy: [
      { label: "An analyst approves every brief", policy: "Every brief requires analyst sign-off" },
      { label: "Send automatically; flag low-confidence claims", policy: "Claims below 80% source confidence require review" },
      { label: "Fully automatic distribution", policy: "Changes to the distribution list require approval" },
    ],
    plan: [
      { kind: "page", name: "/briefs", detail: "Library of briefs with topics and confidence" },
      { kind: "page", name: "/briefs/:id", detail: "Brief with inline citations; approve or request edits" },
      { kind: "page", name: "/schedule", detail: "Topics, cadence and distribution list" },
      { kind: "agent", name: "researcher", detail: "Gathers and ranks sources for each topic" },
      { kind: "agent", name: "analyst", detail: "Extracts findings and quantifies their impact" },
      { kind: "agent", name: "writer", detail: "Writes the brief in the house style with citations" },
      { kind: "tool", name: "cite_check", detail: "Verifies every claim against a retrieved source" },
      { kind: "data", name: "briefs, sources, subscribers", detail: "Managed Postgres + vector index" },
    ],
    steps: [
      { label: "Setting up application structure", files: ["package.json", "app/layout.tsx", "app/page.tsx"] },
      { label: "Creating data model and source index", files: ["db/schema.ts", "db/migrations/0001_init.sql", "index/sources.py"] },
      { label: "Configuring researcher agent", files: ["agents/researcher.py", "agents/crew.py"] },
      { label: "Configuring analyst and writer agents", files: ["agents/analyst.py", "agents/writer.py", "tools/cite_check.py"] },
      { label: "Building brief library", files: ["app/briefs/page.tsx", "components/BriefRow.tsx"] },
      { label: "Building brief view and sign-off controls", files: ["app/briefs/[id]/page.tsx", "components/SignOffBar.tsx"] },
    ],
    tests: 9,
    costNote: "Estimated operating cost: ~$35/month for weekly briefs",
    tree: ["app/ briefs/ briefs/[id]/ schedule/", "agents/ researcher.py analyst.py writer.py crew.py", "tools/ cite_check.py · index/ sources.py", "db/ schema.ts · tests/ · architect.yaml"],
    summary: "Built the brief library, brief view and schedule. Three agents: researcher, analyst and writer. Every claim is checked against a source before an analyst signs off.",
    followUp: {
      ask: "Add an executive summary of three bullet points at the top of each brief",
      reply: "Each brief now opens with a three-point executive summary written by the writer agent.",
      files: ["agents/writer.py", "app/briefs/[id]/page.tsx"],
    },
    changelog: ["Executive summary at the top of each brief", "Citation check before distribution", "Analyst model upgrade", "Weekly schedule and distribution list"],
    preview: {
      stats: [
        ["sources scanned", "1,284"],
        ["briefs this quarter", "12"],
        ["claims verified", "97%"],
      ],
      rows: [
        { id: "BR-14", title: "Week 40 · Competitor pricing moves", tag: "pricing", conf: 0.91 },
        { id: "BR-13", title: "EU AI Act enforcement timeline", tag: "regulation", conf: 0.95 },
        { id: "BR-12", title: "Q3 funding in vertical SaaS", tag: "funding", conf: 0.88 },
        { id: "BR-11", title: "Supplier risk in APAC logistics", tag: "risk", conf: 0.84 },
        { id: "BR-10", title: "New entrant analysis", tag: "pricing", conf: 0.9 },
      ],
      tags: { pricing: "#2563eb", regulation: "#7c3aed", funding: "#5dba00", risk: "#dc2626" },
      panel: {
        kicker: "BR-14 · draft brief",
        body: "Two competitors cut list prices by 8–12% this week, targeting mid-market accounts. Three of five claims are verified against primary sources.",
        flag: "2 claims below confidence threshold · analyst review",
        primary: "approve & distribute",
      },
    },
    explain: {
      navbar: "Top navigation. Links to briefs, sources and schedule. Lives in app/layout.tsx.",
      stats: "Counters computed from the briefs and sources tables after each run.",
      list: "Each row is a brief. The tag and percentage come from the analyst agent.",
      panel: "The writer agent's draft. Because two claims fall below the confidence threshold, it waits for an analyst.",
    },
    agents: {
      trigger: "Weekly schedule",
      triggerSub: "Mondays at 07:00",
      memory: ["Topic memory", "Prior briefs and findings"],
      names: ["researcher", "analyst", "writer"],
      subs: ["sonnet-5", "opus-5.5", "sonnet-5"],
      tool: ["cite_check", "Claim verification"],
      human: "#strategy-team · 24h SLA",
      condition: "confidence < 80%",
      prompt: "You are the analyst for Acme's weekly market brief. Turn the researcher's sources into findings, quantify their business impact and state your confidence in each claim.",
      extraTools: ["charts.render", "mcp: notion"],
      test: {
        input: "Competitor pricing moves this week",
        log: [
          "Trigger · weekly run for topic 'competitor pricing'",
          "Memory · loaded findings from the previous 4 briefs",
          "Researcher · 38 sources retrieved, 9 ranked relevant",
          "Analyst · 5 findings extracted",
          "Citation check · 3 of 5 claims verified (0.91)",
          "Writer · draft complete; 2 claims below 80% confidence",
          "Approval · paused pending #strategy-team",
        ],
      },
    },
  },
};

export const SCENARIO_LIST = Object.values(SCENARIOS);

/** Keyword match. Returns the best template and the words that matched. */
export function matchScenario(prompt: string): { scenario: Scenario; matched: string[] } {
  const text = prompt.toLowerCase();
  let best = { scenario: SCENARIOS.support, matched: [] as string[] };
  for (const s of SCENARIO_LIST) {
    const matched = s.keywords.filter((k) => text.includes(k));
    if (matched.length > best.matched.length) best = { scenario: s, matched };
  }
  return best;
}

const DEMO_SCENARIO: Record<string, ScenarioId> = {
  "support-triage-agent": "support",
  "research-assistant": "research",
  "billing-dashboard": "finance",
  "invoice-extractor": "finance",
  "q3-pipeline-forecast": "research",
};

export function scenarioFor(p: Pick<Project, "id" | "scenario">): Scenario {
  return SCENARIOS[p.scenario ?? DEMO_SCENARIO[p.id] ?? "support"];
}

export function sourceFor(s: Scenario, answer?: string): Source {
  return s.sources.find((x) => x.label === answer) ?? s.sources[0];
}

export function policyFor(s: Scenario, answer?: string): string {
  return (s.autonomy.find((x) => x.label === answer) ?? s.autonomy[1]).policy;
}

export function questionsFor(s: Scenario) {
  return [
    { id: "users", q: "Who will use this application?", options: ["Internal staff only", "External customers", "Both internal and external"] },
    { id: "source", q: s.sourceQ, options: s.sources.map((x) => x.label) },
    { id: "autonomy", q: s.autonomyQ, options: s.autonomy.map((x) => x.label) },
  ];
}

export function planFor(s: Scenario, answers: Record<string, string>): PlanItem[] {
  const src = sourceFor(s, answers.source);
  return [
    ...s.plan,
    { kind: "tool", name: src.tool, detail: src.toolDetail },
    { kind: "integration", name: src.integration.toLowerCase(), detail: src.detail },
  ];
}

export function stepsFor(s: Scenario, answers: Record<string, string>) {
  const src = sourceFor(s, answers.source);
  return [...s.steps, { label: `Connecting ${src.integration}`, files: [`lib/${src.tool.split(".")[0]}.ts`, ".env.example"] }, { label: "Running automated tests", files: ["tests/smoke.test.ts"] }];
}

/** Agent graph in the canvas layout, with the chosen source wired in. */
export function graphFor(s: Scenario, p: Pick<Project, "isNew" | "answers">): { nodes: GNode[]; edges: GEdge[] } {
  const a = s.agents;
  const src = sourceFor(s, p.answers?.source);
  const v = (n: number) => (p.isNew ? "v1" : `v${n}`);
  const nodes: GNode[] = [
    { id: "trigger", kind: "trigger", label: a.trigger, sub: a.triggerSub ?? `${src.integration} event`, x: 40, y: 150 },
    { id: a.names[0], kind: "agent", label: a.names[0], sub: `${a.subs[0]} · ${v(7)}`, x: 230, y: 150 },
    { id: a.names[1], kind: "agent", label: a.names[1], sub: `${a.subs[1]} · ${v(12)}`, x: 430, y: 150 },
    { id: a.tool[0], kind: "tool", label: a.tool[0], sub: a.tool[1], x: 430, y: 290 },
    { id: "memory", kind: "memory", label: a.memory[0], sub: a.memory[1], x: 230, y: 290 },
    { id: a.names[2], kind: "agent", label: a.names[2], sub: `${a.subs[2]} · ${v(3)}`, x: 630, y: 150 },
    { id: "human", kind: "human", label: "Approval", sub: a.human, x: 630, y: 290 },
    { id: "source", kind: "tool", label: src.tool, sub: src.toolDetail.split(";")[0], x: 830, y: 150 },
  ];
  const edges: GEdge[] = [
    { from: "trigger", to: a.names[0] },
    { from: a.names[0], to: a.names[1] },
    { from: "memory", to: a.names[0] },
    { from: a.names[1], to: a.tool[0], label: "tool" },
    { from: a.names[1], to: a.names[2] },
    { from: a.names[2], to: "human", label: a.condition },
    { from: a.names[2], to: "source", label: "else" },
    { from: "human", to: "source", label: "approved" },
  ];
  return { nodes, edges };
}

export function runPathFor(s: Scenario) {
  const a = s.agents;
  return ["trigger", "memory", a.names[0], a.names[1], a.tool[0], a.names[2], "human"];
}
