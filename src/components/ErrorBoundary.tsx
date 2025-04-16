import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { reportError } from '../utils/errorReporting';
import { useNavigate } from 'react-router-dom';
import { ErrorFallback } from './common/ErrorFallback';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  errorReportingEnabled?: boolean;
  name?: string;
  navigate?: (path: string) => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorBoundaryKey: number;
}

class ErrorBoundary extends Component<Props, State> {
  static defaultProps = {
    errorReportingEnabled: true,
    name: 'UnnamedComponent',
    onError: () => {}
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorBoundaryKey: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorBoundaryKey: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo
    });
    
    // Skip reporting for offline errors
    if (error.message.includes('offline') || error.message.includes('client is offline')) {
      console.warn('Offline error caught by ErrorBoundary:', error.message);
      return;
    }
    
    // Skip reporting for Firestore internal assertion errors
    if (error.message.includes('INTERNAL ASSERTION FAILED')) {
      console.warn('Ignoring Firestore internal assertion error in ErrorBoundary:', error.message);
      return;
    }
    
    // Log error to monitoring service or console
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Report error to monitoring service if enabled
    if (this.props.errorReportingEnabled) {
      reportError(error instanceof Error ? error : new Error(String(error)), {
        context: `ErrorBoundary: ${this.props.name}`,
        componentStack: errorInfo.componentStack,
        severity: 'error'
      });
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null, 
      errorInfo: null, 
      errorBoundaryKey: this.state.errorBoundaryKey + 1
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

      // Check if it's an offline error
      const isOfflineError = this.state.error && 
        (this.state.error.message.includes('offline') || 
         this.state.error.message.includes('client is offline'));
      
      return (
        <ErrorFallback
          navigate={this.props.navigate}
          error={this.state.error || new Error('Ocorreu um erro inesperado')}
          resetErrorBoundary={this.resetErrorBoundary}
          context={`Erro em ${this.props.name}`}
          showHomeButton={!isOfflineError}
          showBackButton={true}
          errorInfo={this.state.errorInfo}
          isNetworkError={isOfflineError}
        />
      );
    }
    // Use key to force re-render of children when error is reset
    return <React.Fragment key={this.state.errorBoundaryKey}>{this.props.children}</React.Fragment>;
  }
}

export default ErrorBoundary;