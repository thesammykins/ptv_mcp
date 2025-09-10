# PTV MCP – API Reference (VERIFIED)

Status: ✅ **VERIFIED** - Updated with official PTV Timetable API v3 documentation

This document contains the verified PTV Timetable API v3 details required for our MCP tools, gathered from official documentation.

## Base
- **Base URLs**: `https://timetableapi.ptv.vic.gov.au` (preferred) or `http://timetableapi.ptv.vic.gov.au`
- **Version**: v3
- **URL Structure**: `base URL / version number / API name / query string`

## Authentication & Signing
- **Environment variables**: `PTV_DEV_ID`, `PTV_API_KEY` (no secrets in docs; use placeholders)
- **Algorithm**: HMAC-SHA1 signature authentication
- **Signature Generation Steps**:
  1) Create request URL: `/v3/{endpoint}?{query_params}&devid={PTV_DEV_ID}`
  2) Create string-to-sign: Full path + query string (including devid, excluding base URL)
  3) Compute HMAC-SHA1 hash using the API key as the secret
  4) Encode signature as lowercase hexadecimal string
  5) Append to URL: `&signature={SIGNATURE}`

### Official Example (values redacted)
```
Request: /v3/departures/route_type/0/stop/1071?devid=3000176&max_results=3
String to sign: "/v3/departures/route_type/0/stop/1071?devid=3000176&max_results=3"
API Key: "REDACTED_KEY"
Signature: hmac_sha1(string_to_sign, api_key).to_lowercase_hex()
Final URL: https://timetableapi.ptv.vic.gov.au/v3/departures/route_type/0/stop/1071?devid=3000176&max_results=3&signature=COMPUTED_SIGNATURE
```

## Key Endpoints Used

### Search API
**Endpoint:** `GET /v3/search/{term}`
**Parameters:**
- `route_types` - Filter by transport type (0 = train)
**Used for:** Stop name resolution and discovery
**Response fields:** `stop_id`, `stop_name`, `stop_suburb`, `stop_latitude`, `stop_longitude`, `route_type`, `routes[]`

### Routes API
**Endpoint:** `GET /v3/routes`
**Parameters:**
- `route_type` - Filter by transport type (optional)
**Used for:** Route enumeration and fallback route discovery
**Response fields:** `route_id`, `route_name`, `route_number`, `route_type`, `route_gtfs_id`

### Directions API  
**Endpoint:** `GET /v3/directions/route/{route_id}`
**Used for:** Direction discovery for route-specific queries
**Response fields:** `direction_id`, `direction_name`, `route_direction_description`
**Cached:** Yes, 12-hour TTL per route

### Departures API
**Endpoint:** `GET /v3/departures/route_type/{route_type}/stop/{stop_id}`
**Parameters:**
- `route_id` - Filter to specific route (optional)
- `direction_id` - Filter to specific direction (optional)  
- `date_utc` - Start time for search (ISO 8601 UTC)
- `max_results` - Limit response size (default varies)
- `expand` - Include related data (0=ALL used for full expansion)
**Response fields:** `scheduled_departure_utc`, `estimated_departure_utc`, `platform_number`, `run_ref`, `at_platform`
**Expanded data:** Includes `runs{}`, `routes{}`, `directions{}`, `stops{}`, `disruptions{}`

### Run Pattern API
**Endpoint:** `GET /v3/runs/{run_ref}/route_type/{route_type}`
**Parameters:**
- `expand` - Include stop, run, route data
- `stop_id` - Filter to specific stop (optional)
- `date_utc` - Date context (optional)
**Used for:** Stopping pattern validation (currently simplified in implementation)

### Disruptions API
**Endpoint:** `GET /v3/disruptions/route/{route_id}`
**Used for:** Service alert information
**Response fields:** `disruption_id`, `title`, `description`, `url`, `from_date`, `to_date`, `disruption_status`

### Runs API (Vehicle Positions)
**Endpoint:** `GET /v3/runs/route/{route_id}/route_type/{route_type}`
**Parameters:**
- `direction_id` - Filter to specific direction
- `expand` - Include vehicle position data (0=ALL)
**Response fields:** `run_ref`, `vehicle_position` (lat/lng/bearing/datetime), `vehicle_descriptor`
**Used for:** Real-time vehicle tracking in how-far tool

## Conventions

### Route Type Codes
- `0` = Train (Metro)
- `1` = Tram  
- `2` = Bus
- `3` = V/Line (Regional train)
- `4` = Night Bus

**Implementation Note:** PTV MCP filters to trains only (`route_type=0`)

### Expand Parameter Values
Used to include related data in responses:
- `0` = ALL (includes all available expansions)
- `1` = STOP
- `2` = ROUTE  
- `3` = RUN
- `4` = DIRECTION
- `5` = DISRUPTION
- `6` = VEHICLE_POSITION
- `7` = VEHICLE_DESCRIPTOR

**Implementation:** Uses `expand=0` (ALL) for comprehensive data in single request

### Rate Limiting & Retries
- **HTTP Timeout:** 8 seconds per request (configurable)
- **Max Retries:** 3 attempts with exponential backoff
- **Retry Conditions:** HTTP 429, 5xx errors
- **Backoff:** Respects `Retry-After` headers when present
- **Circuit Breaker:** Planned for sustained failure scenarios

## Error Handling

### PTV API Error Responses
**HTTP Status Codes:**
- `400` - Bad request (invalid parameters)
- `403` - Forbidden (invalid credentials, rate limited)
- `404` - Not found (invalid stop/route/run ID)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable

### MCP Tool Error Format
```typescript
interface MCPError {
  code: string;           // Semantic error code
  message: string;        // Human-readable description  
  status?: number;        // HTTP status code
  path?: string;          // Failed API endpoint
  cause?: unknown;        // Original error details
  retryAfter?: number;    // Seconds to wait before retry
  correlationId?: string; // Request tracking ID
}
```

### Common Error Codes
- `STOP_NOT_FOUND` - Station name not found in search
- `ROUTE_NOT_FOUND` - Route doesn't service the specified stop  
- `DIRECTION_NOT_FOUND` - Invalid direction for route
- `NO_DEPARTURES` - No trains found in time window
- `NO_APPROACHING_TRAINS` - No vehicles detected for how-far queries
- `PTV_API_ERROR` - Upstream API failure or timeout

### Request Correlation
- Each tool execution includes timing metadata
- API call count and cache hit tracking
- Data freshness timestamps
- Timezone debug information for time-related issues

## Notes
- Every endpoint, parameter, and field must be updated from context7 results.
- Include any quirks (e.g., inclusion of devid in canonical string) explicitly.

