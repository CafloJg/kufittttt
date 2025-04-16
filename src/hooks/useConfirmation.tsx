import React, { useState, useCallback, createContext, useContext, ReactNode } from 'react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface ConfirmationOptions {
  /**
   * Título do diálogo
   * @default 'Confirmação'
   */
  title?: string;
  
  /**
   * Mensagem do diálogo
   */
  message: string;
  
  /**
   * Texto do botão de confirmação
   * @default 'Confirmar'
   */
  confirmText?: string;
  
  /**
   * Texto do botão de cancelamento
   * @default 'Cancelar'
   */
  cancelText?: string;
  
  /**
   * Tipo do diálogo
   * @default 'info'
   */
  type?: 'info' | 'warning' | 'danger';
}

interface ConfirmationContextType {
  /**
   * Mostrar diálogo de confirmação
   */
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

/**
 * Provider para o sistema de confirmação
 */
export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmationOptions>({
    title: 'Confirmação',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    type: 'info'
  });
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);
  
  // Mostrar diálogo de confirmação
  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    setOptions({
      title: options.title || 'Confirmação',
      message: options.message,
      confirmText: options.confirmText || 'Confirmar',
      cancelText: options.cancelText || 'Cancelar',
      type: options.type || 'info'
    });
    
    setIsOpen(true);
    
    return new Promise<boolean>((resolve) => {
      setResolveRef(() => resolve);
    });
  }, []);
  
  // Confirmar
  const handleConfirm = useCallback(() => {
    if (resolveRef) {
      resolveRef(true);
    }
    
    setIsOpen(false);
  }, [resolveRef]);
  
  // Cancelar
  const handleCancel = useCallback(() => {
    if (resolveRef) {
      resolveRef(false);
    }
    
    setIsOpen(false);
  }, [resolveRef]);
  
  // Obter ícone com base no tipo
  const getIcon = () => {
    switch (options.type) {
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
      case 'danger':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      case 'info':
      default:
        return <Info className="h-6 w-6 text-blue-500" />;
    }
  };
  
  // Obter cor do botão de confirmação com base no tipo
  const getConfirmButtonVariant = () => {
    switch (options.type) {
      case 'warning':
        return 'warning';
      case 'danger':
        return 'danger';
      case 'info':
      default:
        return 'primary';
    }
  };
  
  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      
      <Modal
        isOpen={isOpen}
        onClose={handleCancel}
        title={options.title}
        size="sm"
        actions={
          <div className="flex justify-end gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              {options.cancelText}
            </Button>
            <Button
              variant={getConfirmButtonVariant() as any}
              onClick={handleConfirm}
            >
              {options.confirmText}
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div>
            <p className="text-gray-700">{options.message}</p>
          </div>
        </div>
      </Modal>
    </ConfirmationContext.Provider>
  );
}

/**
 * Hook para usar o sistema de confirmação
 */
export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  
  return context;
}