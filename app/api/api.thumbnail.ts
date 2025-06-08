import { requireUser } from "~/auth/session.server";
import { thumbnailStorage } from "~/storage/image-storage.server";
import type { Route } from "./+types/api.thumbnail";
import { getImageQueueForUser, readImageQueueEntry } from "~/db/image-queue-database.server";
import { readPostedImageEntries, readPostedImageEntry } from "~/db/posted-image-database.server";
import type { User } from "~/model/model";
import type { ThumbnailBatchResult } from "~/api-interface/thumbnail";


/**
 * Load multiple thumbnail images and return them as base64 encoded data
 */
async function loadThumbnails(user: User, storageKeys: string[]): Promise<ThumbnailBatchResult> {
  const queuedImageStorageKeys = (await getImageQueueForUser(user.did)).map(image => image.storageKey);
  const postedImageStorageKeys = (await readPostedImageEntries(user.did)).map(image => image.storageKey);

  const thumbnails = storageKeys.map(async storageKey => {
    try {
      // ensure the user owns this image
      if (!queuedImageStorageKeys.indexOf(storageKey) && !postedImageStorageKeys.indexOf(storageKey)) {
        return {
          storageKey,
          data: '',
          contentType: '',
          size: 0,
          error: 'Thumbnail not found'
        }
      }

      const thumbnailFile = await thumbnailStorage.get(storageKey);
      
      if (thumbnailFile) {
        const arrayBuffer = await thumbnailFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');
        
        return {
          storageKey,
          data: base64Data,
          contentType: thumbnailFile.type,
          size: buffer.length
        };
      } else {
        return {
          storageKey,
          data: '',
          contentType: '',
          size: 0,
          error: 'Thumbnail not found'
        };
      }
    } catch (error) {
      return {
        storageKey,
        data: '',
        contentType: '',
        size: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
  
  return {
    status: 200,
    success: true,
    thumbnails: await Promise.all(thumbnails),
  };
}

/**
 * Load a thumbnail as a stream. This can be used in the `src` field of an <img> tag.
 * @param storageKey the thumbnail storage key to load
 * @returns 
 */
async function loadImage(user: User, storageKey: string): Promise<File> {
  // ensure the user owns this image
  const queuedImage = await readImageQueueEntry(user.did, storageKey);
  const postedImage = await readPostedImageEntry(user.did, storageKey);
  if (!queuedImage && !postedImage) {
    throw new Response("Image not found", {
      status: 404,
    });
  }

  if (!storageKey) {
    throw new Response("Storage key is required", {
      status: 400,
    });
  }

  const file = await thumbnailStorage.get(storageKey);
  if (!file) {
    throw new Response("Image not found", {
      status: 404,
    });
  }

  return file;
}

/**
 * POST endpoint that accepts a list of storage keys and returns thumbnail data
 */
export async function action({ request }: Route.ActionArgs) {
  try {
    const user = await requireUser(request);
    
    const body = await request.json();
    const { storageKeys } = body;
    
    if (!Array.isArray(storageKeys)) {
      return Response.json({
        status: 400,
        success: false,
        error: "storageKeys must be an array"
      }, { status: 400 });
    }
    
    if (storageKeys.length > 50) {
      return Response.json({
        status: 400,
        success: false,
        error: "Maximum 50 thumbnails can be requested at once"
      }, { status: 400 });
    }
    
    const result = await loadThumbnails(user, storageKeys);
    return Response.json(result);
    
  } catch (error) {
    console.error('Thumbnail API error:', error);
    return Response.json({
      status: 500,
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
}

/**
 * GET endpoint for loading a single thumbnail by storage key
 */
export async function loader({ request }: Route.LoaderArgs) {
  try {
    const user = await requireUser(request);
    const url = new URL(request.url);
    const storageKey = url.searchParams.get('key');
    
    if (!storageKey) {
      return Response.json({
        status: 400,
        success: false,
        error: "storage key is required"
      }, { status: 400 });
    }
    
    const result = await loadThumbnails(user, [storageKey]);
    
    if (result.thumbnails.length > 0 && !result.thumbnails[0].error) {
      const thumbnail = result.thumbnails[0];
      
      const imageBuffer = Buffer.from(thumbnail.data, 'base64');
      return new Response(imageBuffer, {
        headers: {
          'Content-Type': thumbnail.contentType,
          'Content-Length': thumbnail.size.toString(),
          'Cache-Control': 'public, max-age=3600',
        }
      });
    } else {
      return Response.json({
        status: 404,
        success: false,
        error: result.thumbnails[0]?.error || "Thumbnail not found"
      }, { status: 404 });
    }
    
  } catch (error) {
    console.error('Thumbnail loader error:', error);
    return Response.json({
      status: 500,
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
}
