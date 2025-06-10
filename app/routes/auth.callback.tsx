import { redirect } from 'react-router';
import { handleAuthCallback } from '~/auth/bluesky-auth.server';
import { createUserSession } from '~/auth/session.server';
import type { Route } from './+types/auth.callback';
import { cn, themeClasses } from '~/utils/theme';

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
    <div className={cn(
      "min-h-screen flex items-center justify-center",
      themeClasses.surface
    )}>
      <div className={cn(
        "text-center space-y-6 p-8 rounded-lg max-w-md mx-4",
        themeClasses.card,
        "shadow-lg border",
        themeClasses.border
      )}>
        {/* Loading spinner */}
        <div className="flex justify-center">
          <div className={cn(
            "animate-spin rounded-full h-12 w-12 border-4 border-transparent",
            "border-t-blue-600 dark:border-t-blue-400",
            "border-r-blue-600 dark:border-r-blue-400"
          )} 
          role="status" 
          aria-label="Loading">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <h2 className={cn(
            "text-xl font-semibold",
            themeClasses.primary
          )}>
            Completing sign in...
          </h2>
          <p className={themeClasses.secondary}>
            Please wait while we finish setting up your account.
          </p>
        </div>
        
        {/* Progress indicator */}
        <div className="space-y-3">
          <div className={cn(
            "w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"
          )}>
            <div className={cn(
              "h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse",
              "w-3/4 transition-all duration-1000"
            )}></div>
          </div>
          
          <div className={cn(
            "text-sm",
            themeClasses.muted
          )}>
            <p>If this takes more than a few seconds, please try refreshing the page.</p>
          </div>
        </div>

        {/* Authentication steps indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-center space-x-2">
            {/* Step indicators */}
            <div className={cn(
              "w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"
            )}></div>
            <div className={cn(
              "w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse",
              "animation-delay-300"
            )}></div>
            <div className={cn(
              "w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse",
              "animation-delay-600"
            )}></div>
          </div>
          <p className={cn(
            "text-xs",
            themeClasses.muted
          )}>
            Verifying with Bluesky...
          </p>
        </div>
      </div>
    </div>
  );
}
