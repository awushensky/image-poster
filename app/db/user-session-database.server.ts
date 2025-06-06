import { createHmac } from 'crypto';
import { useDatabase } from './database.server';

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
  return await useDatabase(async db => {
    const existingOAuthSession = await db.get(
      'SELECT 1 FROM oauth_sessions WHERE user_did = ?',
      [userDid]
    );
    
    if (!existingOAuthSession) {
      throw new Error(`No OAuth session found for user: ${userDid}`);
    }
    
    const sessionToken = generateSessionToken(userDid);
    await db.run(`
      INSERT OR REPLACE INTO user_sessions (session_token, user_did, last_used_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [sessionToken, userDid]);
    
    return sessionToken;
  });
}

export async function deleteUserSession(sessionToken: string): Promise<void> {
  await useDatabase(async db => {
    await db.run('DELETE FROM user_sessions WHERE session_token = ?', [sessionToken]);
  });
}

// Cleanup old sessions (useful for maintenance)
export async function cleanupExpiredSessions(olderThanDays: number = 30): Promise<number> {
  return await useDatabase(async db => {
    const result = await db.run(`
      DELETE FROM user_sessions 
      WHERE last_used_at < datetime('now', '-${olderThanDays} days')
    `);
    
    return result.changes || 0;
  });
}
