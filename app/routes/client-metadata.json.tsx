import { getOAuthClient } from '~/auth/bluesky-auth.server';
import type { Route } from './+types/client-metadata.json';

export async function loader({}: Route.LoaderArgs) {
  try {
    const client = await getOAuthClient();
    
    return new Response(JSON.stringify(client.clientMetadata, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Failed to get client metadata:', error);
    throw new Response('Internal Server Error', { status: 500 });
  }
}
