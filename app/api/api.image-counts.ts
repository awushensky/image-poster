import { requireUser } from "~/auth/session.server";
import type { Route } from "./+types/api.image-counts";
import { getImageQueueSize } from "~/db/image-queue-database.server";
import type { ImageCountsFetchResult } from "~/api-interface/image-counts";
import { readPostedImageEntriesCount } from "~/db/posted-image-database.server";


async function fetchImageCounts(userDid: string): Promise<ImageCountsFetchResult> {
  const results = await Promise.all([
    getImageQueueSize(userDid),
    readPostedImageEntriesCount(userDid),
  ]);

  return {
    status: 200,
    success: true,
    queuedImages: results[0],
    postedImages: results[1], 
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return Response.json(await fetchImageCounts(user.did));
}
