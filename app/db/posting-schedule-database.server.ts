import type { PostingSchedule, ProposedPostingSchedule } from "~/model/model";
import { ensureDatabase } from './database.server';
import { getMutex } from "~/lib/mutex";


const MUTEX_PURPOSE = 'posting-schedule';

export async function getUserPostingSchedules(userDid: string): Promise<PostingSchedule[]> {
  const db = await ensureDatabase();
  const rows = await db.all(
    'SELECT * FROM posting_schedules WHERE user_did = ? ORDER BY created_at',
    [userDid]
  );

  return rows.map(row => ({
    id: row.id,
    user_did: row.user_did,
    cron_expression: row.cron_expression,
    color: row.color,
    active: row.active !== 0,
    last_executed: row.last_executed ? new Date(row.last_executed) : undefined,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  })) as PostingSchedule[];
}

export async function getAllActivePostingSchedules(): Promise<(PostingSchedule & { timezone: string })[]> {
  const db = await ensureDatabase();
  return await db.all(`
    SELECT 
      ps.*,
      u.timezone
    FROM posting_schedules ps
    JOIN users u ON ps.user_did = u.did
    WHERE ps.active = TRUE
    ORDER BY ps.id
  `) as (PostingSchedule & { timezone: string })[];
}

async function addPostingSchedule(
  userDid: string,
  schedule: ProposedPostingSchedule
): Promise<PostingSchedule> {
  const db = await ensureDatabase();
  const result = await db.run(`
    INSERT INTO posting_schedules (user_did, cron_expression, color, active)
    VALUES (?, ?, ?, ?)
  `, [userDid, schedule.cron_expression, schedule.color, schedule.active]);

  if (!result.lastID) {
    throw new Error('Failed to insert posting schedule');
  }

  return {
    id: result.lastID,
    user_did: userDid,
    cron_expression: schedule.cron_expression,
    color: schedule.color,
    active: schedule.active,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

export async function updateScheduleLastExecuted(scheduleId: number) {
  const db = await ensureDatabase();
  await db.run(`
    UPDATE posting_schedules 
    SET last_executed = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [scheduleId]);
}

export async function updatePostingSchedules(
  userDid: string,
  schedules: ProposedPostingSchedule[]
): Promise<PostingSchedule[]> {
  return getMutex(MUTEX_PURPOSE, userDid).runExclusive(async () => {
    const db = await ensureDatabase();
    await db.run('BEGIN TRANSACTION');

    try {
      await db.run('DELETE FROM posting_schedules WHERE user_did = ?', [userDid]);

      let results: PostingSchedule[] = [];
      for (const schedule of schedules) {
        results.push(await addPostingSchedule(userDid, schedule));
      }

      await db.run('COMMIT');
      return results;
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  });
}
