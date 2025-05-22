import React, { ComponentType, useState, useEffect } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { ErrorFallback } from './ErrorFallback';
import { useToast } from '../../context/ToastContext';
import { reportError } from '../../utils/errorUtils';

interface WithErrorBoundaryOptions {
  fallback?: React.ComponentType<FallbackProps>;
  onError?: (error: Error, info: { componentStack: string }) => void;
  onReset?: () => void;
  resetKeys?: any[];
  context?: string;
  showToast?: boolean;
}

/**
 * Higher-Order Component para adicionar tratamento de erros a qualquer componente
 * @param Component O componente a ser envolvido
 * @param options Opções de configuração do boundary error
 * @returns O componente envolvido com proteção contra erros não tratados
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  const {
    fallback = ErrorFallback,
    onError,
    onReset,
    resetKeys = [],
    context = Component.displayName || Component.name || 'Componente',
    showToast = true
  } = options;

  const displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  
  const ComponentWithErrorBoundary = (props: P) => {
    const toast = useToast();
    const [key, setKey] = useState(0);
    
    // Reiniciar o componente
    const handleReset = () => {
      setKey(prev => prev + 1);
      onReset?.();
    };
    
    // Tratar erros não capturados
    const handleError = (error: Error, info: { componentStack: string }) => {
      console.error(`Erro em ${context}:`, error);
      console.error('Component stack:', info.componentStack);
      
      // Reportar o erro para analytics
      reportError(error, {
        context: `Componente: ${context}`,
        metadata: {
          componentStack: info.componentStack,
          props: JSON.stringify(props)
        }
      });
      
      // Mostrar toast de erro
      if (showToast) {
        toast.error({
          title: `Erro em ${context}`,
          message: error.message || 'Ocorreu um erro inesperado',
          error,
          action: {
            label: 'Recarregar',
            onClick: handleReset
          }
        });
      }
      
      // Chamar o callback de erro personalizado
      onError?.(error, info);
    };
    
    return (
      <ErrorBoundary
        key={key}
        FallbackComponent={fallback}
        onError={handleError}
        onReset={handleReset}
        resetKeys={resetKeys}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };
  
  ComponentWithErrorBoundary.displayName = displayName;
  
  return ComponentWithErrorBoundary;
}

/**
 * Componente para tentar novamente quando ocorrer um erro
 * Útil para mostrar uma UI específica para tentar novamente uma operação que falhou
 */
export function ErrorRetry({
  error,
  resetErrorBoundary,
  message = 'Ocorreu um erro ao carregar este conteúdo.',
  buttonText = 'Tentar Novamente'
}: {
  error: Error;
  resetErrorBoundary: () => void;
  message?: string;
  buttonText?: string;
}) {
  // Reportar o erro quando o componente montar
  useEffect(() => {
    reportError(error, {
      context: 'ErrorRetry Component',
      severity: 'warning'
    });
  }, [error]);
  
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
      <p className="text-gray-600 mb-4">{message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
      >
        {buttonText}
      </button>
    </div>
  );
} 