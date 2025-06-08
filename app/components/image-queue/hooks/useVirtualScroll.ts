import { useState, useEffect, useMemo, useCallback } from 'react';


interface UseVirtualScrollOptions {
  itemHeight: number;
  bufferSize: number;
  loadMoreThreshold: number;
  containerHeight: number;
  scrollTop: number;
  totalItems: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

interface VirtualScrollResult {
  visibleStartIndex: number;
  visibleEndIndex: number;
  visibleItemCount: number;
  totalHeight: number;
  offsetY: number;
  shouldLoadMore: boolean;
}

export function useVirtualScroll({
  itemHeight,
  bufferSize,
  loadMoreThreshold,
  containerHeight,
  scrollTop,
  totalItems,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: UseVirtualScrollOptions): VirtualScrollResult {
  
  const result = useMemo(() => {
    if (!containerHeight || totalItems === 0) {
      return {
        visibleStartIndex: 0,
        visibleEndIndex: 0,
        visibleItemCount: 0,
        totalHeight: 0,
        offsetY: 0,
        shouldLoadMore: false,
      };
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * bufferSize;
    const endIndex = Math.min(totalItems, startIndex + visibleCount);
    const totalHeight = totalItems * itemHeight;
    const offsetY = startIndex * itemHeight;

    // Check if we should load more
    const scrollBottom = scrollTop + containerHeight;
    const shouldLoadMore = scrollBottom >= totalHeight - (loadMoreThreshold * itemHeight);

    return {
      visibleStartIndex: startIndex,
      visibleEndIndex: endIndex,
      visibleItemCount: endIndex - startIndex,
      totalHeight,
      offsetY,
      shouldLoadMore: shouldLoadMore && hasMore && !isLoadingMore,
    };
  }, [
    containerHeight,
    scrollTop,
    totalItems,
    itemHeight,
    bufferSize,
    loadMoreThreshold,
    hasMore,
    isLoadingMore,
  ]);

  // Trigger load more when conditions are met
  useEffect(() => {
    if (result.shouldLoadMore) {
      onLoadMore();
    }
  }, [result.shouldLoadMore, onLoadMore]);

  return result;
}

interface UseScrollContainerOptions {
  onScroll?: (scrollTop: number) => void;
  onResize?: (height: number) => void;
}

export function useScrollContainer({ onScroll, onResize }: UseScrollContainerOptions = {}) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    const newScrollTop = target.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  const handleResize = useCallback(() => {
    // This will be set up with a ref to the container
  }, [onResize]);

  const setupContainer = useCallback((container: HTMLElement | null) => {
    if (!container) return;

    const updateHeight = () => {
      const height = container.clientHeight;
      setContainerHeight(height);
      onResize?.(height);
    };

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', updateHeight);
    
    // Initial setup
    updateHeight();
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateHeight);
    };
  }, [handleScroll, onResize]);

  return {
    scrollTop,
    containerHeight,
    setupContainer,
  };
}
