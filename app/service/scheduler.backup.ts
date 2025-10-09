import * as cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

let backupTask: cron.ScheduledTask | null = null;

/**
 * Run the database backup script
 */
async function runBackup(): Promise<void> {
  console.log(`[${new Date().toISOString()}] [Backup] Starting backup...`);
  
  try {
    const { stdout, stderr } = await execAsync('/app/scripts/backup.sh');
    
    if (stdout) {
      console.log(`[${new Date().toISOString()}] [Backup] ${stdout.trim()}`);
    }
    
    if (stderr) {
      console.error(`[${new Date().toISOString()}] [Backup] Warnings: ${stderr.trim()}`);
    }
    
    console.log(`[${new Date().toISOString()}] [Backup] Backup completed successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [Backup] Failed:`, error);
  }
}

/**
 * Start the backup scheduler
 */
export function startBackupScheduler(): void {
  if (backupTask) {
    console.log('[Backup] Scheduler already running');
    return;
  }

  // Schedule backup daily at 3:00 AM
  backupTask = cron.schedule('0 3 * * *', () => {
    runBackup();
  });

  console.log('[Backup] Scheduler started - backups will run daily at 3:00 AM');
}

/**
 * Stop the backup scheduler
 */
export function stopBackupScheduler(): void {
  if (backupTask) {
    backupTask.stop();
    backupTask = null;
    console.log('[Backup] Scheduler stopped');
  }
}

/**
 * Manually trigger a backup
 */
export async function triggerBackup(): Promise<void> {
  await runBackup();
}