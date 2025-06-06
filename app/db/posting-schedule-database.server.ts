import type { PostingSchedule, ProposedPostingSchedule } from "~/model/model";
import { useDatabase } from "./database.server";

export async function getUserPostingSchedules(userDid: string): Promise<PostingSchedule[]> {
  return await useDatabase(async db => {
    const rows = await db.all(
      'SELECT * FROM posting_schedules WHERE user_did = ? ORDER BY created_at',
      [userDid]
    );

    return rows.map(row => ({
      id: row.id,
      userDid: row.user_did,
      cronExpression: row.cron_expression,
      color: row.color,
      active: row.active !== 0,
      lastExecuted: row.last_executed ? new Date(row.last_executed) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    })) as PostingSchedule[];
  });
}

export async function getAllActivePostingSchedules(): Promise<(PostingSchedule & { timezone: string })[]> {
  return await useDatabase(async db => {
    const rows = await db.all(`
      SELECT 
        ps.*,
        u.timezone
      FROM posting_schedules ps
      JOIN users u ON ps.user_did = u.did
      WHERE ps.active = TRUE
      ORDER BY ps.id
    `);

    return rows.map(row => ({
      id: row.id,
      userDid: row.user_did,
      cronExpression: row.cron_expression,
      color: row.color,
      active: row.active !== 0,
      lastExecuted: row.last_executed ? new Date(row.last_executed) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      timezone: row.timezone
    })) as (PostingSchedule & { timezone: string })[];
  });
}

export async function getAllActivePostingSchedulesWithTimezone(): Promise<(PostingSchedule & { timezone: string })[]> {
  return await useDatabase(async db => {
    const rows = await db.all(`
      SELECT 
        ps.*,
        u.timezone
      FROM posting_schedules ps
      JOIN users u ON ps.user_did = u.did
      WHERE ps.active = TRUE
      ORDER BY ps.id
    `);

    return rows.map(row => ({
      id: row.id,
      userDid: row.user_did,
      cronExpression: row.cron_expression,
      color: row.color,
      active: row.active !== 0,
      lastExecuted: row.last_executed ? new Date(row.last_executed) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      timezone: row.timezone
    })) as (PostingSchedule & { timezone: string })[];
  });
}

// Batch update multiple schedules' last_executed timestamps
export async function updateMultipleSchedulesLastExecuted(scheduleIds: number[]): Promise<void> {
  if (scheduleIds.length === 0) return;
  
  return await useDatabase(async db => {
    const placeholders = scheduleIds.map(() => '?').join(',');
    await db.run(`
      UPDATE posting_schedules 
      SET last_executed = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders})
    `, scheduleIds);
  });
}

export async function addPostingSchedule(
  userDid: string,
  schedule: ProposedPostingSchedule
): Promise<PostingSchedule> {
  return await useDatabase(async db => {
    const result = await db.run(`
      INSERT INTO posting_schedules (user_did, cron_expression, color, active)
      VALUES (?, ?, ?, ?)
    `, [userDid, schedule.cronExpression, schedule.color, schedule.active]);

    if (!result.lastID) {
      throw new Error('Failed to insert posting schedule');
    }

    return {
      ...schedule,
      id: result.lastID,
      userDid: userDid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });
}

export async function updateScheduleLastExecuted(scheduleId: number): Promise<void> {
  await useDatabase(async db => {
    await db.run(`
      UPDATE posting_schedules 
      SET last_executed = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [scheduleId]);
  });
}

export async function updatePostingSchedules(
  userDid: string,
  schedules: ProposedPostingSchedule[]
): Promise<PostingSchedule[]> {
  return await useDatabase(async db => {
    await db.run('BEGIN IMMEDIATE');

    try {
      await db.run('DELETE FROM posting_schedules WHERE user_did = ?', [userDid]);

      const results: PostingSchedule[] = [];
      for (const schedule of schedules) {
        const result = await db.run(`
          INSERT INTO posting_schedules (user_did, cron_expression, color, active)
          VALUES (?, ?, ?, ?)
        `, [userDid, schedule.cronExpression, schedule.color, schedule.active]);

        if (!result.lastID) {
          throw new Error('Failed to insert posting schedule');
        }

        results.push({
          id: result.lastID,
          userDid: userDid,
          cronExpression: schedule.cronExpression,
          color: schedule.color,
          active: schedule.active,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await db.run('COMMIT');
      return results;
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  });
}
