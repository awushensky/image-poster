import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';
import type { ImageWithEstimatedUpload } from '~/lib/posting-time-estimator';
import ImageCard from './image-card';
import Modal from '../modal';
import EditPostModalContent from './edit-post-modal-content';

interface ImageQueueProps {
  images: ImageWithEstimatedUpload[];
  isLoading: boolean,
  onImagesReordered: (storageKey: string, destinationOrder: number) => Promise<void>;
  onImageUpdate: (storageKey: string, update: Partial<{ postText: string, isNsfw: boolean }>) => Promise<void>;
  onImageDelete: (storageKey: string) => Promise<void>;
}

const ImageQueue = ({
  images = [],
  isLoading,
  onImagesReordered,
  onImageUpdate,
  onImageDelete
}: ImageQueueProps) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingImageKey, setEditingImageKey] = useState<string | null>(null);

  const sortedImages = [...images].sort((a, b) => a.queue_order - b.queue_order);
  const editingImage = editingImageKey ? images.find(img => img.storage_key === editingImageKey) : null;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (isLoading) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (isLoading) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, droppedIndex: number) => {
    e.preventDefault();

    if (isLoading || draggedIndex === null || draggedIndex === droppedIndex || draggedIndex < 0 || draggedIndex >= sortedImages.length) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const draggedImage = sortedImages[draggedIndex];
    const droppedImage = sortedImages[droppedIndex];

    try {
      onImagesReordered?.(draggedImage.storage_key, droppedImage.queue_order);
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
    if (isLoading) return;
    setEditingImageKey(storageKey);
  };

  const handleEditClose = () => {
    setEditingImageKey(null);
  };

  const handleEditSave = async (data: { text: string; isNsfw: boolean }) => {
    if (isLoading || !editingImageKey) return;

    try {
      await onImageUpdate?.(editingImageKey, {
        postText: data.text,
        isNsfw: data.isNsfw
      });
      setEditingImageKey(null);
    } catch (error) {
      console.error('Failed to save post data:', error);
    }
  };

  const handleDelete = async (storageKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;
    onImageDelete?.(storageKey);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen relative">
      {editingImageKey && editingImage && (
        <Modal
          onClose={handleEditClose}
          title="Edit Post Text"
        >
          <EditPostModalContent
            initialText={editingImage.post_text || ''}
            initialIsNsfw={editingImage.is_nsfw || false}
            onSave={handleEditSave}
            onCancel={handleEditClose}
          />
        </Modal>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center gap-3">
            <img
              src="/images/loading.png"
              alt="Loading..."
              className="w-sm h-sm"
            />
            <p className="text-gray-600 font-medium">Processing...</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sortedImages.map((image, index) => (
          <div
            key={image.storage_key}
            draggable={!isLoading}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              relative transition-all duration-200
              ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
              ${dragOverIndex === index && draggedIndex !== index ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
              ${isLoading ? 'pointer-events-none opacity-75' : 'cursor-move'}
            `}
          >

            {/* Drag handle overlay */}
            <div className="absolute top-2 right-2 z-10 p-2 bg-white bg-opacity-80 rounded-md shadow-sm">
              <GripVertical className={`w-5 h-5 text-gray-400 ${isLoading ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`} />
            </div>

            {/* Fieldset automatically disables all form elements inside when disabled */}
            <fieldset disabled={isLoading} className="border-0 p-0 m-0">
              <ImageCard
                image={image}
                onDelete={handleDelete}
                onEdit={handleEditOpen}
              />
            </fieldset>
          </div>
        ))}

        {images.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-lg font-medium mb-2">No images uploaded yet</div>
            <div className="text-sm">Upload some images to get started!</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageQueue;
