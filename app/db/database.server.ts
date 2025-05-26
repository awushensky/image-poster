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
  
  console.log('Checking database modules...');
  databaseModules.forEach((module, index) => {
    if (!module) {
      console.error(`❌ Database module at index ${index} is undefined`);
      throw new Error(`Database module at index ${index} is undefined. Check your imports in database.server.ts`);
    }
    if (!module.name) {
      console.error(`❌ Database module at index ${index} is missing 'name' property:`, module);
      throw new Error(`Database module at index ${index} is missing 'name' property`);
    }
    console.log(`✓ Found module: ${module.name}`);
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
