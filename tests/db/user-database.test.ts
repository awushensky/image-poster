import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  setupTestDatabase, 
  teardownTestDatabase, 
  getTestDatabase,
  testAssertions
} from '../setup/database-test-setup';
import { getUserByDid, createOrUpdateUser } from '../../app/db/user-database.server';

vi.mock('../../app/db/database.server', () => ({
  ensureDatabase: vi.fn(() => getTestDatabase())
}));

describe('User Database Operations', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await teardownTestDatabase();
  });

  describe('getUserByDid', () => {
    it('should return undefined for non-existent user', async () => {
      const result = await getUserByDid('did:nonexistent:user');
      expect(result).toBeUndefined();
    });

    it('should return user for existing user', async () => {
      const db = getTestDatabase();
      const testDid = 'did:test:user123';
      
      await db.run(`
        INSERT INTO users (did, created_at, last_login)
        VALUES (?, ?, ?)
      `, [testDid, '2025-01-01T10:00:00Z', '2025-01-01T11:00:00Z']);

      const result = await getUserByDid(testDid);
      
      expect(result).toBeDefined();
      expect(result?.did).toBe(testDid);
      expect(result?.created_at).toBe('2025-01-01T10:00:00Z');
      expect(result?.last_login).toBe('2025-01-01T11:00:00Z');
    });

    it('should handle special characters in DID', async () => {
      const db = getTestDatabase();
      const specialDid = 'did:plc:abcd1234-efgh-5678-ijkl-mnop9012qrst';
      
      await db.run(`
        INSERT INTO users (did)
        VALUES (?)
      `, [specialDid]);

      const result = await getUserByDid(specialDid);
      expect(result?.did).toBe(specialDid);
    });
  });

  describe('createOrUpdateUser', () => {
    it('should create new user when user does not exist', async () => {
      const testDid = 'did:test:newuser';
      
      const result = await createOrUpdateUser(testDid);
      
      expect(result).toBeDefined();
      expect(result.did).toBe(testDid);
      expect(result.created_at).toBeDefined();
      expect(result.last_login).toBeDefined();
      
      expect(await testAssertions.assertUserExists(testDid)).toBe(true);
    });

    it('should update last_login for existing user', async () => {
      const testDid = 'did:test:existinguser';
      const db = getTestDatabase();
      
      const originalCreatedAt = '2025-01-01T10:00:00Z';
      const originalLastLogin = '2025-01-01T11:00:00Z';
      
      await db.run(`
        INSERT INTO users (did, created_at, last_login)
        VALUES (?, ?, ?)
      `, [testDid, originalCreatedAt, originalLastLogin]);

      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await createOrUpdateUser(testDid);
      
      expect(result.did).toBe(testDid);
      expect(result.created_at).toBe(originalCreatedAt);
      expect(result.last_login).not.toBe(originalLastLogin);
      
      const updatedUser = await getUserByDid(testDid);
      expect(updatedUser?.last_login).not.toBe(originalLastLogin);
    });

    it('handles multiple successive calls', async () => {
      const testDid = 'did:test:multipleupdate';
      
      const result1 = await createOrUpdateUser(testDid);
      expect(result1.did).toBe(testDid);
      
      const firstLastLogin = result1.last_login;
      
      await new Promise(resolve => setTimeout(resolve, 10));
      const result2 = await createOrUpdateUser(testDid);
      
      expect(result2.did).toBe(testDid);
      expect(result2.created_at).toBe(result1.created_at);
      expect(result2.last_login).not.toBe(firstLastLogin);
      
      // Verify only one user exists
      const db = getTestDatabase();
      const users = await db.all('SELECT * FROM users WHERE did = ?', [testDid]);
      expect(users).toHaveLength(1);
    });

    it('handles multiple concurrent calls', async () => {
      const testDid = 'did:test:concurrent';
      
      const promises = Array(5).fill(null).map(() => createOrUpdateUser(testDid));
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.did).toBe(testDid);
      });
      
      const db = getTestDatabase();
      const users = await db.all('SELECT * FROM users WHERE did = ?', [testDid]);
      expect(users).toHaveLength(1);
    });

    it('should handle empty and null DIDs appropriately', async () => {
      await expect(createOrUpdateUser('')).rejects.toThrow();
      
      await expect(createOrUpdateUser(null as any)).rejects.toThrow();
      await expect(createOrUpdateUser(undefined as any)).rejects.toThrow();
    });

    it('should handle very long DIDs', async () => {
      const longDid = 'did:test:' + 'a'.repeat(1000);
      
      const result = await createOrUpdateUser(longDid);
      expect(result.did).toBe(longDid);
      
      const retrieved = await getUserByDid(longDid);
      expect(retrieved?.did).toBe(longDid);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce primary key constraint', async () => {
      const db = getTestDatabase();
      const testDid = 'did:test:duplicate';
      
      await db.run('INSERT INTO users (did) VALUES (?)', [testDid]);
      
      await expect(
        db.run('INSERT INTO users (did) VALUES (?)', [testDid])
      ).rejects.toThrow();
    });

    it('should handle timestamp defaults', async () => {
      const db = getTestDatabase();
      const testDid = 'did:test:timestamps';
      
      await db.run('INSERT INTO users (did) VALUES (?)', [testDid]);
      
      const user = await getUserByDid(testDid);
      expect(user?.created_at).toBeDefined();
      expect(user?.last_login).toBeDefined();
      
      const createdAt = new Date(user!.created_at);
      const lastLogin = new Date(user!.last_login);
      const now = new Date();
      
      expect(now.getTime() - createdAt.getTime()).toBeLessThan(60000);
      expect(now.getTime() - lastLogin.getTime()).toBeLessThan(60000);
    });
  });
});
