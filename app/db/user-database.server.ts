import { open, Database as SqliteDatabase } from 'sqlite';
import Database from 'sqlite3';
import type { PostingTime } from '../lib/time';

let db: SqliteDatabase;

export interface User {
  id: number;
  bluesky_handle: string;
  bluesky_did: string;
  access_token: string;
  refresh_token: string;
  created_at: string;
  last_login: string;
}

export interface UserSession {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
  last_used_at: string;
}

export async function initDatabase() {
  db = await open({
    filename: './data/app.db',
    driver: Database.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bluesky_handle TEXT UNIQUE NOT NULL,
      bluesky_did TEXT UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS posting_times (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
      minute INTEGER NOT NULL CHECK (minute >= 0 AND minute <= 59),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(user_id, hour, minute)
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- Clean up expired sessions periodically
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);
  `);
}

export async function getUserByHandle(handle: string): Promise<User | undefined> {
  return await db.get('SELECT * FROM users WHERE bluesky_handle = ?', [handle]);
}

export async function getUserByDid(did: string): Promise<User | undefined> {
  return await db.get('SELECT * FROM users WHERE bluesky_did = ?', [did]);
}

export async function createOrUpdateUser(userData: Omit<User, 'id' | 'created_at' | 'last_login'>): Promise<User> {
  const existing = await getUserByDid(userData.bluesky_did);
  
  if (existing) {
    await db.run(`
      UPDATE users 
      SET access_token = ?, refresh_token = ?, last_login = CURRENT_TIMESTAMP 
      WHERE bluesky_did = ?
    `, [userData.access_token, userData.refresh_token, userData.bluesky_did]);
    return (await getUserByDid(userData.bluesky_did))!;
  } else {
    await db.run(`
      INSERT INTO users (bluesky_handle, bluesky_did, access_token, refresh_token)
      VALUES (?, ?, ?, ?)
    `, [userData.bluesky_handle, userData.bluesky_did, userData.access_token, userData.refresh_token]);
    return (await getUserByDid(userData.bluesky_did))!;
  }
}

export async function getUserPostingTimes(userId: number): Promise<PostingTime[]> {
  const rows = await db.all(
    'SELECT hour, minute FROM posting_times WHERE user_id = ? ORDER BY hour, minute',
    [userId]
  );
  return rows.map(row => ({ hour: row.hour, minute: row.minute }));
}

export async function updateUserPostingTimes(userId: number, times: PostingTime[]): Promise<void> {
  await db.run('BEGIN TRANSACTION');
  try {
    // Delete all existing times for this user
    await db.run('DELETE FROM posting_times WHERE user_id = ?', [userId]);
    
    // Insert the new times
    for (const time of times) {
      await db.run(
        'INSERT INTO posting_times (user_id, hour, minute) VALUES (?, ?, ?)',
        [userId, time.hour, time.minute]
      );
    }
    
    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

export async function getPostingsDueAt(hour: number, minute: number): Promise<Array<{user: User, time: PostingTime}>> {
  return await db.all(`
    SELECT u.*, pt.hour, pt.minute
    FROM users u 
    JOIN posting_times pt ON u.id = pt.user_id 
    WHERE pt.hour = ? AND pt.minute = ?
  `, [hour, minute]);
}

export async function createUserSession(userId: number, expiresAt: Date): Promise<string> {
  const sessionId = crypto.randomUUID();
  
  await db.run(`
    INSERT INTO user_sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `, [sessionId, userId, expiresAt.toISOString()]);
  
  return sessionId;
}

export async function getUserBySessionId(sessionId: string): Promise<User | null> {
  // Cleanup expired sessions before accessing the database. A more correct way of doing this
  // would be to use a TTL on the database level, but SQLite doesn't support that and I'm lazy.
  cleanupExpiredSessions();

  const session = await db.get(`
    SELECT us.*, u.*
    FROM user_sessions us
    JOIN users u ON us.user_id = u.id
    WHERE us.id = ? AND us.expires_at > datetime('now')
  `, [sessionId]) as (UserSession & User) | undefined;

  if (session) {
    await db.run(`
      UPDATE user_sessions 
      SET last_used_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [sessionId]);
    
    return {
      id: session.user_id,
      bluesky_handle: session.bluesky_handle,
      bluesky_did: session.bluesky_did,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      created_at: session.created_at,
      last_login: session.last_login
    };
  }
  
  return null;
}

export async function deleteUserSession(sessionId: string): Promise<void> {
  await db.run('DELETE FROM user_sessions WHERE id = ?', [sessionId]);
}

async function cleanupExpiredSessions(): Promise<void> {
  await db.run('DELETE FROM user_sessions WHERE expires_at <= datetime("now")');
}
