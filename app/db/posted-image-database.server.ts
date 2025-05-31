import type { PostedImage } from "~/model/model";
import { ensureDatabase } from "./database.server";


export async function createPostedImageEntry(
  userDid: string,
  storageKey: string
): Promise<void> {
  const db = await ensureDatabase();

  await db.run(`
    INSERT INTO posted_images (user_did, storage_key)
    VALUES (?, ?)
  `, [userDid, storageKey]);
}

export async function readPostedImageEntries(
  userDid: string,
): Promise<PostedImage> {
  const db = await ensureDatabase();

  return await db.all(`
    SELECT * FROM posted_images WHERE user_did = ?
  `, [userDid]);
}
