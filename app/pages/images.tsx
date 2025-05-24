import { Link, Outlet } from "react-router";
import type { Route } from "./+types/images";
import ImageUpload from "~/components/image-upload";
import { parseFormData, } from "@mjackson/form-data-parser";
import uploadHandler from "~/lib/upload-handler.server";
import PostingTimesSelector from "~/components/posting-time-selector";
import { requireUser } from "~/lib/session.server";

export async function action({ request }: Route.ActionArgs) {
  const user = await requireUser(request);
  await parseFormData(
    request,
    uploadHandler(user, "image", /^image\//),
  );
}

export default function Images({ }: Route.ComponentProps) {
  return (
    <div>
      <h1>Images Dashboard</h1>

      <ImageUpload />

      <PostingTimesSelector />

      <nav>
        <Link to="image-list?limit=2">View All Images (2)</Link>
      </nav>

      <Outlet />
    </div>
  );
}
