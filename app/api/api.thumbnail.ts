import type { Route } from "./+types/api.thumbnail";
import type { ThumbnailBatchResult } from "~/api-interface/thumbnail";

/**
 * Load multiple thumbnail images and return them as base64 encoded data
 */
async function loadThumbnails(storageKeys: string[]): Promise<ThumbnailBatchResult> {
  const { thumbnailStorage } = await import("~/storage/image-storage.server");

  const thumbnails = storageKeys.map(async storageKey => {
    try {
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
 * POST endpoint that accepts a list of storage keys and returns thumbnail data
 */
export async function action({ request }: Route.ActionArgs) {
  try {
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
    
    const result = await loadThumbnails(storageKeys);
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
    const url = new URL(request.url);
    const storageKey = url.searchParams.get('key');
    
    if (!storageKey) {
      return Response.json({
        status: 400,
        success: false,
        error: "storage key is required"
      }, { status: 400 });
    }
    
    const result = await loadThumbnails([storageKey]);
    
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
