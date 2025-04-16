import { useEffect, useRef, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';

interface UseInfiniteScrollProps {
  onLoadMore: () => void;
  hasNextPage: boolean;
  isLoading: boolean;
  threshold?: number;
  rootMargin?: string;
}

export function useInfiniteScroll({
  onLoadMore,
  hasNextPage,
  isLoading,
  threshold = 0.5,
  rootMargin = '100px'
}: UseInfiniteScrollProps) {
  const loadMoreTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { ref, inView } = useInView({
    threshold,
    rootMargin,
  });

  const debouncedLoadMore = useCallback(() => {
    if (loadMoreTimeoutRef.current) {
      clearTimeout(loadMoreTimeoutRef.current);
    }
    
    loadMoreTimeoutRef.current = setTimeout(() => {
      onLoadMore();
    }, 100);
  }, [onLoadMore]);

  useEffect(() => {
    if (inView && hasNextPage && !isLoading) {
      debouncedLoadMore();
    }
    
    return () => {
      if (loadMoreTimeoutRef.current) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, [inView, hasNextPage, isLoading, debouncedLoadMore]);

  return { ref };
}