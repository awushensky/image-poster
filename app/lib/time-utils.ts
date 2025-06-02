export const commonTimezones = [
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

/**
 * Gets the user's timezone from the browser
 * @returns IANA timezone string
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
