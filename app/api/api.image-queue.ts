import { requireUser } from "~/auth/session.server";
import { getImageQueueForUser } from "~/db/image-queue-database.server";
import type { Route } from "./+types/api.image-queue";
import type { QueuedImagesLoadResult } from "~/api-interface/image-queue";


async function loadImageQueue(userDid: string): Promise<QueuedImagesLoadResult> {
  return {
    status: 200,
    success: true,
    images: await getImageQueueForUser(userDid),
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return Response.json(await loadImageQueue(user.did));
}
