import type { ProposedQueuedImage } from "~/model/queued-images";
import type { QueuedImage } from "~/model/queued-images";


export function reorderImages(images: QueuedImage[], imageToReorderStorageKey: string, toOrder: number): QueuedImage[] {
  const selectedImageIndex = images.findIndex(image => image.storageKey === imageToReorderStorageKey);
  const reorderedImages = moveItem(images, selectedImageIndex, toOrder - 1)
  return updateQueueOrders(reorderedImages);
}

export function updateImage(images: QueuedImage[], imageToUpdateStorageKey: string, update: Partial<ProposedQueuedImage>) {
  const selectedImageIndex = images.findIndex(image => image.storageKey === imageToUpdateStorageKey);
  return images.map((image, index) => {
    if (index === selectedImageIndex) {
      return {
        ...image,
        ...update,
      };
    } else {
      return image;
    }
  });
}

export function deleteImage(images: QueuedImage[], imageToDeleteStorageKey: string): QueuedImage[] {
  const selectedImageIndex = images.findIndex(image => image.storageKey === imageToDeleteStorageKey);
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
    queueOrder: index + 1
  }));
}
