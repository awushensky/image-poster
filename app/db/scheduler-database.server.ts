import type { QueuedImage } from "~/model/model";
import { useDatabase } from "./database.server";

/**
 * Process a complete image posting operation atomically
 * This includes: moving image from queue to posted, reordering queue, and updating schedule
 */
export async function processImagePosting(
  userDid: string,
  storageKey: string,
): Promise<void> {
  return await useDatabase(async db => {
    await db.run('BEGIN IMMEDIATE');
    
    try {
      // Create posted image entry
      await db.run(`
        INSERT INTO posted_images (user_did, storage_key)
        VALUES (?, ?)
      `, [userDid, storageKey]);
      
      // Get the order of the image we're deleting for reordering
      const imageToDelete = await db.get(
        'SELECT queue_order FROM queued_images WHERE user_did = ? AND storage_key = ?',
        [userDid, storageKey]
      ) as {queue_order: number} | undefined;
      
      if (!imageToDelete) {
        throw new Error(`Image not found in queue: ${storageKey}`);
      }
      
      // Delete from queue
      await db.run(
        'DELETE FROM queued_images WHERE user_did = ? AND storage_key = ?',
        [userDid, storageKey]
      );
      
      // Reorder remaining images to fill the gap
      await db.run(`
        UPDATE queued_images
        SET queue_order = queue_order - 1
        WHERE user_did = ? AND queue_order > ?
      `, [userDid, imageToDelete.queue_order]);
      
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  });
}

/**
 * Get next image to post for a user (scheduler-specific version)
 * This is a direct database query for better performance in scheduler context
 */
export async function getNextImageToPostForUserDirect(userDid: string): Promise<QueuedImage | undefined> {
  return await useDatabase(async db => {
    const image = await db.get(`
      SELECT qi.*
      FROM queued_images qi
      WHERE qi.user_did = ?
      ORDER BY qi.queue_order ASC
      LIMIT 1
    `, [userDid]) as QueuedImage | undefined;
    
    return image;
  });
}

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
