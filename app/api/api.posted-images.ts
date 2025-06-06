import { requireUser } from "~/auth/session.server";
import type { Route } from "./+types/api.posted-images";
import type { ApiResult } from "./api";
import type { PostedImage } from "~/model/model";
import { readPostedImageEntries } from "~/db/posted-image-database.server";


interface LoadResult extends ApiResult {
  images: PostedImage[];
}

async function loadPostedImages(userDid: string): Promise<LoadResult> {
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
