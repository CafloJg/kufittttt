import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { reportError } from '../utils/errorReporting';
import { ErrorFallback } from './common/ErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  errorReportingEnabled?: boolean;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class GlobalErrorBoundary extends Component<Props, State> {
  static defaultProps = {
    errorReportingEnabled: true,
    maxRetries: 3
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo: errorInfo,
      retryCount: this.state.retryCount + 1
    });
    
    // Skip reporting Firestore internal assertion errors
    if (error.message && error.message.includes('INTERNAL ASSERTION FAILED')) {
      console.warn('Ignoring Firestore internal assertion error in error boundary:', error.message);
      return;
    }
    
    // Log error to monitoring service or console
    console.error('Error caught by GlobalErrorBoundary:', error, errorInfo);
    
    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Send the error to a reporting service if enabled
    if (this.props.errorReportingEnabled) {
      reportError(error, {
        context: 'GlobalErrorBoundary',
        componentStack: errorInfo.componentStack,
        userId: localStorage.getItem('userId') || undefined,
        severity: 'critical'
      });
    }
  }

  resetErrorBoundary = (): void => {
    // Check if we've exceeded max retries
    if (this.state.retryCount >= this.props.maxRetries!) {
      // Force page reload as a last resort, but only if it's not a Firestore error
      if (this.state.error && !this.state.error.message.includes('INTERNAL ASSERTION FAILED')) {
        window.location.reload();
      } else {
        // For Firestore errors, just reset the state without reload
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: 0
        });
      }
      return;
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <ErrorFallback
          error={this.state.error || new Error('Ocorreu um erro crítico na aplicação')}
          resetErrorBoundary={this.resetErrorBoundary}
          context="Erro crítico na aplicação"
          showHomeButton={true}
          shouldReport={true}
          severity="critical"
          errorInfo={this.state.errorInfo}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries}
        />
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary