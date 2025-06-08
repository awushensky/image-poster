import type { ProposedQueuedImage, QueuedImage } from "~/model/queued-images";
import type { ApiResult } from "./api";

export interface QueuedImagesLoadResult extends ApiResult {
  images: QueuedImage[];
  hasMore?: boolean;
  nextCursor?: number;
}

export interface QueuedImageUpdateResult extends ApiResult { }

export interface QueuedImageDeleteResult extends ApiResult { }

function parseQueuedImage(raw: any): QueuedImage {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
  };
}

// Updated to support pagination
export async function fetchQueuedImages(limit: number = 50, cursor?: number): Promise<QueuedImagesLoadResult> {
  const url = new URL('/api/image-queue', window.location.origin);
  
  if (limit !== 50) {
    url.searchParams.set('limit', limit.toString());
  }
  
  if (cursor !== undefined) {
    url.searchParams.set('cursor', cursor.toString());
  }
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch queued images');
  }

  const result = await response.json() as QueuedImagesLoadResult;
  if (!result.success) {
    throw new Error(result.error || 'Failed to load queued images');
  }

  // Parse the images and return full result including pagination info
  return {
    ...result,
    images: result.images.map(parseQueuedImage)
  };
}

// Keep the old function for backward compatibility, but mark as deprecated
export async function fetchAllQueuedImages(): Promise<QueuedImage[]> {
  const result = await fetchQueuedImages(1000); // Large limit to get "all"
  return result.images;
}

export async function updateQueuedImage(storageKey: string, update: Partial<ProposedQueuedImage>): Promise<void> {
  const formData = new FormData();

  if (update.queueOrder) {
    formData.append('toOrder', update.queueOrder.toString());
  }
  
  if (update.postText) {
    formData.append('postText', update.postText);
  }

  if (update.isNsfw !== undefined) {
    formData.append('isNsfw', update.isNsfw.toString());
  }
  
  const response = await fetch(`/api/image-queue/${storageKey}`, {
    method: 'PUT',
    body: formData,
  });
  
  const result = await response.json() as QueuedImageUpdateResult;
  if (!result.success) {
    throw new Error(result.error);
  }
}

export async function deleteQueuedImage(storageKey: string): Promise<void> {
  const response = await fetch(`/api/image-queue/${storageKey}`, {
    method: 'DELETE',
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error);
  }
}
