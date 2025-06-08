export interface User {
  did: string;
  handle: string;
  timezone: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: Date;
  lastLogin: Date;
}
