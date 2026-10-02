# Architect 2.0 — Architecture Diagrams

This document contains the diagrams for the **target production architecture** of Architect 2.0. The rationale behind each component is in [ARCHITECTURE.md](./ARCHITECTURE.md); how the services work together is described in [SERVICES-SUMMARY.md](./SERVICES-SUMMARY.md).

> **Scope note.** The repository today is a UI/UX prototype. Only authentication (Identity service, simplified) is implemented for real. Every other box below is the proposed production design. See [Prototype vs production](./ARCHITECTURE.md#11-prototype-vs-production).

All diagrams use Mermaid and render on GitHub.

---

## Legend

| Notation | Meaning |
|---|---|
| Rectangle | Stateless or horizontally scalable service |
| Cylinder | Durable data store |
| Double-bordered rectangle | Event bus / log |
| Solid arrow `-->` | Synchronous request (HTTPS, gRPC) |
| Dotted arrow `-.->` | Asynchronous event, stream or callback (Kafka, SSE, WebSocket, webhook) |
| Thick arrow `==>` | Untrusted or customer-supplied code / traffic crossing an isolation boundary |
| Edge label | Protocol and purpose |
| Colour band | Plane: clients (grey), edge (blue), control (purple), generation/agent (green), execution (red), data (amber), deploy/runtime (teal), observability (slate), external (white) |

Abbreviations: **BFF** backend-for-frontend, **RLS** Postgres row-level security, **OTLP** OpenTelemetry protocol, **HITL** human in the loop, **OCI** Open Container Initiative image format.

---

## 1. Top-level system diagram

```mermaid
flowchart TB
  subgraph CL["1 Clients"]
    WEB["Web app - React SPA<br/>business and developer modes"]
    CLI["CLI and IDE extension"]
    PUB["Public API consumers"]
  end

  subgraph EDGE["2 Edge and gateway"]
    CDN["CDN and WAF"]
    APIGW["API gateway and BFF<br/>session check, rate limits, routing"]
    RTG["Realtime gateway<br/>SSE and WebSocket fan-out"]
    PVP["Preview proxy<br/>signed per-sandbox preview URLs"]
  end

  subgraph CP["3 Control plane"]
    IDN["Identity service<br/>accounts, sessions, MFA, SSO roadmap"]
    ORG["Org, tenant and RBAC service"]
    PRJ["Project service<br/>projects, versions, restore points"]
    APR["Approvals service<br/>HITL inbox, SLAs, escalation"]
    POL["Policy engine - Cedar<br/>allowed, approval, blocked"]
    GOV["Governance service<br/>readiness checklist and gate"]
    INT["Integrations service<br/>connectors, OAuth tokens, MCP registry"]
    BIL["Metering, credits and billing"]
    MKT["Marketplace and templates"]
    NTF["Notification service"]
    AUD["Audit log service<br/>append-only, hash-chained"]
  end

  subgraph GP["4 Generation and agent plane"]
    CONV["Conversation orchestrator<br/>chat, clarify, plan"]
    GEN["Build agent<br/>codegen, repair, explain"]
    WFE["Durable workflow engine - Temporal"]
    AREG["Agent registry and framework adapters"]
    ARW["Agent run workers"]
    TBK["Tool broker and MCP host"]
    GRD["Guardrails service"]
    CONF["Confidence scorer"]
    EVS["Evaluation service"]
    LLMGW["LLM gateway<br/>routing, fallback, caching, budgets"]
    IDX["Retrieval and indexing service"]
  end

  subgraph EX["5 Execution and sandbox plane"]
    SBO["Sandbox orchestrator"]
    VMP["MicroVM pool - Firecracker<br/>dev servers, tests, tool code"]
    BLD["Build workers - in microVMs"]
  end

  subgraph DP["6 Data plane"]
    PG[("Postgres<br/>control and run state, RLS")]
    GIT[("Project source store<br/>internal Git")]
    OBJ[("Object storage<br/>snapshots, artifacts, uploads")]
    VEC[("Vector index - pgvector")]
    RDS[("Redis<br/>cache, rate limits, stream fan-out")]
    BUS[["Event bus - Kafka-compatible<br/>fed by transactional outbox"]]
    VLT[("Secrets vault and KMS<br/>per-tenant keys")]
  end

  subgraph DR["7 Deploy and runtime plane"]
    DEP["Deploy orchestrator"]
    REG[("OCI artifact registry")]
    K8S["Architect Cloud runtime<br/>Kubernetes, per-tenant namespaces"]
    TRM["Traffic manager<br/>weighted canary and blue-green"]
    TGA["Target adapters<br/>Vercel, customer AWS, container"]
    DNS["Domain and TLS manager"]
  end

  subgraph OB["8 Observability"]
    OTC["OpenTelemetry collectors"]
    CHS[("ClickHouse<br/>traces, logs, metering events")]
    MAL["Metrics, SLOs and alerting"]
  end

  subgraph EXT["9 External integrations"]
    LLMP["Model providers<br/>Anthropic, OpenAI, others, self-hosted"]
    GH["GitHub - GitHub App"]
    SAAS["Business SaaS<br/>Zendesk, Stripe, Slack, Salesforce, Jira"]
    MCPX["Customer MCP servers"]
    CCL["Customer cloud accounts"]
    VCL["Vercel"]
    PAY["Payment processor"]
    MSG["Email and chat delivery"]
  end

  %% Clients to edge
  WEB -->|"HTTPS"| CDN
  CDN -->|"HTTPS /api"| APIGW
  CLI -->|"HTTPS, scoped API token"| APIGW
  PUB -->|"HTTPS, API key"| APIGW
  WEB -.->|"SSE chat and build progress"| RTG
  WEB -.->|"iframe HTTPS and HMR WebSocket"| PVP

  %% Edge to control plane
  APIGW -->|"validate session"| IDN
  APIGW -->|"gRPC"| ORG
  APIGW -->|"gRPC"| PRJ
  APIGW -->|"gRPC"| APR
  APIGW -->|"gRPC"| GOV
  APIGW -->|"gRPC"| INT
  APIGW -->|"gRPC"| BIL
  APIGW -->|"gRPC"| MKT
  APIGW -->|"gRPC start chat turn"| CONV
  APIGW -->|"gRPC start deploy"| DEP
  RTG -.->|"subscribe per session"| RDS

  %% Control plane internals
  IDN -->|"SQL"| PG
  ORG -->|"SQL"| PG
  PRJ -->|"SQL"| PG
  PRJ -->|"commit, branch, tag"| GIT
  APR -->|"SQL"| PG
  APR -.->|"approval decided"| BUS
  APR -->|"notify approvers"| NTF
  NTF -->|"SMTP and chat APIs"| MSG
  GOV -->|"evaluate controls"| POL
  INT -->|"store tokens"| VLT
  BIL -->|"charges and invoices"| PAY
  BIL -.->|"consume usage events"| BUS
  AUD -.->|"consume all domain events"| BUS
  AUD -->|"WORM copy"| OBJ

  %% Generation plane
  CONV -->|"LLM calls"| LLMGW
  CONV -->|"start BuildWorkflow"| WFE
  CONV -.->|"token and step stream"| RDS
  WFE -->|"activities"| GEN
  WFE -->|"activities"| ARW
  WFE -->|"activities"| DEP
  WFE -->|"workflow history"| PG
  GEN -->|"LLM calls"| LLMGW
  GEN -->|"write files, run tests"| SBO
  GEN -->|"commit restore point"| PRJ
  GEN -->|"context retrieval"| IDX
  IDX -->|"embeddings"| LLMGW
  IDX -->|"vectors"| VEC
  ARW -->|"load agent version"| AREG
  AREG -->|"agent manifests"| PG
  ARW -->|"LLM calls"| LLMGW
  ARW -->|"tool calls"| TBK
  ARW -->|"checkpoints"| PG
  TBK -->|"authorize action"| POL
  TBK -->|"score"| CONF
  TBK -->|"input and output checks"| GRD
  TBK -->|"request approval"| APR
  TBK -->|"fetch scoped credential"| VLT
  TBK -->|"HTTPS"| SAAS
  TBK -->|"MCP"| MCPX
  TBK ==>|"run tool code"| SBO
  GRD -->|"classifier calls"| LLMGW
  CONF -->|"judge and sampling calls"| LLMGW
  EVS -->|"replay datasets"| WFE
  EVS -->|"results"| CHS
  LLMGW -->|"HTTPS, provider APIs"| LLMP
  LLMGW -->|"budget counters and cache"| RDS
  LLMGW -.->|"usage events"| BUS

  %% Execution plane
  SBO ==>|"create, snapshot, resume"| VMP
  SBO ==>|"build jobs"| BLD
  SBO -->|"snapshots"| OBJ
  PVP ==>|"route by signed host"| VMP
  BLD -->|"push image"| REG
  BLD -->|"build logs"| OTC

  %% Deploy plane
  DEP -->|"pre-deploy gate"| GOV
  DEP -->|"eval gate"| EVS
  DEP -->|"pull image"| REG
  DEP -->|"apply manifests"| K8S
  DEP -->|"set weights"| TRM
  DEP -->|"provision and deploy"| TGA
  DEP -->|"certificates and DNS"| DNS
  TGA -->|"Terraform, cloud APIs"| CCL
  TGA -->|"deployments API"| VCL
  TRM -->|"route traffic"| K8S

  %% GitHub
  PRJ -->|"push, open PR, installation token"| GH
  GH -.->|"webhooks push, PR, checks"| APIGW

  %% Observability
  ARW -.->|"OTLP spans"| OTC
  GEN -.->|"OTLP spans"| OTC
  K8S -.->|"OTLP spans, logs, metrics"| OTC
  LLMGW -.->|"OTLP spans"| OTC
  TBK -.->|"OTLP spans"| OTC
  OTC -->|"PII-redacted batch insert"| CHS
  OTC -->|"metrics"| MAL
  MAL -.->|"SLO burn, error-rate alerts"| DEP
  MAL -.->|"alerts"| NTF
  EVS -.->|"online eval sampling"| CHS

  classDef client fill:#eef0f3,stroke:#6b7280,color:#111
  classDef edge fill:#e0ecff,stroke:#2563eb,color:#111
  classDef control fill:#efe7ff,stroke:#7c3aed,color:#111
  classDef gen fill:#e3f7e8,stroke:#16a34a,color:#111
  classDef exec fill:#fde4e4,stroke:#dc2626,color:#111
  classDef data fill:#fff3d6,stroke:#d97706,color:#111
  classDef deploy fill:#dcf5f2,stroke:#0d9488,color:#111
  classDef obs fill:#e7ebf0,stroke:#475569,color:#111
  classDef ext fill:#ffffff,stroke:#9ca3af,color:#111

  class WEB,CLI,PUB client
  class CDN,APIGW,RTG,PVP edge
  class IDN,ORG,PRJ,APR,POL,GOV,INT,BIL,MKT,NTF,AUD control
  class CONV,GEN,WFE,AREG,ARW,TBK,GRD,CONF,EVS,LLMGW,IDX gen
  class SBO,VMP,BLD exec
  class PG,GIT,OBJ,VEC,RDS,BUS,VLT data
  class DEP,REG,K8S,TRM,TGA,DNS deploy
  class OTC,CHS,MAL obs
  class LLMP,GH,SAAS,MCPX,CCL,VCL,PAY,MSG ext
```

### Reading the diagram

- **Every request enters through the edge.** The API gateway validates the session with the Identity service once and forwards a short-lived signed internal identity (tenant, user, roles) to downstream services. No service behind the gateway reads the browser cookie.
- **Untrusted code only runs in the execution plane.** Thick arrows mark the only paths by which generated or customer-supplied code is executed: the sandbox orchestrator, build workers and the preview proxy.
- **All model traffic passes through the LLM gateway.** No service calls a model provider directly; this is where routing, fallback, caching, budgets and usage metering are enforced.
- **All agent side-effects pass through the tool broker.** It is the single enforcement point for permissions (policy engine), confidence thresholds, guardrails and human approval.
- **Long-running work is a Temporal workflow.** Builds, agent runs, GitHub sync and deploys survive process restarts and resume from their last completed step.

### Plane-level summary

```mermaid
flowchart LR
  C["Clients"] --> E["Edge and gateway"]
  E --> CPL["Control plane"]
  E --> G["Generation and agent plane"]
  CPL <--> G
  G ==> X["Execution and sandbox plane"]
  G --> M["LLM gateway to model providers"]
  CPL --> D["Deploy and runtime plane"]
  X --> D
  CPL --> DATA[("Data plane")]
  G --> DATA
  D --> DATA
  G -.-> O["Observability"]
  D -.-> O
  X -.-> O
```

---

## 2. Sequence: sign-in

The production flow keeps the prototype's model (opaque session token, stored only as a SHA-256 hash, httpOnly cookie) and adds distributed rate limiting, CSRF protection, MFA and an optional SSO path.

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant B as Browser SPA
  participant GW as API gateway
  participant RL as Redis rate limiter
  participant ID as Identity service
  participant PG as Postgres
  participant AU as Audit log

  U->>B: Enter email and password
  B->>GW: POST /api/auth/login with Origin header
  GW->>GW: Verify Origin matches allowed list - CSRF defence
  GW->>RL: Check counters per email and per IP
  alt Limit exceeded
    RL-->>GW: Blocked
    GW-->>B: 429 Too many attempts
  else Within limits
    GW->>ID: Login request
    ID->>PG: Load user by normalised email
    ID->>ID: Constant-time scrypt or Argon2id verify
    alt Invalid credentials
      ID->>RL: Increment failure counters
      ID-->>GW: 401 generic error
      GW-->>B: 401 Incorrect email or password
    else Valid and MFA enrolled
      ID-->>B: 200 MFA challenge - passkey or TOTP
      B->>GW: POST /api/auth/mfa with assertion
      GW->>ID: Verify assertion
    end
    ID->>ID: Generate 256-bit random token
    ID->>PG: INSERT session with SHA-256 of token, tenant, expiry, device
    ID->>AU: Emit auth.login.succeeded
    ID-->>GW: Set-Cookie httpOnly Secure SameSite=Lax
    GW-->>B: 200 user profile
  end
  Note over B,GW: Subsequent requests carry the cookie. The gateway hashes it, checks a short Redis cache, then Postgres, and forwards a signed internal identity token to services.
```

**SSO variant (roadmap).** For enterprise tenants the Identity service acts as an OIDC or SAML relying party: the user is redirected to the customer identity provider, the assertion is validated, the user is just-in-time provisioned into the tenant, and the same session cookie is issued. SCIM provisioning would keep membership in sync.

---

## 3. Sequence: prompt, clarify, plan, build with live preview

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant B as Browser SPA
  participant GW as API gateway
  participant RT as Realtime gateway
  participant CV as Conversation orchestrator
  participant LG as LLM gateway
  participant BL as Metering and credits
  participant WF as Temporal
  participant GA as Build agent
  participant SB as Sandbox orchestrator
  participant VM as MicroVM
  participant PX as Preview proxy
  participant PR as Project service

  U->>B: Describe the application
  B->>GW: POST /projects/draft/turns
  GW->>CV: Start turn
  B->>RT: Open SSE stream for turn
  CV->>LG: Classify intent and detect gaps - Haiku tier
  LG-->>CV: Missing requirements
  CV-->>RT: Clarifying questions
  RT-->>B: Render question cards
  U->>B: Answer questions
  B->>GW: POST answers
  GW->>CV: Continue turn
  CV->>LG: Produce structured plan - Opus tier, JSON schema
  LG-->>CV: Plan items - pages, agents, tools, data, integrations
  CV->>BL: Estimate and reserve credits
  CV-->>RT: Plan with credit estimate
  RT-->>B: Render plan for approval
  U->>B: Approve plan
  B->>GW: POST plan approval
  GW->>CV: Approved
  CV->>WF: Start BuildWorkflow with plan and idempotency key
  WF->>SB: Activity - acquire sandbox from warm pool
  SB->>VM: Restore template snapshot
  SB-->>WF: Sandbox id and preview host
  loop For each plan step
    WF->>GA: Activity - generate files for step
    GA->>LG: Codegen - Sonnet tier, streaming
    LG-->>GA: Token stream
    GA-->>RT: Step progress and file names
    RT-->>B: Live build log
    GA->>SB: Write files and run typecheck and tests
    SB->>VM: Apply files, dev server hot reloads
    alt Checks fail
      GA->>LG: Repair with error context - bounded attempts
    end
    GA->>PR: Commit restore point
    WF->>BL: Commit metered usage for step
  end
  B->>PX: Load preview iframe via signed URL
  PX->>VM: Proxy HTTP and HMR WebSocket
  VM-->>B: Live application preview
  WF->>BL: Release unused credit reservation
  WF-->>RT: Build complete with summary
  RT-->>B: Open workspace
```

---

## 4. Sequence: agent run with human approval

Example from the prototype: a support agent proposes a refund of 240 dollars; the policy auto-approves up to 100 and blocks above 1,000.

```mermaid
sequenceDiagram
  autonumber
  participant TR as Trigger - webhook or schedule
  participant WF as Temporal AgentRunWorkflow
  participant AW as Agent run worker
  participant LG as LLM gateway
  participant TB as Tool broker
  participant GR as Guardrails
  participant CF as Confidence scorer
  participant PE as Policy engine
  participant AP as Approvals service
  participant NT as Notifications
  actor H as Approver
  participant EXT as Stripe and Zendesk
  participant AU as Audit log

  TR->>WF: Start run with agent version and input
  WF->>AW: Activity - execute graph step
  AW->>LG: Classify and draft - pinned model versions
  LG-->>AW: Proposed tool call refund 240
  AW->>TB: Request tool call with args and run context
  TB->>GR: Validate schema, injection and policy filters
  GR-->>TB: Pass
  TB->>CF: Score proposed action
  CF-->>TB: Confidence 0.94 with component breakdown
  TB->>PE: Authorize principal, action, resource, context
  PE-->>TB: Decision requires approval - amount above auto limit
  TB->>AP: Create approval with evidence, proposed calls, SLA
  AP->>NT: Notify support-leads channel
  NT-->>H: Approval request
  TB-->>AW: Pending approval
  AW-->>WF: Checkpoint state and wait for signal
  Note over WF: Workflow sleeps durably. No compute is held while waiting.
  alt Approved within SLA
    H->>AP: Approve with optional edit
    AP->>WF: Signal approved with decision id
    WF->>AW: Resume from checkpoint
    AW->>TB: Execute approved call with idempotency key
    TB->>EXT: stripe refund and zendesk reply
    EXT-->>TB: Success
    TB->>AU: Record action, approver, policy version
  else Declined
    H->>AP: Decline with reason
    AP->>WF: Signal declined
    WF->>AW: Resume on decline branch - draft explanation, no refund
  else SLA expires
    WF->>AP: Escalate to next approver or on-call
  end
  AP->>CF: Feed outcome into calibration data
```

---

## 5. Sequence: GitHub two-way sync

```mermaid
sequenceDiagram
  autonumber
  actor U as User in Architect
  participant PR as Project service
  participant GS as Internal Git store
  participant WF as Temporal GitSyncWorkflow
  participant GH as GitHub
  actor E as Engineer
  participant GW as API gateway webhook endpoint
  participant GA as Build agent

  Note over PR,GH: Setup - org admin installs the Architect GitHub App on selected repositories
  U->>PR: Change requested and built
  PR->>GS: Commit on architect branch with trailers - prompt id, author
  PR->>WF: Start sync for commit
  WF->>GH: Mint installation token, push branch
  WF->>GH: Open or update pull request
  GH-->>WF: PR number
  GH->>GH: Required checks - CI and Architect eval check run
  E->>GH: Review and merge, or push commits from IDE
  GH-->>GW: Webhook push or pull_request with HMAC signature
  GW->>GW: Verify signature and deduplicate by delivery id
  GW->>WF: Signal external change
  WF->>GH: Fetch new commits
  WF->>GS: Fast-forward or merge into project main
  alt Merge conflict with pending Architect changes
    WF->>GA: Propose conflict resolution
    GA-->>WF: Resolution as new commit
    WF->>GH: Open PR for engineer review
  end
  WF->>PR: Update project head, re-index for retrieval
  PR-->>U: Workspace shows engineer change attributed to author
```

---

## 6. Sequence: deploy with governance gate, canary and automatic rollback

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant DP as Deploy orchestrator
  participant GV as Governance service
  participant EV as Evaluation service
  participant SB as Build workers
  participant RG as Artifact registry
  participant K as Kubernetes runtime
  participant TM as Traffic manager
  participant MA as Metrics and SLOs
  participant AP as Approvals service
  participant AU as Audit log

  U->>DP: Deploy version to production with canary
  DP->>GV: Pre-deploy checks
  GV-->>DP: Governance score, tests, security scan, cost estimate
  DP->>EV: Run offline eval suite against baseline
  EV-->>DP: Accuracy versus baseline
  alt Any blocking check fails
    DP-->>U: Blocked with remediation links
  else All checks pass
    opt Production policy requires sign-off
      DP->>AP: Request deploy approval
      AP-->>DP: Approved
    end
    DP->>SB: Build immutable image from commit
    SB->>RG: Push signed image with digest
    DP->>K: Create new ReplicaSet and run migrations - expand phase only
    DP->>K: Health and smoke checks on preview URL
    DP->>TM: Route 10 percent to new version
    loop Each canary stage - 10, 50, 100 percent
      DP->>MA: Compare error rate, latency, eval score, cost per run against stable
      alt Within thresholds for bake time
        DP->>TM: Increase weight
      else Threshold breached
        DP->>TM: Route 100 percent to stable
        DP->>K: Scale down new version
        DP->>AU: Record automatic rollback with metrics evidence
        DP-->>U: Rolled back with reason
      end
    end
    DP->>AU: Record promotion, approver, artifact digest
    DP-->>U: Live in production
  end
```

Blue-green follows the same gate, then switches 100 percent of traffic at once while keeping the previous environment warm for instant reversal. Instant deploys skip staged weights but retain the post-deploy watch and automatic rollback.
