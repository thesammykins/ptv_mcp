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

## Key Endpoints (verify path names and params)
- Search stops/places
  - e.g., GET /v3/search/{term}?route_types=…
  - Params: `route_types` (train only for MVP), `latitude/longitude/radius` (if supported)
  - Response fields we depend on: stop_id, stop_name, route_type, lat/lon
- Routes
  - e.g., GET /v3/routes or routes by stop
  - Fields used: route_id, route_name, route_type
- Directions for a route
  - e.g., GET /v3/directions/route/{route_id}
  - Fields: direction_id, direction_name
- Departures by stop
  - e.g., GET /v3/departures/route_type/{route_type}/stop/{stop_id}
  - Params: route_id?, direction_id?, date_utc?, max_results?, expand=run,route,direction,stop
  - Fields: scheduled/estimated times, platform, run_id
- Stopping pattern / run pattern (to validate destination is on the run)
  - e.g., GET /v3/pattern/run/{run_id}/route_type/{route_type}
- Disruptions
  - e.g., GET /v3/disruptions/route/{route_id} and/or by stop
- Vehicle positions (if available in v3)
  - e.g., GET /v3/vehicle/positions?route_id=&route_type=&direction_id= (verify)

## Conventions
- Route type numeric codes (verify official mapping for trains)
- Expand options (run/route/direction/stop) and how they shape the response
- Known rate limits and headers (Retry-After)

## Error Shapes
- Typical error payloads and HTTP codes
- Correlation or request IDs if provided

## Notes
- Every endpoint, parameter, and field must be updated from context7 results.
- Include any quirks (e.g., inclusion of devid in canonical string) explicitly.

