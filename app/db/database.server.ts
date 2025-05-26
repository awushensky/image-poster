import { open, Database as SqliteDatabase } from 'sqlite';
import Database from 'sqlite3';
import { userDatabaseConfig } from './user-database.server';
import { postingTimeDatabaseConfig } from './posting-time-database.server';
import { imageQueueDatabaseConfig } from './image-queue-database.server';
import { userSessionDatabaseConfig } from './user-session-database.server';
import { topologicalSort, type DatabaseModule } from './util';


// Database module registry
const databaseModules: DatabaseModule[] = [
  userDatabaseConfig,
  postingTimeDatabaseConfig,
  imageQueueDatabaseConfig,
  userSessionDatabaseConfig,
];

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

  const sortedModules = topologicalSort(databaseModules);
  for (const module of sortedModules) {
    try {
      await db.exec(module.initSQL);
      console.log(`✓ ${module.name} initialized successfully`);
    } catch (error) {
      console.error(`✗ Failed to initialize ${module.name}:`, error);
      throw error;
    }
  }

  return db;
}
