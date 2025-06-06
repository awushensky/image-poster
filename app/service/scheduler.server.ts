import { fileStorage } from '../lib/image-storage.server';
import { postImageToBluesky } from '../auth/bluesky-auth.server';
import { type PostingSchedule } from '../model/model';
import {
  getNextImageOrUpdateSchedule,
  processImagePosting,
} from '~/db/scheduler-database.server';
import { getNextExecution } from '~/lib/cron-utils';
import { getAllActivePostingSchedulesWithTimezone, updateScheduleLastExecuted } from '~/db/posting-schedule-database.server';


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
    
    // Check every 30 seconds for better responsiveness
    this.intervalId = setInterval(() => {
      this.checkSchedules().catch(error => {
        console.error('Error in scheduler:', error);
      });
    }, 30 * 1000);

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
    console.log(`🔍 Scheduler: Checking schedules... ${new Date()}`);
    
    try {
      // Single database call to get all active schedules
      const schedules = await getAllActivePostingSchedulesWithTimezone();
      console.log(`📅 Found ${schedules.length} active schedules`);
      
      // Filter triggered schedules
      const triggeredSchedules = schedules.filter(schedule => 
        this.shouldTriggerSchedule(schedule, this.lastGlobalCheck, checkStartTime)
      );
      
      if (triggeredSchedules.length > 0) {
        console.log(`🚀 Processing ${triggeredSchedules.length} triggered schedules`);
        
        // Process schedules sequentially to avoid overwhelming the database
        for (const schedule of triggeredSchedules) {
          try {
            await this.processScheduleTrigger(schedule);
            console.log(`✅ Successfully processed schedule ${schedule.id}`);
          } catch (error) {
            console.error(`❌ Failed to process schedule ${schedule.id}:`, error);
          }
        }
      } else {
        console.log('😴 No schedules triggered this check');
      }
      
      this.lastGlobalCheck = checkStartTime;
    } catch (error) {
      console.error('❌ Error checking schedules:', error);
    }
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
      const lastExecuted = schedule.last_executed ? new Date(schedule.last_executed) : null;
      if (lastExecuted && lastExecuted > checkTime) {
        checkTime = lastExecuted;
      }

      // Look for the next occurrence after checkTime
      const nextOccurrence = getNextExecution(schedule.cron_expression, schedule.timezone, checkTime);
      
      // If the next occurrence is before currentCheck, it should have triggered
      return nextOccurrence <= currentCheck && nextOccurrence > checkTime;
    } catch (error) {
      console.error(`Error parsing cron expression "${schedule.cron_expression}" for user ${schedule.user_did}:`, error);
      return false;
    }
  }

  private async processScheduleTrigger(schedule: PostingSchedule & { timezone: string }) {
    const userDid = schedule.user_did;
    console.log(`📋 Processing schedule ${schedule.id} for user ${userDid}`);
    
    try {
      // Single database call that gets next image OR updates schedule if no images
      const nextImage = await getNextImageOrUpdateSchedule(userDid, schedule.id);
      
      if (!nextImage) {
        console.log(`📭 No images in queue for user ${userDid} - schedule updated`);
        return;
      }

      console.log(`📸 Found image to post: ${nextImage.storage_key}`);
      
      // Read image from storage
      const imageBuffer = await this.readImageFromStorage(nextImage.storage_key);
      
      // Post to Bluesky
      console.log(`🐦 Posting to Bluesky for user ${userDid}`);
      await postImageToBluesky(
        userDid,
        imageBuffer,
        nextImage.post_text,
        nextImage.is_nsfw
      );

      // Single database transaction: move to posted, reorder queue, update schedule
      console.log(`📝 Processing post-posting database operations`);
      await processImagePosting(userDid, nextImage.storage_key, schedule.id);
      
      console.log(`✅ Successfully processed schedule ${schedule.id}`);
    } catch (error) {
      console.error(`❌ Error processing schedule trigger for user ${userDid}:`, error);
      
      // Even if posting fails, update last_executed to prevent retry loops
      try {
        await updateScheduleLastExecuted(schedule.id);
        console.log(`📅 Updated schedule ${schedule.id} last_executed after error`);
      } catch (updateError) {
        console.error(`❌ Failed to update last_executed after error:`, updateError);
      }
      
      throw error;
    }
  }

  private async readImageFromStorage(storageKey: string): Promise<Buffer> {
    try {
      console.log(`📁 Reading image from storage: ${storageKey}`);
      const imageFile = await fileStorage.get(storageKey);
      if (!imageFile) {
        throw new Error(`Image not found in storage: ${storageKey}`);
      }

      const arrayBuffer = await imageFile.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      console.log(`✅ Successfully read image: ${imageBuffer.length} bytes`);
      return imageBuffer;
    } catch (error) {
      console.error(`❌ Error reading image ${storageKey}:`, error);
      throw error;
    }
  }

  // Add graceful shutdown method
  public async shutdown() {
    console.log('🛑 Shutting down scheduler...');
    this.stop();
    
    // Wait a bit for any ongoing operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Scheduler shutdown complete');
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
