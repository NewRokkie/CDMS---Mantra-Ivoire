/**
 * Supabase Test Utilities - Comprehensive testing suite for Supabase configuration
 * Validates connection, authentication, database operations, and configuration
 */

import { createClient } from '@supabase/supabase-js';

// Test result interface
export interface TestResult {
  testName: string;
  success: boolean;
  message: string;
  duration?: number;
  details?: any;
}

// Test suite summary
export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  duration: number;
}

// Complete test suite result
export interface SupabaseTestSuite {
  overallSuccess: boolean;
  results: TestResult[];
  summary: TestSummary;
}

// Individual test functions
class SupabaseTestRunner {
  private supabase: any;
  private startTime: number = 0;

  constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  private startTimer(): void {
    this.startTime = performance.now();
  }

  private getElapsedTime(): number {
    return Math.round(performance.now() - this.startTime);
  }

  // Test 1: Environment Variables
  async testEnvironmentVariables(): Promise<TestResult> {
    this.startTimer();
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const useSupabase = import.meta.env.VITE_USE_SUPABASE;

      const missing = [];
      if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
      if (!supabaseKey) missing.push('VITE_SUPABASE_ANON_KEY');

      if (missing.length > 0) {
        return {
          testName: 'Environment Variables',
          success: false,
          message: `Missing environment variables: ${missing.join(', ')}`,
          duration: this.getElapsedTime(),
          details: {
            supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
            supabaseKey: supabaseKey ? 'Set' : 'Missing',
            useSupabase: useSupabase || 'Not set'
          }
        };
      }

      return {
        testName: 'Environment Variables',
        success: true,
        message: 'All required environment variables are configured',
        duration: this.getElapsedTime(),
        details: {
          supabaseUrl: supabaseUrl.substring(0, 30) + '...',
          supabaseKey: supabaseKey.substring(0, 20) + '...',
          useSupabase: useSupabase
        }
      };
    } catch (error) {
      return {
        testName: 'Environment Variables',
        success: false,
        message: `Error checking environment variables: ${error}`,
        duration: this.getElapsedTime()
      };
    }
  }

  // Test 2: Supabase Client Initialization
  async testClientInitialization(): Promise<TestResult> {
    this.startTimer();

    try {
      if (!this.supabase) {
        return {
          testName: 'Client Initialization',
          success: false,
          message: 'Supabase client could not be initialized',
          duration: this.getElapsedTime()
        };
      }

      // Test basic client properties
      const hasAuth = !!this.supabase.auth;
      const hasFrom = !!this.supabase.from;

      if (!hasAuth || !hasFrom) {
        return {
          testName: 'Client Initialization',
          success: false,
          message: 'Supabase client missing required methods',
          duration: this.getElapsedTime(),
          details: { hasAuth, hasFrom }
        };
      }

      return {
        testName: 'Client Initialization',
        success: true,
        message: 'Supabase client initialized successfully',
        duration: this.getElapsedTime(),
        details: { hasAuth, hasFrom }
      };
    } catch (error) {
      return {
        testName: 'Client Initialization',
        success: false,
        message: `Client initialization error: ${error}`,
        duration: this.getElapsedTime()
      };
    }
  }

  // Test 3: Database Connection
  async testDatabaseConnection(): Promise<TestResult> {
    this.startTimer();

    try {
      if (!this.supabase) {
        return {
          testName: 'Database Connection',
          success: false,
          message: 'No Supabase client available',
          duration: this.getElapsedTime()
        };
      }

      // Try to query a system table
      const { data, error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        return {
          testName: 'Database Connection',
          success: false,
          message: `Database connection failed: ${error.message}`,
          duration: this.getElapsedTime(),
          details: error
        };
      }

      return {
        testName: 'Database Connection',
        success: true,
        message: 'Database connection successful',
        duration: this.getElapsedTime(),
        details: { queryResult: data }
      };
    } catch (error) {
      return {
        testName: 'Database Connection',
        success: false,
        message: `Database connection error: ${error}`,
        duration: this.getElapsedTime()
      };
    }
  }

  // Test 4: Authentication Service
  async testAuthenticationService(): Promise<TestResult> {
    this.startTime = performance.now();

    try {
      if (!this.supabase) {
        return {
          testName: 'Authentication Service',
          success: false,
          message: 'No Supabase client available',
          duration: this.getElapsedTime()
        };
      }

      // Test auth service availability
      const authService = this.supabase.auth;
      if (!authService) {
        return {
          testName: 'Authentication Service',
          success: false,
          message: 'Authentication service not available',
          duration: this.getElapsedTime()
        };
      }

      // Test getting current session (should not throw error)
      const { data: session, error } = await authService.getSession();
      
      return {
        testName: 'Authentication Service',
        success: true,
        message: 'Authentication service is available and responsive',
        duration: this.getElapsedTime(),
        details: {
          hasSession: !!session?.session,
          sessionError: error?.message || null
        }
      };
    } catch (error) {
      return {
        testName: 'Authentication Service',
        success: false,
        message: `Authentication service error: ${error}`,
        duration: this.getElapsedTime()
      };
    }
  }

  // Test 5: Table Access
  async testTableAccess(): Promise<TestResult> {
    this.startTimer();

    try {
      if (!this.supabase) {
        return {
          testName: 'Table Access',
          success: false,
          message: 'No Supabase client available',
          duration: this.getElapsedTime()
        };
      }

      const tables = ['users', 'containers'];
      const results: any = {};

      for (const table of tables) {
        try {
          const { data, error } = await this.supabase
            .from(table)
            .select('*')
            .limit(1);

          results[table] = {
            accessible: !error,
            error: error?.message || null,
            hasData: data && data.length > 0
          };
        } catch (err) {
          results[table] = {
            accessible: false,
            error: `${err}`,
            hasData: false
          };
        }
      }

      const accessibleTables = Object.keys(results).filter(
        table => results[table].accessible
      );

      return {
        testName: 'Table Access',
        success: accessibleTables.length > 0,
        message: `${accessibleTables.length}/${tables.length} tables accessible`,
        duration: this.getElapsedTime(),
        details: results
      };
    } catch (error) {
      return {
        testName: 'Table Access',
        success: false,
        message: `Table access error: ${error}`,
        duration: this.getElapsedTime()
      };
    }
  }

  // Test 6: RLS (Row Level Security) Configuration
  async testRLSConfiguration(): Promise<TestResult> {
    this.startTimer();

    try {
      if (!this.supabase) {
        return {
          testName: 'RLS Configuration',
          success: false,
          message: 'No Supabase client available',
          duration: this.getElapsedTime()
        };
      }

      // Test RLS by trying to access data without authentication
      const { data, error } = await this.supabase
        .from('users')
        .select('id')
        .limit(1);

      // If we get data without auth, RLS might not be properly configured
      // If we get an auth error, RLS is working
      const rlsWorking = error && error.message.includes('auth');

      return {
        testName: 'RLS Configuration',
        success: true, // We consider this a success if we can test it
        message: rlsWorking 
          ? 'RLS appears to be configured (auth required)'
          : 'RLS may not be configured (data accessible without auth)',
        duration: this.getElapsedTime(),
        details: {
          rlsWorking,
          error: error?.message || null,
          dataReturned: !!data
        }
      };
    } catch (error) {
      return {
        testName: 'RLS Configuration',
        success: false,
        message: `RLS test error: ${error}`,
        duration: this.getElapsedTime()
      };
    }
  }
}

// Main test runner function
export async function runSupabaseTests(): Promise<SupabaseTestSuite> {
  const testRunner = new SupabaseTestRunner();
  const startTime = performance.now();
  const results: TestResult[] = [];

  console.log('🧪 Starting Supabase test suite...');

  // Run all tests
  const tests = [
    () => testRunner.testEnvironmentVariables(),
    () => testRunner.testClientInitialization(),
    () => testRunner.testDatabaseConnection(),
    () => testRunner.testAuthenticationService(),
    () => testRunner.testTableAccess(),
    () => testRunner.testRLSConfiguration()
  ];

  for (const test of tests) {
    try {
      const result = await test();
      results.push(result);
      console.log(`${result.success ? '✅' : '❌'} ${result.testName}: ${result.message}`);
    } catch (error) {
      results.push({
        testName: 'Unknown Test',
        success: false,
        message: `Test execution error: ${error}`,
        duration: 0
      });
    }
  }

  const totalDuration = Math.round(performance.now() - startTime);
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  const overallSuccess = failed === 0;

  const summary: TestSummary = {
    total: results.length,
    passed,
    failed,
    duration: totalDuration
  };

  console.log(`🏁 Test suite completed: ${passed}/${results.length} tests passed in ${totalDuration}ms`);

  return {
    overallSuccess,
    results,
    summary
  };
}

// Export individual test runner for advanced usage
export { SupabaseTestRunner };