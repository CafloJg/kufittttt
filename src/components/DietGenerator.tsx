import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Loader2, ChevronRight, Utensils, AlertCircle, WifiOff, X, Sparkles } from 'lucide-react';

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
  
  // Update progress stage every 30 seconds during generation
  useEffect(() => {
    if (!isGenerating) return;
    
    // Initial progress update
    setProgressStage(0);
    
    const interval = setInterval(() => {
      setProgressStage(prev => (prev + 1) % 4);
    }, 30000); // Update every 30 seconds instead of 60 seconds
    
    return () => clearInterval(interval);
  }, [isGenerating]);
  
  // Get appropriate message based on progress stage
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
    <div className="bg-white rounded-2xl p-8 shadow-lg relative overflow-hidden">
      {/* Header - Made larger and more prominent */}
      <div className="text-center mb-10">
        <div className="w-24 h-24 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Utensils className="text-primary-500" size={40} />
          <Sparkles className="text-primary-500 absolute top-2 right-2" size={20} />
        </div>
        <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
          Plano Alimentar Personalizado
        </h2>
        <p className="text-gray-600 max-w-sm mx-auto text-lg">
          Gere seu plano personalizado
        </p>
      </div>

      {/* Error Message */}
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

      {/* Generate Button */}
      <div className="relative mt-8">
        <motion.button
          onClick={onGenerate}
          disabled={isGenerating}
          className={`
            w-full py-6 rounded-xl font-bold text-xl relative overflow-hidden group shadow-lg
            ${isGenerating
              ? 'bg-gray-100 cursor-not-allowed'
              : 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white hover:shadow-xl transform hover:-translate-y-1 hover:scale-[1.02] animate-pulse-slow'
            } 
            transition-all duration-300 shadow-primary-500/20
          `}
          whileHover={{ scale: isGenerating ? 1 : 1.03 }}
          whileTap={{ scale: isGenerating ? 1 : 0.98 }}
          title={isGenerating ? 'Gerando plano alimentar...' : 'Clique para gerar seu plano alimentar'}
        >
          <span className="relative z-10 flex items-center justify-center gap-3">
            {isGenerating ? (
              <>
                <Loader2 size={28} className="animate-spin" />
                <span>Gerando Plano...</span>
              </>
            ) : (
              <div className="flex items-center justify-center gap-3 w-full">
                <RefreshCw size={28} className="group-hover:rotate-180 transition-transform duration-500" />
                <span className="text-center">GERAR PLANO ALIMENTAR</span>
                <ChevronRight size={28} className="group-hover:translate-x-1 transition-transform opacity-80" />
              </div>
            )}
          </span>
        </motion.button>
      </div>

      {/* Cancel Button */}
      {isGenerating && canCancel && onCancel && (
        <button
          onClick={onCancel}
          className="w-full mt-4 py-3 bg-gray-100 text-gray-600 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
        >
          <X size={18} />
          <span>Cancelar Geração</span>
        </button>
      )}

      {/* Info Text */}
      <p className="text-center text-base text-gray-500 mt-8">
        {isGenerating 
          ? <span className="animate-pulse font-medium">{getProgressMessage()}</span>
          : <span>O plano será gerado com base no seu perfil e preferências</span>
        }
      </p>
      {error && (
        <p className="text-center text-sm text-gray-400 mt-2">
          Se o erro persistir, tente novamente mais tarde
        </p>
      )}
    </div>
  );
}

export default DietGenerator;