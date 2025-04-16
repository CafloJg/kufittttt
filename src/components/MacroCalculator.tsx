import React, { useState } from 'react';
import { Calculator, X } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { calculateMacros } from '../lib/diet';
import type { UserProfile } from '../types/user';

interface MacroCalculatorProps {
  onClose: () => void;
}

function MacroCalculator({ onClose }: MacroCalculatorProps) {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [mealTime, setMealTime] = useState('');
  const [lastCalculation, setLastCalculation] = useState<{
    ingredients: string[];
    result: any;
    timestamp: number;
  } | null>(null);
  const [results, setResults] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  } | null>(null);
  const [error, setError] = useState('');

  // Cache calculation results for 5 minutes
  const handleAddToMeal = async () => {
    if (!results || !auth.currentUser) return;

    setIsAdding(true);
    setError('');

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) return;

      const userData = userDoc.data() as UserProfile;
      const currentPlan = userData.currentDietPlan;
      if (!currentPlan) {
        setError('Nenhum plano alimentar encontrado');
        return;
      }

      if (!mealTime) {
        setError('Selecione um horário para a refeição');
        return;
      }

      // Create new meal with calculated macros
      const newMeal = {
        id: `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: 'Refeição Extra',
        type: 'extra',
        imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
        time: mealTime,
        calories: results.calories,
        protein: results.protein,
        carbs: results.carbs,
        fat: results.fat,
        foods: ingredients.map((ingredient, index) => ({
          id: `food_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: ingredient,
          portion: '1 porção',
          imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
          thumbnailUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
          calories: Math.round(results.calories / ingredients.length),
          protein: Math.round(results.protein / ingredients.length),
          carbs: Math.round(results.carbs / ingredients.length),
          fat: Math.round(results.fat / ingredients.length)
        }))
      };

      // Add new meal to plan
      const updatedPlan = {
        ...currentPlan,
        meals: [...(currentPlan.meals || []), newMeal].sort((a, b) => {
          const timeA = a.time.split(':').map(Number);
          const timeB = b.time.split(':').map(Number);
          return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
        })
      };

      // Update total calories and macros
      updatedPlan.totalCalories = updatedPlan.meals.reduce((total, meal) => total + meal.calories, 0);
      updatedPlan.proteinTarget = updatedPlan.meals.reduce((total, meal) => total + meal.protein, 0);
      updatedPlan.carbsTarget = updatedPlan.meals.reduce((total, meal) => total + meal.carbs, 0);
      updatedPlan.fatTarget = updatedPlan.meals.reduce((total, meal) => total + meal.fat, 0);

      await updateDoc(userRef, {
        'currentDietPlan': updatedPlan
      });

      onClose();
    } catch (error) {
      console.error('Erro ao adicionar refeição:', error);
      setError('Erro ao adicionar refeição. Tente novamente.');
    } finally {
      setIsAdding(false);
    }
  };

  // Check cache before calculating
  const checkCache = (ingredients: string[]) => {
    if (lastCalculation && 
        JSON.stringify(ingredients) === JSON.stringify(lastCalculation.ingredients) &&
        Date.now() - lastCalculation.timestamp < 5 * 60 * 1000) {
      return lastCalculation.result;
    }
    return null;
  };

  // Save to cache after calculation
  const saveToCache = (ingredients: string[], result: any) => {
    setLastCalculation({ ingredients, result, timestamp: Date.now() });
  };

  const handleAddIngredient = () => {
    if (newIngredient.trim()) {
      setIngredients(prev => [...prev, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const handleCalculate = async () => {
    if (ingredients.length === 0) {
      setError('Adicione pelo menos um ingrediente');
      return;
    }

    setIsCalculating(true);
    setError('');
    setResults(null);

    // Check cache first
    const cached = checkCache(ingredients);
    if (cached) {
      setResults(cached);
      return;
    }

    try {
      const macros = await calculateMacros(ingredients); 
      saveToCache(ingredients, macros);
      setResults(macros);
    } catch (error) {
      console.error('Erro ao calcular macros:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Erro ao calcular macros. Tente novamente.'
      );
    } finally {
      setIsCalculating(false);
    } 
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl flex items-center justify-center shadow-lg">
                <Calculator className="text-primary-500" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Calculadora de Macros</h2>
                <p className="text-sm text-gray-500">
                  Calcule os macronutrientes dos seus alimentos
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-2 mobile-scroll">
            {error && (
              <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adicionar Ingrediente
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newIngredient}
                    onChange={(e) => setNewIngredient(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient()}
                    placeholder="Nome do alimento..."
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                  />
                  <button
                    onClick={handleAddIngredient}
                    disabled={!newIngredient.trim()}
                    className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              {ingredients.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Ingredientes ({ingredients.length})
                  </h4>
                  <div className="space-y-2">
                    {ingredients.map((ingredient, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span>{ingredient}</span>
                        <button
                          onClick={() => handleRemoveIngredient(index)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleCalculate}
                disabled={ingredients.length === 0 || isCalculating}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 shadow"
              >
                {isCalculating ? 'Calculando...' : 'Calcular Macros'}
              </button>

              {results && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h4 className="text-lg font-medium mb-4">Resultados</h4>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horário da Refeição Extra
                    </label>
                    <input
                      type="time"
                      value={mealTime}
                      onChange={(e) => setMealTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Calorias</p>
                      <p className="text-lg font-semibold">{results.calories} kcal</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Proteínas</p>
                      <p className="text-lg font-semibold">{results.protein}g</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Carboidratos</p>
                      <p className="text-lg font-semibold">{results.carbs}g</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Gorduras</p>
                      <p className="text-lg font-semibold">{results.fat}g</p>
                    </div>
                    <div className="col-span-2 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Fibras</p>
                      <p className="text-lg font-semibold">{results.fiber}g</p>
                    </div>
                  </div>
                  {mealTime && (
                    <button
                      onClick={handleAddToMeal}
                      disabled={isAdding}
                      className="w-full mt-4 bg-primary-500 text-white rounded-lg py-3 hover:bg-primary-600 transition-colors disabled:opacity-50"
                    >
                      {isAdding ? 'Adicionando...' : 'Adicionar Refeição Extra'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MacroCalculator;