import { useState, useEffect, useCallback } from 'react';

export interface OfflineStatusOptions {
  suppressWarning?: boolean;
  checkInterval?: number;
  pingURL?: string;
}

export type OfflineManager = {
  isOnline: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  checkConnection: () => Promise<boolean>;
  manuallySetStatus: (status: boolean) => void;
};

/**
 * Hook para gerenciar o estado de conexão da aplicação
 */
export function useOfflineStatus(options?: OfflineStatusOptions): OfflineManager {
  const {
    suppressWarning = false,
    checkInterval = 30000, // 30 segundos
    pingURL = 'https://www.google.com/favicon.ico'
  } = options || {};

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Verificação mais confiável de conexão através de ping
  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!suppressWarning && !isOnline) {
      console.warn('[useOfflineStatus] Tentando verificar conexão enquanto offline');
    }

    setIsChecking(true);
    
    try {
      // Tentar fazer um fetch com timeout para detectar conexão lenta
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(pingURL, { 
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      setIsOnline(true);
      setLastChecked(new Date());
      setIsChecking(false);
      return true;
    } catch (error) {
      // Se o fetch falhar, provavelmente estamos offline
      setIsOnline(navigator.onLine); // Usar o status do browser como fallback
      setLastChecked(new Date());
      setIsChecking(false);
      return navigator.onLine;
    }
  }, [isOnline, pingURL, suppressWarning]);

  // Função para manualmente definir o status (útil para testes ou forçar estados)
  const manuallySetStatus = useCallback((status: boolean) => {
    setIsOnline(status);
    setLastChecked(new Date());
  }, []);

  // Monitorar eventos online/offline do navegador
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Verificar se realmente estamos online com um pequeno delay
      setTimeout(() => checkConnection(), 1000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setLastChecked(new Date());
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Verificar conexão imediatamente
    checkConnection();
    
    // Verificar periodicamente
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        checkConnection();
      }
    }, checkInterval);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [checkConnection, checkInterval]);

  return {
    isOnline,
    isChecking,
    lastChecked,
    checkConnection,
    manuallySetStatus
  };
} 