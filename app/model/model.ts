import type { ColorType } from "~/lib/color-utils";

export interface User {
  did: string;
  handle: string;
  timezone: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  last_login: string;
}

export interface PostingSchedule {
  id: number;
  user_did: string;
  cron_expression: string;
  color: ColorType;
  active: boolean;
  last_executed?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ProposedPostingSchedule extends Omit<PostingSchedule, 'id' | 'user_did' | 'last_executed' | 'created_at' | 'updated_at'> {}

export interface QueuedImage {
  storage_key: string;
  user_did: string;
  post_text: string;
  is_nsfw: boolean;
  queue_order: number;
  created_at: string;
}

export interface ProposedQueuedImage extends Omit<QueuedImage, 'storage_key' | 'queue_order' | 'created_at'> {};

export interface PostedImage {
  storage_key: string;
  user_did: string;
  created_at: string;
}
