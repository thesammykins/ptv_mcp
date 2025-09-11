/**
 * Direction normalization utility for PTV MCP tools
 * Prevents TypeError when calling toLowerCase() on undefined/null direction parameters
 */

/**
 * Safely normalizes direction parameter to lowercase string or undefined
 * @param direction The direction parameter from tool input
 * @returns Normalized lowercase string or undefined for empty/invalid input
 */
export function normalizeDirection(direction: unknown): string | undefined {
  // Handle null/undefined
  if (direction == null) {
    return undefined;
  }

  // Handle numbers (convert to string first)
  if (typeof direction === 'number') {
    return String(direction).toLowerCase();
  }

  // Handle strings
  if (typeof direction === 'string') {
    const trimmed = direction.trim();
    return trimmed.length > 0 ? trimmed.toLowerCase() : undefined;
  }

  // Handle other types (objects, arrays, etc.) - treat as invalid
  return undefined;
}