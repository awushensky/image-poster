export interface QueuedImage {
  storageKey: string;
  userDid: string;
  postText: string;
  isNsfw: boolean;
  queueOrder: number;
  createdAt: Date;
}

export interface ProposedQueuedImage extends Omit<QueuedImage, 'storageKey' | 'userDid' | 'createdAt'> { }

export interface PaginatedQueuedImages {
  images: QueuedImage[];
  hasMore: boolean;
  nextCursor?: number;
}
