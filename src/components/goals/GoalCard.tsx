import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Calendar, Award, Check, Scale, Droplet, Apple, Trash2, MoreVertical } from 'lucide-react';
import { useUser } from '../../context/UserContext';
import type { CustomGoal } from '../../types/user';

interface GoalCardProps {
  goal: CustomGoal;
  onCheckIn: (value: number) => void;
  onUpdate: () => void;
  onDelete: () => void;
}

function GoalCard({ goal, onCheckIn, onUpdate, onDelete }: GoalCardProps) {
  const { user } = useUser();
  const today = new Date().toISOString().split('T')[0];
  const todayCheckIn = goal.checkIns[today];
  const [showActions, setShowActions] = useState(false);

  // Auto-update progress for linked metrics
  useEffect(() => {
    if (goal.status === 'completed' || goal.type === 'weight') return;
    
    if (!user) return;
    
    // Auto-update based on user data
    const dailyStats = user.dailyStats || {};
    const currentPlan = user.currentDietPlan;
    const dietGoals = user.dietGoals || {};

    let value = 0;
    let target = goal.target;

    switch (goal.type) {
      case 'water':
        value = dailyStats.waterIntake || 0;
        break;
      case 'protein':
        value = dailyStats.proteinConsumed || 0;
        // Use diet plan protein target if available
        if (currentPlan?.proteinTarget && dietGoals[goal.id]?.linkToDiet) {
          target = currentPlan.proteinTarget;
        }
        break;
      case 'nutrition':
        value = (dailyStats.completedMeals?.[today] || []).length;
        // Use diet plan meals count if available
        if (currentPlan?.meals && dietGoals[goal.id]?.linkToDiet) {
          target = currentPlan.meals.length;
        }
        break;
    }
    
    if (value > 0) {
      onCheckIn(value);
    }
  }, [goal, today, user, onCheckIn]);

  const getGoalIcon = () => {
    switch (goal.type) {
      case 'weight':
        return Scale;
      case 'water':
        return Droplet;
      case 'protein':
        return Target;
      case 'nutrition':
        return Apple;
      default:
        return Target;
    }
  };

  const getGoalColor = () => {
    switch (goal.type) {
      case 'weight':
        return 'bg-blue-500/10 text-blue-500';
      case 'water':
        return 'bg-cyan-500/10 text-cyan-500';
      case 'protein':
        return 'bg-purple-500/10 text-purple-500';
      case 'nutrition':
        return 'bg-green-500/10 text-green-500';
      default:
        return 'bg-primary-500/10 text-primary-500';
    }
  };

  const Icon = getGoalIcon();
  const colorClass = getGoalColor();

  return (
    <motion.div
      layout
      layoutId={goal.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mobile-card ${
        goal.status === 'completed'
          ? 'bg-gradient-to-br from-blue-500 to-blue-400 text-white shadow-lg'
          : ''
      }`}
    >
      {/* Background Decoration */}
      <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-white/10 blur-2xl" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center transform transition-transform hover:scale-110
            ${goal.status === 'completed' ? 'bg-white/30' : colorClass}
          `}>
            <Icon size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{goal.name}</h3>
            <p className={`text-sm ${goal.status === 'completed' ? 'text-white/80' : 'text-gray-500'}`}>
              {goal.description || `Meta ${goal.frequency}`}
            </p>
          </div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg relative"
          >
            <MoreVertical size={20} className="text-gray-500" />
            {showActions && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg py-1 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate();
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  Editar Meta
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  <span>Excluir Meta</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className={`text-sm ${goal.status === 'completed' ? 'text-white/80' : 'text-gray-500'}`}>
              Progresso
            </span>
            <span className="font-medium text-sm">
              {Math.round(goal.progress)}%
            </span>
          </div>
          <div className={`
            h-2 rounded-full overflow-hidden
            ${goal.status === 'completed' ? 'bg-white/30' : 'bg-gray-100'}
          `}>
            <div 
              className={`
                h-full transition-all duration-500 ease-out
                ${goal.status === 'completed'
                  ? 'bg-white'
                  : 'bg-gradient-to-r from-blue-500 to-blue-400'
                }
              `}
              style={{ width: `${goal.progress}%` }}
            />
          </div>
        </div>

        {/* Goal-specific Content */}
        {!todayCheckIn && goal.status !== 'completed' && (
          <div className="space-y-3">
            {/* Progress Details - Mobile Optimized */}
            {goal.metadata?.isAutoUpdate && (
              <div className="text-sm text-gray-600 mb-2">
                {goal.type === 'water' && 'Atualiza automaticamente com seu consumo de água'}
                {goal.type === 'protein' && 'Atualiza automaticamente com seu consumo de proteína'}
                {goal.type === 'nutrition' && 'Atualiza automaticamente com suas refeições completas'}
              </div>
            )}

            {goal.type === 'water' && goal.metadata?.checkpoints && (
              <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 mb-4">
                {goal.metadata.checkpoints.map((checkpoint: number, i: number) => (
                  <div 
                    key={i}
                    className="text-center p-2 bg-cyan-50 rounded-lg"
                  >
                    <span className="text-xs sm:text-sm font-medium text-cyan-600">
                      {checkpoint}ml
                    </span>
                  </div>
                ))}
              </div>
            )}

            {goal.type === 'protein' && goal.metadata?.distribution && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {goal.metadata.distribution.map((dist: any, i: number) => (
                  <div key={i} className="p-2 bg-purple-50 rounded-lg">
                    <p className="text-xs sm:text-sm text-purple-600">{dist.meal}</p>
                    <p className="text-xs sm:text-sm font-medium text-purple-700">{dist.percentage}%</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              {goal.type === 'weight' && !goal.metadata?.isAutoUpdate ? (
              <input
                type="number"
                placeholder={`Valor em ${goal.unit}`} 
                className="w-full sm:flex-1 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm text-blue-900 font-medium"
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value)) {
                    onCheckIn(value);
                  }
                }}
              />
              ) : (
                <div className="w-full sm:flex-1 px-3 py-2 text-xs sm:text-sm text-gray-500 bg-gray-50 rounded-lg">
                  Atualização automática
                </div>
              )}
              <button
                onClick={onUpdate}
                className="w-full sm:w-auto px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Editar
              </button>
            </div>
          </div>
        )}

        {/* Today's Check-in */}
        {todayCheckIn && (
          <div className="flex items-center justify-between mt-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-green-500" />
              <span className="text-sm font-medium text-blue-900">
                {todayCheckIn.value} {goal.unit}
              </span>
            </div>
            {todayCheckIn.mood && (
              <span className="text-2xl">
                {todayCheckIn.mood === 'great' ? '🤩' :
                 todayCheckIn.mood === 'good' ? '😊' :
                 todayCheckIn.mood === 'okay' ? '😐' : '😔'}
              </span>
            )}
          </div>
        )}

      </div>
    </motion.div>
  );
}

export default GoalCard;