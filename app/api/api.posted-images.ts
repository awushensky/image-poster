import { requireUser } from "~/auth/session.server";
import type { Route } from "./+types/api.posted-images";
import { readPostedImageEntries } from "~/db/posted-image-database.server";
import type { PostedImagesLoadResult } from "~/api-interface/posted-images";


async function loadPostedImages(userDid: string, page: number = 1, pageSize: number = 50): Promise<PostedImagesLoadResult> {
  const offset = (page - 1) * pageSize;
  return {
    status: 200,
    success: true,
    images: await readPostedImageEntries(userDid, pageSize, offset),
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "50");

  return Response.json(await loadPostedImages(user.did, page, pageSize));
}
