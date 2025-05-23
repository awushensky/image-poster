import { Link, Outlet } from "react-router";
import type { Route } from "./+types/images";
import ImageUpload from "~/components/image-upload";
import { parseFormData, } from "@mjackson/form-data-parser";
import uploadHandler from "~/util/upload-handler";

export async function action({ request }: Route.ActionArgs) {
  await parseFormData(
    request,
    uploadHandler
  );
}

export default function Images({ }: Route.ComponentProps) {
  return (
    <div>
      <h1>Images Dashboard</h1>

      <ImageUpload />

      <nav>
        <Link to="image-list?limit=2">View All Images (2)</Link>
      </nav>
      
      <Outlet />
    </div>
  );
}
