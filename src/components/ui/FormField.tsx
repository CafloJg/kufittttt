import React from 'react';
import { Info } from 'lucide-react';

interface FormFieldProps {
  /**
   * ID do campo (usado para associar label e input)
   */
  id: string;
  
  /**
   * Rótulo do campo
   */
  label: string;
  
  /**
   * Elemento de input (input, select, textarea, etc.)
   */
  children: React.ReactNode;
  
  /**
   * Mensagem de erro
   */
  error?: string;
  
  /**
   * Texto de ajuda
   */
  helpText?: string;
  
  /**
   * Se o campo é obrigatório
   * @default false
   */
  required?: boolean;
  
  /**
   * Se o campo está desabilitado
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Classes CSS adicionais para o container
   */
  className?: string;
  
  /**
   * Classes CSS adicionais para o label
   */
  labelClassName?: string;
}

/**
 * Componente para padronizar campos de formulário
 */
export function FormField({
  id,
  label,
  children,
  error,
  helpText,
  required = false,
  disabled = false,
  className = '',
  labelClassName = '',
  ...props
}: FormFieldProps) {
  return (
    <div className={`mb-4 ${className}`} {...props}>
      {/* Label */}
      <label 
        htmlFor={id} 
        className={`block text-sm font-medium text-gray-700 mb-1 ${disabled ? 'opacity-60' : ''} ${labelClassName}`}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {/* Input */}
      <div className={`${disabled ? 'opacity-60' : ''}`}>
        {children}
      </div>
      
      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {/* Help text */}
      {helpText && !error && (
        <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
          <Info size={14} />
          <span>{helpText}</span>
        </p>
      )}
    </div>
  );
}