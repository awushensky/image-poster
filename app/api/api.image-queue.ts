import { requireUser } from "~/auth/session.server";
import { getImageQueueForUser } from "~/db/image-queue-database.server";
import type { Route } from "./+types/api.image-queue";
import type { ApiResult } from "./api";
import type { QueuedImage } from "~/model/model";


interface LoadResult extends ApiResult {
  images: QueuedImage[];
}

async function loadImageQueue(userDid: string): Promise<LoadResult> {
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
