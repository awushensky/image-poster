import type { User } from "~/model/model";


export function parseUser(raw: any): User {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    lastLogin: new Date(raw.lastLogin),
  };
}
