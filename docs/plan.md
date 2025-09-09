# PTV MCP – Project Plan (MVP)

This document tracks the initial plan for building a Bun + TypeScript MCP server that exposes three tools backed by the PTV Timetable API v3: `next_train`, `line_timetable`, and `how_far`.

Status: Planning

## Objectives
- Provide agents a minimal set of high-level tools while the backend handles stop/route/timetable logic and request signing.
- Use Bun + TypeScript (strict), Prettier, 2025 conventions.
- Use env vars (PTV_DEV_ID, PTV_API_KEY) for auth; no secrets in repo/docs.
- Conform to latest MCP server SDK and logging expectations.
- Cache stops and routes; implement retries and backoff.

## Source of Truth
- All PTV API v3 details (endpoints, parameters, request signing algorithm, examples) must be verified with context7 before implementation.

## Deliverables
- README with setup, env, and tool usage.
- docs/
  - apireference.md (verified endpoints + signing)
  - architecture.md (modules, flows, caching, errors, logging)
  - plan.md (this file)
- src/
  - config.ts (env and validation)
  - mcp/server.ts (tool registration)
  - ptv/{signing.ts,http.ts,client.ts,types.ts,cache.ts}
  - features/{next_train, line_timetable, how_far}/tool.ts
- tests/
  - signing.test.ts, http.test.ts, features/*.test.ts
- examples/ (optional local scripts)

## Notes
- Verify route_type values for trains and the exact signing steps (hash algo, canonical path, query ordering, signature case) via context7. Use official example in signing tests.
- Design tool outputs to be agent-friendly structured JSON with helpful error messages.

