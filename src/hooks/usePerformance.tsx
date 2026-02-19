import React, { createContext, useContext, useState, useEffect } from 'react';

interface PerformanceMetrics {
  routeChangeTime: number;
  componentRenderTime: number;
  renderTime: number;
  errorCount: number;
  navigationType: 'direct' | 'sidebar' | 'deep-link' | 'browser-back';
}

interface PerformanceContextType {
  metrics: PerformanceMetrics;
  startTiming: (route: string) => void;
  endTiming: (route: string) => void;
  recordError: (route: string, error: string) => void;
  incrementRouteChange: () => void;
}

/**
 * Performance Context for monitoring application performance
 */
const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

/**
 * Hook for performance monitoring
 */
export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }

  return context;
};

/**
 * Performance Provider Component
 */
export const PerformanceProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    routeChangeTime: Date.now(),
    componentRenderTime: Date.now(),
    renderTime: 0,
    errorCount: 0,
    navigationType: 'direct'
  });

  // Performance monitoring effect
  useEffect(() => {
    // Record route change timing
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      setMetrics(prev => ({
        ...prev,
        routeChangeTime: endTime,
        componentRenderTime: renderTime,
        renderTime,
        navigationType: prev.navigationType // Carry over navigation type
      }));
    };
  }, []);

  const contextValue: PerformanceContextType = {
    metrics,
    startTiming: (route: string) => {
      setMetrics(prev => ({ ...prev, routeChangeTime: Date.now(), navigationType: 'direct' }));
    },
    endTiming: (route: string) => {
      setMetrics(prev => ({ ...prev, componentRenderTime: Date.now() }));
    },
    recordError: (route: string, error: string) => {
      setMetrics(prev => ({
        ...prev,
        errorCount: prev.errorCount + 1
      }));

      // Log error for debugging
      console.error(`Route error in ${route}:`, error);
    },
    incrementRouteChange: () => {
      setMetrics(prev => ({
        ...prev,
        routeChangeTime: Date.now()
      }));
    }
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
};

/**
 * Performance Monitor Component
 */
export const PerformanceMonitor: React.FC = () => {
  const { metrics } = usePerformance();
  const isDev = typeof window !== 'undefined' && (window as any).__DEV__ !== false;

  // Log performance metrics in development
  useEffect(() => {
    if (isDev) {
      console.log('Performance Metrics:', {
        routeChangeTime: new Date(metrics.routeChangeTime),
        componentRenderTime: new Date(metrics.componentRenderTime),
        renderTime: metrics.renderTime,
        errorCount: metrics.errorCount,
        navigationType: metrics.navigationType
      });
    }
  }, [metrics, isDev]);

  // Only show in development
  if (!isDev) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded-t-lg shadow-lg z-50">
      <div className="font-mono">
        <div>Render: {metrics.renderTime.toFixed(2)}ms</div>
        <div>Errors: {metrics.errorCount}</div>
        <div>Navigation: {metrics.navigationType}</div>
      </div>
    </div>
  );
};