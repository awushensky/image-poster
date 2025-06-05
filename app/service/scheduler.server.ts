import { fileStorage } from '../lib/image-storage.server';
import { postImageToBluesky } from '../auth/bluesky-auth.server';
import { type PostingSchedule, type QueuedImage } from '../model/model';
import { getAllActivePostingSchedules, updateScheduleLastExecuted } from '~/db/posting-schedule-database.server';
import { createPostedImageEntry } from '~/db/posted-image-database.server';
import { deleteFromImageQueue, getNextImageToPostForUser } from '~/db/image-queue-database.server';
import { getNextExecution } from '~/lib/cron-utils';
import { getMutex } from '~/lib/mutex';


const MUTEX_PURPOSE = 'posting-scheduler';

class ImageScheduler {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastGlobalCheck: Date = new Date();

  constructor() {
    this.start();
  }

  private start() {
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
    
    try {
      const schedules = await getAllActivePostingSchedules();
      const triggeredSchedules = schedules.filter(schedule => this.shouldTriggerSchedule(schedule, this.lastGlobalCheck, checkStartTime));
      
      if (triggeredSchedules.length > 0) {
        const results = await Promise.allSettled(
          triggeredSchedules.map(schedule => this.processScheduleTrigger(schedule))
        );
        
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`Failed to process schedule ${triggeredSchedules[index].id}:`, result.reason);
          }
        });
      }
      
      this.lastGlobalCheck = checkStartTime;
    } catch (error) {
      console.error('Error checking schedules:', error);
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
    
    try {
      const nextImage = await getNextImageToPostForUser(userDid);
      if (!nextImage) {
        console.log(`No images in queue for user ${userDid}`);
        // Still update last_executed to prevent constant checking
        await updateScheduleLastExecuted(schedule.id);
        return;
      }

      const imageBuffer = await this.readImageFromStorage(nextImage.storage_key);
      
      await postImageToBluesky(
        userDid,
        imageBuffer,
        nextImage.post_text,
        nextImage.is_nsfw
      );

      getMutex(MUTEX_PURPOSE, schedule.user_did).runExclusive(async () => {
          await this.moveImageToPosted(nextImage);
          await updateScheduleLastExecuted(schedule.id);
      });
    } catch (error) {
      console.error(`Error processing schedule trigger for user ${userDid}:`, error);
      throw error;
    }
  }

  private async readImageFromStorage(storageKey: string): Promise<Buffer> {
    try {
      const imageFile = await fileStorage.get(storageKey);
      if (!imageFile) {
        throw new Error(`Image not found in storage: ${storageKey}`);
      }

      const arrayBuffer = await imageFile.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      return imageBuffer;
    } catch (error) {
      console.error(`Error reading image ${storageKey}:`, error);
      throw error;
    }
  }

  private async moveImageToPosted(image: QueuedImage) {
    await createPostedImageEntry(image.user_did, image.storage_key);
    await deleteFromImageQueue(image.user_did, image.storage_key);
  }
}

const scheduler = new ImageScheduler();

export { scheduler };
