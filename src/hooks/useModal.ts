import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar o estado de modais
 * @param initialState Estado inicial do modal (aberto ou fechado)
 * @returns Objeto com estado e funções para controlar o modal
 */
export interface ModalControls {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useModal(initialState = false): ModalControls {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle
  };
}