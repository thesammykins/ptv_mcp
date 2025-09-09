# PTV MCP – Architecture Overview

Status: Draft

This document describes the internal structure and data flow for the MCP server.

## Runtime & Standards
- Runtime: Bun (latest), TypeScript (strict), Prettier
- No secrets in repo/docs. Env vars supplied via MCP config: PTV_DEV_ID, PTV_API_KEY
- Conform to latest Model Context Protocol server SDK (TypeScript)

## Modules
- src/config.ts – Env loading + validation
- src/ptv/signing.ts – Request signing helpers
- src/ptv/http.ts – Signed fetch wrapper with retries and timeouts
- src/ptv/client.ts – Typed PTV methods (search, departures, directions, disruptions, vehicle positions)
- src/ptv/types.ts – Narrow TS interfaces for fields we use
- src/ptv/cache.ts – In-memory TTL cache (stops/routes/directions)
- src/features/next_train/tool.ts – Orchestrates stop/route resolution and earliest valid departure including disruptions
- src/features/line_timetable/tool.ts – Next 60 min timetable for a stop+route
- src/features/how_far/tool.ts – Distance/ETA of nearest inbound train to a stop
- src/mcp/server.ts – Registers tools with JSON schemas, logging, and error normalization

## Data Flow (example: next_train)
1) Resolve origin/destination stops via search (filtered to trains)
2) Compute candidate routes shared by both stops and direction toward destination
3) Fetch departures from origin (expand run/route/direction/stop)
4) Validate the run services the destination (stopping pattern or expanded data)
5) Select earliest realtime departure; attach platform and disruptions

## Caching
- Stops and routes cached for ~12 hours (configurable TTL)
- Directions cached per route
- Memoize per-request repeated lookups

## Errors & Logging
- All tool responses return structured errors when applicable
- Logs redact secrets; include status, path, and retry info for HTTP failures

## Testing
- Unit: signing (verified with official example), HTTP wrapper (URL build, retries, timeouts)
- Mocked orchestration tests for features using injected fetch

## Notes
- Vehicle positions endpoint must be verified in docs; how_far falls back to schedule-based estimates if no live data.

