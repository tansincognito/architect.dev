# Architect 2.0 — How the Services Work Together (Summary)

This document explains how the services behind Architect 2.0 talk to each other and what happens when one fails. The diagram is in [architecture-diagram.md](./architecture-diagram.md) and the reasoning behind each choice is in [ARCHITECTURE.md](./ARCHITECTURE.md#6-decision-records).

This describes the production system we would build. The prototype in this repository implements only sign-in for real; everything else is simulated in the browser.

---

## 1. The four ways services talk

Every interaction between services uses one of four channels, each suited to a different kind of work.

**Direct requests** are for questions that need an answer straight away, such as "may this user open this project?". They use gRPC inside the cluster. Each request carries a short-lived identity token, issued by the API gateway after it has checked the user's session, which names the tenant, user and roles. Services trust this token and pass it on.

**Durable workflows** are for anything long, multi-step or waiting on a person: building an app, running an agent, waiting for an approval, syncing with GitHub and deploying. These run on Temporal, which records each step before starting the next. If a server crashes, another one continues from the last finished step. A workflow waiting days for an approval costs nothing, and resumes when the Approvals service sends it a signal.

**Events** announce that something has happened. When the Project service saves a commit, it writes the change and a `project.committed` event in the same database transaction, and a relay publishes the event to the event bus. The audit log, search index and GitHub sync each subscribe. The change and its announcement can never disagree, and new listeners can be added without touching the sender.

**Live streams** show progress on screen: the chat reply, the build checklist, the deploy log. Services write progress to Redis Streams, and the Realtime gateway pushes it to the browser over Server-Sent Events. If the connection drops, the browser picks up where it left off.

Choosing the right channel matters. A long build made as a direct request would fail the moment a server restarted, and a progress update sent as an event would arrive too slowly to feel live.

Two rules apply everywhere:

- **Agents have exactly two doors to the outside world.** Every model call goes through the **LLM gateway** and every action on a real system goes through the **tool broker**. Whatever framework an agent is built in, budgets, permissions, approvals and audit apply to it the same way.
- **Only the vault holds secrets.** Services ask the secrets vault for a short-lived credential for each call, and it expires afterwards.

---

## 2. At the front door

The **CDN** serves the React app as cached static files, and its firewall filters attacks before they reach our code.

Every `/api` call reaches the **API gateway**, a stateless Hono service that also shapes responses for the business and developer views. It asks the **Identity service** whether the session cookie is valid. Identity checks Redis first, then Postgres, where only a hash of each token is stored. The gateway then applies rate limits and cross-site request checks, issues the internal identity token and routes the request. It also receives webhooks from GitHub and connected systems, verifies them and turns them into events or workflow signals.

Identity handles only accounts, passwords, sessions, multi-factor authentication and API tokens. Organisations and roles belong to the **Org and RBAC service**, because one person can belong to several organisations. Enterprise single sign-on is a roadmap option. We keep sessions on the server, not in self-contained tokens, so that signing out, changing a password or removing a user takes effect immediately.

The **Realtime gateway** holds open browser connections and relays progress, keeping no state of its own. The **preview proxy** serves the generated app from a separate domain, so the browser never sends Architect's session cookie to untrusted code. Preview links are signed and expire, and each one encodes the tenant, project and sandbox, so the proxy can refuse any request that does not match.

---

## 3. The control plane: who owns what

Each control-plane service owns its own tables in Postgres, and no other service writes to them. If the deploy orchestrator needs to record a release against a project, it asks the Project service rather than writing to its tables. This keeps each piece of business logic in one place.

- **Project service.** Owns projects and their code. Every project has an internal Git repository, whether or not GitHub is connected. Each build step or chat change becomes a commit, and that commit is the restore point users see. Each commit is announced on the event bus.
- **Org and RBAC.** Owns organisations, teams and five roles (owner, admin, builder, approver, viewer), and knows which cell each tenant lives in. It supplies roles to the policy engine but does not decide on agent actions.
  Because restore points are ordinary Git commits, diffs, branches and history come for free, and every commit records who asked for the change and which prompt produced it.
- **Policy engine.** Cedar, embedded as a library inside the tool broker, governance service and API gateway, so decisions take microseconds with no network hop. Every decision is *allowed*, *requires approval* or *blocked*, and can depend on amount, confidence, data type or time of day, for example "automatic up to $100, approval up to $1,000, blocked above". We chose Cedar because its rules are easy to generate from a business-friendly screen and can be checked formally.
- **Approvals.** Is told when a decision is needed: by the tool broker for agent actions, or by the deploy orchestrator for releases. It notifies approvers through the **Notification service** (email, Slack or Teams) and checks that the person responding holds the approver role. It then signals the waiting workflow with the outcome: approved, edited, declined or escalated. Every framework pauses for people in the same way.
- **Integrations.** Runs OAuth for Zendesk, Salesforce, Ramp and other systems, stores tokens in the vault and publishes typed tool descriptions. It is not in the path when agents call tools.
- **Governance.** Checks each readiness control against the real project rather than trusting switches. For example, it scans the code for credentials and reads the agent manifest for pinned model versions. Fixes are proposed as commits or pull requests for a person to review. The deploy orchestrator asks it for a score before every release.
- **Metering.** Listens for usage events from the LLM gateway, sandboxes, builds and runtime, and records credits in an append-only ledger. It reserves credits when a plan is approved, charges actual usage and releases the remainder if a build fails. It pushes budgets into Redis for the LLM gateway to enforce.
- **Audit log.** Subscribes to the bus and records sign-ins, role and policy changes, approvals, agent actions, deploys and kill-switch use. Entries are tamper-evident and kept long-term in write-once storage.
- **Marketplace.** Holds templates as versioned Git repositories. Starting from a template forks it into the new project.

---

## 4. From a prompt to a running preview

1. **Prompt.** The browser sends the prompt through the API gateway to the **Conversation orchestrator**, and the reply streams back over the Realtime gateway. The orchestrator asks the **LLM gateway**, at the low-cost Claude Haiku 4.5 tier, to classify the request and pick the closest template. It then streams back the clarifying questions.
2. **Plan.** The answers go back to the LLM gateway at a stronger tier, which produces a structured plan of screens, agents, tools, data, integrations and approval policy. The plan is checked against a schema before it is shown, alongside a credit estimate from Metering. Nothing is spent until the user approves.
3. **Hand-off.** On approval, Metering reserves the credits and the orchestrator starts a `BuildWorkflow` in Temporal. From this point the workflow is in charge, so the chat stays responsive during a long build. If anything crashes mid-build, the workflow simply continues from the last completed step.
4. **Sandbox.** The workflow asks the **Sandbox orchestrator** for a Firecracker microVM from a warm pool, so the first preview appears in seconds. The VM is isolated, has no platform credentials and can reach only an allow-listed set of addresses. Generated code runs nowhere else.
5. **Build loop.** For each plan step, the **build agent** fetches relevant files from the **Retrieval service**. It asks the LLM gateway to write code (Claude Sonnet 5, or Claude Opus 5.5 for planning and hard fixes), writes the files into the sandbox and runs the tests there. Failures go back to the model for a fixed number of retries. Each passing step is committed by the Project service, and Retrieval re-indexes it from the commit event so the next step works from up-to-date code. Running tests inside the sandbox, rather than generating code in one shot, is what makes the preview trustworthy; the retry limit keeps the cost of a stubborn failure bounded.
6. **Live preview.** Progress flows to the browser through Redis Streams. The preview is the app's dev server inside the microVM, shown through the preview proxy, and it reloads as each step lands.

Later chat requests, such as "add a monthly spend summary", follow the same path on a smaller scale. If the user first clicks an element with "Select on screen", the agent edits that exact component.

---

## 5. When an agent runs

Each agent is defined by a manifest in its repository: framework, model per step, allowed tools and confidence method. A small **adapter** per framework points the agent's model calls at the LLM gateway and its tool calls at the tool broker. That is how the platform supports any framework without knowing its internals.

A trigger (a webhook, a schedule or "Run test") starts an `AgentRunWorkflow`. **Agent run workers** on Kubernetes execute each step, and framework checkpoints are stored in Postgres so a run can resume exactly where it stopped.

**Model calls** go to the LLM gateway. It checks the budget in Redis, uses the pinned model, applies caching and falls back to an alternative provider if the first one fails. It records cost on the trace and reports usage to Metering. Provider keys never leave the gateway.

**Actions** go to the tool broker, which runs the same sequence every time:

1. Check the arguments against the tool's schema.
2. Ask **Guardrails** to check the input for prompt injection or personal data.
3. Ask the **Confidence scorer** for a score. It blends the methods the user selected: the model's own assessment, consistency across several attempts, how well the evidence supports the answer, a second reviewer model, the agent's track record and business rules. It then calibrates the result against past outcomes, so that "90%" really means about nine times in ten.
4. Ask the policy engine for a decision.
5. If the decision is *blocked*, stop. If it is *requires approval*, open a request with Approvals and let the workflow wait. If it is *allowed*, continue.
6. Get a one-call credential from the vault, then make the call with a timeout and an idempotency key so a retry can never act twice. Guardrails then checks the output.
7. Record the action, decision and policy version for the audit log.

The operator's kill switch also lives in the broker and stops every agent in a project at its next action. The **Evaluation service** scores a sample of live runs and runs full test suites. Runs that an approver declined, or that scored badly, can be added to a test set with one click. Evaluation results improve the confidence scores and feed the deploy gate, so quality becomes a release criterion rather than a dashboard.

---

## 6. Shipping: GitHub and deployment

**GitHub.** Connecting installs a GitHub App on the repositories the user selects. We use an App rather than a personal login so that access is limited to the chosen repositories and does not depend on one employee's account. A `GitSyncWorkflow` keeps both sides in step:

- **Outbound:** commits become pull requests, or go straight to main, depending on the strategy chosen. Each pull request receives a quality-evaluation check.
- **Inbound:** an engineer's push triggers a webhook. The change is pulled into the internal repository, re-indexed and shown in the preview.
- **Conflicts:** the build agent proposes a merge for a person to accept.

The internal repository stays the source of truth, which is why projects that never connect GitHub still have full history.

**Deployment.** The **Deploy orchestrator** runs a `DeployWorkflow`:

1. **Checks.** In parallel, it asks Governance for the readiness score, Evaluation for regressions against production, the build workers for test results and a secret scan, and Metering for a cost estimate. Any failed check stops the deploy, and production can also require sign-off through Approvals.
2. **Build.** Build workers, also inside microVMs, produce a signed container image with a bill of materials. The image is stored in the registry by digest, so a version number always means the same code. Database migrations add first and remove later, so the old version keeps working.
3. **Rollout.** On Architect Cloud, Argo Rollouts sends 10%, then 50%, of traffic to the new version. At each stage it compares errors, latency, quality and cost per run against the old version. If anything gets worse, traffic moves back automatically. Kubernetes only accepts signed images, each tenant runs in its own namespace, and agent workers scale up and down with their workload.
4. **Other targets.** Vercel, the customer's own AWS account (using temporary assumed roles, never stored keys) or a container image. All of them use the same plan, apply, promote and roll back operations.

Each release records its commit, image digest, agent manifest and policy version, so rolling back means redeploying a known image.

---

## 7. Where data lives, and how we see what happened

| Store | What it holds | Notes |
|---|---|---|
| Postgres (one per cell, multi-zone) | Users, projects, approvals, policies, credit ledger, conversations, checkpoints, workflow state | Row-level security on every query |
| pgvector | Embeddings for retrieval | Sits beside Postgres, so tenant filtering stays in one place |
| Internal Git | All project code | Backed up to object storage |
| Object storage | Snapshots, build caches, uploads, evaluation datasets, long-term audit | Encrypted per tenant |
| Redis | Session cache, rate limits, budgets, preview routes, stream buffers | Losing it makes things slower, never wrong |
| Vault and key management | Every credential and encryption key | Hands out short-lived, scoped credentials |

Each kind of data has one home, and only the service that owns it writes to it.

A single **trace id**, started at the API gateway, follows each request through every service, workflow step, model call and tool call. OpenTelemetry collectors redact personal data and keep every trace that contains an error, an approval or a slow step. Traces and usage go to ClickHouse, and platform metrics go to a Prometheus-compatible store that Argo also reads during a canary. When someone asks "why did the agent approve this claim?", one trace shows the prompt, the model, the evidence, the confidence score, the policy decision and the approver.

---

## 8. When a link breaks

| If this fails… | What happens | Why it is safe |
|---|---|---|
| A model provider | LLM gateway falls back to another model or provider | Fallbacks are declared per agent |
| An external system such as Ramp | Call times out, connector pauses, workflow retries later | Idempotency key means the action happens at most once |
| An approver is slow | Workflow waits at no cost, then escalates or declines | Waiting state is durable |
| A worker crashes | Temporal resumes from the last finished step | Each step is recorded before the next starts |
| Redis | Sessions fall back to Postgres; streams resume on reconnect | Redis holds nothing that cannot be rebuilt |
| The event bus | Events wait in each service's outbox | Outbox is in the same transaction as the change |
| A sandbox | Project restored into a fresh microVM | Code lives in Git |
| A bad release | Traffic moves back to the previous version | Old version still runs during the canary |
| An availability zone | Postgres fails over; pods move to other zones | Each cell spans several zones |

---

## 9. How the twelve production concerns are covered

| Concern | Handled mainly by |
|---|---|
| Reliability | Temporal workflows, LLM gateway fallbacks, multi-zone Postgres, canary rollouts |
| Scalability | Stateless gateways, queue-based autoscaling of agent workers, warm sandbox pools, cells per group of tenants |
| State management | Postgres as the system of record, Temporal for in-flight work, framework checkpoints, internal Git for code |
| Observability | One trace id end to end, OpenTelemetry, ClickHouse, SLO alerts |
| Security | Session checks at the gateway, row-level security, microVM isolation, the vault, separate preview domain, signed images |
| Cost control | Credit reservations in Metering, budgets enforced by the LLM gateway, model tiering, sandbox hibernation |
| Evaluation | Tests in the build loop, the Evaluation service, quality checks on pull requests and deploys |
| Guardrails | Tool broker, Guardrails service, Cedar policies |
| Recovery | Restore points in Git, automatic rollback, idempotent retries, compensating actions, the kill switch |
| Tooling | Integrations service, typed tool schemas, MCP support, framework adapters |
| Human control | Approvals service, confidence thresholds, plan approval before spend, deploy sign-off |
| Versioning | Git commits, image digests, pinned models, versioned agent manifests and policies |

---

## 10. Technology at a glance

| Area | Choice | Main alternative |
|---|---|---|
| API gateway | Hono on Node | Managed API gateway |
| Live updates | Server-Sent Events over Redis Streams | WebSockets |
| Policy | Cedar, embedded | OPA and Rego |
| Workflows | Temporal | Inngest, Step Functions |
| Model access | In-house LLM gateway | LiteLLM or a hosted gateway |
| Sandboxes | Firecracker microVMs | gVisor, Kata Containers |
| Events | Kafka-compatible bus with outbox | NATS JetStream |
| Data | Postgres with row-level security, pgvector | Database per tenant |
| Code | Internal Git plus GitHub App | GitHub only |
| Traces | OpenTelemetry into ClickHouse | Hosted observability vendor |
| Runtime | Kubernetes with Argo Rollouts | Platform-native deploys only |

Platform services are written in TypeScript, matching the React front end. Performance-critical infrastructure (LLM gateway, realtime gateway, preview proxy, sandbox orchestrator, tool broker) is written in Go. Agent-related services are written in Python, because most agent frameworks are Python-first.
