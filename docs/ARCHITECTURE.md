# Architecture

ReconVault uses a simplified service architecture:

- Frontend: React + Vite
- Backend: Node.js + Express + WebSocket
- Data: PostgreSQL via Prisma
- Reverse proxy: Nginx (optional)

Detailed folder-wise backend and frontend structures are documented in [../DEVELOPMENT.md](../DEVELOPMENT.md).

Removed complexity:
- No Neo4j
- No Redis
- No Celery
- No Python runtime in backend service

## Core Design

1. Frontend calls REST API (`/api/v1/*`) and WebSocket (`/ws/intelligence`)
2. Backend orchestrates collectors and persists entities/relationships in PostgreSQL
3. Collectors fetch real OSINT data first
4. Fallback mock payloads are returned only when live retrieval fails
5. Task updates are pushed through WebSocket in near real-time

## Resilience

- Missing optional APIs do not crash backend
- Missing DB does not crash backend process; DB routes return `503`
- Health endpoints remain available for diagnostics

See full diagram in [BLUEPRINT.md](BLUEPRINT.md).
