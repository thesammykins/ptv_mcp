# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that exposes high-level tools backed by the Public Transport Victoria (PTV) Timetable API v3. The server provides three main tools:

- `next_train`: Find the next train between origin and destination stops
- `line_timetable`: Get timetable for a specific stop and route
- `how_far`: Estimate distance and ETA for the nearest approaching train

**Status**: Currently in planning/documentation phase. The project uses Bun + TypeScript with strict mode and Prettier formatting.

Key documentation files:
- `docs/plan.md` - Overall project plan and objectives
- `docs/architecture.md` - System architecture and module structure  
- `docs/apireference.md` - PTV API v3 integration details (to be verified via context7)
- `docs/refinement-brief.md` - Detailed requirements and orchestration logic

## Development Commands

### Setup and Installation
```bash
# Install Bun runtime (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install
```

### Development Workflow  
```bash
# Start development server with hot reload
bun run dev

# Build TypeScript and create production bundle
bun run build

# Run all tests
bun test

# Run tests with coverage
bun test --coverage

# Run single test file
bun test tests/signing.test.ts

# Format code with Prettier
bun run format

# Lint and type check
bun run lint
```

### MCP Server Operations
```bash
# Start MCP server in development mode
bun run mcp:dev

# Build and start production MCP server
bun run mcp:start

# Validate MCP tool schemas
bun run mcp:validate
```

## Architecture Overview

### Core Structure
The project follows a modular architecture with clear separation of concerns:

**MCP Layer** (`src/mcp/`)
- `server.ts` - MCP server initialization, tool registration, and request routing
- Tool handlers that orchestrate PTV API calls and format responses

**PTV API Client** (`src/ptv/`)
- `signing.ts` - HMAC-SHA1 signature generation for PTV API authentication
- `http.ts` - HTTP client with retries, timeouts, and error handling
- `client.ts` - Typed methods for PTV API endpoints (search, departures, routes, etc.)
- `types.ts` - TypeScript interfaces for PTV API responses
- `cache.ts` - In-memory TTL cache for stops, routes, and directions (~12 hour TTL)

**Feature Tools** (`src/features/`)
- `next_train/tool.ts` - Orchestrates stop resolution, route finding, and departure selection
- `line_timetable/tool.ts` - Fetches and formats timetable data for stop+route combinations
- `how_far/tool.ts` - Calculates distance/ETA using vehicle positions or schedule estimates

### Data Flow Pattern
1. **Stop Resolution**: Convert stop names to PTV stop IDs via search API
2. **Route Discovery**: Find routes connecting origin and destination stops  
3. **Direction Mapping**: Determine correct direction for the journey
4. **Departure Fetching**: Get departures with expanded run/route/direction/stop data
5. **Validation**: Verify the run services the destination stop via stopping patterns
6. **Enhancement**: Attach real-time estimates, platform info, and disruption data

### Caching Strategy
- **Stops and Routes**: 12-hour TTL for static infrastructure data
- **Directions**: Cached per route to avoid repeated lookups
- **Real-time Data**: No caching for departures, disruptions, or vehicle positions
- **Request Memoization**: Avoid duplicate API calls within single request processing

## Development Patterns

### TypeScript Conventions
- Strict mode enabled with comprehensive type checking
- Prefer interfaces over types for object shapes
- Use discriminated unions for API response variants
- Explicit return types on public methods

### Error Handling
```typescript
// Structured error format
interface MCPError {
  code: string;
  message: string;
  status?: number;
  path?: string;
  cause?: unknown;
  retryAfter?: number;
  correlationId?: string;
}

// API client error wrapping
try {
  const response = await ptvClient.searchStops(query);
  return response;
} catch (error) {
  throw new MCPError({
    code: 'PTV_API_ERROR',
    message: 'Failed to search stops',
    cause: error,
    path: '/v3/search/' + query
  });
}
```

### MCP Tool Patterns
- Tool names use kebab-case: `next-train`, `line-timetable`, `how-far`
- Input validation using JSON schemas at MCP server level
- Consistent response format with `data` and optional `metadata` fields
- Error responses include actionable guidance for users

### Logging Standards
- Use structured logging with correlation IDs
- Redact sensitive data (API keys, signatures) from logs
- Include timing information for performance monitoring
- Log retries, rate limiting, and cache hit/miss events

## Environment Configuration

### Required Environment Variables
```bash
# PTV API credentials (obtain from PTV developer portal)
PTV_DEV_ID=your_developer_id
PTV_API_KEY=your_api_key

# Optional configuration
PTV_BASE_URL=https://timetableapi.ptv.vic.gov.au
HTTP_TIMEOUT_MS=8000
HTTP_MAX_RETRIES=3
CACHE_TTL_HOURS=12
```

### MCP Server Configuration
Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ptv": {
      "command": "bun",
      "args": ["run", "src/mcp/server.ts"],
      "cwd": "/path/to/ptv_mcp",
      "env": {
        "PTV_DEV_ID": "{{YOUR_DEV_ID}}",
        "PTV_API_KEY": "{{YOUR_API_KEY}}"
      }
    }
  }
}
```

## Testing Strategy

### Test Organization
- Unit tests: `/tests/` directory with descriptive file names
- Test files include top-level comment describing test goals
- Never modify production code to make tests pass
- Use dependency injection for external dependencies (HTTP client, cache)

### Testing Patterns
```typescript
// PTV API signature verification test
// Tests HMAC-SHA1 signing against official PTV documentation examples
describe('PTV API Signing', () => {
  it('should generate correct signature for official example', () => {
    // Use official PTV docs example with redacted credentials
    const path = '/v3/departures/route_type/0/stop/1071';
    const query = '?devid=3000176&max_results=3';
    const signature = signPath(path + query, 'REDACTED_API_KEY');
    expect(signature).toBe('EXPECTED_SIGNATURE_FROM_DOCS');
  });
});

// Feature orchestration test with mocked HTTP
describe('next_train tool', () => {
  it('should return next train from Flinders Street to South Morang', async () => {
    const mockClient = createMockPTVClient();
    const tool = new NextTrainTool(mockClient);
    
    const result = await tool.execute({
      origin: 'Flinders Street',
      destination: 'South Morang'
    });
    
    expect(result.data).toMatchObject({
      route: expect.objectContaining({ name: expect.any(String) }),
      departure: expect.objectContaining({
        scheduled: expect.any(String),
        estimated: expect.any(String)
      })
    });
  });
});
```

## PTV API Integration

### Authentication Pattern
The PTV API uses HMAC-SHA1 signature authentication:

1. Create canonical string: `path + query + devid`
2. Generate HMAC-SHA1 signature using API key
3. Append signature parameter to URL
4. All API details must be verified via context7 before implementation

### Retry and Rate Limiting
- Exponential backoff with jitter for 429 and 5xx responses
- Respect `Retry-After` headers from PTV API
- Maximum 3 retries with 8-second timeout per request
- Circuit breaker pattern for sustained failures

### Response Processing
- Use `expand=run,route,direction,stop` for departure queries
- Transform PTV timestamps to ISO 8601 format
- Filter results by route type (trains = route_type 0)
- Merge real-time estimates with scheduled times

## MCP Server Guidelines

### Tool Schema Definition
Each tool requires JSON schema for input validation:

```typescript
export const nextTrainSchema = {
  type: 'object',
  required: ['origin', 'destination'],
  properties: {
    origin: {
      type: 'string',
      description: 'Origin station name or ID'
    },
    destination: {
      type: 'string', 
      description: 'Destination station name or ID'
    },
    time: {
      type: 'string',
      format: 'date-time',
      description: 'Departure time (ISO 8601, defaults to now)'
    }
  }
};
```

### Response Format Standards
```typescript
interface ToolResponse<T> {
  data: T;
  metadata?: {
    executionTime: number;
    cacheHit: boolean;
    apiCalls: number;
    dataFreshness: string;
  };
}
```

### Error Message Guidelines
- Provide specific, actionable error messages for users
- Include suggestions for resolving common issues
- Distinguish between user errors (invalid station names) and system errors (API failures)
- Use consistent error codes across all tools

## Quick Reference

### Common Troubleshooting

**"Invalid signature" errors**: Verify PTV API credentials and signature generation algorithm

**"Stop not found" errors**: Check stop name spelling, try nearby stops or use stop IDs directly  

**"No departures" errors**: Verify route services the requested stops, check service hours

**Rate limiting**: Implement exponential backoff, check for cached data before API calls

### Key Files to Modify

- Add new tools: `src/features/{tool_name}/tool.ts` + register in `src/mcp/server.ts`
- Extend PTV client: `src/ptv/client.ts` and corresponding types in `src/ptv/types.ts`
- Update caching: `src/ptv/cache.ts` for new data types or TTL adjustments
- Configuration changes: `src/config.ts` for environment variables

### External References

- [PTV Timetable API v3 Documentation](https://www.ptv.vic.gov.au/footer/data-and-reporting/datasets/ptv-timetable-api/) (verify via context7)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/)
- [Bun Documentation](https://bun.sh/docs)
- [TypeScript Strict Mode Guide](https://www.typescriptlang.org/tsconfig#strict)

---

**Note**: This project is currently in the planning/documentation phase. All PTV API details must be verified using context7 before implementation begins. Never commit real API credentials to the repository.
