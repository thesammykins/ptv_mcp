# PTV MCP – Architecture Overview

Status: Draft

This document describes the internal structure and data flow for the MCP server.

## Runtime & Standards
- Runtime: Bun (latest), TypeScript (strict), Prettier
- No secrets in repo/docs. Env vars supplied via MCP config: PTV_DEV_ID, PTV_API_KEY
- Conform to latest Model Context Protocol server SDK (TypeScript)

## Modules
- src/config.ts – Environment configuration and validation
- src/mcp/server.ts – MCP server initialization, tool registration, and request routing
- src/ptv/signing.ts – HMAC-SHA1 signature generation for PTV API authentication
- src/ptv/http.ts – HTTP client with retries, timeouts, and error handling
- src/ptv/client.ts – Typed methods for PTV API endpoints (search, departures, routes, directions, disruptions, runs)
- src/ptv/types.ts – TypeScript interfaces for PTV API responses
- src/ptv/cache.ts – In-memory TTL cache for stops, routes, and directions (~12 hour TTL)
- src/features/next_train/tool.ts – Orchestrates stop resolution, route finding, and departure selection
- src/features/line_timetable/tool.ts – Fetches and formats timetable data for stop+route combinations
- src/features/how_far/tool.ts – Calculates distance/ETA using vehicle positions or schedule estimates
- src/utils/melbourne-time.ts – Melbourne timezone utilities with DST handling and user input parsing

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

## Melbourne Timezone Handling
**Core Utilities** (`src/utils/melbourne-time.ts`):
- Automatic DST detection (AEST/AEDT) using `Australia/Melbourne` timezone
- User input parsing for various time formats (12/24 hour, ISO 8601)
- Melbourne time display formatting for human-readable responses
- UTC conversion for PTV API consumption (all API calls use UTC)
- Time range calculations for departure windows

**Key Functions**:
- `parseUserTimeToMelbourneUTC()` - Converts user input to API-compatible UTC
- `formatUTCForMelbourne()` - Displays API responses in Melbourne local time
- `getMelbourneTimeRange()` - Generates time windows for timetable queries
- `getTimezoneDebugInfo()` - Provides debugging context for time-related issues

## Errors & Logging
**Structured Error Format**:
```typescript
interface MCPError {
  code: string;           // Error type (STOP_NOT_FOUND, NO_DEPARTURES, etc.)
  message: string;        // Human-readable description
  status?: number;        // HTTP status code if applicable
  path?: string;          // API endpoint that failed
  cause?: unknown;        // Original error for debugging
  retryAfter?: number;    // Seconds to wait before retry
  correlationId?: string; // Request tracking ID
}
```

**Logging Standards**:
- Use structured logging with correlation IDs
- Redact sensitive data (API keys, signatures) from logs
- Include timing information for performance monitoring
- Log retries, rate limiting, and cache hit/miss events

## Testing
**Test Structure** (36 tests across 6 files):
- Unit tests: `/tests/` directory with descriptive file names
- Test files include top-level comments describing test goals
- Never modify production code to make tests pass
- Use dependency injection for external dependencies (HTTP client, cache)

**Test Categories**:
- `signing.test.ts` - HMAC-SHA1 signing against official PTV documentation examples
- `http.test.ts` - HTTP client URL building, retries, and timeout handling
- `cache.test.ts` - TTL cache behavior and expiration
- `next_train.test.ts` - Route orchestration with mocked API responses
- `line_timetable.test.ts` - Timetable fetching and filtering logic
- `how_far.test.ts` - Distance calculations and vehicle position tracking

**Testing Patterns**:
- Mock PTV API responses for predictable test scenarios
- Validate error handling for all failure modes (stop not found, no routes, etc.)
- Test timezone handling and Melbourne time conversions
- Verify tool schemas match actual implementation

## Notes
- Vehicle positions endpoint must be verified in docs; how_far falls back to schedule-based estimates if no live data.

