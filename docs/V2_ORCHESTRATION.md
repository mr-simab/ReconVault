# ReconVault v2 Orchestration Layer

Date: 2026-06-05

This document describes the first implemented slice of the ReconVault v2 architecture from `docs/prompt.md`.

The goal of this slice is not to replace the current collector platform. It adds a safe orchestration foundation above the existing Node.js, Express, Firebase, collector, risk, graph, and WebSocket stack.

## Reference Projects Reviewed

Local reference archives inspected:

- `C:\Users\amran\Downloads\MCP-Kali-Server-main.zip`
- `C:\Users\amran\Downloads\Zen-Ai-Pentest-main.zip`

Patterns reused from MCP-Kali-Server:

- Tools are exposed as named capabilities instead of free-form execution.
- Tool calls accept structured JSON inputs and return structured JSON outputs.
- External execution is separated behind an API boundary.
- Tool availability can be reported through capability endpoints.

Patterns intentionally not copied:

- Raw command execution endpoints are not exposed to ReconVault's AI planner.
- The AI cannot generate or execute shell commands.
- Offensive/pentest-specific workflow defaults were not copied into ReconVault.

Patterns reused from Zen-AI-Pentest:

- Workflow state, dependency chains, and iterative planning concepts.
- Separation between planning, execution, evidence, and memory.
- State-aware orchestration so future planning can use prior findings.

Patterns intentionally not copied:

- Multi-agent penetration testing architecture.
- Exploitation workflows.
- Pentest-specific agent personas.

## Implemented Backend Modules

New services:

- `backend/src/services/toolRegistry.ts`
  - Central capability registry.
  - Lists existing collectors first.
  - Lists MCP, API, browser, and internal tools as metadata.

- `backend/src/services/mcpGateway.ts`
  - Internal facade for configured MCP HTTP servers.
  - Sends `{ tool, input, metadata }` to configured MCP endpoints.
  - Does not execute shell commands.

- `backend/src/services/llmProviderService.ts`
  - Provider abstraction for OpenAI, Anthropic, Gemini, OpenRouter, and Ollama.
  - Uses provider APIs directly through HTTP.
  - Returns parsed JSON plans when a provider is configured.

- `backend/src/services/contextBuilderService.ts`
  - Builds bounded planning context.
  - Provides available tools, current findings, recent evidence, investigation state, and plan history.
  - Avoids sending raw database contents to the planner.

- `backend/src/services/planningService.ts`
  - Creates registry-backed investigation plans.
  - Calls the configured LLM provider when available.
  - Falls back to a deterministic local planner when no provider is configured.
  - Rejects plan steps that include raw command fields or unknown tools.

- `backend/src/services/investigationService.ts`
  - Persists investigations, plans, evidence, execution records, and memory in Firebase RTDB.

- `backend/src/services/executionController.ts`
  - Validates plans before execution.
  - Executes built-in collectors directly.
  - Routes MCP/browser tools through the MCP gateway only.
  - Skips approval-required tools unless they are explicitly approved.
  - Captures evidence and execution records.

- `backend/src/services/correlationService.ts`
  - Creates simple graph relationships from findings.
  - Current rules include email-to-domain and subdomain-to-parent-domain relationships.

- `backend/src/services/apiIntegrationService.ts`
  - Executes WHOIS, HIBP, VirusTotal, Shodan, AbuseIPDB, and SecurityTrails through controlled adapters.
  - Emits `unavailable` evidence when API keys or target types are missing.

- `backend/src/services/knowledgeGraphService.ts`
  - Provides a database-agnostic graph abstraction over Firebase entities and relationships.

- `backend/src/services/analystService.ts`
  - Implements the AI Analyst role with provider-backed JSON reports and deterministic fallback analysis.

- `backend/src/services/workflowService.ts`
  - Runs the iterative create-plan-execute-analyze workflow.
  - Removes duplicate non-internal tools between iterations.

## New Firebase Paths

The data store now supports these additional top-level RTDB paths:

- `/investigations`
- `/investigationPlans`
- `/evidence`
- `/toolExecutions`

Existing paths remain unchanged:

- `/targets`
- `/entities`
- `/relationships`
- `/collections`
- `/_counters`

## Tool Registry Categories

Collectors:

- `domain`
- `email`
- `ip`
- `web`
- `social`
- `geo`
- `media`
- `darkweb`

Recon MCP tools:

- `amass`
- `subfinder`
- `httpx`
- `katana`
- `waymore`
- `gau`

Network MCP tools:

- `nmap`
- `naabu`
- `dnsx`
- `masscan`

Web MCP tools:

- `nuclei`
- `whatweb`
- `wafw00f`
- `nikto`

OSINT MCP tools:

- `sherlock`
- `holehe`
- `theharvester`
- `phoneinfoga`
- `exiftool`

Intelligence API capabilities:

- `virustotal`
- `shodan`
- `abuseipdb`
- `whois`
- `securitytrails`
- `hibp`

Browser capabilities:

- `browser_render`
- `browser_screenshot`

Internal tools:

- `correlate_findings`
- `risk_assessment`

## New API Endpoints

Tools:

- `GET /api/v1/tools`
- `GET /api/v1/tools/context`
- `GET /api/v1/tools/:name`

MCP:

- `GET /api/v1/mcp/servers`
- `GET /api/v1/mcp/capabilities`

AI planning:

- `GET /api/v1/ai/providers`
- `POST /api/v1/ai/plan`
- `POST /api/v1/ai/analyze`

Investigations:

- `GET /api/v1/investigations`
- `POST /api/v1/investigations`
- `GET /api/v1/investigations/:id`
- `POST /api/v1/investigations/:id/plan`
- `GET /api/v1/investigations/:id/plans`
- `POST /api/v1/investigations/:id/execute`
- `POST /api/v1/investigations/:id/analyze`
- `GET /api/v1/investigations/:id/evidence`
- `GET /api/v1/investigations/:id/executions`
- `POST /api/v1/investigations/:id/memory`

Execution:

- `POST /api/v1/execute/validate`
- `POST /api/v1/execute`

Evidence:

- `GET /api/v1/evidence`
- `GET /api/v1/evidence/:id`

Workflows:

- `POST /api/v1/workflows/investigation`

## Planning Flow

1. User creates an investigation or calls `/api/v1/ai/plan`.
2. Context builder collects bounded context:
   - available collectors
   - MCP tools
   - API integrations
   - browser capabilities
   - recent findings
   - investigation memory
3. Planner asks the configured provider for JSON, or uses deterministic fallback.
4. Plan is validated against the registry.
5. Unknown tools and raw command fields are rejected.
6. The plan can be saved to Firebase investigation memory.

Example request:

```json
{
  "target": "example.com",
  "user_request": "Perform deep domain reconnaissance for example.com"
}
```

Example output shape:

```json
{
  "plan": {
    "planId": "...",
    "target": "example.com",
    "plannerMode": "deterministic_fallback",
    "steps": [
      {
        "id": "step-1",
        "tool": "domain",
        "purpose": "Collect domain collector signals for example.com.",
        "dependsOn": []
      }
    ]
  }
}
```

## Execution Safety

The AI planner never executes tools.

The execution controller:

- validates every step against the registry
- rejects raw command fields
- runs built-in collectors directly
- calls MCP tools only through configured HTTP MCP servers
- skips approval-required tools unless included in `approved_tools`
- stores raw output as evidence
- stores summary execution records

Example execution request:

```json
{
  "plan": {
    "planId": "...",
    "target": "example.com",
    "targetType": "DOMAIN",
    "userRequest": "Perform reconnaissance",
    "steps": []
  },
  "dry_run": true,
  "approved_tools": ["subfinder", "httpx"]
}
```

## Configuration

Optional AI provider variables:

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4.1-mini
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434
```

Optional MCP server mapping:

```env
MCP_GATEWAY_SERVERS_JSON={"Recon MCP":{"baseUrl":"http://127.0.0.1:5000","endpointTemplate":"/mcp/tools/recon/{tool}"}}
```

If no LLM provider is configured, planning still works through the deterministic fallback.

If no MCP server is configured, MCP steps return `unavailable` or are skipped when approval is missing.

## Frontend Investigation Workspace

The React frontend now includes `frontend/src/components/Dashboard/InvestigationDashboard.jsx`.

It supports:

- planning without Firebase through `/api/v1/ai/plan`
- creating Firebase-backed investigations
- running dry-run or approved workflows
- selecting approval-gated tools
- viewing plan steps
- viewing investigation history
- viewing execution records
- viewing evidence records
- generating analyst reports

The view is available from the top header through `Investigation`.

## Frontend MCP Playground

The React frontend now includes `frontend/src/components/Dashboard/MCPPlayground.jsx`.

It supports:

- loading MCP source groups from `/api/v1/mcp/servers`
- showing total MCP source count
- showing connected and not-connected counts
- listing full MCP source names
- showing configured endpoint presence
- listing each source's registered tools, input/output counts, and approval requirement

The header MCP chip opens this workspace. A source is displayed as connected when the registry source has a configured `baseUrl` through `MCP_GATEWAY_SERVERS_JSON`.

## Current Limitations

- MCP tools require external MCP servers to be configured through `MCP_GATEWAY_SERVERS_JSON`.
- Direct API integration execution exists, but live results require API keys and network access.
- Correlation rules are intentionally narrow and should be expanded incrementally.
- The workflow loop is implemented, but adaptive planning is still conservative when no LLM provider is configured.

## Phase 3 Extension

ReconVault now includes a Phase 3 intelligence operations layer on top of this orchestration system.

Added:

- Case management
- Timeline system
- IOC database with evidence extraction
- Report export
- Audit logging
- RBAC foundation
- Firebase-backed queue foundation
- Intelligence Operations frontend workspace
- Expanded graph correlation rules

See [PHASE3_ARCHITECTURE.md](PHASE3_ARCHITECTURE.md).

## Next Recommended Work

1. Expand workflow timeline and planner visualization.
2. Configure a real Recon MCP server and test approved MCP execution.
3. Add richer analyst report export and report history.
4. Expand correlation rules for IP, ASN, organization, website, technology, and location relationships.
5. Add active remote MCP health probes if the playground needs more than configured-endpoint status.
