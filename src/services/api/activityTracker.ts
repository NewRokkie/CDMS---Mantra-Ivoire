import { supabase } from './supabaseClient';
import { logger } from '../../utils/logger';

/**
 * Activity Tracker Service
 * Provides methods to track user activities and login sessions
 */

export interface ActivityOptions {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginOptions {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  loginMethod?: string;
  deviceInfo?: Record<string, any>;
}

export class ActivityTracker {
  /**
   * Log a user activity
   */
  async logActivity(options: ActivityOptions): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('user_activities')
        .insert({
          user_id: options.userId,
          action: options.action,
          entity_type: options.entityType,
          entity_id: options.entityId,
          description: options.description,
          metadata: options.metadata || {},
          ip_address: options.ipAddress,
          user_agent: options.userAgent
        })
        .select('id')
        .single();

      if (error) {
        logger.error('Failed to log user activity', 'ActivityTracker', { error, options });
        return null;
      }

      logger.debug('User activity logged', 'ActivityTracker', { activityId: data.id, action: options.action });
      return data.id;
    } catch (error) {
      logger.error('Error logging user activity', 'ActivityTracker', { error, options });
      return null;
    }
  }

  /**
   * Record a user login
   */
  async recordLogin(options: LoginOptions): Promise<string | null> {
    try {
      // Use the database function for consistent login recording
      const { data, error } = await supabase.rpc('record_user_login', {
        p_user_id: options.userId,
        p_ip_address: options.ipAddress || null,
        p_user_agent: options.userAgent || null,
        p_login_method: options.loginMethod || 'email',
        p_device_info: options.deviceInfo || {}
      });

      if (error) {
        logger.error('Failed to record user login', 'ActivityTracker', { error, userId: options.userId });
        return null;
      }

      logger.info('User login recorded', 'ActivityTracker', { loginId: data, userId: options.userId });
      return data;
    } catch (error) {
      logger.error('Error recording user login', 'ActivityTracker', { error, userId: options.userId });
      return null;
    }
  }

  /**
   * Record a user logout
   */
  async recordLogout(loginId: string, userId?: string): Promise<boolean> {
    try {
      // Use the database function for consistent logout recording
      const { data, error } = await supabase.rpc('record_user_logout', {
        p_login_id: loginId,
        p_user_id: userId || null
      });

      if (error) {
        logger.error('Failed to record user logout', 'ActivityTracker', { error, loginId });
        return false;
      }

      logger.info('User logout recorded', 'ActivityTracker', { loginId, success: data });
      return data;
    } catch (error) {
      logger.error('Error recording user logout', 'ActivityTracker', { error, loginId });
      return false;
    }
  }

  /**
   * Record a failed login attempt
   */
  async recordFailedLogin(
    email: string,
    failureReason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('record_failed_login', {
        p_email: email,
        p_failure_reason: failureReason,
        p_ip_address: ipAddress || null,
        p_user_agent: userAgent || null
      });

      if (error) {
        logger.error('Failed to record failed login', 'ActivityTracker', { error, email });
        return null;
      }

      logger.warn('Failed login attempt recorded', 'ActivityTracker', { loginId: data, email, reason: failureReason });
      return data;
    } catch (error) {
      logger.error('Error recording failed login', 'ActivityTracker', { error, email });
      return null;
    }
  }

  /**
   * Convenience method to log common activities
   */
  async logUserAction(
    userId: string,
    action: 'create' | 'update' | 'delete' | 'view' | 'export' | 'import',
    entityType: string,
    entityId: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<string | null> {
    return this.logActivity({
      userId,
      action,
      entityType,
      entityId,
      description: description || `${action} ${entityType}`,
      metadata
    });
  }
}

export const activityTracker = new ActivityTracker();
