# ReconVault - Cyber Intelligence Platform

ReconVault is a modular reconnaissance and OSINT platform for collecting, correlating, and visualizing intelligence data.

## Key Features

- React + Vite investigation UI with graph visualization
- Node.js + Express backend for OSINT collection and APIs
- Firebase Realtime Database for targets, entities, relationships, and collection history
- WebSocket updates for live collection progress
- Real-source collectors with unavailable-source reporting instead of mock intelligence
- Target, entity, graph, collection, health, and risk APIs
- v2 orchestration foundation with tool registry, AI planning endpoint, MCP gateway facade, investigation memory, execution controller, and evidence store
- Investigation workspace UI for planning, dry-run workflows, approved execution, evidence review, and analyst reports
- MCP Playground UI for source status, connected/not-connected counts, endpoint visibility, and tool inventory
- Controlled API integrations for WHOIS, HIBP, VirusTotal, Shodan, AbuseIPDB, and SecurityTrails
- Intelligence operations workspace for cases, timeline, IOCs, reports, audit logs, RBAC roles, and queue status

## Prerequisites

### Docker Deployment

- Docker 20.10+
- Docker Compose 2.0+
- A Firebase project with Realtime Database enabled
- A Firebase service account for the backend

### Local Development

- Node.js 20+
- npm 10+
- Firebase Realtime Database credentials

## Installation

### Docker Deployment

```bash
git clone https://github.com/TesterPy-st/ReconVault.git
cd ReconVault
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker-compose up -d --build
```

Access:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api/v1`
- Health: `http://localhost:8000/healthz`
- Readiness: `http://localhost:8000/readyz`

### Local Development

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Firebase Configuration

Backend variables live in `backend/.env`.

Required for DB-backed routes:

- `FIREBASE_DATABASE_URL`
- Either `FIREBASE_SERVICE_ACCOUNT_JSON`
- Or all of:
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`

Optional OSINT API keys:

- `HIBP_API_KEY`
- `VIRUSTOTAL_API_KEY`
- `ABUSEIPDB_API_KEY`
- `GITHUB_TOKEN`
- `SHODAN_API_KEY`
- `SECURITYTRAILS_API_KEY`
- `BUILTWITH_API_KEY`
- `WAPPALYZER_API_KEY`
- `GOOGLE_VISION_API_KEY`
- `OCR_SPACE_API_KEY`
- `FACEPP_API_KEY`
- `FACEPP_API_SECRET`

Optional v2 orchestration variables:

- `LLM_PROVIDER`
- `LLM_MODEL`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `OPENROUTER_API_KEY`
- `OLLAMA_BASE_URL`
- `MCP_GATEWAY_SERVERS_JSON`
- `EXECUTION_MAX_PARALLEL_STEPS`

Frontend variables live in `frontend/.env`:

- `VITE_API_BASE_URL`
- `VITE_WS_URL`

## Runtime Behavior

- The backend starts in degraded mode if Firebase is not configured.
- Non-DB health routes remain available in degraded mode.
- Read-only graph, collection task, and operations list routes return empty degraded payloads until Firebase credentials are available; DB writes and detail reads return `503`.
- Collectors no longer emit mock intelligence. Failed or missing sources are marked with `source: "unavailable"` and a reason.
- The AI planner never executes commands. Plans are validated against the tool registry, and execution happens through the backend controller and configured MCP/API adapters.
- The top header shows backend liveness, Firebase DB status, MCP status, compact search, workspace navigation, and profile actions.
- The investigation workspace is available from the top header through `Investigation`.
- The MCP status chip opens the MCP Playground in the center workspace.
- The intelligence operations workspace is available from the top header through `Intelligence Ops`.
- Filtering is handled in the left Recon Controls panel; the duplicate header filter button and bottom metrics strip have been removed.

## Documentation

- [Development Guide](DEVELOPMENT.md)
- [Detailed Project Reference](docs/DETAILED_PROJECT_REFERENCE.md)
- [v2 Orchestration Layer](docs/V2_ORCHESTRATION.md)
- [Phase 3 Architecture](docs/PHASE3_ARCHITECTURE.md)
- [Current Status](docs/CURRENT_STATUS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Blueprint](docs/BLUEPRINT.md)
- [API Reference](docs/API.md)
- [Quick Start](docs/QUICK_START.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Tech Stack

Backend:

- Node.js
- TypeScript
- Express
- Firebase Admin SDK
- Firebase Realtime Database
- WebSocket (`ws`)

Frontend:

- React 18
- Vite
- Tailwind CSS
- React Force Graph

## License

MIT License
