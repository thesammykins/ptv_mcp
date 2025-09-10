# Debug Utilities

This directory contains debug scripts and utilities for testing and investigating PTV API behavior during development.

## Files

- `debug-api.ts` - General PTV API debugging and exploration
- `debug-expand.ts` - Debug expand parameters and their effects on API responses
- `debug-nexttrain-data.ts` - Debug next train data structure and parsing
- `debug-time.ts` - Debug time handling, timezone conversions, and scheduling

## Usage

These are standalone debugging scripts that can be run directly during development:

```bash
bun run tests/debug/debug-api.ts
bun run tests/debug/debug-expand.ts
# etc.
```

## Note

These scripts are for development use only and may contain hardcoded test data or API keys. They should not be used in production and are not part of the regular test suite.
