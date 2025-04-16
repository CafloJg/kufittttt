import React from 'react';
import { AlertCircle, RefreshCw, WifiOff, Home, ArrowLeft, AlertTriangle, Info, Server } from 'lucide-react';
import { reportError } from '../../utils/errorReporting';
import { ErrorType } from '../ui/ErrorMessage';

interface ErrorFallbackProps {
  error: Error | null;
  resetErrorBoundary: () => void;
  isNetworkError?: boolean;
  context?: string;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  shouldReport?: boolean;
  severity?: ErrorType | 'critical';
  errorInfo?: React.ErrorInfo | null;
  retryCount?: number;
  maxRetries?: number;
  navigate?: (path: string) => void;
}

// Mapeamentos para ícones e estilos
const SEVERITY_ICON_MAP = {
  info: <Info className="text-blue-500" size={28} />,
  warning: <AlertTriangle className="text-yellow-500" size={28} />,
  error: <AlertCircle className="text-red-500" size={28} />,
  critical: <Server className="text-red-600 animate-pulse" size={28} />,
  network: <WifiOff className="text-red-500" size={28} />
};

const SEVERITY_BG_MAP = {
  info: 'bg-blue-100',
  warning: 'bg-yellow-100',
  error: 'bg-red-100',
  critical: 'bg-red-100',
  network: 'bg-red-100'
};

const SEVERITY_TEXT_MAP = {
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
  critical: 'text-red-600',
  network: 'text-red-500'
};

export function ErrorFallback({
  error, 
  resetErrorBoundary,
  isNetworkError = false,
  context = 'Ocorreu um erro',
  showHomeButton = true,
  showBackButton = false,
  shouldReport = true,
  severity = 'error',
  errorInfo = null,
  retryCount = 0,
  maxRetries = 3,
  navigate
}: ErrorFallbackProps) {
  // Report error to monitoring service
  React.useEffect(() => {
    if (error && shouldReport && !isNetworkError) {
      const safeMetadata = errorInfo ? { componentStack: errorInfo.componentStack || null } : {};
      reportError(error instanceof Error ? error : new Error(String(error)), {
        context,
        metadata: safeMetadata
      });
    }
  }, [error, context, isNetworkError, shouldReport, retryCount, maxRetries]);

  // Determinar o tipo de erro para usar nos mapeamentos
  const errorType = isNetworkError ? 'network' : 
                    (severity === 'critical' ? 'critical' : 
                    severity || 'error');

  // Get retry button text based on retry count
  const getRetryButtonText = () => {
    if (retryCount >= maxRetries) {
      return 'Recarregar Página';
    }
    
    if (retryCount > 0) {
      return `Tentar Novamente (${retryCount}/${maxRetries})`;
    }
    
    return 'Tentar Novamente';
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm w-full animate-fade-in">
      <div className={`flex items-center justify-center w-16 h-16 ${SEVERITY_BG_MAP[errorType as keyof typeof SEVERITY_BG_MAP]} rounded-full mx-auto mb-6`}>
        {SEVERITY_ICON_MAP[errorType]}
      </div>
      
      <h3 className={`text-xl font-semibold text-center mb-2 ${SEVERITY_TEXT_MAP[errorType as keyof typeof SEVERITY_TEXT_MAP]}`}>
        {isNetworkError ? 'Erro de Conexão' : context}
      </h3>
      
      <p className="text-gray-600 text-center mb-6">
        {error ? (error.message || 'Erro desconhecido') : 'Algo deu errado. Por favor, tente novamente.'}
      </p>
      
      {errorInfo && (
        <div className="text-xs bg-gray-50 p-3 rounded-lg mb-4 overflow-auto max-h-32 font-mono">
          <p className="text-gray-500 mb-1">Detalhes técnicos (para suporte):</p>
          <p className="text-red-400 whitespace-pre-wrap">{errorInfo.componentStack}</p>
        </div>
      )}
      
      <button
        onClick={resetErrorBoundary} 
        className={`w-full py-3 ${retryCount >= maxRetries ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-500 hover:bg-primary-600'} text-white rounded-xl flex items-center justify-center gap-2 transition-transform`}
        disabled={isNetworkError && !navigator.onLine}
      >
        <RefreshCw size={20} />
        <span>{isNetworkError && !navigator.onLine ? 'Aguardando conexão...' : getRetryButtonText()}</span>
      </button>
      
      <div className="flex gap-4 mt-4">
        {showBackButton && (
          <button 
            onClick={() => navigate ? navigate(-1) : window.history.back()}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Voltar</span>
          </button>
        )}
        
        {showHomeButton && (
          <button
            onClick={() => navigate ? navigate('/dashboard') : window.location.href = '/dashboard'}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
          >
            <Home size={20} />
            <span>Página Inicial</span>
          </button>
        )}
      </div>
      
      {isNetworkError && (
        <p className="text-sm text-gray-500 text-center mt-4">
          Verifique sua conexão com a internet e tente novamente.
        </p>
      )}
      
      {retryCount > 0 && retryCount < maxRetries && (
        <p className="text-sm text-gray-500 text-center mt-4">
          Tentativa {retryCount} de {maxRetries}. Se o problema persistir, tente recarregar a página.
        </p>
      )}
      
      {retryCount >= maxRetries && (
        <p className="text-sm text-red-500 text-center mt-4">
          Número máximo de tentativas excedido. Recarregando a página...
        </p>
      )}
    </div>
  );
}