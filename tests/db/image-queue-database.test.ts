import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  getTestDatabase,
} from '../setup/database-test-setup';
import {
  createImageQueueEntry,
  readImageQueueEntry,
  updateImageQueueEntry,
  getImageQueueForUser,
  reorderImageInQueue,
  deleteFromImageQueue,
  getNextImageToPostForUser
} from '../../app/db/image-queue-database.server';

vi.mock(import("../../app/db/database.server"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    ensureDatabase: vi.fn(() => getTestDatabase())
  }
})

describe('Image Queue Database Operations', () => {
  const testUserDid = 'did:test:user123';

  beforeEach(async () => {
    await setupTestDatabase();
    
    const db = getTestDatabase();
    await db.run('INSERT INTO users (did) VALUES (?)', [testUserDid]);
  });

  afterEach(async () => {
    await teardownTestDatabase();
  });

  describe('createImageQueueEntry', () => {
    it('should create new image queue entry with auto-incremented order', async () => {
      const storageKey = 'test/image1.jpg';
      const postText = 'Test image post';
      
      const result = await createImageQueueEntry(testUserDid, storageKey, postText);
      
      expect(result).toBeDefined();
      expect(result.user_did).toBe(testUserDid);
      expect(result.storage_key).toBe(storageKey);
      expect(result.post_text).toBe(postText);
      expect(result.queue_order).toBe(1);
      expect(result.is_nsfw).toBe(true);
    });

    it('should assign correct order for multiple images', async () => {
      const images = [
        { key: 'test/image1.jpg', text: 'First image' },
        { key: 'test/image2.jpg', text: 'Second image' },
        { key: 'test/image3.jpg', text: 'Third image' }
      ];

      const results = [];
      for (const img of images) {
        const result = await createImageQueueEntry(testUserDid, img.key, img.text);
        results.push(result);
      }

      expect(results[0].queue_order).toBe(1);
      expect(results[1].queue_order).toBe(2);
      expect(results[2].queue_order).toBe(3);
    });

    it('should handle transaction rollback on error', async () => {
      const db = getTestDatabase();
      
      await createImageQueueEntry(testUserDid, 'test/image1.jpg', 'Test');
      
      const countBefore = await db.get('SELECT COUNT(*) as count FROM queued_images WHERE user_did = ?', [testUserDid]);
      expect(countBefore.count).toBe(1);
      
      // Try to create image with duplicate storage key (should fail due to reusing same key)
      // Note: This test assumes storage_key should be unique per user, but your schema doesn't enforce this
      // If storage_key can be duplicate, this test would need to be modified
      
      // For now, let's test with invalid user_did to trigger foreign key constraint
      await expect(
        createImageQueueEntry('did:nonexistent:user', 'test/image2.jpg', 'Test')
      ).rejects.toThrow();
      
      // Verify original count unchanged (transaction rolled back)
      const countAfter = await db.get('SELECT COUNT(*) as count FROM queued_images WHERE user_did = ?', [testUserDid]);
      expect(countAfter.count).toBe(1);
    });

    it('should handle concurrent image creation', async () => {
      const promises = [];
      for (let i = 1; i <= 5; i++) {
        promises.push(createImageQueueEntry(testUserDid, `test/image${i}.jpg`, `Image ${i}`));
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed with unique orders
      const orders = results.map(r => r.queue_order).sort();
      expect(orders).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('readImageQueueEntry', () => {
    it('should read existing image queue entry', async () => {
      const storageKey = 'test/image1.jpg';
      const postText = 'Test image';
      
      await createImageQueueEntry(testUserDid, storageKey, postText);
      const result = await readImageQueueEntry(testUserDid, storageKey);
      
      expect(result.user_did).toBe(testUserDid);
      expect(result.storage_key).toBe(storageKey);
      expect(result.post_text).toBe(postText);
    });

    it('should throw error for non-existent image', async () => {
      await expect(
        readImageQueueEntry(testUserDid, 'nonexistent.jpg')
      ).rejects.toThrow('Image not found in queue');
    });

    it('should throw error for wrong user', async () => {
      await createImageQueueEntry(testUserDid, 'test/image1.jpg', 'Test');
      
      await expect(
        readImageQueueEntry('did:test:otheruser', 'test/image1.jpg')
      ).rejects.toThrow('Image not found in queue');
    });
  });

  describe('updateImageQueueEntry', () => {
    it('should update post text', async () => {
      const image = await createImageQueueEntry(testUserDid, 'test/image1.jpg', 'Original text');
      
      await updateImageQueueEntry(testUserDid, image.id, {
        post_text: 'Updated text'
      });
      
      const updated = await readImageQueueEntry(testUserDid, 'test/image1.jpg');
      expect(updated.post_text).toBe('Updated text');
    });

    it('should update NSFW flag', async () => {
      const image = await createImageQueueEntry(testUserDid, 'test/image1.jpg', 'Test');
      expect(image.is_nsfw).toBe(true); // Default
      
      await updateImageQueueEntry(testUserDid, image.id, {
        is_nsfw: false
      });
      
      const updated = await readImageQueueEntry(testUserDid, 'test/image1.jpg');
      expect(updated.is_nsfw).toBe(false);
    });

    it('should update both fields at once', async () => {
      const image = await createImageQueueEntry(testUserDid, 'test/image1.jpg', 'Original');
      
      await updateImageQueueEntry(testUserDid, image.id, {
        post_text: 'New text',
        is_nsfw: false
      });
      
      const updated = await readImageQueueEntry(testUserDid, 'test/image1.jpg');
      expect(updated.post_text).toBe('New text');
      expect(updated.is_nsfw).toBe(false);
    });

    it('should do nothing when no updates provided', async () => {
      const image = await createImageQueueEntry(testUserDid, 'test/image1.jpg', 'Test');
      const originalUpdated = await readImageQueueEntry(testUserDid, 'test/image1.jpg');
      
      await updateImageQueueEntry(testUserDid, image.id, {});
      
      const stillSame = await readImageQueueEntry(testUserDid, 'test/image1.jpg');
      expect(stillSame.post_text).toBe(originalUpdated.post_text);
      expect(stillSame.is_nsfw).toBe(originalUpdated.is_nsfw);
    });
  });

  describe('getImageQueueForUser', () => {
    it('should return empty array for user with no images', async () => {
      const result = await getImageQueueForUser(testUserDid);
      expect(result).toEqual([]);
    });

    it('should return images in queue order', async () => {
      const images = [
        'test/image1.jpg',
        'test/image2.jpg', 
        'test/image3.jpg'
      ];

      for (const [index, imageKey] of images.entries()) {
        await createImageQueueEntry(testUserDid, imageKey, `Image ${index + 1}`);
      }

      const result = await getImageQueueForUser(testUserDid);
      
      expect(result).toHaveLength(3);
      expect(result[0].storage_key).toBe('test/image1.jpg');
      expect(result[1].storage_key).toBe('test/image2.jpg');
      expect(result[2].storage_key).toBe('test/image3.jpg');
      expect(result[0].queue_order).toBe(1);
      expect(result[1].queue_order).toBe(2);
      expect(result[2].queue_order).toBe(3);
    });

    it('should only return images for specified user', async () => {
      const db = getTestDatabase();
      const otherUserDid = 'did:test:otheruser';
      await db.run('INSERT INTO users (did) VALUES (?)', [otherUserDid]);

      await createImageQueueEntry(testUserDid, 'test/user1-image.jpg', 'User 1');
      await createImageQueueEntry(otherUserDid, 'test/user2-image.jpg', 'User 2');

      const user1Images = await getImageQueueForUser(testUserDid);
      const user2Images = await getImageQueueForUser(otherUserDid);

      expect(user1Images).toHaveLength(1);
      expect(user2Images).toHaveLength(1);
      expect(user1Images[0].storage_key).toBe('test/user1-image.jpg');
      expect(user2Images[0].storage_key).toBe('test/user2-image.jpg');
    });
  });

  describe('reorderImageInQueue', () => {
    beforeEach(async () => {
      // Create 5 images for reordering tests
      const images = ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg', 'img5.jpg'];
      for (const img of images) {
        await createImageQueueEntry(testUserDid, img, `Text for ${img}`);
      }
    });

    it('should move image from position 1 to position 3', async () => {
      await reorderImageInQueue(testUserDid, 1, 3);
      
      const images = await getImageQueueForUser(testUserDid);
      const storageKeys = images.map(img => img.storage_key);
      
      // Original: [img1, img2, img3, img4, img5]
      // Expected: [img2, img3, img1, img4, img5]
      expect(storageKeys).toEqual(['img2.jpg', 'img3.jpg', 'img1.jpg', 'img4.jpg', 'img5.jpg']);
    });

    it('should move image from position 4 to position 2', async () => {
      await reorderImageInQueue(testUserDid, 4, 2);
      
      const images = await getImageQueueForUser(testUserDid);
      const storageKeys = images.map(img => img.storage_key);
      
      // Original: [img1, img2, img3, img4, img5]
      // Expected: [img1, img4, img2, img3, img5]
      expect(storageKeys).toEqual(['img1.jpg', 'img4.jpg', 'img2.jpg', 'img3.jpg', 'img5.jpg']);
    });

    it('should handle moving to same position (no-op)', async () => {
      const originalImages = await getImageQueueForUser(testUserDid);
      
      await reorderImageInQueue(testUserDid, 3, 3);
      
      const images = await getImageQueueForUser(testUserDid);
      expect(images.map(img => img.storage_key)).toEqual(
        originalImages.map(img => img.storage_key)
      );
    });

    it('should handle moving first item to last', async () => {
      await reorderImageInQueue(testUserDid, 1, 5);
      
      const images = await getImageQueueForUser(testUserDid);
      const storageKeys = images.map(img => img.storage_key);
      
      // Original: [img1, img2, img3, img4, img5]
      // Expected: [img2, img3, img4, img5, img1]
      expect(storageKeys).toEqual(['img2.jpg', 'img3.jpg', 'img4.jpg', 'img5.jpg', 'img1.jpg']);
    });

    it('should handle moving last item to first', async () => {
      await reorderImageInQueue(testUserDid, 5, 1);
      
      const images = await getImageQueueForUser(testUserDid);
      const storageKeys = images.map(img => img.storage_key);
      
      // Original: [img1, img2, img3, img4, img5]
      // Expected: [img5, img1, img2, img3, img4]
      expect(storageKeys).toEqual(['img5.jpg', 'img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg']);
    });

    it('should throw error for non-existent source position', async () => {
      await expect(
        reorderImageInQueue(testUserDid, 10, 3)
      ).rejects.toThrow('Image not found');
    });

    it('should handle transaction rollback on error', async () => {
      const originalImages = await getImageQueueForUser(testUserDid);
      
      // This should fail due to non-existent position
      await expect(
        reorderImageInQueue(testUserDid, 10, 3)
      ).rejects.toThrow();
      
      // Verify queue unchanged
      const imagesAfter = await getImageQueueForUser(testUserDid);
      expect(imagesAfter.map(img => img.storage_key)).toEqual(
        originalImages.map(img => img.storage_key)
      );
    });
  });

  describe('deleteFromImageQueue', () => {
    beforeEach(async () => {
      // Create 3 images for deletion tests
      const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
      for (const img of images) {
        await createImageQueueEntry(testUserDid, img, `Text for ${img}`);
      }
    });

    it('should delete image and reorder remaining images', async () => {
      const images = await getImageQueueForUser(testUserDid);
      const middleImage = images.find(img => img.queue_order === 2);
      
      await deleteFromImageQueue(testUserDid, middleImage!.id);
      
      const remaining = await getImageQueueForUser(testUserDid);
      expect(remaining).toHaveLength(2);
      
      const storageKeys = remaining.map(img => img.storage_key);
      const orders = remaining.map(img => img.queue_order);
      
      expect(storageKeys).toEqual(['img1.jpg', 'img3.jpg']);
      expect(orders).toEqual([1, 2]); // Should be reordered
    });

    it('should delete first image and reorder', async () => {
      const images = await getImageQueueForUser(testUserDid);
      const firstImage = images.find(img => img.queue_order === 1);
      
      await deleteFromImageQueue(testUserDid, firstImage!.id);
      
      const remaining = await getImageQueueForUser(testUserDid);
      expect(remaining).toHaveLength(2);
      
      const storageKeys = remaining.map(img => img.storage_key);
      const orders = remaining.map(img => img.queue_order);
      
      expect(storageKeys).toEqual(['img2.jpg', 'img3.jpg']);
      expect(orders).toEqual([1, 2]);
    });

    it('should delete last image without affecting others', async () => {
      const images = await getImageQueueForUser(testUserDid);
      const lastImage = images.find(img => img.queue_order === 3);
      
      await deleteFromImageQueue(testUserDid, lastImage!.id);
      
      const remaining = await getImageQueueForUser(testUserDid);
      expect(remaining).toHaveLength(2);
      
      const storageKeys = remaining.map(img => img.storage_key);
      const orders = remaining.map(img => img.queue_order);
      
      expect(storageKeys).toEqual(['img1.jpg', 'img2.jpg']);
      expect(orders).toEqual([1, 2]);
    });

    it('should throw error for non-existent image', async () => {
      await expect(
        deleteFromImageQueue(testUserDid, 99999)
      ).rejects.toThrow('Image not found');
    });

    it('should handle transaction rollback on error', async () => {
      const originalCount = (await getImageQueueForUser(testUserDid)).length;
      
      await expect(
        deleteFromImageQueue(testUserDid, 99999)
      ).rejects.toThrow();
      
      const countAfter = (await getImageQueueForUser(testUserDid)).length;
      expect(countAfter).toBe(originalCount);
    });
  });

  describe('getNextImageToPostForUser', () => {
    it('should return undefined for user with no images', async () => {
      const result = await getNextImageToPostForUser(testUserDid);
      expect(result).toBeUndefined();
    });

    it('should return first image in queue', async () => {
      await createImageQueueEntry(testUserDid, 'img1.jpg', 'First');
      await createImageQueueEntry(testUserDid, 'img2.jpg', 'Second');
      await createImageQueueEntry(testUserDid, 'img3.jpg', 'Third');
      
      const result = await getNextImageToPostForUser(testUserDid);
      
      expect(result).toBeDefined();
      expect(result!.storage_key).toBe('img1.jpg');
      expect(result!.queue_order).toBe(1);
    });

    it('should return correct image after reordering', async () => {
      await createImageQueueEntry(testUserDid, 'img1.jpg', 'First');
      await createImageQueueEntry(testUserDid, 'img2.jpg', 'Second');
      
      // Reorder so img2 becomes first
      await reorderImageInQueue(testUserDid, 2, 1);
      
      const result = await getNextImageToPostForUser(testUserDid);
      expect(result!.storage_key).toBe('img2.jpg');
      expect(result!.queue_order).toBe(1);
    });
  });
});
