import React, { useState } from 'react';
import { GripVertical, Calendar, AlertTriangle, Trash2 } from 'lucide-react';
import type { ImageWithEstimatedUpload } from '~/lib/posting-time-estimator';
import { useFetcher } from 'react-router';

interface ImageListComponentProps {
  images: ImageWithEstimatedUpload[];
  onImagesReordered?: (storageKey: string, destinationOrder: number) => void;
  onImageUpdate?: (image: number, update: Partial<{ postText: string, isNsfw: boolean }>) => void;
  onImageDelete?: (storageKey: string) => void;
}

const ImageListComponent = ({ 
  images = [],
  onImagesReordered,
  onImageUpdate,
  onImageDelete
}: ImageListComponentProps) => {
  const fetcher = useFetcher();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const sortedImages = [...images].sort((a, b) => a.queue_order - b.queue_order);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, droppedIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex !== null && draggedIndex !== droppedIndex && draggedIndex >= 0 && draggedIndex < sortedImages.length) {
      const draggedImage = sortedImages[draggedIndex];
      const droppedImage = sortedImages[droppedIndex];

      fetcher.submit(
        {
          action: 'reorder',
          toOrder: droppedImage.queue_order,
        },
        { method: 'PUT', action: `/api/image/${draggedImage.storage_key}` }
      );
      onImagesReordered?.(draggedImage.storage_key, droppedImage.queue_order);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handlePostTextChange = (index: number, newText: string) => {
    onImageUpdate?.(index, { postText: newText });
  };

  const handleNsfwChange = (index: number, isNsfw: boolean) => {
    onImageUpdate?.(index, { isNsfw });
  };

  const handleDelete = (storageKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    fetcher.submit({}, { method: 'DELETE', action: `/api/image/${storageKey}` });
    onImageDelete?.(storageKey);
  };

  const formatEstimatedTime = (timestamp?: Date) => {
    if (!timestamp) return 'Not scheduled';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Posting soon';
    if (diffInHours < 24) return `In ${diffInHours} hours`;
    
    const diffInDays = Math.ceil(diffInHours / 24);
    return `In ${diffInDays} days`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="space-y-4">
        {sortedImages.map((image, index) => (
          <div
            key={image.storage_key}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              bg-white rounded-lg shadow-md p-4 border-2 transition-all duration-200
              ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
              ${dragOverIndex === index && draggedIndex !== index ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}
              hover:shadow-lg cursor-move
            `}
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <img
                  src={`/api/image/${image.storage_key}`}
                  alt={image.storage_key || 'Uploaded image'}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                />
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Post Text
                  </label>
                  <textarea
                    value={image.post_text || ''}
                    onChange={(e) => handlePostTextChange(index, e.target.value)}
                    placeholder="Enter your post text..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={image.is_nsfw || false}
                      onChange={(e) => handleNsfwChange(index, e.target.checked)}
                      className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                    />
                    <span className="flex items-center text-sm text-gray-700">
                      <AlertTriangle className="w-4 h-4 mr-1 text-red-500" />
                      NSFW Content
                    </span>
                  </label>

                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span title={image.estimatedPostTime ? image.estimatedPostTime.toLocaleString() : ''}>{formatEstimatedTime(image.estimatedPostTime)}</span>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center gap-2">
                <button
                  onClick={(e) => handleDelete(image.storage_key, e)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                  title="Delete image"
                  type="button"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <div className="p-2 cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        ))}

        {images.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-lg font-medium mb-2">No images uploaded yet</div>
            <div className="text-sm">Upload some images to get started!</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageListComponent;
