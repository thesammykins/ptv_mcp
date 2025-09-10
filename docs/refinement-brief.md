# Refinement Brief for Planning Agent

Status: Ready for planning

## Objective
Build a Bun + TypeScript MCP server that exposes three high-level tools backed by the PTV Timetable API v3, while the backend handles stop/route/timetable discovery, signature generation, and response collation. The three MVP tools:
- next_train
- line_timetable
- how_far

The agent should be able to ask: “When is the next train from Flinders Street to South Morang?” and get a single structured answer. Backend will resolve stops, routes, directions, departures, realtime info, and disruptions.

## Constraints & Preferences
- Runtime: Bun (latest). Use Prettier and 2025 TS standards (strict mode).
- Auth: Use env vars via MCP config: PTV_DEV_ID and PTV_API_KEY. No secrets in repo/docs.
- Docs source of truth: Use context7 to fetch latest official PTV Timetable API v3 docs. Do not rely on memory.
- Caching: Cache stops and routes (TTL ~12h). Match IDs to names for quick lookup.
- Logging: Return logs in MCP server log; conform to latest Model Context Protocol server SDK for TS.
- Tests: Place all tests in /tests with top comment describing test goals. Do not modify production code to make tests pass.
- Repo docs: README.md in root and docs/ (plan.md, apireference.md, architecture.md). No secrets in docs; placeholders only.

## Deliverables
1) Documentation
   - docs/apireference.md:
     - Verified base URL and endpoints used (search, routes, directions, departures with expand, disruptions, vehicle positions/run pattern).
     - Exact request signing algorithm with step-by-step guide and a worked example from PTV docs (values redacted; mirror in tests).
     - Notes on route_type codes (train, etc.), expand options, rate limiting/retries.
   - docs/architecture.md:
     - Modules, data flows, caching, retries/backoff, error model, logging, and tool orchestration diagrams or steps.
   - README.md: Setup (Bun), env vars, how to run MCP server, how to call each tool, troubleshooting.

2) Code (Bun + TS strict)
   - src/config.ts: env loading/validation.
   - src/ptv/signing.ts: signature helpers. Provide signPath(pathWithQuery, apiKey) and buildSignedPath(path, params, devid, apiKey).
   - src/ptv/http.ts: signed fetch wrapper with timeout (default ~8s), retries with exponential backoff + jitter on 429/5xx, structured error surface.
   - src/ptv/types.ts: minimal TS interfaces for fields used.
   - src/ptv/client.ts: typed methods for search, routes/directions, departures, stopping patterns/run patterns, disruptions, vehicle positions (or doc-verified equivalent).
   - src/ptv/cache.ts: in-memory TTL cache for stops, routes, directions; helpers for memoization.
   - src/features/next_train/tool.ts: see Orchestration below.
   - src/features/line_timetable/tool.ts: see Orchestration below.
   - src/features/how_far/tool.ts: see Orchestration below.
   - src/mcp/server.ts: register tools with JSON schemas; structured logging and error normalization.

3) Tests (/tests)
   - signing.test.ts: uses PTV doc’s canonical signing example to verify algorithm implementation; edge cases (query ordering, encoding, signature casing).
   - http.test.ts: URL building correctness (devid+signature included), retry behavior on 429/5xx, timeout handling via AbortController.
   - features/*.test.ts: mocked orchestration using injected fetch; verify final JSON shapes for each tool.

4) Examples (/examples, optional)
   - Minimal scripts to demonstrate client usage and tool calls. Read secrets from env.

## Orchestration Details

### next-train Tool
**Input Schema:**
```typescript
{
  origin: string;      // Station name (e.g., "Flinders Street")
  destination: string; // Station name (e.g., "South Morang")
  time?: string;       // Optional departure time (ISO 8601 or Melbourne local time)
}
```

**Process:**
1) Search and resolve origin & destination stops filtered to trains
2) Find candidate routes common to both stops via route intersection
3) For each route, get directions and fetch departures with full expansion
4) Validate runs service the destination stop (simplified validation since routes are pre-filtered)
5) Select earliest departure within 30-minute window
6) Return structured response with route/direction/departure/timing info

### line-timetable Tool
**Input Schema:**
```typescript
{
  stop: string;        // Stop name (e.g., "Southern Cross")
  route: string;       // Route name (e.g., "Belgrave")
  direction?: string;  // Optional direction filter ("inbound"/"outbound" or direction name)
  duration?: number;   // Minutes to show (default 60, max 180)
}
```

**Process:**
1) Resolve stop and find matching route at that stop
2) Get route directions, filter by direction parameter if provided
3) Fetch departures for each direction within time window
4) Sort departures chronologically and return with platform/disruption info

### how-far Tool
**Input Schema:**
```typescript
{
  stop: string;        // Stop name (e.g., "Melbourne Central")
  route: string;       // Route name (e.g., "Craigieburn")
  direction?: string;  // Optional direction filter
}
```

**Process:**
1) Resolve stop coordinates and route information
2) Get active runs with vehicle position data via PTV runs endpoint
3) Calculate Haversine distance and ETA for vehicles with GPS coordinates
4) Select closest approaching vehicle with real-time data
5) Fallback to schedule-based estimates if no vehicle positions available
6) Return distance, ETA, and vehicle details with accuracy indicator

## Signing (to be verified via context7)
- Confirm:
  - Hash algorithm (HMAC-SHA1 historically, but must verify current).
  - Canonical string: includes path and query with devid; exact ordering and encoding required.
  - Signature format (hex/base64) and case (upper/lower).
  - Provide doc example and mirror in tests.

## Caching & Rate Limiting
- Cache stops/routes/directions for ~12h; allow manual busting.
- Retries with exponential backoff + jitter; respect Retry-After for 429.

## Error Handling & Logging
- Structured errors: { code, message, status?, path?, cause?, retryAfter?, correlationId? }.
- Redact API key and signature in logs; conform to latest MCP logging expectations.

## Acceptance Criteria
- With valid credentials, the three tools work for: Flinders Street → South Morang (train).
- Signing verified via doc example; responses 200.
- Disruptions included when present.
- how_far leverages live positions when available; reasonable fallback otherwise.
- Tests pass; no secrets in repo; docs align with verified PTV docs.

## Context Gathered
- Repo: /Users/samanthamyers/Development/ptv_mcp (Git initialized, branch main, no remote). No WARP.md/CLAUDE.md/AGENT.md present.
- Files created: README.md, docs/plan.md, docs/apireference.md (draft, to verify), docs/architecture.md.
- Env: macOS 26.0 (arm64), node v24.6.0 present; Bun not installed yet; gh present; npm/pnpm/yarn available.

## Next Action for Planning Agent
- Use context7 to retrieve latest PTV Timetable API v3 documentation (including the signing section). Populate docs/apireference.md with verified details and an official worked example.
- Produce a step-by-step plan adhering to Sequential Thinking rules, then proceed with repo scaffolding and implementation per this brief.

