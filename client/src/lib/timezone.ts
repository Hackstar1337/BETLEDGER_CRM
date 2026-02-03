/**
 * Get the timezone from localStorage or return default
 */
export function getTimezone(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('appTimezone') || 'GMT+5:30';
  }
  return 'GMT+5:30';
}

/**
 * Parse timezone string to get offset in hours
 * e.g., "GMT+5:30" -> 5.5
 */
export function parseTimezoneOffset(timezone: string): number {
  const match = timezone.match(/GMT([+-]\d+):?(\d*)/);
  if (!match) return 5.5; // Default to GMT+5:30
  
  let hours = parseInt(match[1]);
  if (match[2]) {
    hours += parseInt(match[2]) / 60 * (hours < 0 ? -1 : 1);
  }
  
  return hours;
}

/**
 * Convert UTC date to local timezone date
 */
export function toLocalTime(date: Date | string, timezone?: string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const tz = timezone || getTimezone();
  const offset = parseTimezoneOffset(tz);
  
  // Get the timezone offset in milliseconds
  const offsetMs = offset * 60 * 60 * 1000;
  
  // Create a new date with the timezone offset
  const localDate = new Date(d.getTime() + offsetMs);
  
  return localDate;
}

/**
 * Format date for display - handles timezone conversion
 * The database stores time in GMT+5:30 but sends it as UTC, so we need to convert back
 */
export function formatDateForDisplay(dateValue: Date | string, formatString?: string): { date: string; time: string } {
  const date = dateValue instanceof Date ? dateValue : new Date(String(dateValue));
  
  // The database stores time as GMT+5:30 but it's being sent as UTC
  // So we need to subtract 5.5 hours to get the correct local time
  const adjustedDate = new Date(date.getTime() - (5.5 * 60 * 60 * 1000));
  
  // Format the adjusted date
  const dateStr = adjustedDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: '2-digit', 
    year: 'numeric' 
  });
  const timeStr = adjustedDate.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  return { date: dateStr, time: timeStr };
}
