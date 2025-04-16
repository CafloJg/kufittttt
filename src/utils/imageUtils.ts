// Centralized image utilities to reduce duplication across the codebase

// Constantes para tipos de refeições
export const MEAL_TYPES = {
  BREAKFAST: 'café',
  LUNCH: 'almo',
  SNACK: 'lanc',
  PREWORKOUT: 'pré',
  DINNER: 'jant'
};

// Helper function to get meal icon based on name
export function getMealIcon(mealName: string): React.ReactNode {
  const name = typeof mealName === 'string' ? mealName.toLowerCase() : '';
  if (name.includes(MEAL_TYPES.BREAKFAST)) return '☕️'; 
  if (name.includes(MEAL_TYPES.LUNCH)) return '🍽️';
  if (name.includes(MEAL_TYPES.SNACK)) return '🥪';
  if (name.includes(MEAL_TYPES.DINNER)) return '🌙';
  if (name.includes(MEAL_TYPES.PREWORKOUT)) return '💪';
  return '🍽️';
}

// Helper function to get meal icon for meal object
export function getMealIconForObject(meal: any): React.ReactNode {
  return getMealIcon(meal.name);
}

// Default fallback images used throughout the application
export const FALLBACK_IMAGES = {
  default: {
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400'
  },
  food: {
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=400'
  },
  meal: {
    breakfast: {
      imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=2000',
      thumbnailUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?q=80&w=400'
    },
    lunch: {
      imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=2000',
      thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400'
    },
    snack: {
      imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?q=80&w=2000',
      thumbnailUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?q=80&w=400'
    },
    dinner: {
      imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=2000',
      thumbnailUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?q=80&w=400'
    },
    preworkout: {
      imageUrl: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?q=80&w=2000',
      thumbnailUrl: 'https://images.unsplash.com/photo-1543362906-acfc16c67564?q=80&w=400'
    }
  }
};

// High-quality curated images for common foods
export const CURATED_FOOD_IMAGES = {
  'frango grelhado': {
    imageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?q=80&w=400'
  },
  'arroz integral': {
    imageUrl: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?q=80&w=400'
  },
  'salmão grelhado': {
    imageUrl: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?q=80&w=400'
  },
  'ovos': {
    imageUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?q=80&w=400'
  },
  'aveia': {
    imageUrl: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?q=80&w=400'
  },
  'pão integral': {
    imageUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?q=80&w=400'
  },
  'banana': {
    imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?q=80&w=400'
  },
  'maçã': {
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=400'
  },
  'iogurte': {
    imageUrl: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=400'
  },
  'salada': {
    imageUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?q=80&w=400'
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
  'ovo cozido': {
    imageUrl: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=400'
  },
  'omelete': {
    imageUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?q=80&w=400'
  },
  'tomate': {
    imageUrl: 'https://images.unsplash.com/photo-1561136594-7f68413baa99?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1561136594-7f68413baa99?q=80&w=400'
  },
  'cenoura': {
    imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=400'
  },
  'batata': {
    imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=400'
  },
  'alface': {
    imageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?q=80&w=400'
  },
  'brócolis': {
    imageUrl: 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?q=80&w=400'
  },
  'espinafre': {
    imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?q=80&w=400'
  },
  'azeite': {
    imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=400'
  },
  'castanha': {
    imageUrl: 'https://images.unsplash.com/photo-1567892737950-30c4db37cd89?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1567892737950-30c4db37cd89?q=80&w=400'
  },
  'granola': {
    imageUrl: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?q=80&w=400'
  },
  'iogurte natural': {
    imageUrl: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=400'
  },
  'mel': {
    imageUrl: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?q=80&w=400'
  },
  'whey protein': {
    imageUrl: 'https://images.unsplash.com/photo-1612442087705-c14b80a2037f?q=80&w=2000',
    thumbnailUrl: 'https://images.unsplash.com/photo-1612442087705-c14b80a2037f?q=80&w=400'
  }
};

/**
 * Get a meal image based on meal type
 * @param mealName The name of the meal
 * @returns Image URL and thumbnail URL
 */
export function getMealImageByType(mealName: string) {
  const mealType = mealName.toLowerCase();

  if (mealType.includes(MEAL_TYPES.BREAKFAST)) {
    return FALLBACK_IMAGES.meal.breakfast;
  }
  
  if (mealType.includes(MEAL_TYPES.LUNCH)) {
    return FALLBACK_IMAGES.meal.lunch;
  }
  
  if (mealType.includes(MEAL_TYPES.SNACK) || mealType.includes(MEAL_TYPES.PREWORKOUT)) {
    return FALLBACK_IMAGES.meal.snack;
  }
  
  if (mealType.includes(MEAL_TYPES.DINNER)) {
    return FALLBACK_IMAGES.meal.dinner;
  }
  
  return FALLBACK_IMAGES.default;
}

/**
 * Get a food image from the curated collection
 * @param foodName The name of the food
 * @returns Image URL and thumbnail URL
 */
export function getFoodImage(foodName: string) {
  const normalizedName = foodName.toLowerCase().trim();
  
  // Check for exact matches
  if (CURATED_FOOD_IMAGES[normalizedName]) {
    return CURATED_FOOD_IMAGES[normalizedName];
  }
  
  // Check for partial matches
  for (const [key, image] of Object.entries(CURATED_FOOD_IMAGES)) {
    if (normalizedName.includes(key)) {
      return image;
    }
  }
  
  // Return default food image if no match found
  return FALLBACK_IMAGES.food;
}

/**
 * Get meal type CSS class
 * @param mealName The name of the meal
 * @returns CSS class for the meal type
 */
export function getMealTypeClass(mealName: string): string {
  const name = mealName.toLowerCase();
  if (name.includes(MEAL_TYPES.BREAKFAST)) return 'meal-breakfast';
  if (name.includes(MEAL_TYPES.LUNCH)) return 'meal-lunch';
  if (name.includes(MEAL_TYPES.SNACK) || name.includes(MEAL_TYPES.PREWORKOUT)) return 'meal-snack';
  if (name.includes(MEAL_TYPES.DINNER)) return 'meal-dinner';
  return '';
}

/**
 * Get meal icon background color
 * @param mealName The name of the meal
 * @returns CSS class for the meal icon background
 */
export function getMealIconBackground(mealName: string): string {
  const name = mealName.toLowerCase();
  if (name.includes(MEAL_TYPES.BREAKFAST)) return 'bg-blue-50 text-blue-500';
  if (name.includes(MEAL_TYPES.LUNCH)) return 'bg-green-50/80 text-green-500';
  if (name.includes(MEAL_TYPES.SNACK) || name.includes(MEAL_TYPES.PREWORKOUT)) return 'bg-orange-50/80 text-orange-500';
  if (name.includes(MEAL_TYPES.DINNER)) return 'bg-purple-50/80 text-purple-500';
  return 'bg-gray-50 text-gray-500';
}

/**
 * Determine food category based on name
 * @param name The name of the food
 * @returns Category string
 */
export function getCategoryForFood(name: string): string {
  const FOOD_CATEGORIES = {
    PROTEINS: ['frango', 'carne', 'peixe', 'ovo'],
    CARBS: ['arroz', 'pão', 'aveia', 'batata'],
    VEGETABLES: ['alface', 'brócolis', 'espinafre', 'tomate'],
    FRUITS: ['maçã', 'banana', 'laranja', 'morango'],
    FATS: ['azeite', 'óleo', 'manteiga', 'castanha']
  };

  const lowerName = name.toLowerCase();
  
  if (FOOD_CATEGORIES.PROTEINS.some(food => lowerName.includes(food))) {
    return 'proteínas';
  }
  
  if (FOOD_CATEGORIES.CARBS.some(food => lowerName.includes(food))) {
    return 'carboidratos';
  }
  
  if (FOOD_CATEGORIES.VEGETABLES.some(food => lowerName.includes(food))) {
    return 'vegetais';
  }
  
  if (FOOD_CATEGORIES.FRUITS.some(food => lowerName.includes(food))) {
    return 'frutas';
  }
  
  if (FOOD_CATEGORIES.FATS.some(food => lowerName.includes(food))) {
    return 'gorduras';
  }
  
  return 'outros';
}

/**
 * Extract unit from portion string
 * @param portion The portion string (e.g., "100g", "1 colher")
 * @returns The unit part of the portion
 */
export function extractUnit(portion: string): string {
  const match = portion.match(/[a-zA-Z]+/);
  return match ? match[0] : 'unidade';
}