import type { ProposedPostingSchedule } from "~/model/posting-schedule";
import type { PostingSchedule } from "~/model/posting-schedule";
import type { ApiResult } from "./api";


export interface PostingScheduleUpdateResult extends ApiResult {
  schedules?: PostingSchedule[];
}

export interface PostingScheduleGetResult extends ApiResult {
  schedules?: PostingSchedule[];
}

function parsePostingSchedule(raw: any): PostingSchedule {
  return {
    ...raw,
    lastExecuted: raw.lastExecuted ? new Date(raw.lastExecuted) : undefined,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

export async function fetchPostingSchedules(): Promise<PostingSchedule[]> {
  const response = await fetch('/api/posting-schedules');
  if (!response.ok) {
    throw new Error('Failed to fetch schedules');
  }

  const data = await response.json() as PostingScheduleGetResult;
  if (!data.success) {
    throw new Error(data.error || 'Failed to load schedules');
  }

  return (data.schedules || []).map(parsePostingSchedule);
}

export async function updatePostingSchedules(updatedSchedules: ProposedPostingSchedule[]): Promise<PostingSchedule[]> {
  const response = await fetch('/api/posting-schedules', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ schedules: updatedSchedules }),
  });

  const result = await response.json() as PostingScheduleUpdateResult;
  if (!result.success) {
    throw new Error(result.error || 'Failed to update schedules');
  }

  return result.schedules || [];
}
