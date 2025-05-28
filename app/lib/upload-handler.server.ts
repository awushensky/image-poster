import type { FileUpload, FileUploadHandler } from "@mjackson/form-data-parser";
import { createHash } from "crypto";
import { createImageQueueEntry } from "~/db/image-queue-database.server";
import { fileStorage } from "~/lib/image-storage.server";
import type { User } from "~/model/model";

export default function uploadHandler(user: User, fieldName: string, typeMatcher: RegExp) {
  const handler: FileUploadHandler = async (fileUpload: FileUpload) => {
    if (
      fileUpload.fieldName === fieldName &&
      typeMatcher.test(fileUpload.type)
    ) {
      const storageKey = createHash('sha256')
        .update(`${user.did}-${fileUpload.name}-${Date()}`)
        .digest('hex');

      try {
        // FileUpload objects are not meant to stick around for very long (they are
        // streaming data from the request.body); store them as soon as possible.
        await fileStorage.set(storageKey, fileUpload);
        await createImageQueueEntry(user.did, storageKey, fileUpload.name);

        // Return a File for the FormData object. This is a LazyFile that knows how
        // to access the file's content if needed (using e.g. file.stream()) but
        // waits until it is requested to actually read anything.
        return fileStorage.get(storageKey);
      } catch (error) {
        console.error('Upload error:', error);
        return Promise.reject('Upload failed');
      }
    } else {
      console.warn('Attempted to upload file with unsupported field name or type:', {
        fieldName: fileUpload.fieldName,
        type: fileUpload.type,
      });
    }
  }

  return handler;
}
