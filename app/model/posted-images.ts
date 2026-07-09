export interface PostedImage {
  storageKey: string;
  userDid: string;
  postText: string;
  altText: string;
  isNsfw: boolean;
  createdAt: Date;
}
