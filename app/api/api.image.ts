import { fileStorage, thumbnailStorage } from "~/storage/image-storage.server";
import type { Route } from "./+types/api.image";
import { requireUser } from "~/auth/session.server";
import { createImageQueueEntry } from "~/db/image-queue-database.server";
import type { User } from "~/model/user";
import { FileUpload, parseFormData, type FileUploadHandler } from "@mjackson/form-data-parser";
import { createHash } from "crypto";
import { bufferToFile, compressImage, createThumbnail, streamToBuffer } from "~/lib/image-utils";
import type { ApiResult } from "~/api-interface/api";
import type { ImageUploadResult } from "~/api-interface/image";


function fileNameToPostText(fileName: string): string {
  const fileNameSpaces = fileName.replaceAll('_', ' ');
  const fileNameWithoutExtension = fileNameSpaces.substring(0, fileNameSpaces.lastIndexOf('.'));
  return fileNameWithoutExtension;
}

/**
 * Load an image as a stream. This can be used in the `src` field of an <img> tag.
 * @param storageKey the image storage key to load
 * @returns 
 */
async function loadImage(storageKey: string): Promise<File> {
  if (!storageKey) {
    throw new Response("Storage key is required", {
      status: 400,
    });
  }

  const file = await fileStorage.get(storageKey);
  if (!file) {
    throw new Response("Image not found", {
      status: 404,
    });
  }

  return file;
}

/**
 * Read an image from the request and upload it to the file storage.
 * @param user the user uploading the image
 * @param request the request containing the image file
 */
async function uploadImage(user: User, request: Request): Promise<ImageUploadResult> {
  try {
    let uploadedStorageKey: string | null = null;

    const uploadHandler: FileUploadHandler = async (fileUpload: FileUpload) => {
      if (
        fileUpload.fieldName === 'image' &&
        /^image\//.test(fileUpload.type)
      ) {
        const storageKey = createHash('sha256')
          .update(`${user.did}-${fileUpload.name}-${Date()}`)
          .digest('hex');

        // FileUpload objects are not meant to stick around for very long (they are
        // streaming data from the request.body); store them as soon as possible.
        const inputBuffer = await streamToBuffer(fileUpload);
        const thumbnailImage = await bufferToFile(await createThumbnail(inputBuffer), `thumbnail-${fileUpload.name}`);
        const compressedImage = await bufferToFile(await compressImage(inputBuffer), fileUpload.name);

        await fileStorage.set(storageKey, compressedImage);
        await thumbnailStorage.set(storageKey, thumbnailImage);
        await createImageQueueEntry(user.did, storageKey, fileNameToPostText(fileUpload.name));
        uploadedStorageKey = storageKey;
      } else {
        throw new Error("Attempted to upload file with unsupported field name or type");
      }
    };

    await parseFormData(request, uploadHandler);

    if (!uploadedStorageKey) {
      return {
        status: 400,
        success: false,
        error: "No valid image file was uploaded"
      };
    }

    return {
      status: 200,
      success: true,
      storageKey: uploadedStorageKey,
      message: "Image uploaded successfully"
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      status: 500,
      success: false,
      error: error instanceof Error ? error.message : "Upload failed"
    };
  }
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { storageKey } = params;

  const url = new URL(request.url);
  const shouldDownload = url.searchParams.get('download') === 'true';

  if (!storageKey) {
    throw new Response("Storage key is required", { status: 400 });
  }

  const imageFile = await loadImage(storageKey);

  const headers: Record<string, string> = {
    "Content-Type": imageFile.type,
    "Cache-Control": "public, max-age=3600",
  };

  if (shouldDownload) {
    headers["Content-Disposition"] = `attachment; filename=${imageFile.name}`;
  }

  return new Response(imageFile.stream(), { headers });
}

export async function action({ request }: Route.ActionArgs) {
  try {
    const user = await requireUser(request);

    switch (request.method) {
      case 'POST': {
        const result = await uploadImage(user, request);
        return Response.json(result, { status: result.status });
      }

      default: {
        const result: ApiResult = {
          status: 405,
          success: false,
          error: `Unsupported method: ${request.method}`
        };
        return Response.json(result, { status: result.status });
      }
    }
  } catch (error) {
    console.error('API Error:', error);
    
    // If it's already a Response (thrown error), return it as-is
    if (error instanceof Response) {
      return error;
    }
    
    // Otherwise, return a generic error response
    const result: ApiResult = {
      status: 500,
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    };
    return Response.json(result, { status: result.status });
  }
}
