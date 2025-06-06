import React, { useState, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import type { ImageWithEstimatedUpload } from '~/lib/posting-time-estimator';
import { estimateImageSchedule } from '~/lib/posting-time-estimator';
import { deleteImage, reorderImages, updateImage } from '~/lib/dashboard-utils';
import ImageCard from './image-card';
import Modal from '../modal';
import EditPostModalContent from './edit-post-modal-content';
import type { ProposedQueuedImage, PostingSchedule } from '~/model/model';

interface ImageQueueProps {
  schedules: PostingSchedule[];
  userTimezone: string;
  onChanged: (imageCount: number) => void;
  onError: (error: string) => void;
}

const ImageQueue = ({
  schedules,
  userTimezone,
  onChanged,
  onError,
}: ImageQueueProps) => {
  const [images, setImages] = useState<ImageWithEstimatedUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingImageKey, setEditingImageKey] = useState<string | null>(null);

  // Load images on mount and when dependencies change
  useEffect(() => {
    loadImages();
  }, [schedules, userTimezone]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/image-queue`);
      if (!response.ok) {
        throw new Error('Failed to fetch queued images');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load posted images');
      }
      
      const estimatedImages = estimateImageSchedule(result.images, schedules, userTimezone);
      setImages(estimatedImages);
      onChanged(estimatedImages.length);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load posted images';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const sortedImages = [...images].sort((a, b) => a.queueOrder - b.queueOrder);
  const editingImage = editingImageKey ? images.find(img => img.storageKey === editingImageKey) : null;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, droppedIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === droppedIndex || draggedIndex < 0 || draggedIndex >= sortedImages.length) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const draggedImage = sortedImages[draggedIndex];
    const droppedImage = sortedImages[droppedIndex];

    try {
      // Update local state immediately for responsive UI
      const reorderedImages = reorderImages(images, draggedImage.storageKey, droppedImage.queueOrder);
      setImages(estimateImageSchedule(reorderedImages, schedules, userTimezone));

      // Make API call
      const formData = new FormData();
      formData.append('action', 'reorder');
      formData.append('toOrder', droppedImage.queueOrder.toString());

      const response = await fetch(`/api/image/${draggedImage.storageKey}`, {
        method: 'PUT',
        body: formData,
      });

      const result = await response.json();
      if (!result.success) {
        onError(result.error);
      }

      onChanged(images.length);
    } finally {
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleEditOpen = (storageKey: string) => {
    setEditingImageKey(storageKey);
  };

  const handleEditClose = () => {
    setEditingImageKey(null);
  };

  const handleEditSave = async (data: ProposedQueuedImage) => {
    if (!editingImageKey) return;

    try {
      // Update local state immediately for responsive UI
      const updatedImages = updateImage(images, editingImageKey, data);
      setImages(estimateImageSchedule(updatedImages, schedules, userTimezone));

      // Make API call
      const formData = new FormData();
      formData.append('action', 'update');
      formData.append('postText', data.postText);
      formData.append('isNsfw', data.isNsfw.toString());

      const response = await fetch(`/api/image/${editingImageKey}`, {
        method: 'PUT',
        body: formData,
      });

      const result = await response.json();
      if (!result.success) {
        onError(result.error);
      }

      setEditingImageKey(null);
      onChanged(images.length);
    } catch (error) {
      console.error('Failed to save post data:', error);
    }
  };

  const handleDelete = async (storageKey: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      // Update local state immediately for responsive UI
      const updatedImages = deleteImage(images, storageKey);
      setImages(estimateImageSchedule(updatedImages, schedules, userTimezone));

      // Make API call
      const response = await fetch(`/api/image/${storageKey}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!result.success) {
        onError(result.error);
      }

      onChanged(updatedImages.length);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen relative">
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
        <div className="text-center py-12 text-gray-500">
          <div className="text-lg font-medium mb-2">Loading images...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedImages.map((image, index) => (
            <div
              key={image.storageKey}
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

              {/* Drag handle overlay */}
              <div className="absolute top-2 right-2 z-10 p-2 bg-white bg-opacity-80 rounded-md shadow-sm">
                <GripVertical className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing" />
              </div>

              {/* Fieldset automatically disables all form elements inside when disabled */}
              <fieldset disabled={false} className="border-0 p-0 m-0">
                <ImageCard
                  image={image}
                  onDelete={handleDelete}
                  onEdit={handleEditOpen}
                />
              </fieldset>
            </div>
          ))}

          {images.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-lg font-medium mb-2">No images uploaded yet</div>
              <div className="text-sm">Upload some images to get started!</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageQueue;
