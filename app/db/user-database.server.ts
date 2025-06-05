import type { User } from "~/model/model";
import { useDatabase } from './database.server';
import { getMutex } from "~/lib/mutex";


const MUTEX_PURPOSE = 'user-database';

export async function getUserByDid(did: string): Promise<User | undefined> {
  return await useDatabase(async db => await db.get('SELECT * FROM users WHERE did = ?', [did]));
}

export async function createOrUpdateUser(
  did: string,
  handle: string,
  timezone: string,
  displayName?: string,
  avatarUrl?: string,
): Promise<User> {
  return await getMutex(MUTEX_PURPOSE, did).runExclusive(async () => await useDatabase(async db => {
    const existing = await getUserByDid(did);

    if (existing) {
      await db.run(`
        UPDATE users
        SET last_login = CURRENT_TIMESTAMP,
        handle = ?,
        timezone = ?,
        display_name = ?,
        avatar_url = ?
        WHERE did = ?
      `, [handle, timezone, displayName, avatarUrl, did]);
      return (await getUserByDid(did))!;
    } else {
      await db.run(`
        INSERT INTO users (did, handle, timezone, display_name, avatar_url)
        VALUES (?, ?, ?, ?, ?)
      `, [did, handle, timezone, displayName, avatarUrl]);
      return (await getUserByDid(did))!;
    }
  }));
}
