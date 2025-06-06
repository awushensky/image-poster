import React from 'react';
import { Calendar, AlertTriangle, Trash2, Edit3 } from 'lucide-react';
import type { ImageWithEstimatedUpload } from '~/lib/posting-time-estimator';
import { formatRelativeTime } from '~/lib/time-utils';

interface ImageCardProps {
  image: ImageWithEstimatedUpload;
  onDelete: (storageKey: string, e: React.MouseEvent) => void;
  onEdit: (storageKey: string) => void;
}

const ImageCard: React.FC<ImageCardProps> = ({
  image,
  onDelete,
  onEdit
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <img
            src={`/api/image/${image.storageKey}`}
            alt={image.storageKey || 'Uploaded image'}
            className="w-20 h-20 object-cover rounded-lg border border-gray-300"
          />
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Post Text
            </label>
            <div className="relative">
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 min-h-[2.5rem] text-sm text-gray-700">
                {image.postText || (
                  <span className="text-gray-400 italic">No post text set</span>
                )}
              </div>
              <button
                onClick={() => onEdit(image.storageKey)}
                className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Edit post text"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-1" />
              <span title={image.estimatedPostTime ? image.estimatedPostTime.toLocaleString() : ''}>
                {formatRelativeTime(image.estimatedPostTime)}
              </span>
            </div>

            {!image.isNsfw && (
              <div className="flex items-center text-sm text-amber-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                <span>Not flagged NSFW</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0">
          <button
            onClick={(e) => onDelete(image.storageKey, e)}
            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete image"
            type="button"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCard;
