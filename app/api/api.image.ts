import { fileStorage } from "~/lib/image-storage.server";
import type { Route } from "./+types/api.image";
import { requireUser } from "~/lib/session.server";
import { deleteFromImageQueue, getImageQueueForUser, readImageQueueEntry, reorderImageInQueue, updateImageQueueEntry } from "~/db/image-queue-database.server";
import type { QueuedImage, User } from "~/model/model";


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
 * Perform an update on an image.
 * @param user 
 * @param storageKey 
 * @param update 
 * @returns 
 */
async function updateImage(user: User, storageKey: string, update: FormData): Promise<void> {
  const action = update.get("action")?.toString();

  switch(action) {
    case 'reorder':
      const toOrderString = update.get("toOrder")?.toString();
      if (!toOrderString) {
        throw new Response("toOrder not provided", { status: 400 });
      }
      
      let toOrder: number;
      try {
        toOrder = parseInt(toOrderString);
      } catch (exception) {
        throw new Response("Invalid toOrder provided", { status: 400 });
      }

      await reorderImageInQueue(user.did, storageKey, toOrder);
      return;
    case 'update':
      const postText = update.get("postText")?.toString();
      const isNsfwStr = update.get("isNsfw")?.toString()?.toLowerCase();
      const isNsfw = isNsfwStr === undefined ? undefined : isNsfwStr === "true"

      await updateImageQueueEntry(user.did, storageKey, { post_text: postText, is_nsfw: isNsfw });
      return;
    default:
      throw new Response(`Invalid image update action ${action}`, { status: 400 });
  }
}

async function deleteImage(user: User, storageKey: string): Promise<void> {
  const image = readImageQueueEntry(user.did, storageKey);
  if (!image) {
    throw new Response("Image not found", { status: 404 });
  }

  // TODO: if the file storage removal fails, we might have a hanging file with no reference.
  // Eventually, we should regularly clean up the files with no references in the image-queue
  // database.
  await deleteFromImageQueue(user.did, storageKey);
  await fileStorage.remove(storageKey);
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const images = await getImageQueueForUser(user.did)
  const { storageKey } = params;

  const imageFile = await loadImage(images, storageKey);

  return new Response(imageFile.stream(), {
    headers: {
      "Content-Type": imageFile.type,
      "Content-Disposition": `attachment; filename=${imageFile.name}`,
    },
  });
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);

  switch (request.method) {
    case 'PUT':
      updateImage(user, params.storageKey, await request.formData())
      return new Response();
    case 'DELETE':
      deleteImage(user, params.storageKey);
      return new Response();
    default:
      throw new Response(`Unsupported method: ${request.method}`, { status: 400 });
  }
}
