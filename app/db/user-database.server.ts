import type { User } from "~/model/model";
import { useDatabase } from './database.server';

export async function getUserByDid(did: string): Promise<User | undefined> {
  return await useDatabase(async db => {
    return await db.get('SELECT * FROM users WHERE did = ?', [did]);
  });
}

export async function createOrUpdateUser(
  did: string,
  handle: string,
  timezone: string,
  displayName?: string,
  avatarUrl?: string,
): Promise<User> {
  return await useDatabase(async db => {
    await db.run(`
      INSERT INTO users (did, handle, timezone, display_name, avatar_url, last_login)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(did) DO UPDATE SET
        handle = excluded.handle,
        timezone = excluded.timezone,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        last_login = CURRENT_TIMESTAMP
    `, [did, handle, timezone, displayName, avatarUrl]);
    
    return await db.get('SELECT * FROM users WHERE did = ?', [did]) as User;
  });
}
