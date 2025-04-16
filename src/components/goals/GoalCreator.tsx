import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Droplet, Scale, Activity, Plus, ChevronRight, TrendingUp, Apple } from 'lucide-react';
import type { CustomGoal } from '../../types/user';
import { useUser } from '../../context/UserContext';
import { useGoals } from '../../context/GoalsContext';

interface GoalCreatorProps {
  onCreateGoal: (goal: Partial<CustomGoal>) => Promise<void>;
  userWeight?: number;
}

function GoalCreator({ onCreateGoal, userWeight }: GoalCreatorProps) {
  const { user } = useUser();
  const { goals } = useGoals();
  const [selectedType, setSelectedType] = useState<'weight' | 'water' | 'protein' | 'nutrition' | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goalTypes = [
    {
      id: 'weight',
      name: 'Meta de Peso',
      description: 'Defina sua meta de perda ou ganho de peso',
      icon: Scale,
      color: 'bg-blue-500',
      suggestions: [
        { 
          name: 'Perda de peso saudável',
          description: 'Perda gradual e sustentável de 0.5kg por semana',
          target: userWeight ? Math.max(userWeight - 5, 50) : 65,
          unit: 'kg',
          duration: 70,
          type: 'weight'
        },
        { 
          name: 'Perda de peso moderada',
          description: 'Perda consistente de 0.75kg por semana',
          target: userWeight ? Math.max(userWeight - 8, 50) : 62,
          unit: 'kg',
          duration: 75,
          type: 'weight'
        },
        { 
          name: 'Ganho de massa muscular',
          description: 'Ganho gradual de 0.25kg por semana',
          target: userWeight ? userWeight + 3 : 70,
          unit: 'kg',
          duration: 84,
          type: 'weight'
        }
      ]
    },
    {
      id: 'water',
      name: 'Meta de Hidratação',
      description: 'Mantenha-se hidratado com metas diárias',
      icon: Droplet,
      color: 'bg-cyan-500',
      suggestions: [
        { 
          name: 'Hidratação Básica',
          description: '2L de água por dia para uma hidratação adequada',
          target: 2000,
          unit: 'ml',
          duration: 30,
          type: 'water',
          checkpoints: [500, 1000, 1500, 2000]
        },
        { 
          name: 'Hidratação Intermediária',
          description: '2.5L de água por dia para melhor performance',
          target: 2500,
          unit: 'ml',
          duration: 30,
          type: 'water',
          checkpoints: [600, 1200, 1800, 2500]
        },
        { 
          name: 'Hidratação Avançada',
          description: '3L de água por dia para atletas e alta atividade',
          target: 3000,
          unit: 'ml',
          duration: 30,
          type: 'water',
          checkpoints: [750, 1500, 2250, 3000]
        }
      ]
    },
    {
      id: 'protein',
      name: 'Meta de Proteína',
      description: 'Otimize seu consumo de proteína',
      icon: Target,
      color: 'bg-purple-500',
      suggestions: [
        { 
          name: 'Proteína Básica',
          description: '1.6g de proteína por kg de peso corporal',
          target: userWeight ? Math.round(userWeight * 1.6) : 100,
          unit: 'g',
          duration: 30,
          type: 'protein',
          distribution: [
            { meal: 'Café da manhã', percentage: 25 },
            { meal: 'Almoço', percentage: 35 },
            { meal: 'Lanche', percentage: 15 },
            { meal: 'Jantar', percentage: 25 }
          ]
        },
        { 
          name: 'Proteína Intermediária',
          description: '1.8g de proteína por kg de peso corporal',
          target: userWeight ? Math.round(userWeight * 1.8) : 120,
          unit: 'g',
          duration: 30,
          type: 'protein',
          distribution: [
            { meal: 'Café da manhã', percentage: 25 },
            { meal: 'Almoço', percentage: 35 },
            { meal: 'Lanche', percentage: 15 },
            { meal: 'Jantar', percentage: 25 }
          ]
        },
        { 
          name: 'Proteína Avançada',
          description: '2g de proteína por kg de peso corporal',
          target: userWeight ? Math.round(userWeight * 2) : 150,
          unit: 'g',
          duration: 30,
          type: 'protein',
          distribution: [
            { meal: 'Café da manhã', percentage: 25 },
            { meal: 'Almoço', percentage: 35 },
            { meal: 'Lanche', percentage: 15 },
            { meal: 'Jantar', percentage: 25 }
          ]
        }
      ]
    },
    {
      id: 'nutrition',
      name: 'Meta Nutricional',
      description: 'Melhore a qualidade da sua alimentação',
      icon: Apple,
      color: 'bg-green-500',
      suggestions: [
        { 
          name: 'Vegetais Diários',
          description: 'Consumir 3 porções de vegetais por dia',
          target: 3,
          unit: 'porções',
          duration: 30,
          type: 'nutrition',
          examples: ['Salada verde', 'Legumes cozidos', 'Vegetais crus']
        },
        { 
          name: 'Frutas Diárias',
          description: 'Consumir 2 frutas diferentes por dia',
          target: 2,
          unit: 'porções',
          duration: 30,
          type: 'nutrition',
          examples: ['Maçã', 'Banana', 'Laranja']
        },
        { 
          name: 'Fibras Diárias',
          description: 'Consumir 25g de fibras por dia',
          target: 25,
          unit: 'g',
          duration: 30,
          type: 'nutrition',
          sources: ['Aveia', 'Legumes', 'Frutas', 'Grãos integrais']
        }
      ]
    }
  ];

  const handleCreateGoal = async (suggestion: any) => {
    setIsCreating(true);
    setError(null);
    try {
      // Check if a goal with the same name and type already exists
      const existingGoal = goals?.find(goal => 
        goal.status === 'active' && 
        goal.type === selectedType &&
        goal.name.toLowerCase() === suggestion.name.toLowerCase()
      );
      
      if (existingGoal) {
        setError(`Você já tem uma meta ativa chamada "${suggestion.name}"`);
        return;
      }
      
      // Ensure all required fields are present
      const metadata = {
        checkpoints: suggestion.checkpoints || [],
        distribution: suggestion.distribution || [],
        examples: suggestion.examples || [],
        sources: suggestion.sources || [],
        isAutoUpdate: suggestion.type !== 'weight',
        startValue: suggestion.type === 'weight' ? user?.weight || 0 : 0,
        targetValue: suggestion.type === 'weight' ? suggestion.target || 0 : 0
      };
      
      // Create a complete goal object with all required fields
      await onCreateGoal({
        type: selectedType!,
        name: suggestion.name,
        description: suggestion.description,
        target: suggestion.target || 0,
        unit: suggestion.unit,
        frequency: 'daily',
        duration: suggestion.duration || 30,
        status: 'active',
        progress: 0,
        startDate: new Date().toISOString(),
        checkIns: {},
        metadata
      });
    } catch (error) {
      console.error('Error creating goal:', error);
    } finally {
      setIsCreating(false);
      setSelectedType(null);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-4 animate-shake">
          {error}
        </div>
      )}
      
      {!selectedType ? (
        <>
          <h2 className="text-xl font-semibold mb-4">Escolha o tipo de meta</h2>
          <div className="grid gap-4">
            {goalTypes.map((type) => {
              const Icon = type.icon;
              return (
                <motion.button
                  key={type.id}
                  onClick={() => setSelectedType(type.id as any)}
                  className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-14 h-14 ${type.color} rounded-xl flex items-center justify-center text-white`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-lg">{type.name}</h3>
                    <p className="text-gray-600">{type.description}</p>
                  </div>
                  <ChevronRight className="text-gray-400" size={20} />
                </motion.button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedType(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="rotate-180" size={20} />
            </button>
            <h2 className="text-xl font-semibold">
              {goalTypes.find(t => t.id === selectedType)?.name}
            </h2>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Sugestões de Metas</h3>
            {goalTypes
              .find(t => t.id === selectedType)
              ?.suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  onClick={() => handleCreateGoal(suggestion)}
                  disabled={isCreating}
                  className={`w-full p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-all text-left ${
                    isCreating ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <h4 className="font-medium text-lg mb-2">{suggestion.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {suggestion.description}
                  </p>
                  
                  {/* Meta-specific details */}
                  {suggestion.checkpoints && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Checkpoints Diários:</p>
                      <div className="flex gap-2">
                        {suggestion.checkpoints.map((checkpoint: number, i: number) => (
                          <div key={i} className="px-3 py-1 bg-cyan-50 rounded-full text-xs text-cyan-600">
                            {checkpoint}ml
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {suggestion.distribution && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Distribuição:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {suggestion.distribution.map((dist: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-gray-600">{dist.meal}</span>
                            <span className="font-medium">{dist.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {suggestion.examples && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Exemplos:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestion.examples.map((example: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-green-50 rounded-full text-xs text-green-600">
                            {example}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="text-sm text-gray-600">
                      Duração: {suggestion.duration} dias
                    </div>
                    {isCreating ? (
                      <div className="flex items-center gap-2 text-gray-400">
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-medium">Criando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-primary-500">
                        <Plus size={18} />
                        <span className="font-medium">Começar</span>
                      </div>
                    )}
                  </div>
                </motion.button>
              ))}
          </div>

          <div className="mt-6">
            <button
              onClick={() => setSelectedType(null)}
              className="w-full py-3 text-gray-600 hover:text-gray-800"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GoalCreator;