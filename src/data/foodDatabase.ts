import type { FoodCategory, Food, FoodDatabase } from '../types/food';

export const foodDatabase: FoodDatabase = {
  protein: {
    omnivoro: [
      // Carnes
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
        tags: ['lean', 'popular']
      },
      { 
        name: 'Peito de peru',
        portion: '100g',
        calories: 157,
        protein: 29,
        carbs: 0,
        fat: 3.2,
        fiber: 0,
        category: 'meat',
        preparation: ['grelhado', 'assado'],
        tags: ['lean']
      },
      { 
        name: 'Filé mignon',
        portion: '100g',
        calories: 250,
        protein: 26,
        carbs: 0,
        fat: 17,
        fiber: 0,
        category: 'meat',
        preparation: ['grelhado', 'assado'],
        tags: ['premium']
      },
      // Peixes
      { 
        name: 'Salmão',
        portion: '100g',
        calories: 208,
        protein: 22,
        carbs: 0,
        fat: 13,
        fiber: 0,
        category: 'fish',
        preparation: ['grelhado', 'assado', 'cru'],
        tags: ['omega3', 'premium']
      },
      { 
        name: 'Atum em água',
        portion: '100g',
        calories: 116,
        protein: 26,
        carbs: 0,
        fat: 1,
        fiber: 0,
        category: 'fish',
        preparation: ['conserva'],
        tags: ['lean', 'practical']
      },
      { 
        name: 'Tilápia',
        portion: '100g',
        calories: 128,
        protein: 26,
        carbs: 0,
        fat: 2.7,
        fiber: 0,
        category: 'fish',
        preparation: ['grelhado', 'assado'],
        tags: ['lean']
      }
    ],
    vegetariano: [
      // Ovos e Laticínios
      { 
        name: 'Ovos',
        portion: '2 unidades',
        calories: 155,
        protein: 13,
        carbs: 1.1,
        fat: 11,
        fiber: 0,
        category: 'eggs',
        preparation: ['cozido', 'frito', 'mexido'],
        tags: ['versatile', 'popular']
      },
      { 
        name: 'Queijo cottage',
        portion: '100g',
        calories: 98,
        protein: 11,
        carbs: 3.4,
        fat: 4.3,
        fiber: 0,
        category: 'dairy',
        preparation: ['natural'],
        tags: ['lean']
      },
      { 
        name: 'Iogurte grego',
        portion: '100g',
        calories: 59,
        protein: 10,
        carbs: 3.6,
        fat: 0.4,
        fiber: 0,
        category: 'dairy',
        preparation: ['natural'],
        tags: ['probiotic']
      },
      { 
        name: 'Whey protein',
        portion: '30g',
        calories: 120,
        protein: 24,
        carbs: 3,
        fat: 2,
        fiber: 0,
        category: 'supplement',
        preparation: ['shake'],
        tags: ['supplement', 'practical']
      }
    ],
    vegano: [
      // Proteínas Vegetais
      { 
        name: 'Tofu',
        portion: '100g',
        calories: 144,
        protein: 17,
        carbs: 3,
        fat: 8,
        fiber: 2,
        category: 'plant_protein',
        preparation: ['grelhado', 'assado', 'cru'],
        tags: ['versatile']
      },
      { 
        name: 'Tempeh',
        portion: '100g',
        calories: 192,
        protein: 20,
        carbs: 7.7,
        fat: 11,
        fiber: 0,
        category: 'plant_protein',
        preparation: ['grelhado', 'assado'],
        tags: ['fermented']
      },
      { 
        name: 'Seitan',
        portion: '100g',
        calories: 370,
        protein: 75,
        carbs: 14,
        fat: 2,
        fiber: 0,
        category: 'plant_protein',
        preparation: ['cozido', 'grelhado'],
        tags: ['high_protein']
      },
      // Leguminosas
      { 
        name: 'Lentilhas cozidas',
        portion: '100g',
        calories: 116,
        protein: 9,
        carbs: 20,
        fat: 0.4,
        fiber: 8,
        category: 'legumes',
        preparation: ['cozido'],
        tags: ['fiber_rich']
      },
      { 
        name: 'Grão de bico',
        portion: '100g',
        calories: 164,
        protein: 9,
        carbs: 27,
        fat: 2.6,
        fiber: 8,
        category: 'legumes',
        preparation: ['cozido'],
        tags: ['fiber_rich']
      }
    ]
  },
  carbs: {
    regular: [
      // Grãos
      { 
        name: 'Arroz integral',
        portion: '100g',
        calories: 111,
        protein: 2.6,
        carbs: 23,
        fat: 0.9,
        fiber: 1.8,
        category: 'grain',
        preparation: ['cozido'],
        tags: ['whole_grain']
      },
      { 
        name: 'Quinoa',
        portion: '100g',
        calories: 120,
        protein: 4.4,
        carbs: 21,
        fat: 1.9,
        fiber: 2.8,
        category: 'grain',
        preparation: ['cozido'],
        tags: ['superfood']
      },
      // Tubérculos
      { 
        name: 'Batata doce',
        portion: '100g',
        calories: 86,
        protein: 1.6,
        carbs: 20,
        fat: 0.1,
        fiber: 3,
        category: 'tuber',
        preparation: ['assado', 'cozido'],
        tags: ['vitamin_a']
      },
      { 
        name: 'Mandioca',
        portion: '100g',
        calories: 159,
        protein: 1.4,
        carbs: 38,
        fat: 0.3,
        fiber: 1.8,
        category: 'tuber',
        preparation: ['cozido'],
        tags: ['traditional']
      },
      // Cereais
      { 
        name: 'Aveia',
        portion: '30g',
        calories: 117,
        protein: 4,
        carbs: 20,
        fat: 2.4,
        fiber: 3,
        category: 'cereal',
        preparation: ['cru', 'cozido'],
        tags: ['breakfast', 'fiber_rich']
      },
      { 
        name: 'Granola',
        portion: '30g',
        calories: 120,
        protein: 3,
        carbs: 24,
        fat: 3,
        fiber: 2,
        category: 'cereal',
        preparation: ['pronto'],
        tags: ['breakfast']
      }
    ],
    'low-carb': [
      // Vegetais baixo carboidrato
      { 
        name: 'Brócolis',
        portion: '100g',
        calories: 55,
        protein: 3.7,
        carbs: 11,
        fat: 0.6,
        fiber: 5,
        category: 'vegetable',
        preparation: ['cozido', 'vapor'],
        tags: ['low_carb', 'nutrient_rich']
      },
      { 
        name: 'Couve-flor',
        portion: '100g',
        calories: 25,
        protein: 2,
        carbs: 5,
        fat: 0.3,
        fiber: 2,
        category: 'vegetable',
        preparation: ['cozido', 'vapor'],
        tags: ['low_carb', 'versatile']
      },
      { 
        name: 'Abobrinha',
        portion: '100g',
        calories: 17,
        protein: 1.2,
        carbs: 3.1,
        fat: 0.3,
        fiber: 1,
        category: 'vegetable',
        preparation: ['grelhado', 'vapor'],
        tags: ['low_carb', 'low_calorie']
      },
      { 
        name: 'Berinjela',
        portion: '100g',
        calories: 25,
        protein: 1,
        carbs: 6,
        fat: 0.2,
        fiber: 3,
        category: 'vegetable',
        preparation: ['grelhado', 'assado'],
        tags: ['low_carb']
      }
    ]
  },
  fats: {
    all: [
      // Óleos e Gorduras
      { 
        name: 'Azeite de oliva',
        portion: '1 colher',
        calories: 120,
        protein: 0,
        carbs: 0,
        fat: 14,
        fiber: 0,
        category: 'oil',
        preparation: ['cru'],
        tags: ['healthy_fat', 'mediterranean']
      },
      { 
        name: 'Óleo de coco',
        portion: '1 colher',
        calories: 120,
        protein: 0,
        carbs: 0,
        fat: 14,
        fiber: 0,
        category: 'oil',
        preparation: ['cru', 'cozinha'],
        tags: ['mct']
      },
      // Frutas e Sementes
      { 
        name: 'Abacate',
        portion: '1/2 unidade',
        calories: 160,
        protein: 2,
        carbs: 8.5,
        fat: 15,
        fiber: 7,
        category: 'fruit',
        preparation: ['cru'],
        tags: ['healthy_fat', 'fiber_rich']
      },
      // Oleaginosas
      { 
        name: 'Castanha do Pará',
        portion: '30g',
        calories: 186,
        protein: 4,
        carbs: 3.5,
        fat: 19,
        fiber: 2,
        category: 'nut',
        preparation: ['cru'],
        tags: ['selenium']
      },
      { 
        name: 'Amêndoas',
        portion: '30g',
        calories: 164,
        protein: 6,
        carbs: 6,
        fat: 14,
        fiber: 3.5,
        category: 'nut',
        preparation: ['cru', 'torrado'],
        tags: ['vitamin_e']
      },
      { 
        name: 'Chia',
        portion: '15g',
        calories: 68,
        protein: 2.3,
        carbs: 6,
        fat: 4.4,
        fiber: 5.5,
        category: 'seed',
        preparation: ['cru'],
        tags: ['omega3', 'fiber_rich']
      }
    ]
  },
  snacks: {
    all: [
      // Frutas
      { 
        name: 'Banana',
        portion: '1 unidade média',
        calories: 105,
        protein: 1.3,
        carbs: 27,
        fat: 0.4,
        fiber: 3.1,
        category: 'fruit',
        preparation: ['cru'],
        tags: ['potassium', 'practical']
      },
      { 
        name: 'Maçã',
        portion: '1 unidade média',
        calories: 95,
        protein: 0.5,
        carbs: 25,
        fat: 0.3,
        fiber: 4.4,
        category: 'fruit',
        preparation: ['cru'],
        tags: ['fiber_rich', 'practical']
      },
      // Barras e Shakes
      { 
        name: 'Barra de proteína',
        portion: '1 unidade (60g)',
        calories: 240,
        protein: 20,
        carbs: 30,
        fat: 8,
        fiber: 3,
        category: 'supplement',
        preparation: ['pronto'],
        tags: ['practical', 'pre_workout']
      },
      { 
        name: 'Shake de proteína',
        portion: '1 scoop (30g)',
        calories: 120,
        protein: 24,
        carbs: 3,
        fat: 2,
        fiber: 0,
        category: 'supplement',
        preparation: ['shake'],
        tags: ['post_workout', 'practical']
      }
    ]
  }
};

// Funções auxiliares para filtrar alimentos
export function filterFoodsByDiet(diet: string): Food[] {
  const foods: Food[] = [];
  
  // Adicionar proteínas específicas da dieta
  if (foodDatabase.protein[diet]) {
    foods.push(...foodDatabase.protein[diet]);
  }
  
  // Adicionar carboidratos baseados no tipo de dieta
  const carbsType = diet === 'low-carb' || diet === 'cetogenica' ? 'low-carb' : 'regular';
  foods.push(...foodDatabase.carbs[carbsType]);
  
  // Adicionar gorduras boas (comum a todas as dietas)
  foods.push(...foodDatabase.fats.all);
  
  // Adicionar snacks
  foods.push(...foodDatabase.snacks.all);
  
  return foods;
}

export function filterFoodsByTag(foods: Food[], tag: string): Food[] {
  return foods.filter(food => food.tags.includes(tag));
}

export function filterFoodsByCategory(foods: Food[], category: FoodCategory): Food[] {
  return foods.filter(food => food.category === category);
}

export function filterFoodsByNutrient(foods: Food[], nutrient: 'protein' | 'carbs' | 'fat', minAmount: number): Food[] {
  return foods.filter(food => food[nutrient] >= minAmount);
}

export function calculateMealNutrients(foods: Food[]): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
} {
  return foods.reduce((acc, food) => ({
    calories: acc.calories + food.calories,
    protein: acc.protein + food.protein,
    carbs: acc.carbs + food.carbs,
    fat: acc.fat + food.fat,
    fiber: acc.fiber + food.fiber
  }), {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0
  });
}