import { Form, redirect } from 'react-router';
import { createAuthUrl } from '~/lib/bluesky-auth.server';
import type { Route } from './+types/auth.login';

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const handle = formData.get('handle') as string;

  if (!handle) {
    return { error: 'Please provide your Bluesky handle' };
  }

  // Clean up the handle (remove @ if present, ensure it has .bsky.social if no domain)
  let cleanHandle = handle.trim();
  if (cleanHandle.startsWith('@')) {
    cleanHandle = cleanHandle.slice(1);
  }
  if (!cleanHandle.includes('.') && !cleanHandle.includes(':')) {
    cleanHandle = `${cleanHandle}.bsky.social`;
  }

  try {
    const authUrl = await createAuthUrl(cleanHandle);
    return redirect(authUrl);
  } catch (error) {
    console.error('Failed to create auth URL:', error);
    return { error: 'Failed to initiate authentication. Please check your handle and try again.' };
  }
}

export default function Login({ actionData }: Route.ComponentProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Bluesky Image Poster
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your Bluesky handle to continue
          </p>
        </div>
        
        <Form method="post" className="mt-8 space-y-6">
          <div>
            <label htmlFor="handle" className="block text-sm font-medium text-gray-700">
              Bluesky Handle
            </label>
            <div className="mt-1 relative">
              <input
                id="handle"
                name="handle"
                type="text"
                required
                placeholder="username.bsky.social"
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400 text-sm">@</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              You can enter just your username (e.g., "alice") or your full handle (e.g., "alice.bsky.social")
            </p>
          </div>

          {actionData?.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{actionData.error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Continue to Bluesky
            </button>
          </div>
        </Form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have a Bluesky account?{' '}
            <a 
              href="https://bsky.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign up at bsky.app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
