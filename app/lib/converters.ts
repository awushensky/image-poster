import { type PostingTime as ComponentPostingTime } from "~/components/posting-time-selector";
import { type PostingTime as DatabasePostingTime } from '~/model/model';


export function ctodPostingTimes(cPostingTimes: ComponentPostingTime[]): DatabasePostingTime[] {
  return cPostingTimes.flatMap((cPostingTime) => {
    let days = cPostingTime.days;
    if (!days || days.length === 0) {
      days = [0, 1, 2, 3, 4, 5, 6];
    }

    return days.map((day) => {
      return {
        hour: cPostingTime.hour,
        minute: cPostingTime.minute,
        day_of_week: day,
      };
    });
  });
}

export function dtocPostingTimes(dPostingTimes: DatabasePostingTime[]): ComponentPostingTime[] {
  if (dPostingTimes.length === 0) {
    return [];
  }

  const map = new Map<string, { hour: number; minute: number; days: number[] }>();
  for (const time of dPostingTimes) {
    const key = `${time.hour}:${time.minute}`;
    if (!map.has(key)) {
      map.set(key, { hour: time.hour, minute: time.minute, days: [] });
    }
    map.get(key)!.days.push(time.day_of_week);
  }

  return Array.from(map.values()).map(({ hour, minute, days }) => ({
    hour,
    minute,
    days,
  }));
}
