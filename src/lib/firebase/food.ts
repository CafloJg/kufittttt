import { collection, query, where, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Food, FoodCategory } from '../../types/food';
import type { ImageResult } from '../../types/image';

// Interface para filtros de busca
export interface FoodFilter {
  category?: FoodCategory;
  dietType?: string;
  tags?: string[];
  minProtein?: number;
  maxCalories?: number;
}

// Funções para interagir com a coleção de alimentos
export const foodsCollection = collection(db, 'foods');
export const foodImagesCollection = collection(db, 'food_images');

// Buscar alimentos com filtros
export async function getFoods(filters: FoodFilter = {}) {
  let q = query(foodsCollection);

  if (filters.category) {
    q = query(q, where('category', '==', filters.category));
  }

  if (filters.dietType) {
    q = query(q, where('dietTypes', 'array-contains', filters.dietType));
  }

  if (filters.minProtein) {
    q = query(q, where('protein', '>=', filters.minProtein));
  }

  if (filters.maxCalories) {
    q = query(q, where('calories', '<=', filters.maxCalories));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Food & { id: string }));
}

// Buscar alimentos por categoria
export async function getFoodsByCategory(category: FoodCategory) {
  const q = query(foodsCollection, where('category', '==', category));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Food & { id: string }));
}

// Buscar alimentos por dieta
export async function getFoodsByDiet(dietType: string) {
  const q = query(foodsCollection, where('dietTypes', 'array-contains', dietType));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Food & { id: string }));
}

// Buscar alimentos por tags
export async function getFoodsByTags(tags: string[]) {
  const q = query(foodsCollection, where('tags', 'array-contains-any', tags));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Food & { id: string }));
}

// Adicionar novo alimento
export async function addFood(food: Omit<Food, 'id'>) {
  return addDoc(foodsCollection, {
    ...food,
    createdAt: new Date()
  });
}

// Get food image by name
export async function getFoodImageByName(foodName: string): Promise<ImageResult | null> {
  try {
    const q = query(foodImagesCollection, where('food_name', '==', foodName.toLowerCase()));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const data = snapshot.docs[0].data();
    return {
      imageUrl: data.image_url,
      thumbnailUrl: data.thumbnail_url
    };
  } catch (error) {
    console.error('Error getting food image:', error);
    return null;
  }
}

// Save food image
export async function saveFoodImage(
  foodName: string,
  imageUrl: string,
  thumbnailUrl: string,
  category: string
): Promise<void> {
  try {
    const docRef = doc(foodImagesCollection, foodName.toLowerCase().replace(/\s+/g, '-'));
    await setDoc(docRef, {
      food_name: foodName.toLowerCase(),
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      category,
      created_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving food image:', error);
  }
}

// Função para popular o banco de dados com alimentos iniciais
export async function seedFoodDatabase() {
  const foods: Omit<Food, 'id'>[] = [
    {
      name: 'Frango grelhado',
      portion: '100g',
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
      fiber: 0,
      category: 'meat',
      preparation: ['grelhado', 'assado', 'cozido'],
      tags: ['lean', 'popular'],
      dietTypes: ['omnivoro', 'low-carb', 'mediterranea']
    },
    // Adicione mais alimentos aqui...
  ];

  for (const food of foods) {
    try {
      await addFood(food);
    } catch (error) {
      console.error(`Erro ao adicionar ${food.name}:`, error);
    }
  }
}