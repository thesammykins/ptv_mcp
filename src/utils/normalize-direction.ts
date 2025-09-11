/**
 * Direction normalization utility for PTV MCP tools
 * Handles both Metro and V/Line naming conventions
 * Prevents TypeError when calling toLowerCase() on undefined/null direction parameters
 */

/**
 * Safely normalizes direction parameter to lowercase string or undefined
 * Extended to handle V/Line regional train direction naming conventions
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
    if (trimmed.length === 0) {
      return undefined;
    }

    const normalized = trimmed.toLowerCase();
    
    // Handle common inbound synonyms (city-bound for both metro and V/Line)
    if (normalized.includes('inbound') || 
        normalized.includes('city') || 
        normalized.includes('cbd') || 
        normalized.includes('flinders') || 
        normalized.includes('southern cross') || 
        normalized.includes('spencer') || 
        normalized === 'up') {
      return 'inbound';
    }
    
    // Handle common outbound synonyms
    if (normalized.includes('outbound') || 
        normalized === 'down') {
      return 'outbound';
    }
    
    // Return the normalized string for specific direction names
    return normalized;
  }

  // Handle other types (objects, arrays, etc.) - treat as invalid
  return undefined;
}
