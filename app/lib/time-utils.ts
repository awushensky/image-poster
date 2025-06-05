export const commonTimezones: readonly string[] = [
  'America/New_York',
  'America/Chicago',
  'America/Denver', 
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Etc/UTC'
];

export const DAY_LABELS: readonly string[] = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_NAMES: readonly string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_NAMES_SHORT: readonly string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Gets the user's timezone from the browser
 * @returns IANA timezone string
 */
export function getUserTimezone(): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!commonTimezones.includes(timezone)) {
    console.warn(`Unsupported timezone: ${timezone}. Defaulting to Etc/UTC.`);
    return 'Etc/UTC';
  }
  return timezone;
}

export function getCurrentTimeInTimezone(time: Date, timezone: string): { hours: number; minutes: number; dayOfWeek: number } {
  const timeInTimezone = new Date(time.toLocaleString("en-US", {timeZone: timezone}));

  return {
    hours: timeInTimezone.getHours(),
    minutes: timeInTimezone.getMinutes(),
    dayOfWeek: timeInTimezone.getDay()
  };
}

export function formatTime(hour: number, minute: number): string {
  const displayHour = hour.toString().padStart(2, '0');
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute}`;
};
