# Troubleshooting

## Backend health is up but API route returns 503

Cause:

- Firebase Realtime Database is not configured or not reachable.

Check:

```bash
curl http://localhost:8000/readyz
curl http://localhost:8000/api/v1/health/database
```

Fix:

- Verify `FIREBASE_DATABASE_URL` in `backend/.env`.
- Verify service account credentials.
- Make sure Realtime Database is enabled for the Firebase project.
- Confirm local runtime can reach Firebase.

## Collector returns `source: "unavailable"`

Cause:

- Live source failed.
- API key is missing.
- Source rate-limited or blocked the request.
- Network connectivity is unavailable.

Fix:

- Configure optional API keys in `backend/.env`.
- Retry the same target.
- Inspect backend logs for the collector and source name.

## Frontend cannot connect to backend

Fix:

- Set `VITE_API_BASE_URL` in `frontend/.env`.
- Set `VITE_WS_URL` in `frontend/.env`.
- Rebuild or restart the frontend after env changes.

## WebSocket issues

Expected WebSocket URL path:

- `/ws/intelligence`

Check backend health first, then inspect browser console reconnect logs.

## Empty graph

Cause:

- No collections have completed.
- Firebase is unavailable.
- No entities were created because sources were unavailable.

Fix:

- Check `/readyz`.
- Start a collection from the left sidebar.
- Review collection task errors from `/api/v1/collection/tasks`.

## AI plan uses deterministic fallback

Cause:

- `LLM_PROVIDER` is empty.
- The selected provider API key is missing.
- The provider request failed or did not return valid JSON.

Fix:

- Check `GET /api/v1/ai/providers`.
- Set `LLM_PROVIDER`, `LLM_MODEL`, and the matching provider API key in `backend/.env`.
- Restart the backend after env changes.

## MCP tool returns unavailable

Cause:

- No MCP server is configured for that tool source.
- The configured MCP server is not reachable.
- The execution request did not approve a tool marked `requiresApproval`.

Fix:

- Check `GET /api/v1/mcp/servers`.
- Set `MCP_GATEWAY_SERVERS_JSON` in `backend/.env`.
- Include required tool names in `approved_tools` when executing a plan.

## Header MCP chip shows not connected

Cause:

- `/api/v1/mcp/servers` is reachable, but none of the registry source groups has a configured `baseUrl`.
- `MCP_GATEWAY_SERVERS_JSON` is empty or uses source names that do not match registry names such as `Recon MCP`, `Network MCP`, `Web MCP`, `OSINT MCP`, `Intelligence MCP`, or `Browser MCP`.

Fix:

- Open the MCP Playground from the header MCP chip and inspect each source.
- Configure `MCP_GATEWAY_SERVERS_JSON` with matching source names.
- Restart the backend after changing MCP configuration.

## Profile dropdown appears behind a panel

Cause:

- A stale frontend bundle or stylesheet is still using older header stacking rules.

Fix:

- Refresh the browser after the Vite dev server rebuilds.
- Confirm `.rv-header` has the higher header layer in `frontend/src/styles/theme.css`.
- Confirm the profile menu in `TopHeader.jsx` uses a higher z-index than center workspace and side panels.

## API integration returns unavailable

Cause:

- The matching provider API key is missing.
- The target type is unsupported for that provider.
- Outbound network access is unavailable.

Fix:

- Configure the matching key, such as `VIRUSTOTAL_API_KEY`, `SHODAN_API_KEY`, `ABUSEIPDB_API_KEY`, `HIBP_API_KEY`, or `SECURITYTRAILS_API_KEY`.
- Confirm the plan step input matches the tool target type, for example HIBP requires an email and AbuseIPDB requires an IP.
- Check the evidence record summary for the exact unavailable reason.

## Phase 3 operations write/detail route returns 503

Cause:

- Cases, timeline, IOCs, reports, audit logs, and queue jobs are Firebase-backed.
- Firebase credentials are missing or invalid.
- Read-only list routes such as `GET /api/v1/cases`, `GET /api/v1/timeline`, `GET /api/v1/iocs`, `GET /api/v1/audit`, and `GET /api/v1/queue` should return `200` with empty `metadata.degraded` data in local degraded mode.

Fix:

- Check `GET /readyz`.
- Configure `FIREBASE_DATABASE_URL` and service account credentials.
- Retry the write or detail route after restarting the backend.

## Frontend requests `/api/compliance/status` on the Vite port

Cause:

- A stale frontend bundle or tab is still using an old direct `fetch('/api/compliance/status')` call.

Fix:

- Refresh the browser after the dev server rebuilds.
- Confirm `GET /api/v1/compliance/status` returns `200` on the backend.
- If the old request remains, restart the Vite dev server.

## Build errors

Backend:

```bash
cd backend
npm install
npm run build
```

Frontend:

```bash
cd frontend
npm install
npm run build
```
