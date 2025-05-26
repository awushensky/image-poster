import type { User } from '~/model/database';
import { ensureDatabase } from './database.server';


export async function getUserByDid(did: string): Promise<User | undefined> {
  const db = await ensureDatabase();
  return await db.get('SELECT * FROM users WHERE did = ?', [did]);
}

export async function createOrUpdateUser(did: string): Promise<User> {
  const db = await ensureDatabase();
  const existing = await getUserByDid(did);
  
  if (existing) {
    await db.run(`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE did = ?
    `, [did]);
    return (await getUserByDid(did))!;
  } else {
    await db.run(`
      INSERT INTO users (did)
      VALUES (?)
    `, [did]);
    return (await getUserByDid(did))!;
  }
}
