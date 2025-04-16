import React, { useCallback, useState } from 'react';
import { Check, Utensils, Plus, Loader2, Clock, ChevronDown, ChevronUp, Award, ThumbsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ErrorBoundary from '../ErrorBoundary';
import { useError } from '../../context/ErrorContext';
import { useFoodPreferences } from '../../hooks'; 
import { useErrorHandling } from '../../hooks/useErrorHandling';
import { ErrorFallback } from '../common/ErrorFallback';
import FoodItem from './FoodItem';
import AddIngredient from './AddIngredient';
import { useUser } from '../../context/UserContext';
import { useImages } from '../../context/ImageContext';
import { getMealTypeClass, getMealIconBackground, getMealIconForObject } from '../../utils/imageUtils';
import { useDietContext } from '../../context/DietContext';
import type { Meal } from '../../types/user';

interface MealCardSkeletonProps {
  animate?: boolean;
}

const MealCardSkeleton = ({ animate = true }: MealCardSkeletonProps) => (
  <div className={`diet-card ${animate ? 'animate-pulse' : ''}`}>
    <div className="flex items-center gap-4 mb-6">
      <div className="w-14 h-14 bg-gray-200 rounded-xl" />
      <div className="flex-1">
        <div className="h-6 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-24 bg-gray-200 rounded" />
      </div>
    </div>
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 bg-gray-200 rounded-xl" />
      ))}
    </div>
  </div>
);

interface MealCardProps {
  meal: Meal;
  isCompleted: boolean;
  onCheckIn: (mealId: string) => void;
  isLoading?: boolean;
  onLike?: (mealId: string) => void;
  onDislike?: (mealId: string) => void;
  getMealRating?: (mealId: string) => { liked: boolean; disliked: boolean };
}
const MealCard = ({ 
  meal, 
  isCompleted, 
  onCheckIn, 
  isLoading = false,
  onLike,
  onDislike,
  getMealRating
}: MealCardProps) => {
  const { user } = useUser();
  const { refreshPlan } = useDietContext();
  const {
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
    error: preferencesError
  } = useFoodPreferences(meal); // Este hook será refatorado para usar o contexto

  const [showAddIngredient, setShowAddIngredient] = useState(false);

  const [localError, setLocalError] = useState<Error | null>(null); 
  const { setError: setGlobalError, withErrorHandling: withGlobalErrorHandling } = useError();
  const { error: handlingError, setError, withErrorHandling, retryOperation } = useErrorHandling();

  const handleMealCheckIn = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || isCompleted || isUpdating) {
      // console.log(`Cannot check in meal: user=${!!user}, isCompleted=${isCompleted}, isUpdating=${isUpdating}`);
      return;
    }
    
    // Check if online before proceeding
    if (!navigator.onLine) {
      setLocalError(new Error('Você está offline. Verifique sua conexão com a internet e tente novamente.'));
      setGlobalError('Você está offline. Verifique sua conexão com a internet e tente novamente.');
      return;
    }
    
    console.log(`Attempting to mark meal ${meal.id} as completed. Current status: ${isCompleted ? 'completed' : 'not completed'}`);
    console.log(`Meal calories: ${meal.calories}, protein: ${meal.protein}, carbs: ${meal.carbs}, fat: ${meal.fat}`);
    setIsUpdating(true);
    let success = false;
    
    try {
      // Add retry logic for network errors
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount <= maxRetries) {
        try {
          await onCheckIn(meal.id);
          console.log('Meal check-in successful');
          break; // Success, exit the loop
        } catch (error) {
          retryCount++;
          console.warn(`Error during meal check-in attempt ${retryCount}:`, error);
          
          // Check if it's a network error
          const isNetworkError = error instanceof Error && 
            (error.message.includes('network') || 
             error.message.includes('fetch') ||
             error.message.includes('offline'));
          
          // If it's the last retry or not a network error, rethrow
          if (retryCount > maxRetries || !isNetworkError) {
            throw error;
          }
          
          // Wait before retrying with exponential backoff
          console.log(`Network error, retrying meal check-in (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
        }
      }
      
      // console.log(`Meal marked as completed successfully`);
      success = true;

      // Log the meal's nutritional values that were added
      console.log(`Meal completed: ${meal.name}`, {
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat
      });
      
      // Refresh the diet plan to update UI
      await refreshPlan();
      console.log('Diet plan refreshed after meal completion');
      
      // Refresh user data to update dashboard
      if (user.refreshUserData) {
        try {
          await user.refreshUserData();
        } catch (refreshError) {
          console.warn('Error refreshing user data after meal completion:', refreshError);
        }
      }
      
      // Reset updating state after a short delay
      setTimeout(() => {
        setIsUpdating(false);
        
        // Force multiple refreshes to ensure UI is updated
        const refreshWithDelay = (delay: number) => {
          setTimeout(() => {
            // Force re-render to show completed state
            setIsExpanded(prev => prev);
            
            // Force parent component to refresh
            if (refreshPlan) {
              refreshPlan().catch(console.error);
            }
          }, delay);
        };
        
        // Schedule multiple refreshes with increasing delays
        refreshWithDelay(100);  // Immediate refresh
        refreshWithDelay(500);  // Short delay refresh
        refreshWithDelay(2000); // Longer delay refresh for network latency
      }, 800);
      
    } catch (err) {
      // Se todas as retentativas falharem, propaga o erro
      const errorMessage = err instanceof Error ? err.message : 'Erro ao marcar refeição';
      setLocalError(err instanceof Error ? err : new Error(errorMessage));
      console.error('Error marking meal as completed');
      setGlobalError(errorMessage, {
        context: `Erro ao marcar refeição`,
        retry: () => handleMealCheckIn(e),
        severity: 'error'
      });
      // Reset updating state on error to allow retry
      setIsUpdating(false);
    }
  }, [user, isCompleted, isUpdating, meal.id, onCheckIn, setGlobalError, setError, refreshPlan, meal, setIsExpanded]);

  const handleError = (error: unknown) => {
    setLocalError(error instanceof Error ? error : new Error('Erro ao processar refeição'));
    setGlobalError(error instanceof Error ? error : new Error('Erro ao processar refeição'));
    setError(error);
  };

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || isUpdating) return;
    
    setIsUpdating(true);
    try {
      if (onLike) {
        await onLike(meal.id);
      }
    } catch (error) {
      console.error('Erro ao curtir refeição:', error);
      setGlobalError('Não foi possível curtir a refeição. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  }, [user, isUpdating, meal.id, onLike, setGlobalError]);
  
  const handleDislike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || isUpdating) return;
    
    setIsUpdating(true);
    try {
      if (onDislike) {
        await onDislike(meal.id);
      }
    } catch (error) {
      console.error('Erro ao descurtir refeição:', error);
      setGlobalError('Não foi possível descurtir a refeição. Tente novamente.');
    } finally {
      setIsUpdating(false);
    }
  }, [user, isUpdating, meal.id, onDislike, setGlobalError]);

  // Obter a avaliação atual da refeição, se a função estiver disponível
  const mealRating = getMealRating ? getMealRating(meal.id) : { liked: false, disliked: false };

  if (isLoading) {
    return <MealCardSkeleton />;
  }

  if (!meal || !meal.id) {
    console.error('Invalid meal data:', meal);
    return <MealCardSkeleton animate={false} />;
  }

  return (
    <motion.article 
      layout="position"
      onError={(error: any) => {
        console.error('Error in MealCard:', error);
        if (error instanceof Error) {
          handleError(error);
        }
        return true;
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl shadow-sm overflow-hidden hardware-accelerated ${getMealTypeClass(meal.name)} ${
        isCompleted ? 'border-2 border-green-500' : ''
      } transition-all duration-300`}
    >
      <div className="p-4 space-y-4">
        {localError && (
          <ErrorFallback
            error={localError || new Error('Erro ao carregar refeição')}
            resetErrorBoundary={() => { 
              setLocalError(null); 
              setGlobalError(null);
              setError(null); 
              // Force refresh the plan
              refreshPlan();
            }}
            context="Erro ao carregar refeição"
            showBackButton={true}
            navigate={window.history.back}
          />
        )}
        {/* Header with meal info - Removed image */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center
              ${getMealIconBackground(meal.name)}
              transform transition-transform hover:scale-110
            `}>
              <span className="text-xl">{getMealIconForObject(meal)}</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-0.5 text-gray-800">{meal.name}</h3>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock size={14} className="text-primary-400" />
                  <span>{meal.time}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <span>•</span>
                  <span>{meal.calories} kcal</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            {onLike && onDislike && (
              <>
                <button 
                  onClick={handleLike}
                  disabled={isUpdating}
                  className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                    mealRating.liked 
                      ? 'text-blue-500 bg-blue-50' 
                      : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
                  }`}
                  aria-label="Gostei desta refeição"
                  style={{ width: '40px', height: '40px' }}
                >
                  <Award size={20} className="inline-flex" />
                </button>
                
                <button 
                  onClick={handleDislike}
                  disabled={isUpdating}
                  className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                    mealRating.disliked 
                      ? 'text-red-500 bg-red-50' 
                      : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                  }`}
                  aria-label="Não gostei desta refeição"
                  style={{ width: '40px', height: '40px' }}
                >
                  <ThumbsDown size={20} className="inline-flex" />
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-target"
          >
            {isExpanded ? (
              <ChevronUp size={20} className="text-gray-400" />
            ) : (
              <ChevronDown size={20} className="text-gray-400" />
            )}
          </button>
        </div>

        {/* Macros */}
        <AnimatePresence mode="wait">
          <div className="flex items-center gap-2 flex-wrap">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-blue-50 text-blue-600"
            >
              <span>{meal.protein}g</span>
              <span>Proteína</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-green-50 text-green-600"
            >
              <span>{meal.carbs}g</span>
              <span>Carboidratos</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 bg-orange-50 text-orange-600"
            >
              <span>{meal.fat}g</span>
              <span>Gorduras</span>
            </motion.div>
          </div>
        </AnimatePresence>

        {/* Foods */}
        <ErrorBoundary onReset={() => setLocalError(null)} name="FoodsList">
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden"
            >
              {meal.foods.map((food, index) => (
                <motion.div
                  key={`food-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex-1">
                    <h4 className="text-base font-medium mb-1">{food.name}</h4>
                    <p className="text-xs text-gray-500">{food.portion}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <div className="text-xs font-medium text-primary-500">
                        {food.calories} kcal
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="px-1.5 py-0.5 rounded-full text-2xs font-medium bg-blue-50 text-blue-600">
                          P: {food.protein}g
                        </div>
                        <div className="px-1.5 py-0.5 rounded-full text-2xs font-medium bg-green-50 text-green-600">
                          C: {food.carbs}g
                        </div>
                        <div className="px-1.5 py-0.5 rounded-full text-2xs font-medium bg-orange-50 text-orange-600">
                          G: {food.fat}g
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </ErrorBoundary>

        {/* Action Button */}
        {!isCompleted ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleMealCheckIn}
            disabled={isUpdating || isCompleted || !user}
            className={`w-full py-4 rounded-xl font-medium relative transition-all ${
              (isUpdating || isCompleted) 
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                : 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {isUpdating && (
                <Loader2 size={20} className="animate-spin" />
              )}
              {!isUpdating && (
                <Award size={20} className="animate-bounce-subtle" />
              )}
              <span> 
                {isUpdating ? 'Processando...' : 'Marcar como Concluída'}
              </span>
            </div>
          </motion.button>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-xl text-green-500"
          >
            <Check size={20} className="completion-check" />
            <span className="font-medium">Refeição Concluída</span>
          </motion.div>
        )}
      </div>
    </motion.article>
  );
}

MealCard.displayName = 'MealCard';

export default MealCard;