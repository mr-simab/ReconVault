# Blueprint

## System Architecture

```mermaid
flowchart LR
    U[User/Analyst] --> FE[Frontend<br/>React + Vite]
    FE -->|REST /api/v1| BE[Backend<br/>Node.js + Express]
    FE -->|WebSocket /ws/intelligence| BE
    FE --> MPG[MCP Playground<br/>Source status + tool inventory]
    MPG -->|GET /api/v1/mcp/servers| BE
    BE --> DB[(Firebase Realtime Database)]
    BE --> EXT[External OSINT Sources/APIs]
    BE --> MCP[MCP Gateway<br/>Configured MCP Servers]
    BE --> LLM[LLM Provider Layer<br/>OpenAI/Anthropic/Gemini/OpenRouter/Ollama]
    NGINX[Nginx Optional] --> FE
    NGINX --> BE
```

## Backend Internal Modules

```mermaid
flowchart TB
    IDX[index.ts]
    RT[routes/*]
    SV[services/*]
    COL[collectors/*]
    REG[toolRegistry]
    PLAN[planningService]
    EXEC[executionController]
    MCP[mcpGateway]
    CFG[config/env + logger]
    DS[dataStore]
    DB[(Firebase RTDB)]
    WS[websocketHub]

    IDX --> CFG
    IDX --> RT
    IDX --> WS
    RT --> SV
    RT --> DS
    SV --> REG
    SV --> PLAN
    SV --> EXEC
    EXEC --> MCP
    SV --> COL
    SV --> DS
    DS --> DB
    SV --> WS
```

## Frontend Workspace Layout

```mermaid
flowchart LR
    H[Top Header<br/>Backend + DB + MCP status] --> S[Search]
    H --> G[Graph]
    H --> I[Investigation]
    H --> M[MCP Playground]
    H --> O[Intelligence Ops]
    H --> C[Compliance]
    L[Recon Controls<br/>Search + Filters + History + Tasks] --> G
    G --> R[Graph Inspector]
```

## v2 AI-Orchestrated Investigation Pipeline

```mermaid
sequenceDiagram
    participant F as Frontend/API Client
    participant B as Backend
    participant R as Tool Registry
    participant A as LLM Provider/Fallback Planner
    participant E as Execution Controller
    participant API as API Integrations
    participant M as MCP Gateway
    participant AN as AI Analyst
    participant C as Collectors/Internal Services
    participant D as Firebase RTDB

    F->>B: POST /ai/plan or /investigations/:id/plan
    B->>R: load available capabilities
    B->>A: request JSON plan with bounded context
    A-->>B: registry-backed plan
    B->>D: persist plan when investigation exists
    F->>B: POST /execute or /investigations/:id/execute
    B->>E: validate plan steps
    E->>C: run built-in collectors/internal tools
    E->>API: call configured intelligence APIs
    E->>M: call configured MCP server for approved MCP tools
    E->>D: persist evidence + execution records
    B->>AN: POST /ai/analyze or workflow analysis step
    AN->>D: persist analysis report evidence
```

The planner never executes commands. It returns tool names and structured inputs only. The execution controller rejects unknown tools and raw command fields.

## Collection Pipeline

```mermaid
sequenceDiagram
    participant F as Frontend
    participant B as Backend
    participant C as Collectors
    participant D as Firebase RTDB
    participant W as WebSocket

    F->>B: POST /collection/start
    B->>D: create Collection(task RUNNING)
    B->>C: run collectors
    C-->>B: findings + relationships + unavailable source reasons
    B->>D: persist entities + relationships
    B-->>W: collection_progress
    B->>D: mark COMPLETED/FAILED
    B-->>W: collection_completed/collection_failed
```

## Resilience Rules

```mermaid
flowchart TD
    A[Request arrives] --> B{Needs database?}
    B -- No --> C[Serve normally]
    B -- Yes --> D{Firebase reachable?}
    D -- Yes --> E[Serve data]
    D -- No --> F[Return 503]
    G[Collector call] --> H{Live source works?}
    H -- Yes --> I[source: real]
    H -- No --> J[source: unavailable + reason]
```
