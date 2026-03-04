# API Reference

Base URL: `http://localhost:8000/api/v1`

## Health

- `GET /health`
- `GET /healthz`
- `GET /readyz`
- `GET /api/v1/health`
- `GET /api/v1/health/detailed`
- `GET /api/v1/health/database`

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

- DB unavailable: `503` on DB-backed routes
- Optional source/API unavailable: collector response falls back with `source: "mock"`
