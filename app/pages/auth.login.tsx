import { Form, redirect } from 'react-router';
// import { createAuthUrl } from '~/lib/bluesky-auth.server';
import type { Route } from './+types/auth.login';

export async function loader() {
  // const authUrl = await createAuthUrl();
  const authUrl = 'https://bsky.app/auth?redirect_uri=https://example.com/callback&client_id=your_client_id';
  return { authUrl };
}

export default function Login({ loaderData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-center">
            Sign in to Bluesky Image Poster
          </h2>
        </div>
        <div>
          <a
            href={loaderData.authUrl}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Sign in with Bluesky
          </a>
        </div>
      </div>
    </div>
  );
}
