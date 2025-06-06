import type { PostingSchedule, ProposedPostingSchedule } from "~/model/model";
import { useDatabase } from "./database.server";
import type { ColorType } from "~/lib/color-utils";

interface PostingScheduleRow {
  id: number;
  user_did: string;
  cron_expression: string;
  color: ColorType;
  active: number;
  last_executed?: string;
  created_at: string;
  updated_at: string;
}

interface PostingScheduleWithTimezoneRow extends PostingScheduleRow {
  timezone: string;
}

function transformPostingScheduleRow(row: PostingScheduleRow): PostingSchedule {
  return {
    id: row.id,
    userDid: row.user_did,
    cronExpression: row.cron_expression,
    color: row.color as ColorType,
    active: Boolean(row.active),
    lastExecuted: row.last_executed ? new Date(row.last_executed) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function transformPostingScheduleWithTimezoneRow(row: PostingScheduleWithTimezoneRow): PostingSchedule & { timezone: string } {
  return {
    ...transformPostingScheduleRow(row),
    timezone: row.timezone
  };
}

export async function getUserPostingSchedules(userDid: string): Promise<PostingSchedule[]> {
  return await useDatabase(async db => {
    const rows: PostingScheduleRow[] = await db.all(
      'SELECT * FROM posting_schedules WHERE user_did = ? ORDER BY created_at',
      [userDid]
    );

    return rows.map(row => transformPostingScheduleRow(row));
  });
}

export async function getAllActivePostingSchedulesWithTimezone(): Promise<(PostingSchedule & { timezone: string })[]> {
  return await useDatabase(async db => {
    const rows: PostingScheduleWithTimezoneRow[] = await db.all(`
      SELECT 
        ps.*,
        u.timezone
      FROM posting_schedules ps
      JOIN users u ON ps.user_did = u.did
      WHERE ps.active = TRUE
      ORDER BY ps.id
    `);

    return rows.map(row => transformPostingScheduleWithTimezoneRow(row));
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

    const insertedRow: PostingScheduleRow | undefined = await db.get(
      'SELECT * FROM posting_schedules WHERE id = ?',
      [result.lastID]
    );

    return transformPostingScheduleRow(insertedRow!);
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

      // Not using a map so that these run sequentially
      const results: PostingSchedule[] = [];
      for (const schedule of schedules) {
        const result = await db.run(`
          INSERT INTO posting_schedules (user_did, cron_expression, color, active)
          VALUES (?, ?, ?, ?)
        `, [userDid, schedule.cronExpression, schedule.color, schedule.active]);

        if (!result.lastID) {
          throw new Error('Failed to insert posting schedule');
        }

        const insertedRow: PostingScheduleRow | undefined = await db.get(
          'SELECT * FROM posting_schedules WHERE id = ?',
          [result.lastID]
        );

        results.push(transformPostingScheduleRow(insertedRow!));
      }

      await db.run('COMMIT');
      return results;
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  });
}
