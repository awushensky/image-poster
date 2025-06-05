import { requireUser } from "~/auth/session.server";
import type { Route } from "./+types/api.posting-schedules";
import { updatePostingSchedules } from "~/db/posting-schedule-database.server";
import type { ProposedPostingSchedule, User } from "~/model/model";

async function updateSchedules(user: User, request: Request) {
  try {
    const body = await request.json();
    const schedules = body.schedules as ProposedPostingSchedule[];
    
    if (!schedules) {
      console.log('Error parsing update, no "schedules" parameter found');
      throw new Response("Invalid updated schedule", {
        status: 400,
      });
    }

    return await updatePostingSchedules(user.did, schedules);
  } catch (error) {
    console.log('Error parsing update', error);
    throw new Response("Invalid schedule format", {
      status: 400,
    });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);

  switch (request.method) {
    case 'POST':
      return new Response(JSON.stringify(await updateSchedules(user, request)));
    default:
      throw new Response(`Unsupported method: ${request.method}`, { status: 400 });
  }
}
