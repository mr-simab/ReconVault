# Development Guide

## Backend Project Structure

```text
backend/
├── .env.example
├── Dockerfile
├── package.json
├── package-lock.json
├── tsconfig.json
├── prisma/
│   └── schema.prisma
└── src/
    ├── index.ts
    ├── config/
    │   ├── env.ts
    │   ├── logger.ts
    │   └── prisma.ts
    ├── collectors/
    │   ├── baseCollector.ts
    │   ├── index.ts
    │   ├── domainCollector.ts
    │   ├── emailCollector.ts
    │   ├── ipCollector.ts
    │   ├── webCollector.ts
    │   ├── socialCollector.ts
    │   ├── geoCollector.ts
    │   ├── mediaCollector.ts
    │   └── darkwebCollector.ts
    ├── models/
    │   └── types.ts
    ├── routes/
    │   ├── health.ts
    │   ├── targets.ts
    │   ├── entities.ts
    │   ├── collection.ts
    │   ├── graph.ts
    │   └── risk.ts
    ├── services/
    │   ├── collectionService.ts
    │   ├── riskService.ts
    │   └── websocketHub.ts
    └── utils/
        └── target.ts
```

## Frontend Project Structure

```text
frontend/
├── .env.example
├── Dockerfile
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── jest.config.js
├── jest.setup.js
├── playwright.config.js
├── nginx.conf
├── public/
│   └── reconvault.png
├── __mocks__/
│   └── fileMock.js
├── e2e/
│   ├── api-integration.spec.js
│   └── user-workflows.spec.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── vendor/
    │   └── forceGraph2D.js
    ├── styles/
    │   ├── animations.css
    │   ├── graph.css
    │   ├── main.css
    │   └── theme.css
    ├── hooks/
    │   ├── useAnimation.js
    │   ├── useDebounce.js
    │   ├── useGraph.js
    │   ├── useKeyboardShortcuts.js
    │   ├── useSearch.js
    │   └── useWebSocket.js
    ├── utils/
    │   ├── colorMap.js
    │   ├── constants.js
    │   ├── formatters.js
    │   └── riskLevelUtils.js
    ├── services/
    │   ├── api.js
    │   ├── exportService.js
    │   ├── graphAnalytics.js
    │   ├── graphService.js
    │   ├── performanceService.js
    │   ├── playlistService.js
    │   ├── snapshotService.js
    │   └── websocket.js
    ├── components/
    │   ├── Common/
    │   ├── Dashboard/
    │   ├── Forms/
    │   ├── Graph/
    │   ├── Inspector/
    │   └── Panels/
    └── __tests__/
        ├── components.test.js
        ├── exportService.test.js
        ├── graphAnalytics.test.js
        ├── hooks.test.js
        └── utils.test.js
```

## Local Development

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Docker Development

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker-compose up -d --build
docker-compose ps
```

## Build Commands

Backend:

```bash
cd backend
npm run build
```

Frontend:

```bash
cd frontend
npm run build
```

## Runtime Behavior

- Service starts even if optional external APIs are unavailable.
- If PostgreSQL is unavailable, DB-backed endpoints return `503` instead of crashing the process.
- Collectors are real-source first; mock data is fallback only.
