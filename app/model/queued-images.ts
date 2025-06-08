export interface QueuedImage {
  storageKey: string;
  userDid: string;
  postText: string;
  isNsfw: boolean;
  queueOrder: number;
  createdAt: Date;
}

export interface ProposedQueuedImage extends Omit<QueuedImage, 'storageKey' | 'userDid' | 'createdAt'> { }
