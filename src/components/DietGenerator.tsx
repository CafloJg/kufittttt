import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2, ChevronRight, Utensils, AlertCircle, WifiOff, X, Sparkles, Target } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

interface DietGeneratorProps {
  onGenerate: () => void;
  isGenerating: boolean;
  generationMessage?: string | null;
  error?: string | null;
  onCancel?: () => void;
  canCancel?: boolean;
}

function DietGenerator({ 
  onGenerate, 
  isGenerating, 
  generationMessage, 
  error, 
  onCancel,
  canCancel = false
}: DietGeneratorProps) {
  const [progressStage, setProgressStage] = useState(0);
  const { user } = useUser();
  const navigate = useNavigate();

  const hasActiveGoal = user?.goals?.customGoals?.some(goal => goal.status === 'active');

  useEffect(() => {
    if (!isGenerating) return;
    
    setProgressStage(0);
    
    const interval = setInterval(() => {
      setProgressStage(prev => (prev + 1) % 4);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isGenerating]);
  
  const getProgressMessage = () => {
    if (generationMessage) return generationMessage;
    
    const messages = [
      'Isso pode levar até 1 minuto...',
      'Estamos criando seu plano personalizado com base no seu perfil...',
      'Quase lá! Finalizando seu plano. Obrigado pela paciência...',
      'Estamos nos certificando de que seu plano está perfeito. Isso pode levar mais alguns minutos...'
    ];
    
    return messages[progressStage];
  };
  
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Utensils className="text-primary-500" size={28} />
        </div>
        <h2 className="text-xl font-semibold mb-1 text-gray-800">
          Plano Alimentar Personalizado
        </h2>
        <p className="text-gray-600 max-w-sm mx-auto text-sm">
          Gere seu plano personalizado
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-500 rounded-xl text-sm">
          <div className="flex items-start gap-2 animate-shake">
            {error.toLowerCase().includes('conexão') || error.toLowerCase().includes('internet') ? (
              <WifiOff size={20} className="flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium">{error}</p>
              <p className="text-xs mt-1 text-red-400">
                {error.toLowerCase().includes('conexão') || error.toLowerCase().includes('internet')
                  ? 'Verifique sua conexão com a internet e tente novamente.'
                  : 'Tente novamente em alguns instantes. Se o problema persistir, reinicie o aplicativo.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {!hasActiveGoal ? (
        <div className="text-center p-4 border border-orange-200 bg-orange-50 rounded-xl">
          <Target size={24} className="text-orange-500 mx-auto mb-3" />
          <h3 className="font-semibold text-orange-700 mb-2">Defina uma Meta Primeiro</h3>
          <p className="text-sm text-orange-600 mb-4">
            Para gerar um plano alimentar personalizado, você precisa ter pelo menos uma meta ativa (ex: meta de peso).
          </p>
          <button 
            onClick={() => navigate('/goals')} 
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Ir para Metas
          </button>
        </div>
      ) : (
        <div className="relative mt-4">
          <motion.button
            onClick={onGenerate}
            disabled={isGenerating}
            className={`
              w-full py-4 rounded-xl font-semibold text-base relative overflow-hidden group shadow-md
              ${isGenerating 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700'
              } 
              transition-all duration-200
            `}
            whileHover={{ scale: isGenerating ? 1 : 1.02 }}
            whileTap={{ scale: isGenerating ? 1 : 0.98 }}
            title={isGenerating ? 'Gerando plano alimentar...' : 'Clique para gerar seu plano alimentar'}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={20} />
                  <span>Gerar Plano Alimentar</span>
                </>
              )}
            </span>
          </motion.button>
        </div>
      )}

      {hasActiveGoal && isGenerating && canCancel && onCancel && (
        <button
          onClick={onCancel}
          className="w-full mt-3 py-3 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors text-sm"
        >
          <X size={16} />
          <span>Cancelar</span>
        </button>
      )}

      <p className="text-center text-sm text-gray-500 mt-6">
        {isGenerating 
          ? <span className="animate-pulse font-medium">{getProgressMessage()}</span>
          : hasActiveGoal 
            ? <span>O plano será gerado com base no seu perfil e metas</span>
            : null
        }
      </p>
      {error && (
        <p className="text-center text-xs text-gray-400 mt-2">
          Se o erro persistir, tente novamente mais tarde
        </p>
      )}
    </div>
  );
}

export default DietGenerator;