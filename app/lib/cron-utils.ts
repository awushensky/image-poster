import { CronExpressionParser } from 'cron-parser';
import { dayNames } from './time-utils';

/**
 * Validate a cron expression
 * @param cronExpression the cron expression to validate
 * @returns a boolean indicating whether the cron expression is valid
 */
export function validateCron(cronExpression: string): boolean {
  try {
    CronExpressionParser.parse(cronExpression);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Convert time and days to cron expression
 * @param hour the hour of the day (0-23)
 * @param minute the minute of the hour (0-59)
 * @param days an array of selected days (0-6, where 0 is Sunday)
 * @returns a cron expression string
 */
export function timeToCron(hour: number, minute: number, days: number[]): string {
  if (days.length === 0) {
    throw new Error('At least one day must be selected');
  }

  const daysCron = days.length === 7 ? '*' : days.join(',');
  return `${minute} ${hour} * * ${daysCron}`;
}

/**
 * Convert a cron expression to its time components
 * @param cron the cron expression to convert
 * @returns an object containing the hour, minute, and days
 */
export function cronToTime(cron: string): { hour: number; minute: number, day_of_week: number }[] {
  if (!validateCron(cron)) {
    throw new Error('Invalid cron expression');
  }
  const parts = cron.split(' ');
  const minute = parseInt(parts[0], 10);
  const hour = parseInt(parts[1], 10);
  const days = cronToDays(cron);

  return days.map(day => ({
    hour,
    minute,
    day_of_week: day,
  }));
}

/**
 * Parse a cron expression to a human-readable description
 * @param cron the cron expression to parse
 * @returns a human-readable description of the cron expression
 */
export function cronToDescription(cron: string): string {
  if (!validateCron(cron)) {
    throw new Error('Invalid cron expression');
  }

  const parts = cron.split(' ');
  const minute = parts[0];
  const hour = parts[1];
  
  const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  const days = cronToDays(cron).map(day => dayNames[day]);
  
  if (days.length === 5 && days.every(day => !['Saturday', 'Sunday'].includes(day))) {
    return `Weekdays at ${time}`;
  }
  if (days.length === 2 && days.every(day => ['Saturday', 'Sunday'].includes(day))) {
    return `Weekends at ${time}`;
  }
  
  return `${days.join(', ')} at ${time}`;
}

export function cronToDays(cron: string): number[] {
  if (!validateCron(cron)) {
    throw new Error('Invalid cron expression');
  }

  const dayOfWeek = cron.split(' ')[4];
  if (dayOfWeek === '*') {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  return dayOfWeek.split(',').map(d => parseInt(d));
}

/**
 * Get the next N execution times for a cron expression
 * @param cronExpression the cron expression to evaluate
 * @param timezone the timezone in which to evaluate the cron expression
 * @param count the number of next execution times to return
 * @returns an array of Date objects representing the next execution times
 */
export function getNextExecutions(
  cronExpression: string,
  timezone: string,
  count: number,
): Date[] {
  try {
    const interval = CronExpressionParser.parse(cronExpression, { tz: timezone });
    return interval.take(count).map(cronDate => cronDate.toDate());
  } catch (error) {
    console.error('Error calculating next executions:', error);
    return [];
  }
}

/**
 * Get the next N execution times for multiple cron schedules
 * @param schedules an array of cron expressions to evaluate
 * @param timezone the timezone in which to evaluate the cron expressions
 * @param count the number of next execution times to return across all schedules
 * @returns an array of Date objects representing the next execution times across all schedules
 */
export function getNextExecutionsForMultipleSchedules(
  schedules: string[],
  timezone: string,
  count: number,
): Date[] | undefined {
  if (!schedules || schedules.length === 0) {
    return undefined;
  }

  const crons = schedules.map(schedule => CronExpressionParser.parse(schedule, { tz: timezone }));
  const nextOccurrences = crons.map((cron, index) => { return { index, nextDate: cron.next() }; });
  
  const results: Date[] = [];
  for (let i = 0; i < count; i++) {
    nextOccurrences.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
    const { index, nextDate } = nextOccurrences[0];

    results.push(nextDate.toDate());
    nextOccurrences[0].nextDate = crons[index].next();
  }

  return results;
}
