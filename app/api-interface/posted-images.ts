import type { PostedImage } from "~/model/posted-images";
import type { ApiResult } from "./api";


export interface PostedImagesLoadResult extends ApiResult {
  images: PostedImage[];
}

export function parsePostedImage(raw: any): PostedImage {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
  };
}

export async function fetchPostedImages(page: number = 1, pageSize: number = 50): Promise<PostedImage[]> {
  const response = await fetch(`/api/posted-images?page=${page}&pageSize=${pageSize}`);
  if (!response.ok) {
    throw new Error('Failed to fetch posted images');
  }

  const result = await response.json() as PostedImagesLoadResult;
  if (!result.success) {
    throw new Error(result.error || 'Failed to load posted images');
  }

  return (result.images || []).map(parsePostedImage);
}
