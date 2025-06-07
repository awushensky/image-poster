import type { QueuedImage } from "~/model/model";
import type { ApiResult } from "./api";


export interface QueuedImagesLoadResult extends ApiResult {
  images: QueuedImage[];
}

function parseQueuedImage(raw: any): QueuedImage {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
  };
}

export async function fetchQueuedImages(): Promise<QueuedImage[]> {
  const response = await fetch(`/api/image-queue`);
  if (!response.ok) {
    throw new Error('Failed to fetch queued images');
  }

  const result = await response.json() as QueuedImagesLoadResult;
  if (!result.success) {
    throw new Error(result.error || 'Failed to load queued images');
  }

  return result.images.map(parseQueuedImage);
}
