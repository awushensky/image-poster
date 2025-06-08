import { requireUser } from "~/auth/session.server";
import type { Route } from "./+types/api.user";
import type { User } from "~/model/user";
import { createOrUpdateUser } from "~/db/user-database.server";
import type { UpdateUserResult } from "~/api-interface/user";
import type { ApiResult } from "~/api-interface/api";


async function updateUser(user: User, request: Request): Promise<UpdateUserResult> {
  try {
    const body = await request.json();
    const { timezone, handle, displayName, avatarUrl } = body as Partial<User>;

    const updatedUser = await createOrUpdateUser(
      user.did,
      handle ? handle.toString() : user.handle,
      timezone ? timezone.toString() : user.timezone,
      displayName ? displayName.toString() : user.displayName,
      avatarUrl ? avatarUrl.toString() : user.avatarUrl,
    );

    return {
      status: 200,
      success: true,
      user: updatedUser,
      message: "User updated successfully"
    };
  } catch (error) {
    return {
      status: 400,
      success: false,
      error: "Failed to update user"
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);

  switch (request.method) {
    case 'PUT': {
      const result = await updateUser(user, request);
      return Response.json(result, { status: result.status });
    }

    default: {
      const result: ApiResult = {
        status: 405,
        success: false,
        error: `Unsupported method: ${request.method}`
      };
      return Response.json(result, { status: result.status });
    }
  }
}
