import { NodeOAuthClient } from '@atproto/oauth-client-node';
import { Agent } from '@atproto/api';
import { createOrUpdateUser } from '~/db/user-database.server';

// Create OAuth client
// export const oauthClient = new NodeOAuthClient({
//   clientId: process.env.OAUTH_CLIENT_ID || 'http://localhost:3000/client-metadata.json',
//   clientMetadata: {
//     client_name: 'Bluesky Image Poster',
//     client_id: process.env.OAUTH_CLIENT_ID || 'http://localhost:3000/client-metadata.json',
//     client_uri: process.env.BASE_URL || 'http://localhost:3000',
//     redirect_uris: [
//       `${process.env.BASE_URL || 'http://localhost:3000'}/auth/callback`
//     ],
//     scope: 'atproto transition:generic',
//     grant_types: ['authorization_code', 'refresh_token'],
//     response_types: ['code'],
//     application_type: 'web',
//     token_endpoint_auth_method: 'none',
//     dpop_bound_access_tokens: true,
//   },
//   stateStore: {
//     set: async (key: string, internalState: any) => {
//       // Store state temporarily - you might want to use Redis or database for production
//       // For now, we'll use a simple in-memory store with expiration
//       globalStateStore.set(key, {
//         state: internalState,
//         expires: Date.now() + 10 * 60 * 1000 // 10 minutes
//       });
//     },
//     get: async (key: string) => {
//       const stored = globalStateStore.get(key);
//       if (!stored || stored.expires < Date.now()) {
//         globalStateStore.delete(key);
//         return undefined;
//       }
//       return stored.state;
//     },
//     del: async (key: string) => {
//       globalStateStore.delete(key);
//     }
//   },
//   sessionStore: {
//     set: async (key: string, session: any) => {
//       // Store session in database or secure storage
//       await storeOAuthSession(key, session);
//     },
//     get: async (key: string) => {
//       return await getOAuthSession(key);
//     },
//     del: async (key: string) => {
//       await deleteOAuthSession(key);
//     }
//   }
// });

// // Simple in-memory state store (use Redis in production)
// const globalStateStore = new Map<string, { state: any; expires: number }>();

// // OAuth session storage functions (implement these in your database)
// async function storeOAuthSession(key: string, session: any) {
//   // Store in database - you might want to add an oauth_sessions table
//   // For now, we'll store it with the user session
//   console.log('Storing OAuth session:', key);
// }

// async function getOAuthSession(key: string) {
//   // Retrieve from database
//   console.log('Getting OAuth session:', key);
//   return null;
// }

// async function deleteOAuthSession(key: string) {
//   // Delete from database
//   console.log('Deleting OAuth session:', key);
// }

// export async function createAuthUrl(): Promise<string> {
//   const url = await oauthClient.authorize('bsky.social', {
//     scope: 'atproto transition:generic'
//   });
//   return url.toString();
// }

// export async function handleAuthCallback(code: string, state: string) {
//   try {
//     const { session } = await oauthClient.callback(code, state);
    
//     // Create an agent from the session
//     const agent = new Agent(session);
    
//     // Get user profile
//     const profile = await agent.getProfile({ actor: session.sub });
    
//     if (!profile.success) {
//       throw new Error('Failed to get user profile');
//     }

//     // Store user in database
//     const userData = {
//       bluesky_handle: profile.data.handle,
//       bluesky_did: profile.data.did,
//       access_token: session.accessToken || '',
//       refresh_token: session.refreshToken || '',
//     };

//     const user = await createOrUpdateUser(userData);
//     return user;
//   } catch (error) {
//     console.error('OAuth callback error:', error);
//     throw error;
//   }
// }

// // Function to create an authenticated agent for a user
// export async function createUserAgent(user: { bluesky_did: string }) {
//   try {
//     // Get the stored session for this user
//     const session = await getOAuthSession(user.bluesky_did);
//     if (!session) {
//       throw new Error('No stored OAuth session found');
//     }

//     return new Agent(session);
//   } catch (error) {
//     console.error('Failed to create user agent:', error);
//     throw new Error('Failed to authenticate with stored session');
//   }
// }

// // Function to post an image
// export async function postImageToBluesky(
//   user: { bluesky_did: string },
//   imageBuffer: Buffer,
//   altText: string = ''
// ) {
//   try {
//     const agent = await createUserAgent(user);

//     // Upload the image
//     const uploadResult = await agent.uploadBlob(imageBuffer, {
//       encoding: 'image/jpeg'
//     });

//     if (!uploadResult.success) {
//       throw new Error('Failed to upload image to Bluesky');
//     }

//     // Create the post with the image
//     const postResult = await agent.post({
//       text: '', // You can add text here if desired
//       embed: {
//         $type: 'app.bsky.embed.images',
//         images: [{
//           alt: altText,
//           image: uploadResult.data.blob
//         }]
//       }
//     });

//     return postResult;
//   } catch (error) {
//     console.error('Failed to post image to Bluesky:', error);
//     throw error;
//   }
// }
