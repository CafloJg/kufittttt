import React, { useState, useEffect, useRef } from 'react';
import { Droplet, Waves, Check, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUser } from '../context/UserContext';

interface WaterTrackerProps {
  className?: string;
}

export default function WaterTracker({ className = '' }: WaterTrackerProps) {
  const { user } = useUser();
  const [waterIntake, setWaterIntake] = useState<number>(user?.dailyStats?.waterIntake || 0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const waterGoal = user?.goals?.waterTarget || 2500; // Default water goal in ml
  const progress = Math.min(((waterIntake || 0) / waterGoal) * 100, 100);
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState(250);
  const [lastAddedAmount, setLastAddedAmount] = useState<number | null>(null);
  const updateInProgressRef = useRef(false);
  const [updateKey, setUpdateKey] = useState(Date.now());
  const [showAddedToast, setShowAddedToast] = useState(false);

  // Update water intake when user data changes
  useEffect(() => {
    if (user?.dailyStats?.waterIntake !== undefined) {
      // Only update if the value has changed to avoid unnecessary re-renders
      if (waterIntake !== user.dailyStats.waterIntake) {
        setWaterIntake(user.dailyStats.waterIntake);
      }
      
      // Force re-render when water intake changes
      setUpdateKey(Date.now());
    }
  }, [user?.dailyStats?.waterIntake, waterIntake]);

  // Calculate hydration status
  const getHydrationStatus = () => {
    if (progress >= 100) return { label: 'Ótimo!', color: 'text-green-500' };
    if (progress >= 75) return { label: 'Bom', color: 'text-blue-500' };
    if (progress >= 50) return { label: 'Regular', color: 'text-yellow-500' };
    if (progress >= 25) return { label: 'Precisa hidratar', color: 'text-orange-500' };
    return { label: 'Precisa hidratar', color: 'text-red-500' };
  };

  const hydrationStatus = getHydrationStatus();

  // Handle water intake update
  const handleWaterUpdate = async (amount: number) => {
    if (isUpdating || updateInProgressRef.current) return;
        
    updateInProgressRef.current = true; 
    setIsUpdating(true);
    setError(null);
    
    try {
      // Optimistically update UI
      setWaterIntake(prev => Math.max(0, prev + amount));
      setLastAddedAmount(amount);
      setShowAddedToast(true);
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowAddedToast(false);
      }, 2000);
      
      // Update water intake in Firestore
      if (user) {
        const userRef = doc(db, 'users', user.uid); 
        const currentWaterIntake = user.dailyStats?.waterIntake || 0;
        const newWaterIntake = currentWaterIntake + amount;
        
        try {
          // Use a transaction to ensure atomic updates
          await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
              throw new Error('User document not found');
            }
            
            const userData = userDoc.data();
            const currentStats = userData.dailyStats || {};
            const currentPlan = userData.currentDietPlan;
            const today = new Date().toISOString().split('T')[0];
            
            // Update user dailyStats
            transaction.update(userRef, {
              'dailyStats.waterIntake': newWaterIntake,
              'dailyStats.lastUpdated': new Date().toISOString(),
              'updatedAt': new Date().toISOString()
            });
            
            // Also update the currentDietPlan's dailyStats if it exists 
            if (currentPlan && currentPlan.dailyStats) {
              // Preserve existing completedMeals
              const completedMeals = currentPlan.dailyStats.completedMeals || {};
              
              transaction.update(userRef, {
                'currentDietPlan.dailyStats.waterIntake': newWaterIntake,
                'currentDietPlan.dailyStats.caloriesConsumed': currentPlan.dailyStats.caloriesConsumed || 0,
                'currentDietPlan.dailyStats.proteinConsumed': currentPlan.dailyStats.proteinConsumed || 0,
                'currentDietPlan.dailyStats.carbsConsumed': currentPlan.dailyStats.carbsConsumed || 0,
                'currentDietPlan.dailyStats.fatConsumed': currentPlan.dailyStats.fatConsumed || 0,
                'currentDietPlan.dailyStats.completedMeals': completedMeals,
                'currentDietPlan.lastUpdated': new Date().toISOString(),
                'currentDietPlan.dailyStats.lastUpdated': new Date().toISOString()
              });
            }
          });
        } catch (transactionError) {
          console.error('Error in water intake transaction:', transactionError);
          throw transactionError;
        }
        
        // Refresh user data to update dashboard
        if (user.refreshUserData) {
          try {
            await user.refreshUserData();
          } catch (refreshError) {
            console.warn('Error refreshing user data after water update:', refreshError);
          }
        }
      }
    } catch (err) {
      console.error('Error updating water intake:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar consumo de água');
      // Revert optimistic update
      setWaterIntake(user?.dailyStats?.waterIntake || 0);
    } finally {
      setIsUpdating(false);
      // Reset the ref after a short delay to prevent rapid re-clicks
      setTimeout(() => {
        updateInProgressRef.current = false;
      }, 300);
    }
  };

  // Debounced version of handleWaterUpdate to prevent rapid clicking
  const debouncedWaterUpdate = (amount: number) => {
    if (updateInProgressRef.current) return;

    handleWaterUpdate(amount);
  };

  return (
    <div className={`${className} relative w-full h-full max-w-xs mx-auto`} key={updateKey}>
      {/* Added amount toast */}

      <div className="flex flex-col space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Droplet className="text-blue-500" size={20} />
            </div>
            <h3 className="text-lg font-semibold">Hidratação</h3>
          </div>
          <p className="text-xl font-semibold text-blue-500">
            {(waterIntake || 0)} <span className="text-sm font-semibold text-gray-500">ml</span>
          </p>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="h-3 bg-blue-100 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all shadow-sm rounded-full"
              initial={{ width: `${Math.max(0, progress - 5)}%` }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between items-center mt-1 font-medium">
            <span className="text-sm font-semibold text-red-500">Precisa hidratar</span>
            <span className="text-sm font-semibold">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Custom amount input */}
        <AnimatePresence>
          {showCustomAmount && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-blue-50 p-2 rounded-xl">
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(parseInt(e.target.value))}
                  className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer mb-1"
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700 font-medium">{customAmount}ml</span>
                  <button
                    onClick={() => {
                      handleWaterUpdate(customAmount);
                      // Only hide after successful update
                      setShowCustomAmount(false);
                    }}
                    disabled={isUpdating || updateInProgressRef.current}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Add Buttons with improved design */}
      <div className="grid grid-cols-4 gap-1 mt-2">
        {[200, 350, 500].map(amount => (
          <motion.button
            key={amount}
            onClick={() => debouncedWaterUpdate(amount)}
            disabled={isUpdating || updateInProgressRef.current}
            whileTap={{ scale: 0.95 }}
            className="py-2 bg-blue-500 text-white rounded-lg transition-colors flex items-center justify-center hover:bg-blue-600 text-sm font-medium touch-manipulation"
            aria-label={`Adicionar ${amount}ml de água`}
          >
            <span>{amount}ml</span>
          </motion.button>
        ))}
        
        <motion.button
          onClick={() => setShowCustomAmount(!showCustomAmount)}
          whileTap={{ scale: 0.95 }}
          className="py-2 bg-gray-200 text-blue-500 rounded-lg transition-colors flex items-center justify-center hover:bg-gray-300 text-sm font-medium touch-manipulation"
        >
          <List size={16} className="mr-1" />
          <span>Outro</span>
        </motion.button>
      </div>
    </div>
  );
}