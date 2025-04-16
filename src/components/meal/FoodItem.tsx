import React, { memo, useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Food } from '../../types/user';
import type { ImageResult } from '../../types/image';

interface FoodItemProps {
  food: Food;
  showNutrients: boolean;
  onFeedback: (foodId: string, type: 'like' | 'dislike') => void;
  preferences: Record<string, { type: 'like' | 'dislike'; score: number }>;
}

const FoodItem = memo(({ food, showNutrients, onFeedback, preferences }: FoodItemProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="food-item glass-morphism"
      role="listitem"
      aria-label={`${food.name} - ${food.calories} calorias`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex-1 min-w-0 flex flex-col">
        <motion.p 
          layout
          className="font-semibold text-base sm:text-lg text-gray-800 mb-1"
        >
          {food.name}
        </motion.p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{food.portion}</span>
          <span>•</span>
          <span>{food.calories} kcal</span>
          {showNutrients && (
            <AnimatePresence>
              <span>•</span>
              <span>P: {food.protein}g</span>
              <span>•</span>
              <span>C: {food.carbs}g</span>
              <span>•</span>
              <span>G: {food.fat}g</span>
            </AnimatePresence>
          )}
        </div>
        
        <motion.div 
          className="flex items-center gap-2 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <button
            onClick={() => onFeedback(food.id, 'like')}
            aria-label={`Gostei de ${food.name}`}
            aria-pressed={preferences[food.id]?.type === 'like'}
            className={`preference-button glow-effect ${
              preferences[food.id]?.type === 'like'
                ? 'liked'
                : ''
            }`}
          >
            <ThumbsUp size={16} />
          </button>
          <button
            onClick={() => onFeedback(food.id, 'dislike')}
            aria-label={`Não gostei de ${food.name}`}
            aria-pressed={preferences[food.id]?.type === 'dislike'}
            className={`preference-button glow-effect ${
              preferences[food.id]?.type === 'dislike'
                ? 'disliked'
                : ''
            }`}
          >
            <ThumbsDown size={16} />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
});

FoodItem.displayName = 'FoodItem';

export default FoodItem;