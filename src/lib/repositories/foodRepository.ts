import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { z } from 'zod';
import type { Food, FoodCategory } from '../../types/food';

// Validation schema
const foodSchema = z.object({
  name: z.string().min(1),
  portion: z.string().min(1),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  fiber: z.number().min(0),
  category: z.string(),
  preparation: z.array(z.string()),
  tags: z.array(z.string()),
  dietTypes: z.array(z.string()),
  createdAt: z.date().optional()
});

export class FoodRepository {
  private static instance: FoodRepository;
  private readonly collectionRef = collection(db, 'foods'); 

  private constructor() {}

  static getInstance(): FoodRepository {
    if (!this.instance) {
      this.instance = new FoodRepository();
    }
    return this.instance;
  }

  async getFoodById(id: string): Promise<Food | null> {
    try {
      const docRef = doc(this.collectionRef, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      
      const data = foodSchema.parse(docSnap.data());
      return { ...data, id: docSnap.id };
    } catch (error) {
      console.error('Error fetching food:', error);
      throw error;
    }
  }

  async getFoodsByCategory(category: FoodCategory): Promise<Food[]> {
    try {
      const q = query(this.collectionRef, where('category', '==', category));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...foodSchema.parse(doc.data())
      }));
    } catch (error) {
      console.error('Error fetching foods by category:', error);
      throw error;
    }
  }

  async getFoodsByDiet(dietType: string): Promise<Food[]> {
    try {
      const q = query(this.collectionRef, where('dietTypes', 'array-contains', dietType));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...foodSchema.parse(doc.data())
      }));
    } catch (error) {
      console.error('Error fetching foods by diet:', error);
      throw error;
    }
  }

  async getFoodsByTags(tags: string[]): Promise<Food[]> {
    try {
      const q = query(this.collectionRef, where('tags', 'array-contains-any', tags));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...foodSchema.parse(doc.data())
      }));
    } catch (error) {
      console.error('Error fetching foods by tags:', error);
      throw error;
    }
  }

  async addFood(food: Omit<Food, 'id'>): Promise<string> {
    try {
      const validatedFood = foodSchema.parse({
        ...food,
        createdAt: new Date()
      });
      
      const docRef = doc(this.collectionRef);
      await setDoc(docRef, validatedFood);
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding food:', error);
      throw error;
    }
  }

  async updateFood(id: string, food: Partial<Food>): Promise<void> {
    try {
      const docRef = doc(this.collectionRef, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Food not found');
      }
      
      const currentData = docSnap.data();
      const updatedData = foodSchema.parse({
        ...currentData,
        ...food
      });
      
      await setDoc(docRef, updatedData);
    } catch (error) {
      console.error('Error updating food:', error);
      throw error;
    }
  }

  async searchFoods(query: string): Promise<Food[]> {
    try {
      // Implement full-text search or use a search index
      const q = query(
        this.collectionRef,
        where('name', '>=', query.toLowerCase()),
        where('name', '<=', query.toLowerCase() + '\uf8ff')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...foodSchema.parse(doc.data())
      }));
    } catch (error) {
      console.error('Error searching foods:', error);
      throw error;
    }
  }
}