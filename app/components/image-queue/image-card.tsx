import React, { useState } from 'react';
import { Calendar, Trash2 } from 'lucide-react';
import type { ImageWithEstimatedUpload } from '~/lib/posting-time-estimator';
import { formatRelativeTime } from '~/lib/time-utils';
import Modal from '../modal';
import type { ProposedQueuedImage } from '~/model/queued-images';

interface ImageCardProps {
  image: ImageWithEstimatedUpload;
  thumbnailBlob: string;
  onDelete: (storageKey: string, e: React.MouseEvent) => void;
  onSave: (storageKey: string, update: Partial<ProposedQueuedImage>) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  thumbnailBlob,
  onDelete,
  onSave,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [postText, setPostText] = useState(image.postText || '');
  const [isNsfw, setIsNsfw] = useState(image.isNsfw || false);

  function handleImageClick() {
    setShowPreview(true);
  }

  function handleClosePreview() {
    setShowPreview(false);
  }

  function handleTextBlur() {
    if (postText !== (image.postText || '')) {
      onSave(image.storageKey, { postText, isNsfw });
    }
  }

  function handleNsfwChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newIsNsfw = e.target.checked;
    setIsNsfw(newIsNsfw);
    onSave(image.storageKey, { postText, isNsfw: newIsNsfw });
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <img
              src={thumbnailBlob}
              alt={image.storageKey || 'Queued image'}
              onClick={handleImageClick}
              className="w-20 h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
              loading="lazy"
            />
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Post Text
              </label>
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                onBlur={handleTextBlur}
                placeholder="No post text set"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 italic focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 mr-1" />
                <span title={image.estimatedPostTime ? image.estimatedPostTime.toLocaleString() : ''}>
                  {formatRelativeTime(image.estimatedPostTime)}
                </span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isNsfw}
                  onChange={handleNsfwChange}
                  className="w-4 h-4 text-red-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500 dark:focus:ring-red-400"
                />
                NSFW
              </label>
            </div>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={(e) => onDelete(image.storageKey, e)}
              className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete image"
              type="button"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {showPreview && (
        <Modal
          onClose={handleClosePreview}
          title="Image Preview"
          size="xl"
        >
          <div className="flex flex-col items-center">
            <div className="relative inline-block rounded-lg overflow-hidden checkerboard-bg">
              <img
                src={`/api/image/${image.storageKey}`}
                alt={image.storageKey || 'Full size image'}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                  e.currentTarget.src = thumbnailBlob;
                }}
              />
            </div>
            {postText && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg w-full">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {postText}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default ImageCard;
