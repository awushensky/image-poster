import { requireUser } from "~/auth/session.server";
import type { Route } from "./+types/api.posting-schedules";
import { updatePostingSchedules } from "~/db/posting-schedule-database.server";
import type { PostingSchedule, ProposedPostingSchedule, User } from "~/model/model";
import type { ApiResult } from "./api";


interface PostingScheduleUpdateResult extends ApiResult {
  schedules?: PostingSchedule[];
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
      message: "Image uploaded successfully"
    };
  } catch (error) {
    return {
      status: 400,
      success: false,
      error: "Error parsing schedules"
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);

  switch (request.method) {
    case 'POST': {
      const result = await updateSchedules(user, request);
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
