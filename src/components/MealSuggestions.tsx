import React, { useState } from 'react';
import { ChevronRight, Utensils, Clock, TrendingUp, Scale, Heart } from 'lucide-react';
import type { Meal } from '../types/user';

interface MealSuggestionsProps {
  meal: Meal;
  onSelect: (meal: Meal) => void;
  onFavorite?: (meal: Meal) => void;
}

function MealSuggestions({ meal, onSelect, onFavorite }: MealSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  // Generate alternatives based on meal type and macros
  const alternatives = meal.foods.map(food => food.alternatives || []).flat();
  
  // Group alternatives by meal time
  const timeSlots = {
    morning: ['06:00', '07:00', '08:00', '09:00'],
    noon: ['12:00', '13:00', '14:00'],
    afternoon: ['15:00', '16:00', '17:00'],
    evening: ['19:00', '20:00', '21:00']
  };

  const getMealTimeSlot = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 6 && hour < 10) return timeSlots.morning;
    if (hour >= 12 && hour < 15) return timeSlots.noon;
    if (hour >= 15 && hour < 18) return timeSlots.afternoon;
    return timeSlots.evening;
  };

  const availableTimeSlots = getMealTimeSlot(meal.time);

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Current Meal */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center">
              <Utensils className="text-primary-500" size={24} />
            </div>
            <div>
              <h3 className="font-medium">{meal.name}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock size={16} />
                <span>{meal.time}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ChevronRight
              size={20}
              className={`transform transition-transform ${
                showDetails ? 'rotate-90' : ''
              }`}
            />
          </button>
        </div>

        {/* Macro Summary */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Calorias</p>
            <p className="font-medium">{meal.calories} kcal</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Proteína</p>
            <p className="font-medium">{meal.protein}g</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Carboidratos</p>
            <p className="font-medium">{meal.carbs}g</p>
          </div>
        </div>

        {/* Foods List */}
        {showDetails && (
          <div className="space-y-3 animate-fade-in">
            {meal.foods.map((food, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{food.name}</p>
                  <p className="text-sm text-gray-500">{food.portion}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{food.calories} kcal</p>
                  <p className="text-xs text-gray-500">
                    P: {food.protein}g • C: {food.carbs}g • G: {food.fat}g
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alternative Suggestions */}
      <div className="p-6">
        <h4 className="text-sm font-medium text-gray-700 mb-4">
          Sugestões Alternativas
        </h4>
        
        <div className="space-y-4">
          {/* Time Slots */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Horários Disponíveis</p>
            <div className="flex flex-wrap gap-2">
              {availableTimeSlots.map((time) => (
                <button
                  key={time}
                  onClick={() => {
                    const updatedMeal = { ...meal, time };
                    onSelect(updatedMeal);
                  }}
                  className={`px-3 py-1 rounded-full text-sm ${
                    meal.time === time
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Alternative Foods */}
          {alternatives.map((alt, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => {
                const updatedMeal = {
                  ...meal,
                  foods: meal.foods.map(food => ({
                    ...food,
                    alternatives: [alt, ...(food.alternatives || [])]
                  }))
                };
                onSelect(updatedMeal);
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Scale size={18} className="text-primary-500" />
                  <p className="font-medium">{alt.name}</p>
                </div>
                {onFavorite && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFavorite({
                        ...meal,
                        foods: [{ ...alt, alternatives: [] }]
                      });
                    }}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <Heart size={18} className="text-gray-400 hover:text-red-500" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>{alt.portion}</span>
                <span>{alt.calories} kcal</span>
                <div className="flex items-center gap-1">
                  <TrendingUp size={14} />
                  <span>{alt.protein}g prot</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default MealSuggestions;