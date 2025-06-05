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
      user_did: row.user_did,
      cron_expression: row.cron_expression,
      color: row.color,
      active: row.active !== 0,
      last_executed: row.last_executed ? new Date(row.last_executed) : undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
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
      user_did: row.user_did,
      cron_expression: row.cron_expression,
      color: row.color,
      active: row.active !== 0,
      last_executed: row.last_executed ? new Date(row.last_executed) : undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
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
      user_did: row.user_did,
      cron_expression: row.cron_expression,
      color: row.color,
      active: row.active !== 0,
      last_executed: row.last_executed ? new Date(row.last_executed) : undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
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

// FIXED: Single database connection, no nested calls, no manual transactions
export async function updatePostingSchedules(
  userDid: string,
  schedules: ProposedPostingSchedule[]
): Promise<PostingSchedule[]> {
  return await useDatabase(async db => {
    // Use immediate transaction for better concurrency
    await db.run('BEGIN IMMEDIATE');

    try {
      // Delete existing schedules
      await db.run('DELETE FROM posting_schedules WHERE user_did = ?', [userDid]);

      const results: PostingSchedule[] = [];
      
      // Insert new schedules - all within the same connection
      for (const schedule of schedules) {
        const result = await db.run(`
          INSERT INTO posting_schedules (user_did, cron_expression, color, active)
          VALUES (?, ?, ?, ?)
        `, [userDid, schedule.cron_expression, schedule.color, schedule.active]);

        if (!result.lastID) {
          throw new Error('Failed to insert posting schedule');
        }

        results.push({
          id: result.lastID,
          user_did: userDid,
          cron_expression: schedule.cron_expression,
          color: schedule.color,
          active: schedule.active,
          created_at: new Date(),
          updated_at: new Date(),
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

// Alternative bulk upsert version for better performance
export async function updatePostingSchedulesBulk(
  userDid: string,
  schedules: ProposedPostingSchedule[]
): Promise<PostingSchedule[]> {
  return await useDatabase(async db => {
    await db.run('BEGIN IMMEDIATE');

    try {
      // Delete existing schedules
      await db.run('DELETE FROM posting_schedules WHERE user_did = ?', [userDid]);

      if (schedules.length === 0) {
        await db.run('COMMIT');
        return [];
      }

      // Bulk insert using a single SQL statement
      const values = schedules.map(() => '(?, ?, ?, ?)').join(', ');
      const params = schedules.flatMap(s => [userDid, s.cron_expression, s.color, s.active]);
      
      await db.run(`
        INSERT INTO posting_schedules (user_did, cron_expression, color, active)
        VALUES ${values}
      `, params);

      // Get the inserted schedules
      const insertedSchedules = await db.all(
        'SELECT * FROM posting_schedules WHERE user_did = ? ORDER BY id',
        [userDid]
      );

      await db.run('COMMIT');

      return insertedSchedules.map(row => ({
        id: row.id,
        user_did: row.user_did,
        cron_expression: row.cron_expression,
        color: row.color,
        active: row.active !== 0,
        last_executed: row.last_executed ? new Date(row.last_executed) : undefined,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      })) as PostingSchedule[];
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  });
}

// Utility function for single schedule updates
export async function updateSinglePostingSchedule(
  scheduleId: number,
  updates: Partial<Pick<PostingSchedule, 'cron_expression' | 'color' | 'active'>>
): Promise<void> {
  return await useDatabase(async db => {
    const setParts = [];
    const values = [];
    
    if (updates.cron_expression !== undefined) {
      setParts.push('cron_expression = ?');
      values.push(updates.cron_expression);
    }
    
    if (updates.color !== undefined) {
      setParts.push('color = ?');
      values.push(updates.color);
    }
    
    if (updates.active !== undefined) {
      setParts.push('active = ?');
      values.push(updates.active);
    }
    
    if (setParts.length === 0) return;
    
    setParts.push('updated_at = CURRENT_TIMESTAMP');
    values.push(scheduleId);
    
    await db.run(`
      UPDATE posting_schedules 
      SET ${setParts.join(', ')} 
      WHERE id = ?
    `, values);
  });
}
