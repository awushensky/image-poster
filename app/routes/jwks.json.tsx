import { getOAuthClient } from '~/auth/bluesky-auth.server';
import type { Route } from './+types/jwks.json';

export async function loader({}: Route.LoaderArgs) {
  try {
    const client = await getOAuthClient();
    
    return new Response(JSON.stringify(client.jwks, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours (keys change rarely)
      },
    });
  } catch (error) {
    console.error('Failed to get JWKS:', error);
    throw new Response('Internal Server Error', { status: 500 });
  }
}
