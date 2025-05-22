import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Scale, Calendar, Target, Activity, Trophy, Plus, Award, Apple, Droplet, X } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import GoalCard from '../components/goals/GoalCard';
import GoalCreator from '../components/goals/GoalCreator';
import { useUser } from '../context/UserContext';
import { useGoals } from '../context/GoalsContext';
import LoadingIndicator from '../components/ui/LoadingIndicator';

function Goals() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { goals, isLoading, error, createGoal, updateGoalProgress, deleteGoal } = useGoals();
  const [showGoalCreator, setShowGoalCreator] = useState(false);

  const handleCreateGoal = async (goalData: any) => {
    try {
      const metadata: Record<string, any> = goalData.metadata || {};
      
      // Adicionar propriedades condicionalmente apenas se necessário
      if (goalData.type === 'weight') {
        metadata.startValue = user?.weight || 0; 
        metadata.targetValue = goalData.target || 0;
      }
      if (goalData.type !== 'weight') {
        metadata.isAutoUpdate = true;
      }
      
      const completeGoalData = {
        ...goalData,
        metadata,
        target: goalData.target || 0,
        unit: goalData.unit || '',
        frequency: goalData.frequency || 'daily',
        duration: goalData.duration || 30,
        status: 'active',
        progress: 0,
        startDate: new Date().toISOString(),
        checkIns: {}
      };
      await createGoal(completeGoalData);
      setShowGoalCreator(false);
    } catch (err) {
      console.error('Error creating goal:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingIndicator size="lg" centered text="Carregando metas" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main 
        className="flex-1 overflow-y-auto pb-[max(4rem,env(safe-area-inset-bottom))]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="max-w-lg mx-auto px-4 py-6 relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Minhas Metas</h1>
              <p className="text-gray-600">Acompanhe seu progresso</p>
            </div>
            <button
              onClick={() => setShowGoalCreator(true)}
              className="w-12 h-12 bg-primary-500 text-white rounded-xl flex items-center justify-center hover:bg-primary-600 transition-colors"
            >
              <Plus size={24} />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-6">
              {error}
            </div>
          )}

          {showGoalCreator && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full flex flex-col max-h-[90vh]">
                <div className="p-6 relative overflow-y-auto flex-1">
                  <button
                    onClick={() => setShowGoalCreator(false)}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
                  >
                    <X size={20} className="text-gray-500" />
                  </button>
                  <GoalCreator
                    onCreateGoal={handleCreateGoal}
                    userWeight={user?.weight}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {goals
              ?.filter(goal => goal.status === 'active')
              .map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onCheckIn={(value) => updateGoalProgress(goal.id, value)}
                  onUpdate={() => {/* TODO: Implement goal update */}}
                  onDelete={() => deleteGoal(goal.id)}
                />
              ))}

            {(!goals || goals.length === 0) && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="text-primary-500" size={32} />
                </div>
                <h3 className="text-lg font-medium mb-2">Nenhuma meta ativa</h3>
                <p className="text-gray-600 mb-6">
                  Comece criando sua primeira meta
                </p>
                <button
                  onClick={() => setShowGoalCreator(true)}
                  className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors"
                >
                  Criar Meta
                </button>
              </div>
            )}
          </div>

          {goals?.some(goal => goal.status === 'completed') && (
            <div className="mt-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-secondary-500/10 to-blue-500/10 rounded-3xl -z-10 animate-pulse-slow" />
              <div className="absolute -inset-1 bg-gradient-to-r from-primary-500/20 via-secondary-500/20 to-blue-500/20 blur-2xl -z-20" />
              <div className="absolute inset-0 backdrop-blur-xl rounded-3xl -z-10 bg-white/40" />
              
              <div className="flex items-center gap-6 mb-8 p-8 pb-0 relative">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-blue-500 rounded-3xl blur opacity-40 group-hover:opacity-75 transition duration-1000"></div>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center transform group-hover:rotate-12 transition-all duration-300 relative">
                    <Award className="text-white" size={32} />
                    <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-br from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                    Metas Concluídas
                  </h2>
                  <p className="text-sm font-medium bg-gradient-to-r from-gray-600 to-gray-500 bg-clip-text text-transparent">
                    {goals.filter(goal => goal.status === 'completed').length} conquistas
                  </p>
                </div>
              </div>
              
              <div className="grid gap-6 p-8 pt-0 relative">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent"></div>
                {goals
                  .filter(goal => goal.status === 'completed')
                  .map(goal => (
                    <motion.div
                      key={goal.id} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="relative group transform transition-all duration-300 hover:-translate-y-1"
                    >
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-blue-500 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/90 rounded-2xl backdrop-blur-sm"></div>
                      <GoalCard
                        goal={goal}
                        onCheckIn={() => {}}
                        onUpdate={() => {/* TODO: Implement goal update */}}
                        onDelete={() => deleteGoal(goal.id)}
                      />
                    </motion.div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

export default Goals;