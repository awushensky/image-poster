import PostingTimesSelector from '~/components/posting-time-selector';
import { updateUserPostingTimes, getUserPostingTimes } from '~/db/posting-time-database.server';
import type { Route } from './+types/settings.posting-schedule';
import { redirect } from 'react-router';
import { useState } from 'react';
import { requireUser } from '~/lib/session.server';
import { type PostingTime as ComponentPostingTime } from '~/components/posting-time-selector';
import { type PostingTime as DatabasePostingTime } from "~/model/model";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const postingTimes = await getUserPostingTimes(user.did);
  return { postingTimes };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();
  const timesJson = formData.get('posting_times') as string;
  const times = JSON.parse(timesJson);
  
  await updateUserPostingTimes(user.did, times);
  return redirect('/');
}

function ctodPostingTimes(cPostingTimes: ComponentPostingTime[]): DatabasePostingTime[] {
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

function dtocPostingTimes(dPostingTimes: DatabasePostingTime[]): ComponentPostingTime[] {
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

export default function PostingScheduleSettings({ loaderData }: Route.ComponentProps) {
  const [postingTimes, setPostingTimes] = useState(loaderData.postingTimes);
  
  const handleSave = async () => {
    const formData = new FormData();
    formData.append('posting_times', JSON.stringify(postingTimes));
    
    await fetch('/settings/posting-schedule', {
      method: 'POST',
      body: formData
    });
    
    // TODO Navigate back or show success message
  };

  return (
    <div>
      <PostingTimesSelector 
        initialTimes={dtocPostingTimes(postingTimes)}
        onChange={(times) => {setPostingTimes(ctodPostingTimes(times))}}
      />
      <button onClick={handleSave}>Save Schedule</button>
    </div>
  );
}
