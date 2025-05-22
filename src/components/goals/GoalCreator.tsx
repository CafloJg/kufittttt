import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Droplet, Scale, Activity, Plus, ChevronRight, TrendingUp, Apple } from 'lucide-react';
import type { CustomGoal } from '../../types/user';
import { useUser } from '../../context/UserContext';
import { useGoals } from '../../context/GoalsContext';

interface GoalSuggestion {
  name: string;
  description: string;
  target: number;
  unit: string;
  duration: number;
  type: 'weight' | 'water' | 'protein' | 'nutrition';
  checkpoints?: number[];
  distribution?: Array<{ meal: string; percentage: number }>;
  examples?: string[];
  sources?: string[];
}

interface GoalTypeDefinition {
  id: 'weight' | 'water' | 'protein' | 'nutrition';
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  suggestions: GoalSuggestion[];
}

interface GoalCreatorProps {
  onCreateGoal: (goal: Partial<CustomGoal>) => Promise<void>;
  userWeight?: number;
}

function GoalCreator({ onCreateGoal, userWeight }: GoalCreatorProps) {
  const { user } = useUser();
  const { goals } = useGoals();
  const [selectedType, setSelectedType] = useState<GoalTypeDefinition['id'] | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goalTypes: GoalTypeDefinition[] = [
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

  const handleCreateGoal = async (suggestion: GoalSuggestion) => {
    setIsCreating(true);
    setError(null);
    try {
      const existingGoal = goals?.find(goal => 
        goal.status === 'active' && 
        goal.type === suggestion.type &&
        goal.name.toLowerCase() === suggestion.name.toLowerCase()
      );
      
      if (existingGoal) {
        setError(`Você já tem uma meta ativa chamada "${suggestion.name}"`);
        setIsCreating(false);
        return;
      }
      
      const metadata: Record<string, any> = {
        checkpoints: suggestion.checkpoints || [],
        distribution: suggestion.distribution || [],
        examples: suggestion.examples || [],
        sources: suggestion.sources || [],
        isAutoUpdate: suggestion.type !== 'weight',
      };
      
      if (suggestion.type === 'weight') {
        metadata.startValue = user?.weight || 0;
        metadata.targetValue = suggestion.target || 0;
      }
      
      const goalTypeForCustomGoal = suggestion.type === 'water' ? 'hydration' : suggestion.type;

      await onCreateGoal({
        type: goalTypeForCustomGoal as CustomGoal['type'],
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
      setSelectedType(null);
    } catch (error) {
      console.error('Error creating goal:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido ao criar meta');
    } finally {
      setIsCreating(false);
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
                  onClick={() => setSelectedType(type.id as GoalTypeDefinition['id'])}
                  className="flex items-center gap-4 p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-10 h-10 ${type.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="text-white" size={20} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{type.name}</h3>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                  <ChevronRight size={20} className="ml-auto text-gray-400" />
                </motion.button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <button 
            onClick={() => setSelectedType(null)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            <ChevronRight className="rotate-180" size={20} />
            Voltar
          </button>
          <h2 className="text-xl font-semibold mb-4">
            Sugestões para {goalTypes.find(t => t.id === selectedType)?.name}
          </h2>
          <div className="space-y-4 overflow-y-auto pr-1">
            {goalTypes
              .find(t => t.id === selectedType)
              ?.suggestions.map((suggestion, index) => (
                <motion.div
                  key={index}
                  className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold flex-1 mr-2">{suggestion.name}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateGoal(suggestion);
                      }}
                      disabled={isCreating}
                      className="flex items-center gap-1 text-sm text-primary-500 font-medium hover:text-primary-600 disabled:opacity-50 disabled:cursor-wait shrink-0"
                    >
                      {isCreating ? (
                        <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
                      ) : (
                        <Plus size={16} />
                      )}
                      Começar
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 mb-3">{suggestion.description}</p>
                  {suggestion.checkpoints && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 font-medium mb-1">Checkpoints Diários:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestion.checkpoints.map((cp: number) => (
                          <span key={cp} className="text-xs bg-cyan-50 text-cyan-600 px-2 py-0.5 rounded-full font-medium">
                            {cp}{suggestion.unit || 'ml'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {suggestion.distribution && (
                     <div className="mt-2">
                       <p className="text-xs text-gray-500 font-medium mb-1">Distribuição:</p>
                       <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                         {suggestion.distribution.map((dist, i) => (
                           <div key={i} className="flex justify-between text-xs">
                             <span className="text-gray-600">{dist.meal}</span>
                             <span className="font-medium">{dist.percentage}%</span>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                   {suggestion.examples && (
                     <div className="mt-2">
                       <p className="text-xs text-gray-500 font-medium mb-1">Exemplos:</p>
                       <div className="flex flex-wrap gap-2">
                         {suggestion.examples.map((example, i) => (
                           <span key={i} className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                             {example}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}
                  {suggestion.duration && (
                     <p className="text-xs text-gray-500 mt-3">Duração: {suggestion.duration} dias</p>
                  )}
                </motion.div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default GoalCreator;