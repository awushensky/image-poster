import type { PostedImage } from "~/model/model";
import { useDatabase } from "./database.server";

export async function createPostedImageEntry(
  userDid: string,
  storageKey: string
): Promise<void> {
  await useDatabase(async db => {
    await db.run(`
      INSERT INTO posted_images (user_did, storage_key)
      VALUES (?, ?)
    `, [userDid, storageKey]);
  });
}

export async function readPostedImageEntries(
  userDid: string,
): Promise<PostedImage[]> {
  return await useDatabase(async db => {
    return await db.all(`
      SELECT * FROM posted_images 
      WHERE user_did = ? 
      ORDER BY created_at DESC
    `, [userDid]) as PostedImage[];
  });
}
