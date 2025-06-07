import { requireUser } from "~/auth/session.server";
import type { Route } from "./+types/api.posting-schedules";
import { updatePostingSchedules, getUserPostingSchedules } from "~/db/posting-schedule-database.server";
import type { ProposedPostingSchedule, User } from "~/model/model";
import type { PostingScheduleGetResult } from "~/api-interface/posting-schedules";
import type { PostingScheduleUpdateResult } from "~/api-interface/posting-schedules";


async function getSchedules(user: User): Promise<PostingScheduleGetResult> {
  try {
    return {
      status: 200,
      success: true,
      schedules: await getUserPostingSchedules(user.did),
    };
  } catch (error) {
    return {
      status: 500,
      success: false,
      error: "Failed to retrieve schedules",
    };
  }
}

async function updateSchedules(user: User, request: Request): Promise<PostingScheduleUpdateResult> {
  try {
    const body = await request.json();
    const schedules = body.schedules as ProposedPostingSchedule[];
    
    if (!schedules) {
      return {
        status: 400,
        success: false,
        error: "Missing schedules parameter"
      };
    }

    const updatedSchedules = await updatePostingSchedules(user.did, schedules);

    return {
      status: 200,
      success: true,
      schedules: updatedSchedules,
      message: "Schedules updated successfully"
    };
  } catch (error) {
    return {
      status: 400,
      success: false,
      error: "Error parsing schedules"
    };
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const result = await getSchedules(user);
  return Response.json(result, { status: result.status });
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);

  switch (request.method) {
    case 'POST': {
      const result = await updateSchedules(user, request);
      return Response.json(result, { status: result.status });
    }
    default: {
      const result: PostingScheduleUpdateResult = {
        status: 405,
        success: false,
        error: `Unsupported method: ${request.method}`
      };
      return Response.json(result, { status: result.status });
    }
  }
}