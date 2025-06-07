import type { ApiResult } from "./api";


export interface ImageUploadResult extends ApiResult {
  storageKey?: string;
}

export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await fetch('/api/image', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json() as ImageUploadResult;
  if (result.success && result.storageKey) {
    return result.storageKey;
  } else {
    throw new Error(result.error);
  }
}
