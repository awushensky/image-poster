import { fileStorage } from "~/lib/image-storage.server";
import type { Route } from "./+types/image";
import { requireUser } from "~/lib/session.server";
import { getImageQueueForUser } from "~/db/image-queue-database.server";


export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const images = await getImageQueueForUser(user.did)

  // ensure the user owns this image
  if (images.filter(image => image.storage_key === params.storageKey).length === 0) {
    throw new Response("Image not found", {
      status: 404,
    });
  }

  const { storageKey } = params;
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

  return new Response(file.stream(), {
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": `attachment; filename=${file.name}`,
    },
  });
}