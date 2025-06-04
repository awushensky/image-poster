import { Form, redirect } from 'react-router';
import { createAuthUrl } from '~/auth/bluesky-auth.server';
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
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Bluesky Image Poster
          </h2>
          <p className="mt-2 text-gray-600">
            Automate your Bluesky image posts with smart scheduling
          </p>
        </div>
        
        <Form method="post" className="mt-8 space-y-6">
          <div>
            <label htmlFor="handle" className="block text-sm font-medium text-gray-700 mb-2">
              Your Bluesky Handle
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400 text-sm font-medium">@</span>
              </div>
              <input
                id="handle"
                name="handle"
                type="text"
                required
                placeholder="username.bsky.social"
                className="block w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Enter your username (e.g., "alice") or full handle (e.g., "alice.bsky.social")
            </p>
          </div>

          {actionData?.error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Authentication Error</h3>
                  <p className="text-sm text-red-700 mt-1">{actionData.error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-blue-500 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              Log in with Bluesky
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
