import { requireUser } from "~/auth/session.server";
import { deleteFromImageQueue, getImageQueueForUser, readImageQueueEntry, reorderImageInQueue, updateImageQueueEntry } from "~/db/image-queue-database.server";
import type { Route } from "./+types/api.image-queue";
import type { QueuedImageDeleteResult, QueuedImagesLoadResult, QueuedImageUpdateResult } from "~/api-interface/image-queue";
import { fileStorage, thumbnailStorage } from "~/storage/image-storage.server";
import type { ApiResult } from "~/api-interface/api";
import type { User } from "~/model/user";

async function loadImageQueue(userDid: string, limit: number = 50, cursor?: number): Promise<QueuedImagesLoadResult> {
  const result = await getImageQueueForUser(userDid, limit, cursor);
  
  return {
    status: 200,
    success: true,
    images: result.images,
    hasMore: result.hasMore,
    nextCursor: result.nextCursor,
  };
}

/**
 * Update an image in the queue. This can be used to reorder the image in the queue or update its metadata.
 * @param user the user performing the update
 * @param storageKey the storage key of the image to update
 * @param update the form data containing the update information
 */
async function updateQueuedImage(user: User, storageKey: string, update: FormData): Promise<QueuedImageUpdateResult> {
  const toOrderString = update.get("toOrder")?.toString();
  if (toOrderString) {
    const toOrder = parseInt(toOrderString);
    if (Number.isNaN(toOrder)) {
      return {
        status: 400,
        success: false,
        error: "Invalid toOrder provided"
      };
    }

    await reorderImageInQueue(user.did, storageKey, toOrder);
  }

  const postText = update.get("postText")?.toString();
  const isNsfwStr = update.get("isNsfw")?.toString()?.toLowerCase();
  const isNsfw = isNsfwStr === undefined ? undefined : isNsfwStr === "true";
  if (postText || isNsfw !== undefined) {
    await updateImageQueueEntry(user.did, storageKey, { postText, isNsfw });
  }

  return {
    status: 200,
    success: true,
    message: "Image updated successfully"
  };
}

/**
 * Delete an image from the queue and remove it from file storage.
 * @param user the user performing the delete
 * @param storageKey the storage key of the image to delete
 */
async function deleteImage(user: User, storageKey: string): Promise<QueuedImageDeleteResult> {
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
    await thumbnailStorage.remove(storageKey);

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

export async function action({ request, params }: Route.ActionArgs) {
  try {
    const user = await requireUser(request);

    switch (request.method) {
      case 'PUT': {
        if (!params.storageKey) {
          const result: QueuedImageUpdateResult = {
            status: 400,
            success: false,
            error: "Storage key is required"
          };
          return Response.json(result, { status: result.status });
        }

        const result = await updateQueuedImage(user, params.storageKey, await request.formData());
        return Response.json(result, { status: result.status });
      }

      case 'DELETE': {
        if (!params.storageKey) {
          const result: QueuedImageDeleteResult = {
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

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  
  // Parse pagination parameters from query string
  const limitParam = url.searchParams.get('limit');
  const cursorParam = url.searchParams.get('cursor');
  
  const limit = limitParam ? Math.min(parseInt(limitParam), 100) : 50; // Max 100 per request
  const cursor = cursorParam ? parseInt(cursorParam) : undefined;
  
  return Response.json(await loadImageQueue(user.did, limit, cursor));
}
