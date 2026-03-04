# Quick Start

## 1. Configure Environment Files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## 2. Start with Docker

```bash
docker-compose up -d --build
```

## 3. Open Services

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api/v1`
- Backend Health: `http://localhost:8000/healthz`

## 4. Verify Basic Connectivity

```bash
curl http://localhost:8000/healthz
curl http://localhost:8000/api/v1/collection/sources
```

## 5. If Database is Not Running

- Service still starts
- DB routes return `503`
- Non-DB endpoints (health/sources/websocket handshake) continue to work
