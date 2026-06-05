# Quick Start

## 1. Configure Environment Files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## 2. Configure Firebase

Set these backend values in `backend/.env`:

```env
FIREBASE_DATABASE_URL=https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com
FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@YOUR_PROJECT_ID.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

As an alternative, set `FIREBASE_SERVICE_ACCOUNT_JSON` to a single-line service account JSON string.

## 3. Start with Docker

```bash
docker-compose up -d --build
```

## 4. Open Services

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api/v1`
- Backend Health: `http://localhost:8000/healthz`
- Backend Readiness: `http://localhost:8000/readyz`

## 5. Verify Connectivity

```bash
curl http://localhost:8000/healthz
curl http://localhost:8000/readyz
curl http://localhost:8000/api/v1/collection/sources
curl http://localhost:8000/api/v1/tools/context
curl http://localhost:8000/api/v1/ai/providers
curl -X POST http://localhost:8000/api/v1/ai/analyze -H "Content-Type: application/json" -d "{\"target\":\"example.com\"}"
curl http://localhost:8000/api/v1/rbac/roles
```

`/readyz` returns `503` until Firebase is configured and reachable.

## 6. Try a v2 Plan

The planner can return a deterministic plan even before an LLM provider is configured:

```bash
curl -X POST http://localhost:8000/api/v1/ai/plan \
  -H "Content-Type: application/json" \
  -d "{\"target\":\"example.com\",\"user_request\":\"Perform deep domain reconnaissance\"}"
```

Investigation creation and evidence persistence require Firebase credentials.

## 7. Use the Header Status Strip

The frontend header shows backend liveness, Firebase DB connection state, and MCP status before the search box.

- `Backend Live` means `/health` is reachable.
- `DB Connected` means `/api/v1/health/database` can ping Firebase.
- `MCP 0/5` style counts come from `/api/v1/mcp/servers`.
- Click the MCP chip to open the MCP Playground in the center workspace.

## 8. Use the Investigation Workspace

Open the frontend and choose `Investigation` in the top header.

The workspace can generate a plan without Firebase. Creating investigations, running persisted workflows, and viewing evidence history require Firebase credentials.

## 9. Use the MCP Playground

Open the frontend and click the `MCP` status chip.

The playground shows total MCP sources, connected and not connected counts, configured endpoints, and tool inventory. Remote MCP execution still requires `MCP_GATEWAY_SERVERS_JSON`.

## 10. Use the Intelligence Ops Workspace

Open the frontend and choose `Intelligence Ops` in the top header.

Cases, timeline, IOCs, reports, audit logs, and queue jobs require Firebase credentials.
