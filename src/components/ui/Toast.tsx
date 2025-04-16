import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, AlertTriangle, Info, X, CheckCircle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  /**
   * Tipo do toast
   * @default 'info'
   */
  type?: ToastType;
  
  /**
   * Mensagem do toast
   */
  message: string;
  
  /**
   * Se o toast está visível
   */
  isVisible: boolean;
  
  /**
   * Callback para fechar o toast
   */
  onClose: () => void;
  
  /**
   * Se deve fechar automaticamente
   * @default true
   */
  autoClose?: boolean;
  
  /**
   * Duração em ms antes de fechar automaticamente
   * @default 5000
   */
  duration?: number;
  
  /**
   * Ação adicional (botão)
   */
  action?: React.ReactNode;
  
  /**
   * Posição do toast
   * @default 'bottom'
   */
  position?: 'top' | 'bottom' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Componente de toast reutilizável
 */
export function Toast({
  type = 'info',
  message,
  isVisible,
  onClose,
  autoClose = true,
  duration = 5000,
  action,
  position = 'bottom',
  ...props
}: ToastProps) {
  const [progress, setProgress] = useState(100);
  
  // Fechar automaticamente após a duração
  useEffect(() => {
    if (!isVisible || !autoClose) return;
    
    // Resetar progresso quando o toast se torna visível
    setProgress(100);
    
    // Configurar intervalo para diminuir o progresso
    const interval = setInterval(() => {
      setProgress(prev => Math.max(prev - 1, 0));
    }, duration / 100);
    
    // Configurar timeout para fechar o toast
    const timeout = setTimeout(() => {
      onClose();
    }, duration);
    
    // Limpar timers
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isVisible, autoClose, duration, onClose]);
  
  // Obter ícone com base no tipo
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };
  
  // Obter cor de fundo com base no tipo
  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50';
      case 'error':
        return 'bg-red-50';
      case 'warning':
        return 'bg-yellow-50';
      case 'info':
      default:
        return 'bg-blue-50';
    }
  };
  
  // Obter cor do texto com base no tipo
  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
      default:
        return 'text-blue-800';
    }
  };
  
  // Obter cor da barra de progresso com base no tipo
  const getProgressColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
      default:
        return 'bg-blue-500';
    }
  };
  
  // Obter classes de posição
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'top-4 inset-x-0 flex justify-center items-start';
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom':
      default:
        return 'bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] inset-x-0 flex justify-center items-end';
    }
  };
  
  // Variantes de animação
  const variants = {
    initial: {
      opacity: 0,
      y: position.includes('top') ? -20 : 20,
      scale: 0.95
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1
    },
    exit: {
      opacity: 0,
      y: position.includes('top') ? -20 : 20,
      scale: 0.95
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <div className={`fixed z-50 ${getPositionClasses()}`}>
          <motion.div
            initial="initial"
            animate="animate"
            exit="exit"
            variants={variants}
            className={`${getBackgroundColor()} ${getTextColor()} rounded-lg shadow-lg overflow-hidden max-w-md w-full pointer-events-auto`}
            {...props}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {getIcon()}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium">
                    {message}
                  </p>
                  {action && (
                    <div className="mt-2">
                      {action}
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    onClick={onClose}
                  >
                    <span className="sr-only">Fechar</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Barra de progresso */}
            {autoClose && (
              <div className="h-1 w-full bg-gray-200">
                <div
                  className={`h-full ${getProgressColor()} transition-all duration-300`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}