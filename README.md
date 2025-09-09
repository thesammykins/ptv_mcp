# PTV MCP – README (MVP)

This project provides an MCP server exposing high-level tools backed by the Public Transport Victoria (PTV) Timetable API v3.

Tools (MVP)
- next_train: Given origin and destination names, returns the next train including realtime estimate, platform (if available), and disruptions.
- line_timetable: Given stop + route (+ optional direction), returns a timetable for the next 60 minutes.
- how_far: For a stop and route (+ optional direction), estimates how far the nearest inbound train is and ETA.

Do not put secrets in this repo or docs.

Prerequisites
- Bun (latest) – to be installed locally
- TypeScript (bundled via Bun)
- PTV developer credentials (Developer ID and API key)

Configuration
- Set environment variables via your MCP config (no secrets checked in):
  - PTV_DEV_ID={{YOUR_DEV_ID}}
  - PTV_API_KEY={{YOUR_API_KEY}}
  - Optional: PTV_BASE_URL, HTTP_TIMEOUT_MS, HTTP_MAX_RETRIES

Docs
- docs/plan.md – Overall plan
- docs/architecture.md – Modules and flows
- docs/apireference.md – API details (must be verified via context7)

Development
- Install Bun, then scaffold project files and run the server. Until implemented, this README serves as a guide to structure.
- Tests live under /tests per project rules; include descriptive headers and inline comments.

Security & Secrets
- Never include real credentials in code or documentation.
- If using 1Password later, specify the exact item and field names before any retrieval.

Status
- Planning and scaffolding. API details and request signing will be verified via context7 before implementation.

