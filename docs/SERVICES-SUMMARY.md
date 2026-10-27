# Architect 2.0 — How the Services Work Together (Summary)

The diagram is in [architecture-diagram.md](./architecture-diagram.md). This describes the production system we would build; the prototype in this repository implements only sign-in for real.

---

## 1. How services talk

Four channels, each suited to a different kind of work.

- **Direct requests** (gRPC) for questions that need an answer now, such as "may this user open this project?". Each carries a short-lived identity token naming the tenant, user and roles.
- **Durable workflows** (Temporal) for anything long or waiting on a person: builds, agent runs, approvals, GitHub sync and deploys. Each step is recorded before the next starts, so a crashed server is replaced and the work resumes.
- **Events** (Kafka-compatible bus) announce that something happened, such as a new commit. The audit log, search index and GitHub sync subscribe. The event is written in the same transaction as the change, so the two can never disagree.
- **Live streams** (Redis Streams over Server-Sent Events) carry progress to the browser: chat reply, build checklist, deploy log.

Two rules apply everywhere. Agents have exactly two doors out: the **LLM gateway** for every model call and the **tool broker** for every action on a real system. And only the **vault** holds secrets, handing out short-lived credentials per call.

## 2. The services

**Edge.** The CDN serves the React app. The API gateway (Hono) validates the session with the Identity service, applies rate limits, issues the internal identity token and routes the request. A separate preview proxy serves generated apps from another domain, so Architect's cookie never reaches untrusted code.

**Control plane.** Each service owns its own tables and no other service writes to them.
- Project: projects and code. Every project has an internal Git repository; each change is a commit, which is also the restore point.
- Org and RBAC: organisations, teams and five roles (owner, admin, builder, approver, viewer).
- Policy engine (Cedar, embedded): every decision is allowed, requires approval or blocked.
- Approvals: notifies approvers and signals the waiting workflow with the outcome.
- Governance: checks each readiness control against the real project and gives the deploy gate a score.
- Metering: reserves credits when a plan is approved and charges actual usage.
- Audit log: tamper-evident record of sign-ins, policy changes, approvals, agent actions and deploys.

**Agent plane.** The conversation orchestrator turns a prompt into a plan. The build agent writes code step by step inside a sandbox and runs tests there. Agent run workers execute deployed agents. A small adapter per framework points its model calls at the LLM gateway and its tool calls at the tool broker, so any framework is supported.

**Execution.** Generated code runs only in Firecracker microVMs from a warm pool. They hold no platform credentials and reach only allow-listed addresses.

## 3. Prompt to running preview

1. The orchestrator classifies the request, asks clarifying questions and produces a structured plan with a credit estimate. Nothing is spent until the user approves.
2. On approval, Metering reserves credits and a `BuildWorkflow` starts.
3. The build agent gets a sandbox, writes code for each plan step, runs the tests and retries failures a fixed number of times. Each passing step is committed.
4. Progress streams to the browser and the preview reloads as each step lands.

## 4. When an agent acts

Every action goes through the tool broker in the same order: validate arguments, run guardrails, score confidence, ask the policy engine, then block, open an approval request or proceed. A proceeding call uses a one-call credential, a timeout and an idempotency key so a retry can never act twice. The result is recorded for audit. The operator's kill switch also lives in the broker.

## 5. Shipping

**GitHub.** A GitHub App syncs both ways: commits become pull requests, and an engineer's push is pulled back in. The internal repository stays the source of truth.

**Deploy.** A `DeployWorkflow` checks the governance score, evaluation regressions, tests, secret scan and cost estimate; any failure stops it, and production can require sign-off. It then builds a signed container image and rolls it out to 10%, then 50% of traffic, comparing errors, latency, quality and cost to the old version, and rolls back automatically if anything worsens. Targets are Architect Cloud, Vercel, the customer's AWS account or a container image.

## 6. Data and visibility

| Store | Holds |
|---|---|
| Postgres (row-level security) with pgvector | Users, projects, approvals, policies, credit ledger, workflow state, embeddings |
| Internal Git | All project code |
| Object storage | Snapshots, uploads, evaluation datasets, long-term audit |
| Redis | Session cache, rate limits, budgets, stream buffers; losing it makes things slower, never wrong |
| Vault | Every credential and encryption key |

One trace id, started at the gateway, follows each request through every service, model call and tool call (OpenTelemetry into ClickHouse). One trace shows the prompt, model, confidence score, policy decision and approver.

## 7. When a link breaks

| If this fails | What happens |
|---|---|
| Model provider | LLM gateway falls back to the model declared for that agent |
| External system | Call times out and the workflow retries; the idempotency key means it happens at most once |
| Slow approver | Workflow waits at no cost, then escalates or declines |
| Worker crash | Temporal resumes from the last finished step |
| Sandbox | Project restored into a fresh microVM from Git |
| Bad release | Traffic moves back to the previous version |

## 8. Technology

Hono on Node (gateway), Temporal (workflows), Cedar (policy), Firecracker (sandboxes), Postgres with pgvector, Redis, a Kafka-compatible bus, OpenTelemetry with ClickHouse, Kubernetes with Argo Rollouts. Platform services are TypeScript, performance-critical infrastructure is Go, and agent services are Python because most agent frameworks are Python-first.
