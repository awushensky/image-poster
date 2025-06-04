import type { NodeSavedSession } from "@atproto/oauth-client-node";
import { ensureDatabase } from "./database.server";

export async function storeOAuthSession(userDid: string, session: NodeSavedSession): Promise<void> {
  const db = await ensureDatabase();
  await db.run(`
    INSERT OR REPLACE INTO oauth_sessions (user_did, session_data, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
  `, [userDid, JSON.stringify(session)]);
}

export async function getOAuthSession(userDid: string): Promise<NodeSavedSession | undefined> {
  const db = await ensureDatabase();
  const row = await db.get(`
    SELECT session_data
    FROM oauth_sessions
    WHERE user_did = ?
  `, [userDid]) as { session_data: string } | undefined;

  return row ? JSON.parse(row.session_data) as NodeSavedSession : undefined;
}

export async function deleteOAuthSession(userDid: string): Promise<void> {
  const db = await ensureDatabase();
  await db.run('DELETE FROM oauth_sessions WHERE user_did = ?', [userDid]);
}

export async function updateOAuthSession(userDid: string, session: NodeSavedSession): Promise<void> {
  const db = await ensureDatabase();
  const result = await db.run(`
    UPDATE oauth_sessions 
    SET session_data = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_did = ?
  `, [JSON.stringify(session), userDid]);
  
  if (result.changes === 0) {
    // If no rows were updated, the session doesn't exist, so insert it
    await storeOAuthSession(userDid, session);
  }
}
