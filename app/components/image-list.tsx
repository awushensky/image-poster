import React, { useEffect, useState } from 'react';
import { GripVertical, Calendar, AlertTriangle, Trash2, Save, RotateCcw } from 'lucide-react';
import type { ImageWithEstimatedUpload } from '~/lib/posting-time-estimator';
import { useFetcher } from 'react-router';

interface ImageListComponentProps {
  images: ImageWithEstimatedUpload[];
  onImagesReordered?: (storageKey: string, destinationOrder: number) => void;
  onImageUpdate?: (storageKey: string, update: Partial<{ postText: string, isNsfw: boolean }>) => void;
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

  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const sortedImages = [...images].sort((a, b) => a.queue_order - b.queue_order);

  useEffect(() => {
    const initialTexts: Record<string, string> = {};
    sortedImages.forEach(image => {
      if (!(image.storage_key in editedTexts)) {
        initialTexts[image.storage_key] = image.post_text || '';
      }
    });
    if (Object.keys(initialTexts).length > 0) {
      setEditedTexts(prev => ({ ...prev, ...initialTexts }));
    }
  }, [images]);

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

    setIsLoading(true);
    
    const draggedImage = sortedImages[draggedIndex];
    const droppedImage = sortedImages[droppedIndex];

    try {
      await fetcher.submit(
        {
          action: 'reorder',
          toOrder: droppedImage.queue_order,
        },
        { method: 'PUT', action: `/api/image/${draggedImage.storage_key}` }
      );
      onImagesReordered?.(draggedImage.storage_key, droppedImage.queue_order);
    } finally {
      setIsLoading(false);
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handlePostTextChange = (storageKey: string, newText: string) => {
    if (isLoading) return;
    setEditedTexts(prev => ({
      ...prev,
      [storageKey]: newText
    }));
  };

  const handleSavePostText = async (storageKey: string) => {
    if (isLoading) return;
    
    const newText = editedTexts[storageKey] || '';
    setIsLoading(true);
    
    try {
      // TODO: update the image text via fetcher

      onImageUpdate?.(storageKey, { postText: newText });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPostText = (storageKey: string, originalText: string) => {
    if (isLoading) return;
    setEditedTexts(prev => ({
      ...prev,
      [storageKey]: originalText || ''
    }));
  };

  const handleNsfwChange = async (storageKey: string, isNsfw: boolean) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // TODO: update the image NSFW via fetcher

      onImageUpdate?.(storageKey, { isNsfw });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (storageKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await fetcher.submit({}, { method: 'DELETE', action: `/api/image/${storageKey}` });
      onImageDelete?.(storageKey);
    } finally {
      setIsLoading(false);
    }
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

  const hasUnsavedChanges = (storageKey: string, originalText: string) => {
    const editedText = editedTexts[storageKey] || '';
    const original = originalText || '';
    return editedText !== original;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen relative">
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
              bg-white rounded-lg shadow-md p-4 border-2 transition-all duration-200
              ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
              ${dragOverIndex === index && draggedIndex !== index ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}
              ${isLoading ? 'pointer-events-none opacity-75' : 'hover:shadow-lg cursor-move'}
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
                    value={editedTexts[image.storage_key] || ''}
                    onChange={(e) => handlePostTextChange(image.storage_key, e.target.value)}
                    placeholder="Enter your post text..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50"
                    rows={2}
                    disabled={isLoading}
                  />
                  
                  {/* Save and Reset buttons */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleSavePostText(image.storage_key)}
                      disabled={isLoading || !hasUnsavedChanges(image.storage_key, image.post_text || '')}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                    
                    <button
                      onClick={() => handleResetPostText(image.storage_key, image.post_text || '')}
                      disabled={isLoading || !hasUnsavedChanges(image.storage_key, image.post_text || '')}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>
                  
                  {hasUnsavedChanges(image.storage_key, image.post_text || '') && !isLoading && (
                    <p className="text-xs text-amber-600 mt-1">You have unsaved changes</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={image.is_nsfw || false}
                      onChange={(e) => handleNsfwChange(image.storage_key, e.target.checked)}
                      className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                      disabled={isLoading}
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
                  disabled={isLoading}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete image"
                  type="button"
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                <div className={`p-2 ${isLoading ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}>
                  <GripVertical className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                </div>
              </div>
            </div>
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

export default ImageListComponent;
