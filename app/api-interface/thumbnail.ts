import type { ApiResult } from "./api";


export interface ThumbnailData {
  storageKey: string;
  data: string;
  contentType: string;
  size: number;
  error?: string;
}

export interface ThumbnailBatchResult extends ApiResult {
  thumbnails: ThumbnailData[];
}

export async function fetchThumbnails(storageKeys: string[]): Promise<ThumbnailData[]> {
  const response = await fetch('/api/thumbnail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storageKeys })
  });

  const result = await response.json() as ThumbnailBatchResult;
  if (!result.success) {
    throw new Error(result.error || 'Failed to load image thumbnails');
  }

  return result.thumbnails;
}
