# Troubleshooting

## Backend health is up but API route returns 503

Cause:
- PostgreSQL unavailable or `DATABASE_URL` incorrect

Check:

```bash
curl http://localhost:8000/readyz
```

Fix:
- Verify `DATABASE_URL` in `backend/.env`
- Ensure database is reachable from backend runtime

## Collector returns `source: "mock"`

Cause:
- Live source failed, rate-limited, or API key missing

Fix:
- Configure required API keys in `backend/.env`
- Verify outbound internet connectivity
- Retry the same target and inspect backend logs

## Frontend cannot connect to backend

Fix:
- Set `VITE_API_BASE_URL` in `frontend/.env`
- Set `VITE_WS_URL` in `frontend/.env`
- Rebuild/restart frontend after env changes

## WebSocket issues

Expected WS URL path:
- `/ws/intelligence`

Check backend health first, then inspect browser console for reconnect behavior.

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
