import React, { useState } from 'react';
import { Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import type { PostedImage } from "~/model/posted-images";
import { formatRelativeTime } from '~/lib/time-utils';
import Modal from '../modal';

interface PostedImageCardProps {
  image: PostedImage;
  thumbnailBlob: string;
}

const PostedImageCard: React.FC<PostedImageCardProps> = ({ image, thumbnailBlob }) => {
  const [showPreview, setShowPreview] = useState(false);

  function handleImageClick() {
    setShowPreview(true);
  }

  function handleClosePreview() {
    setShowPreview(false);
  }
  
  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <img
              src={thumbnailBlob}
              alt={image.storageKey || 'Posted image'}
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
              <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 min-h-[2.5rem] text-sm text-gray-700 dark:text-gray-300">
                {image.postText || (
                  <span className="text-gray-400 dark:text-gray-500 italic">No post text</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 mr-1" />
                <span title={image.createdAt.toLocaleString()}>
                  Posted {formatRelativeTime(image.createdAt)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {image.isNsfw ? (
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <span>NSFW</span>
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    <span>Not Marked NSFW</span>
                  </div>
                )}
                
                <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span>Posted</span>
                </div>
              </div>
            </div>
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
            <img
              src={`/api/image/${image.storageKey}`}
              alt={image.storageKey || 'Full size image'}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              onError={(e) => {
                e.currentTarget.src = thumbnailBlob;
              }}
            />
            {image.postText && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg w-full">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {image.postText}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default PostedImageCard;
