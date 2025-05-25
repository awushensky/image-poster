import { NodeOAuthClient, type NodeSavedSession, type Session, TokenRefreshError, TokenRevokedError } from '@atproto/oauth-client-node';
import { JoseKey } from '@atproto/jwk-jose';
import { Agent } from '@atproto/api';
import {
  createOrUpdateUser,
  deleteOAuthSession,
  getOAuthSession,
  storeOAuthSession,
} from '~/db/database.server';

let oauthClient: NodeOAuthClient;

async function initOAuthClient() {
  if (oauthClient) return oauthClient;

  const baseUrl = process.env.BASE_URL;
  
  const keyset = await Promise.all([
    JoseKey.fromImportable(JSON.parse(process.env.PRIVATE_KEY_1!)),
    JoseKey.fromImportable(JSON.parse(process.env.PRIVATE_KEY_2!)),
    JoseKey.fromImportable(JSON.parse(process.env.PRIVATE_KEY_3!)),
  ]);

  oauthClient = new NodeOAuthClient({
    clientMetadata: {
      client_id: `${baseUrl}/client-metadata.json`,
      client_name: 'LuminBlaz\'s Automatic Image Poster',
      client_uri: baseUrl,
      redirect_uris: [`${baseUrl}/auth/callback`],
      scope: 'atproto transition:generic',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      application_type: 'web',
      token_endpoint_auth_method: 'private_key_jwt',
      token_endpoint_auth_signing_alg: 'ES256',
      dpop_bound_access_tokens: true,
      jwks_uri: `${baseUrl}/jwks.json`,
    },

    keyset,

    stateStore: {
      async set(key: string, internalState: any): Promise<void> {
        globalStateStore.set(key, {
          state: internalState,
          expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        });
      },
      async get(key: string): Promise<any> {
        const stored = globalStateStore.get(key);
        if (!stored || stored.expires < Date.now()) {
          globalStateStore.delete(key);
          return undefined;
        }
        return stored.state;
      },
      async del(key: string): Promise<void> {
        globalStateStore.delete(key);
      }
    },

    sessionStore: {
      async set(sub: string, session: NodeSavedSession): Promise<void> {
        await storeOAuthSession(sub, session);
      },
      async get(sub: string): Promise<NodeSavedSession | undefined> {
        return await getOAuthSession(sub);
      },
      async del(sub: string): Promise<void> {
        await deleteOAuthSession(sub);
      }
    }
  });

  setupOAuthEventListeners(oauthClient);
  return oauthClient;
}

/**
 * BlueSky OAuth provides event listeners to handle token updates and session deletions.
 * Previously, I thought we needed to manually handle token refreshes, but the client
 * automatically manages this for us. We just need to listen for updates and deletions.
 */
function setupOAuthEventListeners(client: NodeOAuthClient) {
  client.addEventListener('updated', async (event: CustomEvent<{ sub: string; } & Session>) => {
    console.log('Received OAuth token refresh update:', event.detail.sub);
  });

  client.addEventListener('deleted', async (event: CustomEvent<{
    sub: string;
    cause: TokenRefreshError | TokenRevokedError | unknown;
  }>) => {
    const { sub, cause } = event.detail;
    console.log(`OAuth session ${sub} deleted: `, cause);
  });
}

export async function isSessionValid(userDid: string): Promise<boolean> {
  try {
    const client = await initOAuthClient();
    await client.restore(userDid);
    return true;
  } catch (error) {
    console.log(`OAuth session invalid for ${userDid}:`, error);
    return false;
  }
}

export async function revokeUserSession(userDid: string): Promise<void> {
  try {
    const client = await initOAuthClient();
    await client.revoke(userDid);
    console.log(`Successfully revoked OAuth session for: ${userDid}`);
  } catch (error) {
    console.error(`Failed to revoke OAuth session for ${userDid}:`, error);
    throw error;
  }
}

export async function createAuthUrl(handle: string): Promise<string> {
  const client = await initOAuthClient();
  const state = crypto.randomUUID();
  
  const url = await client.authorize(handle, { state });
  return url.toString();
}

export async function handleAuthCallback(params: URLSearchParams) {
  const client = await initOAuthClient();
  
  const { session, state } = await client.callback(params);
  
  const agent = new Agent(session);

  const profile = await agent.getProfile({ actor: session.sub });
  if (!profile.success) {
    throw new Error('Failed to get user profile');
  }

  const user = await createOrUpdateUser(profile.data.did);
  return { user, state };
}

// Simple in-memory state store (use Redis in production)
const globalStateStore = new Map<string, { state: any; expires: number }>();

export async function restoreUserSession(userDid: string): Promise<Agent> {
  const client = await initOAuthClient();
  const session = await client.restore(userDid);
  return new Agent(session);
}

export async function postImageToBluesky(
  userDid: string,
  imageBuffer: Buffer,
  altText: string = ''
) {
  try {
    const agent = await restoreUserSession(userDid);

    const uploadResult = await agent.uploadBlob(imageBuffer, {
      encoding: 'image/jpeg'
    });

    if (!uploadResult.success) {
      throw new Error('Failed to upload image to Bluesky');
    }

    const postResult = await agent.post({
      text: '',
      embed: {
        $type: 'app.bsky.embed.images',
        images: [{
          alt: altText,
          image: uploadResult.data.blob
        }]
      }
    });

    return postResult;
  } catch (error) {
    console.error('Failed to post image to Bluesky:', error);
    throw error;
  }
}

// Export client for metadata endpoints
export async function getOAuthClient() {
  return await initOAuthClient();
}
