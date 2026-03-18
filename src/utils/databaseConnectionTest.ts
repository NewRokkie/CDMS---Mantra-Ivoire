/**
 * Database Connection Test Utility
 * 
 * This utility helps test database connection status and timeout scenarios
 * for development and debugging purposes.
 */

import { supabase } from '../services/api/supabaseClient';
import { logger } from './logger';

export interface ConnectionTestResult {
  isConnected: boolean;
  responseTime: number;
  error?: string;
  timestamp: Date;
}

/**
 * Test database connection with configurable timeout
 */
export const testDatabaseConnection = async (timeoutMs: number = 10000): Promise<ConnectionTestResult> => {
  const startTime = Date.now();
  const timestamp = new Date();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Remplacer l'appel à la table 'users' par un appel à l'API auth
    const { error } = await supabase.auth.getSession();
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (error) {
      logger.error('Supabase connection test failed', 'testDatabaseConnection', error);
      return {
        isConnected: false,
        responseTime,
        error: error.message,
        timestamp
      };
    }

    logger.info('Supabase connection test successful', 'testDatabaseConnection');
    return {
      isConnected: true,
      responseTime,
      timestamp
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    if (error.name === 'AbortError') {
      logger.error('Supabase connection timeout', 'testDatabaseConnection');
      return {
        isConnected: false,
        responseTime,
        error: `Connection timeout after ${timeoutMs}ms`,
        timestamp
      };
    }
    
    logger.error('Supabase connection test error', 'testDatabaseConnection', error);
    return {
      isConnected: false,
      responseTime,
      error: error.message || 'Unknown connection error',
      timestamp
    };
  }
};

/**
 * Run multiple connection tests to get average response time
 */
export const runConnectionBenchmark = async (iterations: number = 3, timeoutMs: number = 10000): Promise<{
  averageResponseTime: number;
  successRate: number;
  results: ConnectionTestResult[];
}> => {
  const results: ConnectionTestResult[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const result = await testDatabaseConnection(timeoutMs);
    results.push(result);
    
    // Small delay between tests
    if (i < iterations - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const successfulTests = results.filter(r => r.isConnected);
  const averageResponseTime = successfulTests.length > 0 
    ? successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length
    : 0;
  
  const successRate = (successfulTests.length / results.length) * 100;
  
  return {
    averageResponseTime,
    successRate,
    results
  };
};

/**
 * Console helper for testing database connection
 */
export const logConnectionTest = async () => {
  console.group('🔍 Database Connection Test');
  
  const result = await testDatabaseConnection(8000);
  
  console.log('Connection Status:', result.isConnected ? '✅ Connected' : '❌ Failed');
  console.log('Response Time:', `${result.responseTime}ms`);
  console.log('Timestamp:', result.timestamp.toISOString());
  
  if (result.error) {
    console.log('Error:', result.error);
  }
  
  console.groupEnd();
  
  return result;
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).testDatabaseConnection = logConnectionTest;
}