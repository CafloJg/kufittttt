import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { reportError } from './errorReporting';

interface PendingChange {
  path: string;
  data: any;
  timestamp: number;
  retries?: number;
}

export class NetworkStatus {
  private static instance: NetworkStatus;
  private online: boolean = navigator.onLine;
  private listeners: Set<(online: boolean) => void> = new Set();
  private pendingChanges: PendingChange[] = [];
  private reconnectAttempts: number = 0;
  private isSyncing: boolean = false;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private lastOfflineTime: Date | null = null;
  private reconnectCallbacks: (() => void)[] = [];
  private lastNetworkCheck: number = 0;
  private readonly NETWORK_CHECK_INTERVAL = 15000; // 15 seconds
  private readonly PING_TIMEOUT = 8000; // 8 seconds - increased timeout
  private readonly PING_ENDPOINTS = [
    'https://www.google.com/favicon.ico',
    'https://www.gstatic.com/generate_204'
  ];

  private constructor() {
    // Use arrow functions to preserve 'this'
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Load pending changes from localStorage
    try {
      const storedChanges = localStorage.getItem('pendingChanges');
      if (storedChanges) {
        this.pendingChanges = JSON.parse(storedChanges);
      }
    } catch (error) {
      console.error('Error loading pending changes:', error);
    }
    
    // Perform initial network check
    setTimeout(() => this.checkNetworkStatus(), 1000);
    
    // Set up periodic network checks
    setInterval(() => this.checkNetworkStatus(), this.NETWORK_CHECK_INTERVAL);
  }

  static getInstance(): NetworkStatus {
    if (!NetworkStatus.instance) {
      NetworkStatus.instance = new NetworkStatus();
    }
    return NetworkStatus.instance;
  }

  // Handle online event with reconnection logic
  private async handleOnline() {
    console.log('Network: Browser reports online status');
    // Update status to online
    this.updateStatus(true);
    // Try to reconnect Firestore
    this.reconnectFirestore();
  }

  // Handle offline event
  private handleOffline() {
    console.log('Network: Browser reports offline status');
    this.updateStatus(false);
  }

  private async updateStatus(online: boolean) {
    this.online = online;
    this.listeners.forEach(listener => listener(online));

    // Track offline time
    if (!online) {
      this.lastOfflineTime = new Date();
      this.reconnectAttempts = 0;
    }

    // If coming back online, try to sync any pending changes
    if (online) {
      // Calculate offline duration
      if (this.lastOfflineTime) {
        const offlineDuration = Date.now() - this.lastOfflineTime.getTime();
        this.reconnectAttempts = 0;
        console.log(`Network reconnected after ${Math.round(offlineDuration / 1000)} seconds offline`);
        
        // Execute reconnect callbacks
        this.reconnectCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('Error in reconnect callback:', error);
          }
        });
        
        this.lastOfflineTime = null;
      }
      
      await this.syncPendingChanges();
    }
  }

  // Attempt to reconnect Firestore
  private async reconnectFirestore() {
    this.reconnectAttempts++;
    console.log(`Network: Reconnection attempt ${this.reconnectAttempts}`);
    
    try {
      // Add exponential backoff with jitter
      const delay = Math.min(
        1000 * Math.pow(1.5, this.reconnectAttempts - 1) + (Math.random() * 1000),
        30000
      );
      
      // Wait before attempting reconnection
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Just update the status to online - don't try to enable Firestore network
      console.log('Network: Reconnection successful');
      this.updateStatus(true);
    } catch (error) {
      console.error('Error during network reconnection:', error);
    }
  }

  // Sync pending changes when coming back online
  private async syncPendingChanges() {
    try {
      const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || '[]');
      if (pendingChanges.length === 0) return;

      console.log(`Network: Syncing ${pendingChanges.length} pending changes...`);
      let syncedCount = 0; 
      let failedCount = 0;

      for (const change of pendingChanges) {
        try {
          const { path, data } = change;
          await updateDoc(doc(db, ...path.split('/')), data);
          syncedCount++; 
          console.log(`Successfully synced change to ${path}`);
        } catch (error) {
          failedCount++;
          console.error('Error syncing change:', error);
          reportError(error, {
            context: 'Sync pending changes',
            metadata: { change }
          });
        }
      }
      

      console.log(`Network: Sync complete: ${syncedCount} succeeded, ${failedCount} failed`);

      // Clear synced changes
      localStorage.removeItem('pendingChanges');
    } catch (error) {
      console.error('Error syncing pending changes:', error);
      reportError(error, {
        context: 'Sync pending changes',
        severity: 'error'
      });
    }
  }

  // Check if device is online
  isOnline(): boolean { 
    // Double-check with navigator.onLine for immediate feedback
    const browserOnline = navigator.onLine;
    if (!browserOnline && this.online) {
      this.updateStatus(false);
    }
    return browserOnline && this.online;
  }

  addListener(listener: (online: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async checkNetworkStatus(): Promise<boolean> {
    try {
      // Don't check too frequently
      if (Date.now() - this.lastNetworkCheck < 5000) { // 5 seconds minimum between checks
        return this.online;
      }
      
      this.lastNetworkCheck = Date.now();
      
      // Check navigator.onLine first
      const browserOnline = navigator.onLine;
      if (!browserOnline) {
        await this.updateStatus(false);
        return false;
      }
      
      // Try to make a simple fetch request to check connectivity
      try {
        // Use a small image or favicon for minimal data transfer
        for (let i = 0; i < this.PING_ENDPOINTS.length; i++) {
          const endpoint = this.PING_ENDPOINTS[i];
          
          try {
            // Validate URL before fetching
            try {
              // Use a safer URL validation approach
              if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
                console.warn(`Invalid URL format in PING_ENDPOINTS[${i}]: ${endpoint}`);
                continue; // Skip to next endpoint
              }
            } catch (urlError) {
              console.warn(`Invalid URL in PING_ENDPOINTS[${i}]: ${endpoint}`, urlError);
              continue; // Skip to next endpoint
            }
            
            const controller = new AbortController(); 
            const timeoutId = setTimeout(() => controller.abort(), this.PING_TIMEOUT);
            
            // console.log('Checking network status with endpoint:', endpoint);
            
            try {
              await fetch(endpoint, {
                method: 'HEAD',
                mode: 'no-cors', // Important for CORS issues
                cache: 'no-store',
                signal: controller.signal,
                credentials: 'omit'
              });
            } catch (innerFetchError) {
              clearTimeout(timeoutId);
              throw innerFetchError; // Re-throw to be caught by outer catch
            }
            
            clearTimeout(timeoutId);
            
            // If we get here, we're online
            if (this.online === false) {
              console.log('Network: Connectivity check successful, updating status to online');
              await this.updateStatus(true);
            }
            
            return true;
          } catch (fetchError) {
            console.warn(`Endpoint ${endpoint} fetch failed:`, fetchError);
            // Continue to next endpoint
          }
        }
        
        console.warn('All ping endpoints failed');
        
        // Fall through to navigator.onLine check
        return navigator.onLine;
        
      } catch (fetchError) {
        console.warn('Fetch error during network check:', fetchError);
        
        // If fetch fails, we might still be online but with limited connectivity
        // Fall back to navigator.onLine
        const isOnline = navigator.onLine;
        
        if (!isOnline && this.online) {
          console.log('Network: Connectivity check failed, updating status to offline');
          await this.updateStatus(false);
          return false;
        }
        
        return isOnline;
      }
    } catch (error) {
      console.warn('Error checking network status:', error);
      return this.online;
    }
  }

  // Add a callback to be executed when reconnecting
  addReconnectCallback(callback: () => void) {
    this.reconnectCallbacks.push(callback);
    return () => {
      this.reconnectCallbacks = this.reconnectCallbacks.filter(cb => cb !== callback);
    };
  }

  // Queue changes for offline support 
  async queueChange(path: string, data: any) {
    if (this.online) {
      await updateDoc(doc(db, ...path.split('/')), data);
    } else {
      const pendingChanges = JSON.parse(localStorage.getItem('pendingChanges') || '[]');
      pendingChanges.push({ path, data, timestamp: Date.now() });
      localStorage.setItem('pendingChanges', JSON.stringify(pendingChanges));
    }
  }
  
  // Get pending changes count
  getPendingChangesCount(): number {
    return this.pendingChanges.length;
  }

  // Force sync pending changes
  async forceSyncChanges(): Promise<{
    success: boolean;
    synced: number;
    failed: number;
    message: string;
  }> {
    if (!this.online) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        message: 'Dispositivo offline. Não é possível sincronizar.'
      };
    }
    
    if (this.isSyncing) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        message: 'Sincronização já em andamento.'
      };
    }
    
    this.isSyncing = true;
    let synced = 0;
    let failed = 0;
    
    try {
      for (const change of this.pendingChanges) {
        try {
          await updateDoc(doc(db, ...change.path.split('/')), change.data);
          synced++;
        } catch (error) {
          failed++;
          console.error('Error syncing change:', error);
          reportError(error, {
            context: 'Force sync changes',
            metadata: { change }
          });
        }
      }
      
      // Clear synced changes
      this.pendingChanges = [];
      localStorage.removeItem('pendingChanges');
      
      return {
        success: true,
        synced,
        failed,
        message: `Sincronizado com sucesso: ${synced} alterações.`
      };
    } finally {
      this.isSyncing = false;
    }
  }
}