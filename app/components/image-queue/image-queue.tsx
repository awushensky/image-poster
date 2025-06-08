import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GripVertical, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router';
import type { ImageWithEstimatedUpload } from '~/lib/posting-time-estimator';
import { estimateImageSchedule } from '~/lib/posting-time-estimator';
import { deleteImage, reorderImages, updateImage } from '~/lib/dashboard-utils';
import ImageCard from './image-card';
import Modal from '../modal';
import EditPostModalContent from './edit-post-modal-content';
import { deleteQueuedImage, fetchQueuedImages, updateQueuedImage } from "~/api-interface/image-queue";
import { fetchThumbnails } from "~/api-interface/thumbnail";
import { type ThumbnailData } from "~/api-interface/thumbnail";
import { useVirtualScroll, useScrollContainer } from './hooks/useVirtualScroll';
import type { PostingSchedule } from '~/model/posting-schedule';
import type { ProposedQueuedImage } from '~/model/queued-images';

interface ImageQueueProps {
  schedules: PostingSchedule[];
  userTimezone: string;
  onChanged: (imageCount: number) => void;
  onError: (error: string) => void;
}

// Virtual scrolling configuration
const ITEM_HEIGHT = 140;
const BUFFER_SIZE = 5;
const LOAD_MORE_THRESHOLD = 10;

interface VirtualItem {
  index: number;
  image: ImageWithEstimatedUpload;
  thumbnail?: ThumbnailData;
}

const ImageQueue = ({
  schedules,
  userTimezone,
  onChanged,
  onError,
}: ImageQueueProps) => {
  const [allImages, setAllImages] = useState<ImageWithEstimatedUpload[]>([]);
  const [allThumbnails, setAllThumbnails] = useState<ThumbnailData[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<number | undefined>(undefined);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingImageKey, setEditingImageKey] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // URL state management
  const [searchParams, setSearchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);

  // Set up scroll container hook
  const { scrollTop, containerHeight, setupContainer } = useScrollContainer();

  // Set up container ref effect
  useEffect(() => {
    return setupContainer(containerRef.current);
  }, [setupContainer]);

  // Load more callback for virtual scroll hook
  const handleLoadMore = useCallback(() => {
    loadMoreImages();
  }, []);

  // Use virtual scroll hook
  const {
    visibleStartIndex,
    visibleEndIndex,
    totalHeight,
    offsetY,
  } = useVirtualScroll({
    itemHeight: ITEM_HEIGHT,
    bufferSize: BUFFER_SIZE,
    loadMoreThreshold: LOAD_MORE_THRESHOLD,
    containerHeight,
    scrollTop,
    totalItems: allImages.length,
    hasMore,
    isLoadingMore: loadingMore,
    onLoadMore: handleLoadMore,
  });

  // Calculate visible items
  const visibleItems: VirtualItem[] = [];
  for (let i = visibleStartIndex; i < visibleEndIndex; i++) {
    const image = allImages[i];
    if (image) {
      const thumbnail = allThumbnails.find(t => t.storageKey === image.storageKey);
      visibleItems.push({
        index: i,
        image,
        thumbnail,
      });
    }
  }

  const editingImage = editingImageKey ? allImages.find(img => img.storageKey === editingImageKey) : null;

  // Load images on mount and when dependencies change
  useEffect(() => {
    // Only load if we haven't completed an initial load yet, or if dependencies actually changed
    if (!initialLoadComplete) {
      loadInitialImages();
    }
  }, []);

  // Separate effect for dependency changes after initial load
  useEffect(() => {
    if (initialLoadComplete) {
      loadInitialImages();
    }
  }, [schedules, userTimezone]);

  // Update URL when we scroll through content
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    const params = new URLSearchParams(searchParams);
    if (visibleEndIndex > 0 && allImages[visibleEndIndex - 1]) {
      params.set('cursor', allImages[visibleEndIndex - 1].queueOrder.toString());
    } else {
      params.delete('cursor');
    }
    setSearchParams(params, { replace: true });
  }, [visibleEndIndex, allImages, setSearchParams]);

  async function loadInitialImages() {
    // Prevent multiple simultaneous loads
    if (loading) return;
    
    try {
      setLoading(true);
      setAllImages([]);
      setAllThumbnails([]);
      setNextCursor(undefined);
      
      // Check if we should start from a specific cursor from URL
      const urlCursor = searchParams.get('cursor');
      const startCursor = urlCursor ? parseInt(urlCursor) : undefined;
      
      const result = await fetchQueuedImages(50, startCursor);
      const estimatedImages = estimateImageSchedule(result.images, schedules, userTimezone);
      const fetchedThumbnails = await fetchThumbnails(result.images.map(image => image.storageKey));

      setAllImages(estimatedImages);
      setAllThumbnails(fetchedThumbnails);
      setHasMore(result.hasMore || false);
      setNextCursor(result.nextCursor);
      setTotalCount(estimatedImages.length);
      onChanged(estimatedImages.length);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load queued images';
      onError(errorMessage);
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }

  const loadMoreImages = useCallback(async () => {
    if (!hasMore || loadingMore || nextCursor === undefined) return;

    try {
      setLoadingMore(true);
      const result = await fetchQueuedImages(50, nextCursor);
      const newEstimatedImages = estimateImageSchedule(result.images, schedules, userTimezone);
      const newThumbnails = await fetchThumbnails(result.images.map(image => image.storageKey));

      setAllImages(prev => {
        const combined = [...prev, ...newEstimatedImages];
        setTotalCount(combined.length);
        onChanged(combined.length);
        return combined;
      });
      setAllThumbnails(prev => [...prev, ...newThumbnails]);
      setHasMore(result.hasMore || false);
      setNextCursor(result.nextCursor);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load more images';
      onError(errorMessage);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextCursor, schedules, userTimezone, onChanged, onError]);

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, virtualIndex: number) {
    setDraggedIndex(virtualIndex);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, virtualIndex: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(virtualIndex);
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>, droppedVirtualIndex: number) {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === droppedVirtualIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Convert virtual indices to actual indices
    const draggedActualIndex = visibleStartIndex + draggedIndex;
    const droppedActualIndex = visibleStartIndex + droppedVirtualIndex;

    if (draggedActualIndex < 0 || draggedActualIndex >= allImages.length || 
        droppedActualIndex < 0 || droppedActualIndex >= allImages.length) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const draggedImage = allImages[draggedActualIndex];
    const droppedImage = allImages[droppedActualIndex];

    try {
      // Update local state immediately for responsive UI
      const reorderedImages = reorderImages(allImages, draggedImage.storageKey, droppedImage.queueOrder);
      setAllImages(estimateImageSchedule(reorderedImages, schedules, userTimezone));

      // Make API call. Do not await so we have a more responsive UI
      updateQueuedImage(
        draggedImage.storageKey,
        { queueOrder: droppedImage.queueOrder },
      );

      onChanged(allImages.length);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Reorder failure';
      onError(errorMessage);
    } finally {
      setDraggedIndex(null);
      setDragOverIndex(null);
    }
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleEditOpen(storageKey: string) {
    setEditingImageKey(storageKey);
  }

  function handleEditClose() {
    setEditingImageKey(null);
  }

  async function handleEditSave(update: Partial<ProposedQueuedImage>) {
    if (!editingImageKey) return;

    try {
      // Update local state immediately for responsive UI
      const updatedImages = updateImage(allImages, editingImageKey, update);
      setAllImages(estimateImageSchedule(updatedImages, schedules, userTimezone));

      // Make API call. Do not await so we have a more responsive UI
      updateQueuedImage(editingImageKey, update);

      setEditingImageKey(null);
      onChanged(allImages.length);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Update failure';
      onError(errorMessage);
    }
  }

  async function handleDelete(storageKey: string, e: React.MouseEvent) {
    e.stopPropagation();

    try {
      // Update local state immediately for responsive UI
      const updatedImages = deleteImage(allImages, storageKey);
      const updatedThumbnails = allThumbnails.filter(t => t.storageKey !== storageKey);
      
      setAllImages(estimateImageSchedule(updatedImages, schedules, userTimezone));
      setAllThumbnails(updatedThumbnails);
      setTotalCount(prev => prev - 1);

      // Make API call. Do not await so we have a more responsive UI
      deleteQueuedImage(storageKey);

      onChanged(updatedImages.length);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failure';
      onError(errorMessage);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen relative">
      {editingImageKey && editingImage && (
        <Modal
          onClose={handleEditClose}
          title="Edit Post Text"
        >
          <EditPostModalContent
            initialText={editingImage.postText || ''}
            initialIsNsfw={editingImage.isNsfw || false}
            onSave={handleEditSave}
            onCancel={handleEditClose}
          />
        </Modal>
      )}

      {!initialLoadComplete ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-lg font-medium mb-2">Loading images...</div>
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="relative overflow-auto"
          style={{ height: 'calc(100vh - 12rem)' }}
        >
          {/* Virtual container with total height */}
          <div style={{ height: totalHeight, position: 'relative' }}>
            {/* Visible items container */}
            <div 
              style={{ 
                transform: `translateY(${offsetY}px)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
              }}
            >
              <div className="space-y-4">
                {visibleItems.map((virtualItem, virtualIndex) => {
                  if (!virtualItem.thumbnail) return null;
                  
                  return (
                    <div
                      key={virtualItem.image.storageKey}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, virtualIndex)}
                      onDragOver={(e) => handleDragOver(e, virtualIndex)}
                      onDrop={(e) => handleDrop(e, virtualIndex)}
                      onDragEnd={handleDragEnd}
                      className={`
                        relative transition-all duration-200
                        ${draggedIndex === virtualIndex ? 'opacity-50 scale-95' : ''}
                        ${dragOverIndex === virtualIndex && draggedIndex !== virtualIndex ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
                        cursor-move
                      `}
                      style={{ minHeight: ITEM_HEIGHT }}
                    >
                      {/* Drag handle overlay */}
                      <div className="absolute top-2 right-2 z-10 p-2 bg-white bg-opacity-80 rounded-md shadow-sm">
                        <GripVertical className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing" />
                      </div>

                      <ImageCard
                        image={virtualItem.image}
                        thumbnailBlob={`data:${virtualItem.thumbnail.contentType};base64,${virtualItem.thumbnail.data}`}
                        onDelete={handleDelete}
                        onEdit={handleEditOpen}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="text-center py-8 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <div className="text-sm">Loading more images...</div>
            </div>
          )}

          {/* Empty state */}
          {allImages.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-lg font-medium mb-2">No images uploaded yet</div>
              <div className="text-sm">Upload some images to get started!</div>
            </div>
          )}

          {/* End of list indicator */}
          {!hasMore && allImages.length > 0 && !loadingMore && (
            <div className="text-center py-8 text-gray-400 text-sm border-t border-gray-200 mt-8">
              You've reached the end of your queue ({totalCount} images total)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageQueue;
