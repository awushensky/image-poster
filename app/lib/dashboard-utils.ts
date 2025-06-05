import type { QueuedImage } from "~/model/model";

export function reorderImages(images: QueuedImage[], imageToReorderStorageKey: string, toOrder: number): QueuedImage[] {
  const selectedImageIndex = images.findIndex(image => image.storage_key === imageToReorderStorageKey);
  const reorderedImages = moveItem(images, selectedImageIndex, toOrder - 1)
  return updateQueueOrders(reorderedImages);
}

export function deleteImage(images: QueuedImage[], imageToDeleteStorageKey: string): QueuedImage[] {
  const selectedImageIndex = images.findIndex(image => image.storage_key === imageToDeleteStorageKey);
  const updatedImages = images.filter((_, i) => i !== selectedImageIndex);
  return updateQueueOrders(updatedImages);
}

function moveItem<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const newArray = [...array];
  const [movedItem] = newArray.splice(fromIndex, 1);
  newArray.splice(toIndex, 0, movedItem);
  return newArray;
}

function updateQueueOrders(images: QueuedImage[]): QueuedImage[] {
  return images.map((image, index) => ({
    ...image,
    queue_order: index + 1
  }));
}
