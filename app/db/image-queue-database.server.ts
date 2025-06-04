import type { QueuedImage } from "~/model/model";
import { ensureDatabase } from "./database.server";
import { getMutex } from "~/lib/mutex";


const MUTEX_PURPOSE = 'image-queue';

export async function createImageQueueEntry(
  userDid: string,
  storageKey: string,
  postText: string
): Promise<QueuedImage> {
  return getMutex(MUTEX_PURPOSE, userDid).runExclusive(async () => {
    console.log('Got mutex for user:', userDid);
    const db = await ensureDatabase();
    
    await db.run('BEGIN TRANSACTION');

    try {
      const result = await db.get(
        'SELECT MAX(queue_order) as max_order FROM queued_images WHERE user_did = ?',
        [userDid]
      ) as { max_order: number | null };
      const nextOrder = (result.max_order || 0) + 1;
      
      await db.run(`
        INSERT INTO queued_images (user_did, storage_key, post_text, queue_order)
        VALUES (?, ?, ?, ?)
      `, [userDid, storageKey, postText, nextOrder]);
      
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
    
    return await readImageQueueEntry(userDid, storageKey);
  });
}

export async function readImageQueueEntry(userDid: string, storageKey: string): Promise<QueuedImage> {
  const db = await ensureDatabase();
  const image = await db.get(
    'SELECT * FROM queued_images WHERE user_did = ? AND storage_key = ?',
    [userDid, storageKey]
  );

  if (!image) {
    throw new Error('Image not found in queue');
  }
  
  return image;
}

export async function updateImageQueueEntry(
  userDid: string,
  storageKey: string,
  updates: Partial<Pick<QueuedImage, 'post_text' | 'is_nsfw'>>
): Promise<void> {
  return getMutex(MUTEX_PURPOSE, userDid).runExclusive(async () => {
    const db = await ensureDatabase();
    
    const setParts = [];
    const values = [];
    
    if (updates.post_text !== undefined) {
      setParts.push('post_text = ?');
      values.push(updates.post_text);
    }
    
    if (updates.is_nsfw !== undefined) {
      setParts.push('is_nsfw = ?');
      values.push(updates.is_nsfw);
    }
    
    if (setParts.length === 0) return;
    
    values.push(userDid, storageKey);
    
    await db.run(`
      UPDATE queued_images 
      SET ${setParts.join(', ')} 
      WHERE user_did = ? AND storage_key = ?
    `, values);
  });
}

export async function getImageQueueForUser(userDid: string): Promise<QueuedImage[]> {
  const db = await ensureDatabase();
  return await db.all(
    'SELECT * FROM queued_images WHERE user_did = ? ORDER BY queue_order ASC',
    [userDid]
  );
}

export async function reorderImageInQueue(
  userDid: string,
  sourceImageStorageKey: string,
  destinationOrder: number,
): Promise<void> {
  return getMutex(MUTEX_PURPOSE, userDid).runExclusive(async () => {
    const db = await ensureDatabase();
    
    await db.run('BEGIN TRANSACTION');
    
    try {
      const currentImage = await db.get(
        'SELECT * FROM queued_images WHERE user_did = ? AND storage_key = ?',
        [userDid, sourceImageStorageKey]
      ) as QueuedImage;
      
      if (!currentImage) {
        throw new Error('Image not found');
      }

      const sourceOrder = currentImage.queue_order;
      if (sourceOrder === destinationOrder) return;

      // Move source image to temporary position
      const tempOrder = Date.now() * -1;
      await db.run(`
        UPDATE queued_images
        SET queue_order = ?
        WHERE user_did = ? AND storage_key = ?
      `, [tempOrder, userDid, currentImage.storage_key]);
      
      if (destinationOrder < sourceOrder) {
        // Moving left: shift from sourceOrder-1 down to destinationOrder (shift right)
        // Process from highest to lowest to avoid conflicts
        for (let pos = sourceOrder - 1; pos >= destinationOrder; pos--) {
          await db.run(`
            UPDATE queued_images
            SET queue_order = queue_order + 1
            WHERE user_did = ? AND queue_order = ?
          `, [userDid, pos]);
        }
      } else {
        // Moving right: shift from sourceOrder+1 up to destinationOrder (shift left)  
        // Process from lowest to highest to avoid conflicts
        for (let pos = sourceOrder + 1; pos <= destinationOrder; pos++) {
          await db.run(`
            UPDATE queued_images
            SET queue_order = queue_order - 1
            WHERE user_did = ? AND queue_order = ?
          `, [userDid, pos]);
        }
      }
      
      // Move source image to final destination
      await db.run(`
        UPDATE queued_images
        SET queue_order = ?
        WHERE user_did = ? AND storage_key = ?
      `, [destinationOrder, userDid, currentImage.storage_key]);
      
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  });
}

export async function deleteFromImageQueue(userDid: string, storageKey: string): Promise<void> {
  return getMutex(MUTEX_PURPOSE, userDid).runExclusive(async () => {
    const db = await ensureDatabase();
    
    await db.run('BEGIN TRANSACTION');
    
    try {
      const imageToDelete = await db.get(
        'SELECT * FROM queued_images WHERE user_did = ? AND storage_key = ?',
        [userDid, storageKey]
      ) as QueuedImage;
      
      if (!imageToDelete) {
        throw new Error('Image not found');
      }
      
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

export async function getNextImageToPostForUser(userDid: string): Promise<QueuedImage | undefined> {
  const db = await ensureDatabase();
  
  return await db.get(`
    SELECT qi.*
    FROM queued_images qi
    WHERE qi.user_did = ?
    ORDER BY qi.queue_order ASC
    LIMIT 1
  `, [userDid]);
}
