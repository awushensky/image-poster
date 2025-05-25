import { open, Database as SqliteDatabase } from 'sqlite';
import Database from 'sqlite3';
import type { PostingTime } from '../lib/time';
import type { NodeSavedSession } from '@atproto/oauth-client-node';
import { createHmac } from 'crypto';


let db: SqliteDatabase;

export interface User {
  id: number;
  bluesky_handle: string;
  bluesky_did: string;
  created_at: string;
  last_login: string;
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
      session_token TEXT NOT NULL,
      user_id INTEGER PRIMARY KEY,
      session_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      UNIQUE(session_token)
    );
  `);
}

/*********************************
 * User Management
 **********************************/
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
      SET last_login = CURRENT_TIMESTAMP 
      WHERE bluesky_did = ?
    `, [userData.bluesky_did]);
    return (await getUserByDid(userData.bluesky_did))!;
  } else {
    await db.run(`
      INSERT INTO users (bluesky_handle, bluesky_did)
      VALUES (?, ?)
    `, [userData.bluesky_handle, userData.bluesky_did]);
    return (await getUserByDid(userData.bluesky_did))!;
  }
}

/*********************************
 * Posting Time Management
 **********************************/
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
    await db.run('DELETE FROM posting_times WHERE user_id = ?', [userId]);
    
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

/*********************************
 * User session Management
 **********************************/
function generateSessionToken(userDid: string): string {
  const secret = process.env.SESSION_SECRET || 'your-secret-key';  // TODO set up a secret key here
  return createHmac('sha256', secret)
    .update(userDid)
    .digest('hex');
}

export async function createUserSession(userDid: string): Promise<string> {
  const user = await getUserByDid(userDid);
  if (!user) {
    throw new Error(`User not found for DID: ${userDid}`);
  }

  const sessionToken = generateSessionToken(userDid);
  const existingSession = await getOAuthSession(userDid);
  if (!existingSession) {
    throw new Error(`No OAuth session found for user: ${userDid}`);
  }
  
  await db.run(`
    INSERT OR REPLACE INTO user_sessions (session_token, user_id, session_data, last_used_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `, [sessionToken, user.id, JSON.stringify(existingSession)]);
  
  return sessionToken;
}

export async function getUserFromSession(session_token: string): Promise<User | null> {
  const row = await db.get(`
    SELECT u.*, us.last_used_at
    FROM user_sessions us
    JOIN users u ON us.user_id = u.id
    WHERE us.session_token = ?
  `, [session_token]) as (User & { last_used_at: string }) | undefined;

  if (row) {
    await db.run(`
      UPDATE user_sessions 
      SET last_used_at = CURRENT_TIMESTAMP 
      WHERE session_token = ?
    `, [session_token]);
    
    return {
      id: row.id,
      bluesky_handle: row.bluesky_handle,
      bluesky_did: row.bluesky_did,
      created_at: row.created_at,
      last_login: row.last_login
    };
  }
  
  return null;
}

export async function deleteSessionByToken(session_token: string): Promise<void> {
  await db.run('DELETE FROM user_sessions WHERE session_token = ?', [session_token]);
}

/*********************************
 * OAuth Session Management
 **********************************/
export async function storeOAuthSession(userDid: string, session: NodeSavedSession): Promise<void> {
  const user = await getUserByDid(userDid);
  if (!user) {
    throw new Error(`User not found for DID: ${userDid}`);
  }

  const sessionToken = generateSessionToken(userDid);
  await db.run(`
    INSERT OR REPLACE INTO user_sessions (session_token, user_id, session_data, last_used_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `, [sessionToken, user.id, JSON.stringify(session)]);
}

export async function getOAuthSession(userDid: string): Promise<NodeSavedSession | undefined> {
  const row = await db.get(`
    SELECT us.session_data
    FROM user_sessions us
    JOIN users u ON us.user_id = u.id
    WHERE u.bluesky_did = ?
  `, [userDid]) as { session_data: string } | undefined;

  return row ? JSON.parse(row.session_data) as NodeSavedSession : undefined;
}

export async function deleteOAuthSession(userDid: string): Promise<void> {
  await db.run(`
    DELETE FROM user_sessions 
    WHERE user_id = (SELECT id FROM users WHERE bluesky_did = ?)
  `, [userDid]);
}
