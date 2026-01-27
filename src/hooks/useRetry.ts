import { useState, useCallback, useRef } from 'react';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  lastError: Error | null;
  canRetry: boolean;
}

const defaultConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error) => {
    // Default retry condition - retry on network errors and temporary failures
    if (!error) return false;
    
    const message = error.message?.toLowerCase() || '';
    const code = error.code || '';
    
    // Retry on network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return true;
    }
    
    // Retry on specific database errors that might be transient
    const retryableCodes = [
      'PGRST301', // Database connection failed
      'PGRST302', // Database query timeout
      '08006',    // Connection failure
      '08001',    // Unable to connect
      '53300',    // Too many connections
      '57P01',    // Connection terminated
    ];
    
    return retryableCodes.includes(code);
  }
};

export const useRetry = <T extends any[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  config: Partial<RetryConfig> = {}
) => {
  const finalConfig = { ...defaultConfig, ...config };
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null,
    canRetry: true
  });
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const execute = useCallback(async (...args: T): Promise<R> => {
    setState(prev => ({ ...prev, isRetrying: true, lastError: null }));
    
    let lastError: Error;
    
    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        const result = await asyncFunction(...args);
        
        // Success - reset state
        setState({
          isRetrying: false,
          retryCount: 0,
          lastError: null,
          canRetry: true
        });
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if we should retry
        const shouldRetry = finalConfig.retryCondition!(lastError);
        const hasRetriesLeft = attempt < finalConfig.maxRetries;
        
        if (!shouldRetry || !hasRetriesLeft) {
          // No more retries - update state and throw
          setState({
            isRetrying: false,
            retryCount: attempt,
            lastError,
            canRetry: shouldRetry && attempt < finalConfig.maxRetries
          });
          throw lastError;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
          finalConfig.maxDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * delay;
        const finalDelay = delay + jitter;
        
        // Update state to show retry attempt
        setState(prev => ({
          ...prev,
          retryCount: attempt + 1,
          lastError
        }));
        
        // Wait before retrying
        await new Promise(resolve => {
          timeoutRef.current = setTimeout(resolve, finalDelay);
        });
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw lastError!;
  }, [asyncFunction, finalConfig]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setState({
      isRetrying: false,
      retryCount: 0,
      lastError: null,
      canRetry: true
    });
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isRetrying: false,
      canRetry: false
    }));
  }, []);

  return {
    execute,
    reset,
    cancel,
    ...state
  };
};

// Specialized hook for database operations
export const useDatabaseRetry = <T extends any[], R>(
  asyncFunction: (...args: T) => Promise<R>
) => {
  return useRetry(asyncFunction, {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffMultiplier: 2,
    retryCondition: (error) => {
      if (!error) return false;
      
      const message = error.message?.toLowerCase() || '';
      const code = error.code || '';
      
      // Retry on connection issues
      if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
        return true;
      }
      
      // Retry on specific Supabase/PostgreSQL errors
      const retryableCodes = [
        'PGRST301', // Database connection failed
        'PGRST302', // Database query timeout
        'PGRST204', // Schema cache loading failed
        '08006',    // Connection failure
        '08001',    // Unable to connect to database
        '08003',    // Connection does not exist
        '53300',    // Too many connections
        '57P01',    // Connection terminated unexpectedly
        '40001',    // Serialization failure
        '40P01',    // Deadlock detected
      ];
      
      return retryableCodes.includes(code);
    }
  });
};

// Hook for user management operations with specific retry logic
export const useUserManagementRetry = <T extends any[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  operation: 'read' | 'write' | 'delete'
) => {
  const config: Partial<RetryConfig> = {
    maxRetries: operation === 'read' ? 3 : 2, // More retries for read operations
    baseDelay: operation === 'write' ? 2000 : 1000, // Longer delay for write operations
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryCondition: (error) => {
      if (!error) return false;
      
      const message = error.message?.toLowerCase() || '';
      const code = error.code || '';
      
      // Don't retry validation errors or permission errors
      if (message.includes('validation') || 
          message.includes('permission') || 
          message.includes('unauthorized') ||
          message.includes('already exists') ||
          code === '23505' || // Unique constraint violation
          code === '42501'    // Insufficient privileges
      ) {
        return false;
      }
      
      // Retry on transient errors
      return message.includes('network') || 
             message.includes('timeout') || 
             message.includes('connection') ||
             ['PGRST301', 'PGRST302', '08006', '08001', '53300', '57P01'].includes(code);
    }
  };
  
  return useRetry(asyncFunction, config);
};

// Utility function to create a retryable version of any async function
export const withRetry = <T extends any[], R>(
  asyncFunction: (...args: T) => Promise<R>,
  config?: Partial<RetryConfig>
) => {
  const finalConfig = { ...defaultConfig, ...config };
  
  return async (...args: T): Promise<R> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await asyncFunction(...args);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const shouldRetry = finalConfig.retryCondition!(lastError);
        const hasRetriesLeft = attempt < finalConfig.maxRetries;
        
        if (!shouldRetry || !hasRetriesLeft) {
          throw lastError;
        }
        
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
          finalConfig.maxDelay
        );
        
        const jitter = Math.random() * 0.1 * delay;
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
    
    throw lastError!;
  };
};