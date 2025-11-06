/**
 * Enhanced error handling system for Gate In operations
 * Provides robust error classification, retry mechanisms, and user-friendly messages
 */

export interface ErrorDetails {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  retryable: boolean;
  userMessage: string;
  technicalDetails?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class GateInError extends Error {
  public readonly code: string;
  public readonly severity: 'error' | 'warning' | 'info';
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly technicalDetails?: string;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'GateInError';
    this.code = details.code;
    this.severity = details.severity;
    this.retryable = details.retryable;
    this.userMessage = details.userMessage;
    this.technicalDetails = details.technicalDetails;
  }
}

export class ErrorHandler {
  private static readonly ERROR_CODES = {
    // Validation Errors
    INVALID_CONTAINER_NUMBER: {
      code: 'INVALID_CONTAINER_NUMBER',
      message: 'Container number format is invalid',
      severity: 'error' as const,
      retryable: false,
      userMessage: 'Please check the container number format (4 letters + 7 digits)'
    },
    DUPLICATE_CONTAINER: {
      code: 'DUPLICATE_CONTAINER',
      message: 'Container already exists in system',
      severity: 'error' as const,
      retryable: false,
      userMessage: 'This container is already registered in the system'
    },
    CLIENT_NOT_FOUND: {
      code: 'CLIENT_NOT_FOUND',
      message: 'Client not found',
      severity: 'error' as const,
      retryable: false,
      userMessage: 'Selected client could not be found. Please select a valid client.'
    },
    MISSING_REQUIRED_FIELDS: {
      code: 'MISSING_REQUIRED_FIELDS',
      message: 'Required fields are missing',
      severity: 'error' as const,
      retryable: false,
      userMessage: 'Please fill in all required fields before submitting'
    },
    INVALID_YARD_OPERATION: {
      code: 'INVALID_YARD_OPERATION',
      message: 'Yard operation validation failed',
      severity: 'error' as const,
      retryable: false,
      userMessage: 'Cannot perform Gate In operation in current yard context'
    },

    // Network/Database Errors
    NETWORK_ERROR: {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed',
      severity: 'error' as const,
      retryable: true,
      userMessage: 'Connection failed. Please check your internet connection and try again.'
    },
    DATABASE_ERROR: {
      code: 'DATABASE_ERROR',
      message: 'Database operation failed',
      severity: 'error' as const,
      retryable: true,
      userMessage: 'Database error occurred. Please try again in a moment.'
    },
    TIMEOUT_ERROR: {
      code: 'TIMEOUT_ERROR',
      message: 'Operation timed out',
      severity: 'error' as const,
      retryable: true,
      userMessage: 'Operation timed out. Please try again.'
    },

    // Permission Errors
    INSUFFICIENT_PERMISSIONS: {
      code: 'INSUFFICIENT_PERMISSIONS',
      message: 'Insufficient permissions',
      severity: 'error' as const,
      retryable: false,
      userMessage: 'You do not have permission to perform this operation'
    },

    // System Errors
    UNKNOWN_ERROR: {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      severity: 'error' as const,
      retryable: true,
      userMessage: 'An unexpected error occurred. Please try again or contact support.'
    }
  };

  /**
   * Classifies an error and returns structured error details
   */
  static classifyError(error: any): ErrorDetails {
    // Handle GateInError instances
    if (error instanceof GateInError) {
      return {
        code: error.code,
        message: error.message,
        severity: error.severity,
        retryable: error.retryable,
        userMessage: error.userMessage,
        technicalDetails: error.technicalDetails
      };
    }

    // Handle network errors
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return this.ERROR_CODES.NETWORK_ERROR;
    }

    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
      return this.ERROR_CODES.TIMEOUT_ERROR;
    }

    // Handle Supabase/PostgreSQL errors
    if (error.code) {
      switch (error.code) {
        case '23505': // Unique constraint violation
          if (error.message?.includes('container')) {
            return {
              ...this.ERROR_CODES.DUPLICATE_CONTAINER,
              technicalDetails: error.message
            };
          }
          break;
        case '23503': // Foreign key constraint violation
          if (error.message?.includes('client')) {
            return {
              ...this.ERROR_CODES.CLIENT_NOT_FOUND,
              technicalDetails: error.message
            };
          }
          break;
        case 'PGRST116': // No rows returned
          return {
            ...this.ERROR_CODES.CLIENT_NOT_FOUND,
            technicalDetails: error.message
          };
      }
    }

    // Handle validation errors
    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      if (error.message?.includes('container number')) {
        return {
          ...this.ERROR_CODES.INVALID_CONTAINER_NUMBER,
          technicalDetails: error.message
        };
      }
      return {
        ...this.ERROR_CODES.MISSING_REQUIRED_FIELDS,
        technicalDetails: error.message
      };
    }

    // Default to unknown error
    return {
      ...this.ERROR_CODES.UNKNOWN_ERROR,
      technicalDetails: error.message || error.toString()
    };
  }

  /**
   * Creates a GateInError from any error
   */
  static createGateInError(error: any): GateInError {
    const details = this.classifyError(error);
    return new GateInError(details);
  }

  /**
   * Logs error with appropriate level
   */
  static logError(error: ErrorDetails, context?: any): void {
    const logData = {
      code: error.code,
      message: error.message,
      severity: error.severity,
      retryable: error.retryable,
      context,
      timestamp: new Date().toISOString()
    };

    switch (error.severity) {
      case 'error':
        console.error('🚨 Gate In Error:', logData);
        break;
      case 'warning':
        console.warn('⚠️ Gate In Warning:', logData);
        break;
      case 'info':
        console.info('ℹ️ Gate In Info:', logData);
        break;
    }
  }
}

export class RetryManager {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  /**
   * Executes an operation with retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    let lastError: any;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        console.log(`🔄 Attempting operation (${attempt}/${finalConfig.maxAttempts})`);
        return await operation();
      } catch (error) {
        lastError = error;
        const errorDetails = ErrorHandler.classifyError(error);
        
        ErrorHandler.logError(errorDetails, { attempt, maxAttempts: finalConfig.maxAttempts });

        // Don't retry if error is not retryable
        if (!errorDetails.retryable) {
          console.log('❌ Error is not retryable, stopping attempts');
          throw ErrorHandler.createGateInError(error);
        }

        // Don't retry on last attempt
        if (attempt === finalConfig.maxAttempts) {
          console.log('❌ Max attempts reached, failing');
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
          finalConfig.maxDelay
        );

        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw ErrorHandler.createGateInError(lastError);
  }

  /**
   * Checks if an error should be retried
   */
  static shouldRetry(error: any): boolean {
    const errorDetails = ErrorHandler.classifyError(error);
    return errorDetails.retryable;
  }
}

/**
 * Utility function to handle async operations with error handling
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  context: string
): Promise<{ success: true; data: T } | { success: false; error: GateInError }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const gateInError = ErrorHandler.createGateInError(error);
    ErrorHandler.logError({
      code: gateInError.code,
      message: gateInError.message,
      severity: gateInError.severity,
      retryable: gateInError.retryable,
      userMessage: gateInError.userMessage,
      technicalDetails: gateInError.technicalDetails
    }, { context });
    
    return { success: false, error: gateInError };
  }
}