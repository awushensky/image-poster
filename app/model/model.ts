export interface User {
  did: string;
  handle: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  last_login: string;
}

export interface PostingTime {
  hour: number;
  minute: number;
  day_of_week: number;
}

export interface QueuedImage {
  storage_key: string;
  user_did: string;
  post_text: string;
  is_nsfw: boolean;
  queue_order: number;
  created_at: string;
}

export interface PostedImage {
  storage_key: string;
  user_did: string;
  created_at: string;
}

export const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export const WEEKDAYS = [1, 2, 3, 4, 5];
export const WEEKENDS = [0, 6];
