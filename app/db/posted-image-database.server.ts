import type { PostedImage, QueuedImage } from "~/model/model";
import { useDatabase } from "./database.server";


export async function readPostedImageEntries(
  userDid: string,
): Promise<PostedImage[]> {
  return await useDatabase(async db => {
    return await db.all(`
      SELECT * FROM posted_images 
      WHERE user_did = ? 
      ORDER BY created_at DESC
    `, [userDid]) as PostedImage[];
  });
}

/**
 * Move an image from the posting queue to the posted list
 */
export async function moveImageToPosted(
  userDid: string,
  image: QueuedImage
): Promise<void> {
  return await useDatabase(async (db) => {
    await db.run('BEGIN IMMEDIATE');

    try {
      // Create posted image entry
      await db.run(`
        INSERT INTO posted_images (user_did, storage_key, post_text, is_nsfw)
        VALUES (?, ?, ?, ?)
      `, [userDid, image.storageKey, image.postText, image.isNsfw]);

      // Get the order of the image we're deleting for reordering
      const imageToDelete = await db.get(
        'SELECT queue_order FROM queued_images WHERE user_did = ? AND storage_key = ?',
        [userDid, image.storageKey]
      ) as { queue_order: number; } | undefined;

      if (!imageToDelete) {
        throw new Error(`Image not found in queue: ${image.storageKey}`);
      }

      // Delete from queue
      await db.run(
        'DELETE FROM queued_images WHERE user_did = ? AND storage_key = ?',
        [userDid, image.storageKey]
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
