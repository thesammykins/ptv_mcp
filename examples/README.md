# PTV MCP Examples

This directory contains example scripts demonstrating how to use the PTV MCP server tools both locally and within Claude Desktop.

## Files

### `test-tools.ts`
**Main testing script** - Tests all three tools with basic scenarios:
- `next-train`: Find next train from Flinders Street to South Morang
- `line-timetable`: Get departures for Hurstbridge line at Flinders Street
- `how-far`: Track approaching trains at Melbourne Central

Run with: `bun examples/test-tools.ts`

### `individual-tool-examples.ts` 
**Comprehensive examples** - Shows various usage patterns for each tool:
- Multiple station combinations and route types
- Different time windows and directions
- Real-time vs schedule-based queries
- Error handling demonstrations

Run with: `bun examples/individual-tool-examples.ts`

### `claude-desktop-config.json`
**Claude Desktop configuration** template for MCP server integration.
Copy this to your Claude Desktop configuration file and update the paths and credentials.

**Note**: The project now includes a root-level `mcp.json` file that provides a more convenient configuration option with environment variable substitution.

## Prerequisites

Before running any examples:

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Configure credentials:**
   ```bash
   cp .env.example .env
   # Edit .env and add your PTV_DEV_ID and PTV_API_KEY
   ```

3. **Get PTV API credentials** (free):
   - Visit: https://www.ptv.vic.gov.au/footer/data-and-reporting/datasets/ptv-timetable-api/
   - Register for API access
   - Copy your Developer ID and API Key to `.env`

## Claude Desktop Integration

### Option 1: Use mcp.json (Recommended)

1. **Set environment variables:**
   ```bash
   export PTV_DEV_ID="your_developer_id_here"
   export PTV_API_KEY="your_api_key_here"
   ```

2. **Copy the mcp.json configuration:**
   ```bash
   cp mcp.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

3. **Start the MCP server:**
   ```bash
   bun run mcp:start
   ```

4. **Restart Claude Desktop** to pick up the new configuration

### Option 2: Manual Configuration

1. **Copy the configuration template:**
   ```bash
   cp examples/claude-desktop-config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Update the configuration:**
   - Replace `REPLACE_WITH_YOUR_USERNAME` with your actual username
   - Replace `REPLACE_WITH_YOUR_PTV_DEVELOPER_ID` with your PTV Developer ID
   - Replace `REPLACE_WITH_YOUR_PTV_API_KEY` with your PTV API Key
   - Adjust the `cwd` path to match your project location

3. **Start the MCP server:**
   ```bash
   bun run mcp:start
   ```

4. **Restart Claude Desktop** to pick up the new configuration

## Example Queries for Claude

Once configured, you can ask Claude things like:

- *"What's the next train from Flinders Street to South Morang?"*
- *"Show me the timetable for the Frankston line at Richmond station"*
- *"How far away is the next train at Melbourne Central on the Craigieburn line?"*
- *"When do trains run from Southern Cross to Geelong in the morning?"*

## Tool Parameters

### next-train
```typescript
{
  origin: string;        // Station name (e.g., "Flinders Street")
  destination: string;   // Station name (e.g., "South Morang")
  time?: string;        // ISO 8601 timestamp (optional, defaults to now)
}
```

### line-timetable  
```typescript
{
  stop: string;         // Station name (e.g., "Richmond")
  route: string;        // Line name (e.g., "Frankston")
  direction?: string;   // "Up"/"Down" or "inbound"/"outbound" (optional)
  duration?: number;    // Minutes from now (optional, defaults to 60)
}
```

### how-far
```typescript
{
  stop: string;         // Station name (e.g., "Melbourne Central")
  route: string;        // Line name (e.g., "Craigieburn")
  direction?: string;   // "Up"/"Down" or "inbound"/"outbound" (optional)
}
```

## Troubleshooting

**"Invalid signature" errors:**
- Check your PTV credentials are correct in `.env`
- Ensure no extra spaces or characters in the credentials

**"Module not found" errors:**
- Run `bun install` to install dependencies
- Check file paths in the examples match your setup

**"No departures found":**
- Check station names are spelled correctly (case-insensitive)
- Try different times of day (some routes have limited service)
- Verify the route serves the requested stations

**Claude Desktop integration issues:**
- Restart Claude Desktop after configuration changes
- Check the MCP server starts without errors: `bun run mcp:start`
- Verify the `cwd` path in the configuration is correct

## Performance Notes

- First requests may be slower due to cache warming
- Subsequent requests to the same stops/routes will be faster
- Real-time vehicle data may not be available for all routes
- The server automatically retries failed requests with exponential backoff
