import type { ProposedQueuedImage } from "~/model/queued-images";
import type { QueuedImage } from "~/model/queued-images";
import type { ApiResult } from "./api";


export interface QueuedImagesLoadResult extends ApiResult {
  images: QueuedImage[];
}

export interface QueuedImageUpdateResult extends ApiResult { }

export interface QueuedImageDeleteResult extends ApiResult { }

function parseQueuedImage(raw: any): QueuedImage {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
  };
}

export async function fetchQueuedImages(page: number = 1, pageSize: number = 50): Promise<QueuedImage[]> {
  const response = await fetch(`/api/image-queue?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) {
    throw new Error('Failed to fetch queued images');
  }

  const result = await response.json() as QueuedImagesLoadResult;
  if (!result.success) {
    throw new Error(result.error || 'Failed to load queued images');
  }

  return result.images.map(parseQueuedImage);
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
