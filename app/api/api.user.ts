import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/api.user";
import type { User } from "~/model/model";
import { createOrUpdateUser } from "~/db/user-database.server";

function updateUser(user: User, data: FormData) {
  const timezone = data.get("timezone");
  const handle = data.get("handle");
  const displayName = data.get("display_name");
  const avatarUrl = data.get("avatar_url");

  createOrUpdateUser(
    user.did,
    handle ? handle.toString() : user.handle,
    timezone ? timezone.toString() : user.timezone,
    displayName ? displayName.toString() : user.display_name,
    avatarUrl ? avatarUrl.toString() : user.avatar_url,
  );

  return user;
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);

  switch (request.method) {
    case 'PUT':
      return new Response(JSON.stringify(await updateUser(user, await request.formData())));
    default:
      throw new Response(`Unsupported method: ${request.method}`, { status: 400 });
  }
}
