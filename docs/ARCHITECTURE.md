# Architect 2.0 — Architecture and Decisions

**Status:** proposed target architecture. **Audience:** executive sponsors, product leadership and engineering. **Companion documents:** [architecture-diagram.md](./architecture-diagram.md) (system and sequence diagrams) and [SERVICES-SUMMARY.md](./SERVICES-SUMMARY.md) (how the services work together).

> This repository is a UI/UX prototype. **Authentication is real**: a Hono API on Node with `node:sqlite`, scrypt password hashing, an httpOnly session cookie, hashed session tokens and a login rate limit. **Everything else is simulated in the browser.** This document describes the production system the prototype represents; [section 11](#11-prototype-vs-production) maps the two.

Executives can read sections 1, 2, the first paragraph of each flow in section 4, and sections 7 to 10. Assumptions and estimates are labelled as such.

---

## Contents

1. [Purpose and goals](#1-purpose-and-goals)
2. [Principles](#2-principles)
3. [System overview](#3-system-overview)
4. [Feature flows end to end](#4-feature-flows-end-to-end)
5. [Tenancy, identity and data](#5-tenancy-identity-and-data)
6. [Decision records](#6-decision-records)
7. [How the twelve production concerns are met](#7-how-the-twelve-production-concerns-are-met)
8. [Cost model](#8-cost-model)
9. [Operations and service objectives](#9-operations-and-service-objectives)
10. [Risks and open questions](#10-risks-and-open-questions)
11. [Prototype vs production](#11-prototype-vs-production)

---

## 1. Purpose and goals

Architect 2.0 lets business executives and engineers build agentic applications by describing them in plain language. They can also import existing projects, build agents in any framework (LangGraph, CrewAI, OpenAI Agents SDK, Claude Agent SDK, Vercel AI SDK, Mastra, AutoGen, LlamaIndex or custom code), connect GitHub and deploy under governance.

The platform has two jobs, and the architecture keeps them separate:

1. **Building software safely:** turning a prompt into tested, reviewable code, running that untrusted code in isolation and keeping full version history.
2. **Running agents safely:** operating customers' agents with permissions, confidence thresholds, human approval, evaluation, observability and rollback, whatever framework they use.

**Goals** (targets, not commitments):

| Goal | Measure |
|---|---|
| A business user gets a working preview from one description | First live preview within minutes of approving the plan |
| Every agent action is governed the same way, whatever the framework | 100% of tool calls pass through one enforcement point |
| No high-risk action happens without a person's approval | Approval-required actions cannot run without a recorded decision |
| Everything is traceable | Commit, manifest, prompt, model and policy version on every trace |
| Releases are reversible | Automatic rollback on canary regression; one-click rollback anytime |
| Spend is predictable | Estimate before work; hard budgets per organisation, project and run |
| Customers can leave | Standard Git, standard frameworks, exportable container images |
| Strong tenant isolation | Untrusted code never shares a kernel with another tenant |

**Non-goals:** a new agent framework (we wrap existing ones), a general-purpose cloud, a model provider, compliance claims (controls are described; certifications are a business decision; enterprise SSO is a roadmap option), and live character-by-character co-editing in the first release.

## 2. Principles

1. **One enforcement point per risk.** Models are reached only through the LLM gateway, agent actions only through the tool broker, and authentication only through the API gateway.
2. **Untrusted code runs only in microVMs.** That covers generated code, dependency installs, agent tool code and customer Terraform.
3. **Long-running means durable.** Builds, agent runs, approvals, GitHub sync and deploys are durable workflows. A restart never loses work or repeats an action.
4. **Git is the source of truth for code.** Restore points, history and GitHub sync are Git operations.
5. **Governance is verified, not declared.** Controls are checked against real code and configuration, and fixes arrive as reviewable commits.
6. **Estimate, reserve, then spend.**
7. **People hold authority over consequential actions.** Approvals, deploy gates and the kill switch are core features.
8. **Prefer managed, well-understood infrastructure.** Our differentiation is generation quality and governance, not running databases.

## 3. System overview

The system has nine layers, shown in the [top-level diagram](./architecture-diagram.md#1-top-level-system-diagram). How they talk to each other is explained in [SERVICES-SUMMARY.md](./SERVICES-SUMMARY.md).

| Layer | Role | Key services |
|---|---|---|
| Clients | Web app (business and developer modes), CLI, API | React single-page app |
| Edge and gateway | Entry, authentication, rate limits, live streams, previews | CDN and WAF, API gateway, realtime gateway, preview proxy |
| Control plane | Accounts, tenants, projects, approvals, policy, governance, integrations, billing, audit | Identity, Org and RBAC, Project, Approvals, Cedar policy engine, Governance, Integrations, Metering, Audit |
| Generation and agents | Chat, code generation, agent execution and governance | Conversation orchestrator, build agent, Temporal, agent registry, run workers, tool broker, guardrails, confidence scorer, evaluation, LLM gateway, retrieval |
| Sandbox | Isolated execution of untrusted code | Sandbox orchestrator, Firecracker microVMs, build workers |
| Data | Durable state | Postgres, internal Git, object storage, pgvector, Redis, event bus, vault |
| Deploy and runtime | Releasing and hosting | Deploy orchestrator, registry, Kubernetes with Argo Rollouts, target adapters |
| Observability | Traces, metrics, evaluation signals | OpenTelemetry, ClickHouse, metrics and alerting |
| External | Third parties | Model providers, GitHub, business SaaS, MCP servers, customer clouds |

**Two modes, one platform.** Business and developer modes are a presentation choice only. Both call the same APIs under the same permissions, and the API gateway shapes the detail shown. What a user can *do* is set by their role, never by the mode, so a simpler view can never bypass a control.

## 4. Feature flows end to end

### 4.1 Authentication

**User view.** Sign up, sign in, change password (which signs out other sessions) and edit profile. Signed-in users go straight into the app.

**Flow** ([sequence](./architecture-diagram.md#2-sequence-sign-in)). The gateway checks the request origin and rate limits (per email and per IP, in Redis). Identity verifies the password in constant time (scrypt, or Argon2id) and requests a second factor if one is enrolled. It then issues a random 256-bit token, storing only its SHA-256 hash, in an `httpOnly`, `Secure`, `SameSite=Lax` cookie. On each request the gateway checks the token (Redis cache, then Postgres) and passes a signed internal identity downstream. Every outcome is audited.

**Why.** Sessions live on the server, not in self-contained tokens, so revocation is immediate ([ADR-012](#adr-012-server-side-sessions)).

### 4.2 Homepage

**User view.** Prompt box with framework choice and attachments, recent projects, templates, credits, notifications and approvals.

**Flow.** One gateway call fetches projects, pending approvals, credit balance, templates and notifications in parallel, with per-call timeouts. If one service is slow, the page still renders. Nothing costs model spend until a prompt is submitted. Import clones the project into a sandbox, detects its frameworks, scans for secrets, indexes the code and creates a project with a governance baseline.

### 4.3 Chat window

**User view.** Clarifying questions, then a structured plan with a credit estimate; building starts only after approval. In a project, each change shows a summary, changed files and a restore point. Users can select an element on screen, ask for an explanation, or restore an earlier version.

**Flow** ([sequence](./architecture-diagram.md#3-sequence-prompt-clarify-plan-build-with-live-preview)). The conversation orchestrator classifies the intent using Claude Haiku 4.5 and produces clarifying questions. It then produces a plan, validated against a JSON schema, and Metering estimates and reserves credits. Approval starts a `BuildWorkflow` with an idempotency key, so a double-click cannot start two builds. Change requests use retrieval to find the relevant files; element edits include the selected element's source location.

**Why.** Conversation state is saved every turn, so a refresh or device switch resumes exactly. Plans are data rather than prose, so users can edit them and planning quality can be measured.

### 4.4 App preview

**User view.** A live preview that fills in during the build, with device sizes, element selection, "explain" and viewing past versions.

**Flow.**
1. A microVM comes from a warm pool, and the build agent writes files into it.
2. The dev server hot-reloads, and the browser shows it through the preview proxy at a signed, expiring address on a separate domain.
3. A development-only script maps clicked elements to source files and talks to the page through origin-checked `postMessage`.
4. Viewing an old version opens a sandbox at that commit. Restoring creates a new commit, so history is never rewritten.
5. Idle sandboxes hibernate.

**Why.** Previews run untrusted code, so they are isolated three ways: by microVM, by network (deny-by-default outbound traffic) and by browser origin. They use sample data, never production data, unless an administrator connects a read-only source.

### 4.5 Agent section

**User view.** Agent list, agent builder, agent canvas, confidence settings, an allowed / requires-approval / blocked permission board with a simulator, an approvals inbox, a test console and traces.

**Flow** ([sequence](./architecture-diagram.md#4-sequence-agent-run-with-human-approval)).
1. **Definition.** An agent is code plus a manifest (`architect.yaml`) declaring the framework, pinned models, tools and scopes, memory, confidence method and policy set. The canvas edits that manifest, and every edit is a commit.
2. **Execution.** A trigger starts an `AgentRunWorkflow`. The framework adapter points model calls at the LLM gateway and tool calls at the tool broker, and checkpoints are saved to Postgres.
3. **Governed actions.** For each tool call, the broker validates the arguments, runs guardrails, gets a confidence score and asks Cedar for a decision. *Allowed* runs; *requires approval* waits durably for a person; *blocked* returns a refusal.
4. **Approval.** Approvers are notified. Approve, edit or decline resumes the workflow; a missed deadline escalates.
5. **Learning.** Approval and evaluation outcomes recalibrate confidence, and declined cases can become test cases.

**Why.** Any framework is supported by controlling the boundary (model and tool calls) rather than the internals. Direct outbound calls from custom code are blocked by the network. The kill switch stops every agent at its next tool call while the app stays up.

### 4.6 UI getting built

**User view.** A step-by-step build list, file names appearing, a progress bar, the preview filling in and credits used, ending in restore point #1.

**Flow.**
1. `BuildWorkflow` gets a sandbox and runs each plan step as a durable activity.
2. For each step, the build agent retrieves context, generates code (Claude Sonnet 5, streaming progress), writes it to the sandbox and runs typecheck, lint and tests.
3. Failures get a bounded number of repairs, escalating to Claude Opus 5.5 for hard errors. If a step still fails, the user can retry, simplify the step or hand it to an engineer.
4. Each passing step is committed, with the prompt and plan item recorded in the commit, and its usage is charged against the reservation.
5. At the end, the workflow runs smoke tests, computes the governance baseline and releases unused credits.

**Why.** A crash resumes at the failed step, with no regenerated work and no double charge. What the user sees is a projection of real workflow events, and a step is never shown as complete if its tests failed.

### 4.7 GitHub integration

**User view.** Connect GitHub, create or link a repository, choose a sync strategy, set branch protection, and see commits (from Architect or from engineers' own editors), pull requests with check status, and manual sync.

**Flow** ([sequence](./architecture-diagram.md#5-sequence-github-two-way-sync)).
1. An administrator installs the Architect **GitHub App** on selected repositories, and Architect mints short-lived tokens for each operation.
2. **Outbound:** each change is committed internally, and a `GitSyncWorkflow` pushes it to an `architect/…` branch and opens or updates a pull request. Evaluation posts a check run.
3. **Inbound:** verified, deduplicated webhooks signal the workflow, which pulls the commits in, re-indexes the code and recomputes governance.
4. **Conflicts:** conflicts get a proposed resolution on a branch for review. Nothing is ever force-pushed.

**Why.** The internal Git store keeps projects without GitHub working the same way. Generated commits use a bot identity, with the requesting user named as co-author.

### 4.8 Deploying the app

**User view.** Choose environment, target and region. Pre-deploy checks (governance score of at least 60, tests, quality against baseline, security scan, cost) link to fixes when they block. Then a build log, a preview URL, a rollout strategy (canary 10%, 50%, 100%; blue-green; or instant), history, one-click rollback and custom domains.

**Flow** ([sequence](./architecture-diagram.md#6-sequence-deploy-with-governance-gate-canary-and-automatic-rollback)).
1. A `DeployWorkflow` runs the gates and stops with fix links on any failure. Production can also require a named approver.
2. A build worker produces a signed, immutable image from the exact commit, and its digest is recorded.
3. Migrations are expand-then-contract, so the previous version keeps working and rollback never needs a down-migration.
4. The canary moves traffic 10%, then 50%, then 100%. Each stage compares errors, latency, online quality score and cost per run against the stable version.
5. Any breach sends traffic back to stable immediately. Manual rollback redeploys any earlier digest.
6. Agent runs already in progress finish on the version that started them.

**Why.** Every deploy records its commit, image digest, manifest, prompt, model and policy versions, so any production response can be traced to exactly what produced it. Canary analysis is complete on Architect Cloud; on other targets it depends on what the target supports, and the UI says so.

## 5. Tenancy, identity and data

- **Hierarchy:** organisation (tenant), then workspaces, then projects, then environments.
- **Roles:** owner, admin, builder, approver and viewer. Approving is a separate right from building, so whoever builds an agent need not approve its actions.
- **Tenant context:** carried in the signed internal identity and enforced by Postgres row-level security. A missing tenant context fails closed.
- **Data classification:** projects and connectors carry a classification that feeds policy, log redaction and model-region routing.
- **Encryption:** in transit everywhere (mutual TLS internally), and at rest, with per-tenant keys for credentials and sensitive fields.
- **Residency:** cells are regional, and a tenant's data stays in its cell's region.

## 6. Decision records

### ADR-001 Multi-tenant isolation model

**Decision.** Cell-based architecture. Each cell is a full copy of the stateful services in one region, hosting many tenants. Inside a cell, the control plane is shared and separated by row-level security, sandboxes are never reused across tenants, and the runtime gives each tenant its own Kubernetes namespace. Large or regulated tenants can have a dedicated cell.
**Alternatives.** Fully pooled (cheapest, largest blast radius); database per tenant (heavy operations at scale); cluster per tenant (uneconomic for small tenants).
**Consequences.** Failures are contained to a cell, and dedicated cells become a commercial option. It needs a cell-provisioning pipeline early and continuous cross-tenant access tests.

### ADR-002 Sandbox technology

**Decision.** Firecracker microVMs behind an internal Sandbox API. Start with a managed provider and move to a self-operated fleet when volume justifies it. Use warm pools, hibernation and deny-by-default outbound traffic.
**Alternatives.** Plain containers (share the host kernel, too weak for hostile code); gVisor (good isolation, some compatibility gaps for build tools); Kata Containers (more moving parts); WebAssembly (cannot run Python agents or databases).
**Consequences.** Kernel-level isolation with interactive start times. *Assumption to validate:* a managed provider can meet enterprise network-isolation and residency requirements.

### ADR-003 LLM gateway and model routing

**Decision.** An in-house gateway for all model traffic. It handles tiered routing, cross-provider fallback, version pinning, caching, budgets, redaction, residency routing, metering and tracing.

| Task | Default model |
|---|---|
| Classification, clarifying questions, summaries, guardrails | Claude Haiku 4.5 |
| Code generation, changes, routine repairs | Claude Sonnet 5 |
| Planning, difficult repairs, conflict resolution, review | Claude Opus 5.5 |
| Independent reviewer for confidence | A different model family from the agent being reviewed |

Customer agents choose their own models, and the gateway enforces their pins and budgets.
**Alternatives.** Direct SDK calls from each service (no central control); LiteLLM or a hosted gateway (reasonable underneath, but budgets and metering are core product logic).
**Consequences.** One place to change routing and enforce budgets; one more hop that must stay highly available. The routing table is configuration, because models change quickly.

### ADR-004 Durable workflow engine

**Decision.** Temporal for every long-running process. Framework checkpoints (for example LangGraph's) work inside steps, while Temporal owns the lifecycle, timers, signals and retries.
**Alternatives.** Framework checkpointing alone (does not cover builds or deploys); Inngest (*verify* self-hosting options); Restate and DBOS (younger); Step Functions (awkward for complex branching, single-cloud); a home-grown queue (reinvents replay and timers).
**Consequences.** Uniform retries, durable waits and resume. Workflow code must be deterministic, and running Temporal per cell takes effort.

### ADR-005 Event bus

**Decision.** A Kafka-compatible managed bus, written through a transactional outbox, with idempotent consumers. Live UI updates use Redis Streams instead.
**Alternatives.** NATS JetStream (lighter, with a smaller analytics ecosystem); cloud queues (no replay); Postgres `LISTEN/NOTIFY` (not durable).
**Consequences.** Replayable history makes new features cheap to add, at the cost of one more managed dependency.

### ADR-006 Storage

**Decision.** Postgres for transactional data and pgvector embeddings; object storage for binaries and archives; ClickHouse for traces and usage; internal Git for code; Redis as a cache only.
**Alternatives.** A dedicated vector database from day one (a second tenancy model to secure); traces in Postgres (too costly at volume).
**Consequences.** Few engines, each used for its strength. The retrieval interface hides any later move to a specialised vector engine.

### ADR-007 GitHub App versus OAuth App

**Decision.** A GitHub App installed on selected repositories, with short-lived tokens per operation.
**Alternatives.** An OAuth App (broad user permissions, access tied to one person); personal tokens; deploy keys (Git access only).
**Consequences.** Repository-scoped access that survives staff changes, plus native check runs. An administrator must install it, so the UI guides business users to request that.

### ADR-008 Deploy targets and progressive delivery

**Decision.** Architect Cloud on Kubernetes with Argo Rollouts. Canary analysis includes agent signals (quality score, cost per run, approval rate) as well as errors and latency. Adapters cover Vercel, customer AWS (Terraform in a sandbox under an assumed role) and container images. Every target gets the same signed artifact.
**Consequences.** The same gates on every target, with rollout guarantees that vary by target and are disclosed in the UI. The managed runtime is a significant operational commitment.

### ADR-009 Policy engine for permissions

**Decision.** Cedar policies generated from the UI, versioned and evaluated in-process. Unknown actions default to "requires approval", and every decision records the policy version and the matching rule.
**Alternatives.** OPA and Rego (harder to generate from a business UI and to analyse); hard-coded rules (customers cannot own them).
**Consequences.** Business users own policy, engineers review it in Git, and analysis can prove properties such as "no policy allows customer data export". Cedar's ecosystem is smaller than OPA's.

### ADR-010 Confidence scoring

**Decision.** A blended, calibrated score built from the six methods in the prototype: self-assessment, consistency, evidence support, independent reviewer, track record and business rules. The blend is calibrated against evaluation and approval outcomes, so 0.9 means roughly nine in ten correct. Thresholds feed the policy engine.
**Alternatives.** Self-assessment only (unreliable); a single judge model (costly, and its errors are correlated if it comes from the same model family).
**Consequences.** Thresholds become meaningful. Consistency checks and judge models multiply cost, and the UI shows by how much. *Assumption:* enough labelled outcomes accumulate within weeks; low-volume agents may share calibration.

### ADR-011 Realtime transport

**Decision.** Server-Sent Events, resumable from Redis Streams; WebSocket only for preview hot reload. This is simpler than WebSockets everywhere, and user input always uses ordinary, rate-limited HTTP.

### ADR-012 Server-side sessions

**Decision.** Keep the prototype's model: opaque random tokens, hashed at rest, httpOnly cookies and a cached server lookup. Stateless JWTs would make revocation slow and complex. Signed short-lived tokens are used only between internal services.

### ADR-013 Git as the source of truth

**Decision.** Every project is a Git repository, and every step and change is a commit. GitHub is a two-way mirror. This gives portability, diffs, attribution and straightforward recovery without a bespoke versioning system.

## 7. How the twelve production concerns are met

The concerns apply at two levels: the Architect platform itself, and the agents customers build. The prototype's governance checklist (`src/lib/readiness.ts`, 12 areas and 38 controls) is the customer-facing side.

| Concern | Platform | Customer agents (verified by Governance) |
|---|---|---|
| **Reliability** | Multi-zone cells, Temporal retries and timeouts, model fallback, circuit breakers, idempotency keys | Per-step retries and timeouts, model fallback in the manifest, idempotent tool calls |
| **Scalability** | Stateless services, cells, queue-based autoscaling, warm sandbox pools | Durable queues, autoscaled workers, per-tenant rate and concurrency limits |
| **State management** | Postgres, workflow history, Git, transactional outbox | Checkpoints in Postgres, tenant-scoped long-term memory |
| **Observability** | OpenTelemetry everywhere, SLO alerts | Full agent traces with cost and versions, alerts, trace-to-test-case |
| **Security** | One auth choke point, mutual TLS, row-level security, microVMs, separate preview domain, vault, signed images, tamper-evident audit | Sandboxed tools, least-privilege scopes, short-lived credentials, PII redaction, egress allow-lists, secret scanning |
| **Cost control** | Credit reservations, model tiering, caching, sandbox hibernation, trace sampling | Budget caps with alerts at 80% and 100%, token limits, cost check before deploy |
| **Evaluation** | Tests gate every build step; build agent quality tracked offline | Offline and online evaluation, regression gate, PR checks, canary analysis |
| **Guardrails** | Schema-validated plans and tool arguments; injection checks on imports | Output policy checks, injection filtering, allowed / approval / blocked |
| **Recovery** | Workflow resume, restore points, point-in-time database recovery, event replay | Automatic and one-click rollback, compensating actions, expand-then-contract migrations |
| **Tooling** | Typed internal APIs, MCP host, connector health checks | Typed tool schemas, timeouts, governed connector catalogue |
| **Human control** | Plan approval before spend, deploy approvals, builder/approver separation, kill switch | Approvals inbox with SLAs, escalation, approve-with-edit, confidence routing |
| **Versioning** | Commits, signed images by digest, versioned policies and templates | Versioned prompts, pinned models, versions on every trace; runs pinned to their starting version |

## 8. Cost model

> No unit prices are given, because provider pricing changes often. The weights below are estimates to validate with production data.

| Driver | Weight (estimate) | Main levers |
|---|---|---|
| Model tokens while building | Largest variable cost during building | Model tiering, prompt caching, bounded repairs, retrieval to keep context small |
| Model tokens for customer agents | Largest cost in production; mostly passed through | Budgets, token caps, difficulty routing, optional expensive confidence methods |
| Sandbox compute | Significant; driven by idle previews if unmanaged | Right-sized warm pools, hibernation, concurrency limits |
| Build and runtime compute | Moderate | Caching, bin-packing, scale to zero outside production |
| Observability | Can grow fast with agent traces | Tail sampling, retention tiers |
| Fixed platform | Fixed per cell | Cell density, managed services |

```
build_cost ≈ Σ steps (input tokens × input price × cache discount + output tokens × output price)
           + sandbox seconds × sandbox rate + build seconds × build rate
run_cost   ≈ Σ model calls (tokens × price) × confidence multiplier + guardrail cost + tool cost
```

**Credits** hide this from business users. The estimate is derived from the plan and reserved; actual use is charged step by step and the rest is released. Retries caused by platform faults are never charged. Hard per-run and per-organisation ceilings in the LLM gateway stop runaway loops at the next step and ask the user before continuing.

## 9. Operations and service objectives

The platform starts with one region and two cells (to prove the cell pipeline early), each spanning at least three availability zones. Platform changes roll out cell by cell, beginning with an internal canary cell. Disaster recovery relies on point-in-time Postgres recovery, cross-region object replication and infrastructure-as-code cell rebuilds. Recovery-point and recovery-time objectives are still to be agreed.

| Objective (targets to validate) | Target |
|---|---|
| API availability (monthly) | 99.9% |
| Chat first token, p95 | Under 2 seconds |
| First live preview after plan approval, p50 | Under 60 seconds |
| Workflow resume after an approval, p95 | Under 5 seconds |
| Rollback on Architect Cloud | Under 60 seconds |
| Audit event loss | None |

## 10. Risks and open questions

| Risk | Mitigation |
|---|---|
| Generated code quality varies, and broken previews erode trust | Tests as gates, bounded repair, honest failure messages, hand-off to engineers |
| Framework adapters lag new releases | Pinned adapter versions, contract tests per framework, SDK path for custom agents |
| Custom code bypasses governance with direct calls | Deny-by-default network egress; only the tool broker holds credentials |
| Prompt injection through documents, repositories or tool output | Guardrails on all untrusted input; every action is policy-gated |
| A row-level security mistake exposes another tenant's data | Fail-closed tenant context, automated cross-tenant tests, per-tenant keys |
| Operational load of Temporal, Kafka and Kubernetes per cell | Managed offerings where residency allows |
| Model outages or deprecations | Cross-provider fallback, pinned versions, evaluation before switching |
| Weak calibration for low-volume agents | Conservative defaults, pooled calibration, warnings in the UI |

**Open questions:**
- At what volume do self-operated sandboxes beat a managed provider, and can a provider meet residency needs?
- Temporal Cloud or self-hosted per cell?
- Are Azure and Google Cloud deploy targets needed at launch?
- Should previews ever use real business data (read-only, masked or synthetic)?
- Is customer model usage passed through at cost, marked up, or bring-your-own-key?
- Which identity providers come first for SSO, and is SCIM needed at the same time?

## 11. Prototype vs production

The prototype (Vite, React 19, TypeScript, Tailwind 4) demonstrates the experience. Only authentication is real.

| Area | Prototype | Status | Production |
|---|---|---|---|
| Sign-up, sign-in, sign-out, password change, profile | `server/index.ts`, `server/db.ts`, `Auth.tsx`, `api.ts`: scrypt, hashed 256-bit tokens, httpOnly cookie, 7-day expiry, other sessions revoked on password change | **Real** | Identity service on Postgres and Redis, MFA, audit, SSO on the roadmap |
| Login rate limit | In memory, 5 failures per email, 15-minute lock | **Real**, single process | Redis-backed, per email, IP and tenant |
| Prompt, clarify, plan, build | `NewBuild.tsx` with three templates (support triage, expense approvals, market research) in `scenarios.ts`; answers change the plan, integration, build steps and approval policy | Simulated | Conversation orchestrator, `BuildWorkflow`, build agent, sandbox |
| Projects and workspace state | Saved per user in browser storage (`store.tsx`) | Simulated | Project service and internal Git |
| Chat, restore points, element selection, preview | `BuildTab.tsx`, `AppPreview.tsx` | Simulated | Orchestrator, Git commits, microVM preview |
| Agents, canvas, confidence, permissions, approvals | `AgentsTab.tsx`, `ConfidencePanel.tsx`, `PermissionsPanel.tsx`, `Approvals.tsx` | Simulated | Agent registry, adapters, confidence scorer, Cedar, Approvals service |
| Governance checklist | `readiness.ts`, `ReadinessTab.tsx` (self-declared switches) | Simulated | Verified controls, fixes as pull requests |
| GitHub | `GithubTab.tsx` | Simulated | GitHub App, `GitSyncWorkflow`, check runs |
| Deploy | `DeployTab.tsx`: checks, canary, history, rollback | Simulated | Deploy orchestrator, signed images, Argo Rollouts, adapters |
| Monitoring, quality, integrations, settings | `ObserveTab.tsx`, `EvalsTab.tsx`, `Integrations.tsx`, `SettingsTab.tsx` | Simulated (profile and password are real) | OpenTelemetry and ClickHouse, Evaluation, Integrations and vault, Org and RBAC |

**To harden the real auth path:**
- Move the rate limiter to Redis and also limit by IP.
- Verify `Origin` on state-changing requests.
- Avoid revealing whether an email is already registered.
- Add email verification, MFA and account recovery.
- Move from SQLite to Postgres.
