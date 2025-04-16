import React, { memo } from 'react';
import { Heart, Clock, Utensils } from 'lucide-react';
import type { Meal } from '../../types/user';
import { getMealIcon } from '../../utils/imageUtils';

interface MealHeaderProps {
  meal: Meal;
  mealImage: string | null;
  showNutrients: boolean;
  isFavorite: boolean;
  isUpdating: boolean;
  onFavorite: (e: React.MouseEvent) => void;
  onToggleNutrients: (e: React.MouseEvent) => void;
}

const MealHeader = memo(({ 
  meal, 
  mealImage,
  showNutrients, 
  isFavorite, 
  isUpdating, 
  onFavorite,
  onToggleNutrients 
}: MealHeaderProps) => {
  return (
    <div className="flex items-center justify-between gap-4 mb-6 glass-morphism p-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm transform hover:scale-105 transition-transform overflow-hidden">
          {mealImage ? (
            <div className="w-full h-full">
              <img
                src={mealImage}
                alt={meal.name}
                className="w-full h-full object-cover transition-transform hover:scale-110"
                loading="lazy"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400';
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center float-effect">
              <span className="text-2xl">{getMealIcon(meal.name)}</span>
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-1 bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">{meal.name}</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock size={14} className="text-primary-400" />
              <span>{meal.time}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Utensils size={14} className="text-primary-400" />
              <span>{meal.foods.length} itens</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-bold text-lg sm:text-xl text-primary-500">
            {meal.calories} kcal
          </p>
          <button
            onClick={onToggleNutrients}
            className="text-xs sm:text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors underline"
          >
            {showNutrients ? (
              <>P: {meal.protein}g • C: {meal.carbs}g • G: {meal.fat}g</>
            ) : (
              'Ver nutrientes'
            )}
          </button>
        </div>
        
        <button
          onClick={onFavorite}
          disabled={isUpdating}
          className={`p-3 rounded-full transition-all transform hover:scale-110 glow-effect ${
            isUpdating 
              ? 'opacity-50 cursor-not-allowed'
              : isFavorite
              ? 'text-red-500 hover:bg-red-50 hover:shadow-lg'
              : 'text-gray-400 hover:bg-gray-100 hover:text-primary-500'
          }`}
        >
          <Heart
            size={24}
            className={`transition-transform ${
              isFavorite ? 'fill-current animate-pulse' : 'scale-100'
            }`}
          />
        </button>
      </div>
    </div>
  );
});

MealHeader.displayName = 'MealHeader';

export default MealHeader;