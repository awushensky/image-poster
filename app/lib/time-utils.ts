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

export function formatRelativeTime(date?: Date, referenceDate: Date = new Date()) {
  if (!date) return 'Not scheduled';
  
  const diffMs = date.getTime() - referenceDate.getTime();
  const absDiffMs = Math.abs(diffMs);
  const isPast = diffMs < 0;
  
  if (absDiffMs < 1000) {
    return 'now';
  }
  
  const seconds = Math.floor(absDiffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const refDateOnly = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const daysDiff = Math.floor((dateOnly.getTime() - refDateOnly.getTime()) / (1000 * 60 * 60 * 24));
  const absDaysDiff = Math.abs(daysDiff);

  if (seconds < 60) {
    const unit = seconds === 1 ? 'second' : 'seconds';
    return isPast ? `${seconds} ${unit} ago` : `in ${seconds} ${unit}`;
  } else if (minutes < 60) {
    const unit = minutes === 1 ? 'minute' : 'minutes';
    return isPast ? `${minutes} ${unit} ago` : `in ${minutes} ${unit}`;
  } else if (absDaysDiff === 0) {
    const unit = hours === 1 ? 'hour' : 'hours';
    return isPast ? `${hours} ${unit} ago` : `in ${hours} ${unit}`;
  } else if (absDaysDiff === 1) {
    return isPast ? 'yesterday' : 'tomorrow';
  } else if (absDaysDiff < 7) {
    const unit = absDaysDiff === 1 ? 'day' : 'days';
    return isPast ? `${absDaysDiff} ${unit} ago` : `in ${absDaysDiff} ${unit}`;
  } else {
    const weeks = Math.floor(absDaysDiff / 7);
    const unit = weeks === 1 ? 'week' : 'weeks';
    return isPast ? `${weeks} ${unit} ago` : `in ${weeks} ${unit}`;
  }
}
