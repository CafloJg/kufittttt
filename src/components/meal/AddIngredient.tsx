import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Food } from '../../types/user';

interface AddIngredientProps {
  onAdd: (ingredient: Food) => void;
  onClose: () => void;
}

const COMMON_INGREDIENTS = [
  { name: 'Açúcar', category: 'temperos', portion: '1 colher (chá)', calories: 20, protein: 0, carbs: 5, fat: 0 },
  { name: 'Sal', category: 'temperos', portion: '1 pitada', calories: 0, protein: 0, carbs: 0, fat: 0 },
  { name: 'Azeite', category: 'temperos', portion: '1 colher (sopa)', calories: 120, protein: 0, carbs: 0, fat: 14 },
  { name: 'Pimenta', category: 'temperos', portion: '1 pitada', calories: 0, protein: 0, carbs: 0, fat: 0 },
  { name: 'Whey Protein', category: 'suplementos', portion: '1 scoop (30g)', calories: 120, protein: 24, carbs: 3, fat: 2 },
  { name: 'Creatina', category: 'suplementos', portion: '5g', calories: 0, protein: 0, carbs: 0, fat: 0 },
  { name: 'BCAA', category: 'suplementos', portion: '1 scoop', calories: 0, protein: 0, carbs: 0, fat: 0 },
  { name: 'Mel', category: 'adoçantes', portion: '1 colher (sopa)', calories: 60, protein: 0, carbs: 17, fat: 0 },
  { name: 'Adoçante', category: 'adoçantes', portion: '1 gota', calories: 0, protein: 0, carbs: 0, fat: 0 },
  { name: 'Castanha do Pará', category: 'oleaginosas', portion: '1 unidade', calories: 33, protein: 2, carbs: 1, fat: 3 },
  { name: 'Castanha de Caju', category: 'oleaginosas', portion: '1 unidade', calories: 9, protein: 0.3, carbs: 0.5, fat: 0.7 },
  { name: 'Limão', category: 'temperos', portion: '1 colher (sopa)', calories: 4, protein: 0, carbs: 1, fat: 0 },
  { name: 'Canela', category: 'temperos', portion: '1 pitada', calories: 2, protein: 0, carbs: 0.5, fat: 0 }
];

const CATEGORIES = {
  temperos: '🧂 Temperos',
  suplementos: '💪 Suplementos',
  adoçantes: '🍯 Adoçantes',
  oleaginosas: '🥜 Oleaginosas'
};

function AddIngredient({ onAdd, onClose }: AddIngredientProps) {
  const [customIngredient, setCustomIngredient] = useState('');
  const [customPortion, setCustomPortion] = useState('');
  const [customCalories, setCustomCalories] = useState('');

  const handleAddCustom = () => {
    if (!customIngredient || !customPortion || !customCalories) return;
    
    onAdd({
      id: `custom_${Date.now()}`,
      name: customIngredient,
      portion: customPortion,
      calories: parseInt(customCalories),
      protein: 0,
      carbs: 0,
      fat: 0,
      category: 'custom'
    });

    setCustomIngredient('');
    setCustomPortion('');
    setCustomCalories('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Adicionar Ingrediente</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Common Ingredients */}
          <div className="space-y-6">
            {Object.entries(CATEGORIES).map(([category, title]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {COMMON_INGREDIENTS.filter(i => i.category === category).map((ingredient) => (
                    <button
                      key={ingredient.name}
                      onClick={() => onAdd({ ...ingredient, id: `${ingredient.name}_${Date.now()}` })}
                      className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <p className="font-medium">{ingredient.name}</p>
                      <p className="text-sm text-gray-500">{ingredient.portion}</p>
                      <p className="text-xs text-gray-400">{ingredient.calories} kcal</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Custom Ingredient */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Ingrediente Personalizado</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={customIngredient}
                onChange={(e) => setCustomIngredient(e.target.value)}
                placeholder="Nome do ingrediente"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="text"
                value={customPortion}
                onChange={(e) => setCustomPortion(e.target.value)}
                placeholder="Porção (ex: 1 colher)"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="number"
                value={customCalories}
                onChange={(e) => setCustomCalories(e.target.value)}
                placeholder="Calorias"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleAddCustom}
                disabled={!customIngredient || !customPortion || !customCalories}
                className="w-full py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center justify-center gap-2">
                  <Plus size={20} />
                  <span>Adicionar Personalizado</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddIngredient;