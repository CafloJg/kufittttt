import { FoodRepository } from '../repositories/foodRepository';
import { ImageService } from './imageService';
import { z } from 'zod';
import type { Food, FoodCategory } from '../../types/food';

// Validation schema for food search params
const searchParamsSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  dietType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  minProtein: z.number().optional(),
  maxCalories: z.number().optional()
});

export class FoodService {
  private static instance: FoodService;
  private readonly foodRepo: FoodRepository;
  private readonly imageService: ImageService;

  private constructor() {
    this.foodRepo = FoodRepository.getInstance();
    this.imageService = ImageService.getInstance();
  }

  static getInstance(): FoodService {
    if (!this.instance) {
      this.instance = new FoodService();
    }
    return this.instance;
  }

  async searchFoods(params: z.infer<typeof searchParamsSchema>): Promise<Food[]> {
    try {
      const validatedParams = searchParamsSchema.parse(params);
      
      let results: Food[] = [];
      
      if (validatedParams.query) {
        results = await this.foodRepo.searchFoods(validatedParams.query);
      } else if (validatedParams.category) {
        results = await this.foodRepo.getFoodsByCategory(validatedParams.category as FoodCategory);
      } else if (validatedParams.dietType) {
        results = await this.foodRepo.getFoodsByDiet(validatedParams.dietType);
      } else if (validatedParams.tags?.length) {
        results = await this.foodRepo.getFoodsByTags(validatedParams.tags);
      }

      // Apply filters
      return results.filter(food => {
        if (validatedParams.minProtein && food.protein < validatedParams.minProtein) {
          return false;
        }
        if (validatedParams.maxCalories && food.calories > validatedParams.maxCalories) {
          return false;
        }
        return true;
      });
    } catch (error) {
      console.error('Error searching foods:', error);
      throw error;
    }
  }

  async getFoodWithImage(id: string): Promise<Food & { imageUrl: string; thumbnailUrl: string }> {
    try {
      const food = await this.foodRepo.getFoodById(id);
      if (!food) {
        throw new Error('Food not found');
      }

      const image = await this.imageService.getImage(food.name);
      
      return {
        ...food,
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl
      };
    } catch (error) {
      console.error('Error getting food with image:', error);
      throw error;
    }
  }

  async addFood(food: Omit<Food, 'id'>): Promise<string> {
    try {
      return await this.foodRepo.addFood(food);
    } catch (error) {
      console.error('Error adding food:', error);
      throw error;
    }
  }

  async updateFood(id: string, food: Partial<Food>): Promise<void> {
    try {
      await this.foodRepo.updateFood(id, food);
    } catch (error) {
      console.error('Error updating food:', error);
      throw error;
    }
  }
}