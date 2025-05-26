import { open, Database as SqliteDatabase } from 'sqlite';
import Database from 'sqlite3';
import { setupTables } from '../../app/db/database.server';

let testDb: SqliteDatabase | undefined;

async function createTestDatabase(): Promise<SqliteDatabase> {
  const db = await open({
    filename: ':memory:',
    driver: Database.Database
  });
  
  setupTables(db);

  return db;
}

export async function setupTestDatabase(): Promise<SqliteDatabase> {
  testDb = await createTestDatabase();
  return testDb;
}

export async function teardownTestDatabase(): Promise<void> {
  if (testDb) {
    await testDb.close();
    testDb = undefined;
  }
}

export function getTestDatabase(): SqliteDatabase {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testDb;
}

export const testDataFactory = {
  createTestUser: (did = 'did:test:user123') => ({
    did,
    created_at: new Date().toISOString(),
    last_login: new Date().toISOString(),
  }),

  createTestPostingTime: (overrides = {}) => ({
    hour: 9,
    minute: 0,
    day_of_week: 1,
    ...overrides,
  }),

  createTestQueuedImage: (userDid = 'did:test:user123', overrides = {}) => ({
    user_did: userDid,
    storage_key: 'test/image123.jpg',
    post_text: 'Test image post',
    is_nsfw: false,
    queue_order: 1,
    ...overrides,
  }),

  createTestSession: () => ({
    sub: 'did:test:user123',
    iss: 'https://test.bsky.social',
    aud: 'test-client',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    scope: 'atproto',
  }),
};

export async function countTableRows(tableName: string): Promise<number> {
  const db = getTestDatabase();
  const result = await db.get(`SELECT COUNT(*) as count FROM ${tableName}`);
  return result.count;
}

export async function clearAllTables(): Promise<void> {
  const db = getTestDatabase();
  
  // Delete in reverse dependency order to avoid foreign key constraints
  await db.run('DELETE FROM user_sessions');
  await db.run('DELETE FROM queued_images');
  await db.run('DELETE FROM posting_times');
  await db.run('DELETE FROM users');
}

export const testAssertions = {
  async assertUserExists(did: string): Promise<boolean> {
    const db = getTestDatabase();
    const user = await db.get('SELECT * FROM users WHERE did = ?', [did]);
    return !!user;
  },

  async assertImageInQueue(userDid: string, storageKey: string): Promise<boolean> {
    const db = getTestDatabase();
    const image = await db.get(
      'SELECT * FROM queued_images WHERE user_did = ? AND storage_key = ?',
      [userDid, storageKey]
    );
    return !!image;
  },

  async assertPostingTimeExists(userDid: string, hour: number, minute: number, dayOfWeek: number): Promise<boolean> {
    const db = getTestDatabase();
    const time = await db.get(
      'SELECT * FROM posting_times WHERE user_did = ? AND hour = ? AND minute = ? AND day_of_week = ?',
      [userDid, hour, minute, dayOfWeek]
    );
    return !!time;
  },

  async assertQueueOrder(userDid: string, expectedOrder: string[]): Promise<boolean> {
    const db = getTestDatabase();
    const images = await db.all(
      'SELECT storage_key FROM queued_images WHERE user_did = ? ORDER BY queue_order ASC',
      [userDid]
    );
    const actualOrder = images.map(img => img.storage_key);
    return JSON.stringify(actualOrder) === JSON.stringify(expectedOrder);
  },
};
