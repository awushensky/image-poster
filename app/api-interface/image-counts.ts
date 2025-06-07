import type { ImageCounts } from "~/model/model";
import type { ApiResult } from "./api";

export interface ImageCountsFetchResult extends ApiResult {
  queuedImages: number;
  postedImages: number;
}

export async function fetchImageCounts(): Promise<ImageCounts> {
  const response = await fetch(`/api/image-counts`);
  if (!response.ok) {
    throw new Error('Failed to fetch queued images');
  }

  const result = await response.json() as ImageCountsFetchResult;
  if (!result.success) {
    throw new Error(result.error || 'Failed to load queued images');
  }

  return { queued: result.queuedImages, posted: result.postedImages };
}
