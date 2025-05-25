import { Link } from "react-router";
import { getUser } from '~/lib/session.server';
import type { Route } from './+types/home';

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request);
  if (user) {
    throw new Response(null, {
      status: 302,
      headers: { Location: '/dashboard' }
    });
  }
  
  // Get error from URL params
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  
  return { error };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'auth_failed':
        return 'Authentication failed. Please try again.';
      case 'access_denied':
        return 'You denied access to the application.';
      case 'missing_params':
        return 'Authentication parameters were missing. Please try again.';
      case 'oauth_error':
        return 'An OAuth error occurred. Please try again.';
      case 'profile_error':
        return 'Failed to retrieve your Bluesky profile. Please try again.';
      case 'state_mismatch':
        return 'Security check failed. Please try again.';
      default:
        return null;
    }
  };

  const errorMessage = getErrorMessage(loaderData?.error);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Bluesky Image Poster
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Schedule and automatically post your images to Bluesky
          </p>
        </div>
        
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        <Link
          to="/auth/login"
          className="w-full flex justify-center py-3 px-4 border border-transparent text-lg font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Sign in with Bluesky
        </Link>
      </div>
    </div>
  );
}
