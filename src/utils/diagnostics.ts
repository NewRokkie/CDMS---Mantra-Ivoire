/**
 * Diagnostic utilities to help troubleshoot connection and data issues
 */

import { supabase } from '../services/api/supabaseClient';
import { logger } from './logger';

export const diagnostics = {
  /**
   * Test Supabase connection
   */
  async testSupabaseConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      logger.info('Testing Supabase connection...', 'diagnostics');
      
      // Test basic connection
      const { data, error } = await supabase
        .from('yards')
        .select('count')
        .limit(1);

      if (error) {
        logger.error('Supabase connection test failed', 'diagnostics', error);
        return {
          success: false,
          message: `Connection failed: ${error.message}`,
          details: error
        };
      }

      logger.info('Supabase connection test successful', 'diagnostics');
      return {
        success: true,
        message: 'Connection successful',
        details: data
      };
    } catch (error) {
      logger.error('Supabase connection test error', 'diagnostics', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      };
    }
  },

  /**
   * Test user authentication status
   */
  async testAuthStatus(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      logger.info('Testing auth status...', 'diagnostics');
      
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        logger.error('Auth status test failed', 'diagnostics', error);
        return {
          success: false,
          message: `Auth check failed: ${error.message}`,
          details: error
        };
      }

      if (!session) {
        logger.warn('No active session found', 'diagnostics');
        return {
          success: false,
          message: 'No active session - user may need to log in again',
          details: null
        };
      }

      logger.info('Auth status test successful', 'diagnostics', { userId: session.user.id });
      return {
        success: true,
        message: 'User is authenticated',
        details: {
          userId: session.user.id,
          email: session.user.email,
          expiresAt: session.expires_at
        }
      };
    } catch (error) {
      logger.error('Auth status test error', 'diagnostics', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      };
    }
  },

  /**
   * Test yards data access
   */
  async testYardsAccess(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      logger.info('Testing yards access...', 'diagnostics');
      
      const { data, error } = await supabase
        .from('yards')
        .select('id, code, name, is_active')
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Yards access test failed', 'diagnostics', error);
        return {
          success: false,
          message: `Failed to fetch yards: ${error.message}`,
          details: error
        };
      }

      logger.info('Yards access test successful', 'diagnostics', { count: data?.length || 0 });
      return {
        success: true,
        message: `Found ${data?.length || 0} yards`,
        details: data
      };
    } catch (error) {
      logger.error('Yards access test error', 'diagnostics', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      };
    }
  },

  /**
   * Run all diagnostic tests
   */
  async runAllTests(): Promise<{
    connection: any;
    auth: any;
    yards: any;
    summary: string;
  }> {
    logger.info('Running all diagnostic tests...', 'diagnostics');
    
    const connection = await this.testSupabaseConnection();
    const auth = await this.testAuthStatus();
    const yards = await this.testYardsAccess();

    const allPassed = connection.success && auth.success && yards.success;
    const summary = allPassed
      ? 'All tests passed ✓'
      : 'Some tests failed - check details above';

    logger.info('Diagnostic tests completed', 'diagnostics', { 
      connection: connection.success,
      auth: auth.success,
      yards: yards.success
    });

    return {
      connection,
      auth,
      yards,
      summary
    };
  }
};

// Expose diagnostics to window for easy console access
if (typeof window !== 'undefined') {
  (window as any).diagnostics = diagnostics;
}
