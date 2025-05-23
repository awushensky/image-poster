import type { FileUpload, FileUploadHandler } from "@mjackson/form-data-parser";
import { fileStorage } from "~/image-storage.server";

  export default async function uploadHandler(fileUpload: FileUpload): Promise<void | null | string | Blob> {
    if (
      fileUpload.fieldName === "image" &&
      fileUpload.type.startsWith("image/")
    ) {
      const storageKey = `${fileUpload.name}`;

      try {
        // FileUpload objects are not meant to stick around for very long (they are
        // streaming data from the request.body); store them as soon as possible.
        await fileStorage.set(storageKey, fileUpload);
        
        // Return a File for the FormData object. This is a LazyFile that knows how
        // to access the file's content if needed (using e.g. file.stream()) but
        // waits until it is requested to actually read anything.
        return fileStorage.get(storageKey);
      } catch (error) {
        console.error('Upload error:', error);
        return null;
      }
    }
  }
