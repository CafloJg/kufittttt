import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { Activity, Calendar, Coins, TrendingUp, Award, Star, Trophy, Target, Info } from 'lucide-react';
import type { UserProfile } from '../types/user';
import { resetDailyStats } from '../utils/dailyReset';


interface DailyCheckInProps {
  userData?: UserProfile;
  onCheckIn: () => void;
}

function DailyCheckIn({ userData, onCheckIn }: DailyCheckInProps) {
  // Early return with loading state if userData is not available
  if (!userData) {
    return (
      <div className="mobile-card p-6 bg-white rounded-3xl shadow-lg">
        <div className="flex items-center justify-center py-8">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-center text-gray-500">Carregando informações do usuário...</p>
      </div>
    );
  }

  const { user } = useUser();
  const [isChecking, setIsChecking] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [canCheck, setCanCheck] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [timeUntilNextCheck, setTimeUntilNextCheck] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);
  const [mood, setMood] = useState<'great' | 'good' | 'okay' | 'bad' | null>(null);
  const [dailyTip, setDailyTip] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const checkInInProgressRef = useRef(false);

  // Função para verificar se é o mesmo dia
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  useEffect(() => {
    const checkAvailability = () => {
      const now = new Date();

      const lastCheckInString = userData?.dailyStreak?.lastCheckIn;
      if (!lastCheckInString) {
        setCanCheck(true);
        setIsCompleted(false);
        return;
      }

      const lastCheckDate = new Date(lastCheckInString);
      const canCheckIn = !isSameDay(lastCheckDate, now) && !checkInInProgressRef.current;
      const completedToday = isSameDay(lastCheckDate, now);
      
      setCanCheck(canCheckIn);
      setIsCompleted(completedToday);

      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 1, 0, 0);
      
      const timeLeft = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeUntilNextCheck(`${hours}h ${minutes}m`);
    };

    checkAvailability();
    const interval = setInterval(checkAvailability, 60000);
    
    return () => clearInterval(interval);
  }, [userData?.dailyStreak?.lastCheckIn]);

  useEffect(() => {
    // Generate personalized daily tip
    const tips = [
      'Beba água regularmente ao longo do dia',
      'Inclua proteína em todas as refeições',
      'Priorize alimentos integrais',
      'Faça pequenas pausas para se movimentar'
    ];
    
    // Select tip based on user's goals and progress
    const tipIndex = Math.floor(Math.random() * tips.length);
    setDailyTip(tips[tipIndex]);
  }, []);

  const calculateReward = () => {
    let coins = 10; // Base reward
    const currentStreak = userData?.dailyStreak?.currentStreak || 0;
    if (currentStreak >= 30) coins += 20;
    else if (currentStreak >= 7) coins += 10;
    else if (currentStreak >= 3) coins += 5;
    
    return coins;
  };

  // Função de check-in SIMPLIFICADA
  const handleCheckIn = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user || isChecking || isCompleted || checkInInProgressRef.current || !navigator.onLine) {
      if (!navigator.onLine) {
        setError('Você está offline. Verifique sua conexão com a internet e tente novamente.');
      } else {
        console.log(`Cannot check in: user=${!!user}, isCompleted=${isCompleted}, isChecking=${isChecking}, checkInInProgress=${checkInInProgressRef.current}`);
      }
      return;
    }
    
    checkInInProgressRef.current = true;
    setIsChecking(true);
    setError(null);
    
    try {
      // Chamar APENAS a função passada pelo pai (Dashboard)
      await onCheckIn(); 
      
      // UI Update otimista (pode ser mantido ou removido dependendo do fluxo desejado)
      setIsCompleted(true); 
      setEarnedCoins(calculateReward());
      setShowReward(true); 
      
    } catch (error) {
      console.error('Error during check-in:', error);
      setError(error instanceof Error ? error.message : 'Erro ao fazer check-in. Tente novamente.');
      // Reverter UI Otimista se necessário
      setIsCompleted(false);
      setShowReward(false);
    } finally {
      setIsChecking(false);
      setTimeout(() => {
        checkInInProgressRef.current = false;
      }, 500); 
    }
  };

  const handleMoodSelection = async (selectedMood: typeof mood) => {
    setMood(selectedMood);
    setShowReward(false);
    
    // In a real implementation, this would update the mood in the database
    // For now, we'll just show the celebration screen
    setShowCelebration(true);
  };

  if (showCelebration) {
    return (
      <div className="mobile-card p-6 glass-morphism">
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6 transform hover:rotate-12 transition-transform animate-bounce-subtle">
            <Trophy className="text-primary-500" size={40} />
          </div>
          <h3 className="text-2xl font-semibold mb-3">Parabéns!</h3>
          <p className="text-gray-600 mb-6">
            Você atingiu uma sequência incrível de check-ins!
          </p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-primary-50 rounded-xl">
              <Star className="text-primary-500 mx-auto mb-2" size={24} />
              <p className="text-sm font-medium">Sequência</p>
              <p className="text-xl font-bold text-primary-500">
                {userData?.dailyStreak?.currentStreak ?? 0} Dias
              </p>
            </div>
            <div className="p-4 bg-primary-50 rounded-xl">
              <Trophy className="text-primary-500 mx-auto mb-2" size={24} />
              <p className="text-sm font-medium">Moedas</p>
              <p className="text-xl font-bold text-primary-500">+{earnedCoins}</p>
            </div>
            <div className="p-4 bg-primary-50 rounded-xl">
              <Target className="text-primary-500 mx-auto mb-2" size={24} />
              <p className="text-sm font-medium">Próxima Meta</p>
              <p className="text-xl font-bold text-primary-500">
                {(userData?.dailyStreak?.currentStreak ?? 0) >= 30 ? '90' : (userData?.dailyStreak?.currentStreak ?? 0) >= 7 ? '30' : '7'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCelebration(false)}
            className="w-full bg-primary-500 text-white rounded-xl py-3 hover:bg-primary-600 transition-colors"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  if (showReward) {
    return (
      <div className="mobile-card p-6 glass-morphism">
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Award className="text-primary-500" size={40} />
          </div>
          <h3 className="text-2xl font-semibold mb-3">Check-in Concluído!</h3>
          <p className="text-gray-600 mb-6">Como você está se sentindo hoje?</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => handleMoodSelection('great')}
              className="p-4 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
            >
              <span className="text-2xl mb-2">🤩</span>
              <p className="font-medium">Ótimo</p>
            </button>
            <button
              onClick={() => handleMoodSelection('good')}
              className="p-4 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
            >
              <span className="text-2xl mb-2">😊</span>
              <p className="font-medium">Bem</p>
            </button>
            <button
              onClick={() => handleMoodSelection('okay')}
              className="p-4 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
            >
              <span className="text-2xl mb-2">😐</span>
              <p className="font-medium">Normal</p>
            </button>
            <button
              onClick={() => handleMoodSelection('bad')}
              className="p-4 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
            >
              <span className="text-2xl mb-2">😔</span>
              <p className="font-medium">Não muito bem</p>
            </button>
          </div>

          {/* Daily Tip */}
          <div className="p-4 bg-primary-50 rounded-xl mb-6">
            <p className="text-sm font-medium text-primary-500 mb-2">Dica do Dia</p>
            <p className="text-gray-600">{dailyTip}</p>
          </div>
        
          <div className="inline-flex items-center gap-2 bg-primary-50 px-4 py-2 rounded-xl text-primary-500 w-full justify-center">
            <TrendingUp size={20} />
            <span className="font-medium">
              Sequência: <span className="font-semibold">{userData?.dailyStreak?.currentStreak || 0} dias</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-card p-5 bg-white rounded-3xl shadow-lg hardware-accelerated">
      <div className="relative z-10">
        {/* Info Alert */}
        {!isCompleted && (
          <div className="mb-5 p-4 bg-blue-50/95 backdrop-blur-sm rounded-2xl shadow-sm">
            <div className="flex items-start gap-4">
              <Info className="text-blue-500 flex-shrink-0" size={24} />
              <div>
                <p className="text-lg text-blue-600 font-semibold mb-3">Importante</p>
                <p className="text-blue-600 text-base leading-relaxed">
                  1. Faça check-in para reiniciar refeições<br />
                  2. Configure suas metas na aba Metas<br />
                  3. Gere seu plano alimentar personalizado
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center transform hover:rotate-12 transition-transform">
              <Calendar className="text-pink-500" size={28} />
              {canCheck && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold mb-1">Check-in Diário</h3>
              <p className="text-sm text-gray-600">
                Sequência: <span className="font-semibold">{userData?.dailyStreak?.currentStreak || 0} dias</span>
              </p>
              <p className="text-sm text-gray-600">•</p>
              <p className="text-sm text-gray-600">{calculateReward()} KiiCoins por check-in</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-primary-50/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-md">
            <Coins className="text-primary-500" size={18} />
            <span className="font-medium">{userData.kiiCoins?.balance || 0}</span>
          </div>
        </div>

        <button
          onClick={handleCheckIn}
          disabled={!canCheck || isChecking}
          className={`w-full py-6 rounded-2xl relative transition-all ${
            canCheck
              ? 'bg-pink-500 text-white hover:bg-pink-600 shadow-lg hover:shadow-xl active:bg-pink-700 cursor-pointer'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Award size={24} className={canCheck ? 'animate-pulse-slow' : ''} />
            <span className="font-medium">
              {error ? error : isChecking
                ? 'Processando...' 
                : canCheck
                  ? 'Fazer Check-in e Reiniciar Refeições'
                  : `Próximo check-in em ${timeUntilNextCheck}`}
            </span>
          </div>
          {isResetting && (
            <div className="absolute inset-0 bg-black/10 rounded-lg flex items-center justify-center">
              <span className="text-sm text-white">Reiniciando refeições...</span>
            </div>
          )}
        </button>
        
        {/* Instructions */}
        {canCheck && (
          <div className="mt-6 p-4 bg-gray-50 rounded-2xl space-y-3">
            <h4 className="text-lg font-semibold text-gray-700">Como funciona:</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-pink-500 font-medium text-lg">1</span>
                </div>
                <p className="text-gray-600 text-base">Faça check-in diário para reiniciar suas refeições</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-pink-500 font-medium text-lg">2</span>
                </div>
                <p className="text-gray-600 text-base">Configure suas metas na aba Metas</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-pink-500 font-medium text-lg">3</span>
                </div>
                <p className="text-gray-600 text-base">Gere seu plano alimentar personalizado</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyCheckIn;