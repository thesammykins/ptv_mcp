# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2025-01-11

### Fixed

- **Direction Parameter Safety**: Fixed TypeError "Cannot read properties of undefined (reading 'toLowerCase')" in `line-timetable` and `how-far` tools when direction parameter is passed as null/undefined through MCP calls
- **Missing Import**: Fixed missing `getTimezoneDebugInfo` import in `how-far` tool that was causing runtime errors
- **Direction Normalization**: Added robust `normalizeDirection` utility that safely handles null, undefined, empty string, numeric, and invalid object inputs for direction parameters

### Added

- Comprehensive test coverage for direction parameter edge cases
- Direction normalization utility with support for mixed case strings, whitespace handling, and type coercion

### Technical Details

The fix addresses a common MCP integration issue where optional parameters can be passed as `null` or `undefined` rather than being omitted entirely. The `normalizeDirection` utility provides consistent handling:

- Returns `undefined` for null/undefined/empty inputs (no direction filtering)
- Normalizes valid strings to lowercase with trimming
- Converts numbers to lowercase strings
- Returns `undefined` for invalid object/array inputs

This ensures backward compatibility while preventing runtime TypeErrors.