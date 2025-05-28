import { ensureDatabase } from './database.server';
import { createHmac } from 'crypto';
import type { NodeSavedSession } from '@atproto/oauth-client-node';
import type { User } from "~/model/model";


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
  const sessionToken = generateSessionToken(userDid);
  const existingSession = await getOAuthSession(userDid);
  if (!existingSession) {
    throw new Error(`No OAuth session found for user: ${userDid}`);
  }
  
  const db = await ensureDatabase();
  await db.run(`
    INSERT OR REPLACE INTO user_sessions (session_token, user_did, session_data, last_used_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `, [sessionToken, userDid, JSON.stringify(existingSession)]);
  
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
  const sessionToken = generateSessionToken(userDid);
  const db = await ensureDatabase();
  await db.run(`
    INSERT OR REPLACE INTO user_sessions (user_did, session_token, session_data, last_used_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `, [userDid, sessionToken, JSON.stringify(session)]);
}

export async function getOAuthSession(userDid: string): Promise<NodeSavedSession | undefined> {
  const db = await ensureDatabase();
  const row = await db.get(`
    SELECT us.session_data
    FROM user_sessions us
    WHERE us.user_did = ?
  `, [userDid]) as { session_data: string } | undefined;

  return row ? JSON.parse(row.session_data) as NodeSavedSession : undefined;
}

export async function deleteOAuthSession(userDid: string): Promise<void> {
  const db = await ensureDatabase();
  await db.run(`DELETE FROM user_sessions WHERE user_did = ?`, [userDid]);
}
