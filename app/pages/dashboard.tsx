import { useNavigate } from "react-router";
import { PostingSummary } from "~/components/posting-summary";
import type { Route } from "./+types/dashboard";
import { getUserPostingTimes } from "~/db/user-database.server";
import { requireUser } from "~/lib/session.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  
  const postingTimes = await getUserPostingTimes(user.id);
  
  return { user, postingTimes };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <PostingSummary 
        times={loaderData.postingTimes}
        className="mb-6"
        showEditButton={true}
        onEdit={() => navigate('/settings/posting-schedule')}
      />
      
      {/* Other dashboard content */}
    </div>
  );
}

