import type { Route } from './+types/api.posting-times';
import { updateUserPostingTimes } from "~/db/posting-time-database.server";
import { requireUser } from "~/lib/session.server";

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);

  const formDataEntry = (await request.formData()).get("values");
  if (!formDataEntry) {
    throw new Response("New times not found", {
      status: 400,
    });
  }

  let postingTimes;
  try {
    postingTimes = JSON.parse(formDataEntry.toString());
  } catch (error) {
    throw new Response("Invalid times format", {
      status: 400,
    });
  }
  
  await updateUserPostingTimes(user.did, postingTimes);
  return new Response();
}
