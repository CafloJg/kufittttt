/**
 * Utilitário para reportar erros para um serviço de monitoramento
 * Pode ser integrado com serviços como Sentry, LogRocket, etc.
 */

export interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  context?: string;
  userId?: string;
  metadata?: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  retryCount?: number;
  maxRetries?: number;
  timestamp?: string;
  url?: string;
  userAgent?: string;
}

// Função para enviar erros para um serviço de monitoramento
export function reportError(error: Error | unknown, details: Partial<ErrorDetails> = {}) {
  // Formata o erro para logging
  const errorObj = formatError(error || new Error('Unknown error'));
  
  // Skip reporting Firestore offline errors
  if (errorObj.message && 
      (errorObj.message.includes('offline') || 
       errorObj.message.includes('client is offline'))) {
    console.warn('Skipping error reporting for offline error:', errorObj.message);
    return errorObj;
  }

  // Skip reporting Firestore internal assertion errors
  if (errorObj.message && errorObj.message.includes('INTERNAL ASSERTION FAILED')) {
    console.warn('Skipping error reporting for Firestore internal assertion error:', errorObj.message);
    return errorObj;
  }
  
  // Create a minimal safe copy with only essential properties
  const safeDetails = {
    context: details.context,
    severity: details.severity,
    retryCount: details.retryCount,
    maxRetries: details.maxRetries,
    timestamp: details.timestamp || new Date().toISOString()
  };
  
  // Combina com detalhes adicionais
  const fullErrorDetails = {
    ...errorObj,
    ...safeDetails,
    userAgent: navigator.userAgent,
    url: window.location.href,
    severity: safeDetails.severity || 'error',
    retryCount: safeDetails.retryCount || 0,
    maxRetries: safeDetails.maxRetries || 0
  };
  
  // Log para console em desenvolvimento
  if (safeDetails.severity === 'critical') {
    console.error('CRITICAL ERROR:', fullErrorDetails);
  } else {
    console.error('Error reported:', fullErrorDetails);
  }
  
  // Em produção, enviaria para um serviço de monitoramento
  if (import.meta.env.PROD) {
    // Exemplo de integração com Sentry (comentado)
    // Sentry.captureException(error, {
    //   extra: fullErrorDetails
    // });
    
    // Ou enviar para uma API própria
    // fetch('/api/error-reporting', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(fullErrorDetails)
    // }).catch(e => console.error('Failed to report error:', e));
  }
  
  return fullErrorDetails;
}

// Exportado para ser reutilizado em outros lugares
export function formatError(error: Error | unknown): Partial<ErrorDetails> {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      // Captura informações específicas de erros de rede
      ...(error.name === 'TypeError' && error.message.includes('fetch') && {
        context: 'Network Error'
      })
    };
  }
  
  return {
    message: error ? String(error) : 'Unknown error'
  };
}

// Tipo para resultado da categorização de erro
export interface ErrorCategory {
  type: 'network' | 'timeout' | 'auth' | 'validation' | 'api' | 'unknown';
  isCritical: boolean;
  retryable: boolean;
  message: string;
}

// Categoriza erros para tratamento específico
export function categorizeError(error: Error | unknown): ErrorCategory {
  if (!(error instanceof Error)) {
    return { 
      type: 'unknown', 
      isCritical: false, 
      retryable: true, 
      message: String(error) 
    };
  }
  
  const message = error.message.toLowerCase();
  
  // Erros de rede
  if (message.includes('network') || 
      message.includes('failed to fetch') || 
      message.includes('internet') ||
      message.includes('offline') ||
      message.includes('connection')) {
    return { 
      type: 'network', 
      isCritical: false, 
      retryable: true, 
      message: error.message 
    };
  }
  
  // Erros de timeout
  if (message.includes('timeout') || message.includes('timed out')) {
    return { 
      type: 'timeout', 
      isCritical: false, 
      retryable: true, 
      message: error.message 
    };
  }
  
  // Erros de autenticação
  if (message.includes('auth') || 
      message.includes('permission') || 
      message.includes('login') ||
      message.includes('unauthorized')) {
    return { 
      type: 'auth', 
      isCritical: true, 
      retryable: false, 
      message: error.message 
    };
  }
  
  // Erros de validação
  if (message.includes('validation') || 
      message.includes('invalid') || 
      message.includes('required')) {
    return { 
      type: 'validation', 
      isCritical: false, 
      retryable: false, 
      message: error.message 
    };
  }
  
  // Erros de API
  if (message.includes('api') || 
      message.includes('server') || 
      message.includes('status code')) {
    return { 
      type: 'api', 
      isCritical: false, 
      retryable: true, 
      message: error.message 
    };
  }
  
  return { 
    type: 'unknown', 
    isCritical: false, 
    retryable: true, 
    message: error.message 
  };
}