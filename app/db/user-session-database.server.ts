import { createHmac } from 'crypto';
import type { User } from "~/model/model";
import { getMutex } from '~/lib/mutex';
import { getOAuthSession } from './oauth-session-database.server';
import { useDatabase } from './database.server';


const MUTEX_PURPOSE = 'user-session';

function generateSessionToken(userDid: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  return createHmac('sha256', secret)
    .update(userDid)
    .digest('hex');
}

export async function createUserSession(userDid: string): Promise<string> {
  // Verify OAuth session exists before creating user session
  const existingOAuthSession = await getOAuthSession(userDid);
  if (!existingOAuthSession) {
    throw new Error(`No OAuth session found for user: ${userDid}`);
  }
  
  const sessionToken = generateSessionToken(userDid);
  await useDatabase(async db => await db.run(
    `
      INSERT OR REPLACE INTO user_sessions (session_token, user_did, last_used_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [sessionToken, userDid])
  );
  
  return sessionToken;
}

export async function getUserFromSession(sessionToken: string): Promise<User | undefined> {
  return await getMutex(MUTEX_PURPOSE, sessionToken).runExclusive(async () => await useDatabase(async db => {
    await db.run('BEGIN TRANSACTION');

    try {
      const user = await db.get(`
        SELECT u.*
        FROM user_sessions us
        JOIN users u ON us.user_did = u.did
        WHERE us.session_token = ?
      `, [sessionToken]) as User | undefined;

      if (user) {
        await db.run(`
          UPDATE user_sessions 
          SET last_used_at = CURRENT_TIMESTAMP 
          WHERE session_token = ?
        `, [sessionToken]);
      }
      
      await db.run('COMMIT');
      return user;
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  }));
}

export async function deleteSessionByToken(sessionToken: string): Promise<void> {
  await useDatabase(async db => await db.run('DELETE FROM user_sessions WHERE session_token = ?', [sessionToken]));
}

export async function deleteUserSessionsByDid(userDid: string): Promise<void> {
  await useDatabase(async db => await db.run('DELETE FROM user_sessions WHERE user_did = ?', [userDid]));
}
