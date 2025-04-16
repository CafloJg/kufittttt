import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Variantes de animação para modais
export const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 10
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { 
      type: 'spring', 
      damping: 25, 
      stiffness: 300 
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: 10,
    transition: { 
      duration: 0.2 
    }
  }
};

// Variantes de animação para overlay
export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

// Tamanhos de modal
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

// Mapeamento de tamanhos para classes
export const modalSizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4'
};

// Posições de modal
export type ModalPosition = 'center' | 'top' | 'bottom';

// Mapeamento de posições para classes
export const modalPositionClasses: Record<ModalPosition, string> = {
  center: 'items-center',
  top: 'items-start pt-16',
  bottom: 'items-end pb-16'
};

// Componente de wrapper para modal com animação
export const ModalWrapper: React.FC<{
  isOpen: boolean;
  children: React.ReactNode;
  onClose?: () => void;
  size?: ModalSize;
  position?: ModalPosition;
  closeOnClickOutside?: boolean;
}> = ({
  isOpen,
  children,
  onClose,
  size = 'md',
  position = 'center',
  closeOnClickOutside = true
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={overlayVariants}
            onClick={closeOnClickOutside ? onClose : undefined}
          />
          
          {/* Modal */}
          <div className={`fixed inset-0 flex justify-center ${modalPositionClasses[position]} p-4 z-50`}>
            <motion.div
              className={`bg-white rounded-2xl shadow-xl w-full ${modalSizeClasses[size]} max-h-[90vh] flex flex-col`}
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={modalVariants}
              onClick={e => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};