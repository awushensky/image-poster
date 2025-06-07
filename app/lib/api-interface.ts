import type { ApiResult } from "~/model/model";

export interface ThumbnailData {
  storageKey: string;
  data: string; // base64 encoded image data
  contentType: string;
  size: number;
  error?: string;
}

export interface ThumbnailBatchResult extends ApiResult {
  thumbnails: ThumbnailData[];
}

export async function fetchThumbnails(storageKeys: string[]): Promise<ThumbnailBatchResult> {
  const response = await fetch('/api/thumbnail', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ storageKeys })
  });
  
  return response.json();
}
