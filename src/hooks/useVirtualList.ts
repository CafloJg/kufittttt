import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useEffect } from 'react';

interface UseVirtualListProps<T> {
  items: T[];
  estimateSize?: number;
  overscan?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function useVirtualList<T>({
  items,
  estimateSize = 50,
  overscan = 5,
  onEndReached,
  endReachedThreshold = 0.8
}: UseVirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const prevItemsLength = useRef(items.length);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  useEffect(() => {
    const currentLength = items.length;
    
    // Check if we've loaded more items
    if (currentLength > prevItemsLength.current) {
      virtualizer.measure();
    }
    
    prevItemsLength.current = currentLength;
  }, [items.length, virtualizer]);

  useEffect(() => {
    if (!onEndReached) return;

    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

      if (scrollPercentage > endReachedThreshold) {
        onEndReached();
      }
    };

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [onEndReached, endReachedThreshold]);

  return {
    parentRef,
    virtualizer,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
  };
}