import type { PostingSchedule, QueuedImage } from "~/model/model";
import { getNextExecutionsForMultipleSchedules } from "./cron-utils";


export interface ImageWithEstimatedUpload extends QueuedImage {
  estimatedPostTime: Date | undefined
}

export function estimateImageSchedule(
  queuedImages: QueuedImage[],
  schedules: PostingSchedule[],
): ImageWithEstimatedUpload[] {
  if (!queuedImages.length || !schedules.length) {
    return queuedImages.map(image => ({
      ...image,
      estimatedPostTime: undefined
    }));
  }

  const executionDates = getNextExecutionsForMultipleSchedules(
    schedules.map(schedule => schedule.cron_expression),
    schedules[0].user_did,
    queuedImages.length
  )

  return queuedImages.map((image, index) => ({
    ...image,
    estimatedPostTime: executionDates.length > index ? executionDates[index] : undefined
  }));
}
