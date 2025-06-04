import { requireUser } from "~/auth/session.server";
import type { Route } from "./+types/api.posting-schedules";
import { updatePostingSchedules } from "~/db/posting-schedule-database.server";
import type { ProposedPostingSchedule, User } from "~/model/model";

async function updateSchedules(user: User, formData: FormData) {
  const formDataEntry = formData.get("schedules");
  if (!formDataEntry) {
    throw new Response("Invalid updated schedule", {
      status: 400,
    });
  }

  try {
    const schedule = JSON.parse(formDataEntry.toString()) as ProposedPostingSchedule[];
    return await updatePostingSchedules(user.did, schedule);
  } catch (error) {
    throw new Response("Invalid schedule format", {
      status: 400,
    });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);

  switch (request.method) {
    case 'POST':
      return new Response(JSON.stringify(await updateSchedules(user, await request.formData())));
    default:
      throw new Response(`Unsupported method: ${request.method}`, { status: 400 });
  }
}
