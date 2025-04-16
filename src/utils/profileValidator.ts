/**
 * Utilitários para validação de perfil de usuário
 */
import type { UserProfile } from '../types/user';

/**
 * Verifica se um perfil de usuário está completo para funcionalidades de dieta
 * @param user Perfil do usuário
 * @returns Objeto com status da validação e campos ausentes
 */
export function validateUserProfile(user: UserProfile): { 
  isComplete: boolean; 
  missingFields: string[];
  readableMessage: string;
} {
  const missingFields = [];
  
  if (!user.uid) missingFields.push('usuário');
  if (!user.weight) missingFields.push('peso');
  if (!user.height) missingFields.push('altura');
  if (!user.age) missingFields.push('idade');
  if (!user.gender) missingFields.push('gênero');
  if (!user.dietType) missingFields.push('tipo de dieta');
  if (!user.goals?.type) missingFields.push('objetivos');
  
  const isComplete = missingFields.length === 0;
  
  // Criar mensagem legível
  let readableMessage = '';
  if (!isComplete) {
    readableMessage = `Perfil incompleto. Por favor, preencha os seguintes campos: ${missingFields.join(', ')}.`;
  }
  
  return {
    isComplete,
    missingFields,
    readableMessage
  };
}

/**
 * Verifica se o tipo de dieta é compatível com as restrições do usuário
 * @param foods Lista de alimentos
 * @param dietType Tipo de dieta (vegano, vegetariano, etc.)
 * @returns Objeto com status de compatibilidade e alimentos incompatíveis
 */
export function validateDietCompatibility(foods: string[], dietType: string): {
  isCompatible: boolean;
  incompatibleFoods: string[];
  message: string;
} {
  const incompatibleFoods: string[] = [];
  
  // Lista de alimentos incompatíveis por tipo de dieta
  const nonVegetarianFoods = [
    'carne', 'bovina', 'frango', 'peixe', 'atum', 'salmão', 'sardinha', 
    'bacon', 'presunto', 'salsicha', 'linguiça', 'camarão'
  ];
  
  const nonVeganFoods = [
    ...nonVegetarianFoods,
    'leite', 'queijo', 'iogurte', 'requeijão', 'manteiga', 'ovo', 'mel'
  ];
  
  // Verificar compatibilidade com base no tipo de dieta
  if (dietType === 'vegetariano') {
    for (const food of foods) {
      if (nonVegetarianFoods.some(nonVegFood => 
        food.toLowerCase().includes(nonVegFood))) {
        incompatibleFoods.push(food);
      }
    }
  } else if (dietType === 'vegano') {
    for (const food of foods) {
      if (nonVeganFoods.some(nonVeganFood => 
        food.toLowerCase().includes(nonVeganFood))) {
        incompatibleFoods.push(food);
      }
    }
  }
  
  const isCompatible = incompatibleFoods.length === 0;
  
  // Criar mensagem
  let message = '';
  if (!isCompatible) {
    message = `Os seguintes alimentos não são compatíveis com a dieta ${dietType}: ${incompatibleFoods.join(', ')}.`;
  }
  
  return {
    isCompatible,
    incompatibleFoods,
    message
  };
}

/**
 * Obter substitutos para alimentos incompatíveis
 * @param food Alimento a ser substituído
 * @param dietType Tipo de dieta
 * @returns Substituto recomendado
 */
export function getDietCompatibleReplacement(food: string, dietType: string): string {
  const replacements: Record<string, Record<string, string>> = {
    'vegetariano': {
      'frango': 'tofu',
      'carne': 'proteína de soja',
      'peixe': 'grão de bico',
      'atum': 'lentilha',
      'salmão': 'lentilha',
      'bacon': 'tofu defumado',
      'presunto': 'tofu defumado',
      'camarão': 'cogumelo',
      'linguiça': 'proteína texturizada de soja'
    },
    'vegano': {
      'frango': 'tofu',
      'carne': 'proteína de soja',
      'peixe': 'grão de bico',
      'atum': 'lentilha',
      'salmão': 'lentilha',
      'bacon': 'tofu defumado',
      'presunto': 'tofu defumado',
      'camarão': 'cogumelo',
      'linguiça': 'proteína texturizada de soja',
      'leite': 'leite de amêndoas',
      'queijo': 'queijo vegano',
      'iogurte': 'iogurte vegano',
      'requeijão': 'pasta de castanha de caju',
      'manteiga': 'óleo de coco',
      'ovo': 'aquafaba',
      'mel': 'xarope de agave'
    }
  };
  
  // Normalizar para minúsculas
  const normalizedFood = food.toLowerCase();
  
  // Verificar se temos substituições para este tipo de dieta
  if (!replacements[dietType]) {
    return food; // Retornar o mesmo alimento se não houver substituições
  }
  
  // Procurar por correspondências parciais
  for (const [original, replacement] of Object.entries(replacements[dietType])) {
    if (normalizedFood.includes(original)) {
      return replacement;
    }
  }
  
  // Se não encontrarmos substituição, retornar o alimento original
  return food;
} 