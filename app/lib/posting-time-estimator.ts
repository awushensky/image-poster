import type { PostingTime, QueuedImage } from "~/model/model";


export interface ImageWithEstimatedUpload extends QueuedImage {
  estimatedPostTime: Date | undefined
}

/**
 * Estimates posting times for queued images based on a weekly posting schedule
 * The image with the lowest queue_order will be posted at the next available posting time after now
 * @param queuedImages - Array of images to be processed
 * @param postingSchedule - Weekly posting schedule
 * @returns Array of images with estimated posting times
 */
export function estimateImagePostingTimes(
  queuedImages: QueuedImage[],
  postingSchedule: PostingTime[]
): ImageWithEstimatedUpload[] {
  if (!queuedImages.length || !postingSchedule.length) {
    return queuedImages.map(image => ({
      ...image,
      estimatedPostTime: undefined
    }));
  }
  
  const now = new Date();

  const sortedImages = [...queuedImages].sort((a, b) => a.queue_order - b.queue_order);

  const sortedPostingTimes = [...postingSchedule].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) {
      return a.day_of_week - b.day_of_week;
    }
    if (a.hour !== b.hour) {
      return a.hour - b.hour;
    }
    return a.minute - b.minute;
  });

  // Find the next available posting time from now
  const getNextPostingTime = (fromDate: Date, postingTimeIndex: number, weekOffset: number = 0): Date => {
    const postingTime = sortedPostingTimes[postingTimeIndex];
    
    // Start with the beginning of the week containing fromDate
    const baseDate = new Date(fromDate);
    const currentDayOfWeek = baseDate.getDay();
    const daysUntilSunday = -currentDayOfWeek;
    baseDate.setDate(baseDate.getDate() + daysUntilSunday);
    baseDate.setHours(0, 0, 0, 0);
    
    // Add week offset
    baseDate.setDate(baseDate.getDate() + (weekOffset * 7));
    
    // Set to the specific posting time
    const targetDate = new Date(baseDate);
    targetDate.setDate(baseDate.getDate() + postingTime.day_of_week);
    targetDate.setHours(postingTime.hour, postingTime.minute, 0, 0);
    
    return targetDate;
  };

  // Find the very next posting time after now (for the first image in queue)
  let currentWeekOffset = 0;
  let currentPostingIndex = 0;
  let nextPostingTime = getNextPostingTime(now, currentPostingIndex, currentWeekOffset);

  // If the first posting time is before now, find the next valid one
  while (nextPostingTime <= now) {
    currentPostingIndex++;
    
    // If we've gone through all posting times this week, move to next week
    if (currentPostingIndex >= sortedPostingTimes.length) {
      currentPostingIndex = 0;
      currentWeekOffset++;
    }
    
    nextPostingTime = getNextPostingTime(now, currentPostingIndex, currentWeekOffset);
  }

  // Assign posting times to images
  const result: ImageWithEstimatedUpload[] = [];

  for (const image of sortedImages) {
    result.push({
      ...image,
      estimatedPostTime: new Date(nextPostingTime)
    });

    // Move to the next posting time
    currentPostingIndex++;
    
    // If we've exhausted this week's posting times, move to next week
    if (currentPostingIndex >= sortedPostingTimes.length) {
      currentPostingIndex = 0;
      currentWeekOffset++;
    }
    
    nextPostingTime = getNextPostingTime(now, currentPostingIndex, currentWeekOffset);
  }

  return result;
}
