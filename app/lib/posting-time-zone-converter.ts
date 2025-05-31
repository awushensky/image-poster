import { type PostingTime } from '~/model/model';

/**
 * Converts a local time to UTC, handling day rollover
 * @param hour - Local hour (0-23)
 * @param minute - Local minute (0-59)
 * @param dayOfWeek - Local day of week (0=Sunday, 1=Monday, etc.)
 * @param timezone - IANA timezone string (e.g., 'America/New_York', 'Europe/London')
 * @returns PostingTime object with UTC hour, minute, and adjusted day_of_week
 */
function convertLocalTimeToUTC(
  hour: number,
  minute: number,
  dayOfWeek: number,
  timezone: string
): PostingTime {
  // Create a date for the next occurrence of this day/time in the specified timezone
  const now = new Date();
  const currentDay = now.getDay();
  
  // Calculate days until the target day
  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil < 0) {
    daysUntil += 7;
  }
  
  // Create a date object for the local time
  const localDate = new Date();
  localDate.setDate(localDate.getDate() + daysUntil);
  localDate.setHours(hour, minute, 0, 0);
  
  // Create a date in the specified timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Get the local time components and create a proper local date
  const parts = formatter.formatToParts(localDate);
  const localYear = parseInt(parts.find(p => p.type === 'year')?.value || '');
  const localMonth = parseInt(parts.find(p => p.type === 'month')?.value || '') - 1;
  const localDay = parseInt(parts.find(p => p.type === 'day')?.value || '');
  const localHour = parseInt(parts.find(p => p.type === 'hour')?.value || '');
  const localMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '');
  
  // Create a date that represents the exact local time in the given timezone
  const targetLocalDate = new Date();
  targetLocalDate.setFullYear(localYear, localMonth, localDay);
  targetLocalDate.setHours(hour, minute, 0, 0);
  
  // Calculate the timezone offset for this specific date/time
  const utcTime = new Date(targetLocalDate.getTime());
  
  // Use a more reliable method to get timezone offset
  const tempDate = new Date();
  tempDate.setFullYear(localYear, localMonth, localDay);
  tempDate.setHours(hour, minute, 0, 0);
  
  // Get UTC time by using the timezone offset
  const utcDate = new Date(tempDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const localDateInTimezone = new Date(tempDate.toLocaleString('en-US', { timeZone: timezone }));
  
  const offsetMs = localDateInTimezone.getTime() - utcDate.getTime();
  const utcTimestamp = tempDate.getTime() - offsetMs;
  const finalUtcDate = new Date(utcTimestamp);
  
  return {
    hour: finalUtcDate.getUTCHours(),
    minute: finalUtcDate.getUTCMinutes(),
    day_of_week: finalUtcDate.getUTCDay()
  };
}

/**
 * Converts UTC time back to local time for display
 * @param hour - UTC hour (0-23)
 * @param minute - UTC minute (0-59)
 * @param dayOfWeek - UTC day of week (0=Sunday, 1=Monday, etc.)
 * @param timezone - IANA timezone string
 * @returns PostingTime object with local hour, minute, and day_of_week
 */
function convertUTCTimeToLocal(
  hour: number,
  minute: number,
  dayOfWeek: number,
  timezone: string
): PostingTime {
  // Create a UTC date
  const utcDate = new Date();
  const currentDay = utcDate.getUTCDay();
  
  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil < 0) {
    daysUntil += 7;
  }
  
  utcDate.setUTCDate(utcDate.getUTCDate() + daysUntil);
  utcDate.setUTCHours(hour, minute, 0, 0);
  
  // Convert to local timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(utcDate);
  const localHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const localMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  
  // Get the local date to determine day of week
  const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
  
  return {
    hour: localHour,
    minute: localMinute,
    day_of_week: localDate.getDay()
  };
}

/**
 * Converts multiple local posting times to UTC
 * @param postingTimes - Array of local posting times
 * @param timezone - IANA timezone string
 * @returns Array of UTC posting times
 */
export function convertPostingTimesToUTC(
  postingTimes: PostingTime[],
  timezone: string
): PostingTime[] {
  return postingTimes.map(time => 
    convertLocalTimeToUTC(time.hour, time.minute, time.day_of_week, timezone)
  );
}

/**
 * Converts multiple UTC posting times to local
 * @param postingTimes - Array of UTC posting times
 * @param timezone - IANA timezone string
 * @returns Array of local posting times
 */
export function convertPostingTimesToLocal(
  postingTimes: PostingTime[],
  timezone: string
): PostingTime[] {
  return postingTimes.map(time =>
    convertUTCTimeToLocal(time.hour, time.minute, time.day_of_week, timezone)
  )
}

/**
 * Gets the user's timezone from the browser
 * @returns IANA timezone string
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
