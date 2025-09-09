# PTV MCP – API Reference (to be verified via context7)

Status: Draft – DO NOT TRUST until verified with context7

This document will capture the exact PTV Timetable API v3 details required for our MCP tools. All items below must be verified and updated from the latest official docs before coding.

## Base
- Base URL: (verify)
- Version: v3

## Authentication & Signing
- Env variables: PTV_DEV_ID, PTV_API_KEY (no secrets in docs; use placeholders)
- Steps (verify every detail):
  1) Start with path and query (include `?devid={PTV_DEV_ID}`)
  2) Create string-to-sign (exact canonicalization rules: ordering, encoding)
  3) Compute HMAC (hash algorithm: verify; HMAC-SHA1 historically used, but confirm)
  4) Encode signature (verify hex/base64 and case)
  5) Append `&signature={SIGNATURE}`
- Provide a worked example from docs here (values redacted/placeholder) and mirror it in tests/signing.test.ts

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

