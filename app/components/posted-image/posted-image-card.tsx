import React from 'react';
import { Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import type { PostedImage } from '~/model/model';

interface PostedImageCardProps {
  image: PostedImage;
}

const PostedImageCard: React.FC<PostedImageCardProps> = ({ image }) => {
  const formatPostedTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If it's today, show time
    if (date.toDateString() === now.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // Otherwise show full date and time
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric', 
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <img
            src={`/api/image/${image.storageKey}`}
            alt={image.storageKey || 'Posted image'}
            className="w-20 h-20 object-cover rounded-lg border border-gray-300"
          />
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Post Text
            </label>
            <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 min-h-[2.5rem] text-sm text-gray-700">
              {image.postText || (
                <span className="text-gray-400 italic">No post text</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-1" />
              <span title={new Date(image.createdAt).toLocaleString()}>
                Posted {formatPostedTime(image.createdAt)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {image.isNsfw ? (
                <div className="flex items-center text-sm text-amber-600">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  <span>NSFW</span>
                </div>
              ) : (
                <div className="flex items-center text-sm text-gray-500">
                  <span>Safe</span>
                </div>
              )}
              
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span>Posted</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostedImageCard;
