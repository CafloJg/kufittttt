// Configurações de acessibilidade para o KiiFit App

import React, { createContext, useContext, useState, useEffect } from 'react';

// Contexto de acessibilidade
const AccessibilityContext = createContext();

// Hook para usar o contexto de acessibilidade
export const useAccessibility = () => useContext(AccessibilityContext);

// Provedor de acessibilidade
export const AccessibilityProvider = ({ children }) => {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  
  // Detectar preferências do sistema
  useEffect(() => {
    // Verificar preferência de contraste
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');
    setHighContrast(contrastQuery.matches);
    
    // Verificar preferência de texto grande
    const prefersLargeText = window.matchMedia('(prefers-larger-text)');
    setLargeText(prefersLargeText.matches);
    
    // Verificar preferência de movimento reduzido
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(prefersReducedMotion.matches);
    
    // Listeners para mudanças nas preferências
    const handleContrastChange = (e) => setHighContrast(e.matches);
    const handleTextChange = (e) => setLargeText(e.matches);
    const handleMotionChange = (e) => setReduceMotion(e.matches);
    
    contrastQuery.addEventListener('change', handleContrastChange);
    prefersLargeText.addEventListener('change', handleTextChange);
    prefersReducedMotion.addEventListener('change', handleMotionChange);
    
    return () => {
      contrastQuery.removeEventListener('change', handleContrastChange);
      prefersLargeText.removeEventListener('change', handleTextChange);
      prefersReducedMotion.removeEventListener('change', handleMotionChange);
    };
  }, []);
  
  // Funções para alternar configurações
  const toggleHighContrast = () => setHighContrast(prev => !prev);
  const toggleLargeText = () => setLargeText(prev => !prev);
  const toggleReduceMotion = () => setReduceMotion(prev => !prev);
  
  // Aplicar classes CSS baseadas nas configurações
  useEffect(() => {
    const root = document.documentElement;
    
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    if (largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
    
    if (reduceMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [highContrast, largeText, reduceMotion]);
  
  const value = {
    highContrast,
    largeText,
    reduceMotion,
    toggleHighContrast,
    toggleLargeText,
    toggleReduceMotion
  };
  
  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export default AccessibilityProvider;