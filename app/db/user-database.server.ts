import type { User } from "~/model/model";
import { ensureDatabase } from './database.server';


export async function getUserByDid(did: string): Promise<User | undefined> {
  const db = await ensureDatabase();
  return await db.get('SELECT * FROM users WHERE did = ?', [did]);
}

export async function createOrUpdateUser(did: string, handle: string, displayName?: string, avatarUrl?: string): Promise<User> {
  const db = await ensureDatabase();
  const existing = await getUserByDid(did);
  
  if (existing) {
    await db.run(`
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP,
      handle = ?,
      display_name = ?,
      avatar_url = ?
      WHERE did = ?
    `, [handle, displayName, avatarUrl, did]);
    return (await getUserByDid(did))!;
  } else {
    await db.run(`
      INSERT INTO users (did, handle, display_name, avatar_url)
      VALUES (?, ?, ?, ?)
    `, [did, handle, displayName, avatarUrl]);
    return (await getUserByDid(did))!;
  }
}
