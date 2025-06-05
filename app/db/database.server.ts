import { open, Database as SqliteDatabase } from 'sqlite';
import Database from 'sqlite3';

interface DatabasePool {
  connections: SqliteDatabase[];
  available: SqliteDatabase[];
  inUse: Set<SqliteDatabase>;
  maxConnections: number;
  currentConnections: number;
}

let _pool: DatabasePool | undefined;

const POOL_SIZE = 10;

export async function useDatabase<T>(
  fn: (db: SqliteDatabase) => Promise<T>
): Promise<T> {
  const db = await ensureDatabase();
  try {
    return await fn(db);
  } finally {
    await releaseDatabase(db);
  }
}

async function ensureDatabase(): Promise<SqliteDatabase> {
  if (!_pool) {
    _pool = await initDatabasePool();
  }
  return await getConnection(_pool);
}

async function releaseDatabase(db: SqliteDatabase): Promise<void> {
  if (!_pool) return;
  
  _pool.inUse.delete(db);
  _pool.available.push(db);
}

async function initDatabasePool(): Promise<DatabasePool> {
  const pool: DatabasePool = {
    connections: [],
    available: [],
    inUse: new Set(),
    maxConnections: POOL_SIZE,
    currentConnections: 0
  };

  for (let i = 0; i < Math.min(3, POOL_SIZE); i++) {
    const db = await createConnection();
    pool.connections.push(db);
    pool.available.push(db);
    pool.currentConnections++;
  }

  return pool;
}

async function createConnection(): Promise<SqliteDatabase> {
  const db = await open({
    filename: './data/app.db',
    driver: Database.Database
  });

  await db.exec('PRAGMA journal_mode = WAL;');
  await db.exec('PRAGMA synchronous = NORMAL;');
  await db.exec('PRAGMA cache_size = 1000;');
  await db.exec('PRAGMA temp_store = memory;');
  
  await setupTables(db);

  return db;
}

async function getConnection(pool: DatabasePool): Promise<SqliteDatabase> {
  // If there's an available connection, use it
  if (pool.available.length > 0) {
    const db = pool.available.pop()!;
    pool.inUse.add(db);
    return db;
  }

  // If we can create more connections, create one
  if (pool.currentConnections < pool.maxConnections) {
    const db = await createConnection();
    pool.connections.push(db);
    pool.inUse.add(db);
    pool.currentConnections++;
    return db;
  }

  // Wait for a connection to become available
  return new Promise((resolve) => {
    const checkForConnection = () => {
      if (pool.available.length > 0) {
        const db = pool.available.pop()!;
        pool.inUse.add(db);
        resolve(db);
      } else {
        // Check again in 10ms
        setTimeout(checkForConnection, 10);
      }
    };
    checkForConnection();
  });
}

export async function setupTables(db: SqliteDatabase) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      did TEXT PRIMARY KEY,
      handle TEXT NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      timezone TEXT NOT NULL CHECK (timezone IN ('America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow', 'Asia/Tokyo', 'Australia/Sydney', 'Etc/UTC')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      session_token TEXT PRIMARY KEY,
      user_did TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_did) REFERENCES users (did) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS oauth_sessions (
      user_did TEXT PRIMARY KEY,
      session_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_did) REFERENCES users (did) ON DELETE CASCADE
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

    CREATE TABLE IF NOT EXISTS posted_images (
      storage_key TEXT PRIMARY KEY,
      user_did TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_did) REFERENCES users (did) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS posting_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_did TEXT NOT NULL,
      cron_expression TEXT NOT NULL,
      color TEXT NOT NULL CHECK (color IN ('blue', 'cyan', 'green', 'purple', 'pink', 'orange', 'red')),
      active BOOLEAN DEFAULT TRUE NOT NULL,
      last_executed DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_did) REFERENCES users (did) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_posting_schedules_active ON posting_schedules(active, user_did)
  `);
}
