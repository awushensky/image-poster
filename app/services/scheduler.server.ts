import cron from 'node-cron';
import { deleteFromImageQueue, getNextImageToPostForUser } from '~/db/image-queue-database.server';
import { createPostedImageEntry } from '~/db/posted-image-database.server';
import { getUsersWithPostingDueAt } from '~/db/posting-time-database.server';
import { postImageToBluesky } from '~/lib/bluesky-auth.server';
import { fileStorage } from '~/lib/image-storage.server';
import type { QueuedImage } from '~/model/model';

class ImageUploadScheduler {
  private isRunning = false;

  async start() {
    if (this.isRunning) {
      console.log('Scheduler already running');
      return;
    }

    console.log('Starting image upload scheduler...');
    this.isRunning = true;

    // Run every 15 minutes to check for scheduled posts
    cron.schedule('*/15 * * * *', async () => {
      try {
        await this.checkAndProcessScheduledPosts();
      } catch (error) {
        console.error('Error in scheduled post check:', error);
      }
    });

    console.log('Image upload scheduler started');
  }

  private async checkAndProcessScheduledPosts() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDayOfWeek = now.getDay();

    const users = await getUsersWithPostingDueAt(currentHour, currentMinute, currentDayOfWeek);
    if (users.length === 0) {
      console.log(`No images to post right now ${currentHour}:${currentMinute} on ${currentDayOfWeek}`);
      return;
    }

    const images = await Promise.all(
      users.map(user => {
        return getNextImageToPostForUser(user.did);
      }).filter(image => !!image)
    ) as QueuedImage[];

    if (images.length === 0) {
      console.log(`No images to post right now ${currentHour}:${currentMinute} on ${currentDayOfWeek}`);
    }

    for (const image of images) {
      try {
        await this.postImage(image);
      } catch (error) {
        console.error(`Error processing scheduled post for user ${image.user_did}:`, error);
      }
    }
  }

  private async postImage(queuedImage: QueuedImage) {
    const imageFile = await fileStorage.get(queuedImage.storage_key);
    if (!imageFile) {
      console.log(`Unable to read image ${queuedImage.storage_key} for user ${queuedImage.user_did}`);
      return;
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    try {
      await postImageToBluesky(
        queuedImage.user_did,
        imageBuffer,
        queuedImage.post_text,
        queuedImage.is_nsfw,
      );
    } catch (error) {
      console.error(`Failed to post image ${queuedImage.storage_key} for user ${queuedImage.user_did}:`, error);
      return;
    }

    try {
      await createPostedImageEntry(
        queuedImage.user_did,
        queuedImage.storage_key,
      )

      await deleteFromImageQueue(
        queuedImage.user_did,
        queuedImage.storage_key,
      )
    } catch (error) {
      console.error(`Failed to mark image as ${queuedImage.storage_key} for user ${queuedImage.user_did} as posted`, error);
    }
  }

  stop() {
    this.isRunning = false;
    console.log('Image upload scheduler stopped');
  }
}

const imageUploadScheduler = new ImageUploadScheduler();

if (typeof window === 'undefined') {
  imageUploadScheduler.start().catch(error => {
    console.error('Failed to start image upload scheduler:', error);
  });
}
