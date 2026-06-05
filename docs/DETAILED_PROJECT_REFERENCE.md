# Detailed Project Reference

This document is the full working map of ReconVault after the Node.js + Firebase Realtime Database migration. It explains what the frontend contains, what the backend receives, how collectors run, what external sources are used, how data is stored and displayed, and what currently exists versus what is only future-facing in the frontend API client.

## 1. System Summary

ReconVault is a cyber reconnaissance and OSINT graph application.

Main parts:

- Frontend: React + Vite application in `frontend/src`.
- Backend: Node.js + Express + TypeScript API in `backend/src`.
- Realtime channel: WebSocket endpoint at `/ws/intelligence`.
- Database: Firebase Realtime Database through `firebase-admin`.
- Storage adapter: `backend/src/services/dataStore.ts`.
- Collection engine: `backend/src/services/collectionService.ts`.
- Visualization: `frontend/src/components/Graph/*` plus `frontend/src/services/graphService.js`.

Removed from the active stack:

- Prisma
- PostgreSQL
- Neo4j
- Redis
- Python backend runtime
- Mock intelligence fallback payloads

When an external collector source fails or an API key is missing, the backend records that source as `source: "unavailable"` with a reason instead of inventing mock intelligence.

## 2. Runtime Data Model

Firebase Realtime Database paths:

| Path | Purpose |
| --- | --- |
| `/targets` | Investigation targets created manually or by collection start |
| `/entities` | Findings emitted by collectors |
| `/relationships` | Edges between entity values |
| `/collections` | Collection task records and history |
| `/investigations` | Investigation workspace records |
| `/investigationPlans` | Saved AI/deterministic plans |
| `/evidence` | Evidence records from execution and analyst output |
| `/toolExecutions` | Tool execution summaries |
| `/cases` | Intelligence Ops case records |
| `/timeline` | Timeline events for cases and investigations |
| `/iocs` | IOC records and evidence/investigation links |
| `/auditLogs` | Audit trail records |
| `/users` | User records for future auth/RBAC expansion |
| `/roles` | RBAC role records |
| `/queueJobs` | Persisted queue jobs |
| `/_counters` | Numeric ID counters maintained by RTDB transactions |

Core record shapes:

### Target

```json
{
  "id": 1,
  "name": "example.com",
  "type": "DOMAIN",
  "priority": "medium",
  "status": "active",
  "description": null,
  "createdAt": "2026-06-05T00:00:00.000Z",
  "updatedAt": "2026-06-05T00:00:00.000Z"
}
```

### Entity

```json
{
  "id": 10,
  "type": "DOMAIN_REPUTATION",
  "value": "example.com",
  "riskLevel": "LOW",
  "metadata": {
    "data": { "malicious": false, "engines": ["urlhaus"] },
    "source": "real",
    "api": "virustotal+urlhaus"
  },
  "source": "domain:reputation:real",
  "targetId": 1,
  "createdAt": "2026-06-05T00:00:00.000Z",
  "updatedAt": "2026-06-05T00:00:00.000Z"
}
```

### Relationship

```json
{
  "id": 25,
  "source": "example.com",
  "target": "93.184.216.34",
  "relationshipType": "RESOLVES_TO",
  "metadata": { "source": "dns_lookup" },
  "createdAt": "2026-06-05T00:00:00.000Z",
  "updatedAt": "2026-06-05T00:00:00.000Z"
}
```

Relationships store raw string endpoints. The graph route maps those values to frontend node IDs when matching entity values are present.

### Collection

```json
{
  "id": 3,
  "taskId": "uuid",
  "targetId": 1,
  "status": "RUNNING",
  "progress": 50,
  "entitiesCollected": 12,
  "relationshipsCollected": 3,
  "collectorsCompleted": ["domain", "web"],
  "collectorsFailed": [],
  "errors": [],
  "startTime": "2026-06-05T00:00:00.000Z",
  "endTime": null,
  "metadata": {
    "target": "example.com",
    "collectorsRequested": ["domain", "web", "social"]
  }
}
```

## 3. Backend Entry Point and Middleware

File: `backend/src/index.ts`

Backend responsibilities:

- Loads environment config.
- Creates an Express app.
- Enables CORS.
- Accepts JSON bodies up to `2mb`.
- Mounts health routes at root and `/api/v1`.
- Mounts API route groups:
  - `/api/v1/targets`
  - `/api/v1/entities`
  - `/api/v1/collection`
  - `/api/v1/compliance`
  - `/api/v1/graph`
  - `/api/v1/risk`
  - `/api/v1/tools`
  - `/api/v1/mcp`
  - `/api/v1/ai`
  - `/api/v1/investigations`
  - `/api/v1/execute`
  - `/api/v1/evidence`
  - `/api/v1/workflows`
  - `/api/v1/cases`
  - `/api/v1/timeline`
  - `/api/v1/iocs`
  - `/api/v1/reports`
  - `/api/v1/audit`
  - `/api/v1/queue`
  - `/api/v1/rbac`
- Redirects `/api/v1/collection/recent` to `/api/v1/collection/history`.
- Converts Firebase/database initialization errors to route-appropriate degraded responses or `503`.
- Attaches WebSocket hub at `/ws/intelligence`.
- Starts the HTTP server.
- Attempts Firebase connection on startup.
- Shuts down Firebase Admin app on `SIGINT` and `SIGTERM`.

Important behavior:

- Missing Firebase configuration does not crash startup.
- `/health` and `/healthz` remain available even when Firebase is unavailable.
- Read-only graph, collection task, and operations list routes return empty degraded payloads until Firebase credentials are valid; DB write/detail routes fail with `503`.

## 4. Backend Services

### `dataStore.ts`

Purpose:

- Abstracts Firebase Realtime Database access.
- Provides model-style APIs for existing route/service style:
  - `findMany`
  - `findUnique`
  - `count`
  - `create`
  - `update`
  - `delete`
- Generates numeric IDs using RTDB transactions.
- Sanitizes values before writing to Firebase.
- Supports two credential modes:
  - `FIREBASE_SERVICE_ACCOUNT_JSON`
  - split credentials with `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

Top-level models:

- `dataStore.target`
- `dataStore.entity`
- `dataStore.relationship`
- `dataStore.collection`
- `dataStore.investigation`
- `dataStore.investigationPlan`
- `dataStore.evidence`
- `dataStore.toolExecution`
- `dataStore.case`
- `dataStore.timeline`
- `dataStore.ioc`
- `dataStore.auditLog`
- `dataStore.user`
- `dataStore.role`
- `dataStore.queueJob`

Limitations:

- Filtering is done after reading the collection into memory.
- This is fine for early-stage/small datasets but should be indexed or paginated more carefully for large Firebase datasets.

### `collectionService.ts`

Purpose:

- Starts collection jobs.
- Resolves or creates target records.
- Chooses collectors.
- Runs collectors sequentially.
- Persists findings and relationships.
- Updates collection task progress.
- Broadcasts WebSocket progress.
- Reads task history from Firebase and active task state from memory.

Current execution model:

- Tasks are started asynchronously after `/collection/start`.
- Collectors run one after another, not in parallel.
- Active task state is in memory.
- Collection records are persisted in Firebase.
- Cancelling only works for currently running in-memory tasks.

### `riskService.ts`

Purpose:

- Calculates a lightweight target risk score from persisted entity risk levels.

Weights:

| Risk level | Weight |
| --- | --- |
| `CRITICAL` | 90 |
| `HIGH` | 70 |
| `MEDIUM` | 50 |
| `LOW` | 25 |
| `INFO` | 10 |

Target score is the average entity weight, capped at `100`.

### `websocketHub.ts`

Purpose:

- Creates a WebSocket server at `/ws/intelligence`.
- Sends an initial `connected` message.
- Responds to `ping` messages with `pong`.
- Broadcasts collection events to all connected clients.

Current backend broadcast event types:

- `collection_progress`
- `collection_completed`
- `collection_failed`

The frontend WebSocket service also supports more future event names, but the current backend mainly emits collection events.

## 5. Backend Routes and API Endpoints

Base URL:

```text
http://localhost:8000/api/v1
```

Health routes are also mounted at the root, so both `/health` and `/api/v1/health` work.

### Health

| Method | Path | Purpose | DB required |
| --- | --- | --- | --- |
| `GET` | `/health` | Basic backend status | No |
| `GET` | `/healthz` | Simple liveness | No |
| `GET` | `/readyz` | Firebase readiness check | Yes |
| `GET` | `/api/v1/health` | API-prefixed basic health | No |
| `GET` | `/api/v1/health/detailed` | Detailed service health | Yes |
| `GET` | `/api/v1/health/database` | Firebase DB status | Yes |
| `GET` | `/api/v1/health/neo4j` | Compatibility route showing removed status | No |
| `GET` | `/api/v1/health/redis` | Compatibility route showing removed status | No |

### Targets

Mounted at `/api/v1/targets`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/targets` | List targets; supports `limit`, `offset`, `type` |
| `GET` | `/targets/:id` | Get one target |
| `POST` | `/targets` | Create target |
| `PUT` | `/targets/:id` | Update target |
| `DELETE` | `/targets/:id` | Delete target |

Create body example:

```json
{
  "name": "example.com",
  "type": "DOMAIN",
  "priority": "medium",
  "status": "active",
  "description": "Main investigation target"
}
```

### Entities

Mounted at `/api/v1/entities`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/entities` | List entities; supports `limit`, `offset`, `type`, `target_id` |
| `GET` | `/entities/:id` | Get one entity |
| `POST` | `/entities` | Create entity |
| `PUT` | `/entities/:id` | Update entity |
| `DELETE` | `/entities/:id` | Delete entity |

Create body example:

```json
{
  "type": "DOMAIN",
  "value": "example.com",
  "riskLevel": "INFO",
  "metadata": {},
  "source": "MANUAL",
  "targetId": 1
}
```

### Collection

Mounted at `/api/v1/collection`.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/collection/start` | Start a collection task |
| `GET` | `/collection/tasks/:taskId` | Get task status |
| `GET` | `/collection/results/:taskId` | Get completed task results |
| `GET` | `/collection/tasks/:taskId/results` | Alternate results route |
| `POST` | `/collection/cancel/:taskId` | Cancel running task |
| `POST` | `/collection/tasks/:taskId/cancel` | Alternate cancel route |
| `GET` | `/collection/history` | List collection tasks |
| `GET` | `/collection/tasks` | List collection tasks |
| `GET` | `/collection/sources` | List collector capabilities |
| `GET` | `/collection/recent` | Redirects to `/collection/history` |

Start request example:

```json
{
  "target": "example.com",
  "collectors": ["domain", "web", "social"],
  "includeDarkWeb": false,
  "includeMedia": false
}
```

Alternate body keys accepted:

- `target` or `name`
- `target_id` or `targetId`
- `collectors`, `collection_types`, or `types`
- `include_dark_web` or `includeDarkWeb`
- `include_media` or `includeMedia`

Start response example:

```json
{
  "task_id": "7ddc5c76-799e-4918-b748-93031f1e4817",
  "target": "example.com",
  "status": "RUNNING",
  "estimated_time": 60
}
```

### Graph

Mounted at `/api/v1/graph`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/graph` | Full graph: nodes and edges |
| `GET` | `/graph/nodes` | Nodes only; supports `type`, `limit` |
| `GET` | `/graph/edges` | Edges only |
| `POST` | `/graph/query` | Simple graph query |
| `GET` | `/graph/stats` | Entity and relationship counts |

Graph node shape:

```json
{
  "id": "entity-10",
  "label": "example.com",
  "value": "example.com",
  "type": "DOMAIN",
  "riskLevel": "INFO",
  "properties": {}
}
```

Graph edge shape:

```json
{
  "id": "rel-25",
  "source": "entity-10",
  "target": "entity-11",
  "sourceValue": "example.com",
  "targetValue": "93.184.216.34",
  "type": "RESOLVES_TO",
  "properties": {}
}
```

If source or target values do not match a known entity value, the raw string remains as the endpoint.

### Risk

Mounted at `/api/v1/risk`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/risk/assess/:targetId` | Risk summary for a target |
| `GET` | `/risk/scores` | Risk summaries for up to 200 targets |
| `GET` | `/risk/entities/:id` | Risk details for one entity |

## 6. Frontend API Client

File: `frontend/src/services/api.js`

The frontend uses one Axios client with:

- Base URL from `VITE_API_BASE_URL` or `/api/v1`.
- Request timeout: 30 seconds.
- `Content-Type: application/json`.
- Optional auth token from `localStorage.authToken`.
- GET request deduplication using `AbortController`.
- Development logging for requests and responses.

Implemented backend-backed API groups:

- `graphAPI.getGraph`
- `graphAPI.getGraphStats`
- `entityAPI.getEntities`
- `entityAPI.getEntity`
- `entityAPI.createEntity`
- `entityAPI.updateEntity`
- `entityAPI.deleteEntity`
- `collectionAPI.startCollection`
- `collectionAPI.getCollectionStatus`
- `collectionAPI.getCollectionResults`
- `collectionAPI.getCollectionTasks`
- `collectionAPI.cancelCollection`
- `collectionAPI.getRecentCollections`
- `healthAPI.getHealth`
- `healthAPI.getSystemStatus`
- `healthAPI.getDatabaseStatus`
- `targetAPI.getTargets`
- `targetAPI.getTarget`
- `targetAPI.createTarget`
- `targetAPI.updateTarget`
- `targetAPI.deleteTarget`
- `riskAPI.getRiskScores`
- `riskAPI.getEntityRisk`
- `complianceAPI.getComplianceStatus`
- `toolsAPI.listTools`
- `toolsAPI.getToolContext`
- `mcpAPI.listServers`
- `mcpAPI.getCapabilities`
- `aiPlanningAPI.getProviderStatus`
- `aiPlanningAPI.createPlan`
- `aiPlanningAPI.analyze`
- `investigationAPI.*`
- `executionAPI.*`
- `evidenceAPI.*`
- `workflowAPI.runInvestigation`
- `caseAPI.*`
- `timelineAPI.*`
- `iocAPI.*`
- `auditAPI.*`
- `queueAPI.*`
- `rbacAPI.listRoles`

Frontend API methods that are future-facing or not implemented by the current backend:

- `graphAPI.exportGraph`
- `graphAPI.updateGraph`
- `graphAPI.clearGraph`
- `entityAPI.searchEntities`
- `entityAPI.getEntitiesByType`
- `entityAPI.bulkCreateEntities`
- `entityAPI.bulkUpdateEntities`
- `entityAPI.bulkDeleteEntities`
- all `relationshipAPI` routes
- `reportsAPI.generateReport`, `reportsAPI.listReports`, `reportsAPI.getReportStatus`, `reportsAPI.listTemplates`, `reportsAPI.listFormats`, `reportsAPI.previewReport`, and `reportsAPI.deleteReport`
- `targetAPI.getTargetHistory`
- all `analyticsAPI` routes
- `riskAPI.analyzeRisk`
- all `anomaliesAPI` routes
- `collectionAPI.pauseCollection`
- `collectionAPI.resumeCollection`

These future-facing methods should either be removed from the client or implemented server-side before being exposed in production UI workflows.

## 7. Collector Registry

File: `backend/src/collectors/index.ts`

Registered collectors:

- `domain`
- `email`
- `ip`
- `web`
- `social`
- `geo`
- `media`
- `darkweb`

Default collectors:

```json
["domain", "email", "ip", "web", "social", "geo"]
```

Optional collectors:

- `media`, enabled by `includeMedia` or explicitly listing `media`
- `darkweb`, enabled by `includeDarkWeb` or explicitly listing `darkweb`

Important current behavior:

- The backend does not automatically choose collectors based on detected target type.
- If the frontend asks for `ip` against a domain, the IP collector still receives the domain string.
- Unknown collector names are filtered out in `resolveCollectors`.

## 8. Collector Source Details

Each collector returns:

```ts
{
  collector: string;
  findings: CollectorFinding[];
  relationships: CollectorRelationship[];
  details: unknown;
}
```

Each finding contains:

- `type`
- `value`
- `riskLevel`
- `metadata`
- `source`

The metadata source can be:

- `real`
- `unavailable`

### Domain Collector

File: `backend/src/collectors/domainCollector.ts`

Purpose:

- Domain registration and infrastructure reconnaissance.

Findings emitted:

- `DOMAIN`
- `DOMAIN_DNS`
- `SSL`
- `DOMAIN_HISTORY`
- `DOMAIN_REPUTATION`

Relationships emitted:

- `RESOLVES_TO` for DNS A records.

Sources and calls:

| Source | Use | API/library |
| --- | --- | --- |
| WHOIS | Registrar/registration data | `whois-json` |
| DNS A/MX/TXT/NS | DNS records | Node `dns.promises` |
| SSL Labs | TLS/SSL analysis | `https://api.ssllabs.com/api/v3/analyze` |
| Wayback CDX | Historical URLs | `https://web.archive.org/cdx/search/cdx` |
| VirusTotal | Domain reputation | `https://www.virustotal.com/api/v3/domains/:domain` |
| URLHaus | Malware URL host reputation | `https://urlhaus-api.abuse.ch/v1/host/:domain/` |

Optional key:

- `VIRUSTOTAL_API_KEY`

Risk behavior:

- Reputation is `HIGH` only if real reputation data marks malicious.
- Unavailable reputation remains `INFO`.

### Email Collector

File: `backend/src/collectors/emailCollector.ts`

Purpose:

- Email validation, MX records, breach exposure, and username/account presence.

Findings emitted:

- `EMAIL`
- `EMAIL_MX`
- `EMAIL_BREACH`
- `ACCOUNT_PRESENCE`

Relationships emitted:

- `BELONGS_TO_DOMAIN` from email to extracted domain.

Sources and calls:

| Source | Use | API/library |
| --- | --- | --- |
| Validator | Email syntax and normalization | `validator` |
| DNS MX | Mail exchanger records | Node `dns.promises.resolveMx` |
| Have I Been Pwned | Breach records | `https://haveibeenpwned.com/api/v3/breachedaccount/:email` |
| GitHub | Username presence | `https://api.github.com/users/:username` |
| Reddit | Username presence | `https://www.reddit.com/user/:username/about.json` |

Optional keys:

- `HIBP_API_KEY`
- `GITHUB_TOKEN`

Risk behavior:

- Invalid email syntax is `HIGH`.
- Real breach count greater than zero is `CRITICAL`.
- Missing HIBP key produces `source: "unavailable"` and does not claim no breach.

### IP Collector

File: `backend/src/collectors/ipCollector.ts`

Purpose:

- IP geolocation, reverse DNS, reputation, WHOIS, proxy/VPN status, and open ports.

Findings emitted:

- `IP_GEO`
- `IP_RDNS`
- `IP_REPUTATION`
- `IP_WHOIS`
- `IP_VPN_PROXY`
- `IP_PORTS`

Relationships emitted:

- None currently.

Sources and calls:

| Source | Use | API/library |
| --- | --- | --- |
| ip-api.com | Geolocation | `http://ip-api.com/json/:ip` |
| Reverse DNS | Hostnames | Node `dns.promises.reverse` |
| AbuseIPDB | Abuse confidence | `https://api.abuseipdb.com/api/v2/check` |
| VirusTotal | IP reputation | `https://www.virustotal.com/api/v3/ip_addresses/:ip` |
| WHOIS | IP ownership | `whois-json` |
| ipapi.co | Proxy/VPN hints | `https://ipapi.co/:ip/json/` |
| Shodan | Ports/tags | `https://api.shodan.io/shodan/host/:ip` |

Optional keys:

- `ABUSEIPDB_API_KEY`
- `VIRUSTOTAL_API_KEY`
- `SHODAN_API_KEY`

Risk behavior:

- Abuse confidence over 60 is `HIGH`.
- Real proxy/VPN detection is `MEDIUM`.
- Real open ports are `MEDIUM`.
- Unavailable sources remain `INFO`.

### Web Collector

File: `backend/src/collectors/webCollector.ts`

Purpose:

- Web page scraping, dynamic browser scraping, subdomain discovery, and technology detection.

Findings emitted:

- `WEB_PAGE`
- `WEB_DYNAMIC`
- `SUBDOMAINS`
- `TECH_STACK`

Relationships emitted:

- `HAS_SUBDOMAIN` from target to discovered subdomains.

Sources and calls:

| Source | Use | API/library |
| --- | --- | --- |
| Axios + Cheerio | Static HTML scrape | target URL |
| Puppeteer | Dynamic page scrape | target URL in headless browser |
| crt.sh | Certificate transparency subdomains | `https://crt.sh/?q=%.domain&output=json` |
| BuiltWith | Technology detection | `https://api.builtwith.com/v20/api.json` |
| HTTP headers | Lightweight tech fallback | target URL headers |

Optional key:

- `BUILTWITH_API_KEY`

Operational note:

- Docker currently skips Puppeteer browser download. Dynamic scraping may need a browser installed in the backend container.

### Social Collector

File: `backend/src/collectors/socialCollector.ts`

Purpose:

- Check username presence on public social/developer platforms.

Findings emitted:

- `SOCIAL_GITHUB`
- `SOCIAL_REDDIT`
- `SOCIAL_X`

Relationships emitted:

- `HAS_PROFILE` when GitHub profile exists.

Sources and calls:

| Source | Use | API/library |
| --- | --- | --- |
| GitHub | User lookup | `https://api.github.com/users/:username` |
| Reddit | User lookup | `https://www.reddit.com/user/:username/about.json` |
| X/Twitter public widget endpoint | Basic public profile info | `https://cdn.syndication.twimg.com/widgets/followbutton/info.json` |

Optional key:

- `GITHUB_TOKEN`

Risk behavior:

- Existing GitHub/Reddit profile is `LOW`.
- Network/rate-limit failures are `unavailable`, not false negatives.

### Geo Collector

File: `backend/src/collectors/geoCollector.ts`

Purpose:

- Geocode a place-like target and inspect surrounding public map features.

Findings emitted:

- `GEO_GEOCODE`
- `GEO_REVERSE`
- `GEO_NEARBY`

Relationships emitted:

- None currently.

Sources and calls:

| Source | Use | API/library |
| --- | --- | --- |
| Nominatim search | Forward geocoding | `https://nominatim.openstreetmap.org/search` |
| Nominatim reverse | Reverse geocoding | `https://nominatim.openstreetmap.org/reverse` |
| Overpass API | Nearby shops/restaurants | `https://overpass-api.de/api/interpreter` |

Required keys:

- None.

Operational note:

- Nominatim and Overpass have public usage policies and rate expectations. Heavy repeated searches should be throttled before production use.

### Media Collector

File: `backend/src/collectors/mediaCollector.ts`

Purpose:

- Analyze an image/media URL for metadata, OCR text, and faces.

Findings emitted:

- `MEDIA_EXIF`
- `MEDIA_TEXT`
- `MEDIA_FACE`

Relationships emitted:

- None currently.

Sources and calls:

| Source | Use | API/library |
| --- | --- | --- |
| Target URL download | Fetch media bytes | `axios.get(target)` |
| exifr | EXIF metadata parsing | `exifr` |
| OCR.space | Text extraction | `https://api.ocr.space/parse/image` |
| Face++ | Face detection | `https://api-us.faceplusplus.com/facepp/v3/detect` |

Optional keys:

- `OCR_SPACE_API_KEY`
- `FACEPP_API_KEY`
- `FACEPP_API_SECRET`

### Darkweb Collector

File: `backend/src/collectors/darkwebCollector.ts`

Purpose:

- Search public dark-web index results for onion mentions.

Findings emitted:

- `DARKWEB_MENTION`

Relationships emitted:

- None currently.

Sources and calls:

| Source | Use | API/library |
| --- | --- | --- |
| Ahmia | Onion search result page | `https://ahmia.fi/search/?q=target` |

Required keys:

- None.

## 9. What Happens When a User Starts a Collection

Frontend starting point:

- User opens the left sidebar.
- User enters a target in `ReconSearchForm`.
- User selects collection types.
- User clicks Start Intelligence Collection.

Frontend files involved:

- `frontend/src/App.jsx`
- `frontend/src/components/Panels/LeftSidebar.jsx`
- `frontend/src/components/Forms/ReconSearchForm.jsx`
- `frontend/src/services/api.js`
- `frontend/src/services/websocket.js`
- `frontend/src/hooks/useWebSocket.js`
- `frontend/src/hooks/useGraph.js`

Frontend request:

```http
POST /api/v1/collection/start
Content-Type: application/json
```

Body:

```json
{
  "target": "example.com",
  "types": ["domain", "web"],
  "includeDarkWeb": false,
  "includeMedia": false,
  "collectors": ["domain", "web"]
}
```

Backend route:

- `backend/src/routes/collection.ts`

Backend service:

- `backend/src/services/collectionService.ts`

Backend steps:

1. Validate `target`.
2. Resolve requested collectors.
3. Resolve existing target by `targetId` or `name`.
4. Create target if missing.
5. Create collection task state in memory.
6. Persist collection row in Firebase.
7. Return `202 Accepted` with `task_id`.
8. Run collectors asynchronously.
9. For each collector:
   - Call external APIs/libraries.
   - Create entity records for findings.
   - Create relationship records for relationships.
   - Update task progress.
   - Persist task progress to Firebase.
   - Broadcast `collection_progress`.
10. After all collectors:
   - Mark task `COMPLETED` or `FAILED`.
   - Persist final task state.
   - Broadcast `collection_completed` or `collection_failed`.

Frontend after response:

1. Adds task to active task list.
2. Waits for WebSocket progress events.
3. Refreshes collection task list every 15 seconds.
4. On completion/failure, refreshes graph data.

## 10. Heavy Single-Request Behavior

A heavy request is a collection request that asks for many collectors at once, for example:

```json
{
  "target": "example.com",
  "collectors": ["domain", "email", "ip", "web", "social", "geo", "media", "darkweb"],
  "includeDarkWeb": true,
  "includeMedia": true
}
```

Current backend behavior:

- The backend accepts the request if `target` is present.
- Collectors run sequentially.
- The HTTP request returns quickly with `202`.
- The heavy work continues in the background.
- Progress is sent through WebSocket.
- Firebase receives writes after each collector finishes.

Potential external call fanout for all collectors:

| Collector | Approximate source calls |
| --- | --- |
| `domain` | WHOIS, 4 DNS lookups, SSL Labs, Wayback, optional VirusTotal, URLHaus |
| `email` | validation, MX lookup, optional HIBP, GitHub, Reddit |
| `ip` | ip-api, reverse DNS, optional AbuseIPDB, optional VirusTotal, WHOIS, ipapi.co, optional Shodan |
| `web` | static page fetch, Puppeteer page load, crt.sh, BuiltWith or header fetch |
| `social` | GitHub, Reddit, Twitter/X widget endpoint |
| `geo` | Nominatim search, Nominatim reverse, Overpass |
| `media` | media download, OCR.space, optional Face++ |
| `darkweb` | Ahmia search |

Heavy-request risks today:

- No per-user rate limiting.
- No global queue.
- No collector-level concurrency cap beyond sequential execution per task.
- Multiple users can start multiple background tasks at once.
- Active task state is memory-resident.
- Public OSINT APIs may throttle or block repeated requests.
- Puppeteer can be expensive in CPU/memory.
- Firebase writes happen after each collector; very large metadata could increase write cost and response size.

Recommended controls before production:

- Add authentication.
- Add per-user and per-IP rate limits.
- Add maximum collectors per request.
- Add queue/backpressure for collection jobs.
- Add metadata size limits.
- Add collector timeout and retry policy configuration.
- Add target-type validation so incompatible collectors are not run accidentally.

## 11. WebSocket Flow

Frontend service:

- `frontend/src/services/websocket.js`
- `frontend/src/hooks/useWebSocket.js`

Backend service:

- `backend/src/services/websocketHub.ts`

WebSocket URL:

```text
ws://localhost:8000/ws/intelligence
```

Connection behavior:

1. Frontend creates singleton WebSocket service.
2. It connects to `/ws/intelligence`.
3. Backend sends:

```json
{
  "type": "connected",
  "payload": { "message": "WebSocket connected" },
  "timestamp": "..."
}
```

4. Frontend sends a `hello` message.
5. Frontend heartbeat sends `ping`.
6. Backend responds with `pong`.
7. Collection events update sidebar and trigger graph refreshes.

Current backend event examples:

```json
{
  "type": "collection_progress",
  "payload": {
    "taskId": "uuid",
    "progress": 50,
    "collectorsCompleted": ["domain"],
    "collectorsFailed": []
  },
  "timestamp": "..."
}
```

```json
{
  "type": "collection_completed",
  "payload": {
    "taskId": "uuid",
    "target": "example.com",
    "status": "COMPLETED"
  },
  "timestamp": "..."
}
```

## 12. Frontend Application Structure

Entry files:

- `frontend/src/main.jsx`
- `frontend/src/App.jsx`

Global style files:

- `frontend/src/styles/main.css`
- `frontend/src/styles/theme.css`
- `frontend/src/styles/graph.css`
- `frontend/src/styles/animations.css`

Vendor:

- `frontend/src/vendor/forceGraph2D.js`

### App Layout

`App.jsx` owns:

- Sidebar collapse state.
- Right sidebar collapse state.
- Selected node.
- Selected edge.
- Active view: `graph`, `investigations`, `operations`, `mcp`, or `compliance`.
- Collection start state.
- Collection history.
- Active tasks.
- Backend connection warning.
- Header service status for backend, Firebase DB, and MCP metadata.
- Graph center-panel size measurement.

Visible layout:

```text
TopHeader
├── LeftSidebar
├── GraphCanvas, InvestigationDashboard, IntelligenceOpsDashboard, MCPPlayground, or ComplianceDashboard
└── RightSidebar
```

## 13. Frontend Components

### Panels

#### `TopHeader.jsx`

Purpose:

- Top navigation/header.
- Compact entity/search command input.
- Backend live status.
- Firebase DB status.
- MCP status chip and MCP Playground entry.
- Main workspace navigation.
- User/menu popovers.

Important interactions:

- Calls `onSearch`.
- Calls `onMenuAction`.
- Opens the center MCP Playground when the MCP chip sends `mcp`.
- Shows labels for Graph, Investigation, Intelligence Ops, and Compliance.

Known behavior:

- `help` menu action opens `https://docs.reconvault.com`.
- Search suggestions and profile menu use a high header z-index so they render above the center workspace and right inspector.
- Filtering is handled by `LeftSidebar`/`FilterPanel`; the duplicate header filter button was removed.

#### `LeftSidebar.jsx`

Purpose:

- Main collection and filtering control panel.

Tabs:

- Search
- Filters
- History
- Tasks

Uses:

- `ReconSearchForm`
- `FilterPanel`

Receives:

- `collectionHistory`
- `activeTasks`
- `onStartCollection`
- task control handlers

Current data:

- Collection history and active task data come from backend APIs and WebSocket events.

#### `RightSidebar.jsx`

Purpose:

- Entity and relationship inspection panel.

Tabs:

- Overview
- Metadata
- Risk
- Compliance

Uses:

- `EntityInspector`
- `RelationshipInspector`
- `Metadata`
- `RiskAssessment`
- `CompliancePanel`

Receives:

- `selectedNode`
- `selectedEdge`
- `onEntityAction`
- `onRelationshipAction`

### Dashboard Components

#### `InvestigationDashboard.jsx`

Purpose:

- AI-assisted investigation workspace.
- Generates plans, creates investigations, runs dry-run or approved workflows, reviews evidence/executions, and generates analyst reports.
- Reads MCP server counts as context for investigation planning.

#### `MCPPlayground.jsx`

Purpose:

- Center workspace opened from the header MCP chip.
- Reads `/api/v1/mcp/servers`.
- Shows total MCP sources, connected count, not connected count, total tools, endpoint configuration, and per-source tool inventory.
- Treats a source as connected when it has a configured `baseUrl` from `MCP_GATEWAY_SERVERS_JSON`.

#### `IntelligenceOpsDashboard.jsx`

Purpose:

- Intelligence operations workspace exposed as `Intelligence Ops`.
- Covers cases, timeline, IOC database, reports, audit logs, roles, and queue status.

#### `ComplianceDashboard.jsx`

Purpose:

- Ethics and compliance workspace.
- Reads compliance API status, violations, logs, and rate-limit policy state.

### Forms

#### `ReconSearchForm.jsx`

Purpose:

- Target input.
- Collection type selection.
- Advanced collection options.
- Submit collection request.

Collection types shown:

- `web`
- `social`
- `domain`
- `ip`
- `email`
- `media`
- `darkweb`

Options:

- Include Dark Web Search
- Include Media Analysis
- Deep Scan Mode
- Real-time Updates

Current backend use:

- `includeDarkWeb` and `includeMedia` are used.
- `deepScan`, custom tags, timeout, and max results are present in UI but not enforced by backend yet.

#### `FilterPanel.jsx`

Purpose:

- Filter graph by entity type, risk level, confidence, relationship type, and other UI-side controls.

#### `ExportPanel.jsx`

Purpose:

- Export UI shell for graph/export workflows.

Backend note:

- Current backend does not implement `/graph/export`.
- Frontend also supports client-side canvas PNG export from graph controls.

#### `AdvancedSearch.jsx`

Purpose:

- Advanced search modal UI.

Backend note:

- Current backend does not implement full advanced search endpoints.

### Graph Components

#### `GraphCanvas.jsx`

Purpose:

- Renders graph using `ForceGraph2D`.
- Filters nodes and edges based on active filters.
- Handles click, hover, background click, zoom, fit, center, labels, edges, simulation, and PNG canvas export.

Overlap improvements currently applied:

- Uses actual center-panel measurement from `App.jsx`.
- Uses collision radius based on node size.
- Uses longer link distance.
- Shows empty state when no live graph data exists.
- Avoids stuck loading on empty graph.

#### `GraphNode.jsx`

Purpose:

- Canvas renderer for graph nodes.

Draws:

- Node circle.
- Border.
- Entity type icon.
- Selection ring.
- Hover ring.
- Contextual label.
- Risk indicator.
- Connection count indicator.

Label behavior:

- Labels show only when selected, hovered, highlighted, or sufficiently zoomed.
- Long labels are truncated.

#### `GraphEdge.jsx`

Purpose:

- Canvas renderer for graph links.

Draws:

- Curved edge path.
- Optional dash for selected relationship types.
- Arrowhead.
- Selection highlight.
- Label/details only when selected.

#### `GraphControls.jsx`

Purpose:

- Floating graph control panel.

Controls:

- Zoom in
- Zoom out
- Fit to screen
- Center graph
- Toggle simulation
- Toggle labels
- Toggle edges
- Export graph PNG

### Inspector Components

#### `EntityInspector.jsx`

Purpose:

- Shows selected entity details.
- Displays type, value, risk, metadata snippets, connected relationships, and timestamps where present.

#### `RelationshipInspector.jsx`

Purpose:

- Shows selected edge/relationship details.
- Displays source, target, type, confidence/risk fields where present, and metadata.

#### `Metadata.jsx`

Purpose:

- Structured metadata display.
- Search/filter metadata keys.
- Copy metadata values.
- Expand/collapse nested values.

#### `RiskAssessment.jsx`

Purpose:

- Visual risk display for an entity.
- Shows score, risk level, risk factors, historical/timeline style UI when supplied.

#### `CompliancePanel.jsx`

Purpose:

- Compliance violation panel UI.

Backend note:

- Uses `complianceAPI.getComplianceViolations`, backed by `/api/v1/compliance/violations`.

### Dashboard

#### `ComplianceDashboard.jsx`

Purpose:

- Compliance dashboard view.

Backend note:

- Uses `complianceAPI.getComplianceStatus`, backed by `/api/v1/compliance/status`.

### Common Components

#### `Toast.jsx`

Purpose:

- Toast notifications.
- Provides `success`, `error`, and `loading` helper behavior through `useToast`.

#### `ThemeSwitcher.jsx`

Purpose:

- Theme selection UI and local preference handling.

#### `SettingsPanel.jsx`

Purpose:

- Settings drawer for UI/application preferences.
- Currently not exposed as a main top-header navigation item.

#### `Modal.jsx`

Purpose:

- Reusable modal shell.

#### `LoadingSpinner.jsx`

Purpose:

- Reusable spinner/loading display.

#### `HelpPanel.jsx`

Purpose:

- Help and keyboard shortcut UI.

#### `ErrorBoundary.jsx`

Purpose:

- React error boundary for recoverable UI errors when wrapped around components.

#### `Badge.jsx`

Purpose:

- Reusable badge display for statuses, risk levels, entity types, and variants.

## 14. Frontend Hooks

### `useGraph.js`

Purpose:

- Loads graph data through `graphService`.
- Stores nodes, edges, filters, selected node, selected edge, loading state, error state, performance metrics.
- Subscribes to `graphService` events.
- Subscribes to WebSocket entity/relationship events, though backend currently mainly emits collection events.
- Exposes graph actions:
  - `loadGraphData`
  - `updateFilters`
  - `applyFilters`
  - `clearFilters`
  - `selectNode`
  - `selectEdge`
  - `refreshGraph`
  - `exportGraph`
  - `clearGraph`

### `useWebSocket.js`

Purpose:

- Manages WebSocket connection state.
- Exposes connect/disconnect/reconnect.
- Exposes event listener registration.
- Tracks heartbeat, recent events, message count, and connection quality.

### `useSearch.js`

Purpose:

- Local search state and filtering helpers.
- Uses `graphService.searchEntities`, but the current backend does not implement `/entities/search`.

### `useKeyboardShortcuts.js`

Purpose:

- Register and handle keyboard shortcuts.

### `useDebounce.js`

Purpose:

- Debounces rapidly changing values.

### `useAnimation.js`

Purpose:

- Animation helper state and preference handling.

## 15. Frontend Services

### `api.js`

Purpose:

- Main REST API client.

Notes:

- Contains implemented and future-facing API methods.
- Current production UI paths mainly use graph, collection, health, target/entity/risk portions.

### `websocket.js`

Purpose:

- Singleton WebSocket client.
- Handles connection lifecycle, reconnect, heartbeat, message queue, and event fan-out.

### `graphService.js`

Purpose:

- Loads graph data.
- Normalizes graph data for UI.
- Calculates node sizes, colors, edge thicknesses, and connections.
- Maintains graph cache.
- Handles entity/relationship events.
- Applies filters.

Backend contract handled:

- Backend returns nodes as `entity-*` IDs.
- Backend returns edges normalized to matching `entity-*` IDs when possible.
- Frontend preserves backend risk levels and derives scores when needed.

### `graphAnalytics.js`

Purpose:

- Client-side graph analytics helpers.
- Computes graph metrics, communities, paths, anomalies, influence, and suggestions.

### `exportService.js`

Purpose:

- Client-side graph export formats.

Supported by service:

- JSON
- CSV
- Cypher/Neo4j-style export
- GML
- GraphML
- Share links

Note:

- Neo4j export format exists as a client-side export format only. Neo4j is not part of the active backend stack.

### `performanceService.js`

Purpose:

- Frontend performance measurement and tracking.

### `playlistService.js`

Purpose:

- Local IndexedDB playlists/bookmarks for investigation workflows.

### `snapshotService.js`

Purpose:

- Local IndexedDB graph snapshots and comparisons.

## 16. How Data Is Displayed Today

Current graph display flow:

1. `useGraph` calls `graphService.loadGraphData`.
2. `graphService` calls `graphAPI.getGraph`.
3. Backend `GET /api/v1/graph` reads entities and relationships from Firebase.
4. Backend maps entity records into graph nodes.
5. Backend maps relationship values into graph edges and resolves `source`/`target` to `entity-*` IDs where possible.
6. Frontend processes graph data:
   - calculates `riskScore`
   - preserves `riskLevel`
   - assigns colors
   - calculates connection counts
   - sets node size
7. `GraphCanvas` renders nodes and edges.
8. `RightSidebar` shows details for selected node or edge.

Empty data behavior:

- The graph no longer uses demo data.
- If Firebase has no entities, the graph shows an empty state prompting the user to start a collection.

Collection task display:

1. `App.jsx` calls `collectionAPI.getCollectionTasks`.
2. Completed/failed tasks appear in History.
3. Running tasks appear in Tasks.
4. WebSocket progress updates active tasks.
5. Completion/failure triggers graph refresh.

## 17. Current User Interaction Scenarios

### User Opens the App

Frontend actions:

- Loads React app.
- Initializes WebSocket service.
- Connects to backend WebSocket.
- Loads graph data.
- Checks backend health every 30 seconds.
- Loads collection tasks every 15 seconds.

Backend receives:

- `GET /api/v1/graph`
- `GET /health`
- `GET /api/v1/collection/tasks`
- WebSocket connection at `/ws/intelligence`

If Firebase is missing:

- Health succeeds.
- Graph and task list routes return `200` with empty degraded payloads.
- UI shows empty graph/task states until Firebase credentials are configured.

### User Starts Domain Research

User selects:

- target: `example.com`
- types: `domain`, `web`

Backend receives:

```json
{
  "target": "example.com",
  "types": ["domain", "web"],
  "collectors": ["domain", "web"],
  "includeDarkWeb": false,
  "includeMedia": false
}
```

Backend runs:

- Domain collector.
- Web collector.

Likely external sources:

- WHOIS
- DNS
- SSL Labs
- Wayback
- VirusTotal if key exists
- URLHaus
- target website static scrape
- target website dynamic scrape
- crt.sh
- BuiltWith if key exists, otherwise headers

### User Starts Full Profile

Frontend preset can select:

- `domain`
- `social`
- `email`
- `ip`

Backend receives the same target for all selected collectors.

Important:

- Current backend does not split or transform target per collector.
- Running `email` collector against a domain target may produce unavailable/invalid email-specific findings.
- Running `ip` collector against a non-IP target may fail IP-specific calls.

Recommended future improvement:

- Detect target type and either choose compatible collectors or transform discovered entities into follow-up collection tasks.

## 18. External Source and Credential Matrix

| Source | Collector | Credential |
| --- | --- | --- |
| WHOIS via `whois-json` | domain, ip | None |
| Node DNS | domain, email, ip | None |
| SSL Labs | domain | None |
| Wayback CDX | domain | None |
| VirusTotal domain/IP | domain, ip | `VIRUSTOTAL_API_KEY` |
| URLHaus | domain | None |
| Have I Been Pwned | email | `HIBP_API_KEY` |
| GitHub API | email, social | optional `GITHUB_TOKEN` |
| Reddit public profile | email, social | None |
| Twitter/X public widget endpoint | social | None |
| ip-api.com | ip | None |
| AbuseIPDB | ip | `ABUSEIPDB_API_KEY` |
| ipapi.co | ip | None |
| Shodan | ip | `SHODAN_API_KEY` |
| Axios + Cheerio static scrape | web | None |
| Puppeteer dynamic scrape | web | Browser runtime required |
| crt.sh | web | None |
| BuiltWith | web | `BUILTWITH_API_KEY` |
| Nominatim | geo | None |
| Overpass | geo | None |
| exifr | media | None |
| OCR.space | media | optional `OCR_SPACE_API_KEY` |
| Face++ | media | `FACEPP_API_KEY`, `FACEPP_API_SECRET` |
| Ahmia | darkweb | None |

## 19. Configuration

Backend environment:

```env
NODE_ENV=development
PORT=8000
HOST=0.0.0.0

FIREBASE_DATABASE_URL=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_SERVICE_ACCOUNT_JSON=

HIBP_API_KEY=
VIRUSTOTAL_API_KEY=
ABUSEIPDB_API_KEY=
GITHUB_TOKEN=
SHODAN_API_KEY=
BUILTWITH_API_KEY=
WAPPALYZER_API_KEY=
GOOGLE_VISION_API_KEY=
OCR_SPACE_API_KEY=
FACEPP_API_KEY=
FACEPP_API_SECRET=
LOG_LEVEL=info
```

Frontend environment:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000
```

## 20. Current Gaps and Risks

Backend gaps:

- No authentication.
- No authorization.
- No per-user rate limiting.
- No request-level collector limit.
- No central job queue.
- No full Firebase indexing strategy.
- No target-type compatibility enforcement.
- No backend routes for frontend relationship/analytics/anomaly client methods.
- Puppeteer dynamic scraping may fail in Docker without a browser.

Frontend gaps:

- Some components are future-facing and call routes not implemented by the current backend.
- Compliance dashboard and compliance panel are backed by `/api/v1/compliance`.
- Advanced search and export panels are more complete than backend support.
- E2E tests may need updates to match current selectors and API routes.

Data risks:

- Public source availability can vary.
- Public APIs can rate-limit.
- Large metadata objects can increase Firebase cost and UI payload size.
- Relationship endpoints are string-based and depend on value matching for graph attachment.

Operational risks:

- Heavy collection requests can trigger many external calls.
- Multiple simultaneous background tasks can consume CPU/network.
- Active progress state is memory-resident.

## 21. Recommended Next Improvements

1. Add authentication and rate limits.
2. Add a collection queue with concurrency limits.
3. Add target-type-aware collector selection.
4. Add collector timeout/retry configuration.
5. Add Firebase security rules and indexes.
6. Add backend routes or remove future-facing frontend API methods.
7. Add Puppeteer browser support in Docker or disable dynamic scrape in container mode.
8. Update Playwright tests for current UI.
9. Add detailed Firebase write/read integration tests with a test RTDB project.
10. Add collection result pagination for large investigations.

## 22. v2 Orchestration Foundation

ReconVault now includes the first implementation layer for the v2 prompt in `docs/prompt.md`.

New backend services:

- `toolRegistry.ts`: central capability registry for collectors, MCP tools, API integrations, browser capabilities, and internal tools.
- `mcpGateway.ts`: HTTP facade for configured MCP servers. It sends structured tool calls only and does not execute shell commands.
- `llmProviderService.ts`: provider abstraction for OpenAI, Anthropic, Gemini, OpenRouter, and Ollama.
- `contextBuilderService.ts`: bounded planning context builder so raw database contents are not sent to the planner.
- `planningService.ts`: creates and validates registry-backed plans.
- `investigationService.ts`: persists investigations, plans, evidence, execution records, and memory in Firebase.
- `executionController.ts`: validates plans, runs built-in collectors, calls configured MCP servers, captures evidence, and skips approval-required tools unless approved.
- `correlationService.ts`: creates simple relationship candidates from existing findings.

New backend routes:

- `/api/v1/tools`
- `/api/v1/mcp`
- `/api/v1/ai`
- `/api/v1/investigations`
- `/api/v1/execute`
- `/api/v1/evidence`

New Firebase paths:

- `/investigations`
- `/investigationPlans`
- `/evidence`
- `/toolExecutions`

Frontend API helpers were added in `frontend/src/services/api.js` for:

- `toolsAPI`
- `mcpAPI`
- `aiPlanningAPI`
- `investigationAPI`
- `executionAPI`
- `evidenceAPI`
- `workflowAPI`
- `caseAPI`
- `timelineAPI`
- `iocAPI`
- `auditAPI`
- `queueAPI`
- `rbacAPI`

Reference archives reviewed:

- `MCP-Kali-Server-main.zip`: used for MCP wrapping, tool exposure, capability, and structured output patterns.
- `Zen-Ai-Pentest-main.zip`: used for state-machine, dependency-chain, workflow memory, and orchestration concepts.

Important safety boundary:

- The planner only returns registry tool names and structured inputs.
- Raw command fields are rejected by plan validation.
- MCP tools require configured MCP HTTP servers.
- Tools marked `requiresApproval` are skipped unless explicitly included in `approved_tools`.

See [V2_ORCHESTRATION.md](V2_ORCHESTRATION.md) for the full implementation notes.

## 23. v2 Implementation Slice 2

Additional backend services now implemented:

- `apiIntegrationService.ts`: executes WHOIS, HIBP, VirusTotal, Shodan, AbuseIPDB, and SecurityTrails through controlled adapters. Missing credentials produce `unavailable` evidence rather than fake data.
- `knowledgeGraphService.ts`: central graph abstraction used by graph routes. This isolates Firebase graph shaping and keeps future Neo4j migration simpler.
- `analystService.ts`: AI Analyst role for evidence-backed reports, risk narratives, next actions, and deterministic fallback analysis.
- `workflowService.ts`: iterative workflow runner for create-plan-execute-analyze loops.

Additional routes now implemented:

- `POST /api/v1/ai/analyze`
- `POST /api/v1/investigations/:id/analyze`
- `POST /api/v1/workflows/investigation`

Frontend additions:

- `frontend/src/components/Dashboard/InvestigationDashboard.jsx`
- Top-header `Investigation` view switch.
- API client methods for analysis and workflow execution.
- `frontend/src/components/Dashboard/MCPPlayground.jsx`
- Header MCP chip for server/source status and playground access.

Current investigation workspace capabilities:

- Generate a plan without Firebase.
- Create Firebase-backed investigations.
- Run dry-run workflows.
- Run approved workflows with approval-gated tool names.
- Inspect generated plan steps.
- Inspect execution history.
- Inspect evidence records.
- Generate analyst reports.
- Inspect MCP source and tool inventory from the MCP Playground.

Remaining important gaps:

- Live workflow persistence needs Firebase credentials.
- Live intelligence API results need provider API keys.
- MCP execution needs configured MCP servers.
- MCP Playground connected/not-connected status is based on configured `baseUrl` presence, not a deep remote server health check.
- Multi-iteration adaptation is conservative without a configured LLM provider.
- Analyst report export and full report history UI are not implemented yet.

## 24. Phase 3 Intelligence Operations Layer

Phase 3 implements the operations layer from `docs/prompt.md`.

New services:

- `caseService.ts`: case management under `/cases`, with investigation linking.
- `timelineService.ts`: timeline records under `/timeline`.
- `iocService.ts`: IOC database under `/iocs`, including create, update, search, merge, evidence links, investigation links, and automatic extraction from evidence.
- `reportExportService.ts`: investigation reports in JSON, Markdown, HTML, and PDF-ready HTML.
- `auditService.ts`: audit logs under `/auditLogs`.
- `rbacService.ts`: default roles and middleware with development fallback.
- `queueService.ts`: Firebase-backed queue jobs under `/queueJobs`.

New routes:

- `/api/v1/cases`
- `/api/v1/timeline`
- `/api/v1/iocs`
- `/api/v1/reports`
- `/api/v1/audit`
- `/api/v1/queue`
- `/api/v1/rbac`

New frontend:

- `frontend/src/components/Dashboard/IntelligenceOpsDashboard.jsx`
- Top-header `Intelligence Ops` view.

Operations workspace sections:

- Cases
- Timeline
- IOC Database
- Reports
- Audit Logs
- Queue status

Automatic hooks:

- Investigation creation records audit and timeline entries.
- Plan generation records audit and timeline entries.
- Execution start and completion record audit and timeline entries.
- Execution step records create timeline entries.
- Evidence creation records audit and timeline entries, then extracts IOC candidates.
- Analyst reports create timeline entries.
- Workflow start and completion record audit and timeline entries.
- Report export records audit entries.

Correlation expansion:

- DOMAIN -> IP
- DOMAIN -> ASN
- EMAIL -> DOMAIN
- SUBDOMAIN -> DOMAIN
- IP -> ORGANIZATION
- DOMAIN -> ORGANIZATION
- WEBSITE -> TECHNOLOGY
- IOC -> IOC by shared evidence

Phase 3 limits:

- Firebase credentials are required for live persistence.
- Queue jobs are persisted, but no background worker is implemented yet.
- RBAC is a foundation and uses development fallback until authentication is configured.
- IOC extraction is pattern-based and should be expanded with tests.

See [PHASE3_ARCHITECTURE.md](PHASE3_ARCHITECTURE.md).
