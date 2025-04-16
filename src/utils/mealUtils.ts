import { Meal, Food } from '../types/user';
import { getMealImageByType, getFoodImage } from './imageUtils';

/**
 * Calcula os totais nutricionais de uma refeição
 * @param foods Lista de alimentos
 * @returns Objeto com totais de calorias, proteínas, carboidratos e gorduras
 */
export function calculateMealTotals(foods: Food[]) {
  return foods.reduce(
    (acc, food) => ({
      calories: acc.calories + (food.calories || 0),
      protein: acc.protein + (food.protein || 0),
      carbs: acc.carbs + (food.carbs || 0),
      fat: acc.fat + (food.fat || 0)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Gera um ID único para uma refeição
 * @returns ID único
 */
export function generateMealId(): string {
  return `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Gera um ID único para um alimento
 * @param mealIndex Índice da refeição
 * @param foodIndex Índice do alimento
 * @returns ID único
 */
export function generateFoodId(mealIndex: number, foodIndex: number): string {
  return `food_${mealIndex}_${foodIndex}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Adiciona imagens a uma refeição
 * @param meal Refeição
 * @returns Refeição com imagens
 */
export async function addImagesToMeal(meal: Meal): Promise<Meal> {
  // Adicionar imagem à refeição
  const mealImage = getMealImageByType(meal.name);
  
  // Adicionar imagens aos alimentos
  const foodsWithImages = await Promise.all(
    meal.foods.map(async (food, index) => {
      // Se já tiver imagem, manter
      if (food.imageUrl && food.thumbnailUrl) {
        return food;
      }
      
      const foodImage = getFoodImage(food.name);
      return {
        ...food,
        id: food.id || generateFoodId(0, index),
        imageUrl: foodImage.imageUrl,
        thumbnailUrl: foodImage.thumbnailUrl
      };
    })
  );
  
  return {
    ...meal,
    id: meal.id || generateMealId(),
    imageUrl: meal.imageUrl || mealImage.imageUrl,
    thumbnailUrl: meal.thumbnailUrl || mealImage.thumbnailUrl,
    foods: foodsWithImages
  };
}

/**
 * Formata o horário da refeição
 * @param time Horário no formato HH:MM
 * @returns Horário formatado
 */
export function formatMealTime(time: string): string {
  // Se já estiver no formato HH:MM, retornar
  if (/^\d{1,2}:\d{2}$/.test(time)) {
    return time;
  }
  
  // Tentar extrair horas e minutos
  const timeRegex = /(\d{1,2})[^\d]*(\d{2})/;
  const match = time.match(timeRegex);
  
  if (match) {
    const [_, hours, minutes] = match;
    return `${hours.padStart(2, '0')}:${minutes}`;
  }
  
  // Fallback para horários padrão
  if (time.toLowerCase().includes('café') || time.toLowerCase().includes('manhã')) {
    return '07:00';
  }
  
  if (time.toLowerCase().includes('almoço')) {
    return '12:00';
  }
  
  if (time.toLowerCase().includes('lanche')) {
    return '16:00';
  }
  
  if (time.toLowerCase().includes('jantar')) {
    return '20:00';
  }
  
  return '12:00'; // Horário padrão
}

/**
 * Verifica se uma refeição está completa (tem todos os campos necessários)
 * @param meal Refeição
 * @returns Verdadeiro se a refeição estiver completa
 */
export function isMealComplete(meal: Partial<Meal>): boolean {
  return !!(
    meal.id &&
    meal.name &&
    meal.time &&
    typeof meal.calories === 'number' &&
    typeof meal.protein === 'number' &&
    typeof meal.carbs === 'number' &&
    typeof meal.fat === 'number' &&
    Array.isArray(meal.foods) &&
    meal.foods.length > 0
  );
}