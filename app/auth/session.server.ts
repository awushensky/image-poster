import { createCookieSessionStorage } from 'react-router';
import {
  createUserSession as createDbSession,
  deleteUserSession,
} from '~/db/user-session-database.server';
import { getUserFromSession } from '~/db/user-database.server';
import { isSessionValid, revokeUserSession } from './bluesky-auth.server';
import type { User } from "~/model/model";

const sessionTTLSeconds = 60 * 60 * 24 * 365; // 1 year in seconds
const sessionIdCookieName = '__sessionId';

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: sessionIdCookieName,
    httpOnly: true,
    maxAge: sessionTTLSeconds,
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.SESSION_SECRET || 'your-secret-key'],    // TODO: set up environment variables
    secure: process.env.NODE_ENV === 'production',
  },
});

export async function createUserSession(userDid: string, redirectTo: string) {
  const sessionToken = await createDbSession(userDid);
  const session = await sessionStorage.getSession();
  session.set('token', sessionToken);
  
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      'Set-Cookie': await sessionStorage.commitSession(session),
    },
  });
}

async function getSessionToken(request: Request): Promise<string | null> {
  const cookie = request.headers.get('Cookie');
  const session = await sessionStorage.getSession(cookie);
  return session.get('token');
}

export async function getUser(request: Request): Promise<User | null> {
  const sessionToken = await getSessionToken(request);
  if (!sessionToken) return null;
  
  const user = await getUserFromSession(sessionToken);
  if (!user) return null;
  
  // Ensure the user still has a valid session with Bluesky, otherwise log them out.
  const hasValidBskySession = await isSessionValid(user.did);
  if (!hasValidBskySession) {
    await deleteUserSession(user.did);
    return null;
  }

  return user;
}

export async function requireUser(request: Request) {
  const user = await getUser(request);
  if (!user) {
    throw new Response(null, {
      status: 302,
      headers: { Location: '/auth/login' }
    });
  }

  return user;
}

export async function logout(request: Request) {
  const sessionToken = await getSessionToken(request);
  if (sessionToken) {
    const user = await getUserFromSession(sessionToken);
    if (user) {
      await revokeUserSession(user.did);
    }
  }
  
  const session = await sessionStorage.getSession(request.headers.get('Cookie'));
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': await sessionStorage.destroySession(session),
    },
  });
}
