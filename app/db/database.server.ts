import { open, Database as SqliteDatabase } from 'sqlite';
import Database from 'sqlite3';

let _db: SqliteDatabase | undefined;

export async function ensureDatabase() {
  if (!_db) {
    _db = await initDatabase();
  }
  return _db;
}

async function initDatabase() {
  const db = await open({
    filename: './data/app.db',
    driver: Database.Database
  });

  setupTables(db);

  return db;
}

export async function setupTables(db: SqliteDatabase) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      did TEXT PRIMARY KEY,
      handle TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      user_did TEXT PRIMARY KEY,
      session_token TEXT NOT NULL,
      session_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_did) REFERENCES user (did) ON DELETE CASCADE,
      UNIQUE(session_token)
    );
    
    CREATE TABLE IF NOT EXISTS queued_images (
      storage_key TEXT PRIMARY KEY,
      user_did TEXT NOT NULL,
      post_text TEXT NOT NULL,
      is_nsfw BOOLEAN DEFAULT TRUE NOT NULL,
      queue_order INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (user_did) REFERENCES users (did) ON DELETE CASCADE,
      UNIQUE(user_did, queue_order)
    );
    
    CREATE TABLE IF NOT EXISTS posting_times (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_did TEXT NOT NULL,
      hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
      minute INTEGER NOT NULL CHECK (minute >= 0 AND minute <= 59),
      day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_did) REFERENCES users (did) ON DELETE CASCADE,
      UNIQUE(user_did, hour, minute, day_of_week)
    );
  `);
}
