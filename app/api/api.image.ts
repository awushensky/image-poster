import { fileStorage } from "~/lib/image-storage.server";
import type { Route } from "./+types/api.image";
import { requireUser } from "~/auth/session.server";
import { createImageQueueEntry, deleteFromImageQueue, getImageQueueForUser, readImageQueueEntry, reorderImageInQueue, updateImageQueueEntry } from "~/db/image-queue-database.server";
import type { QueuedImage, User } from "~/model/model";
import { FileUpload, parseFormData, type FileUploadHandler } from "@mjackson/form-data-parser";
import { createHash } from "crypto";

interface ImageApiResult {
  status: number;
  success?: boolean;
  error?: string;
  message?: string;
}

interface UploadResult extends ImageApiResult {
  storageKey?: string;
}

interface UpdateResult extends ImageApiResult {}

interface DeleteResult extends ImageApiResult {}

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
async function loadImage(images: QueuedImage[], storageKey: string): Promise<File> {
  // ensure the user owns this image
  if (images.filter(image => image.storage_key === storageKey).length === 0) {
    throw new Response("Image not found", {
      status: 404,
    });
  }

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
async function uploadImage(user: User, request: Request): Promise<UploadResult> {
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

        try {
          // FileUpload objects are not meant to stick around for very long (they are
          // streaming data from the request.body); store them as soon as possible.
          await fileStorage.set(storageKey, fileUpload);
          await createImageQueueEntry(user.did, storageKey, fileNameToPostText(fileUpload.name));
          uploadedStorageKey = storageKey;
        } catch (error) {
          console.error('Upload error:', error);
          throw error;
        }
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

/**
 * Update an image in the queue. This can be used to reorder the image in the queue or update its metadata.
 * @param user the user performing the update
 * @param storageKey the storage key of the image to update
 * @param update the form data containing the update information
 */
async function updateImage(user: User, storageKey: string, update: FormData): Promise<UpdateResult> {
  try {
    const action = update.get("action")?.toString();

    switch(action) {
      case 'reorder':
        const toOrderString = update.get("toOrder")?.toString();
        if (!toOrderString) {
          return {
            status: 400,
            success: false,
            error: "toOrder not provided"
          };
        }
        
        let toOrder: number;
        try {
          toOrder = parseInt(toOrderString);
        } catch (exception) {
          return {
            status: 400,
            success: false,
            error: "Invalid toOrder provided"
          };
        }

        await reorderImageInQueue(user.did, storageKey, toOrder);
        return {
          status: 200,
          success: true,
          message: "Image reordered successfully"
        };

      case 'update':
        const postText = update.get("postText")?.toString();
        const isNsfwStr = update.get("isNsfw")?.toString()?.toLowerCase();
        const isNsfw = isNsfwStr === undefined ? undefined : isNsfwStr === "true";

        await updateImageQueueEntry(user.did, storageKey, { post_text: postText, is_nsfw: isNsfw });
        return {
          status: 200,
          success: true,
          message: "Image updated successfully"
        };

      default:
        return {
          status: 400,
          success: false,
          error: `Invalid image update action ${action}`
        };
    }
  } catch (error) {
    console.error('Update error:', error);
    return {
      status: 500,
      success: false,
      error: error instanceof Error ? error.message : "Update failed"
    };
  }
}

/**
 * Delete an image from the queue and remove it from file storage.
 * @param user the user performing the delete
 * @param storageKey the storage key of the image to delete
 */
async function deleteImage(user: User, storageKey: string): Promise<DeleteResult> {
  try {
    const image = await readImageQueueEntry(user.did, storageKey);
    if (!image) {
      return {
        status: 404,
        success: false,
        error: "Image not found"
      };
    }

    // TODO: if the file storage removal fails, we might have a hanging file with no reference.
    // Eventually, we should regularly clean up the files with no references in the image-queue
    // database.
    await deleteFromImageQueue(user.did, storageKey);
    await fileStorage.remove(storageKey);

    return {
      status: 200,
      success: true,
      message: "Image deleted successfully"
    };

  } catch (error) {
    console.error('Delete error:', error);
    return {
      status: 500,
      success: false,
      error: error instanceof Error ? error.message : "Delete failed"
    };
  }
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const images = await getImageQueueForUser(user.did)
  const { storageKey } = params;

  if (!storageKey) {
    throw new Response("Storage key is required", { status: 400 });
  }

  const imageFile = await loadImage(images, storageKey);

  return new Response(imageFile.stream(), {
    headers: {
      "Content-Type": imageFile.type,
      "Content-Disposition": `attachment; filename=${imageFile.name}`,
    },
  });
}

export async function action({ request, params }: Route.ActionArgs) {
  try {
    const user = await requireUser(request);

    switch (request.method) {
      case 'POST': {
        const result = await uploadImage(user, request);
        return Response.json(result, { status: result.status });
      }

      case 'PUT': {
        if (!params.storageKey) {
          const result: UpdateResult = {
            status: 400,
            success: false,
            error: "Storage key is required"
          };
          return Response.json(result, { status: result.status });
        }

        const result = await updateImage(user, params.storageKey, await request.formData());
        return Response.json(result, { status: result.status });
      }

      case 'DELETE': {
        if (!params.storageKey) {
          const result: DeleteResult = {
            status: 400,
            success: false,
            error: "Storage key is required"
          };
          return Response.json(result, { status: result.status });
        }

        const result = await deleteImage(user, params.storageKey);
        return Response.json(result, { status: result.status });
      }

      default: {
        const result: ImageApiResult = {
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
    const result: ImageApiResult = {
      status: 500,
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred"
    };
    return Response.json(result, { status: result.status });
  }
}
