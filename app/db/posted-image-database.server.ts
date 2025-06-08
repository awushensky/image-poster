import type { QueuedImage } from "~/model/queued-images";
import type { PostedImage } from "~/model/posted-images";
import { useDatabase } from "./database.server";


interface PostedImageRow {
  storage_key: string;
  user_did: string;
  post_text: string;
  is_nsfw: number;
  created_at: string;
}

function transformPostedImageRow(row: PostedImageRow): PostedImage {
  return {
    storageKey: row.storage_key,
    userDid: row.user_did,
    postText: row.post_text,
    isNsfw: Boolean(row.is_nsfw),
    createdAt: new Date(row.created_at),
  };
}

export async function readPostedImageEntry(
  userDid: string,
  storageKey: string,
): Promise<PostedImage | undefined> {
  return await useDatabase(async db => {
    const row: PostedImageRow | undefined = await db.get(
      'SELECT * FROM posted_images WHERE user_did = ? AND storage_key = ?',
      [userDid, storageKey]);

    return row ? transformPostedImageRow(row) : undefined;
  });
}

export async function readPostedImageEntries(
  userDid: string,
): Promise<PostedImage[]> {
  return await useDatabase(async db => {
    const rows: PostedImageRow[] = await db.all(`
      SELECT * FROM posted_images 
      WHERE user_did = ? 
      ORDER BY created_at DESC
    `, [userDid]);
    
    return rows.map(row => transformPostedImageRow(row));
  });
}

export async function readPostedImageEntriesCount(
  userDid: string,
): Promise<number> {
  return await useDatabase(async db => {
    const row: ({ count: number } | undefined) = await db.get(`
      SELECT count(1) as count FROM posted_images WHERE user_did = ?`,
      [userDid]
    )

    return row?.count || 0;
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
