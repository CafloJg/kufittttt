/**
 * Utilitários para chamadas de API
 */

// Network status singleton for checking connectivity
import { NetworkStatus } from './network';

// Configurações padrão para chamadas de API
export const API_CONFIG = {
  DEFAULT_TIMEOUT: 30000, // 30 segundos
  RETRY_COUNT: 3,
  RETRY_DELAY: 2000, // Increased initial delay
  BACKOFF_FACTOR: 1.5,
  MAX_BACKOFF_DELAY: 10000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Tipo para opções de chamada de API
export interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
  cache?: RequestCache;
  skipNetworkCheck?: boolean;
}

// Função para realizar chamadas de API com retry e timeout
export async function apiCall<T>(
  url: string, 
  options: ApiCallOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body,
    timeout = API_CONFIG.DEFAULT_TIMEOUT,
    retries = API_CONFIG.RETRY_COUNT,
    signal,
    cache = 'default'
  } = options;

  // Check network connectivity before making the request
  const networkStatus = NetworkStatus.getInstance();
  const isOnline = await networkStatus.checkNetworkStatus();
  
  if (!isOnline) {
    throw new Error('Você está offline. Verifique sua conexão com a internet e tente novamente.');
  }

  // Criar um AbortController para timeout se não for fornecido
  const controller = signal ? undefined : new AbortController();
  const timeoutId = controller ? 
    setTimeout(() => controller.abort(), timeout) : 
    undefined;

  try {
    // Preparar o corpo da requisição
    const bodyContent = body ? 
      (typeof body === 'string' ? body : JSON.stringify(body)) : 
      undefined;

    // Configurar a requisição
    const requestOptions: RequestInit = {
      method,
      headers: {
        ...API_CONFIG.HEADERS,
        ...headers
      },
      body: bodyContent,
      signal: signal || controller?.signal,
      cache,
      // Add keepalive for better connection handling
      keepalive: true,
      // Add credentials for cross-origin requests if needed
      credentials: 'same-origin'
    };

    // Fazer a chamada com retry
    return await fetchWithRetry<T>(url, requestOptions, retries);
  } finally {
    // Limpar o timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

// Função interna para realizar chamadas com retry
async function fetchWithRetry<T>(
  url: string, 
  options: RequestInit, 
  retries: number
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Add a small delay before retrying to allow network to stabilize
      if (attempt > 0) {
        const delay = Math.min(
          API_CONFIG.RETRY_DELAY * Math.pow(API_CONFIG.BACKOFF_FACTOR, attempt - 1),
          API_CONFIG.MAX_BACKOFF_DELAY
        );
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 1000;
        
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }

      // Check if we're online before attempting the fetch
      if (!navigator.onLine) {
        throw new Error('Você está offline. Verifique sua conexão com a internet e tente novamente.');
      }

      const response = await fetch(url, options);
      
      // Tratar erros HTTP
      if (!response.ok) {
        // Tratar rate limit especificamente
        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
          throw new Error(`Rate limit exceeded. Try again in ${retryAfter} seconds.`);
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Verificar se a resposta é JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      // Retornar texto para outros tipos de conteúdo
      return await response.text() as unknown as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Não tentar novamente se for AbortError (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn(`Network error on attempt ${attempt + 1}/${retries + 1}:`, error.message);
        
        // If we have retries left, continue to the next iteration
        if (attempt < retries) {
          continue;
        }
      }

      // Não tentar novamente se for o último retry
      if (attempt === retries) {
        throw lastError;
      }
      
    }
  }
  
  // Nunca deve chegar aqui, mas TypeScript exige um retorno
  throw lastError || new Error('Unknown error');
}

// Funções auxiliares para métodos HTTP comuns
export const api = {
  get: <T>(url: string, options?: Omit<ApiCallOptions, 'method' | 'body'>) => 
    apiCall<T>(url, { ...options, method: 'GET' }),
    
  post: <T>(url: string, body: any, options?: Omit<ApiCallOptions, 'method'>) => 
    apiCall<T>(url, { ...options, method: 'POST', body }),
    
  put: <T>(url: string, body: any, options?: Omit<ApiCallOptions, 'method'>) => 
    apiCall<T>(url, { ...options, method: 'PUT', body }),
    
  patch: <T>(url: string, body: any, options?: Omit<ApiCallOptions, 'method'>) => 
    apiCall<T>(url, { ...options, method: 'PATCH', body }),
    
  delete: <T>(url: string, options?: Omit<ApiCallOptions, 'method'>) => 
    apiCall<T>(url, { ...options, method: 'DELETE' })
};