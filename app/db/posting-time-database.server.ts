import { ensureDatabase } from './database.server';
import type { User } from './user-database.server';
import type { DatabaseModule } from './util';


export interface PostingTime {
  hour: number;
  minute: number;
  day_of_week: number;
}

export const postingTimeDatabaseConfig: DatabaseModule = {
  name: 'posting_times',
  dependencies: ['users'],
  initSQL: `
    CREATE TABLE IF NOT EXISTS posting_times (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_did TEXT NOT NULL,
      hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
      minute INTEGER NOT NULL CHECK (minute >= 0 AND minute <= 59),
      day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_did) REFERENCES users (did) ON DELETE CASCADE,
      UNIQUE(user_did, hour, minute, day_of_week)
    );
  `
};

export async function getUserPostingTimes(userDid: string): Promise<PostingTime[]> {
  const db = await ensureDatabase();
  const rows = await db.all(
    'SELECT hour, minute, day_of_week FROM posting_times WHERE user_did = ? ORDER BY hour, minute',
    [userDid]
  );

  return rows.map(row => ({ 
    hour: row.hour, 
    minute: row.minute, 
    day_of_week: row.day_of_week 
  })) as PostingTime[];
}

export async function updateUserPostingTimes(userDid: string, times: PostingTime[]): Promise<void> {
  const db = await ensureDatabase();
  await db.run('BEGIN TRANSACTION');
  try {
    await db.run('DELETE FROM posting_times WHERE user_did = ?', [userDid]);
    
    for (const time of times) {
      await db.run(
        'INSERT INTO posting_times (user_did, hour, minute, day_of_week) VALUES (?, ?, ?, ?)',
        [userDid, time.hour, time.minute, time.day_of_week]
      );
    }
    
    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

export async function getUsersWithPostingDueAt(
  hour: number, 
  minute: number, 
  day_of_week: number
): Promise<Array<User>> {
  const db = await ensureDatabase();
  return await db.all(`
    SELECT u.*
    FROM users u 
    JOIN posting_times pt ON u.did = pt.user_did 
    WHERE pt.hour = ? AND pt.minute = ? AND pt.day_of_week = ?
  `, [hour, minute, day_of_week]);
}
