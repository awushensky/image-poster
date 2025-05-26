import { ensureDatabase } from './database.server';
import { createHmac } from 'crypto';
import { createOrUpdateUser, type User } from './user-database.server';
import type { NodeSavedSession } from '@atproto/oauth-client-node';
import type { DatabaseModule } from './util';


export const userSessionDatabaseConfig: DatabaseModule = {
  name: 'user_sessions',
  dependencies: ['users'],
  initSQL: `
    CREATE TABLE IF NOT EXISTS user_sessions (
      session_token TEXT NOT NULL,
      user_did TEXT PRIMARY KEY,
      session_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_did) REFERENCES users (did) ON DELETE CASCADE,
      UNIQUE(session_token)
    );
  `
};

/*********************************
 * User Session Management
 **********************************/
function generateSessionToken(userDid: string): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  return createHmac('sha256', secret)
    .update(userDid)
    .digest('hex');
}

export async function createUserSession(userDid: string): Promise<string> {
  const user = await createOrUpdateUser(userDid);

  const sessionToken = generateSessionToken(userDid);
  const existingSession = await getOAuthSession(userDid);
  if (!existingSession) {
    throw new Error(`No OAuth session found for user: ${userDid}`);
  }
  
  const db = await ensureDatabase();
  await db.run(`
    INSERT OR REPLACE INTO user_sessions (session_token, user_did, session_data, last_used_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `, [sessionToken, user.did, JSON.stringify(existingSession)]);
  
  return sessionToken;
}

export async function getUserFromSession(session_token: string): Promise<User | undefined> {
  const db = await ensureDatabase();
  const user = await db.get(`
    SELECT u.*
    FROM user_sessions us
    JOIN users u ON us.user_did = u.did
    WHERE us.session_token = ?
  `, [session_token]) as User | undefined;

  if (user) {
    await db.run(`
      UPDATE user_sessions 
      SET last_used_at = CURRENT_TIMESTAMP 
      WHERE session_token = ?
    `, [session_token]);
  }
  
  return user;
}

export async function deleteSessionByToken(session_token: string): Promise<void> {
  const db = await ensureDatabase();
  await db.run('DELETE FROM user_sessions WHERE session_token = ?', [session_token]);
}

/*********************************
 * OAuth Session Management
 **********************************/
export async function storeOAuthSession(userDid: string, session: NodeSavedSession): Promise<void> {
  const user = await createOrUpdateUser(userDid);
  if (!user) {
    throw new Error(`User not found for DID: ${userDid}`);
  }

  const sessionToken = generateSessionToken(userDid);
  const db = await ensureDatabase();
  await db.run(`
    INSERT OR REPLACE INTO user_sessions (session_token, user_did, session_data, last_used_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `, [sessionToken, user.did, JSON.stringify(session)]);
}

export async function getOAuthSession(userDid: string): Promise<NodeSavedSession | undefined> {
  const db = await ensureDatabase();
  const row = await db.get(`
    SELECT us.session_data
    FROM user_sessions us
    JOIN users u ON us.user_did = u.did
    WHERE u.did = ?
  `, [userDid]) as { session_data: string } | undefined;

  return row ? JSON.parse(row.session_data) as NodeSavedSession : undefined;
}

export async function deleteOAuthSession(userDid: string): Promise<void> {
  const db = await ensureDatabase();
  await db.run(`DELETE FROM user_sessions WHERE user_did = ?`, [userDid]);
}
