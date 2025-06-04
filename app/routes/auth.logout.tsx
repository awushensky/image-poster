import { logout } from '~/auth/session.server';
import type { Route } from './+types/auth.logout';

export async function action({ request }: Route.ActionArgs) {
  return logout(request);
}

export async function loader({ request }: Route.LoaderArgs) {
  return logout(request);
}

export default function Logout() {
  return <div>Logging out...</div>;
}
