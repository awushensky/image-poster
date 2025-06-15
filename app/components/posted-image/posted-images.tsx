import React, { useState, useEffect } from 'react';
import { type PostedImage } from "~/model/posted-images";
import { fetchPostedImages } from "~/api-interface/posted-images";
import PostedImageCard from './posted-image-card';
import { fetchThumbnails, type ThumbnailData } from '~/api-interface/thumbnail';
import { fetchImageCounts } from '~/api-interface/image-counts';

const PAGE_SIZE = 50;

interface PostedImagesProps {
  isVisible: boolean;
  initialPostedImageCount: number;
  onChanged: (imageCount: number) => void;
  onError: (error: string) => void;
}

const PostedImages: React.FC<PostedImagesProps> = ({ isVisible, onChanged, onError }) => {
  const [images, setImages] = useState<PostedImage[] | undefined>(undefined);
  const [thumbnails, setThumbnails] = useState<ThumbnailData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (isVisible && images === undefined) {
      loadPostedImages();
    }
  }, [isVisible, images, page]);

  const loadPostedImages = async () => {
    setIsLoading(true);

    try {
      const images = await fetchPostedImages(page, PAGE_SIZE);
      const imageCounts = await fetchImageCounts();
      const thumbnails = await fetchThumbnails(images.map(image => image.storageKey));

      setImages(images);
      setTotalCount(imageCounts.posted);
      setThumbnails(thumbnails);
      onChanged(imageCounts.posted);
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
      <div className="max-w-4xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading posted images...</span>
        </div>
      </div>
    );
  }

  const postedItems = [...images].map((image, index) => ({image: image, thumbnail: thumbnails[index]}));

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="space-y-4">
        {postedItems.map((postedItem) => (
          <PostedImageCard
            key={postedItem.image.storageKey}
            image={postedItem.image}
            thumbnailBlob={`data:${postedItem.thumbnail.contentType};base64,${postedItem.thumbnail.data}`}
          />
        ))}

        {postedItems.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <div className="text-lg font-medium mb-2">No images posted yet</div>
            <div className="text-sm">Images will appear here once they've been posted to Bluesky</div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-6">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {page} of {Math.ceil(totalCount / PAGE_SIZE)}
        </span>
        <button
          disabled={page * PAGE_SIZE >= totalCount}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PostedImages;
