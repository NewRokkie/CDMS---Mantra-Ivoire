import React, { Component, ErrorInfo } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';
import { useNavigate, NavigateFunction } from 'react-router-dom';

interface ErrorBoundaryProps {
  children?: React.ReactNode;
  fallback?: React.ReactNode;
  navigate: NavigateFunction;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Enhanced Error Boundary Component
 * Provides comprehensive error handling with recovery options
 */
class ErrorBoundaryInner extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      hasError: true,
      error,
      errorInfo,
      retryCount: this.state.retryCount + 1
    });

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.props.children !== prevProps.children) {
      if (this.state.hasError) {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          retryCount: 0
        });
      }
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { fallback: fallbackProp, navigate, children } = this.props;

    if (hasError) {
      // If there's a custom fallback, use it
      if (fallbackProp) {
        return fallbackProp;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-2xl w-full">
            <div className="bg-white rounded-lg shadow-xl p-6 border border-red-200">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-12 w-12 text-red-400" />
                </div>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-red-800">Something went wrong</h1>
                  <p className="text-gray-600 mt-2">
                    {error?.message || 'An unexpected error occurred'}
                  </p>
                </div>
              </div>

              {retryCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center text-blue-800">
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    <span className="text-sm">
                      Error occurred after {retryCount} {retryCount === 1 ? 'retry' : 'retries'}.
                      This might be a temporary issue.
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">What happened?</h2>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-700">
                      {error?.message || 'An unexpected error occurred while rendering this page.'}
                    </p>
                    {errorInfo && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                          Technical Details
                        </summary>
                        <div className="mt-2 text-xs text-gray-600 whitespace-pre-wrap font-mono">
                          {JSON.stringify(errorInfo, null, 2)}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">What can you do?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={this.handleRetry}
                    className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </button>

                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Wrapper component to provide hooks to class component
export const ErrorBoundary: React.FC<{ children?: React.ReactNode; fallback?: React.ReactNode }> = (props) => {
  const navigate = useNavigate();
  return <ErrorBoundaryInner {...props} navigate={navigate} />;
};

/**
 * HOC for wrapping components with error boundary
 */
export const withErrorBoundary = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
  const WithErrorBoundary = (props: P) => (
    <ErrorBoundary>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundary;
};