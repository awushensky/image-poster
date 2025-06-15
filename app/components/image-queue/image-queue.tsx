import React, { useState, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import type { ImageWithEstimatedUpload } from '~/lib/posting-time-estimator';
import { estimateImageSchedule } from '~/lib/posting-time-estimator';
import { deleteImage, reorderImages, updateImage } from '~/lib/dashboard-utils';
import ImageCard from './image-card';
import Modal from '../modal';
import EditPostModalContent from './edit-post-modal-content';
import { type PostingSchedule } from "~/model/posting-schedules";
import { type ProposedQueuedImage } from "~/model/queued-images";
import { deleteQueuedImage, fetchQueuedImages, updateQueuedImage } from "~/api-interface/image-queue";
import { fetchThumbnails } from "~/api-interface/thumbnail";
import { type ThumbnailData } from "~/api-interface/thumbnail";
import { fetchImageCounts } from '~/api-interface/image-counts';


const PAGE_SIZE = 50;

interface ImageQueueProps {
  schedules: PostingSchedule[];
  initialQueuedImageCount: number;
  userTimezone: string;
  onChanged: (imageCount: number) => void;
  onError: (error: string) => void;
}

const ImageQueue = ({
  schedules,
  initialQueuedImageCount,
  userTimezone,
  onChanged,
  onError,
}: ImageQueueProps) => {
  const [images, setImages] = useState<ImageWithEstimatedUpload[]>([]);
  const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingImageKey, setEditingImageKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialQueuedImageCount);

  const queueItems = [...images].map(image => ({image: image, thumbnail: thumbnails.find(thumbnail => thumbnail.storageKey === image.storageKey)!}));
  const editingImage = editingImageKey ? images.find(img => img.storageKey === editingImageKey) : null;

  // Load images on mount and when dependencies change
  useEffect(() => {
    loadImages();
  }, [schedules, userTimezone, page]);

  async function loadImages() {
    try {
      setLoading(true);
      const queuedImages = await fetchQueuedImages(page, PAGE_SIZE);
      const imageCounts = await fetchImageCounts();
      const estimatedImages = estimateImageSchedule(queuedImages, schedules, userTimezone);
      const thumbnails = await fetchThumbnails(queuedImages.map(image => image.storageKey));

      setImages(estimatedImages);
      setTotalCount(imageCounts.queued);
      setThumbnails(thumbnails);
      onChanged(imageCounts.queued);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load queued images';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  async function handleDrop(e: React.DragEvent<HTMLDivElement>, droppedIndex: number) {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === droppedIndex || draggedIndex < 0 || draggedIndex >= queueItems.length) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const draggedImage = queueItems[draggedIndex];
    const droppedImage = queueItems[droppedIndex];

    try {
      // Update local state immediately for responsive UI
      const reorderedImages = reorderImages(images, draggedImage.image.storageKey, droppedImage.image.queueOrder);
      setImages(estimateImageSchedule(reorderedImages, schedules, userTimezone));
      setTotalCount(totalCount + 1);

      // Make API call. Do not await so we have a more reponsive UI
      updateQueuedImage(
        draggedImage.image.storageKey,
        { queueOrder: droppedImage.image.queueOrder },
      );

      onChanged(totalCount + 1);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Reorder failure';
      onError(errorMessage);
    } finally {
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  };

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  function handleEditOpen(storageKey: string) {
    setEditingImageKey(storageKey);
  };

  function handleEditClose() {
    setEditingImageKey(null);
  };

  async function handleEditSave(update: Partial<ProposedQueuedImage>) {
    if (!editingImageKey) return;

    try {
      // Update local state immediately for responsive UI
      const updatedImages = updateImage(images, editingImageKey, update);
      setImages(estimateImageSchedule(updatedImages, schedules, userTimezone));

      // Make API call. Do not await so we have a more reponsive UI
      updateQueuedImage(editingImageKey, update);

      setEditingImageKey(null);
      onChanged(totalCount);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Reorder failure';
      onError(errorMessage);
    }
  };

  async function handleDelete(storageKey: string, e: React.MouseEvent) {
    e.stopPropagation();

    try {
      // Update local state immediately for responsive UI
      const updatedImages = deleteImage(images, storageKey);
      setImages(estimateImageSchedule(updatedImages, schedules, userTimezone));
      setTotalCount(totalCount - 1);

      // Make API call. Do not await so we have a more reponsive UI
      deleteQueuedImage(storageKey);

      onChanged(totalCount - 1);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Reorder failure';
      onError(errorMessage);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen relative">
      {editingImageKey && editingImage && (
        <Modal
          onClose={handleEditClose}
          title="Edit Post Text"
        >
          <EditPostModalContent
            initialText={editingImage.postText || ''}
            initialIsNsfw={editingImage.isNsfw || false}
            onSave={handleEditSave}
            onCancel={handleEditClose}
          />
        </Modal>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <div className="text-lg font-medium mb-2">Loading images...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {queueItems.map((queueItem, index) => (
            <div
              key={queueItem.image.storageKey}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                relative transition-all duration-200
                ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                ${dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
                cursor-move
              `}
            >

              <div className="absolute top-2 right-2 z-10 p-2 bg-white dark:bg-gray-800 bg-opacity-80 dark:bg-opacity-80 rounded-md shadow-sm">
                <GripVertical className="w-5 h-5 text-gray-400 dark:text-gray-500 cursor-grab active:cursor-grabbing" />
              </div>

              <ImageCard
                image={queueItem.image}
                thumbnailBlob={`data:${queueItem.thumbnail.contentType};base64,${queueItem.thumbnail.data}`}
                onDelete={handleDelete}
                onEdit={handleEditOpen}
              />
            </div>
          ))}

          {images.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <div className="text-lg font-medium mb-2">No images uploaded yet</div>
              <div className="text-sm">Upload some images to get started!</div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center mt-6">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {page} of {Math.ceil(totalCount / PAGE_SIZE)}
        </span>
        <button
          disabled={page * PAGE_SIZE >= totalCount}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ImageQueue;
