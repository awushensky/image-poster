import type { QueuedImage } from "~/model/model";
import { useDatabase } from "./database.server";

/**
 * Batch operation: Check for images and update schedule if none available
 * Returns the next image if available, or null if none and schedule was updated
 */
export async function getNextImageOrUpdateSchedule(
  userDid: string, 
  scheduleId: number
): Promise<QueuedImage | undefined> {
  return await useDatabase(async db => {
    await db.run(`
      UPDATE posting_schedules 
      SET last_executed = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [scheduleId]);

    return await db.get(`
      SELECT qi.*
      FROM queued_images qi
      WHERE qi.user_did = ?
      ORDER BY qi.queue_order ASC
      LIMIT 1
    `, [userDid]) as QueuedImage | undefined;
  });
}
