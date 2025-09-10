/**
 * Melbourne timezone utilities for PTV MCP server
 * Handles all timezone conversions server-side to ensure consistency
 */

/**
 * Melbourne timezone identifier
 * Australia/Melbourne handles DST automatically (AEST/AEDT)
 */
export const MELBOURNE_TIMEZONE = 'Australia/Melbourne';

/**
 * Get current time in Melbourne timezone
 */
export function getMelbourneNow(): Date {
  return new Date();
}

/**
 * Get current time in Melbourne as ISO string (UTC)
 * This is what the PTV API expects - UTC timestamps
 */
export function getMelbourneNowUTC(): string {
  return getMelbourneNow().toISOString();
}

/**
 * Get Melbourne time formatted for display
 */
export function getMelbourneTimeForDisplay(): string {
  return getMelbourneNow().toLocaleString('en-AU', {
    timeZone: MELBOURNE_TIMEZONE,
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Convert a user-provided time string to Melbourne time
 * Handles various input formats and assumes Melbourne timezone if none specified
 */
export function parseUserTimeToMelbourneUTC(userTime?: string): string {
  if (!userTime) {
    return getMelbourneNowUTC();
  }

  let parsedTime: Date;

  try {
    // Try parsing as ISO string first
    if (userTime.includes('T') || userTime.includes('Z')) {
      parsedTime = new Date(userTime);
    } else {
      // Assume it's a Melbourne local time string
      // Parse in Melbourne timezone context
      const now = getMelbourneNow();
      const todayMelbourne = now.toLocaleDateString('en-CA', { timeZone: MELBOURNE_TIMEZONE }); // YYYY-MM-DD format
      
      // If user just provided time (e.g., "2:30 PM"), use today's date
      if (userTime.match(/^\d{1,2}:\d{2}(\s*(AM|PM|am|pm))?$/)) {
        parsedTime = new Date(`${todayMelbourne}T${convertTo24Hour(userTime)}`);
      } else {
        // Try parsing as-is, assuming Melbourne timezone
        parsedTime = new Date(userTime);
      }
    }

    if (isNaN(parsedTime.getTime())) {
      throw new Error('Invalid date format');
    }

    return parsedTime.toISOString();
  } catch (error) {
    console.warn(`Invalid time format: ${userTime}, using current time`);
    return getMelbourneNowUTC();
  }
}

/**
 * Convert 12-hour time to 24-hour format
 * Helper for parsing user-provided times
 */
function convertTo24Hour(time12h: string): string {
  const parts = time12h.split(/\s*(AM|PM|am|pm)/);
  const time = parts[0];
  const period = parts[1];

  if (!time || !time.includes(':')) {
    throw new Error(`Invalid time format: ${time12h}`);
  }

  const [hoursStr, minutes] = time.split(':');
  
  if (!hoursStr || minutes === undefined) {
    throw new Error(`Invalid time format: ${time12h}`);
  }
  
  const hoursNum = parseInt(hoursStr, 10);

  if (Number.isNaN(hoursNum)) {
    throw new Error(`Invalid time format: ${time12h}`);
  }
  
  let hours24 = hoursNum;
  
  if (period?.toUpperCase() === 'PM' && hours24 !== 12) {
    hours24 += 12;
  } else if (period?.toUpperCase() === 'AM' && hours24 === 12) {
    hours24 = 0;
  }
  
  return `${hours24.toString().padStart(2, '0')}:${minutes}:00`;
}

/**
 * Add minutes to current Melbourne time
 * Useful for "departure in X minutes" scenarios
 */
export function getMelbourneTimeInMinutes(minutes: number): string {
  const futureTime = new Date(getMelbourneNow().getTime() + (minutes * 60 * 1000));
  return futureTime.toISOString();
}

/**
 * Get time range for Melbourne-aware API queries
 * Returns start and end times in UTC for API consumption
 */
export function getMelbourneTimeRange(
  startTime?: string,
  durationMinutes: number = 60
): { start: string; end: string } {
  const start = parseUserTimeToMelbourneUTC(startTime);
  const startDate = new Date(start);
  const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));
  
  return {
    start: start,
    end: endDate.toISOString()
  };
}

/**
 * Format UTC time for Melbourne display
 * Converts API response times back to user-friendly Melbourne time
 */
export function formatUTCForMelbourne(utcTime: string): string {
  try {
    const date = new Date(utcTime);
    return date.toLocaleString('en-AU', {
      timeZone: MELBOURNE_TIMEZONE,
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return utcTime; // Fallback to original if parsing fails
  }
}

/**
 * Check if we're currently in Melbourne daylight saving time (AEDT vs AEST)
 */
export function isMelbourneDST(): boolean {
  const now = getMelbourneNow();
  const melbourneOffset = now.getTimezoneOffset();
  
  // Melbourne is UTC+10 (AEST) or UTC+11 (AEDT)  
  // getTimezoneOffset() returns minutes behind UTC (so negative for ahead)
  return melbourneOffset === -660; // -11 hours = AEDT (DST active)
}

/**
 * Get current Melbourne timezone offset as string
 */
export function getMelbourneTimezoneOffset(): string {
  return isMelbourneDST() ? 'UTC+11 (AEDT)' : 'UTC+10 (AEST)';
}

/**
 * Debug information for timezone handling
 */
export function getTimezoneDebugInfo() {
  const now = getMelbourneNow();
  
  return {
    systemUTC: now.toISOString(),
    melbourneLocal: getMelbourneTimeForDisplay(),
    melbourneUTC: getMelbourneNowUTC(),
    isDST: isMelbourneDST(),
    offset: getMelbourneTimezoneOffset(),
    systemTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}
