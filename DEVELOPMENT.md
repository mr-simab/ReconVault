# Development Guide

## Backend Project Structure

```text
backend/
|-- .env.example
|-- Dockerfile
|-- package.json
|-- package-lock.json
|-- tsconfig.json
`-- src/
    |-- index.ts
    |-- config/
    |   |-- env.ts
    |   `-- logger.ts
    |-- collectors/
    |   |-- baseCollector.ts
    |   |-- index.ts
    |   |-- domainCollector.ts
    |   |-- emailCollector.ts
    |   |-- ipCollector.ts
    |   |-- webCollector.ts
    |   |-- socialCollector.ts
    |   |-- geoCollector.ts
    |   |-- mediaCollector.ts
    |   `-- darkwebCollector.ts
    |-- models/
    |   `-- types.ts
    |-- routes/
    |   |-- ai.ts
    |   |-- audit.ts
    |   |-- cases.ts
    |   |-- collection.ts
    |   |-- compliance.ts
    |   |-- entities.ts
    |   |-- evidence.ts
    |   |-- execution.ts
    |   |-- graph.ts
    |   |-- health.ts
    |   |-- investigations.ts
    |   |-- iocs.ts
    |   |-- mcp.ts
    |   |-- queue.ts
    |   |-- rbac.ts
    |   |-- reports.ts
    |   |-- risk.ts
    |   |-- targets.ts
    |   |-- timeline.ts
    |   |-- tools.ts
    |   `-- workflows.ts
    |-- services/
    |   |-- analystService.ts
    |   |-- apiIntegrationService.ts
    |   |-- auditService.ts
    |   |-- caseService.ts
    |   |-- collectionService.ts
    |   |-- contextBuilderService.ts
    |   |-- correlationService.ts
    |   |-- dataStore.ts
    |   |-- executionController.ts
    |   |-- investigationService.ts
    |   |-- iocService.ts
    |   |-- knowledgeGraphService.ts
    |   |-- llmProviderService.ts
    |   |-- mcpGateway.ts
    |   |-- planningService.ts
    |   |-- queueService.ts
    |   |-- rbacService.ts
    |   |-- reportExportService.ts
    |   |-- riskService.ts
    |   |-- timelineService.ts
    |   |-- toolRegistry.ts
    |   |-- websocketHub.ts
    |   `-- workflowService.ts
    `-- utils/
        `-- target.ts
```

## Frontend Project Structure

```text
frontend/
|-- .env.example
|-- Dockerfile
|-- index.html
|-- package.json
|-- package-lock.json
|-- vite.config.js
|-- tailwind.config.js
|-- postcss.config.js
|-- jest.config.js
|-- jest.setup.js
|-- playwright.config.js
|-- nginx.conf
|-- public/
|   `-- reconvault.png
|-- e2e/
|   |-- api-integration.spec.js
|   `-- user-workflows.spec.js
`-- src/
    |-- main.jsx
    |-- App.jsx
    |-- vendor/
    |-- styles/
    |-- hooks/
    |-- utils/
    |-- services/
    |-- components/
    |   |-- Common/
    |   |-- Dashboard/
    |   |   |-- ComplianceDashboard.jsx
    |   |   |-- IntelligenceOpsDashboard.jsx
    |   |   |-- InvestigationDashboard.jsx
    |   |   `-- MCPPlayground.jsx
    |   |-- Forms/
    |   |-- Graph/
    |   |-- Inspector/
    |   `-- Panels/
    `-- __tests__/
```

Generated folders such as `backend/dist` and `frontend/dist` are not source. Recreate them with the build commands when needed.

## Local Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The backend requires Firebase Realtime Database credentials for persisted DB-backed work. Without Firebase config, the process still starts and `/health` remains available. `/readyz` returns `503`; read-only list routes return empty degraded payloads; write/detail DB routes return `503`.

## Local Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Firebase Setup

1. Create or select a Firebase project.
2. Enable Realtime Database.
3. Create a service account key.
4. Set `FIREBASE_DATABASE_URL`.
5. Set either `FIREBASE_SERVICE_ACCOUNT_JSON` or the split credentials:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

## v2 Orchestration Setup

The v2 orchestration layer works without an LLM provider by using deterministic fallback planning.

Optional provider configuration:

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4.1-mini
OPENAI_API_KEY=
```

Supported providers are `openai`, `anthropic`, `gemini`, `openrouter`, and `ollama`.

Optional MCP configuration:

```env
MCP_GATEWAY_SERVERS_JSON={"Recon MCP":{"baseUrl":"http://127.0.0.1:5000","endpointTemplate":"/mcp/tools/recon/{tool}"}}
```

The AI planner never executes tools. It creates plans; the execution controller validates and runs approved registry tools.

The header MCP chip opens the MCP Playground. The playground reads `/api/v1/mcp/servers`, shows total configured and unconfigured MCP sources, and lists the tools exposed by each source.

## Frontend Workspace Views

Top header order:

```text
Brand -> Backend live -> DB status -> MCP status/playground -> Search -> Graph | Investigation | Intelligence Ops | Compliance -> Profile
```

Center workspace views:

- `Graph`: live force graph using Firebase-backed entities and relationships.
- `Investigation`: AI planning, dry-run execution, workflow runs, evidence, and analyst reports.
- `Intelligence Ops`: cases, timeline, IOC database, reports, audit logs, RBAC roles, and queue status.
- `Compliance`: policy and violation status.
- `MCP`: source list, connection status, connected/not connected counts, and tool inventory.

Filtering remains in the left `Recon Controls` panel. The duplicate header filter button and bottom system metrics strip have been removed.

## Phase 3 Operations Layer

Phase 3 adds the investigation operations surface on top of the v2 orchestration backend:

- `caseService.ts` and `/api/v1/cases` manage investigation cases and case-to-investigation links.
- `timelineService.ts` and `/api/v1/timeline` record chronological investigation, case, plan, execution, workflow, analyst, and evidence events.
- `iocService.ts` and `/api/v1/iocs` maintain IOC records and automatically extract emails, URLs, IPs, hashes, domains, and ASNs from saved evidence.
- `reportExportService.ts` and `/api/v1/reports/investigation/:id` generate investigation reports in JSON, Markdown, HTML, and PDF-ready HTML.
- `auditService.ts` and `/api/v1/audit` track operational actions for review.
- `rbacService.ts` and `/api/v1/rbac/roles` provide the role and permission foundation. During development, requests without `X-ReconVault-Role` are treated as Admin; production falls back to Viewer.
- `queueService.ts` and `/api/v1/queue` persist queued job state for future background workers.

The frontend exposes this layer through `frontend/src/components/Dashboard/IntelligenceOpsDashboard.jsx`.

## Docker Development

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker-compose up -d --build
docker-compose ps
```

## Build Commands

Backend:

```bash
cd backend
npm run build
```

Frontend:

```bash
cd frontend
npm run build
```

## Test Commands

Frontend unit tests:

```bash
cd frontend
npm test
```

Frontend coverage:

```bash
cd frontend
npm run test:coverage
```

Playwright specs are present under `frontend/e2e`, but they should be reviewed against the current UI selectors before they are treated as release gates.

## Runtime Behavior

- Backend stack is Node.js + Express + TypeScript.
- Storage is Firebase Realtime Database through `src/services/dataStore.ts`.
- Prisma and PostgreSQL have been removed.
- Neo4j and Redis are not active services. Compatibility health routes report them as removed.
- Collectors no longer return mock intelligence. Failed sources are marked as `source: "unavailable"` with a reason.
- WebSocket task progress is still in-memory for active live updates, while collection records are persisted in Firebase.
- v2 investigations, plans, evidence, and execution records are persisted in Firebase when credentials are configured.
- Phase 3 cases, timeline events, IOCs, audit logs, roles, users, reports, and queue jobs use Firebase-backed service models.
- Local degraded mode returns empty `metadata.degraded` payloads for read-only graph, collection task, and operations list endpoints so the UI can load without console-spamming `503` responses.
- MCP tools are metadata-only until matching servers are configured through `MCP_GATEWAY_SERVERS_JSON`.
