import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { ImageResult } from '../types/image';
import { getMealImageByType, getFoodImage, FALLBACK_IMAGES } from '../utils/imageUtils';

interface ImageContextType {
  getFoodImage: (foodName: string) => Promise<ImageResult>;
  getMealImage: (mealName: string) => Promise<ImageResult>;
  imageCache: Record<string, ImageResult>;
  isLoading: boolean;
  error: string | null;
}

const ImageContext = createContext<ImageContextType | undefined>(undefined);

export function ImageProvider({ children }: { children: ReactNode }) {
  const [imageCache, setImageCache] = useState<Record<string, ImageResult>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get meal image based on meal type
  const getMealImage = async (mealName: string): Promise<ImageResult> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check cache first
      const cacheKey = `meal_${mealName.toLowerCase()}`;
      if (imageCache[cacheKey]) {
        return imageCache[cacheKey];
      }

      // Get image based on meal type
      const result = getMealImageByType(mealName);
      
      // Update cache
      setImageCache(prev => ({
        ...prev,
        [cacheKey]: result
      }));
      
      return result;
    } catch (err) {
      console.error('Error getting meal image:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar imagem');
      
      // Return fallback image
      return FALLBACK_IMAGES.default;
    } finally {
      setIsLoading(false);
    }
  };

  // Get food image with caching
  const getFoodImage = async (foodName: string): Promise<ImageResult> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check cache first
      const cacheKey = `food_${foodName.toLowerCase()}`;
      if (imageCache[cacheKey]) {
        return imageCache[cacheKey]; 
      }
      
      // Get food image from utility
      const image = getFoodImage(foodName);
      
      // Update cache
      setImageCache(prev => ({
        ...prev,
        [cacheKey]: image
      }));
      
      return image;
    } catch (err) {
      console.error('Error getting food image:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar imagem');
      
      // Return fallback image
      return FALLBACK_IMAGES.food;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ImageContext.Provider value={{
      getFoodImage,
      getMealImage,
      imageCache,
      isLoading,
      error
    }}>
      {children}
    </ImageContext.Provider>
  );
}

export function useImages() {
  const context = useContext(ImageContext);
  if (context === undefined) {
    throw new Error('useImages must be used within an ImageProvider');
  }
  return context;
}