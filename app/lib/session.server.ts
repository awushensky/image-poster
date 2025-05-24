import { createCookieSessionStorage } from 'react-router';
import { getUserBySessionId, createUserSession as createDbSession, deleteUserSession } from '~/db/user-database.server';

const sessionTTLMillis = 1000* 60 * 60 * 24 * 30; // 30 days in milliseconds
const sessionIdKey = 'sessionId';
const sessionIdCookieName = '__sessionId';

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: sessionIdCookieName,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.SESSION_SECRET || 'your-secret-key'],    // TODO: set up environment variables
    secure: process.env.NODE_ENV === 'production',
  },
});

export async function createUserSession(userId: number, redirectTo: string) {
  const sessionId = await createDbSession(userId, new Date(Date.now() + sessionTTLMillis));
  
  const session = await sessionStorage.getSession();
  session.set(sessionIdKey, sessionId);
  
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirectTo,
      'Set-Cookie': await sessionStorage.commitSession(session),
    },
  });
}

export async function getUserSession(request: Request): Promise<string | null> {
  const cookie = request.headers.get('Cookie');
  const session = await sessionStorage.getSession(cookie);
  return session.get(sessionIdKey);
}

async function getUser(request: Request) {
  const sessionId = await getUserSession(request);
  if (!sessionId) return null;
  
  return await getUserBySessionId(sessionId);
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

/**
 * Log the user out by deleting the session cookie and the session in the database. This
 * will redirect the user to the home page.
 * 
 * @param request 
 * @returns 
 */
export async function logout(request: Request) {
  const sessionId = await getUserSession(request);
  if (sessionId) {
    await deleteUserSession(sessionId);
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
