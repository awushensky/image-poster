import PostingTimesSelector from '~/components/posting-time-selector';
import { updateUserPostingTimes, getUserPostingTimes } from '~/db/posting-time-database.server';
import type { Route } from './+types/settings.posting-schedule';
import { redirect } from 'react-router';
import { useState } from 'react';
import { requireUser } from '~/lib/session.server';

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
        initialTimes={postingTimes}
        onChange={setPostingTimes}
      />
      <button onClick={handleSave}>Save Schedule</button>
    </div>
  );
}
