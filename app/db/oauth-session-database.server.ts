import type { NodeSavedSession } from "@atproto/oauth-client-node";
import { useDatabase } from "./database.server";

export async function storeOAuthSession(userDid: string, session: NodeSavedSession): Promise<void> {
  await useDatabase(async db => {
    await db.run(`
      INSERT OR REPLACE INTO oauth_sessions (user_did, session_data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [userDid, JSON.stringify(session)]);
  });
}

export async function getOAuthSession(userDid: string): Promise<NodeSavedSession | undefined> {
  return await useDatabase(async db => {
    const row = await db.get(`
      SELECT session_data
      FROM oauth_sessions
      WHERE user_did = ?
    `, [userDid]) as { session_data: string } | undefined;

    return row ? JSON.parse(row.session_data) as NodeSavedSession : undefined;
  });
}

export async function deleteOAuthSession(userDid: string): Promise<void> {
  await useDatabase(async db => {
    await db.run('DELETE FROM oauth_sessions WHERE user_did = ?', [userDid]);
  });
}

export async function updateOAuthSession(userDid: string, session: NodeSavedSession): Promise<void> {
  await useDatabase(async db => {
    await db.run(`
      INSERT INTO oauth_sessions (user_did, session_data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_did) DO UPDATE SET
        session_data = excluded.session_data,
        updated_at = excluded.updated_at
    `, [userDid, JSON.stringify(session)]);
  });
}

export async function deleteExpiredOAuthSessions(olderThanDays: number = 30): Promise<number> {
  return await useDatabase(async db => {
    const result = await db.run(`
      DELETE FROM oauth_sessions 
      WHERE updated_at < datetime('now', '-${olderThanDays} days')
    `);
    
    return result.changes || 0;
  });
}
