import { requireUser } from "~/lib/session.server";
import type { Route } from "./+types/api.posting-schedules";
import { addPostingSchedule, deletePostingSchedule, updatePostingSchedule } from "~/db/posting-schedule-database.server";
import type { ProposedCronSchedule, User } from "~/model/model";

async function addSchedule(user: User, formData: FormData) {
  const formDataEntry = formData.get("schedule");
  if (!formDataEntry) {
    throw new Response("Invalid new schedule", {
      status: 400,
    });
  }

  try {
    const schedule = JSON.parse(formDataEntry.toString()) as ProposedCronSchedule;
    return await addPostingSchedule(user.did, schedule);
  } catch (error) {
    throw new Response("Invalid schedule format", {
      status: 400,
    });
  }
}

async function updateSchedule(user: User, scheduleId: string | undefined, formData: FormData) {
  if (!scheduleId) {
    throw new Response("Schedule ID is required", {
      status: 400,
    });
  }

  const formDataEntry = formData.get("update");
  if (!formDataEntry) {
    throw new Response("Invalid updated schedule", {
      status: 400,
    });
  }

  const scheduleIdNum = parseInt(scheduleId);
  if (isNaN(scheduleIdNum)) {
    throw new Response("Invalid schedule id", {
      status: 400,
    });
  }

  try {
    const schedule = JSON.parse(formDataEntry.toString()) as Partial<ProposedCronSchedule>;
    return await updatePostingSchedule(user.did, scheduleIdNum, schedule);
  } catch (error) {
    throw new Response("Invalid schedule format", {
      status: 400,
    });
  }
}

async function deleteSchedule(user: User, scheduleId: string | undefined) {
  if (!scheduleId) {
    throw new Response("Schedule ID is required", {
      status: 400,
    });
  }

  const scheduleIdNum = parseInt(scheduleId);
  if (isNaN(scheduleIdNum)) {
    throw new Response("Invalid schedule id", {
      status: 400,
    });
  }
  
  return await deletePostingSchedule(user.did, scheduleIdNum);
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireUser(request);

  switch (request.method) {
    case 'POST':
      return new Response(JSON.stringify(await addSchedule(user, await request.formData())));
    case 'PUT':
      return new Response(JSON.stringify(await updateSchedule(user, params.scheduleId, await request.formData())));
    case 'DELETE':
      return new Response(JSON.stringify(await deleteSchedule(user, params.scheduleId)));
    default:
      throw new Response(`Unsupported method: ${request.method}`, { status: 400 });
  }
}
