# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that exposes high-level tools backed by the Public Transport Victoria (PTV) Timetable API v3. The server provides three main tools:

- `next_train`: Find the next train between origin and destination stops
- `line_timetable`: Get timetable for a specific stop and route
- `how_far`: Estimate distance and ETA for the nearest approaching train

**Status**: ✅ **Production Ready** - All features implemented, tested (36/36 tests passing), and ready for automated npm publishing.

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

## 🚀 Build, Commit & Workflow Instructions

### Pre-commit Quality Gates
Before committing any changes, ensure all quality gates pass:

```bash
# 1. Verify all tests pass (REQUIRED)
bun test
# Expected: 36 pass, 0 fail

# 2. Ensure TypeScript compilation is clean (REQUIRED)
bun run lint
# Expected: No TypeScript errors

# 3. Format code with Prettier
bun run format

# 4. Build project and verify output
bun run build
# Expected: dist/mcp/server.js created successfully

# 5. Verify package structure
npm publish --dry-run
# Expected: ~83KB compressed, 5 files (dist/, package.json, README.md, CONTRIBUTING.md, LICENSE)
```

### Git Workflow

#### Standard Development Commits
```bash
# Add all changes
git add .

# Commit with conventional commit format
git commit -m "feat: add new MCP tool functionality"
# or
git commit -m "fix: resolve departure time filtering issue"
# or  
git commit -m "docs: update API documentation"

# Push to main branch
git push origin main
```

#### Feature Branch Workflow (Recommended for Major Changes)
```bash
# Create and switch to feature branch
git checkout -b feature/new-tool-name

# Make changes, test, and commit
git add .
git commit -m "feat: implement new tool for route planning"

# Push feature branch
git push origin feature/new-tool-name

# Create pull request via GitHub CLI (if available)
gh pr create --title "Add new route planning tool" --body "Implements XYZ functionality"

# Or manually create PR on GitHub web interface
```

### 📦 NPM Publishing Workflow

**Automated Publishing (Recommended)**

The project uses GitHub Actions for automated publishing. Simply create a version tag:

```bash
# Update version (choose appropriate type)
npm version patch   # Bug fixes (0.1.3 -> 0.1.4)
npm version minor   # New features (0.1.3 -> 0.2.0)  
npm version major   # Breaking changes (0.1.3 -> 1.0.0)

# Push version tag to trigger automated workflow
git push origin main --tags
```

**What Happens Next:**
1. 🤖 GitHub Actions detects version tag (`v*.*.*`)
2. 🛠️ Runs quality gates: dependencies, linting, tests, build
3. ✅ All tests must pass (36/36) - **workflow fails if any test fails**
4. 📦 Publishes `@thesammykins/ptv-mcp@x.x.x` to npm registry
5. 🏇 Package becomes available: `npm install @thesammykins/ptv-mcp`

**Manual Publishing (Emergency Only)**
```bash
# Ensure everything is ready
bun test && bun run lint && bun run build

# Test publishing locally
npm publish --dry-run

# Publish to npm (requires NPM_TOKEN)
npm publish --access public
```

### 🚨 Workflow Troubleshooting

**Tests Failing in CI:**
```bash
# Run tests locally to debug
bun test

# Check specific failing test
bun test tests/next_train.test.ts

# Review test output for mock data issues
```

**TypeScript Errors in CI:**
```bash
# Check TypeScript locally
bun run lint

# Fix common issues:
# - Undefined parameter handling
# - Optional property access
# - Missing type annotations
```

**Build Failures:**
```bash
# Verify build locally
bun run build

# Check output directory
ls -la dist/mcp/
# Expected: server.js file ~460KB
```

### 👥 Team Collaboration

**Beep/Boop Work Coordination:**
```bash
# Check if directory is available for work
echo "Checking work coordination status..."

# Claim directory for agent work (if applicable)
echo "Agent claiming directory for PTV MCP development..."

# Signal work completion
echo "Work completed - directory available for next agent"
```

**Notion Task Integration:**
- Tag tasks with `warp-agent` for automated discovery
- Update status: `Not started` → `In progress` → `Done`
- Priority order: High → Medium → Low
- Add `warp-agent-doing` tag during active work

### 📈 Monitoring & Metrics

**Package Metrics:**
- **Size**: 83.1 KB compressed, 485.8 KB unpacked
- **Files**: 5 (dist/, package.json, README.md, CONTRIBUTING.md, LICENSE)
- **Registry**: https://www.npmjs.com/package/@thesammykins/ptv-mcp

**Quality Metrics:**
- **Tests**: 36/36 passing (100% pass rate)
- **TypeScript**: Strict mode, 0 compilation errors  
- **Code Coverage**: Available via `bun test --coverage`
- **Dependencies**: Minimal surface area, no security vulnerabilities

**GitHub Actions Workflow Status:**
- ✅ **All quality gates enforced**
- ✅ **Automated publishing on version tags**
- ✅ **npm provenance for security**
- ✅ **Dependency caching for faster builds**

### 🔧 Emergency Procedures

**Hotfix Workflow:**
```bash
# For critical production issues
git checkout -b hotfix/critical-fix

# Make minimal fix
# ... edit files ...

# Verify fix
bun test
bun run lint

# Commit and push
git add .
git commit -m "fix: resolve critical production issue"
git push origin hotfix/critical-fix

# Create immediate release
npm version patch
git push origin main --tags
```

**Rollback Release:**
```bash
# Deprecate problematic version
npm deprecate @thesammykins/ptv-mcp@x.x.x "This version has issues, use x.x.y instead"

# Or unpublish if within 24 hours
npm unpublish @thesammykins/ptv-mcp@x.x.x
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
