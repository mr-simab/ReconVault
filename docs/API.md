# API Reference

Base URL: `http://localhost:8000/api/v1`

## Health

- `GET /health`
- `GET /healthz`
- `GET /readyz`
- `GET /api/v1/health`
- `GET /api/v1/health/detailed`
- `GET /api/v1/health/database`
- `GET /api/v1/health/neo4j`
- `GET /api/v1/health/redis`

`/health/neo4j` and `/health/redis` are compatibility diagnostics. They return `status: "removed"` because Neo4j and Redis are not part of the active runtime.

## Targets

- `GET /targets`
- `GET /targets/:id`
- `POST /targets`
- `PUT /targets/:id`
- `DELETE /targets/:id`

## Entities

- `GET /entities`
- `GET /entities/:id`
- `POST /entities`
- `PUT /entities/:id`
- `DELETE /entities/:id`

## Collection

- `POST /collection/start`
- `GET /collection/tasks/:taskId`
- `GET /collection/results/:taskId`
- `GET /collection/tasks/:taskId/results`
- `POST /collection/cancel/:taskId`
- `POST /collection/tasks/:taskId/cancel`
- `GET /collection/history`
- `GET /collection/tasks`
- `GET /collection/recent`
- `GET /collection/sources`

## Graph

- `GET /graph`
- `GET /graph/nodes`
- `GET /graph/edges`
- `POST /graph/query`
- `GET /graph/stats`

## Risk

- `GET /risk/assess/:targetId`
- `GET /risk/scores`
- `GET /risk/entities/:id`

## Tools

- `GET /tools`
- `GET /tools/context`
- `GET /tools/:name`

## MCP

- `GET /mcp/servers`
- `GET /mcp/capabilities`

`GET /mcp/servers` returns source groups from the tool registry. Each server entry includes `name`, `configured`, optional `baseUrl`, and a `tools` list. The frontend MCP Playground uses this endpoint for connected/not-connected counts and tool inventory.

## AI Planning

- `GET /ai/providers`
- `POST /ai/plan`
- `POST /ai/analyze`

`POST /ai/plan` accepts `target`, `user_request`, optional `investigation_id`, optional `current_findings`, and optional `investigation_state`.

The planner returns registry-backed steps only. The execution controller rejects raw command fields and unknown tool names.

`POST /ai/analyze` accepts optional `investigation_id`, `target`, and `objective`. It returns an evidence-backed analyst report through the configured provider or a deterministic fallback.

## Investigations

- `GET /investigations`
- `POST /investigations`
- `GET /investigations/:id`
- `POST /investigations/:id/plan`
- `GET /investigations/:id/plans`
- `POST /investigations/:id/execute`
- `POST /investigations/:id/analyze`
- `GET /investigations/:id/evidence`
- `GET /investigations/:id/executions`
- `POST /investigations/:id/memory`

## Execution

- `POST /execute/validate`
- `POST /execute`

`POST /execute` accepts a `plan`, optional `dry_run`, and optional `approved_tools`. Tools marked `requiresApproval` are skipped unless their names are present in `approved_tools`.

## Evidence

- `GET /evidence`
- `GET /evidence/:id`

## Workflows

- `POST /workflows/investigation`

This creates an investigation, generates one or more plans, executes non-duplicate plan steps, stores evidence, and generates an analyst report. Use `dry_run: true` to validate the workflow without executing collection/API/MCP tools.

## Cases

- `GET /cases`
- `POST /cases`
- `GET /cases/:id`
- `PUT /cases/:id`
- `DELETE /cases/:id`
- `POST /cases/:id/investigations`

## Timeline

- `GET /timeline`
- `GET /timeline/investigation/:id`
- `GET /timeline/case/:id`

Timeline events are automatically recorded for investigation, planning, execution, evidence, analyst, workflow, and case events.

## IOCs

- `GET /iocs`
- `POST /iocs`
- `GET /iocs/:id`
- `POST /iocs/search`
- `POST /iocs/merge`
- `POST /iocs/:id/evidence`
- `POST /iocs/:id/investigations`

Evidence creation automatically extracts IOC candidates.

## Reports

- `GET /reports/investigation/:id`
- `GET /reports/investigation/:id/export?format=json`
- `GET /reports/investigation/:id/export?format=markdown`
- `GET /reports/investigation/:id/export?format=html`
- `GET /reports/investigation/:id/export?format=pdf-html`

## Audit

- `GET /audit`
- `GET /audit/:id`

## Compliance

- `GET /compliance/status`
- `GET /compliance/violations`
- `DELETE /compliance/violations/:id`
- `GET /compliance/logs`
- `GET /compliance/rate-limits`

## Queue

- `GET /queue`
- `POST /queue`
- `POST /queue/dequeue`
- `GET /queue/:id`

## RBAC

- `GET /rbac/roles`

Development fallback uses Admin permissions when authentication is not configured. You can test another role with `X-ReconVault-Role`.

## WebSocket

URL:
- `ws://localhost:8000/ws/intelligence`

Typical event types:
- `connected`
- `collection_progress`
- `collection_completed`
- `collection_failed`
- `pong`

## Error Behavior

- Firebase unavailable or not configured: read-only list routes return empty data with `metadata.degraded`; write/detail DB routes return `503`
- Optional source/API unavailable: collector metadata uses `source: "unavailable"` and includes a `reason`
- LLM provider unavailable: planning falls back to deterministic registry-backed planning
- MCP server unavailable or unconfigured: MCP execution returns `unavailable`
