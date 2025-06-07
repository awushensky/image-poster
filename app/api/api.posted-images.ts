import { requireUser } from "~/auth/session.server";
import type { Route } from "./+types/api.posted-images";
import { readPostedImageEntries } from "~/db/posted-image-database.server";
import type { PostedImagesLoadResult } from "~/api-interface/posted-images";


async function loadPostedImages(userDid: string): Promise<PostedImagesLoadResult> {
  return {
    status: 200,
    success: true,
    images: await readPostedImageEntries(userDid),
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return Response.json(await loadPostedImages(user.did));
}
