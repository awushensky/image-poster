import type { ColorType } from "~/lib/color-utils";

export interface User {
  did: string;
  handle: string;
  timezone: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: Date;
  lastLogin: Date;
}

export interface PostingSchedule {
  id: number;
  userDid: string;
  cronExpression: string;
  color: ColorType;
  active: boolean;
  lastExecuted?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposedPostingSchedule extends Omit<PostingSchedule, 'id' | 'userDid' | 'lastExecuted' | 'createdAt' | 'updatedAt'> {}

export interface QueuedImage {
  storageKey: string;
  userDid: string;
  postText: string;
  isNsfw: boolean;
  queueOrder: number;
  createdAt: Date;
}

export interface ProposedQueuedImage extends Omit<QueuedImage, 'storageKey' | 'userDid' | 'queueOrder' | 'createdAt'> {};

export interface PostedImage {
  storageKey: string;
  userDid: string;
  postText: string;
  isNsfw: boolean;
  createdAt: Date;
}

export interface ImageCounts {
  queued: number,
  posted: number,
}
