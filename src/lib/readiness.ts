export type ControlType = "toggle" | "select" | "number";

export interface Control {
  id: string;
  label: string;
  plain: string;
  type: ControlType;
  value: boolean | string | number;
  options?: string[];
  unit?: string;
  /** Passing condition — controls that fail show "fix with AI". */
  pass: (v: boolean | string | number) => boolean;
}

export interface Area {
  id: string;
  name: string;
  plain: string;
  controls: Control[];
}

const on = (v: boolean | string | number) => v === true;

export const AREAS: Area[] = [
  {
    id: "reliability",
    name: "Reliability",
    plain: "Continuity when a model or service is unavailable",
    controls: [
      { id: "retries", label: "Retries w/ exponential backoff", plain: "Automatically retry failed calls", type: "number", value: 3, unit: "attempts", pass: (v) => Number(v) >= 2 },
      { id: "timeouts", label: "Per-step timeouts", plain: "Prevent stalled requests", type: "number", value: 30, unit: "s", pass: (v) => Number(v) > 0 && Number(v) <= 60 },
      { id: "idempotency", label: "Idempotency keys on writes", plain: "Prevent duplicate actions", type: "toggle", value: false, pass: on },
      { id: "fallback", label: "Model fallback", plain: "Switch provider during an outage", type: "select", value: "sonnet → gpt-4.1", options: ["none", "sonnet → gpt-4.1", "sonnet → haiku"], pass: (v) => v !== "none" },
    ],
  },
  {
    id: "scalability",
    name: "Scalability",
    plain: "Sustains a 10× increase in demand",
    controls: [
      { id: "queue", label: "Durable job queue", plain: "Queue work during peak demand", type: "toggle", value: true, pass: on },
      { id: "workers", label: "Autoscale workers", plain: "Add capacity automatically", type: "select", value: "1–8", options: ["1", "1–8", "2–32"], pass: (v) => v !== "1" },
      { id: "ratelimit", label: "Rate limit per tenant", plain: "Fair usage across customers", type: "number", value: 60, unit: "req/min", pass: (v) => Number(v) > 0 },
    ],
  },
  {
    id: "state",
    name: "State",
    plain: "Durable state and memory",
    controls: [
      { id: "checkpoint", label: "Graph checkpointing", plain: "Persist progress after each step", type: "select", value: "postgres", options: ["off", "memory", "postgres", "redis"], pass: (v) => v === "postgres" || v === "redis" },
      { id: "memory", label: "Long-term memory", plain: "Retain customer context", type: "select", value: "per-customer", options: ["off", "per-thread", "per-customer"], pass: () => true },
    ],
  },
  {
    id: "observability",
    name: "Observability",
    plain: "Visibility into every agent decision",
    controls: [
      { id: "traces", label: "OpenTelemetry traces and agent trajectories", plain: "Full record of each decision", type: "toggle", value: true, pass: on },
      { id: "logs", label: "Structured logs", plain: "Searchable operational history", type: "toggle", value: true, pass: on },
      { id: "alerts", label: "Alerts on error rate > 2%", plain: "Notify the team when failures occur", type: "toggle", value: false, pass: on },
    ],
  },
  {
    id: "security",
    name: "Security",
    plain: "Access control and data protection",
    controls: [
      { id: "sandbox", label: "Sandboxed tool execution", plain: "Isolate code execution", type: "toggle", value: true, pass: on },
      { id: "secrets", label: "Secrets in vault (not env files)", plain: "Credentials held in a managed vault", type: "toggle", value: true, pass: on },
      { id: "scopes", label: "Least-privilege tool scopes", plain: "Least-privilege access for every tool", type: "toggle", value: false, pass: on },
      { id: "pii", label: "PII redaction in logs", plain: "Mask personal data in logs", type: "toggle", value: false, pass: on },
    ],
  },
  {
    id: "cost",
    name: "Cost",
    plain: "Predictable, controlled spend",
    controls: [
      { id: "budget", label: "Monthly budget cap", plain: "Hard limit on monthly spend", type: "number", value: 200, unit: "$", pass: (v) => Number(v) > 0 },
      { id: "routing", label: "Model routing by difficulty", plain: "Use lower-cost models for routine tasks", type: "toggle", value: true, pass: on },
      { id: "cache", label: "Prompt + response caching", plain: "Avoid paying twice for identical requests", type: "toggle", value: false, pass: on },
      { id: "tokens", label: "Max tokens per run", plain: "Cap the cost of each run", type: "number", value: 8000, unit: "tok", pass: (v) => Number(v) > 0 },
    ],
  },
  {
    id: "evaluation",
    name: "Evaluation",
    plain: "Quality assurance before and after release",
    controls: [
      { id: "offline", label: "Offline eval suite", plain: "Benchmark of 120 representative tickets", type: "toggle", value: true, pass: on },
      { id: "online", label: "Online evals (5% sampled)", plain: "Assess live responses for quality", type: "toggle", value: false, pass: on },
      { id: "gate", label: "Block deploy on regression", plain: "Prevent release if quality declines", type: "toggle", value: true, pass: on },
    ],
  },
  {
    id: "guardrails",
    name: "Guardrails",
    plain: "Policy enforcement on every output",
    controls: [
      { id: "policy", label: "Policy check on outputs", plain: "Block non-compliant commitments", type: "toggle", value: true, pass: on },
      { id: "schema", label: "Structured output validation", plain: "Ensure outputs match the required format", type: "toggle", value: true, pass: on },
      { id: "injection", label: "Prompt-injection filter", plain: "Block manipulation attempts", type: "toggle", value: false, pass: on },
    ],
  },
  {
    id: "recovery",
    name: "Recovery",
    plain: "Recovery from failures",
    controls: [
      { id: "rollback", label: "One-click rollback", plain: "Restore the previous version instantly", type: "toggle", value: true, pass: on },
      { id: "resume", label: "Resume from checkpoint", plain: "Resume interrupted work", type: "toggle", value: true, pass: on },
      { id: "compensation", label: "Compensating actions", plain: "Reverse partially completed operations", type: "toggle", value: false, pass: on },
    ],
  },
  {
    id: "tooling",
    name: "Tooling",
    plain: "Reliable, validated integrations",
    controls: [
      { id: "schemas", label: "Typed tool schemas", plain: "Validate every tool input", type: "toggle", value: true, pass: on },
      { id: "tooltimeout", label: "Tool timeouts", plain: "Terminate unresponsive tools", type: "number", value: 10, unit: "s", pass: (v) => Number(v) > 0 },
      { id: "health", label: "Tool health checks", plain: "Detect tool outages", type: "toggle", value: false, pass: on },
    ],
  },
  {
    id: "human",
    name: "Human control",
    plain: "Human oversight and intervention",
    controls: [
      { id: "approval", label: "Approval for risky actions", plain: "Require sign-off for sensitive actions", type: "select", value: "refunds > $100", options: ["off", "refunds > $100", "all writes"], pass: (v) => v !== "off" },
      { id: "escalation", label: "Escalation path", plain: "Who is notified", type: "select", value: "#support-leads", options: ["none", "#support-leads", "on-call pager"], pass: (v) => v !== "none" },
      { id: "override", label: "Operator override / kill switch", plain: "Immediately halt all agent activity", type: "toggle", value: true, pass: on },
    ],
  },
  {
    id: "versioning",
    name: "Versioning",
    plain: "Full change traceability",
    controls: [
      { id: "prompts", label: "Versioned prompts", plain: "Audit every instruction change", type: "toggle", value: true, pass: on },
      { id: "models", label: "Pinned model versions", plain: "Prevent unannounced model changes", type: "toggle", value: false, pass: on },
      { id: "agentver", label: "Agent + policy versions in traces", plain: "Trace every response to a version", type: "toggle", value: true, pass: on },
    ],
  },
];

export type Values = Record<string, boolean | string | number>;

export function initialValues(): Values {
  const v: Values = {};
  AREAS.forEach((a) => a.controls.forEach((c) => (v[`${a.id}.${c.id}`] = c.value)));
  return v;
}

export function areaScore(a: Area, values: Values) {
  const passed = a.controls.filter((c) => c.pass(values[`${a.id}.${c.id}`])).length;
  return Math.round((passed / a.controls.length) * 100);
}

export function totalScore(values: Values) {
  const all = AREAS.flatMap((a) => a.controls.map((c) => c.pass(values[`${a.id}.${c.id}`])));
  return Math.round((all.filter(Boolean).length / all.length) * 100);
}

/** What "fix with AI" sets each failing control to. */
export function fixedValue(c: Control): boolean | string | number {
  if (c.type === "toggle") return true;
  if (c.type === "select") return c.options?.find((o) => c.pass(o)) ?? c.value;
  return c.pass(c.value) ? c.value : 3;
}
