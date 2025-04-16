import React, { createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { useOfflineStatus, OfflineStatusOptions, OfflineManager } from '../hooks/useOfflineStatus';

interface OfflineContextType extends OfflineManager {
  // Métodos adicionais específicos para o contexto
  addOfflineData: (key: string, data: any) => void;
  getOfflineData: <T>(key: string) => T | null;
  clearOfflineData: (key?: string) => void;
  getSyncPendingItems: () => Record<string, any[]>;
  addPendingSync: (type: string, data: any) => void;
  clearPendingSync: (type: string, ids?: string[]) => void;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

// Chave para armazenamento no localStorage
const OFFLINE_STORAGE_KEY = 'app_offline_data';
const PENDING_SYNC_KEY = 'app_pending_sync';

interface OfflineProviderProps {
  children: ReactNode;
  options?: OfflineStatusOptions;
}

export function OfflineProvider({ children, options }: OfflineProviderProps) {
  // Hook para gerenciar o estado de conexão
  const offlineManager = useOfflineStatus(options);

  // Métodos para gerenciar dados offline
  const addOfflineData = useCallback((key: string, data: any) => {
    try {
      // Recuperar dados existentes
      const existingData = localStorage.getItem(OFFLINE_STORAGE_KEY);
      const parsedData = existingData ? JSON.parse(existingData) : {};
      
      // Adicionar/atualizar dados
      parsedData[key] = data;
      
      // Salvar de volta no localStorage
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(parsedData));
    } catch (error) {
      console.error('[OfflineContext] Erro ao salvar dados offline:', error);
    }
  }, []);

  const getOfflineData = useCallback(<T,>(key: string): T | null => {
    try {
      const existingData = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (!existingData) return null;
      
      const parsedData = JSON.parse(existingData);
      return parsedData[key] || null;
    } catch (error) {
      console.error('[OfflineContext] Erro ao recuperar dados offline:', error);
      return null;
    }
  }, []);

  const clearOfflineData = useCallback((key?: string) => {
    try {
      if (key) {
        // Remover apenas dados específicos
        const existingData = localStorage.getItem(OFFLINE_STORAGE_KEY);
        if (!existingData) return;
        
        const parsedData = JSON.parse(existingData);
        delete parsedData[key];
        
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(parsedData));
      } else {
        // Remover todos os dados
        localStorage.removeItem(OFFLINE_STORAGE_KEY);
      }
    } catch (error) {
      console.error('[OfflineContext] Erro ao limpar dados offline:', error);
    }
  }, []);

  // Métodos para gerenciar ações pendentes de sincronização
  const getSyncPendingItems = useCallback((): Record<string, any[]> => {
    try {
      const pendingData = localStorage.getItem(PENDING_SYNC_KEY);
      return pendingData ? JSON.parse(pendingData) : {};
    } catch (error) {
      console.error('[OfflineContext] Erro ao recuperar itens pendentes:', error);
      return {};
    }
  }, []);

  const addPendingSync = useCallback((type: string, data: any) => {
    try {
      const pendingItems = getSyncPendingItems();
      
      // Inicializar array se não existir
      if (!pendingItems[type]) {
        pendingItems[type] = [];
      }
      
      // Adicionar item com timestamp
      pendingItems[type].push({
        ...data,
        _pendingTimestamp: new Date().toISOString()
      });
      
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingItems));
    } catch (error) {
      console.error('[OfflineContext] Erro ao adicionar item para sincronização:', error);
    }
  }, [getSyncPendingItems]);

  const clearPendingSync = useCallback((type: string, ids?: string[]) => {
    try {
      const pendingItems = getSyncPendingItems();
      
      if (!pendingItems[type]) return;
      
      if (ids && ids.length > 0) {
        // Remover apenas itens específicos
        pendingItems[type] = pendingItems[type].filter(
          (item: any) => !ids.includes(item.id)
        );
      } else {
        // Remover todos os itens do tipo
        delete pendingItems[type];
      }
      
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingItems));
    } catch (error) {
      console.error('[OfflineContext] Erro ao limpar itens pendentes:', error);
    }
  }, [getSyncPendingItems]);

  // Memoizar o contexto para evitar re-renderizações desnecessárias
  const contextValue = useMemo(() => ({
    ...offlineManager,
    addOfflineData,
    getOfflineData,
    clearOfflineData,
    getSyncPendingItems,
    addPendingSync,
    clearPendingSync
  }), [
    offlineManager,
    addOfflineData,
    getOfflineData,
    clearOfflineData,
    getSyncPendingItems,
    addPendingSync,
    clearPendingSync
  ]);

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
}

/**
 * Hook para utilizar o contexto offline
 */
export function useOffline(): OfflineContextType {
  const context = useContext(OfflineContext);
  
  if (!context) {
    throw new Error('useOffline deve ser usado dentro de um OfflineProvider');
  }
  
  return context;
} 