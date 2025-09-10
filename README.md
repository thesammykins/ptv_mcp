# PTV MCP Server 🚂

A Model Context Protocol (MCP) server that provides high-level tools for accessing Public Transport Victoria's Timetable API v3. This server enables AI assistants to help users with Melbourne public transport information.

## 🚀 Features

**Three Main Tools:**
- **`next-train`**: Find the next train between origin and destination stops with real-time data
- **`line-timetable`**: Get upcoming departures for a specific stop and route (next 60 minutes)
- **`how-far`**: Estimate distance and ETA for the nearest approaching train

**Built with:**
- ⚡ Bun runtime with TypeScript (strict mode)
- 🔐 HMAC-SHA1 signature authentication
- 🔄 Automatic retry logic with exponential backoff
- 📋 In-memory caching (12-hour TTL for stops/routes)
- ⚙️ Latest MCP specification compliance

## 💻 Quick Start

### Prerequisites
- **Bun** (latest version)
- **PTV Developer Credentials** (Developer ID and API Key)
  - Register at: [PTV Developer Portal](https://www.ptv.vic.gov.au/footer/data-and-reporting/datasets/ptv-timetable-api/)

### Installation

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Clone and setup the project
cd ptv_mcp
bun install

# Copy environment template
cp .env.example .env
# Edit .env with your PTV credentials
```

### Configuration

Set up your environment variables in `.env`:

```bash
# Required: PTV API credentials
PTV_DEV_ID=your_developer_id_here
PTV_API_KEY=your_api_key_here

# Optional configuration
PTV_BASE_URL=https://timetableapi.ptv.vic.gov.au
HTTP_TIMEOUT_MS=8000
HTTP_MAX_RETRIES=3
CACHE_TTL_HOURS=12
LOG_LEVEL=info
```

### Development

```bash
# Start development server with hot reload
bun run dev

# Run tests
bun test

# Type checking
bun run lint

# Format code
bun run format

# Test tools locally
bun run examples/test-tools.ts
```

### MCP Server Usage

```bash
# Start MCP server (for Claude Desktop integration)
bun run mcp:dev
```

## 🧮 Claude Desktop Integration

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ptv": {
      "command": "bun",
      "args": ["run", "src/mcp/server.ts"],
      "cwd": "/path/to/ptv_mcp",
      "env": {
        "PTV_DEV_ID": "YOUR_DEVELOPER_ID",
        "PTV_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## 🛠️ API Tools

### `next-train`
Find the next train between two stations.

```json
{
  "origin": "Flinders Street",
  "destination": "South Morang",
  "time": "2024-12-09T10:00:00Z" // optional
}
```

### `line-timetable`
Get upcoming departures for a stop and route.

```json
{
  "stop": "Flinders Street",
  "route": "Hurstbridge",
  "direction": "Up" // optional
}
```

### `how-far`
Estimate distance and ETA for approaching trains.

```json
{
  "stop": "South Morang",
  "route": "Hurstbridge"
}
```

## 📁 Project Structure

```
ptv_mcp/
├── src/
│   ├── config.ts              # Environment configuration
│   ├── mcp/
│   │   └── server.ts           # MCP server entry point
│   ├── ptv/                   # PTV API client
│   │   ├── signing.ts          # HMAC-SHA1 authentication
│   │   ├── http.ts             # HTTP client with retries
│   │   ├── client.ts           # API endpoints
│   │   ├── types.ts            # TypeScript interfaces
│   │   └── cache.ts            # TTL caching
│   └── features/              # Tool implementations
│       ├── next_train/
│       ├── line_timetable/
│       └── how_far/
├── tests/                  # Unit and integration tests
├── examples/               # Usage examples
└── docs/                   # Documentation
    ├── plan.md
    ├── architecture.md
    └── apireference.md
```

## 📚 Documentation

- **[Architecture](docs/architecture.md)** - System design and data flows
- **[API Reference](docs/apireference.md)** - PTV API v3 integration details
- **[Project Plan](docs/plan.md)** - Development roadmap

## ⚙️ Development

### Running Tests

```bash
# Run all tests
bun test

# Run specific test
bun test tests/signing.test.ts

# Run with coverage
bun test --coverage
```

### Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Development server with hot reload |
| `bun run build` | Build production bundle |
| `bun test` | Run test suite |
| `bun run lint` | TypeScript type checking |
| `bun run format` | Format code with Prettier |
| `bun run mcp:dev` | Start MCP server |
| `bun run mcp:validate` | Validate schemas and types |

## 🔒 Security

- ⚠️ **Never commit real API credentials**
- All secrets are loaded from environment variables
- API keys and signatures are redacted from logs
- HMAC-SHA1 signature verification for all PTV API requests

## 🐛 Troubleshooting

**"Invalid signature" errors:**
- Verify `PTV_DEV_ID` and `PTV_API_KEY` are correct
- Check signature generation algorithm matches PTV requirements

**"Stop not found" errors:**
- Check stop name spelling (e.g., "Flinders Street" not "Flinders St")
- Try using stop IDs directly instead of names

**Rate limiting:**
- Server automatically retries with exponential backoff
- Check if you're exceeding PTV API quotas

## 📦 Status

- ✅ **Environment Setup**: Complete
- ✅ **Core Architecture**: Complete  
- ✅ **PTV API Integration**: Basic scaffolding done
- 🚧 **Tool Implementation**: In progress
- 🚧 **Testing**: Partial coverage

## 📄 License

MIT License - see LICENSE file for details

