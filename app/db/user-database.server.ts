import type { User } from "~/model/model";
import { useDatabase } from './database.server';


interface UserRow {
  did: string;
  handle: string;
  timezone: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  last_login: string;
}

function transformUserRow(row: UserRow): User {
  return {
    did: row.did,
    handle: row.handle,
    timezone: row.timezone,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    lastLogin: row.last_login,
  };
}

export async function getUserByDid(did: string): Promise<User | undefined> {
  return await useDatabase(async db => {
    const row: UserRow | undefined = await db.get('SELECT * FROM users WHERE did = ?', [did]);
    return row ? transformUserRow(row) : undefined;
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
    const updatedRow: UserRow | undefined = await db.get(`
      INSERT INTO users (did, handle, timezone, display_name, avatar_url, last_login)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(did) DO UPDATE SET
        handle = excluded.handle,
        timezone = excluded.timezone,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        last_login = CURRENT_TIMESTAMP
      RETURNING *
    `, [did, handle, timezone, displayName, avatarUrl]);
    
    return transformUserRow(updatedRow!);
  });
}

export async function getUserFromSession(sessionToken: string): Promise<User | undefined> {
  return await useDatabase(async (db) => {
    const userRow: UserRow | undefined = await db.get(`
      SELECT u.did, u.handle, u.display_name, u.avatar_url, u.timezone, u.created_at, u.last_login
      FROM user_sessions us
      JOIN users u ON us.user_did = u.did
      WHERE us.session_token = ?
    `, [sessionToken]);

    if (userRow) {
      await db.run(`
        UPDATE user_sessions 
        SET last_used_at = CURRENT_TIMESTAMP 
        WHERE session_token = ?
      `, [sessionToken]);
    }

    return userRow ? transformUserRow(userRow) : undefined;
  });
}

