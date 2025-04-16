import { FALLBACK_IMAGES, CURATED_FOOD_IMAGES, getFoodImage } from './imageUtils';
import type { ImageResult } from '../types/image';

// Export a simple getImage function that returns a static image
export function getImage(query: string): Promise<ImageResult> {
  // Return a static image based on the query
  const normalizedQuery = query.toLowerCase().trim();
  
  // Check if this is a food-related query
  if (normalizedQuery.includes('food') || normalizedQuery.includes('meal') || 
      normalizedQuery.includes('dish') || normalizedQuery.includes('plate')) {
    return Promise.resolve(FALLBACK_IMAGES.food);
  }
  
  // Default image for other queries
  return Promise.resolve(FALLBACK_IMAGES.default);
}
