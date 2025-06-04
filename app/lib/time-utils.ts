export const commonTimezones: readonly string[] = [
  'America/New_York',
  'America/Chicago',
  'America/Denver', 
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC'
];

export const DAY_LABELS: readonly string[] = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_NAMES: readonly string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Gets the user's timezone from the browser
 * @returns IANA timezone string
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
