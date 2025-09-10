# Experimental Tests

This directory contains experimental, development, and exploratory test files that were created during the development process to understand PTV API behavior and test various approaches.

## Files

- `test-api-structure.ts` - Exploring PTV API response structure and data formats
- `test-departures-debug.ts` - Debugging departure data parsing and validation
- `test-expand-parameters.ts` - Testing different expand parameter combinations
- `test-melbourne-time.ts` - Time zone handling and Melbourne time conversion testing
- `test-next-train-focused.ts` - Focused testing of next train functionality
- `test-nexttrain-direct.ts` - Direct next train API calls without orchestration
- `test-nexttrain-final.ts` - Final next train implementation validation
- `test-route-validation.ts` - Route discovery and validation logic testing
- `test-run-pattern-fix.ts` - Testing fixes for run pattern validation issues  
- `test-timing-info.ts` - Testing timing information extraction and formatting

## Purpose

These tests were created to:
- Explore and understand PTV API behavior
- Test different implementation approaches during development
- Debug specific issues and validate fixes
- Experiment with data processing techniques
- Validate assumptions about API responses

## Status

These files are **experimental** and may:
- Contain hardcoded test data
- Have incomplete error handling
- Use outdated or deprecated approaches
- Not follow current project patterns
- Include debugging code and console output

## Usage

```bash
# Run individual experimental tests as needed
bun run tests/experimental/test-timing-info.ts
```

## Note

These tests are kept for reference and debugging purposes but should not be considered part of the main test suite. They may be useful when investigating similar issues in the future or understanding the development history of specific features.
