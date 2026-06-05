# Phase 3 Architecture

Date: 2026-06-05

Phase 3 turns ReconVault into an intelligence operations platform while preserving the existing collector, workflow, evidence, analyst, graph, Firebase, and frontend systems.

## New Backend Services

- `caseService.ts`
  - Stores cases under `/cases`.
  - Supports case creation, updates, deletion, and linking multiple investigations.

- `timelineService.ts`
  - Stores timeline events under `/timeline`.
  - Records important investigation, plan, execution, evidence, analyst, workflow, and case events.

- `iocService.ts`
  - Stores IOCs under `/iocs`.
  - Supports create, update, merge, search, evidence links, and investigation links.
  - Automatically extracts IOC candidates when evidence is created.

- `reportExportService.ts`
  - Builds investigation reports from investigation data, evidence, timeline, executions, risk, and analyst conclusions.
  - Exports JSON, Markdown, HTML, and PDF-ready HTML.

- `auditService.ts`
  - Stores audit logs under `/auditLogs`.
  - Tracks case, investigation, plan, workflow, evidence, IOC, and report actions.

- `rbacService.ts`
  - Provides development-safe role and permission middleware.
  - Default roles: Admin, Analyst, Investigator, Viewer.
  - If authentication is not configured, development mode falls back to Admin.

- `queueService.ts`
  - Stores queue jobs under `/queueJobs`.
  - Supports `pending`, `running`, `completed`, and `failed` states.
  - Prepares for future BullMQ migration without introducing Redis.

## New Firebase Paths

- `/cases`
- `/timeline`
- `/iocs`
- `/auditLogs`
- `/users`
- `/roles`
- `/queueJobs`

Existing paths are preserved:

- `/targets`
- `/entities`
- `/relationships`
- `/collections`
- `/investigations`
- `/investigationPlans`
- `/evidence`
- `/toolExecutions`
- `/_counters`

## New API Groups

Cases:

- `GET /api/v1/cases`
- `POST /api/v1/cases`
- `GET /api/v1/cases/:id`
- `PUT /api/v1/cases/:id`
- `DELETE /api/v1/cases/:id`
- `POST /api/v1/cases/:id/investigations`

Timeline:

- `GET /api/v1/timeline`
- `GET /api/v1/timeline/investigation/:id`
- `GET /api/v1/timeline/case/:id`

IOCs:

- `GET /api/v1/iocs`
- `POST /api/v1/iocs`
- `GET /api/v1/iocs/:id`
- `POST /api/v1/iocs/search`
- `POST /api/v1/iocs/merge`
- `POST /api/v1/iocs/:id/evidence`
- `POST /api/v1/iocs/:id/investigations`

Reports:

- `GET /api/v1/reports/investigation/:id`
- `GET /api/v1/reports/investigation/:id/export?format=json`
- `GET /api/v1/reports/investigation/:id/export?format=markdown`
- `GET /api/v1/reports/investigation/:id/export?format=html`
- `GET /api/v1/reports/investigation/:id/export?format=pdf-html`

Audit:

- `GET /api/v1/audit`
- `GET /api/v1/audit/:id`

Queue:

- `GET /api/v1/queue`
- `POST /api/v1/queue`
- `POST /api/v1/queue/dequeue`
- `GET /api/v1/queue/:id`

RBAC:

- `GET /api/v1/rbac/roles`

## Frontend

The frontend now includes `frontend/src/components/Dashboard/IntelligenceOpsDashboard.jsx`.

Top navigation exposes it as `Intelligence Ops`, with sections for:

- Cases
- Timeline
- IOC Database
- Reports
- Audit Logs
- Queue status

## Automatic Event Hooks

Timeline and audit events are produced by:

- case creation/update/link/delete
- investigation creation
- plan generation
- execution start/completion
- evidence creation
- analyst report generation
- workflow start/completion
- IOC creation/merge
- report export

## Correlation Expansion

`correlationService.ts` now creates relationship candidates for:

- domain to IP
- domain to ASN
- email to domain
- subdomain to domain
- IP to organization
- domain to organization
- website to technology
- IOC to IOC by shared evidence

## RBAC Fallback

RBAC middleware accepts `X-ReconVault-Role` for development testing. In non-production environments, missing auth falls back to `Admin` so existing routes and workflows remain usable.

## Current Limits

- Firebase credentials are required for live Phase 3 persistence.
- Report export relies on already persisted investigation/evidence/timeline records.
- IOC extraction is conservative and pattern-based.
- Queue jobs are persisted but not processed by a background worker yet.
