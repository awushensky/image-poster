import { ensureDatabase } from './database.server';
import type { DatabaseModule } from './util';


export interface User {
  did: string;
  created_at: string;
  last_login: string;
}

export const userDatabaseConfig: DatabaseModule = {
  name: 'users',
  dependencies: [],
  initSQL: `
    CREATE TABLE IF NOT EXISTS users (
      did TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `
};

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
