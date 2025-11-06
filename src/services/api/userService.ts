import { supabase } from './supabaseClient';
import { User, ModuleAccess, UserDetails, YardAssignment, UserActivity, PermissionSummary, LoginRecord } from '../../types';

// Migration execution interface
interface MigrationResult {
  success: boolean;
  message: string;
  error?: string;
}

// Enhanced error handling interfaces
interface ServiceError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: Date;
  operation: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// Enhanced validation interface
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Audit logging interface
interface AuditLogEntry {
  entityType: 'user';
  entityId: string;
  action: 'create' | 'update' | 'soft_delete' | 'restore' | 'migration';
  changes?: any;
  userId?: string;
  userName?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// All available modules from ModuleAccess interface
const ALL_MODULES: (keyof ModuleAccess)[] = [
  'dashboard',
  'containers',
  'gateIn',
  'gateOut',
  'releases',
  'edi',
  'yard',
  'clients',
  'users',
  'moduleAccess',
  'reports',
  'depotManagement',
  'timeTracking',
  'analytics',
  'clientPools',
  'stackManagement',
  'auditLogs',
  'billingReports',
  'operationsReports'
];

export class UserService {
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  // Enhanced logging configuration
  private readonly enableDetailedLogging: boolean = true;
  private readonly logLevel: 'error' | 'warn' | 'info' | 'debug' = 'info';

  /**
   * Enhanced error handling with comprehensive Supabase-specific error codes and logging
   */
  private handleSupabaseError(error: any, operation: string): ServiceError {
    const timestamp = new Date();
    const errorId = `${operation}-${timestamp.getTime()}`;
    
    this.logError(`❌ [USER_SERVICE] Supabase error in ${operation} (ID: ${errorId}):`, error);

    // Comprehensive Supabase error code mappings
    const errorMappings: Record<string, { message: string; retryable: boolean; category: string }> = {
      // Constraint violations
      '23505': { message: 'A user with this email already exists', retryable: false, category: 'constraint' },
      '23503': { message: 'Referenced data not found or constraint violation', retryable: false, category: 'constraint' },
      '23514': { message: 'Data validation failed - check constraint violation', retryable: false, category: 'validation' },
      '23502': { message: 'Required field is missing', retryable: false, category: 'validation' },
      
      // Schema/structure errors
      '42P01': { message: 'Database table not found - schema may need migration', retryable: false, category: 'schema' },
      '42703': { message: 'Database column not found - schema may need migration', retryable: false, category: 'schema' },
      '42804': { message: 'Data type mismatch', retryable: false, category: 'schema' },
      '42883': { message: 'Database function not found', retryable: false, category: 'schema' },
      
      // PostgREST specific errors
      'PGRST116': { message: 'No data found', retryable: false, category: 'data' },
      'PGRST301': { message: 'Database connection failed', retryable: true, category: 'connection' },
      'PGRST302': { message: 'Database query timeout', retryable: true, category: 'timeout' },
      'PGRST204': { message: 'Schema cache loading failed', retryable: true, category: 'cache' },
      
      // Connection and network errors
      '08006': { message: 'Database connection failed', retryable: true, category: 'connection' },
      '08001': { message: 'Unable to connect to database', retryable: true, category: 'connection' },
      '08003': { message: 'Connection does not exist', retryable: true, category: 'connection' },
      '08007': { message: 'Transaction resolution unknown', retryable: true, category: 'transaction' },
      
      // Resource/capacity errors
      '53300': { message: 'Database temporarily unavailable - too many connections', retryable: true, category: 'capacity' },
      '53400': { message: 'Database configuration limit exceeded', retryable: true, category: 'capacity' },
      '57P01': { message: 'Database connection terminated unexpectedly', retryable: true, category: 'connection' },
      '57P02': { message: 'Database connection failure during transaction', retryable: true, category: 'transaction' },
      
      // Authentication/authorization errors
      '28000': { message: 'Invalid authorization specification', retryable: false, category: 'auth' },
      '28P01': { message: 'Invalid password', retryable: false, category: 'auth' },
      '42501': { message: 'Insufficient privileges', retryable: false, category: 'auth' },
      
      // Transaction errors
      '25001': { message: 'Transaction is active', retryable: true, category: 'transaction' },
      '25P02': { message: 'Transaction is in failed state', retryable: true, category: 'transaction' },
      '40001': { message: 'Serialization failure - transaction conflict', retryable: true, category: 'transaction' },
      '40P01': { message: 'Deadlock detected', retryable: true, category: 'transaction' }
    };

    const mapping = errorMappings[error.code];
    const serviceError: ServiceError = {
      code: error.code || 'UNKNOWN',
      message: mapping?.message || error.message || 'An unexpected database error occurred',
      details: {
        originalError: error.details || error.hint || error.message,
        category: mapping?.category || 'unknown',
        errorId,
        timestamp: timestamp.toISOString(),
        operation
      },
      retryable: mapping?.retryable || this.isRetryableError(error.code),
      timestamp,
      operation
    };

    // Log additional context for debugging
    if (this.enableDetailedLogging) {
      this.logError(`🔍 [USER_SERVICE] Error details for ${errorId}:`, {
        code: serviceError.code,
        category: mapping?.category || 'unknown',
        retryable: serviceError.retryable,
        originalMessage: error.message,
        hint: error.hint,
        details: error.details
      });
    }

    return serviceError;
  }

  /**
   * Determine if an error code is retryable
   */
  private isRetryableError(code: string): boolean {
    const retryableCodes = [
      'PGRST301', 'PGRST302', 'PGRST204', // PostgREST errors
      '08006', '08001', '08003', '08007', // Connection errors
      '53300', '53400', '57P01', '57P02', // Resource/capacity errors
      '25001', '25P02', '40001', '40P01'  // Transaction errors
    ];
    return retryableCodes.includes(code);
  }

  /**
   * Enhanced logging with different levels
   */
  private logError(message: string, data?: any): void {
    if (this.logLevel === 'error' || this.logLevel === 'warn' || this.logLevel === 'info' || this.logLevel === 'debug') {
      console.error(message, data);
    }
  }

  private logWarn(message: string, data?: any): void {
    if (this.logLevel === 'warn' || this.logLevel === 'info' || this.logLevel === 'debug') {
      console.warn(message, data);
    }
  }

  private logInfo(message: string, data?: any): void {
    if (this.logLevel === 'info' || this.logLevel === 'debug') {
      console.log(message, data);
    }
  }

  private logDebug(message: string, data?: any): void {
    if (this.logLevel === 'debug') {
      console.debug(message, data);
    }
  }

  /**
   * Enhanced retry mechanism with exponential backoff and jitter
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryConfig: RetryConfig = this.retryConfig
  ): Promise<T> {
    let lastError: any;
    let lastServiceError: ServiceError | null = null;
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if this wasn't the first attempt
        if (attempt > 1) {
          const totalTime = Date.now() - startTime;
          this.logInfo(`✅ [USER_SERVICE] ${operationName} succeeded on attempt ${attempt} after ${totalTime}ms`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        lastServiceError = this.handleSupabaseError(error, operationName);
        
        // Don't retry if error is not retryable or we've reached max attempts
        if (!lastServiceError.retryable || attempt === retryConfig.maxRetries) {
          const totalTime = Date.now() - startTime;
          this.logError(`❌ [USER_SERVICE] ${operationName} failed after ${attempt} attempts in ${totalTime}ms`);
          throw new Error(lastServiceError.message);
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1);
        const jitter = Math.random() * 0.1 * baseDelay; // Add up to 10% jitter
        const delay = Math.min(baseDelay + jitter, retryConfig.maxDelay);
        
        this.logWarn(`⚠️ [USER_SERVICE] Retry ${attempt}/${retryConfig.maxRetries} for ${operationName} in ${Math.round(delay)}ms (Error: ${lastServiceError.code})`);
        
        // Log retry context for debugging
        if (this.enableDetailedLogging) {
          this.logDebug(`🔄 [USER_SERVICE] Retry context:`, {
            operation: operationName,
            attempt,
            maxRetries: retryConfig.maxRetries,
            errorCode: lastServiceError.code,
            errorCategory: lastServiceError.details?.category,
            delay: Math.round(delay),
            totalElapsed: Date.now() - startTime
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never be reached, but included for completeness
    throw lastError;
  }

  /**
   * Enhanced validation helper for user data with detailed error reporting
   */
  private validateUserData(user: Partial<User>, operation: 'create' | 'update'): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation for create operations
    if (operation === 'create') {
      if (!user.name?.trim()) {
        errors.push('User name is required and cannot be empty');
      }
      if (!user.email?.trim()) {
        errors.push('User email is required and cannot be empty');
      }
      if (!user.role) {
        errors.push('User role is required');
      }
      if (!user.createdBy?.trim()) {
        errors.push('Created by field is required for audit trail');
      }
    }

    // Name validation
    if (user.name !== undefined) {
      if (typeof user.name !== 'string') {
        errors.push('User name must be a string');
      } else if (user.name.trim().length === 0) {
        errors.push('User name cannot be empty');
      } else if (user.name.trim().length < 2) {
        errors.push('User name must be at least 2 characters long');
      } else if (user.name.trim().length > 100) {
        errors.push('User name cannot exceed 100 characters');
      } else if (!/^[a-zA-Z\s\-'\.]+$/.test(user.name.trim())) {
        errors.push('User name can only contain letters, spaces, hyphens, apostrophes, and periods');
      }
    }

    // Email validation
    if (user.email !== undefined) {
      if (typeof user.email !== 'string') {
        errors.push('User email must be a string');
      } else if (user.email.trim().length === 0) {
        errors.push('User email cannot be empty');
      } else {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailRegex.test(user.email.trim())) {
          errors.push('Invalid email format');
        } else if (user.email.trim().length > 254) {
          errors.push('Email address cannot exceed 254 characters');
        }
      }
    }

    // Role validation
    if (user.role !== undefined) {
      const validRoles = ['client', 'admin', 'operator', 'supervisor'];
      if (!validRoles.includes(user.role)) {
        errors.push(`Invalid user role. Must be one of: ${validRoles.join(', ')}`);
      }
    }

    // Yard IDs validation
    if (user.yardIds !== undefined) {
      if (!Array.isArray(user.yardIds)) {
        errors.push('Yard IDs must be an array');
      } else {
        user.yardIds.forEach((yardId, index) => {
          if (typeof yardId !== 'string' || yardId.trim().length === 0) {
            errors.push(`Yard ID at index ${index} must be a non-empty string`);
          }
        });
        
        // Check for duplicates
        const uniqueYardIds = new Set(user.yardIds);
        if (uniqueYardIds.size !== user.yardIds.length) {
          warnings.push('Duplicate yard IDs detected and will be removed');
        }
      }
    }

    // Module access validation
    if (user.moduleAccess !== undefined) {
      if (typeof user.moduleAccess !== 'object' || user.moduleAccess === null) {
        errors.push('Module access must be an object');
      } else {
        // Validate module access structure
        const invalidModules = Object.keys(user.moduleAccess).filter(
          module => !ALL_MODULES.includes(module as keyof ModuleAccess)
        );
        if (invalidModules.length > 0) {
          warnings.push(`Unknown modules detected: ${invalidModules.join(', ')}`);
        }
      }
    }

    // Active status validation
    if (user.isActive !== undefined && typeof user.isActive !== 'boolean') {
      errors.push('Active status must be a boolean value');
    }

    // Audit field validation
    if (user.createdBy !== undefined) {
      if (typeof user.createdBy !== 'string' || user.createdBy.trim().length === 0) {
        errors.push('Created by field must be a non-empty string');
      }
    }

    if (user.updatedBy !== undefined) {
      if (typeof user.updatedBy !== 'string' || user.updatedBy.trim().length === 0) {
        errors.push('Updated by field must be a non-empty string');
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    // Log validation results
    if (this.enableDetailedLogging) {
      this.logDebug(`🔍 [USER_SERVICE] Validation result for ${operation}:`, {
        isValid: result.isValid,
        errorCount: errors.length,
        warningCount: warnings.length,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      });
    }

    return result;
  }

  /**
   * Throw validation error if validation fails
   */
  private throwIfValidationFails(validationResult: ValidationResult, operation: string): void {
    if (!validationResult.isValid) {
      const errorMessage = `${operation} validation failed: ${validationResult.errors.join(', ')}`;
      this.logError(`❌ [USER_SERVICE] ${errorMessage}`);
      throw new Error(errorMessage);
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      this.logWarn(`⚠️ [USER_SERVICE] ${operation} validation warnings:`, validationResult.warnings);
    }
  }

  /**
   * Enhanced audit logging for user operations with retry and fallback
   */
  private async logAuditEntry(entry: AuditLogEntry): Promise<void> {
    const auditId = `${entry.action}-${entry.entityId}-${entry.timestamp.getTime()}`;
    
    try {
      // Validate audit entry before logging
      if (!entry.entityId || !entry.action || !entry.timestamp) {
        this.logWarn(`⚠️ [USER_SERVICE] Invalid audit entry - missing required fields:`, {
          entityId: entry.entityId,
          action: entry.action,
          timestamp: entry.timestamp
        });
        return;
      }

      const auditData = {
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        action: entry.action,
        changes: entry.changes || {},
        user_id: entry.userId || 'system',
        user_name: entry.userName || entry.userId || 'system',
        timestamp: entry.timestamp.toISOString(),
        ip_address: entry.ipAddress || 'unknown',
        user_agent: entry.userAgent || 'unknown'
      };

      // Attempt to log with retry mechanism (but with reduced retries for audit logging)
      await this.withRetry(async () => {
        const { error } = await supabase
          .from('audit_logs')
          .insert(auditData);

        if (error) {
          throw error;
        }
      }, `audit-log-${entry.action}`, { 
        maxRetries: 2, 
        baseDelay: 500, 
        maxDelay: 2000, 
        backoffMultiplier: 2 
      });

      this.logInfo(`✅ [USER_SERVICE] Audit entry logged (ID: ${auditId}):`, {
        action: entry.action,
        entityId: entry.entityId,
        userId: entry.userId
      });

    } catch (error) {
      // Enhanced error handling for audit logging failures
      this.logError(`❌ [USER_SERVICE] Failed to log audit entry (ID: ${auditId}):`, {
        error: error instanceof Error ? error.message : error,
        entry: {
          action: entry.action,
          entityId: entry.entityId,
          userId: entry.userId,
          timestamp: entry.timestamp.toISOString()
        }
      });

      // Attempt fallback logging to console for critical operations
      if (['create', 'soft_delete', 'restore'].includes(entry.action)) {
        this.logWarn(`📝 [USER_SERVICE] FALLBACK AUDIT LOG (ID: ${auditId}):`, {
          action: entry.action,
          entityId: entry.entityId,
          userId: entry.userId,
          timestamp: entry.timestamp.toISOString(),
          changes: entry.changes
        });
      }

      // Don't throw error for audit logging failures to avoid breaking main operations
      // But track audit failures for monitoring
      this.trackAuditFailure(auditId, entry, error);
    }
  }

  /**
   * Track audit logging failures for monitoring and alerting
   */
  private trackAuditFailure(auditId: string, entry: AuditLogEntry, error: any): void {
    try {
      // In a production system, this could send to a monitoring service
      // For now, we'll log to console with a specific format for monitoring tools
      console.warn(`🚨 [AUDIT_FAILURE] ${auditId}`, {
        timestamp: new Date().toISOString(),
        action: entry.action,
        entityId: entry.entityId,
        userId: entry.userId,
        error: error instanceof Error ? error.message : String(error),
        severity: ['create', 'soft_delete', 'restore'].includes(entry.action) ? 'HIGH' : 'MEDIUM'
      });
    } catch (trackingError) {
      // If even tracking fails, just log to console
      console.error('❌ [USER_SERVICE] Failed to track audit failure:', trackingError);
    }
  }
  /**
   * Execute database migrations for user management enhancements with comprehensive error handling
   */
  async runMigrations(auditContext?: { userId?: string; userName?: string }): Promise<MigrationResult> {
    const migrationId = `migration-${Date.now()}`;
    this.logInfo(`🔄 [USER_SERVICE] Starting database migrations (ID: ${migrationId})...`);
    
    return this.withRetry(async () => {
      try {
        // Enhanced migration status check with multiple validation points
        this.logDebug(`🔍 [USER_SERVICE] Checking migration status for soft delete fields...`);
        
        // Check for is_deleted column
        const { data: isDeletedColumn, error: isDeletedError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_name', 'users')
          .eq('column_name', 'is_deleted')
          .maybeSingle();

        if (isDeletedError && isDeletedError.code !== 'PGRST116') {
          this.logError('❌ [USER_SERVICE] Error checking is_deleted column:', isDeletedError);
          const serviceError = this.handleSupabaseError(isDeletedError, 'check migration status');
          throw new Error(serviceError.message);
        }

        // Check for deleted_at column
        const { data: deletedAtColumn, error: deletedAtError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_name', 'users')
          .eq('column_name', 'deleted_at')
          .maybeSingle();

        if (deletedAtError && deletedAtError.code !== 'PGRST116') {
          this.logError('❌ [USER_SERVICE] Error checking deleted_at column:', deletedAtError);
          const serviceError = this.handleSupabaseError(deletedAtError, 'check migration status');
          throw new Error(serviceError.message);
        }

        // Check for deleted_by column
        const { data: deletedByColumn, error: deletedByError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_name', 'users')
          .eq('column_name', 'deleted_by')
          .maybeSingle();

        if (deletedByError && deletedByError.code !== 'PGRST116') {
          this.logError('❌ [USER_SERVICE] Error checking deleted_by column:', deletedByError);
          const serviceError = this.handleSupabaseError(deletedByError, 'check migration status');
          throw new Error(serviceError.message);
        }

        // Determine migration status
        const hasIsDeleted = !!isDeletedColumn;
        const hasDeletedAt = !!deletedAtColumn;
        const hasDeletedBy = !!deletedByColumn;
        const isFullyMigrated = hasIsDeleted && hasDeletedAt && hasDeletedBy;
        const isPartiallyMigrated = hasIsDeleted || hasDeletedAt || hasDeletedBy;

        this.logDebug(`🔍 [USER_SERVICE] Migration status check:`, {
          hasIsDeleted,
          hasDeletedAt,
          hasDeletedBy,
          isFullyMigrated,
          isPartiallyMigrated
        });

        // If fully migrated, return success
        if (isFullyMigrated) {
          this.logInfo(`✅ [USER_SERVICE] Migration already applied (ID: ${migrationId})`);
          return {
            success: true,
            message: 'Soft delete migration already applied - all required columns exist'
          };
        }

        // If partially migrated, warn about inconsistent state
        if (isPartiallyMigrated) {
          this.logWarn(`⚠️ [USER_SERVICE] Partial migration detected (ID: ${migrationId}):`, {
            hasIsDeleted,
            hasDeletedAt,
            hasDeletedBy
          });
        }

        // Log migration attempt with enhanced context
        if (auditContext?.userId) {
          await this.logAuditEntry({
            entityType: 'user',
            entityId: 'system',
            action: 'migration',
            changes: { 
              migration: 'soft_delete_fields',
              migrationId,
              currentState: {
                hasIsDeleted,
                hasDeletedAt,
                hasDeletedBy,
                isPartiallyMigrated
              }
            },
            userId: auditContext.userId,
            userName: auditContext.userName || auditContext.userId,
            timestamp: new Date()
          });
        }

        // In production, migrations should be run through Supabase CLI
        this.logWarn(`⚠️ [USER_SERVICE] Migration should be run through Supabase CLI in production (ID: ${migrationId})`);
        this.logInfo(`📝 [USER_SERVICE] Migration file should be created at: supabase/migrations/20251103000000_add_soft_delete_to_users.sql`);
        
        const migrationResult: MigrationResult = {
          success: true,
          message: isPartiallyMigrated 
            ? 'Partial migration detected. Please run: supabase db reset or supabase migration up to complete migration'
            : 'Migration script should be created. Please run: supabase db reset or supabase migration up'
        };

        this.logInfo(`✅ [USER_SERVICE] Migration check completed (ID: ${migrationId}):`, migrationResult);
        return migrationResult;

      } catch (error) {
        this.logError(`❌ [USER_SERVICE] Error executing migrations (ID: ${migrationId}):`, error);
        
        // Enhanced error reporting for migrations
        const migrationError: MigrationResult = {
          success: false,
          message: 'Migration execution failed',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };

        // Log migration failure for monitoring
        this.logError(`🚨 [MIGRATION_FAILURE] ${migrationId}`, {
          timestamp: new Date().toISOString(),
          error: migrationError.error,
          auditContext,
          severity: 'HIGH'
        });

        return migrationError;
      }
    }, 'run migrations', { 
      maxRetries: 2, 
      baseDelay: 2000, 
      maxDelay: 8000, 
      backoffMultiplier: 2 
    });
  }

  /**
   * Get all active (non-deleted) users with optimized query and enhanced error handling
   * Uses composite index on (is_deleted, active) for efficient filtering
   */
  async getAll(): Promise<User[]> {
    const operationId = `get-all-users-${Date.now()}`;
    this.logInfo(`🔄 [USER_SERVICE] Fetching all active users (ID: ${operationId})...`);
    
    return this.withRetry(async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select(`
            *,
            user_module_access!fk_user_module_access_user (
              module_permissions
            )
          `)
          .eq('is_deleted', false) // Use indexed column for efficient filtering
          .eq('active', true) // Additional filter for active users
          .order('name', { ascending: true });

        if (error) {
          const serviceError = this.handleSupabaseError(error, 'fetch all users');
          throw new Error(serviceError.message);
        }

        if (!data) {
          this.logInfo(`ℹ️ [USER_SERVICE] No active users found (ID: ${operationId})`);
          return [];
        }

        // Enhanced mapping with error handling for individual users
        const mappedUsers: User[] = [];
        const mappingErrors: string[] = [];

        for (let i = 0; i < data.length; i++) {
          try {
            const mappedUser = this.mapToUser(data[i]);
            mappedUsers.push(mappedUser);
          } catch (mappingError) {
            const errorMessage = `Failed to map user at index ${i}: ${mappingError instanceof Error ? mappingError.message : mappingError}`;
            mappingErrors.push(errorMessage);
            this.logWarn(`⚠️ [USER_SERVICE] ${errorMessage}`, data[i]);
          }
        }

        // Log mapping errors if any occurred
        if (mappingErrors.length > 0) {
          this.logWarn(`⚠️ [USER_SERVICE] User mapping errors (ID: ${operationId}):`, {
            totalUsers: data.length,
            successfullyMapped: mappedUsers.length,
            mappingErrors: mappingErrors.length,
            errors: mappingErrors
          });
        }

        this.logInfo(`✅ [USER_SERVICE] Successfully fetched active users (ID: ${operationId}):`, {
          totalUsers: mappedUsers.length,
          mappingErrors: mappingErrors.length
        });

        return mappedUsers;
      } catch (error) {
        this.logError(`❌ [USER_SERVICE] Unexpected error fetching users (ID: ${operationId}):`, error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('An unexpected error occurred while fetching users');
      }
    }, 'get all users');
  }

  /**
   * Get user by ID with optimized query using composite index and enhanced error handling
   * Only returns active, non-deleted users
   */
  async getById(id: string): Promise<User | null> {
    if (!id?.trim()) {
      this.logError('❌ [USER_SERVICE] Get user by ID failed - User ID is required');
      throw new Error('User ID is required');
    }

    const operationId = `get-user-by-id-${id}-${Date.now()}`;
    this.logDebug(`🔍 [USER_SERVICE] Fetching user by ID (ID: ${operationId}): ${id}`);

    return this.withRetry(async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select(`
            *,
            user_module_access!fk_user_module_access_user (
              module_permissions
            )
          `)
          .eq('id', id)
          .eq('is_deleted', false) // Use indexed column first
          .eq('active', true) // Additional filter for active users
          .maybeSingle();

        if (error) {
          const serviceError = this.handleSupabaseError(error, 'fetch user by ID');
          this.logError(`❌ [USER_SERVICE] Error fetching user by ID (ID: ${operationId}):`, serviceError);
          throw new Error(serviceError.message);
        }
        
        if (!data) {
          this.logDebug(`ℹ️ [USER_SERVICE] User not found or inactive (ID: ${operationId}): ${id}`);
          return null;
        }

        try {
          const mappedUser = this.mapToUser(data);
          this.logDebug(`✅ [USER_SERVICE] User fetched successfully (ID: ${operationId}): ${id}`);
          return mappedUser;
        } catch (mappingError) {
          this.logError(`❌ [USER_SERVICE] Error mapping user data (ID: ${operationId}):`, {
            userId: id,
            error: mappingError instanceof Error ? mappingError.message : mappingError,
            rawData: data
          });
          throw new Error(`Failed to process user data: ${mappingError instanceof Error ? mappingError.message : mappingError}`);
        }
      } catch (error) {
        this.logError(`❌ [USER_SERVICE] Unexpected error fetching user by ID (ID: ${operationId}):`, error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('An unexpected error occurred while fetching user');
      }
    }, 'get user by ID');
  }

  /**
   * Get user by email with optimized query using composite index
   * Uses the idx_users_active_lookup index for efficient email lookups
   */
  async getByEmail(email: string): Promise<User | null> {
    if (!email?.trim()) {
      throw new Error('Email is required');
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_module_access!fk_user_module_access_user (
            module_permissions
          )
        `)
        .eq('is_deleted', false) // Use composite index (is_deleted, active, email)
        .eq('active', true)
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (error) {
        console.error('❌ [USER_SERVICE] Error fetching user by email:', error);
        throw new Error(`Failed to fetch user by email: ${error.message}`);
      }
      
      return data ? this.mapToUser(data) : null;
    } catch (error) {
      console.error('❌ [USER_SERVICE] Unexpected error fetching user by email:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching user by email');
    }
  }

  /**
   * Create user with enhanced validation, error handling, and audit logging
   */
  async create(
    user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<User> {
    const operationId = `create-user-${Date.now()}`;
    this.logInfo(`🔄 [USER_SERVICE] Starting user creation (ID: ${operationId}):`, {
      email: user.email,
      name: user.name,
      role: user.role
    });

    return this.withRetry(async () => {
      // Enhanced pre-operation validation
      const validationResult = this.validateUserData(user, 'create');
      this.throwIfValidationFails(validationResult, 'User creation');

      // Check if email already exists with optimized query
      this.logDebug(`🔍 [USER_SERVICE] Checking for existing user with email: ${user.email}`);
      const existingUser = await this.getByEmail(user.email);
      if (existingUser) {
        this.logWarn(`⚠️ [USER_SERVICE] User creation failed - email already exists: ${user.email}`);
        throw new Error('A user with this email already exists');
      }

      // Ensure complete module access is stored
      const completeModuleAccess: ModuleAccess = ALL_MODULES.reduce((acc, moduleKey) => {
        acc[moduleKey] = user.moduleAccess?.[moduleKey] || false;
        return acc;
      }, {} as ModuleAccess);

      const userData = {
        name: user.name.trim(),
        email: user.email.trim().toLowerCase(),
        role: user.role,
        yard_ids: user.yardIds || [],
        module_access: completeModuleAccess,
        active: user.isActive !== false,
        is_deleted: false,
        created_by: user.createdBy.trim()
      };

      const { data, error } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (error) {
        const serviceError = this.handleSupabaseError(error, 'create user');
        throw new Error(serviceError.message);
      }

      if (!data) {
        throw new Error('Failed to create user: No data returned');
      }

      // Log audit entry with enhanced context
      await this.logAuditEntry({
        entityType: 'user',
        entityId: data.id,
        action: 'create',
        changes: { 
          created: userData,
          operationId,
          validationWarnings: validationResult.warnings.length > 0 ? validationResult.warnings : undefined
        },
        userId: user.createdBy,
        userName: user.createdBy,
        timestamp: new Date(),
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent
      });
      
      this.logInfo(`✅ [USER_SERVICE] User created successfully (ID: ${operationId}):`, {
        userId: data.id,
        email: data.email,
        name: data.name
      });
      
      return this.mapToUser(data);
    }, 'create user');
  }

  /**
   * Update user with enhanced validation, error handling, and audit logging
   */
  async update(
    id: string, 
    updates: Partial<User> & { last_login?: string },
    auditContext?: { ipAddress?: string; userAgent?: string; updatedBy?: string }
  ): Promise<User> {
    if (!id?.trim()) {
      this.logError('❌ [USER_SERVICE] User update failed - User ID is required');
      throw new Error('User ID is required');
    }

    const operationId = `update-user-${id}-${Date.now()}`;
    this.logInfo(`🔄 [USER_SERVICE] Starting user update (ID: ${operationId}):`, {
      userId: id,
      updatedFields: Object.keys(updates),
      updatedBy: auditContext?.updatedBy || updates.updatedBy
    });

    return this.withRetry(async () => {
      // Enhanced validation for update data
      const validationResult = this.validateUserData(updates, 'update');
      this.throwIfValidationFails(validationResult, 'User update');

      // Get existing user for comparison and validation
      this.logDebug(`🔍 [USER_SERVICE] Fetching existing user for update: ${id}`);
      const existingUser = await this.getById(id);
      if (!existingUser) {
        this.logWarn(`⚠️ [USER_SERVICE] User update failed - user not found: ${id}`);
        throw new Error('User not found or has been deleted');
      }

      // Check if email is being updated and already exists
      if (updates.email && updates.email.trim().toLowerCase() !== existingUser.email.toLowerCase()) {
        this.logDebug(`🔍 [USER_SERVICE] Checking for email conflicts: ${updates.email}`);
        const existingEmailUser = await this.getByEmail(updates.email);
        if (existingEmailUser && existingEmailUser.id !== id) {
          this.logWarn(`⚠️ [USER_SERVICE] User update failed - email already exists: ${updates.email}`);
          throw new Error('A user with this email already exists');
        }
      }

      // Build update data with proper validation
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.name?.trim()) updateData.name = updates.name.trim();
      if (updates.email?.trim()) updateData.email = updates.email.trim().toLowerCase();
      if (updates.role) updateData.role = updates.role;
      if (updates.yardIds !== undefined) updateData.yard_ids = updates.yardIds;
      if (updates.updatedBy?.trim() || auditContext?.updatedBy?.trim()) {
        updateData.updated_by = (updates.updatedBy || auditContext?.updatedBy)?.trim();
      }

      // Ensure complete module access is stored during updates
      if (updates.moduleAccess !== undefined) {
        const completeModuleAccess: ModuleAccess = ALL_MODULES.reduce((acc, moduleKey) => {
          acc[moduleKey] = updates.moduleAccess?.[moduleKey] || false;
          return acc;
        }, {} as ModuleAccess);
        updateData.module_access = completeModuleAccess;
      }

      if (updates.isActive !== undefined) updateData.active = updates.isActive;
      if (updates.lastLogin !== undefined) updateData.last_login = updates.lastLogin?.toISOString();
      if ((updates as any).last_login !== undefined) updateData.last_login = (updates as any).last_login;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .eq('is_deleted', false) // Only update non-deleted users
        .select()
        .single();

      if (error) {
        const serviceError = this.handleSupabaseError(error, 'update user');
        throw new Error(serviceError.message);
      }

      if (!data) {
        throw new Error('User not found or has been deleted');
      }

      // Log audit entry with enhanced changes tracking
      const changes = {
        before: existingUser,
        after: updateData,
        operationId,
        validationWarnings: validationResult.warnings.length > 0 ? validationResult.warnings : undefined,
        fieldsChanged: Object.keys(updateData).filter(key => key !== 'updated_at')
      };

      await this.logAuditEntry({
        entityType: 'user',
        entityId: id,
        action: 'update',
        changes,
        userId: auditContext?.updatedBy || updates.updatedBy,
        userName: auditContext?.updatedBy || updates.updatedBy,
        timestamp: new Date(),
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent
      });
      
      this.logInfo(`✅ [USER_SERVICE] User updated successfully (ID: ${operationId}):`, {
        userId: id,
        fieldsChanged: Object.keys(updateData).filter(key => key !== 'updated_at'),
        updatedBy: auditContext?.updatedBy || updates.updatedBy
      });
      
      return this.mapToUser(data);
    }, 'update user');
  }

  async delete(id: string): Promise<void> {
    // This method is deprecated - use softDelete instead
    console.warn('⚠️ [USER_SERVICE] Hard delete is deprecated. Use softDelete instead.');
    return this.softDelete(id, 'System');
  }

  /**
   * Soft delete user with enhanced error handling, validation, and audit logging
   */
  async softDelete(
    id: string, 
    deletedBy: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    if (!id?.trim()) {
      this.logError('❌ [USER_SERVICE] Soft delete failed - User ID is required');
      throw new Error('User ID is required');
    }

    if (!deletedBy?.trim()) {
      this.logError('❌ [USER_SERVICE] Soft delete failed - Deleted by field is required');
      throw new Error('Deleted by field is required for audit trail');
    }

    const operationId = `soft-delete-user-${id}-${Date.now()}`;
    this.logInfo(`🔄 [USER_SERVICE] Starting user soft delete (ID: ${operationId}):`, {
      userId: id,
      deletedBy
    });

    return this.withRetry(async () => {
      // Get existing user for audit logging and validation
      this.logDebug(`🔍 [USER_SERVICE] Fetching user for soft delete: ${id}`);
      const existingUser = await this.getById(id);
      if (!existingUser) {
        this.logWarn(`⚠️ [USER_SERVICE] Soft delete failed - user not found: ${id}`);
        throw new Error('User not found or has already been deleted');
      }

      if (existingUser.isDeleted) {
        this.logWarn(`⚠️ [USER_SERVICE] Soft delete failed - user already deleted: ${id}`);
        throw new Error('User has already been deleted');
      }

      // Perform soft delete with database constraint validation
      const deleteData = {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: deletedBy.trim(),
        active: false, // Also deactivate for backward compatibility
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('users')
        .update(deleteData)
        .eq('id', id)
        .eq('is_deleted', false); // Use indexed column for efficient update

      if (error) {
        const serviceError = this.handleSupabaseError(error, 'soft delete user');
        throw new Error(serviceError.message);
      }

      // Log audit entry with enhanced context
      await this.logAuditEntry({
        entityType: 'user',
        entityId: id,
        action: 'soft_delete',
        changes: {
          before: existingUser,
          after: deleteData,
          operationId,
          reason: 'User soft delete requested'
        },
        userId: deletedBy,
        userName: deletedBy,
        timestamp: new Date(),
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent
      });

      this.logInfo(`✅ [USER_SERVICE] User soft deleted successfully (ID: ${operationId}):`, {
        userId: id,
        userEmail: existingUser.email,
        userName: existingUser.name,
        deletedBy
      });
    }, 'soft delete user');
  }

  /**
   * Restore soft-deleted user with enhanced error handling and audit logging
   */
  async restore(
    id: string, 
    restoredBy: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<User> {
    if (!id?.trim()) {
      this.logError('❌ [USER_SERVICE] User restore failed - User ID is required');
      throw new Error('User ID is required');
    }

    if (!restoredBy?.trim()) {
      this.logError('❌ [USER_SERVICE] User restore failed - Restored by field is required');
      throw new Error('Restored by field is required for audit trail');
    }

    const operationId = `restore-user-${id}-${Date.now()}`;
    this.logInfo(`🔄 [USER_SERVICE] Starting user restore (ID: ${operationId}):`, {
      userId: id,
      restoredBy
    });

    return this.withRetry(async () => {
      // Get existing deleted user for validation and audit logging
      this.logDebug(`🔍 [USER_SERVICE] Checking for deleted user: ${id}`);
      const { data: existingData, error: checkError } = await supabase
        .from('users')
        .select('id, name, is_deleted, email, deleted_at, deleted_by')
        .eq('id', id)
        .eq('is_deleted', true)
        .maybeSingle();

      if (checkError) {
        const serviceError = this.handleSupabaseError(checkError, 'check deleted user');
        this.logError(`❌ [USER_SERVICE] Error checking deleted user: ${serviceError.message}`);
        throw new Error(serviceError.message);
      }

      if (!existingData) {
        this.logWarn(`⚠️ [USER_SERVICE] User restore failed - user not found or not deleted: ${id}`);
        throw new Error('User not found or is not deleted');
      }

      // Use database function for safe restoration with constraint validation
      const { data: restoreResult, error: restoreError } = await supabase
        .rpc('restore_user', {
          user_id: id,
          restored_by: restoredBy.trim()
        });

      if (restoreError) {
        const serviceError = this.handleSupabaseError(restoreError, 'restore user function');
        throw new Error(serviceError.message);
      }

      if (!restoreResult) {
        throw new Error('User restoration failed');
      }

      // Fetch the restored user data
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_module_access!fk_user_module_access_user (
            module_permissions
          )
        `)
        .eq('id', id)
        .eq('is_deleted', false)
        .single();

      if (error) {
        const serviceError = this.handleSupabaseError(error, 'fetch restored user');
        throw new Error(`User restored but failed to fetch updated data: ${serviceError.message}`);
      }

      if (!data) {
        throw new Error('User restored but data not found');
      }

      // Log audit entry with enhanced context
      await this.logAuditEntry({
        entityType: 'user',
        entityId: id,
        action: 'restore',
        changes: {
          before: { ...existingData, is_deleted: true },
          after: { is_deleted: false, active: true },
          operationId,
          previousDeletion: {
            deletedAt: existingData.deleted_at,
            deletedBy: existingData.deleted_by
          }
        },
        userId: restoredBy,
        userName: restoredBy,
        timestamp: new Date(),
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent
      });

      this.logInfo(`✅ [USER_SERVICE] User restored successfully (ID: ${operationId}):`, {
        userId: id,
        userEmail: existingData.email,
        userName: existingData.name,
        restoredBy,
        previouslyDeletedBy: existingData.deleted_by
      });
      
      return this.mapToUser(data);
    }, 'restore user');
  }

  /**
   * Get all users including soft-deleted ones for admin purposes
   * Optimized query with proper ordering for large datasets
   */
  async getAllIncludingDeleted(): Promise<User[]> {
    console.log('🔄 [USER_SERVICE] Fetching all users including deleted...');
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          user_module_access!fk_user_module_access_user (
            module_permissions
          )
        `)
        .order('is_deleted', { ascending: true }) // Active users first
        .order('name', { ascending: true }); // Then by name

      if (error) {
        console.error('❌ [USER_SERVICE] Error fetching all users:', error);
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      if (!data) {
        console.log('ℹ️ [USER_SERVICE] No users found');
        return [];
      }

      const mappedUsers = data.map(this.mapToUser);
      console.log('✅ [USER_SERVICE] Successfully fetched all users (including deleted):', mappedUsers.length);
      return mappedUsers;
    } catch (error) {
      console.error('❌ [USER_SERVICE] Unexpected error fetching all users:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching all users');
    }
  }

  /**
   * Get paginated users for large datasets with efficient filtering
   * Uses limit/offset with proper indexing for performance
   */
  async getPaginatedUsers(
    page: number = 1, 
    limit: number = 50, 
    includeDeleted: boolean = false
  ): Promise<{ users: User[]; total: number; hasMore: boolean }> {
    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50; // Reasonable limits

    const offset = (page - 1) * limit;

    try {
      // Build query with proper filtering
      let query = supabase
        .from('users')
        .select(`
          *,
          user_module_access!fk_user_module_access_user (
            module_permissions
          )
        `, { count: 'exact' });

      if (!includeDeleted) {
        query = query.eq('is_deleted', false).eq('active', true);
      }

      const { data, error, count } = await query
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ [USER_SERVICE] Error fetching paginated users:', error);
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      const users = data ? data.map(this.mapToUser) : [];
      const total = count || 0;
      const hasMore = offset + limit < total;

      console.log(`✅ [USER_SERVICE] Fetched page ${page} of users:`, users.length, 'of', total);
      return { users, total, hasMore };
    } catch (error) {
      console.error('❌ [USER_SERVICE] Unexpected error fetching paginated users:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching paginated users');
    }
  }

  async getUserDetails(id: string): Promise<UserDetails> {
    if (!id?.trim()) {
      this.logError('❌ [USER_SERVICE] Get user details failed - User ID is required');
      throw new Error('User ID is required');
    }

    const operationId = `get-user-details-${id}-${Date.now()}`;
    this.logInfo(`🔄 [USER_SERVICE] Fetching user details (ID: ${operationId}): ${id}`);

    return this.withRetry(async () => {
      try {
        // Get basic user information with enhanced error handling
        this.logDebug(`🔍 [USER_SERVICE] Fetching basic user information: ${id}`);
        const user = await this.getById(id);
        if (!user) {
          this.logWarn(`⚠️ [USER_SERVICE] User details failed - user not found: ${id}`);
          throw new Error('User not found or has been deleted');
        }

        // Parallel execution of detail fetching for better performance
        this.logDebug(`🔄 [USER_SERVICE] Fetching user details in parallel: ${id}`);
        
        const [yardDetails, activityHistory, loginHistory] = await Promise.all([
          this.getUserYardDetails(user.yardIds || []).catch(error => {
            this.logWarn(`⚠️ [USER_SERVICE] Failed to fetch yard details for user ${id}:`, error);
            return [] as YardAssignment[]; // Return empty array on error
          }),
          this.getUserActivityHistory(id).catch(error => {
            this.logWarn(`⚠️ [USER_SERVICE] Failed to fetch activity history for user ${id}:`, error);
            return [] as UserActivity[]; // Return empty array on error
          }),
          this.getUserLoginHistory(id).catch(error => {
            this.logWarn(`⚠️ [USER_SERVICE] Failed to fetch login history for user ${id}:`, error);
            return [] as LoginRecord[]; // Return empty array on error
          })
        ]);

        // Generate permission summary with error handling
        let permissionSummary: PermissionSummary;
        try {
          permissionSummary = this.generatePermissionSummary(user.moduleAccess);
        } catch (error) {
          this.logWarn(`⚠️ [USER_SERVICE] Failed to generate permission summary for user ${id}:`, error);
          // Provide default permission summary
          permissionSummary = {
            totalModules: ALL_MODULES.length,
            enabledModules: 0,
            disabledModules: ALL_MODULES.length,
            moduleList: ALL_MODULES.map(module => ({
              module,
              enabled: false,
              category: 'core' as const
            }))
          };
        }

        const userDetails: UserDetails = {
          ...user,
          yardDetails,
          activityHistory,
          permissionSummary,
          loginHistory
        };

        this.logInfo(`✅ [USER_SERVICE] User details retrieved successfully (ID: ${operationId}):`, {
          userId: id,
          yardCount: yardDetails.length,
          activityCount: activityHistory.length,
          loginCount: loginHistory.length,
          enabledModules: permissionSummary.enabledModules
        });

        return userDetails;
      } catch (error) {
        this.logError(`❌ [USER_SERVICE] Error getting user details (ID: ${operationId}):`, error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('An unexpected error occurred while retrieving user details');
      }
    }, 'get user details');
  }

  private async getUserYardDetails(yardIds: string[]): Promise<YardAssignment[]> {
    if (!yardIds || !yardIds.length) return [];

    try {
      const { data, error } = await supabase
        .from('yards')
        .select('id, name, code, created_at, created_by')
        .in('id', yardIds)
        .eq('is_active', true);

      if (error) {
        console.error('❌ [USER_SERVICE] Error fetching yard details:', error);
        // Return empty array instead of throwing to prevent getUserDetails from failing
        return [];
      }

      if (!data) {
        console.log('ℹ️ [USER_SERVICE] No yard data found for user');
        return [];
      }

      return data.map(yard => ({
        yardId: yard.id,
        yardName: yard.name || 'Unknown Yard',
        yardCode: yard.code || 'N/A',
        assignedAt: yard.created_at ? new Date(yard.created_at) : new Date(),
        assignedBy: yard.created_by || 'System'
      }));
    } catch (error) {
      console.error('❌ [USER_SERVICE] Unexpected error getting yard details:', error);
      // Return empty array instead of throwing to prevent getUserDetails from failing
      return [];
    }
  }

  private async getUserActivityHistory(userId: string): Promise<UserActivity[]> {
    if (!userId?.trim()) {
      console.warn('⚠️ [USER_SERVICE] Invalid user ID for activity history');
      return [];
    }

    try {
      // Mock implementation - in a real system, this would query an audit log table
      // TODO: Replace with actual audit log query when audit system is implemented
      const mockActivities: UserActivity[] = [
        {
          id: `${userId}-login-${Date.now()}`,
          action: 'User Login',
          timestamp: new Date(),
          details: 'User logged into the system',
          ipAddress: '192.168.1.1'
        },
        {
          id: `${userId}-profile-update-${Date.now() - 3600000}`,
          action: 'Profile Updated',
          timestamp: new Date(Date.now() - 3600000),
          details: 'User profile information was updated',
          ipAddress: '192.168.1.1'
        }
      ];

      console.log('ℹ️ [USER_SERVICE] Retrieved mock activity history for user:', userId);
      return mockActivities;
    } catch (error) {
      console.error('❌ [USER_SERVICE] Unexpected error getting activity history:', error);
      // Return empty array instead of throwing to prevent getUserDetails from failing
      return [];
    }
  }

  private generatePermissionSummary(moduleAccess: ModuleAccess): PermissionSummary {
    if (!moduleAccess) {
      console.warn('⚠️ [USER_SERVICE] No module access provided for permission summary');
      // Return default summary with all modules disabled
      const defaultModuleList = ALL_MODULES.map(module => ({
        module,
        enabled: false,
        category: 'core' as const
      }));

      return {
        totalModules: ALL_MODULES.length,
        enabledModules: 0,
        disabledModules: ALL_MODULES.length,
        moduleList: defaultModuleList
      };
    }

    try {
      const moduleCategories: Record<keyof ModuleAccess, 'core' | 'operations' | 'management' | 'admin'> = {
        dashboard: 'core',
        containers: 'operations',
        gateIn: 'operations',
        gateOut: 'operations',
        releases: 'operations',
        edi: 'operations',
        yard: 'operations',
        clients: 'management',
        users: 'admin',
        moduleAccess: 'admin',
        reports: 'management',
        depotManagement: 'management',
        timeTracking: 'operations',
        analytics: 'management',
        clientPools: 'management',
        stackManagement: 'operations',
        auditLogs: 'admin',
        billingReports: 'management',
        operationsReports: 'management'
      };

      const moduleList = ALL_MODULES.map(module => ({
        module,
        enabled: Boolean(moduleAccess[module]),
        category: moduleCategories[module] || 'core'
      }));

      const enabledModules = moduleList.filter(m => m.enabled).length;
      const totalModules = moduleList.length;

      return {
        totalModules,
        enabledModules,
        disabledModules: totalModules - enabledModules,
        moduleList
      };
    } catch (error) {
      console.error('❌ [USER_SERVICE] Error generating permission summary:', error);
      // Return safe default
      const defaultModuleList = ALL_MODULES.map(module => ({
        module,
        enabled: false,
        category: 'core' as const
      }));

      return {
        totalModules: ALL_MODULES.length,
        enabledModules: 0,
        disabledModules: ALL_MODULES.length,
        moduleList: defaultModuleList
      };
    }
  }

  private async getUserLoginHistory(userId: string): Promise<LoginRecord[]> {
    if (!userId?.trim()) {
      console.warn('⚠️ [USER_SERVICE] Invalid user ID for login history');
      return [];
    }

    try {
      // Mock implementation - in a real system, this would query a login history table
      // TODO: Replace with actual login history query when login tracking is implemented
      const mockLoginHistory: LoginRecord[] = [
        {
          id: `${userId}-session-${Date.now()}`,
          userId,
          loginTime: new Date(Date.now() - 3600000), // 1 hour ago
          logoutTime: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          sessionDuration: 60 // 60 minutes
        },
        {
          id: `${userId}-session-${Date.now() - 86400000}`,
          userId,
          loginTime: new Date(Date.now() - 90000000), // Yesterday
          logoutTime: new Date(Date.now() - 86400000),
          ipAddress: '192.168.1.2',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          sessionDuration: 120 // 120 minutes
        }
      ];

      console.log('ℹ️ [USER_SERVICE] Retrieved mock login history for user:', userId);
      return mockLoginHistory;
    } catch (error) {
      console.error('❌ [USER_SERVICE] Unexpected error getting login history:', error);
      // Return empty array instead of throwing to prevent getUserDetails from failing
      return [];
    }
  }

  private mapToUser(data: any): User {
    if (!data) {
      throw new Error('Invalid user data provided to mapToUser');
    }

    try {
      // PRIORITY: user_module_access.module_permissions is the SOURCE OF TRUTH
      // users.module_access is legacy and should be ignored
      let moduleAccess: any = {};

      if (data.user_module_access && Array.isArray(data.user_module_access) && data.user_module_access.length > 0) {
        moduleAccess = data.user_module_access[0].module_permissions || {};
        console.log('🔄 [MAP_USER] Using user_module_access.module_permissions:', moduleAccess);
      } else if (data.user_module_access && !Array.isArray(data.user_module_access) && data.user_module_access.module_permissions) {
        moduleAccess = data.user_module_access.module_permissions || {};
        console.log('🔄 [MAP_USER] Using user_module_access.module_permissions (object):', moduleAccess);
      } else {
        // Fallback to users.module_access if no user_module_access exists (for backward compatibility)
        moduleAccess = data.module_access || {};
        console.log('🔄 [MAP_USER] Fallback to users.module_access:', moduleAccess);
      }

      // Ensure all modules are present with default values
      const completeModuleAccess: ModuleAccess = ALL_MODULES.reduce((acc, moduleKey) => {
        acc[moduleKey] = Boolean(moduleAccess[moduleKey]);
        return acc;
      }, {} as ModuleAccess);

      return {
        id: data.id,
        name: data.name || 'Unknown User',
        email: data.email || '',
        role: data.role || 'operator',
        yardIds: Array.isArray(data.yard_ids) ? data.yard_ids : [],
        moduleAccess: completeModuleAccess,
        isActive: Boolean(data.active),
        lastLogin: data.last_login ? new Date(data.last_login) : undefined,
        createdAt: data.created_at ? new Date(data.created_at) : new Date(),
        createdBy: data.created_by || 'System',
        updatedBy: data.updated_by,
        // Soft delete fields
        isDeleted: Boolean(data.is_deleted),
        deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
        deletedBy: data.deleted_by || undefined
      };
    } catch (error) {
      console.error('❌ [MAP_USER] Error mapping user data:', error, data);
      throw new Error('Failed to map user data');
    }
  }
}

export const userService = new UserService();
