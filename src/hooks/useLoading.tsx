import React, { createContext, useContext, useState } from 'react';

interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  loadingComponent?: React.ComponentType<any>;
}

interface LoadingContextType {
  state: LoadingState;
  setState: React.Dispatch<React.SetStateAction<LoadingState>>;
}

/**
 * Loading Context for route-based loading states
 */
const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

/**
 * Hook for managing loading states across the application
 */
export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }

  return context;
};

/**
 * Hook for displaying loading states
 */
export const useLoadingState = () => {
  const { state, setState } = useLoading();

  const setLoading = (isLoading: boolean, message?: string) => {
    setState(prev => ({
      ...prev,
      isLoading,
      loadingMessage: message
    }));
  };

  const showLoading = (componentOrMessage?: React.ComponentType<any> | string, messageArg?: string) => {
    let component: React.ComponentType<any> | undefined;
    let message: string | undefined;

    if (typeof componentOrMessage === 'string') {
      message = componentOrMessage;
      component = undefined;
    } else {
      component = componentOrMessage;
      message = messageArg;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      loadingComponent: component,
      loadingMessage: message ?? prev.loadingMessage
    }));
  };

  const hideLoading = () => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      loadingMessage: undefined,
      loadingComponent: undefined
    }));
  };

  return {
    ...state,
    setLoading,
    showLoading,
    hideLoading
  };
};

/**
 * Loading Spinner Component
 */
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4'
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`animate-spin rounded-full border-gray-200 border-t-blue-600 ${sizeClasses[size]}`}
        role="status"
        aria-label="loading"
      />
    </div>
  );
};

/**
 * Loading Overlay Component
 */
export const LoadingOverlay: React.FC<{
  message?: string;
  component?: React.ComponentType<any>;
}> = ({ message, component: Component = LoadingSpinner }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] transition-opacity duration-300">
      <div className="bg-white rounded-xl p-8 shadow-2xl max-w-sm w-full mx-4 border border-gray-100 flex flex-col items-center animate-scale-in">
        <Component />
        {message && (
          <p className="mt-4 text-gray-700 font-medium text-center animate-pulse">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Loading Provider Component
 */
export const LoadingProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [state, setState] = useState<LoadingState>({
    isLoading: false
  });

  return (
    <LoadingContext.Provider value={{ state, setState }}>
      {children}
      {state.isLoading && (
        <LoadingOverlay
          message={state.loadingMessage}
          component={state.loadingComponent}
        />
      )}
    </LoadingContext.Provider>
  );
};