# PTV MCP Server 🚂

A Model Context Protocol (MCP) server providing real-time access to Melbourne's public transport data via the Public Transport Victoria (PTV) Timetable API v3. This server enables AI assistants to help users with comprehensive Melbourne train information.

## 🚀 Features

**Three Powerful Tools:**
- **`next-train`**: Find the next train between any two Melbourne stations with real-time departures
- **`line-timetable`**: Get upcoming departures for a specific route and station with platform details
- **`how-far`**: Track approaching trains with real-time vehicle positions and distance estimates

**Key Capabilities:**
- 🚂 Real-time departure information with platform details and disruption alerts
- 📍 Live vehicle tracking with GPS coordinates, bearing, and ETA calculations
- 🔍 Intelligent route discovery and validation across Melbourne's train network
- ⚡ Lightning-fast responses with built-in caching (12-hour TTL for static data)
- 🛡️ Comprehensive error handling with actionable user messages
- 📊 Detailed execution metadata for monitoring and debugging

**Built with:**
- ⚡ Bun runtime with TypeScript (strict mode)
- 🔐 HMAC-SHA1 signature authentication per PTV requirements
- 🔄 Automatic retry logic with exponential backoff
- 📋 In-memory TTL caching for optimal performance
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

### Option 1: Use the provided mcp.json (Recommended)

The project includes a ready-to-use `mcp.json` configuration file:

```bash
# Set your PTV credentials as environment variables
export PTV_DEV_ID="your_developer_id_here"
export PTV_API_KEY="your_api_key_here"

# Copy mcp.json to Claude Desktop config directory
cp mcp.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

The `mcp.json` file uses environment variable substitution for secure credential management:

```json
{
  "mcpServers": {
    "ptv-local": {
      "command": "bun",
      "args": ["run", "src/mcp/server.ts"],
      "cwd": "/Users/samanthamyers/Development/ptv_mcp",
      "env": {
        "PTV_DEV_ID": "${PTV_DEV_ID}",
        "PTV_API_KEY": "${PTV_API_KEY}"
      }
    }
  }
}
```

### Option 2: Manual Configuration

Alternatively, manually add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

## 📚 Documentation

### For AI Agents
- **[AGENT.md](docs/AGENT.md)** - Comprehensive guide for AI agents on how to effectively use the PTV MCP tools, including best practices, error handling, and sample interactions

### For Developers
- **[Architecture Overview](docs/architecture.md)** - System design and module structure
- **[API Reference](docs/apireference.md)** - PTV API v3 integration details
- **[Development Guide](docs/refinement-brief.md)** - Detailed requirements and implementation notes

## 🛠️ Tool Usage Examples

### 1. Next Train (`next-train`)

Find the next train between two stations:

**Input:**
```json
{
  "origin": "Flinders Street",
  "destination": "South Morang",
  "time": "2024-03-15T09:00:00Z"
}
```

**Response:**
```json
{
  "data": {
    "route": {
      "id": 2,
      "name": "Hurstbridge",
      "number": "Hurstbridge"
    },
    "direction": {
      "id": 1,
      "name": "Up"
    },
    "departure": {
      "scheduled": "2024-03-15T09:15:00Z",
      "estimated": "2024-03-15T09:16:00Z",
      "platform": "2",
      "atPlatform": false
    },
    "origin": {
      "id": 1071,
      "name": "Flinders Street",
      "suburb": "Melbourne"
    },
    "destination": {
      "id": 1155,
      "name": "South Morang",
      "suburb": "South Morang"
    },
    "disruptions": [],
    "journey": {
      "changes": 0
    }
  },
  "metadata": {
    "executionTime": 245,
    "apiCalls": 6,
    "dataFreshness": "2024-03-15T09:00:15Z"
  }
}
```

### 2. Line Timetable (`line-timetable`)

Get upcoming departures for a specific route:

**Input:**
```json
{
  "stop": "Southern Cross",
  "route": "Belgrave",
  "direction": "outbound",
  "duration": 90
}
```

**Response:**
```json
{
  "data": {
    "stop": {
      "id": 1181,
      "name": "Southern Cross",
      "suburb": "Melbourne"
    },
    "route": {
      "id": 4,
      "name": "Belgrave",
      "number": "Belgrave"
    },
    "departures": [
      {
        "scheduled": "2024-03-15T09:12:00Z",
        "estimated": "2024-03-15T09:13:00Z",
        "platform": "8",
        "destination": "Belgrave",
        "atPlatform": true
      },
      {
        "scheduled": "2024-03-15T09:27:00Z",
        "platform": "8", 
        "destination": "Belgrave"
      }
    ],
    "timeWindow": {
      "start": "2024-03-15T09:00:00Z",
      "end": "2024-03-15T10:30:00Z",
      "durationMinutes": 90
    }
  }
}
```

### 3. How Far (`how-far`)

Track approaching trains with real-time positions:

**Input:**
```json
{
  "stop": "Melbourne Central",
  "route": "Craigieburn",
  "direction": "inbound"
}
```

**Response:**
```json
{
  "data": {
    "stop": {
      "id": 1120,
      "name": "Melbourne Central", 
      "coordinates": {
        "latitude": -37.8103,
        "longitude": 144.9633
      }
    },
    "approaching": {
      "runRef": "run-456",
      "destination": "Flinders Street",
      "vehicle": {
        "id": "X234",
        "operator": "Metro Trains",
        "description": "X'Trapolis 100",
        "lowFloor": true,
        "airConditioned": true
      },
      "realTimePosition": {
        "latitude": -37.8050,
        "longitude": 144.9633,
        "bearing": 180,
        "distanceMeters": 850,
        "etaMinutes": 2,
        "accuracy": "realtime",
        "lastUpdated": "2024-03-15T09:00:45Z"
      }
    }
  },
  "metadata": {
    "dataSource": "realtime",
    "apiCalls": 4
  }
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

### Common Issues

**"Invalid signature" errors:**
- Verify your `PTV_DEV_ID` and `PTV_API_KEY` are correct
- Ensure environment variables are properly loaded from `.env`
- Check that there are no extra spaces or special characters in credentials

**"Stop not found" errors:**
- Check stop names for typos (case insensitive matching supported)
- Use full stop names: "Flinders Street" not "Flinders St"
- Try nearby stops or use stop IDs directly for precision

**"No departures found":**
- Verify the route services the requested stops
- Check service hours - some routes don't operate at all times
- Try broader time windows or different directions

**Connection timeouts:**
- The PTV API can be slow during peak times
- Server automatically retries with exponential backoff
- Check network connectivity and firewall settings

**Tool not found in Claude:**
- Verify MCP server configuration in Claude Desktop
- Restart Claude Desktop after configuration changes
- Check server logs for startup errors

### Error Codes

| Code | Description |
|------|-------------|
| `STOP_NOT_FOUND` | The specified stop name was not found |
| `ROUTE_NOT_FOUND` | Route does not service the specified stop |
| `DIRECTION_NOT_FOUND` | Invalid direction for the route |
| `NO_DEPARTURES` | No upcoming departures found |
| `NO_APPROACHING_TRAINS` | No vehicles detected approaching the stop |
| `PTV_API_ERROR` | Upstream API error or timeout |

### Getting Help

- Check the [PTV API FAQ](http://ptv.vic.gov.au/apifaq)
- Review server logs for detailed error information
- Open an issue on GitHub with reproduction steps
- Ensure you're using the latest version

## 📦 Current Status

- ✅ **Environment Setup**: Complete with Bun + TypeScript
- ✅ **Core Architecture**: Complete with modular design
- ✅ **PTV API Integration**: Full HMAC-SHA1 auth + HTTP client
- ✅ **Tool Implementation**: All 3 tools fully implemented
- ✅ **Testing**: Comprehensive test suite (36 tests, 100% passing)
- ✅ **Real-time Features**: Vehicle tracking with GPS coordinates
- ✅ **Error Handling**: Robust error scenarios covered
- ✅ **Documentation**: Complete with usage examples
- 🚧 **Claude Desktop Integration**: Ready for configuration

## 🏗️ Development

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and add tests
4. Ensure all tests pass (`bun test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Architecture Overview

The server follows a clean, layered architecture:

- **MCP Layer** (`src/mcp/`) - Server initialization and tool registration
- **Feature Tools** (`src/features/`) - High-level tool orchestration and business logic
- **PTV Client** (`src/ptv/`) - API authentication, HTTP client, and response caching
- **Types** (`src/ptv/types.ts`) - TypeScript interfaces for all API responses

### Key Components

- **Authentication** - HMAC-SHA1 signature generation per PTV API requirements
- **HTTP Client** - Retry logic, timeout handling, and exponential backoff  
- **Caching** - TTL-based in-memory cache for stops, routes, and directions
- **Error Handling** - Structured error responses with actionable user messages
- **Real-time Data** - Live vehicle positions and schedule-based fallbacks

## 📄 License

MIT License - see LICENSE file for details

