import { redirect } from 'react-router';
import { handleAuthCallback } from '~/auth/bluesky-auth.server';
import { createUserSession } from '~/auth/session.server';
import type { Route } from './+types/auth.callback';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const params = new URLSearchParams(url.search);

  const error = params.get('error');
  if (error) {
    const errorDescription = params.get('error_description');
    console.error('OAuth error:', error, errorDescription);
    
    let redirectUrl = '/auth/login?error=oauth_error';
    if (error === 'access_denied') {
      redirectUrl = '/auth/login?error=access_denied';
    }
    
    return redirect(redirectUrl);
  }

  const code = params.get('code');
  const state = params.get('state');
  
  if (!code || !state) {
    console.error('Missing OAuth parameters:', { code: !!code, state: !!state });
    return redirect('/auth/login?error=missing_params');
  }

  try {
    const { user, state: returnedState } = await handleAuthCallback(params);
    console.log('User authenticated successfully:', user.did, 'State:', returnedState);
    
    return await createUserSession(user.did, '/');
  } catch (error) {
    console.error('Auth callback error:', error);
    
    // Provide more specific error handling
    if (error instanceof Error) {
      if (error.message.includes('Failed to get user profile')) {
        return redirect('/auth/login?error=profile_error');
      }
      if (error.message.includes('state')) {
        return redirect('/auth/login?error=state_mismatch');
      }
    }
    
    return redirect('/auth/login?error=auth_failed');
  }
}

export default function AuthCallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        {/* Loading spinner */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Completing sign in...
          </h2>
          <p className="text-gray-600">
            Please wait while we finish setting up your account.
          </p>
        </div>
        
        <div className="text-sm text-gray-500">
          <p>If this takes more than a few seconds, please try refreshing the page.</p>
        </div>
      </div>
    </div>
  );
}
