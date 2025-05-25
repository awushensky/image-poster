import { Link, Outlet } from "react-router";
import { requireUser } from '~/lib/session.server';
import type { Route } from '../pages/+types/settings';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return { user };
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-4">Settings</h2>
          <nav className="space-y-2">
            <Link 
              to="/settings/posting-schedule"
              className="block p-2 rounded hover:bg-gray-100"
            >
              Posting Schedule
            </Link>
            {/* Add more settings links here */}
          </nav>
        </div>
        
        {/* Main Content */}
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
