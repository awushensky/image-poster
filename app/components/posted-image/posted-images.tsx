import React from 'react';
import type { PostedImage } from '~/model/model';
import PostedImageCard from './posted-image-card';

interface PostedImagesProps {
  images: PostedImage[];
}

const PostedImages: React.FC<PostedImagesProps> = ({ images = [] }) => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="space-y-4">
        {images.map((image) => (
          <PostedImageCard
            key={image.storageKey}
            image={image}
          />
        ))}

        {images.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-lg font-medium mb-2">No images posted yet</div>
            <div className="text-sm">Images will appear here once they've been posted to Bluesky</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostedImages;
