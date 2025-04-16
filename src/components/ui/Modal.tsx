import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  /**
   * Título do modal
   */
  title?: React.ReactNode;
  
  /**
   * Conteúdo do modal
   */
  children: React.ReactNode;
  
  /**
   * Se o modal está aberto
   */
  isOpen: boolean;
  
  /**
   * Callback para fechar o modal
   */
  onClose: () => void;
  
  /**
   * Se deve mostrar o botão de fechar
   * @default true
   */
  showCloseButton?: boolean;
  
  /**
   * Se deve fechar ao clicar fora do modal
   * @default true
   */
  closeOnClickOutside?: boolean;
  
  /**
   * Se deve fechar ao pressionar ESC
   * @default true
   */
  closeOnEsc?: boolean;
  
  /**
   * Tamanho do modal
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  /**
   * Posição do modal
   * @default 'center'
   */
  position?: 'center' | 'top' | 'bottom';
  
  /**
   * Classes CSS adicionais
   */
  className?: string;
  
  /**
   * Ações do modal (botões de rodapé)
   */
  actions?: React.ReactNode;
}

/**
 * Componente de modal reutilizável
 */
export function Modal({
  title,
  children,
  isOpen,
  onClose,
  showCloseButton = true,
  closeOnClickOutside = true,
  closeOnEsc = true,
  size = 'md',
  position = 'center',
  className = '',
  actions,
  ...props
}: ModalProps) {
  // Fechar ao pressionar ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (isOpen && closeOnEsc && e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, closeOnEsc, onClose]);
  
  // Prevenir scroll do body quando o modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // Mapeamento de tamanhos para classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4'
  };
  
  // Mapeamento de posições para classes
  const positionClasses = {
    center: 'items-center',
    top: 'items-start pt-16',
    bottom: 'items-end pb-16'
  };
  
  // Variantes de animação
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };
  
  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95,
      y: position === 'top' ? -20 : position === 'bottom' ? 20 : 0
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: { type: 'spring', damping: 25, stiffness: 300 }
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
            onClick={closeOnClickOutside ? onClose : undefined}
          />
          
          {/* Modal */}
          <div className={`fixed inset-0 flex justify-center ${positionClasses[position]} p-4 z-50`}>
            <motion.div
              className={`bg-white rounded-2xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col ${className}`}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={modalVariants}
              onClick={e => e.stopPropagation()}
              {...props}
            >
              {/* Cabeçalho */}
              {title && (
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    {title}
                  </h2>
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      aria-label="Fechar"
                    >
                      <X size={24} />
                    </button>
                  )}
                </div>
              )}
              
              {/* Conteúdo */}
              <div className="flex-1 overflow-y-auto p-6">
                {children}
              </div>
              
              {/* Ações */}
              {actions && (
                <div className="p-6 border-t border-gray-100">
                  {actions}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}