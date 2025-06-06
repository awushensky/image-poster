import type { QueuedImage } from "~/model/model";
import { useDatabase } from "./database.server";
import { getMutex } from "~/lib/mutex";


const MUTEX_PURPOSE = "image-queue";

export async function createImageQueueEntry(
  userDid: string,
  storageKey: string,
  postText: string
): Promise<QueuedImage> {
  return await useDatabase(async db => {
    const insertedRow = await db.get(`
      INSERT INTO queued_images (user_did, storage_key, post_text, queue_order)
      VALUES (?, ?, ?, (
        SELECT COALESCE(MAX(queue_order), 0) + 1 
        FROM queued_images 
        WHERE user_did = ?
      ))
      RETURNING user_did, storage_key, post_text, is_nsfw, queue_order, created_at
    `, [userDid, storageKey, postText, userDid]) as QueuedImage;
    
    return insertedRow;
  });
}

export async function readImageQueueEntry(userDid: string, storageKey: string): Promise<QueuedImage> {
  return await useDatabase(async db => {
    const image = await db.get(
      'SELECT * FROM queued_images WHERE user_did = ? AND storage_key = ?',
      [userDid, storageKey]
    );

    if (!image) {
      throw new Error('Image not found in queue');
    }
    
    return image;
  });
}

export async function updateImageQueueEntry(
  userDid: string,
  storageKey: string,
  updates: Partial<Pick<QueuedImage, 'post_text' | 'is_nsfw'>>
): Promise<void> {
  return await useDatabase(async db => {
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
  return await useDatabase(async db => await db.all(
    'SELECT * FROM queued_images WHERE user_did = ? ORDER BY queue_order ASC',
    [userDid]
  ));
}

export async function reorderImageInQueue(
  userDid: string,
  sourceImageStorageKey: string,
  destinationOrder: number,
): Promise<void> {
  return await getMutex(MUTEX_PURPOSE, userDid).runExclusive(async () => await useDatabase(async db => {
    const currentImage = await db.get(
      'SELECT queue_order FROM queued_images WHERE user_did = ? AND storage_key = ?',
      [userDid, sourceImageStorageKey]
    ) as {queue_order: number} | undefined;
    
    if (!currentImage) {
      throw new Error('Image not found');
    }
    
    const sourceOrder = currentImage.queue_order;
    if (sourceOrder === destinationOrder) {
      return;
    }
    
    await db.run('BEGIN IMMEDIATE');
    try {
      const tempOrder = -Math.abs(sourceOrder) - 10000;
      await db.run(`
        UPDATE queued_images
        SET queue_order = ?
        WHERE user_did = ? AND storage_key = ?
      `, [tempOrder, userDid, sourceImageStorageKey]);
      
      if (destinationOrder < sourceOrder) {
        // Moving left: increment everything from destination to source-1
        await db.run(`
          UPDATE queued_images
          SET queue_order = queue_order + 1
          WHERE user_did = ? AND queue_order >= ? AND queue_order < ?
        `, [userDid, destinationOrder, sourceOrder]);
      } else {
        // Moving right: decrement everything from source+1 to destination
        await db.run(`
          UPDATE queued_images
          SET queue_order = queue_order - 1
          WHERE user_did = ? AND queue_order > ? AND queue_order <= ?
        `, [userDid, sourceOrder, destinationOrder]);
      }
      
      await db.run(`
        UPDATE queued_images
        SET queue_order = ?
        WHERE user_did = ? AND storage_key = ?
      `, [destinationOrder, userDid, sourceImageStorageKey]);
      
      await db.run('COMMIT');
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }));
}

// Simplified delete function
export async function deleteFromImageQueue(userDid: string, storageKey: string): Promise<void> {
  return await useDatabase(async db => {
    const imageToDelete = await db.get(
      'SELECT queue_order FROM queued_images WHERE user_did = ? AND storage_key = ?',
      [userDid, storageKey]
    ) as {queue_order: number} | undefined;
    
    if (!imageToDelete) {
      throw new Error('Image not found');
    }
    
    await db.run('BEGIN IMMEDIATE');
    try {
      await db.run(
        'DELETE FROM queued_images WHERE user_did = ? AND storage_key = ?',
        [userDid, storageKey]
      );
      
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
  return await useDatabase(async db => await db.get(
    `
      SELECT qi.*
      FROM queued_images qi
      WHERE qi.user_did = ?
      ORDER BY qi.queue_order ASC
      LIMIT 1
    `, [userDid])
  );
}
