import { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useUser } from '../context/UserContext';
import type { Meal, Food } from '../types/user';

interface FoodPreference {
  type: 'like' | 'dislike';
  score: number;
  updatedAt: string;
}

export function useFoodPreferences(meal: Meal) {
  const { user } = useUser();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNutrients, setShowNutrients] = useState(false);
  const [foodPreferences, setFoodPreferences] = useState<Record<string, FoodPreference>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPreference, setIsUpdatingPreference] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, [meal.id]); // Re-load when meal changes

  const loadPreferences = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const preferences = user.foodPreferences;
      
      const formattedPrefs = preferences ? Object.entries(preferences).reduce((acc, [id, pref]) => ({
        ...acc,
        [id]: {
          type: pref.type as 'like' | 'dislike',
          score: pref.score || 0,
          updatedAt: pref.updatedAt
        }
      }), {}) : {};
      
      setFoodPreferences(formattedPrefs);
      setIsFavorite(!!user.favoriteMeals?.[meal.id]);
    } catch (error) {
      console.error('Error loading food preferences:', error);
      setError('Erro ao carregar preferências');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || isUpdating) return;
    
    setIsUpdating(true);
    setError(null);
    try {
      const userRef = doc(db, 'users', user.uid);

      // Use transaction for better consistency
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error('Usuário não encontrado');
        }

        const userData = userDoc.data();
        const favorites = userData.favoriteMeals || {};

        if (isFavorite) {
          const { [meal.id]: removed, ...remaining } = favorites;
          transaction.update(userRef, {
            favoriteMeals: remaining,
            updatedAt: new Date().toISOString()
          });
        } else {
          transaction.update(userRef, {
            [`favoriteMeals.${meal.id}`]: {
              ...meal,
              savedAt: new Date().toISOString()
            },
            updatedAt: new Date().toISOString()
          });
        }
      });
      
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error updating favorite:', error);
      setError('Erro ao atualizar favoritos');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFoodFeedback = async (foodId: string, type: 'like' | 'dislike') => {
    if (!user) return;
    if (isUpdatingPreference) return; 
    
    setError(null);
    setIsUpdatingPreference(true);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const food = meal.foods.find(f => f.id === foodId);
      
      if (!food) {
        throw new Error('Alimento não encontrado');
      }
      
      const currentPref = user.foodPreferences?.[foodId];
      let newScore;
      
      // If same type, remove preference
      if (currentPref?.type === type) {
        newScore = 0;
      } else {
        // Otherwise set new score
        newScore = type === 'like' ? 5 : -5;
      }
      
      // Update local state immediately
      setFoodPreferences(prev => ({
        ...prev,
        [foodId]: { 
          type: newScore === 0 ? undefined : type,
          score: newScore,
          updatedAt: new Date().toISOString()
        }
      }));
      
      // Update user preferences in Firestore
      if (newScore === 0) {
        // Remove preference
        await updateDoc(userRef, {
          [`foodPreferences.${foodId}`]: null
        });
      } else {
        // Update or add preference
        await updateDoc(userRef, {
          [`foodPreferences.${foodId}`]: {
            name: food.name,
            type,
            score: newScore,
            updatedAt: new Date().toISOString(),
            calories: food.calories,
            protein: food.protein,
            carbs: food.carbs,
            fat: food.fat,
            portion: food.portion
          }
        });
      }
    } catch (error) {
      console.error('Error updating food preference:', error);
      // Show error to user
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar preferência';
      setError(errorMessage);
      // Revert local state on error by reloading preferences
      loadPreferences();
    } finally {
      setIsUpdatingPreference(false);
    }
  };

  const handleAddIngredient = async (ingredient: Food) => {
    if (!user) return;

    setIsUpdating(true);
    setError(null);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error('Usuário não encontrado');
        }

        const userData = userDoc.data();
        const currentPlan = userData.currentDietPlan;
        
        if (!currentPlan) {
          throw new Error('Plano alimentar não encontrado');
        }

        // Update meal with new ingredient
        const updatedMeals = currentPlan.meals.map(m => {
          if (m.id === meal.id) {
            return {
              ...m,
              calories: m.calories + ingredient.calories,
              protein: m.protein + (ingredient.protein || 0),
              carbs: m.carbs + (ingredient.carbs || 0),
              fat: m.fat + (ingredient.fat || 0),
              foods: [...m.foods, ingredient]
            };
          }
          return m;
        });

        // Update plan totals
        const updatedPlan = {
          ...currentPlan,
          totalCalories: currentPlan.totalCalories + ingredient.calories,
          proteinTarget: currentPlan.proteinTarget + (ingredient.protein || 0),
          carbsTarget: currentPlan.carbsTarget + (ingredient.carbs || 0),
          fatTarget: currentPlan.fatTarget + (ingredient.fat || 0),
          meals: updatedMeals
        };

        transaction.update(userRef, {
          currentDietPlan: updatedPlan,
          updatedAt: new Date().toISOString()
        });
      });

    } catch (error) {
      console.error('Error adding ingredient:', error);
      // Show error to user
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar preferência';
      setError(errorMessage);
      // Revert local state on error by reloading preferences
      loadPreferences();
    } finally {
      setIsUpdatingPreference(false);
    }
  };

  return {
    isExpanded,
    setIsExpanded,
    isFavorite,
    isUpdating,
   setIsUpdating,
    showNutrients,
    setShowNutrients,
    foodPreferences,
    handleFavorite,
    handleFoodFeedback,
    handleAddIngredient,
    isLoading,
    error
  };
}

export default useFoodPreferences;