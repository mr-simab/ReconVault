# Architecture

ReconVault uses a simplified Node-first service architecture:

- Frontend: React + Vite
- Backend: Node.js + Express + WebSocket
- Data: Firebase Realtime Database via Firebase Admin SDK
- Orchestration: Tool registry + AI planner + execution controller + MCP gateway facade + analyst + workflow service
- Operations: cases + timeline + IOCs + reports + audit + RBAC + queue foundation
- UI workspaces: graph, investigation, MCP playground, intelligence operations, and compliance
- Reverse proxy: Nginx (optional)

Detailed folder structure is documented in [../DEVELOPMENT.md](../DEVELOPMENT.md).

## Removed Components

- Prisma ORM
- PostgreSQL container and migrations
- Neo4j
- Redis
- Python backend runtime
- Mock intelligence fallback payloads

## Core Design

1. Frontend calls REST API (`/api/v1/*`) and WebSocket (`/ws/intelligence`).
2. Backend orchestrates collectors and persists targets, entities, relationships, and collections in Firebase Realtime Database.
3. Collectors fetch live OSINT sources.
4. If a source fails or a credential is missing, the collector marks that source as `source: "unavailable"` instead of returning mock intelligence.
5. Task updates are pushed through WebSocket in near real time.
6. v2 planning requests use a bounded context builder and provider abstraction. If no LLM provider is configured, a deterministic planner creates a registry-backed plan.
7. v2 execution validates every plan step against the tool registry before running collectors or calling configured MCP servers.
8. The frontend header polls backend, Firebase DB, and MCP metadata status. The MCP chip opens the MCP Playground, which reads `/api/v1/mcp/servers`.

## v2 Orchestration Design

```text
User Request
  -> Context Builder
  -> LLM Provider Layer or Deterministic Fallback Planner
  -> Tool Registry Validation
  -> Execution Controller
  -> Built-in Collectors / MCP Gateway / API Integrations / Internal Correlation / Risk Engine
  -> Evidence Store + Investigation Memory
  -> AI Analyst
  -> Firebase-backed Graph Data
```

The AI planner does not execute commands, write files, or access infrastructure. It can only return tool names and structured inputs. Execution is isolated in backend services.

Graph reads now pass through `knowledgeGraphService.ts`, which keeps the existing Firebase graph implementation behind a graph abstraction layer for future Neo4j migration.

Phase 3 operations services sit beside the v2 orchestration services. They do not replace collection or investigation workflows; they add case management, timeline history, IOC intelligence, report export, audit logging, RBAC middleware, and persisted queue jobs.

## Data Storage

Firebase records are stored under these top-level paths:

- `/targets`
- `/entities`
- `/relationships`
- `/collections`
- `/investigations`
- `/investigationPlans`
- `/evidence`
- `/toolExecutions`
- `/cases`
- `/timeline`
- `/iocs`
- `/auditLogs`
- `/users`
- `/roles`
- `/queueJobs`
- `/_counters`

The `dataStore` service maintains numeric IDs using RTDB transactions under `/_counters`.

## Resilience

- Missing optional OSINT API keys do not crash the backend.
- Missing Firebase configuration does not crash startup.
- Read-only graph, collection task, and operations list routes return empty degraded payloads when Firebase is unavailable; DB write/detail routes return `503`.
- Health endpoints remain available for diagnostics.
- Missing LLM provider credentials do not crash startup; `/api/v1/ai/plan` uses deterministic fallback planning.
- Missing MCP server configuration causes MCP execution to return `unavailable` or skip approval-required tools.
- The MCP Playground reports configured endpoint presence from registry metadata; it is not a substitute for a full remote MCP health probe.

See the diagrams in [BLUEPRINT.md](BLUEPRINT.md) and the orchestration details in [V2_ORCHESTRATION.md](V2_ORCHESTRATION.md).
