# Integration Tests

This directory contains integration tests that verify the complete PTV MCP server functionality against real PTV API endpoints.

## Files

- `test-mcp-production.ts` - End-to-end tests of MCP tools against production PTV API
- `test-mcp-tools.ts` - Integration tests for MCP tool orchestration and responses
- `test-original-requests.ts` - Tests validating compatibility with original PTV API request patterns

## Purpose

These tests:
- Validate the complete tool chain from MCP input to PTV API response
- Ensure real-world API compatibility and behavior
- Test error handling with actual API error conditions
- Verify response formatting and data transformation

## Running Integration Tests

```bash
# Run all integration tests
bun test tests/integration/

# Run specific integration test
bun test tests/integration/test-mcp-production.ts
```

## Requirements

- Valid PTV API credentials in environment variables
- Network connectivity to PTV API endpoints
- These tests may be slower as they make real API calls

## Note

Integration tests should be run against a test environment when possible, as they make actual API calls that may be rate-limited or affect API quotas.
