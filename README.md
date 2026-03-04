# ReconVault - Cyber Intelligence Platform

## What is ReconVault?

ReconVault is a modular cyber reconnaissance and OSINT platform for collecting, correlating, and visualizing intelligence data.

It includes:
- React + Vite frontend for investigation workflows
- Node.js + Express backend for OSINT collection and APIs
- PostgreSQL + Prisma for storage
- WebSocket updates for live collection progress

## Key Features

- Real API-first OSINT collectors (domain, email, IP, web, social, geo, media, darkweb)
- Fallback to mock data only when live sources fail or credentials are missing
- Target/entity/graph/risk APIs
- Rule-based risk scoring (lightweight, no heavy ML runtime)
- Deployment-ready split architecture (backend and frontend can be hosted separately)

## Prerequisites

### For Docker Deployment
- Docker 20.10+
- Docker Compose 2.0+

### For Local Development
- Node.js 20+
- npm 10+
- PostgreSQL 15+ (required for full API functionality)

## Installation

### Option 1: Docker Deployment (Recommended)

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

### Option 2: Local Development Setup

Backend:

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Frontend:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Environment Configuration

Backend variables live in `backend/.env`.  
Frontend variables live in `frontend/.env`.

Important backend variables:
- `DATABASE_URL`
- `HIBP_API_KEY`
- `VIRUSTOTAL_API_KEY`
- `ABUSEIPDB_API_KEY`
- `GITHUB_TOKEN`
- `SHODAN_API_KEY`

Important frontend variables:
- `VITE_API_BASE_URL`
- `VITE_WS_URL`

## Documentation

- [Development Guide](DEVELOPMENT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Blueprint (Mermaid)](docs/BLUEPRINT.md)
- [API Reference](docs/API.md)
- [Quick Start](docs/QUICK_START.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## Tech Stack

Backend:
- Node.js (TypeScript)
- Express
- Prisma ORM
- PostgreSQL
- WebSocket (`ws`)

Frontend:
- React 18
- Vite
- Tailwind CSS
- Graph visualization components  

## License

MIT License
