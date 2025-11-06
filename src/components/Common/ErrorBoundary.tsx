import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('🚨 [ERROR_BOUNDARY] Component error caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString()
    });

    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // This would typically send to an error reporting service like Sentry
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // For now, just log to console
    console.error('📊 [ERROR_REPORTING] Error report:', errorReport);
    
    // In production, uncomment and configure your error reporting service:
    // Sentry.captureException(error, { extra: errorReport });
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      console.log(`🔄 [ERROR_BOUNDARY] Retrying... (${this.state.retryCount + 1}/${this.maxRetries})`);
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleReload = () => {
    console.log('🔄 [ERROR_BOUNDARY] Reloading page...');
    window.location.reload();
  };

  private handleGoHome = () => {
    console.log('🏠 [ERROR_BOUNDARY] Navigating to home...');
    window.location.href = '/';
  };

  private getErrorMessage = (error: Error): string => {
    // Provide user-friendly error messages based on error types
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'The application failed to load properly. This might be due to a network issue or an update.';
    }
    
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    
    if (error.message.includes('Permission denied') || error.message.includes('Unauthorized')) {
      return 'You do not have permission to access this feature. Please contact your administrator.';
    }
    
    if (error.message.includes('Database') || error.message.includes('SQL')) {
      return 'A database error occurred. The technical team has been notified.';
    }
    
    return 'An unexpected error occurred. Our team has been notified and is working to fix this issue.';
  };

  private getErrorSeverity = (error: Error): 'low' | 'medium' | 'high' | 'critical' => {
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'medium';
    }
    
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return 'medium';
    }
    
    if (error.message.includes('Permission denied') || error.message.includes('Unauthorized')) {
      return 'high';
    }
    
    if (error.message.includes('Database') || error.message.includes('SQL')) {
      return 'critical';
    }
    
    return 'high';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorId, retryCount } = this.state;
      const canRetry = retryCount < this.maxRetries;
      const errorMessage = error ? this.getErrorMessage(error) : 'An unknown error occurred';
      const severity = error ? this.getErrorSeverity(error) : 'high';

      const severityColors = {
        low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        medium: 'bg-orange-50 border-orange-200 text-orange-800',
        high: 'bg-red-50 border-red-200 text-red-800',
        critical: 'bg-red-100 border-red-300 text-red-900'
      };

      const severityIcons = {
        low: 'text-yellow-500',
        medium: 'text-orange-500',
        high: 'text-red-500',
        critical: 'text-red-600'
      };

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            {/* Main Error Card */}
            <div className={`rounded-2xl border-2 p-8 ${severityColors[severity]} shadow-lg`}>
              <div className="text-center">
                <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-white mb-6`}>
                  <AlertTriangle className={`h-8 w-8 ${severityIcons[severity]}`} />
                </div>
                
                <h1 className="text-2xl font-bold mb-4">
                  {severity === 'critical' ? 'Critical Error' : 'Something went wrong'}
                </h1>
                
                <p className="text-lg mb-6 leading-relaxed">
                  {errorMessage}
                </p>

                {/* Error ID for support */}
                {errorId && (
                  <div className="bg-white/50 rounded-lg p-3 mb-6 text-sm">
                    <p className="font-medium">Error ID: <code className="bg-white px-2 py-1 rounded">{errorId}</code></p>
                    <p className="text-xs mt-1 opacity-75">
                      Please include this ID when contacting support
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {canRetry && (
                    <button
                      onClick={this.handleRetry}
                      className="flex items-center justify-center space-x-2 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Try Again ({this.maxRetries - retryCount} left)</span>
                    </button>
                  )}
                  
                  <button
                    onClick={this.handleReload}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Reload Page</span>
                  </button>
                  
                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium shadow-sm"
                  >
                    <Home className="h-4 w-4" />
                    <span>Go Home</span>
                  </button>
                </div>

                {/* Contact Support */}
                <div className="mt-8 pt-6 border-t border-white/20">
                  <p className="text-sm mb-3">
                    If this problem persists, please contact our support team:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center text-sm">
                    <a
                      href="mailto:support@cdms.com"
                      className="flex items-center justify-center space-x-1 text-current hover:underline"
                    >
                      <Mail className="h-4 w-4" />
                      <span>support@cdms.com</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Details (Development/Debug Mode) */}
            {(this.props.showDetails || process.env.NODE_ENV === 'development') && error && (
              <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Bug className="h-5 w-5 mr-2 text-gray-500" />
                    Technical Details
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    This information is only visible in development mode
                  </p>
                </div>
                
                <div className="p-4 space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Error Message:</h4>
                    <pre className="bg-red-50 text-red-800 p-3 rounded-lg text-sm overflow-x-auto">
                      {error.message}
                    </pre>
                  </div>
                  
                  {error.stack && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Stack Trace:</h4>
                      <pre className="bg-gray-50 text-gray-800 p-3 rounded-lg text-xs overflow-x-auto max-h-64">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {errorInfo?.componentStack && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Component Stack:</h4>
                      <pre className="bg-blue-50 text-blue-800 p-3 rounded-lg text-xs overflow-x-auto max-h-64">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}

                  {this.props.context && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Context:</h4>
                      <p className="bg-gray-50 text-gray-800 p-3 rounded-lg text-sm">
                        {this.props.context}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for manual error reporting
export const useErrorHandler = () => {
  const reportError = (error: Error, context?: string) => {
    console.error('🚨 [ERROR_HANDLER] Manual error report:', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
    
    // In production, send to error reporting service
    // Sentry.captureException(error, { extra: { context } });
  };

  return { reportError };
};