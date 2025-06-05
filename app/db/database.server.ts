import { open, Database as SqliteDatabase } from 'sqlite';
import Database from 'sqlite3';

interface DatabasePool {
  connections: SqliteDatabase[];
  available: SqliteDatabase[];
  inUse: Set<SqliteDatabase>;
  maxConnections: number;
  currentConnections: number;
  isShuttingDown: boolean;
}

let _pool: DatabasePool | undefined;

const POOL_SIZE = 5; // Increase to handle concurrent operations better
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 100;

export async function useDatabase<T>(
  operation: (db: SqliteDatabase) => Promise<T>
): Promise<T> {
  let db: SqliteDatabase | null = null;
  let lastError: Error;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      db = await ensureDatabase();
      const result = await operation(db);
      return result;
    } catch (error: any) {
      lastError = error;
      
      console.log(`❌ Database error on attempt ${attempt}/${MAX_RETRIES}:`, {
        message: error.message,
        code: error.code,
        errno: error.errno
      });
      
      // Check for SQLite busy conditions
      const isBusyError = 
        error.code === 'SQLITE_BUSY' || 
        error.errno === 5 || 
        error.message?.includes('database is locked') ||
        error.message?.includes('SQLITE_BUSY') ||
        error.message?.includes('SQLITE_LOCKED');
      
      if (isBusyError && attempt < MAX_RETRIES) {
        console.log(`🔄 SQLite busy on attempt ${attempt}/${MAX_RETRIES}, retrying...`);
        
        // Simple exponential backoff
        const delayMs = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // For busy errors, just release normally and try again
        // Don't immediately mark as corrupted since busy is often temporary
        if (db) {
          await releaseDatabase(db, false);
          db = null;
        }
        
        continue;
      } else {
        // For non-busy errors, mark connection as potentially corrupted
        const shouldCloseConnection = !isBusyError && (
          error.code === 'SQLITE_CORRUPT' ||
          error.code === 'SQLITE_NOTADB' ||
          error.message?.includes('malformed') ||
          error.message?.includes('corrupt')
        );
        
        if (db) {
          await releaseDatabase(db, shouldCloseConnection);
          db = null;
        }
        
        throw error;
      }
    } finally {
      if (db) {
        await releaseDatabase(db, false);
      }
    }
  }
  
  throw lastError!;
}

export async function ensureDatabase(): Promise<SqliteDatabase> {
  if (!_pool) {
    _pool = await initDatabasePool();
  }
  return await getConnection(_pool);
}

export async function releaseDatabase(db: SqliteDatabase, forceClose: boolean = false): Promise<void> {
  if (!_pool || !_pool.inUse.has(db)) {
    return;
  }
  
  _pool.inUse.delete(db);
  
  if (forceClose) {
    // Remove from pool and close the connection
    const index = _pool.connections.indexOf(db);
    if (index > -1) {
      _pool.connections.splice(index, 1);
      _pool.currentConnections--;
    }
    
    try {
      await db.close();
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  } else {
    _pool.available.push(db);
  }
}

async function initDatabasePool(): Promise<DatabasePool> {
  const pool: DatabasePool = {
    connections: [],
    available: [],
    inUse: new Set(),
    maxConnections: POOL_SIZE,
    currentConnections: 0,
    isShuttingDown: false
  };

  // Create all initial connections upfront to avoid creation delays
  console.log(`🏊 Initializing pool with ${POOL_SIZE} connections...`);
  for (let i = 0; i < POOL_SIZE; i++) {
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
  
  try {
    // Enable WAL mode first - this is crucial for concurrency
    await db.run('PRAGMA journal_mode = WAL;');
    
    // Configure busy timeout BEFORE other settings
    await db.run('PRAGMA busy_timeout = 30000;'); // 30 seconds
    
    // Other performance settings
    await db.run('PRAGMA synchronous = NORMAL;');
    await db.run('PRAGMA cache_size = -4000;'); // 4MB cache
    await db.run('PRAGMA temp_store = memory;');
    await db.run('PRAGMA mmap_size = 268435456;'); // 256MB mmap
    await db.run('PRAGMA wal_autocheckpoint = 1000;');
    
    // Critical: Ensure normal locking mode (not exclusive)
    await db.run('PRAGMA locking_mode = NORMAL;');
    
  } catch (error) {
    console.error('Error configuring SQLite connection:', error);
    await db.close();
    throw error;
  }
  
  // Set up tables AFTER configuration
  await setupTables(db);

  return db;
}

async function getConnection(pool: DatabasePool): Promise<SqliteDatabase> {
  if (pool.isShuttingDown) {
    throw new Error('Database pool is shutting down');
  }
  
  // If there's an available connection, use it
  if (pool.available.length > 0) {
    const db = pool.available.pop()!;
    pool.inUse.add(db);
    return db;
  }

  // If we can create more connections, create one
  if (pool.currentConnections < pool.maxConnections) {
    try {
      const db = await createConnection();
      pool.connections.push(db);
      pool.inUse.add(db);
      pool.currentConnections++;
      return db;
    } catch (error) {
      console.error('Failed to create new connection:', error);
      // Fall through to wait for existing connection
    }
  }

  // Wait for a connection to become available
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeout = 5000;
    
    const checkForConnection = () => {
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Database pool timeout after ${timeout}ms - no connections available`));
        return;
      }
      
      if (pool.available.length > 0) {
        const db = pool.available.pop()!;
        pool.inUse.add(db);
        resolve(db);
      } else {
        setTimeout(checkForConnection, 50);
      }
    };

    checkForConnection();
  });
}

export async function shutdownPool(): Promise<void> {
  if (!_pool) return;
  _pool.isShuttingDown = true;
  
  let attempts = 0;
  while (_pool.inUse.size > 0 && attempts < 100) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  for (const db of _pool.connections) {
    try {
      await db.close();
    } catch (error) {
      console.error('Error closing database connection during shutdown:', error);
    }
  }
  
  _pool = undefined;
}

export async function setupTables(db: SqliteDatabase) {
  await db.exec('BEGIN TRANSACTION;');
  
  try {
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

      CREATE INDEX IF NOT EXISTS idx_posting_schedules_active ON posting_schedules(active, user_did);
    `);
    
    await db.exec('COMMIT;');
  } catch (error) {
    await db.exec('ROLLBACK;');
    throw error;
  }
}
