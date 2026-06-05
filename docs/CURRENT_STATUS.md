# Current Status

Date: 2026-06-05

## Summary

ReconVault now uses a Node.js backend with Firebase Realtime Database storage. Prisma and PostgreSQL have been removed from runtime code, package scripts, Docker build steps, and service composition.

The frontend no longer injects demo graph, history, or active-task fixtures. It shows live graph data only, reads task history from the backend, and updates active task progress through WebSocket events.

ReconVault also now has the first v2 orchestration foundation: tool registry, AI planning endpoint, MCP gateway facade, investigation memory, evidence store, execution controller, and frontend API helpers for the new endpoints.

The second v2 slice adds controlled API integration execution, a knowledge graph abstraction service, an AI analyst layer, an iterative workflow service, and a React investigation workspace.

Phase 3 adds the intelligence operations layer: cases, timeline, IOC database, reports, audit logs, RBAC foundation, queue foundation, expanded correlation, and an Intelligence Ops frontend workspace.

The current frontend command header has been simplified into an operational status and navigation strip: backend liveness, Firebase DB connection, MCP status/playground entry, compact search, Graph, Investigation, Intelligence Ops, Compliance, and profile menu.

## Implemented

- Backend storage migrated to Firebase Realtime Database through `backend/src/services/dataStore.ts`.
- Targets, entities, relationships, and collections are stored under Firebase RTDB paths.
- Numeric record IDs are generated through RTDB transactions under `/_counters`.
- Backend starts in degraded mode if Firebase is not configured.
- Read-only list routes return empty degraded responses when Firebase is unavailable; write/detail DB routes still return `503`.
- Health routes report Firebase database status.
- Prisma client, Prisma schema, migration scripts, and Postgres Docker service were removed.
- Collector fallback behavior changed from mock payloads to `source: "unavailable"` with reasons.
- Frontend sample graph data was removed.
- Frontend static collection history and task fixtures were removed.
- Frontend collection history and active tasks now load from collection APIs.
- WebSocket collection progress/completion/failure events update the sidebar and refresh the graph.
- Graph edges are normalized against entity values so raw relationship endpoints can attach to `entity-*` graph node IDs.
- Graph label rendering is less aggressive to reduce overlap.
- Graph force spacing and collision radius were increased to reduce object overlap.
- Main layout uses actual center-panel measurement instead of hard-coded width subtraction.
- Added a central tool registry in `backend/src/services/toolRegistry.ts`.
- Added an MCP gateway facade in `backend/src/services/mcpGateway.ts`.
- Added an LLM provider abstraction in `backend/src/services/llmProviderService.ts` for OpenAI, Anthropic, Gemini, OpenRouter, and Ollama.
- Added a bounded context builder in `backend/src/services/contextBuilderService.ts`.
- Added an AI planning service and `/api/v1/ai/plan`.
- Added investigation memory, plan storage, execution records, and evidence storage under Firebase RTDB.
- Added an execution controller that validates registry-backed plans, skips approval-required tools unless approved, and never exposes raw command execution to the planner.
- Added a small correlation service for email-domain and subdomain-domain relationships.
- Added frontend API helpers for tools, MCP, AI planning, investigations, execution, and evidence.
- Added controlled API integration execution for WHOIS, HIBP, VirusTotal, Shodan, AbuseIPDB, and SecurityTrails.
- Added `knowledgeGraphService.ts` and moved graph route shaping behind it.
- Added `analystService.ts` for provider-backed or deterministic evidence analysis.
- Added `workflowService.ts` and `POST /api/v1/workflows/investigation` for iterative plan-execute-analyze workflows.
- Added `frontend/src/components/Dashboard/InvestigationDashboard.jsx` and a top-header Investigation view.
- Added `frontend/src/components/Dashboard/MCPPlayground.jsx` and a clickable top-header MCP status chip.
- MCP Playground lists registered MCP sources, connected/not-connected counts, endpoint configuration, and tool inventory.
- Added `caseService.ts` and `/api/v1/cases`.
- Added `timelineService.ts` and `/api/v1/timeline`.
- Added `iocService.ts` and `/api/v1/iocs`, including automatic IOC extraction from evidence.
- Added `reportExportService.ts` and `/api/v1/reports/investigation/:id`.
- Added `auditService.ts` and `/api/v1/audit`.
- Added `rbacService.ts` with development fallback roles and `/api/v1/rbac/roles`.
- Added `queueService.ts` and `/api/v1/queue`.
- Added `/api/v1/compliance` status, violation, log, and rate-limit endpoints for the compliance UI.
- Expanded `correlationService.ts` for domain/IP/ASN/org/technology/IOC relationships.
- Added `frontend/src/components/Dashboard/IntelligenceOpsDashboard.jsx` and a top-header Intelligence Ops view.
- Frontend compliance views now use the configured API client instead of direct `/api/...` fetches.
- Frontend system metrics no longer use a second graph hook or random mock task/source/network values.
- Duplicate header filtering and the bottom metrics dock were removed; filtering now lives in the left Recon Controls panel.
- Header profile and search suggestion popovers now render above the center workspace and right inspector.

## Required Configuration

Firebase is required for all DB-backed functionality.

Set one of these credential forms in `backend/.env`:

```env
FIREBASE_DATABASE_URL=https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@YOUR_PROJECT_ID.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

Or:

```env
FIREBASE_DATABASE_URL=https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

Optional v2 orchestration config:

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4.1-mini
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
MCP_GATEWAY_SERVERS_JSON={"Recon MCP":{"baseUrl":"http://127.0.0.1:5000","endpointTemplate":"/mcp/tools/recon/{tool}"}}
EXECUTION_MAX_PARALLEL_STEPS=4
SECURITYTRAILS_API_KEY=
BUILTWITH_API_KEY=
WAPPALYZER_API_KEY=
```

## Verification

Completed checks:

- `cd backend && npm run build`
- `cd frontend && npm run build`
- Degraded-mode smoke:
  - `GET /api/v1/tools?category=api` returns `200`
  - `POST /api/v1/ai/analyze` returns a deterministic report when no provider is configured
  - `POST /api/v1/ai/plan` returns `200`
  - `GET /api/v1/rbac/roles` returns `200`
  - `GET /api/v1/cases`, `/timeline`, `/iocs`, `/audit`, and `/queue` return `200` with empty degraded data without Firebase
  - `GET /api/v1/graph` and `/collection/tasks` return `200` with empty degraded data without Firebase
  - `GET /api/v1/compliance/status` returns `200`
- Backend degraded-mode smoke test:
  - `GET /health` returns `200`
  - `GET /readyz` returns `503` when Firebase is not configured

Known build warnings:

- Frontend bundle has a chunk-size warning.
- Browserslist data is stale.
- Backend `npm install` reports dependency vulnerabilities from the current dependency tree.

## Current Gaps

- Firebase credentials are not present in the workspace, so a full live DB write/read test was not performed.
- v2 investigation/evidence persistence needs Firebase credentials for a full live write/read test.
- MCP execution requires external MCP servers configured with `MCP_GATEWAY_SERVERS_JSON`.
- MCP Playground reports source configuration status from `/api/v1/mcp/servers`; it does not actively health-check remote MCP servers beyond configured endpoint presence.
- Live API integration results require API keys and outbound network access.
- Workflow execution and investigation history need Firebase credentials for persistence.
- Phase 3 case/timeline/IOC/report/audit/queue data needs Firebase credentials for persistence.
- Queue jobs are persisted but do not yet have a background worker.
- Report export depends on persisted investigation data.
- Adaptive multi-iteration planning is conservative without a configured LLM provider.
- Collection active progress is still stored in memory while the process is running; completed collection records are persisted in Firebase.
- Some frontend API client methods still describe future routes that the slim backend does not implement, such as analytics and anomaly endpoints.
- Puppeteer dynamic scraping may need a browser installed in Docker, because the Dockerfile skips Puppeteer browser download.
- Playwright e2e specs still look aspirational and may need selector/API updates before they can be relied on.

## Next Recommended Work

1. Add Firebase credentials and run a full collection from the UI.
2. Confirm Firebase security rules for the RTDB project.
3. Add Firebase credentials and run live Phase 3 case/timeline/IOC/report flows.
4. Add a background worker around `queueService`.
5. Configure and test a real MCP server through `MCP_GATEWAY_SERVERS_JSON`.
6. Expand IOC extraction and correlation quality with test fixtures.
7. Decide whether to remove unused frontend API client methods or implement the missing backend routes.
8. Add a browser dependency for Puppeteer in the backend Docker image or disable dynamic scraping in container builds.
9. Refresh e2e tests against the current UI and API contracts.
