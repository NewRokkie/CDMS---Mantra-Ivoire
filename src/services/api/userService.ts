import { supabase } from './supabaseClient';
import { User, ModuleAccess, UserDetails, YardAssignment, UserActivity, PermissionSummary, LoginRecord } from '../../types';
import { logger } from '../../utils/logger';

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

  /**
   * Enhanced error handling with comprehensive Supabase-specific error codes and logging
   */
  private handleSupabaseError(error: any, operation: string): ServiceError {
    const timestamp = new Date();
    const errorId = `${operation}-${timestamp.getTime()}`;
    
    logger.error(`Supabase error in ${operation}`, 'UserService', { errorId, error });

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
    logger.debug(`Error details for ${errorId}`, 'UserService', {
      code: serviceError.code,
      category: mapping?.category || 'unknown',
      retryable: serviceError.retryable,
      originalMessage: error.message,
      hint: error.hint,
      details: error.details
    });

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
          logger.info(`${operationName} succeeded on retry`, 'UserService', { attempt, totalTimeMs: totalTime });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        lastServiceError = this.handleSupabaseError(error, operationName);
        
        // Don't retry if error is not retryable or we've reached max attempts
        if (!lastServiceError.retryable || attempt === retryConfig.maxRetries) {
          const totalTime = Date.now() - startTime;
          logger.error(`${operationName} failed after retries`, 'UserService', { attempt, totalTimeMs: totalTime });
          throw new Error(lastServiceError.message);
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1);
        const jitter = Math.random() * 0.1 * baseDelay; // Add up to 10% jitter
        const delay = Math.min(baseDelay + jitter, retryConfig.maxDelay);
        
        logger.warn(`Retrying ${operationName}`, 'UserService', {
          attempt,
          maxRetries: retryConfig.maxRetries,
          delayMs: Math.round(delay),
          errorCode: lastServiceError.code
        });
        
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
    logger.debug(`Validation result for ${operation}`, 'UserService', {
      isValid: result.isValid,
      errorCount: errors.length,
      warningCount: warnings.length,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    });

    return result;
  }

  /**
   * Throw validation error if validation fails
   */
  private throwIfValidationFails(validationResult: ValidationResult, operation: string): void {
    if (!validationResult.isValid) {
      const errorMessage = `${operation} validation failed: ${validationResult.errors.join(', ')}`;
      logger.error(errorMessage, 'UserService');
      throw new Error(errorMessage);
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      logger.warn(`${operation} validation warnings`, 'UserService', validationResult.warnings);
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
        logger.warn(`Invalid audit entry - missing required fields`, 'UserService', {
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

      logger.debug(`Audit entry logged`, 'UserService', {
        auditId,
        action: entry.action,
        entityId: entry.entityId,
        userId: entry.userId
      });

    } catch (error) {
      // Enhanced error handling for audit logging failures
      logger.error(`Failed to log audit entry`, 'UserService', {
        auditId,
        error: error instanceof Error ? error.message : error,
        action: entry.action,
        entityId: entry.entityId,
        userId: entry.userId
      });

      // Attempt fallback logging for critical operations
      if (['create', 'soft_delete', 'restore'].includes(entry.action)) {
        logger.warn(`FALLBACK AUDIT LOG`, 'UserService', {
          auditId,
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
  private trackAuditFailure(_auditId: string, _entry: AuditLogEntry, _error: any): void {
    try {
      // In a production system, this could send to a monitoring service
      // Silently track audit failures
    } catch (trackingError) {
      // Silently handle tracking failures
    }
  }
  /**
   * Execute database migrations for user management enhancements with comprehensive error handling
   */
  async runMigrations(auditContext?: { userId?: string; userName?: string }): Promise<MigrationResult> {
    const migrationId = `migration-${Date.now()}`;
    logger.info(`Starting database migrations`, 'UserService', { migrationId });
    
    return this.withRetry(async () => {
      try {
        // Enhanced migration status check by attempting to query the columns
        logger.debug(`Checking migration status for soft delete fields`, 'UserService');
        
        // Try to query users table with soft delete columns to check if they exist
        const { error: testError } = await supabase
          .from('users')
          .select('id, is_deleted, deleted_at, deleted_by')
          .limit(1)
          .maybeSingle();

        // If query succeeds, columns exist
        if (!testError) {
          logger.info(`Migration already applied`, 'UserService', { migrationId });
          return {
            success: true,
            message: 'Soft delete migration already applied - all required columns exist'
          };
        }

        // Check if error is due to missing columns
        const isMissingColumn = testError.code === '42703' || 
                               testError.message?.includes('column') ||
                               testError.message?.includes('does not exist');

        if (!isMissingColumn) {
          // Some other error occurred
          logger.error('Error checking migration status', 'UserService', testError);
          const serviceError = this.handleSupabaseError(testError, 'check migration status');
          throw new Error(serviceError.message);
        }

        // Columns are missing, migration needed
        logger.warn(`Soft delete columns not found - migration needed`, 'UserService', { migrationId });

        // Log migration attempt with enhanced context
        if (auditContext?.userId) {
          await this.logAuditEntry({
            entityType: 'user',
            entityId: 'system',
            action: 'migration',
            changes: { 
              migration: 'soft_delete_fields',
              migrationId,
              status: 'columns_missing'
            },
            userId: auditContext.userId,
            userName: auditContext.userName || auditContext.userId,
            timestamp: new Date()
          });
        }

        // In production, migrations should be run through Supabase CLI
        logger.warn(`Migration should be run through Supabase CLI in production`, 'UserService', { migrationId });
        logger.info(`Migration file path: supabase/migrations/20251103000000_add_soft_delete_to_users.sql`, 'UserService');
        
        const migrationResult: MigrationResult = {
          success: true,
          message: 'Migration needed. Please run: supabase db reset or supabase migration up'
        };

        logger.info(`Migration check completed`, 'UserService', { migrationId, result: migrationResult });
        return migrationResult;

      } catch (error) {
        logger.error(`Error executing migrations`, 'UserService', { migrationId, error });
        
        // Enhanced error reporting for migrations
        const migrationError: MigrationResult = {
          success: false,
          message: 'Migration execution failed',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };

        // Log migration failure for monitoring
        logger.error(`MIGRATION_FAILURE`, 'UserService', {
          migrationId,
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
    logger.info(`Fetching all active users`, 'UserService', { operationId });
    
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
          logger.info(`No active users found`, 'UserService', { operationId });
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
            logger.warn(errorMessage, 'UserService', { index: i, data: data[i] });
          }
        }

        // Log mapping errors if any occurred
        if (mappingErrors.length > 0) {
          logger.warn(`User mapping errors`, 'UserService', {
            operationId,
            totalUsers: data.length,
            successfullyMapped: mappedUsers.length,
            mappingErrors: mappingErrors.length,
            errors: mappingErrors
          });
        }

        logger.info(`Successfully fetched active users`, 'UserService', {
          operationId,
          totalUsers: mappedUsers.length,
          mappingErrors: mappingErrors.length
        });

        return mappedUsers;
      } catch (error) {
        logger.error(`Unexpected error fetching users`, 'UserService', { operationId, error });
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
      logger.error('Get user by ID failed - User ID is required', 'UserService');
      throw new Error('User ID is required');
    }

    const operationId = `get-user-by-id-${id}-${Date.now()}`;
    logger.debug(`Fetching user by ID`, 'UserService', { operationId, userId: id });

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
          logger.error(`Error fetching user by ID`, 'UserService', { operationId, serviceError });
          throw new Error(serviceError.message);
        }
        
        if (!data) {
          logger.debug(`User not found or inactive`, 'UserService', { operationId, userId: id });
          return null;
        }

        try {
          const mappedUser = this.mapToUser(data);
          logger.debug(`User fetched successfully`, 'UserService', { operationId, userId: id });
          return mappedUser;
        } catch (mappingError) {
          logger.error(`Error mapping user data`, 'UserService', {
            operationId,
            userId: id,
            error: mappingError instanceof Error ? mappingError.message : mappingError,
            rawData: data
          });
          throw new Error(`Failed to process user data: ${mappingError instanceof Error ? mappingError.message : mappingError}`);
        }
      } catch (error) {
        logger.error(`Unexpected error fetching user by ID`, 'UserService', { operationId, error });
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
          .eq('is_deleted', false) // Use composite index (is_deleted, active, email)
          .eq('active', true)
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();

        if (error) {
          const serviceError = this.handleSupabaseError(error, 'fetch user by email');
          throw new Error(serviceError.message);
        }
        
        return data ? this.mapToUser(data) : null;
      } catch (error) {
        logger.error(`Error fetching user by email`, 'UserService', { email, error });
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('An unexpected error occurred while fetching user by email');
      }
    }, 'get user by email');
  }

  /**
   * Create user with enhanced validation, error handling, and audit logging
   * Creates both auth user and database user record
   */
  async create(
    user: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password?: string },
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<User> {
    const operationId = `create-user-${Date.now()}`;
    logger.info(`Starting user creation`, 'UserService', {
      operationId,
      email: user.email,
      name: user.name,
      role: user.role
    });

    return this.withRetry(async () => {
      // Enhanced pre-operation validation
      const validationResult = this.validateUserData(user, 'create');
      this.throwIfValidationFails(validationResult, 'User creation');

      // Validate password if provided
      if (user.password) {
        if (user.password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        if (user.password.length > 128) {
          throw new Error('Password must be less than 128 characters');
        }
      }

      // Check if email already exists with optimized query
      logger.debug(`Checking for existing user with email`, 'UserService', { email: user.email });
      const existingUser = await this.getByEmail(user.email);
      if (existingUser) {
        logger.warn(`User creation failed - email already exists`, 'UserService', { email: user.email });
        throw new Error('A user with this email already exists');
      }

      // Ensure complete module access is stored
      const completeModuleAccess: ModuleAccess = ALL_MODULES.reduce((acc, moduleKey) => {
        acc[moduleKey] = user.moduleAccess?.[moduleKey] || false;
        return acc;
      }, {} as ModuleAccess);

      // Create auth user first if password is provided
      let authUserId: string | undefined;
      if (user.password) {
        logger.debug(`Creating auth user`, 'UserService', { email: user.email });
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: user.email.trim().toLowerCase(),
          password: user.password,
          options: {
            data: {
              name: user.name.trim(),
              role: user.role
            }
          }
        });

        if (authError) {
          logger.error(`Failed to create auth user`, 'UserService', { authError });
          throw new Error(`Failed to create authentication account: ${authError.message}`);
        }

        if (!authData.user) {
          throw new Error('Failed to create authentication account: No user returned');
        }

        authUserId = authData.user.id;
        logger.info(`Auth user created successfully`, 'UserService', { 
          authUserId,
          email: user.email 
        });
      }

      const userData = {
        auth_user_id: authUserId,
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
        // If user creation fails and we created an auth user, log for manual cleanup
        if (authUserId) {
          logger.error(`Failed to create user record after auth user creation`, 'UserService', { 
            error,
            authUserId,
            email: user.email,
            message: 'Manual cleanup may be required in Supabase Auth dashboard'
          });
        }
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
      
      logger.info(`User created successfully`, 'UserService', {
        operationId,
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
      logger.error('User update failed - User ID is required', 'UserService');
      throw new Error('User ID is required');
    }

    const operationId = `update-user-${id}-${Date.now()}`;
    logger.info(`Starting user update`, 'UserService', {
      operationId,
      userId: id,
      updatedFields: Object.keys(updates),
      updatedBy: auditContext?.updatedBy || updates.updatedBy
    });

    return this.withRetry(async () => {
      // Enhanced validation for update data
      const validationResult = this.validateUserData(updates, 'update');
      this.throwIfValidationFails(validationResult, 'User update');

      // Get existing user for comparison and validation
      logger.debug(`Fetching existing user for update`, 'UserService', { userId: id });
      const existingUser = await this.getById(id);
      if (!existingUser) {
        logger.warn(`User update failed - user not found`, 'UserService', { userId: id });
        throw new Error('User not found or has been deleted');
      }

      // Check if email is being updated and already exists
      if (updates.email && updates.email.trim().toLowerCase() !== existingUser.email.toLowerCase()) {
        logger.debug(`Checking for email conflicts`, 'UserService', { email: updates.email });
        const existingEmailUser = await this.getByEmail(updates.email);
        if (existingEmailUser && existingEmailUser.id !== id) {
          logger.warn(`User update failed - email already exists`, 'UserService', { email: updates.email });
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
      
      logger.info(`User updated successfully`, 'UserService', {
        operationId,
        userId: id,
        fieldsChanged: Object.keys(updateData).filter(key => key !== 'updated_at'),
        updatedBy: auditContext?.updatedBy || updates.updatedBy
      });
      
      return this.mapToUser(data);
    }, 'update user');
  }

  async delete(id: string): Promise<void> {
    // This method is deprecated - use softDelete instead
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
      logger.error('Soft delete failed - User ID is required', 'UserService');
      throw new Error('User ID is required');
    }

    if (!deletedBy?.trim()) {
      logger.error('Soft delete failed - Deleted by field is required', 'UserService');
      throw new Error('Deleted by field is required for audit trail');
    }

    const operationId = `soft-delete-user-${id}-${Date.now()}`;
    logger.info(`Starting user soft delete`, 'UserService', {
      operationId,
      userId: id,
      deletedBy
    });

    return this.withRetry(async () => {
      // Get existing user for audit logging and validation
      logger.debug(`Fetching user for soft delete`, 'UserService', { userId: id });
      const existingUser = await this.getById(id);
      if (!existingUser) {
        logger.warn(`Soft delete failed - user not found`, 'UserService', { userId: id });
        throw new Error('User not found or has already been deleted');
      }

      if (existingUser.isDeleted) {
        logger.warn(`Soft delete failed - user already deleted`, 'UserService', { userId: id });
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

      logger.info(`User soft deleted successfully`, 'UserService', {
        operationId,
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
      logger.error('User restore failed - User ID is required', 'UserService');
      throw new Error('User ID is required');
    }

    if (!restoredBy?.trim()) {
      logger.error('User restore failed - Restored by field is required', 'UserService');
      throw new Error('Restored by field is required for audit trail');
    }

    const operationId = `restore-user-${id}-${Date.now()}`;
    logger.info(`Starting user restore`, 'UserService', {
      operationId,
      userId: id,
      restoredBy
    });

    return this.withRetry(async () => {
      // Get existing deleted user for validation and audit logging
      logger.debug(`Checking for deleted user`, 'UserService', { userId: id });
      const { data: existingData, error: checkError } = await supabase
        .from('users')
        .select('id, name, is_deleted, email, deleted_at, deleted_by')
        .eq('id', id)
        .eq('is_deleted', true)
        .maybeSingle();

      if (checkError) {
        const serviceError = this.handleSupabaseError(checkError, 'check deleted user');
        logger.error(`Error checking deleted user`, 'UserService', { message: serviceError.message });
        throw new Error(serviceError.message);
      }

      if (!existingData) {
        logger.warn(`User restore failed - user not found or not deleted`, 'UserService', { userId: id });
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

      logger.info(`User restored successfully`, 'UserService', {
        operationId,
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
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      const mappedUsers = data.map(item => this.mapToUser(item));
      return mappedUsers;
    } catch (error) {
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
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      const users = data ? data.map(item => this.mapToUser(item)) : [];
      const total = count || 0;
      const hasMore = offset + limit < total;

      return { users, total, hasMore };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while fetching paginated users');
    }
  }

  async getUserDetails(id: string): Promise<UserDetails> {
    if (!id?.trim()) {
      logger.error('Get user details failed - User ID is required', 'UserService');
      throw new Error('User ID is required');
    }

    const operationId = `get-user-details-${id}-${Date.now()}`;
    logger.info(`Fetching user details`, 'UserService', { operationId, userId: id });

    return this.withRetry(async () => {
      try {
        // Get basic user information with enhanced error handling
        logger.debug(`Fetching basic user information`, 'UserService', { userId: id });
        const user = await this.getById(id);
        if (!user) {
          logger.warn(`User details failed - user not found`, 'UserService', { userId: id });
          throw new Error('User not found or has been deleted');
        }

        // Parallel execution of detail fetching for better performance
        logger.debug(`Fetching user details in parallel`, 'UserService', { userId: id });
        
        const [yardDetails, activityHistory, loginHistory, createdByName] = await Promise.all([
          this.getUserYardDetails(user.yardIds || []).catch(error => {
            logger.warn(`Failed to fetch yard details for user`, 'UserService', { userId: id, error });
            return [] as YardAssignment[]; // Return empty array on error
          }),
          this.getUserActivityHistory(id).catch(error => {
            logger.warn(`Failed to fetch activity history for user`, 'UserService', { userId: id, error });
            return [] as UserActivity[]; // Return empty array on error
          }),
          this.getUserLoginHistory(id).catch(error => {
            logger.warn(`Failed to fetch login history for user`, 'UserService', { userId: id, error });
            return [] as LoginRecord[]; // Return empty array on error
          }),
          this.getUserName(user.createdBy).catch(error => {
            logger.warn(`Failed to fetch creator name for user`, 'UserService', { userId: id, createdBy: user.createdBy, error });
            return undefined; // Return undefined on error
          })
        ]);

        // Generate permission summary with error handling
        let permissionSummary: PermissionSummary;
        try {
          permissionSummary = this.generatePermissionSummary(user.moduleAccess);
        } catch (error) {
          logger.warn(`Failed to generate permission summary for user`, 'UserService', { userId: id, error });
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
          loginHistory,
          createdByName
        };

        logger.info(`User details retrieved successfully`, 'UserService', {
          operationId,
          userId: id,
          yardCount: yardDetails.length,
          activityCount: activityHistory.length,
          loginCount: loginHistory.length,
          enabledModules: permissionSummary.enabledModules
        });

        return userDetails;
      } catch (error) {
        logger.error(`Error getting user details`, 'UserService', { operationId, error });
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
        // Return empty array instead of throwing to prevent getUserDetails from failing
        return [];
      }

      if (!data) {
        return [];
      }

      // Get unique user IDs who created these yards
      const creatorIds = [...new Set(data.map(yard => yard.created_by).filter(Boolean))];
      
      // Fetch user names for these IDs
      const userNamesMap = new Map<string, string>();
      if (creatorIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name')
          .in('id', creatorIds);
        
        if (users) {
          users.forEach(user => {
            userNamesMap.set(user.id, user.name);
          });
        }
      }

      return data.map(yard => ({
        yardId: yard.id,
        yardName: yard.name || 'Unknown Yard',
        yardCode: yard.code || 'N/A',
        assignedAt: yard.created_at ? new Date(yard.created_at) : new Date(),
        assignedBy: yard.created_by ? (userNamesMap.get(yard.created_by) || 'Unknown User') : 'System'
      }));
    } catch (error) {
      // Return empty array instead of throwing to prevent getUserDetails from failing
      return [];
    }
  }

  private async getUserActivityHistory(userId: string): Promise<UserActivity[]> {
    if (!userId?.trim()) {
      return [];
    }

    try {
      // Query user_activities table for recent activities
      const { data, error } = await supabase
        .from('user_activities')
        .select('id, action, description, entity_type, entity_id, metadata, ip_address, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50); // Limit to last 50 activities

      if (error) {
        logger.warn(`Failed to fetch user activities`, 'UserService', { userId, error: error.message });
        return [];
      }

      if (!data || data.length === 0) {
        logger.debug(`No activities found for user`, 'UserService', { userId });
        return [];
      }

      // Map user_activities entries to UserActivity format
      const activities: UserActivity[] = data.map(activity => {
        // Generate human-readable action description
        let actionDescription = '';
        let details = activity.description || '';

        switch (activity.action) {
          case 'login':
            actionDescription = 'User Login';
            details = details || 'User logged into the system';
            break;
          case 'logout':
            actionDescription = 'User Logout';
            details = details || 'User logged out of the system';
            break;
          case 'login_failed':
            actionDescription = 'Failed Login Attempt';
            details = details || 'Login attempt failed';
            break;
          case 'create':
            actionDescription = `Created ${activity.entity_type || 'Item'}`;
            details = details || `Created a new ${activity.entity_type || 'item'}`;
            break;
          case 'update':
            actionDescription = `Updated ${activity.entity_type || 'Item'}`;
            details = details || `Updated ${activity.entity_type || 'item'} information`;
            break;
          case 'delete':
            actionDescription = `Deleted ${activity.entity_type || 'Item'}`;
            details = details || `Deleted ${activity.entity_type || 'item'}`;
            break;
          case 'view':
            actionDescription = `Viewed ${activity.entity_type || 'Item'}`;
            details = details || `Viewed ${activity.entity_type || 'item'} details`;
            break;
          case 'export':
            actionDescription = 'Exported Data';
            details = details || 'Exported data from the system';
            break;
          case 'import':
            actionDescription = 'Imported Data';
            details = details || 'Imported data into the system';
            break;
          default:
            actionDescription = activity.action || 'Unknown Action';
            details = details || 'User activity recorded';
        }

        return {
          id: activity.id,
          action: actionDescription,
          timestamp: new Date(activity.created_at),
          details,
          ipAddress: activity.ip_address || 'Unknown'
        };
      });

      logger.debug(`Retrieved user activity history`, 'UserService', { 
        userId, 
        activityCount: activities.length 
      });

      return activities;
    } catch (error) {
      logger.error(`Error fetching user activity history`, 'UserService', { userId, error });
      // Return empty array instead of throwing to prevent getUserDetails from failing
      return [];
    }
  }

  private generatePermissionSummary(moduleAccess: ModuleAccess): PermissionSummary {
    if (!moduleAccess) {
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
      return [];
    }

    try {
      // Query user_login_history table for login sessions
      const { data, error } = await supabase
        .from('user_login_history')
        .select('id, user_id, login_time, logout_time, session_duration_minutes, ip_address, user_agent, is_successful')
        .eq('user_id', userId)
        .eq('is_successful', true) // Only show successful logins
        .order('login_time', { ascending: false })
        .limit(50); // Limit to last 50 login sessions

      if (error) {
        logger.warn(`Failed to fetch login history for user`, 'UserService', { userId, error: error.message });
        return [];
      }

      if (!data || data.length === 0) {
        logger.debug(`No login history found for user`, 'UserService', { userId });
        return [];
      }

      // Map login history entries to LoginRecord format
      const loginRecords: LoginRecord[] = data.map(session => ({
        id: session.id,
        userId: session.user_id,
        loginTime: new Date(session.login_time),
        logoutTime: session.logout_time ? new Date(session.logout_time) : undefined,
        ipAddress: session.ip_address || 'Unknown',
        userAgent: session.user_agent || 'Unknown',
        sessionDuration: session.session_duration_minutes || undefined
      }));

      logger.debug(`Retrieved user login history`, 'UserService', { 
        userId, 
        loginCount: loginRecords.length 
      });

      return loginRecords;
    } catch (error) {
      logger.error(`Error fetching user login history`, 'UserService', { userId, error });
      // Return empty array instead of throwing to prevent getUserDetails from failing
      return [];
    }
  }

  /**
   * Get user name by ID for display purposes
   * @param userId - The user ID to get the name for
   * @returns Promise<string | undefined> - The user's name or undefined if not found
   */
  private async getUserName(userId: string): Promise<string | undefined> {
    if (!userId?.trim() || userId === 'System') {
      return undefined;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', userId)
        .eq('is_deleted', false)
        .single();

      if (error) {
        logger.warn(`Failed to fetch user name`, 'UserService', { userId, error });
        return undefined;
      }

      return data?.name;
    } catch (error) {
      logger.warn(`Error fetching user name`, 'UserService', { userId, error });
      return undefined;
    }
  }

  /**
   * Check if any admin users exist in the system
   * Used for initial setup to determine if admin creation is needed
   */
  async hasAdminUsers(): Promise<boolean> {
    const operationId = `check-admin-users-${Date.now()}`;
    logger.info(`Checking for existing admin users`, 'UserService', { operationId });

    return this.withRetry(async () => {
      try {
        // First try using the database function to bypass RLS issues
        const { data, error } = await supabase.rpc('has_admin_users');

        if (error) {
          logger.warn(`Database function failed, falling back to direct query`, 'UserService', { error });
          
          // Fallback to direct count query
          const fallbackResult = await supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'admin')
            .eq('active', true)
            .eq('is_deleted', false);

          if (fallbackResult.error) {
            // If both methods fail, assume no admins exist to allow initial setup
            logger.warn(`Both admin check methods failed, assuming no admins exist`, 'UserService', { 
              functionError: error,
              fallbackError: fallbackResult.error 
            });
            
            return false;
          }

          const hasAdmins = (fallbackResult.count || 0) > 0;
          
          logger.info(`Admin users check completed (fallback)`, 'UserService', {
            operationId,
            hasAdmins,
            adminCount: fallbackResult.count || 0
          });

          return hasAdmins;
        }

        const hasAdmins = data === true;
        
        logger.info(`Admin users check completed (function)`, 'UserService', {
          operationId,
          hasAdmins,
          functionResult: data
        });

        return hasAdmins;
      } catch (error) {
        logger.error(`Error checking for admin users`, 'UserService', { operationId, error });
        
        // On any error, return false to allow initial setup
        // This is safer than blocking the application
        logger.warn(`Returning false due to error - allowing initial setup`, 'UserService', { operationId });
        return false;
      }
    }, 'check admin users');
  }

  /**
   * Create initial admin user for system bootstrap
   * This method bypasses normal validation for initial setup
   */
  async createInitialAdmin(
    adminData: {
      name: string;
      email: string;
      password: string;
    },
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<{ user: User; authUser: any }> {
    const operationId = `create-initial-admin-${Date.now()}`;
    logger.info(`Creating initial admin user`, 'UserService', {
      operationId,
      email: adminData.email,
      name: adminData.name
    });

    return this.withRetry(async () => {
      // First check if any admin users already exist
      const hasAdmins = await this.hasAdminUsers();
      if (hasAdmins) {
        throw new Error('Admin users already exist. Initial setup is not allowed.');
      }

      // Validate input data
      const validationResult = this.validateUserData({
        name: adminData.name,
        email: adminData.email,
        role: 'admin',
        createdBy: 'System'
      }, 'create');
      this.throwIfValidationFails(validationResult, 'Initial admin creation');

      // Additional password validation
      if (!adminData.password || adminData.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Check if email already exists in database
      const existingUser = await this.getByEmail(adminData.email);
      if (existingUser) {
        throw new Error('A user with this email already exists in the database');
      }

      // Note: We can't easily check for existing auth users from client-side
      // The signup will fail with a proper error if the user already exists

      // Create auth user first using regular signup (not admin API)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminData.email.trim().toLowerCase(),
        password: adminData.password,
        options: {
          data: {
            name: adminData.name.trim(),
            role: 'admin'
          }
        }
      });

      if (authError) {
        logger.error(`Failed to create auth user for initial admin`, 'UserService', { authError });
        throw new Error(`Failed to create authentication account: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Failed to create authentication account: No user returned');
      }

      // Note: With signUp, the user might need email confirmation depending on Supabase settings
      // For initial admin, we'll proceed regardless of confirmation status

      // Create complete module access for admin (all modules enabled)
      const completeModuleAccess: ModuleAccess = ALL_MODULES.reduce((acc, moduleKey) => {
        acc[moduleKey] = true; // Admin gets access to all modules
        return acc;
      }, {} as ModuleAccess);

      // Create user record in database
      const userData = {
        auth_user_id: authData.user.id,
        name: adminData.name.trim(),
        email: adminData.email.trim().toLowerCase(),
        role: 'admin',
        yard_ids: [],
        module_access: completeModuleAccess, // Legacy field for backward compatibility
        active: true,
        is_deleted: false,
        created_by: 'System',
        created_at: new Date().toISOString()
      };

      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      if (userError) {
        // If user creation fails, we can't easily clean up the auth user without admin API
        // Log the issue for manual cleanup if needed
        logger.error(`Failed to create user record after auth user creation`, 'UserService', { 
          userError,
          authUserId: authData.user.id,
          email: authData.user.email,
          message: 'Manual cleanup may be required in Supabase Auth dashboard'
        });
        
        const serviceError = this.handleSupabaseError(userError, 'create initial admin user record');
        throw new Error(serviceError.message);
      }

      if (!userRecord) {
        throw new Error('Failed to create initial admin user: No data returned');
      }

      // Create module access record in user_module_access table (this is the source of truth)
      try {
        // Try to insert with the user's own ID as updated_by (now nullable)
        const { error: moduleAccessError } = await supabase
          .from('user_module_access')
          .insert({
            user_id: userRecord.id,
            module_permissions: completeModuleAccess,
            updated_by: userRecord.id // This should work now that updated_by is nullable
          });

        if (moduleAccessError) {
          logger.error(`Failed to create module access record for initial admin`, 'UserService', { 
            moduleAccessError,
            userId: userRecord.id,
            authUserId: authData.user.id,
            email: authData.user.email,
            message: 'Manual cleanup may be required in Supabase Auth dashboard'
          });
          
          // Clean up the user record, but we can't clean up auth user without admin API
          try {
            await supabase.from('users').delete().eq('id', userRecord.id);
          } catch (cleanupError) {
            logger.error(`Failed to cleanup user record after module access creation failure`, 'UserService', { cleanupError });
          }
          
          throw new Error(`Failed to set module permissions: ${moduleAccessError.message}`);
        }

        logger.info(`Module access record created successfully for initial admin`, 'UserService', {
          userId: userRecord.id,
          moduleCount: Object.keys(completeModuleAccess).length,
          enabledModules: Object.values(completeModuleAccess).filter(Boolean).length
        });
      } catch (error) {
        logger.error(`Error creating module access record`, 'UserService', { error, userId: userRecord.id });
        throw error;
      }

      // Log audit entry
      await this.logAuditEntry({
        entityType: 'user',
        entityId: userRecord.id,
        action: 'create',
        changes: { 
          created: userData,
          operationId,
          isInitialAdmin: true,
          authUserId: authData.user.id,
          moduleAccess: completeModuleAccess,
          enabledModules: Object.keys(completeModuleAccess).filter(key => completeModuleAccess[key as keyof ModuleAccess])
        },
        userId: 'System',
        userName: 'System',
        timestamp: new Date(),
        ipAddress: auditContext?.ipAddress,
        userAgent: auditContext?.userAgent
      });

      logger.info(`Initial admin user created successfully`, 'UserService', {
        operationId,
        userId: userRecord.id,
        authUserId: authData.user.id,
        email: userRecord.email,
        name: userRecord.name,
        totalModules: Object.keys(completeModuleAccess).length,
        enabledModules: Object.values(completeModuleAccess).filter(Boolean).length
      });

      // Create an initial yard for the admin user
      try {
        const { data: yardData, error: yardError } = await supabase
          .from('yards')
          .insert({
            name: 'Default Yard',
            code: 'MAIN',
            description: 'Default yard created during initial setup',
            is_active: true,
            created_by: userRecord.id,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (yardError) {
          logger.warn(`Failed to create initial yard for admin`, 'UserService', { 
            yardError,
            userId: userRecord.id 
          });
          // Don't fail the entire process if yard creation fails
        } else if (yardData) {
          // Update the user to assign them to this yard
          const { error: updateError } = await supabase
            .from('users')
            .update({
              yard_ids: [yardData.id],
              updated_at: new Date().toISOString(),
              updated_by: userRecord.id
            })
            .eq('id', userRecord.id);

          if (updateError) {
            logger.warn(`Failed to assign initial yard to admin`, 'UserService', { 
              updateError,
              userId: userRecord.id,
              yardId: yardData.id
            });
          } else {
            logger.info(`Initial yard created and assigned to admin`, 'UserService', {
              userId: userRecord.id,
              yardId: yardData.id,
              yardName: yardData.name,
              yardCode: yardData.code
            });
          }
        }
      } catch (yardCreationError) {
        logger.warn(`Error during initial yard creation`, 'UserService', { 
          yardCreationError,
          userId: userRecord.id
        });
        // Don't fail the entire process if yard creation fails
      }

      return {
        user: this.mapToUser(userRecord),
        authUser: authData.user
      };
    }, 'create initial admin');
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
      } else if (data.user_module_access && !Array.isArray(data.user_module_access) && data.user_module_access.module_permissions) {
        moduleAccess = data.user_module_access.module_permissions || {};
      } else {
        // Fallback to users.module_access if no user_module_access exists (for backward compatibility)
        moduleAccess = data.module_access || {};
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
      throw new Error('Failed to map user data');
    }
  }
}

export const userService = new UserService();
