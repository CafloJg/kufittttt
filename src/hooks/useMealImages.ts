import { useState, useEffect } from 'react';
import type { Meal } from '../types/user';
import { getMealImageByType, getFoodImage } from '../utils/imageUtils';

interface ImageCache {
  [key: string]: {
    imageUrl: string;
    thumbnailUrl: string;
  };
}

export function useMealImages(meal: Meal, isExpanded: boolean) {
  const [mealImage, setMealImage] = useState<string | null>(null);
  const [foodImages, setFoodImages] = useState<ImageCache>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load meal header image
  useEffect(() => {
    if (!meal || !meal.name) return;
    
    // Use existing image if available
    if (meal.thumbnailUrl && meal.imageUrl) {
      setMealImage(meal.thumbnailUrl);
      return; 
    }
    
    // Get image based on meal type
    const mealImages = getMealImageByType(meal.name);
    
    setMealImage(mealImages.thumbnailUrl);
  }, [meal.name]);

  // Load food images when expanded
  useEffect(() => {    
    if (!isExpanded) return;

    const loadFoodImages = async () => {
      setIsLoading(true); 
      try {
        const newImages: ImageCache = {};
        
        // Use existing images or fallbacks for all foods
        for (const food of meal.foods) {
          if (!food || !food.name) continue;
          
          // Use existing images or get from utility
          if (food.imageUrl && food.thumbnailUrl) {
            newImages[food.id] = {
              imageUrl: food.imageUrl,
              thumbnailUrl: food.thumbnailUrl
            };
          } else {
            newImages[food.id] = getFoodImage(food.name);
          }
        }

        setFoodImages(newImages);
      } catch (error) {
        console.error('Error loading food images:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFoodImages();
  }, [isExpanded, meal.foods]); 

  return {
    mealImage,
    foodImages,
    isLoading
  };
}