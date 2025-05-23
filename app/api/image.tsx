import {
  fileStorage,
} from "~/image-storage.server";
import type { Route } from "./+types/image";

export async function loader({ params }: Route.LoaderArgs) {
  const file = await fileStorage.get(params.storageKey);

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
