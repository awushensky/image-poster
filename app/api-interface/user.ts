import type { User } from "~/model/user";
import type { ApiResult } from "./api";


export interface UpdateUserResult extends ApiResult {
  user?: User;
}

export function parseUser(raw: any): User {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    lastLogin: new Date(raw.lastLogin),
  };
}

export async function updateUser(update: { timezone: string }): Promise<User> {
  const response = await fetch('/api/user', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(update)
  });

  const result = await response.json() as UpdateUserResult;
  if (!result.success || !result.user) {
    throw new Error(result.error || 'Failed to update timezone');
  }

  return result.user;
}

