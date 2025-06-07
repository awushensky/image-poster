import React, { useState, useEffect } from 'react';
import { type PostedImage } from '~/model/model';
import { parsePostedImage } from "~/api-interface/posted-images";
import PostedImageCard from './posted-image-card';

interface PostedImagesProps {
  isVisible: boolean;
  onChanged: (imageCount: number) => void;
  onError: (error: string) => void;
}

const PostedImages: React.FC<PostedImagesProps> = ({ isVisible, onChanged, onError }) => {
  const [images, setImages] = useState<PostedImage[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch posted images when component becomes visible
  useEffect(() => {
    if (isVisible && images === undefined) {
      fetchPostedImages();
    }
  }, [isVisible, images]);

  const fetchPostedImages = async () => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/posted-images');
      if (!response.ok) {
        throw new Error('Failed to fetch posted images');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load posted images');
      }

      const images = (result.images || []).map(parsePostedImage);
      setImages(images);
      onChanged(images.length)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load posted images';
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  if (isLoading || images === undefined) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading posted images...</span>
        </div>
      </div>
    );
  }

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
