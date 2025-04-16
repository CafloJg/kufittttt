import { useQuery } from '@tanstack/react-query';
import type { ImageResult } from '../types/image';

export function useFoodImage(foodName: string, enabled = true) {
  // Return a static image instead of making API calls
  return {
    data: {
      imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2000',
      thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=400'
    },
    isLoading: false,
    isError: false,
    error: null
  };
}