import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  getTestDatabase
} from '../setup/database-test-setup';
import {
  getUserPostingTimes,
  updateUserPostingTimes,
  getUsersWithPostingDueAt
} from '../../app/db/posting-time-database.server';

vi.mock('../../app/db/database.server', () => ({
  ensureDatabase: vi.fn(() => getTestDatabase())
}));

describe('Posting Time Database Operations', () => {
  const testUserDid = 'did:test:user123';
  const testUserDid2 = 'did:test:user456';

  beforeEach(async () => {
    await setupTestDatabase();
    
    const db = getTestDatabase();
    await db.run('INSERT INTO users (did) VALUES (?)', [testUserDid]);
    await db.run('INSERT INTO users (did) VALUES (?)', [testUserDid2]);
  });

  afterEach(async () => {
    await teardownTestDatabase();
  });

  describe('getUserPostingTimes', () => {
    it('should return empty array for user with no posting times', async () => {
      const result = await getUserPostingTimes(testUserDid);
      expect(result).toEqual([]);
    });

    it('should return posting times ordered by hour and minute', async () => {
      const db = getTestDatabase();
      
      const times = [
        { hour: 18, minute: 30, day_of_week: 1 },
        { hour: 9, minute: 0, day_of_week: 1 },
        { hour: 18, minute: 0, day_of_week: 1 },
        { hour: 12, minute: 15, day_of_week: 1 }
      ];

      for (const time of times) {
        await db.run(`
          INSERT INTO posting_times (user_did, hour, minute, day_of_week)
          VALUES (?, ?, ?, ?)
        `, [testUserDid, time.hour, time.minute, time.day_of_week]);
      }

      const result = await getUserPostingTimes(testUserDid);
      
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ hour: 9, minute: 0, day_of_week: 1 });
      expect(result[1]).toEqual({ hour: 12, minute: 15, day_of_week: 1 });
      expect(result[2]).toEqual({ hour: 18, minute: 0, day_of_week: 1 });
      expect(result[3]).toEqual({ hour: 18, minute: 30, day_of_week: 1 });
    });

    it('should only return times for specified user', async () => {
      const db = getTestDatabase();
      
      await db.run(`
        INSERT INTO posting_times (user_did, hour, minute, day_of_week)
        VALUES (?, ?, ?, ?)
      `, [testUserDid, 9, 0, 1]);
      
      await db.run(`
        INSERT INTO posting_times (user_did, hour, minute, day_of_week)
        VALUES (?, ?, ?, ?)
      `, [testUserDid2, 18, 0, 1]);

      const user1Times = await getUserPostingTimes(testUserDid);
      const user2Times = await getUserPostingTimes(testUserDid2);

      expect(user1Times).toHaveLength(1);
      expect(user2Times).toHaveLength(1);
      expect(user1Times[0].hour).toBe(9);
      expect(user2Times[0].hour).toBe(18);
    });
  });

  describe('updateUserPostingTimes', () => {
    it('should add new posting times for user', async () => {
      const times = [
        { hour: 9, minute: 0, day_of_week: 1 },
        { hour: 18, minute: 30, day_of_week: 5 }
      ];

      await updateUserPostingTimes(testUserDid, times);

      const result = await getUserPostingTimes(testUserDid);
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining(times));
    });

    it('should replace existing posting times', async () => {
      const db = getTestDatabase();
      
      await db.run(`
        INSERT INTO posting_times (user_did, hour, minute, day_of_week)
        VALUES (?, ?, ?, ?)
      `, [testUserDid, 9, 0, 1]);

      const newTimes = [
        { hour: 12, minute: 0, day_of_week: 2 },
        { hour: 18, minute: 0, day_of_week: 3 }
      ];

      await updateUserPostingTimes(testUserDid, newTimes);

      const result = await getUserPostingTimes(testUserDid);
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining(newTimes));
      
      expect(result.find(t => t.hour === 9)).toBeUndefined();
    });

    it('should handle empty times array (clear all times)', async () => {
      const db = getTestDatabase();
      
      await db.run(`
        INSERT INTO posting_times (user_did, hour, minute, day_of_week)
        VALUES (?, ?, ?, ?)
      `, [testUserDid, 9, 0, 1]);

      await updateUserPostingTimes(testUserDid, []);

      const result = await getUserPostingTimes(testUserDid);
      expect(result).toHaveLength(0);
    });

    it('should handle transaction rollback on error', async () => {
      const initialTimes = [{ hour: 9, minute: 0, day_of_week: 1 }];
      await updateUserPostingTimes(testUserDid, initialTimes);

      // Try to add invalid time (should fail due to check constraint)
      const invalidTimes = [{ hour: 25, minute: 0, day_of_week: 1 }];

      await expect(
        updateUserPostingTimes(testUserDid, invalidTimes)
      ).rejects.toThrow();

      const result = await getUserPostingTimes(testUserDid);
      expect(result).toEqual(initialTimes);
    });

    it('should not affect other users times', async () => {
      const user1Times = [{ hour: 9, minute: 0, day_of_week: 1 }];
      const user2Times = [{ hour: 18, minute: 0, day_of_week: 1 }];

      await updateUserPostingTimes(testUserDid, user1Times);
      await updateUserPostingTimes(testUserDid2, user2Times);

      const newUser1Times = [{ hour: 12, minute: 0, day_of_week: 2 }];
      await updateUserPostingTimes(testUserDid, newUser1Times);

      const user2Result = await getUserPostingTimes(testUserDid2);
      expect(user2Result).toEqual(user2Times);

      const user1Result = await getUserPostingTimes(testUserDid);
      expect(user1Result).toEqual(newUser1Times);
    });
  });

  describe('getUsersWithPostingDueAt', () => {
    beforeEach(async () => {
      const db = getTestDatabase();
      
      await db.run(`
        INSERT INTO posting_times (user_did, hour, minute, day_of_week)
        VALUES (?, ?, ?, ?)
      `, [testUserDid, 9, 0, 1]);

      await db.run(`
        INSERT INTO posting_times (user_did, hour, minute, day_of_week)
        VALUES (?, ?, ?, ?)
      `, [testUserDid, 18, 0, 5]);

      await db.run(`
        INSERT INTO posting_times (user_did, hour, minute, day_of_week)
        VALUES (?, ?, ?, ?)
      `, [testUserDid2, 9, 0, 1]);

      await db.run(`
        INSERT INTO posting_times (user_did, hour, minute, day_of_week)
        VALUES (?, ?, ?, ?)
      `, [testUserDid2, 12, 0, 3]);
    });

    it('should return users with posting due at specific time', async () => {
      const result = await getUsersWithPostingDueAt(9, 0, 1);
      
      expect(result).toHaveLength(2);
      const userDids = result.map(user => user.did);
      expect(userDids).toContain(testUserDid);
      expect(userDids).toContain(testUserDid2);
    });

    it('should return single user when only one has posting due', async () => {
      const result = await getUsersWithPostingDueAt(18, 0, 5);
      
      expect(result).toHaveLength(1);
      expect(result[0].did).toBe(testUserDid);
    });

    it('should return empty array when no users have posting due', async () => {
      const result = await getUsersWithPostingDueAt(15, 30, 7);
      
      expect(result).toHaveLength(0);
    });

    it('should handle exact time matching', async () => {
      const result1 = await getUsersWithPostingDueAt(12, 0, 3);
      expect(result1).toHaveLength(1);
      expect(result1[0].did).toBe(testUserDid2);

      const result2 = await getUsersWithPostingDueAt(12, 1, 3);
      expect(result2).toHaveLength(0);
    });

    it('should handle day of week matching', async () => {
      const monday = await getUsersWithPostingDueAt(9, 0, 1);
      expect(monday).toHaveLength(2);

      const tuesday = await getUsersWithPostingDueAt(9, 0, 2);
      expect(tuesday).toHaveLength(0);
    });
  });

  describe('Constraint Validation', () => {
    it('should enforce check constraints on hour', async () => {
      await expect(
        updateUserPostingTimes(testUserDid, [
          { hour: -1, minute: 0, day_of_week: 1 }
        ])
      ).rejects.toThrow();

      await expect(
        updateUserPostingTimes(testUserDid, [
          { hour: 24, minute: 0, day_of_week: 1 }
        ])
      ).rejects.toThrow();
    });

    it('should enforce check constraints on minute', async () => {
      await expect(
        updateUserPostingTimes(testUserDid, [
          { hour: 9, minute: -1, day_of_week: 1 }
        ])
      ).rejects.toThrow();

      await expect(
        updateUserPostingTimes(testUserDid, [
          { hour: 9, minute: 60, day_of_week: 1 }
        ])
      ).rejects.toThrow();
    });

    it('should enforce check constraints on day_of_week', async () => {
      await expect(
        updateUserPostingTimes(testUserDid, [
          { hour: 9, minute: 0, day_of_week: 0 }
        ])
      ).rejects.toThrow();

      await expect(
        updateUserPostingTimes(testUserDid, [
          { hour: 9, minute: 0, day_of_week: 8 }
        ])
      ).rejects.toThrow();
    });

    it('should enforce unique constraint', async () => {
      const times = [
        { hour: 9, minute: 0, day_of_week: 1 },
        { hour: 9, minute: 0, day_of_week: 1 } // Duplicate
      ];

      await expect(
        updateUserPostingTimes(testUserDid, times)
      ).rejects.toThrow();
    });

    it('should allow same time for different users', async () => {
      const times = [{ hour: 9, minute: 0, day_of_week: 1 }];

      await updateUserPostingTimes(testUserDid, times);
      await updateUserPostingTimes(testUserDid2, times);

      const user1Times = await getUserPostingTimes(testUserDid);
      const user2Times = await getUserPostingTimes(testUserDid2);

      expect(user1Times).toEqual(times);
      expect(user2Times).toEqual(times);
    });
  });
});
