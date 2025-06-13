import type { PostingSchedule } from "~/model/posting-schedules";
import type { QueuedImage } from "~/model/queued-images";
import { getNextExecutionsForMultipleSchedules } from "./cron-utils";


export interface ImageWithEstimatedUpload extends QueuedImage {
  estimatedPostTime: Date | undefined
}

export function estimateImageSchedule(
  queuedImages: QueuedImage[],
  schedules: PostingSchedule[],
  timezone: string,
): ImageWithEstimatedUpload[] {
  if (!queuedImages.length || !schedules.length) {
    return queuedImages.map(image => ({
      ...image,
      estimatedPostTime: undefined
    }));
  }

  const executionDates = getNextExecutionsForMultipleSchedules(
    schedules.map(schedule => schedule.cronExpression),
    timezone,
    queuedImages.length
  )

  return queuedImages.map((image, index) => ({
    ...image,
    estimatedPostTime: executionDates.length > index ? executionDates[index] : undefined
  }));
}
