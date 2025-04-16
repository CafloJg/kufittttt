import React from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ErrorType = 'error' | 'warning' | 'info';

export interface ErrorMessageProps {
  message: string;
  type?: ErrorType;
  onClose?: () => void;
  className?: string;
}

// Mapeamentos para ícones, cores de fundo e texto
const ERROR_ICON_MAP: Record<ErrorType, React.ReactNode> = {
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />
};

const ERROR_BG_MAP: Record<ErrorType, string> = {
  warning: 'bg-yellow-50',
  info: 'bg-blue-50',
  error: 'bg-red-50'
};

const ERROR_TEXT_MAP: Record<ErrorType, string> = {
  warning: 'text-yellow-700',
  info: 'text-blue-700',
  error: 'text-red-700'
};

/**
 * Componente para exibir mensagens de erro, aviso ou informação em formulários ou componentes
 */
export function ErrorMessage({ 
  message, 
  type = 'error',
  onClose,
  className = ''
}: ErrorMessageProps) {
  if (!message) return null;
  
  return (
    <div className={`${ERROR_BG_MAP[type]} p-3 rounded-lg mb-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mt-0.5">
          {ERROR_ICON_MAP[type]}
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${ERROR_TEXT_MAP[type]}`}>
            {message}
          </p>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              className="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
              onClick={onClose}
            >
              <span className="sr-only">Fechar</span>
              <X className="h-5 w-5 text-gray-400 hover:text-gray-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}