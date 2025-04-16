import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, WifiOff, X, RefreshCw, AlertTriangle, Info } from 'lucide-react';

interface ErrorToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  isNetworkError?: boolean;
  onRetry?: () => void;
  autoClose?: boolean;
  duration?: number;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export function ErrorToast({
  message,
  isVisible,
  onClose,
  isNetworkError = false,
  onRetry,
  severity = 'error',
  autoClose = true,
  duration = 5000
}: ErrorToastProps) {
  const [progress, setProgress] = useState(100);
  
  useEffect(() => {
    if (!isVisible || !autoClose) return;
    
    // Reset progress when toast becomes visible
    setProgress(100);
    
    // Set up interval to decrease progress
    const interval = setInterval(() => {
      setProgress(prev => Math.max(prev - 1, 0));
    }, duration / 100);
    
    // Set up timeout to close toast
    const timeout = setTimeout(() => {
      onClose();
    }, duration);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isVisible, autoClose, duration, onClose]);
  
  const getIcon = () => {
    if (isNetworkError) return <WifiOff className="h-6 w-6 text-red-500" />;
    
    switch (severity) {
      case 'info':
        return <Info className="h-6 w-6 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'critical':
        return <AlertCircle className="h-6 w-6 text-red-600 animate-pulse" />;
      default:
        return <AlertCircle className="h-6 w-6 text-red-500" />;
    }
  };
  
  const getBackgroundColor = () => {
    if (isNetworkError) return 'bg-red-500';
    
    switch (severity) {
      case 'info':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-600';
      default:
        return 'bg-red-500';
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] inset-x-0 px-4 z-50 pointer-events-none"
        >
          <div className={`max-w-md mx-auto ${getBackgroundColor()} text-white rounded-lg shadow-lg overflow-hidden pointer-events-auto`}>
            <div className="p-4 flex items-start">
              <div className="flex-shrink-0 mr-3">
                {getIcon()}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {isNetworkError ? 'Erro de conexão' : 'Erro'}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {message}
                </p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-2 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600"
                  >
                    <RefreshCw size={14} />
                    <span>Tentar novamente</span>
                  </button>
                )}
              </div>
              <button 
                onClick={onClose}
                className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Progress bar for auto-dismiss */}
            {autoClose && (
              <div className="h-1 bg-gray-100">
                <div 
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}