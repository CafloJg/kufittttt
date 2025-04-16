import { doc, getDoc, setDoc, collection, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { z } from 'zod';
import type { ImageResult } from '../../types/image';

// Validation schema
const imageSchema = z.object({
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url(),
  category: z.string().optional(),
  foodName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export class ImageRepository {
  private static instance: ImageRepository;
  private readonly collectionRef = collection(db, 'food_images');
  private readonly cacheCollectionRef = collection(db, 'imageCache');

  private constructor() {}

  static getInstance(): ImageRepository {
    if (!this.instance) {
      this.instance = new ImageRepository();
    }
    return this.instance;
  }

  async getImageByFoodName(foodName: string): Promise<ImageResult | null> {
    try {
      const q = query(this.collectionRef, where('foodName', '==', foodName.toLowerCase()));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      
      const data = imageSchema.parse(snapshot.docs[0].data());
      return {
        imageUrl: data.imageUrl,
        thumbnailUrl: data.thumbnailUrl
      };
    } catch (error) {
      console.error('Error fetching image:', error);
      throw error;
    }
  }

  async cacheImage(
    foodName: string, 
    imageUrl: string, 
    thumbnailUrl: string, 
    category?: string
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      await runTransaction(db, async transaction => {
        // Add to food_images collection
        const q = query(this.collectionRef, where('foodName', '==', foodName.toLowerCase()));
        const snapshot = await transaction.get(q);
        
        if (snapshot.empty) {
          const newImageRef = doc(this.collectionRef);
          transaction.set(newImageRef, imageSchema.parse({
            foodName: foodName.toLowerCase(),
            imageUrl,
            thumbnailUrl,
            category,
            createdAt: now,
            updatedAt: now
          }));
        }
        
        // Add to cache collection
        const cacheRef = doc(this.cacheCollectionRef, foodName.toLowerCase());
        transaction.set(cacheRef, {
          imageUrl,
          thumbnailUrl,
          timestamp: now
        });
      });
    } catch (error) {
      console.error('Error caching image:', error);
      throw error;
    }
  }

  async getImagesByCategory(category: string): Promise<ImageResult[]> {
    try {
      const q = query(this.collectionRef, where('category', '==', category));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = imageSchema.parse(doc.data());
        return {
          imageUrl: data.imageUrl,
          thumbnailUrl: data.thumbnailUrl
        };
      });
    } catch (error) {
      console.error('Error fetching images by category:', error);
      throw error;
    }
  }

  async cleanupOldCache(): Promise<void> {
    try {
      const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
      const cutoffDate = new Date(Date.now() - MAX_CACHE_AGE);
      
      const snapshot = await getDocs(this.cacheCollectionRef);
      const oldEntries = snapshot.docs.filter(doc => {
        const data = doc.data();
        return new Date(data.timestamp) < cutoffDate;
      });
      
      await Promise.all(
        oldEntries.map(entry => 
          runTransaction(db, async transaction => {
            transaction.delete(doc(this.cacheCollectionRef, entry.id));
          })
        )
      );
    } catch (error) {
      console.error('Error cleaning up cache:', error);
      // Don't throw - this is a background operation
      console.warn('Cache cleanup failed:', error);
    }
  }
}