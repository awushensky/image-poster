import type { CronSchedule, ProposedCronSchedule } from "~/model/model";
import { ensureDatabase } from './database.server';


export async function getUserPostingSchedules(userDid: string): Promise<CronSchedule[]> {
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
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  })) as CronSchedule[];
}

export async function addPostingSchedule(
  userDid: string,
  schedule: ProposedCronSchedule
): Promise<CronSchedule> {
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

export async function updatePostingSchedule(
  userDid: string,
  scheduleId: number,
  schedule: Partial<ProposedCronSchedule>
): Promise<CronSchedule> {
  const db = await ensureDatabase();

  const existing = await db.get('SELECT * FROM posting_schedules WHERE id = ? AND user_did = ?', [scheduleId, userDid]) as CronSchedule;
  if (!existing) {
    throw new Error('Posting schedule not found');
  }

  const updatedSchedule = {
    ...existing,
    ...schedule,
  };

  const result = await db.run(`
    UPDATE posting_schedules
    SET cron_expression = ?,
        color = ?,
        active = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_did = ?
  `, [
    updatedSchedule.cron_expression,
    updatedSchedule.color,
    updatedSchedule.active ? 1 : 0,
    scheduleId,
    userDid
  ]);

  if (!result.lastID) {
    throw new Error('Failed to insert posting schedule');
  }

  return await db.get(`
    SELECT id, user_did, cron_expression, color, active, created_at, updated_at
    FROM posting_schedules
    WHERE id = ? AND user_did = ?
  `, [scheduleId, userDid]) as CronSchedule;
}

export async function updatePostingSchedules(
  userDid: string,
  schedules: ProposedCronSchedule[]
): Promise<CronSchedule[]> {
  const db = await ensureDatabase();
  db.run('BEGIN TRANSACTION');

  try {
    await db.run('DELETE FROM posting_schedules WHERE user_did = ?', [userDid]);

    let results: CronSchedule[] = [];
    for (const schedule of schedules) {
      results.push(await addPostingSchedule(userDid, schedule));
    }

    await db.run('COMMIT');
    return results;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

export async function deletePostingSchedule(userDid: string, scheduleId: number): Promise<number | undefined> {
  const db = await ensureDatabase();
  const result = await db.run('DELETE FROM posting_schedules WHERE user_did = ? and id = ?', [userDid, scheduleId]);
  return result.lastID
}
