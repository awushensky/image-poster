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
      // Only release if we haven't already released it due to error
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
  if (!_pool) {
    console.warn('⚠️ Trying to release connection but no pool exists');
    return;
  }
  
  if (!_pool.inUse.has(db)) {
    console.warn('⚠️ Trying to release connection that was not in use');
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
      console.log(`🔴 Closed corrupted connection. Pool: ${_pool.available.length} available, ${_pool.inUse.size} in use`);
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
  } else {
    _pool.available.push(db);
    console.log(`🔓 Released connection. Pool: ${_pool.available.length} available, ${_pool.inUse.size} in use`);
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
    try {
      const db = await createConnection();
      pool.connections.push(db);
      pool.available.push(db);
      pool.currentConnections++;
      console.log(`✅ Created connection ${i + 1}/${POOL_SIZE}`);
    } catch (error) {
      console.error(`❌ Failed to create connection ${i + 1}:`, error);
      throw error;
    }
  }

  console.log(`🏊 Pool initialized with ${pool.currentConnections} connections`);
  return pool;
}

async function createConnection(): Promise<SqliteDatabase> {
  const db = await open({
    filename: './data/app.db',
    driver: Database.Database
  });

  console.log('Configuring SQLite connection...');
  
  try {
    // Enable WAL mode first - this is crucial for concurrency
    const walResult = await db.run('PRAGMA journal_mode = WAL;');
    console.log('WAL mode set:', walResult);
    
    // Configure busy timeout BEFORE other settings
    await db.run('PRAGMA busy_timeout = 30000;'); // 30 seconds
    
    // Verify busy timeout was set
    const timeoutCheck = await db.get('PRAGMA busy_timeout;');
    console.log('Busy timeout set to:', timeoutCheck);
    
    // Other performance settings
    await db.run('PRAGMA synchronous = NORMAL;');
    await db.run('PRAGMA cache_size = -4000;'); // 4MB cache
    await db.run('PRAGMA temp_store = memory;');
    await db.run('PRAGMA mmap_size = 268435456;'); // 256MB mmap
    await db.run('PRAGMA wal_autocheckpoint = 1000;');
    
    // Critical: Ensure normal locking mode (not exclusive)
    await db.run('PRAGMA locking_mode = NORMAL;');
    
    // Final verification of key settings
    const [mode, timeout, locking] = await Promise.all([
      db.get('PRAGMA journal_mode;'),
      db.get('PRAGMA busy_timeout;'),
      db.get('PRAGMA locking_mode;')
    ]);
    
    console.log(`SQLite configured: journal_mode=${mode?.journal_mode}, busy_timeout=${timeout?.busy_timeout}, locking_mode=${locking?.locking_mode}`);
    
    // Verify the database file is accessible
    await db.get('SELECT 1 as test;');
    console.log('Database connection test passed');
    
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
  
  console.log(`🔗 Pool status: ${pool.available.length} available, ${pool.inUse.size} in use, ${pool.currentConnections} total`);
  
  // If there's an available connection, use it
  if (pool.available.length > 0) {
    const db = pool.available.pop()!;
    pool.inUse.add(db);
    console.log(`✅ Using existing connection. Pool: ${pool.available.length} available, ${pool.inUse.size} in use`);
    return db;
  }

  // If we can create more connections, create one
  if (pool.currentConnections < pool.maxConnections) {
    console.log(`🆕 Creating new connection (${pool.currentConnections + 1}/${pool.maxConnections})`);
    try {
      const db = await createConnection();
      pool.connections.push(db);
      pool.inUse.add(db);
      pool.currentConnections++;
      console.log(`✅ Created new connection. Pool: ${pool.available.length} available, ${pool.inUse.size} in use`);
      return db;
    } catch (error) {
      console.error('Failed to create new connection:', error);
      // Fall through to wait for existing connection
    }
  }

  // Wait for a connection to become available
  console.log(`⏳ Pool exhausted, waiting for connection...`);
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const timeout = 5000; // Reduced to 5 seconds to fail fast
    
    const checkForConnection = () => {
      if (Date.now() - startTime > timeout) {
        console.error(`❌ Pool timeout after ${timeout}ms! Available: ${pool.available.length}, In use: ${pool.inUse.size}, Total: ${pool.currentConnections}`);
        console.error(`❌ Pool connections breakdown:`, {
          available: pool.available.length,
          inUse: pool.inUse.size,
          total: pool.currentConnections,
          maxConnections: pool.maxConnections
        });
        reject(new Error(`Database pool timeout after ${timeout}ms - no connections available`));
        return;
      }
      
      if (pool.available.length > 0) {
        const db = pool.available.pop()!;
        pool.inUse.add(db);
        console.log(`✅ Got connection after waiting ${Date.now() - startTime}ms. Pool: ${pool.available.length} available, ${pool.inUse.size} in use`);
        resolve(db);
      } else {
        // Check again in 50ms
        setTimeout(checkForConnection, 50);
      }
    };
    checkForConnection();
  });
}

// Add graceful shutdown
export async function shutdownPool(): Promise<void> {
  if (!_pool) return;
  
  console.log('🛑 Shutting down database pool...');
  _pool.isShuttingDown = true;
  
  // Wait for all connections to be released
  let attempts = 0;
  while (_pool.inUse.size > 0 && attempts < 100) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  // Close all connections
  for (const db of _pool.connections) {
    try {
      await db.close();
    } catch (error) {
      console.error('Error closing database connection during shutdown:', error);
    }
  }
  
  _pool = undefined;
  console.log('✅ Database pool shut down');
}

export async function setupTables(db: SqliteDatabase) {
  // Wrap table creation in a transaction for atomicity
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
