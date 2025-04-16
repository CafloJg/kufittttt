import { getOpenAIKey } from "../../utils/apiKeys";
import { auth, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, addDoc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, foodImageRequestsCollection } from '../firebase';
import { getFoodImageByName, saveFoodImage } from '../firebase/food';
import type { ImageResult } from '../../types/image';

// Constants for retry and rate limiting
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;
const RATE_LIMIT_DELAY = 5000;
const MAX_CACHE_SIZE = 5000; // Increased cache size

// Cache configuration
const CACHE_TTL = 365 * 24 * 60 * 60 * 1000; // 365 days - increased cache duration
const imageCache = new Map<string, { result: ImageResult; timestamp: number }>();

// Default fallback images
const FALLBACK_IMAGES = {
  default: {
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400'
  },
  food: {
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=400'
  }
};

// Curated food images for common foods
const CURATED_FOOD_IMAGES: Record<string, ImageResult> = {
  'frango grelhado': {
    imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?q=80&w=400'
  },
  'arroz integral': {
    imageUrl: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?q=80&w=400'
  },
  'salmão': {
    imageUrl: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?q=80&w=400'
  },
  'ovos': {
    imageUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?q=80&w=400'
  },
  'batata doce': {
    imageUrl: 'https://images.unsplash.com/photo-1596097635121-14b38c5d7eca?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1596097635121-14b38c5d7eca?q=80&w=400'
  },
  'feijão': {
    imageUrl: 'https://images.unsplash.com/photo-1628889211163-95a840e0e3ad?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1628889211163-95a840e0e3ad?q=80&w=400'
  },
  'abacate': {
    imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?q=80&w=400'
  },
  'pão': {
    imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc7c?q=80&w=400'
  },
  'leite': {
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=400'
  },
  'queijo': {
    imageUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?q=80&w=400'
  },
  'omelete': {
    imageUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?q=80&w=400'
  }
};

export class FoodImageService {
  private static instance: FoodImageService;
  private rateLimitUntil: number = 0;
  private consecutiveFailures: number = 0;
  private readonly FAILURE_THRESHOLD = 3;

  private constructor() {}

  static getInstance(): FoodImageService {
    if (!this.instance) {
      this.instance = new FoodImageService();
    }
    return this.instance;
  }

  /**
   * Get a food image from cache or generate a new one
   */
  async getFoodImage(foodName: string, forceRefresh = false): Promise<ImageResult> {
    try {
      const normalizedName = foodName.toLowerCase().trim();
      
      // Return fallback for invalid queries
      if (!normalizedName) {
        return FALLBACK_IMAGES.food;
      }

      // Check curated images first (fastest option)
      for (const [key, image] of Object.entries(CURATED_FOOD_IMAGES)) {
        if (normalizedName.includes(key)) {
          console.log(`Using curated image for "${key}"`);
          return image;
        }
      }

      // Check database cache first
      if (!forceRefresh) {
        const dbCached = await this.getImageFromDatabase(normalizedName);
        if (dbCached) {
          return dbCached;
        }
      }

      // Check memory cache
      if (!forceRefresh) {
        const cached = imageCache.get(normalizedName);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          return cached.result;
        }
      }

      // Check rate limit
      if (Date.now() < this.rateLimitUntil) {
        const waitTime = Math.ceil((this.rateLimitUntil - Date.now()) / 1000);
        console.warn(`Rate limit in effect. Waiting ${waitTime} seconds.`);
        
        // Return fallback during rate limit
        return FALLBACK_IMAGES.food;
      }

      // Generate new image
      console.log(`Generating new image for food: ${normalizedName}`);
      const result = await this.generateAndSaveImage(normalizedName);
      
      // Update memory cache
      imageCache.set(normalizedName, {
        result,
        timestamp: Date.now()
      });

      // Cleanup cache if too large
      if (imageCache.size > MAX_CACHE_SIZE) {
        const oldestKey = Array.from(imageCache.entries())
          .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
        imageCache.delete(oldestKey);
      }

      return result;
    } catch (error) {
      console.error('Error getting food image:', error);
      this.consecutiveFailures++;
      
      // If too many failures, use fallback
      if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
        console.warn('Too many consecutive failures, using fallback image');
        return FALLBACK_IMAGES.food;
      }
      
      return FALLBACK_IMAGES.food;
    }
  }

  /**
   * Get image from database cache
   */
  private async getImageFromDatabase(foodName: string): Promise<ImageResult | null> {
    try {
      // Try exact match first
      const exactMatch = await getFoodImageByName(foodName);
      if (exactMatch) return exactMatch;
      
      // Try to find partial matches
      const foodImagesCollection = collection(db, 'food_images');
      const normalizedName = foodName.toLowerCase().trim();
      
      // Try to find words from the food name
      const words = normalizedName.split(/\s+/).filter(word => word.length > 3);
      
      for (const word of words) {
        const q = query(
          foodImagesCollection,
          where('food_name', '>=', word),
          where('food_name', '<=', word + '\uf8ff')
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          return { imageUrl: data.image_url, thumbnailUrl: data.thumbnail_url };
        }
      }
      return null;
    } catch (error) {
      console.warn('Error getting image from database:', error);
      return null;
    }
  }

  /**
   * Generate image with OpenAI and save to database
   */
  private async generateAndSaveImage(foodName: string): Promise<ImageResult> {
    try {
      // Check if we already have a similar food image
      const similarImage = await this.findSimilarFoodImage(foodName);
      if (similarImage) {
        return similarImage;
      }
      
      // Create a request in the database
      const requestRef = await addDoc(foodImageRequestsCollection, {
        food_name: foodName,
        status: 'pending',
        prompt: `Professional food photography of ${foodName}. High quality, restaurant plated, gourmet style, on white background. Photorealistic.`,
        user_id: auth.currentUser?.uid || 'system',
        created_at: new Date().toISOString()
      });
      
      // Log the request
      console.log(`Creating image request for: ${foodName}`);
      
      // Generate image with OpenAI
      const imageData = await this.generateImageWithOpenAI(foodName);
      
      // Upload to Firebase Storage
      const result = await this.uploadToFirebase(imageData, foodName);
      
      await saveFoodImage(
        foodName,
        result.imageUrl,
        result.thumbnailUrl,
        this.getCategoryForFood(foodName)
      );
      
      // Update request status if it exists
      if (requestRef) {
        await updateDoc(requestRef, {
          status: 'completed',
          completed_at: new Date().toISOString()
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error generating and saving image:', error);
      throw error;
    }
  }

  /**
   * Find similar food image in database
   */
  private async findSimilarFoodImage(foodName: string): Promise<ImageResult | null> {
    try {
      const normalizedName = foodName.toLowerCase().trim();
      const words = normalizedName.split(/\s+/);
      
      // Try to find similar foods
      for (const word of words) {
        if (word.length < 4) continue; // Skip short words
        
        const q = query(
          collection(db, 'food_images'),
          where('food_name', '>=', word),
          where('food_name', '<=', word + '\uf8ff')
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return { imageUrl: snapshot.docs[0].data().image_url, thumbnailUrl: snapshot.docs[0].data().thumbnail_url };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate image with OpenAI
   */
  private async generateImageWithOpenAI(foodName: string): Promise<string> {
    try {
      // Check rate limit
      if (Date.now() < this.rateLimitUntil) {
        const waitTime = Math.ceil((this.rateLimitUntil - Date.now()) / 1000);
        throw new Error(`Rate limit in effect. Please wait ${waitTime} seconds.`);
      }

      const apiKey = await getOpenAIKey();
      if (!apiKey) {
        throw new Error('API key not available');
      }

      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: "dall-e-3",
              prompt: `Food photo of ${foodName}`, // Simplified prompt to reduce token usage
              n: 1,
              size: "1024x1024",
              quality: "standard", // Changed from HD to standard to reduce cost
              response_format: "b64_json"
            })
          });

          if (!response.ok) {
            if (response.status === 429) {
              // Handle rate limit
              const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
              this.rateLimitUntil = Date.now() + (retryAfter * 1000);
              throw new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
            }
            throw new Error(`OpenAI API error: ${response.status}`);
          }

          const data = await response.json();
          return data.data[0].b64_json;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          
          if (error instanceof Error && error.message.includes('Rate limit')) {
            throw error; // Don't retry rate limit errors
          }
          
          if (attempt < MAX_RETRIES - 1) {
            await new Promise(resolve => setTimeout(resolve, BASE_DELAY * Math.pow(2, attempt)));
            continue;
          }
        }
      }
      
      throw lastError;

    } catch (error) {
      console.error('Error generating image:', error);
      throw error;
    }
  }

  /**
   * Upload image to Firebase Storage
   */
  private async uploadToFirebase(imageData: string, foodName: string): Promise<ImageResult> {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to upload images');
      }

      // Convert base64 to blob
      const byteString = atob(imageData);
      const byteArray = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        byteArray[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // Upload original image
      const category = this.getCategoryForFood(foodName);
      const imagePath = `food-images/${category}/${foodName.toLowerCase().replace(/\s+/g, '-')}.jpg`;
      const imageRef = ref(storage, imagePath);
      await uploadBytes(imageRef, blob);
      const imageUrl = await getDownloadURL(imageRef);

      // Create and upload thumbnail
      const thumbnailPath = `food-images/thumbnails/${foodName.toLowerCase().replace(/\s+/g, '-')}-thumb.jpg`;
      const thumbnailRef = ref(storage, thumbnailPath);
      await uploadBytes(thumbnailRef, blob);
      const thumbnailUrl = await getDownloadURL(thumbnailRef);

      return { imageUrl, thumbnailUrl };

    } catch (error) {
      console.error('Error uploading to Firebase:', error);
      throw error;
    }
  }

  /**
   * Determine food category
   */
  private getCategoryForFood(foodName: string): string {
    const lowerName = foodName.toLowerCase();
    
    if (lowerName.includes('frango') || lowerName.includes('carne') || 
        lowerName.includes('peixe') || lowerName.includes('ovo')) {
      return 'proteins';
    }
    
    if (lowerName.includes('arroz') || lowerName.includes('pão') || 
        lowerName.includes('aveia') || lowerName.includes('batata')) {
      return 'grains';
    }
    
    if (lowerName.includes('alface') || lowerName.includes('brócolis') || 
        lowerName.includes('espinafre') || lowerName.includes('tomate')) {
      return 'vegetables';
    }
    
    if (lowerName.includes('maçã') || lowerName.includes('banana') || 
        lowerName.includes('laranja') || lowerName.includes('morango')) {
      return 'fruits';
    }
    
    if (lowerName.includes('azeite') || lowerName.includes('óleo') || 
        lowerName.includes('manteiga') || lowerName.includes('castanha')) {
      return 'fats';
    }
    
    return 'other';
  }

  /**
   * Request image generation for multiple foods
   */
  async batchGenerateImages(foodNames: string[]): Promise<void> {
    try {
      // Create batch requests
      const batch = foodNames.map(async (foodName) => {
        try {
          await this.getFoodImage(foodName);
        } catch (error) {
          console.warn(`Failed to generate image for ${foodName}:`, error);
        }
      });
      
      // Process in batches of 3 with delay between batches
      for (let i = 0; i < batch.length; i += 3) {
        const batchSlice = batch.slice(i, i + 3);
        await Promise.all(batchSlice);
        
        // Add delay between batches
        if (i + 3 < batch.length) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    } catch (error) {
      console.error('Error in batch generation:', error);
      throw error;
    }
  }
}

export const foodImageService = FoodImageService.getInstance();