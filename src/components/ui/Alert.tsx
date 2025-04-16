import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  /**
   * Variante do alerta
   * @default 'info'
   */
  variant?: AlertVariant;
  
  /**
   * Título do alerta
   */
  title?: string;
  
  /**
   * Conteúdo do alerta
   */
  children: React.ReactNode;
  
  /**
   * Se deve mostrar o botão de fechar
   * @default false
   */
  closable?: boolean;
  
  /**
   * Callback para fechar o alerta
   */
  onClose?: () => void;
  
  /**
   * Classes CSS adicionais
   */
  className?: string;
}

/**
 * Componente de alerta reutilizável
 */
export function Alert({
  variant = 'info',
  title,
  children,
  closable = false,
  onClose,
  className = '',
  ...props
}: AlertProps) {
  // Mapeamento de variantes para classes e ícones
  const variantMap: Record<AlertVariant, { bgColor: string; textColor: string; icon: React.ReactNode }> = {
    info: {
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      icon: <Info className="h-5 w-5 text-blue-500" />
    },
    success: {
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />
    },
    warning: {
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />
    },
    error: {
      bgColor: 'bg-red-50',
      textColor: 'text-red-800',
      icon: <AlertCircle className="h-5 w-5 text-red-500" />
    }
  };
  
  const { bgColor, textColor, icon } = variantMap[variant];
  
  return (
    <div
      className={`${bgColor} ${textColor} p-4 rounded-lg ${className}`}
      role="alert"
      {...props}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          {icon}
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium">{title}</h3>
          )}
          <div className={`text-sm ${title ? 'mt-2' : ''}`}>
            {children}
          </div>
        </div>
        {closable && onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  variant === 'info' ? 'focus:ring-blue-500' :
                  variant === 'success' ? 'focus:ring-green-500' :
                  variant === 'warning' ? 'focus:ring-yellow-500' :
                  'focus:ring-red-500'
                }`}
                onClick={onClose}
              >
                <span className="sr-only">Fechar</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}