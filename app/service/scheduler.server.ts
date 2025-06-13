import { fileStorage } from '../storage/image-storage.server';
import { postImageToBluesky } from '../auth/bluesky-auth.server';
import { type PostingSchedule } from "~/model/posting-schedules";
import { type QueuedImage } from "~/model/queued-images";
import { getNextImageAndUpdateSchedule as getNextImageAndUpdateSchedule } from "~/db/image-queue-database.server";
import { moveImageToPosted } from "~/db/posted-image-database.server";
import { getNextExecution } from '~/lib/cron-utils';
import { getAllActivePostingSchedulesWithTimezone, updateScheduleLastExecuted } from '~/db/posting-schedule-database.server';
import { deleteFromImageQueue } from '~/db/image-queue-database.server';


declare global {
  var __imageSchedulerInstance: ImageScheduler | undefined;
}

class ImageScheduler {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastGlobalCheck: Date = new Date();

  private constructor() {
    this.start();
  }

  public static getInstance(): ImageScheduler {
    if (!global.__imageSchedulerInstance) {
      global.__imageSchedulerInstance = new ImageScheduler();
    }
    return global.__imageSchedulerInstance;
  }

  public start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastGlobalCheck = new Date();
    console.log('Starting image posting scheduler...');
    
    // Check every 5 minutes for better responsiveness
    this.intervalId = setInterval(() => {
      this.checkSchedules().catch(error => {
        console.error('Error in scheduler:', error);
      });
    }, 60 * 1000 * 5);

    // Run once immediately
    this.checkSchedules().catch(error => {
      console.error('Error in initial scheduler run:', error);
    });
  }

  private stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('Image posting scheduler stopped');
  }

  private async checkSchedules() {
    const checkStartTime = new Date();
    
    const activeSchedules = await getAllActivePostingSchedulesWithTimezone();
    const untriggeredSchedules = activeSchedules.filter(schedule => 
      this.shouldTriggerSchedule(schedule, this.lastGlobalCheck, checkStartTime)
    );
    
    for (const schedule of untriggeredSchedules) {
      await this.processScheduleTrigger(schedule);
    }
    
    this.lastGlobalCheck = checkStartTime;
  }

  private shouldTriggerSchedule(
    schedule: PostingSchedule & { timezone: string }, 
    lastCheck: Date,
    currentCheck: Date
  ): boolean {
    try {
      // Check if there was a scheduled execution between lastCheck and currentCheck
      let checkTime = new Date(lastCheck);
      
      // Also consider the last_executed time to prevent double-posting
      const lastExecuted = schedule.lastExecuted ? new Date(schedule.lastExecuted) : null;
      if (lastExecuted && lastExecuted > checkTime) {
        checkTime = lastExecuted;
      }

      // Look for the next occurrence after checkTime
      const nextOccurrence = getNextExecution(schedule.cronExpression, schedule.timezone, checkTime);
      
      // If the next occurrence is before currentCheck, it should have triggered
      return nextOccurrence <= currentCheck && nextOccurrence > checkTime;
    } catch (error) {
      console.error(`Error checking the schedule ${schedule}:`, error);
      return false;
    }
  }

  private async processScheduleTrigger(schedule: PostingSchedule & { timezone: string }) {
    const userDid = schedule.userDid;
    
    try {
      // Single database call that gets next image and updates schedule's last check time
      const nextImage = await getNextImageAndUpdateSchedule(userDid, schedule.id);
      if (!nextImage) {
        return;
      }
      
      const imageBuffer = await this.readImageFromStorage(nextImage);
      await postImageToBluesky(
        userDid,
        imageBuffer,
        nextImage.postText,
        nextImage.isNsfw,
      );

      // Single database transaction: move to posted, reorder queue
      await moveImageToPosted(userDid, nextImage);
      console.log(`Successfully posted image ${nextImage.storageKey} for user ${userDid}`);
    } catch (error) {
      console.error(`Failed to post image!`, error);
      // Even if posting fails, update last_executed to prevent retry loops
      await updateScheduleLastExecuted(schedule.id);
    }
  }

  private async readImageFromStorage(image: QueuedImage): Promise<Buffer> {
    const imageFile = await fileStorage.get(image.storageKey);
    if (!imageFile) {
      deleteFromImageQueue(image.userDid, image.storageKey);
      throw new Error(`Image not found in storage: ${image.storageKey}`);
    }

    return Buffer.from(await imageFile.arrayBuffer());
  }

  // Add graceful shutdown method
  public async shutdown() {
    this.stop();
    
    // Wait a bit for any ongoing operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Scheduler shutdown complete');
  }

  // Optional: Method to destroy the singleton instance (useful for testing)
  public static destroyInstance() {
    if (global.__imageSchedulerInstance) {
      global.__imageSchedulerInstance.shutdown();
      global.__imageSchedulerInstance = undefined;
    }
  }
}

// Export the class and a getter function, not a direct instance
export { ImageScheduler };

// Export a function that returns the singleton instance
export const getScheduler = () => ImageScheduler.getInstance();
