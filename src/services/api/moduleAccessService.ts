import { supabase } from './supabaseClient';
import { ModuleAccess } from '../../types';
import { toDate } from '../../utils/dateHelpers';
import { logger } from '../../utils/logger';

// Enhanced types for validation and error handling
export interface ValidationReport {
  userId?: string;
  isConsistent: boolean;
  inconsistencies: DataInconsistency[];
  recommendations: string[];
  timestamp: Date;
}

export interface DataInconsistency {
  field: string;
  usersValue: any;
  userModuleAccessValue: any;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export enum SyncErrorType {
  NETWORK_ERROR = 'network_error',
  DATABASE_ERROR = 'database_error',
  VALIDATION_ERROR = 'validation_error',
  PERMISSION_ERROR = 'permission_error',
  TIMEOUT_ERROR = 'timeout_error',
  DATA_INCONSISTENCY = 'data_inconsistency'
}

export interface SyncError extends Error {
  type: SyncErrorType;
  userId?: string;
  timestamp: Date;
  retryCount: number;
  canRetry: boolean;
  originalError?: Error;
}

export interface UserValidationResult {
  userId: string;
  timestamp: Date;
  consistencyReport: ValidationReport;
  structuralValidation: StructuralValidationResult;
  referentialValidation: ReferentialValidationResult;
  overallStatus: 'valid' | 'warning' | 'error';
  recommendations: string[];
}

export interface StructuralValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ReferentialValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SyncMetrics {
  operationType: 'read' | 'write' | 'validate' | 'sync';
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
  errorType?: SyncErrorType;
  errorMessage?: string;
  dataSize?: number;
  retryCount?: number;
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  operation: string;
  details: Record<string, any>;
  timestamp: Date;
  performedBy?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export interface PerformanceMetrics {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  slowestOperation: number;
  fastestOperation: number;
  operationsByType: Record<string, number>;
  errorsByType: Record<SyncErrorType, number>;
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

interface UserModuleAccess {
  id: string;
  userId: string;
  modulePermissions: ModuleAccess;
  updatedAt: Date | null;
  updatedBy: string;
}

class ModuleAccessService {
  private metrics: SyncMetrics[] = [];
  private auditLogs: AuditLogEntry[] = [];
  private readonly maxMetricsHistory = 1000;
  private readonly maxAuditHistory = 5000;
  /**
   * Enhanced method to get user module access with fallback mechanism
   * Tries user_module_access first, then falls back to users.module_access
   */
  async getUserModuleAccessWithFallback(userId: string): Promise<ModuleAccess | null> {
    const metric = this.startMetricsTracking('read', userId);
    
    try {
      // First, try to get from user_module_access table (primary source)
      const primaryData = await this.getUserModuleAccess(userId);
      if (primaryData) {
        this.completeMetricsTracking(metric, true, undefined, JSON.stringify(primaryData).length);
        this.createAuditLog('getUserModuleAccessWithFallback', {
          source: 'user_module_access',
          fallbackUsed: false,
          dataFound: true
        }, userId);
        return primaryData;
      }

      // Fallback to users.module_access if no data in primary source
      this.logStructured('info', `No data in user_module_access for user ${userId}, falling back to users.module_access`, { userId });
      
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('users')
        .select('module_access')
        .eq('id', userId)
        .maybeSingle();

      if (fallbackError) {
        const syncError = this.createSyncError(
          SyncErrorType.DATABASE_ERROR,
          `Failed to fetch fallback data for user ${userId}`,
          userId,
          fallbackError
        );
        this.completeMetricsTracking(metric, false, syncError);
        this.createAuditLog('getUserModuleAccessWithFallback', {
          source: 'users.module_access',
          fallbackUsed: true,
          error: fallbackError.message
        }, userId, undefined, false, fallbackError.message);
        throw syncError;
      }

      if (!fallbackData?.module_access) {
        this.completeMetricsTracking(metric, true);
        this.createAuditLog('getUserModuleAccessWithFallback', {
          source: 'users.module_access',
          fallbackUsed: true,
          dataFound: false
        }, userId);
        return null;
      }

      // Ensure all modules are present with default values
      const modulePermissions = fallbackData.module_access as ModuleAccess;
      const completePermissions: ModuleAccess = ALL_MODULES.reduce((acc, moduleKey) => {
        acc[moduleKey] = modulePermissions[moduleKey] || false;
        return acc;
      }, {} as ModuleAccess);

      this.completeMetricsTracking(metric, true, undefined, JSON.stringify(completePermissions).length);
      this.createAuditLog('getUserModuleAccessWithFallback', {
        source: 'users.module_access',
        fallbackUsed: true,
        dataFound: true
      }, userId);

      return completePermissions;
    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        this.completeMetricsTracking(metric, false, error as SyncError);
        throw error; // Re-throw SyncError as-is
      }
      const syncError = this.createSyncError(
        SyncErrorType.DATABASE_ERROR,
        `Failed to get module access with fallback for user ${userId}`,
        userId,
        error as Error
      );
      this.completeMetricsTracking(metric, false, syncError);
      throw syncError;
    }
  }

  /**
   * Validates data consistency between users.module_access and user_module_access.module_permissions
   */
  async validateDataConsistency(userId?: string): Promise<ValidationReport> {
    const metric = this.startMetricsTracking('validate', userId);
    const timestamp = new Date();
    
    try {
      let result: ValidationReport;
      
      if (userId) {
        // Validate single user
        result = await this.validateSingleUserConsistency(userId, timestamp);
      } else {
        // Validate all users
        result = await this.validateAllUsersConsistency(timestamp);
      }

      this.completeMetricsTracking(metric, true, undefined, JSON.stringify(result).length);
      this.createAuditLog('validateDataConsistency', {
        scope: userId ? 'single_user' : 'all_users',
        isConsistent: result.isConsistent,
        inconsistencyCount: result.inconsistencies.length,
        recommendationCount: result.recommendations.length
      }, userId);

      return result;
    } catch (error) {
      const syncError = this.createSyncError(
        SyncErrorType.VALIDATION_ERROR,
        `Failed to validate data consistency${userId ? ` for user ${userId}` : ''}`,
        userId,
        error as Error
      );
      this.completeMetricsTracking(metric, false, syncError);
      this.createAuditLog('validateDataConsistency', {
        scope: userId ? 'single_user' : 'all_users',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, userId, undefined, false, error instanceof Error ? error.message : 'Unknown error');
      throw syncError;
    }
  }

  /**
   * Validates consistency for a single user
   */
  private async validateSingleUserConsistency(userId: string, timestamp: Date): Promise<ValidationReport> {
    const inconsistencies: DataInconsistency[] = [];
    const recommendations: string[] = [];

    // Get data from both sources
    const [primaryData, fallbackData] = await Promise.all([
      this.getUserModuleAccess(userId),
      this.getUsersModuleAccess(userId)
    ]);

    // Check if both sources exist
    if (!primaryData && !fallbackData) {
      recommendations.push('No module access data found in either source. Consider creating default permissions.');
      return {
        userId,
        isConsistent: false,
        inconsistencies: [{
          field: 'all',
          usersValue: null,
          userModuleAccessValue: null,
          severity: 'high',
          description: 'No module access data found in either source'
        }],
        recommendations,
        timestamp
      };
    }

    if (!primaryData && fallbackData) {
      recommendations.push('Data exists only in users.module_access. Consider migrating to user_module_access.');
      inconsistencies.push({
        field: 'all',
        usersValue: fallbackData,
        userModuleAccessValue: null,
        severity: 'medium',
        description: 'Data exists only in users.module_access table'
      });
    }

    if (primaryData && !fallbackData) {
      recommendations.push('Data exists only in user_module_access. Consider syncing to users.module_access for backward compatibility.');
      inconsistencies.push({
        field: 'all',
        usersValue: null,
        userModuleAccessValue: primaryData,
        severity: 'low',
        description: 'Data exists only in user_module_access table'
      });
    }

    // Compare field by field if both exist
    if (primaryData && fallbackData) {
      for (const moduleKey of ALL_MODULES) {
        const primaryValue = primaryData[moduleKey];
        const fallbackValue = fallbackData[moduleKey];

        if (primaryValue !== fallbackValue) {
          inconsistencies.push({
            field: moduleKey,
            usersValue: fallbackValue,
            userModuleAccessValue: primaryValue,
            severity: 'medium',
            description: `Module ${moduleKey} has different values: users.module_access=${fallbackValue}, user_module_access=${primaryValue}`
          });
        }
      }

      if (inconsistencies.length > 0) {
        recommendations.push('Synchronize data between both sources to resolve field-level inconsistencies.');
      }
    }

    return {
      userId,
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
      recommendations,
      timestamp
    };
  }

  /**
   * Validates consistency for all users
   */
  private async validateAllUsersConsistency(timestamp: Date): Promise<ValidationReport> {
    const allInconsistencies: DataInconsistency[] = [];
    const recommendations: string[] = [];

    // Get all users with module access data
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, module_access')
      .not('module_access', 'is', null);

    if (usersError) {
      throw usersError;
    }

    const { data: userModuleAccessData, error: userModuleAccessError } = await supabase
      .from('user_module_access')
      .select('user_id, module_permissions');

    if (userModuleAccessError) {
      throw userModuleAccessError;
    }

    // Create maps for efficient lookup
    const usersMap = new Map(usersData?.map(u => [u.id, u.module_access]) || []);
    const userModuleAccessMap = new Map(userModuleAccessData?.map(u => [u.user_id, u.module_permissions]) || []);

    // Get all unique user IDs
    const allUserIds = new Set([...usersMap.keys(), ...userModuleAccessMap.keys()]);

    let inconsistentUsers = 0;
    for (const userId of allUserIds) {
      const usersValue = usersMap.get(userId);
      const userModuleAccessValue = userModuleAccessMap.get(userId);

      if (!usersValue && !userModuleAccessValue) {
        continue; // Skip users with no data
      }

      if (!usersValue || !userModuleAccessValue) {
        allInconsistencies.push({
          field: 'all',
          usersValue,
          userModuleAccessValue,
          severity: usersValue ? 'medium' : 'low',
          description: `User ${userId} has data in only one source`
        });
        inconsistentUsers++;
        continue;
      }

      // Compare field by field
      let hasInconsistency = false;
      for (const moduleKey of ALL_MODULES) {
        const primaryValue = userModuleAccessValue[moduleKey];
        const fallbackValue = usersValue[moduleKey];

        if (primaryValue !== fallbackValue) {
          allInconsistencies.push({
            field: `${userId}.${moduleKey}`,
            usersValue: fallbackValue,
            userModuleAccessValue: primaryValue,
            severity: 'medium',
            description: `User ${userId} module ${moduleKey}: users=${fallbackValue}, user_module_access=${primaryValue}`
          });
          hasInconsistency = true;
        }
      }

      if (hasInconsistency) {
        inconsistentUsers++;
      }
    }

    // Generate recommendations
    if (inconsistentUsers > 0) {
      recommendations.push(`Found ${inconsistentUsers} users with data inconsistencies.`);
      recommendations.push('Run data migration to consolidate permissions into single source.');
      recommendations.push('Implement automatic synchronization to prevent future inconsistencies.');
    }

    return {
      isConsistent: allInconsistencies.length === 0,
      inconsistencies: allInconsistencies,
      recommendations,
      timestamp
    };
  }

  /**
   * Helper method to get module access from users table
   */
  private async getUsersModuleAccess(userId: string): Promise<ModuleAccess | null> {
    const { data, error } = await supabase
      .from('users')
      .select('module_access')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data?.module_access) return null;

    // Ensure all modules are present with default values
    const modulePermissions = data.module_access as ModuleAccess;
    const completePermissions: ModuleAccess = ALL_MODULES.reduce((acc, moduleKey) => {
      acc[moduleKey] = modulePermissions[moduleKey] || false;
      return acc;
    }, {} as ModuleAccess);

    return completePermissions;
  }

  /**
   * Validates the structure and integrity of ModuleAccess data
   */
  validateModuleAccessStructure(permissions: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!permissions || typeof permissions !== 'object') {
      errors.push('Module access must be an object');
      return { isValid: false, errors };
    }

    // Check for required module fields
    for (const moduleKey of ALL_MODULES) {
      if (!(moduleKey in permissions)) {
        errors.push(`Missing required module: ${moduleKey}`);
      } else if (typeof permissions[moduleKey] !== 'boolean') {
        errors.push(`Module ${moduleKey} must be a boolean value, got ${typeof permissions[moduleKey]}`);
      }
    }

    // Check for unexpected fields
    const validKeys = new Set(ALL_MODULES);
    for (const key in permissions) {
      if (!validKeys.has(key as keyof ModuleAccess)) {
        errors.push(`Unexpected field: ${key}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates individual user permission consistency across all data sources
   */
  async validateUserPermissions(userId: string): Promise<UserValidationResult> {
    try {
      const timestamp = new Date();
      const validationReport = await this.validateSingleUserConsistency(userId, timestamp);
      
      // Additional user-specific validations
      const structuralValidation = await this.validateUserPermissionStructure(userId);
      const referentialValidation = await this.validateUserReferentialIntegrity(userId);

      return {
        userId,
        timestamp,
        consistencyReport: validationReport,
        structuralValidation,
        referentialValidation,
        overallStatus: this.determineOverallValidationStatus(validationReport, structuralValidation, referentialValidation),
        recommendations: this.generateUserValidationRecommendations(validationReport, structuralValidation, referentialValidation)
      };
    } catch (error) {
      throw this.createSyncError(
        SyncErrorType.VALIDATION_ERROR,
        `Failed to validate user permissions for user ${userId}`,
        userId,
        error as Error
      );
    }
  }

  /**
   * Validates the structural integrity of user permissions
   */
  private async validateUserPermissionStructure(userId: string): Promise<StructuralValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check user_module_access structure
      const { data: userModuleData, error: userModuleError } = await supabase
        .from('user_module_access')
        .select('module_permissions')
        .eq('user_id', userId)
        .maybeSingle();

      if (userModuleError) {
        errors.push(`Database error accessing user_module_access: ${userModuleError.message}`);
      } else if (userModuleData) {
        const structureValidation = this.validateModuleAccessStructure(userModuleData.module_permissions);
        if (!structureValidation.isValid) {
          errors.push(...structureValidation.errors.map(e => `user_module_access: ${e}`));
        }
      }

      // Check users.module_access structure
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('module_access')
        .eq('id', userId)
        .maybeSingle();

      if (usersError) {
        errors.push(`Database error accessing users table: ${usersError.message}`);
      } else if (usersData?.module_access) {
        const structureValidation = this.validateModuleAccessStructure(usersData.module_access);
        if (!structureValidation.isValid) {
          errors.push(...structureValidation.errors.map(e => `users.module_access: ${e}`));
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Structural validation failed: ${(error as Error).message}`],
        warnings
      };
    }
  }

  /**
   * Validates referential integrity between user and permission data
   */
  private async validateUserReferentialIntegrity(userId: string): Promise<ReferentialValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if user exists
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, is_active')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        errors.push(`Failed to verify user existence: ${userError.message}`);
        return { isValid: false, errors, warnings };
      }

      if (!userData) {
        errors.push(`User ${userId} does not exist`);
        return { isValid: false, errors, warnings };
      }

      if (!userData.is_active) {
        warnings.push(`User ${userId} is inactive but has module access permissions`);
      }

      // Check for orphaned user_module_access records
      const { data: moduleAccessData, error: moduleAccessError } = await supabase
        .from('user_module_access')
        .select('id')
        .eq('user_id', userId);

      if (moduleAccessError) {
        errors.push(`Failed to check user_module_access records: ${moduleAccessError.message}`);
      } else if (moduleAccessData && moduleAccessData.length > 1) {
        errors.push(`Multiple user_module_access records found for user ${userId}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Referential validation failed: ${(error as Error).message}`],
        warnings
      };
    }
  }

  /**
   * Determines overall validation status based on individual validation results
   */
  private determineOverallValidationStatus(
    consistency: ValidationReport,
    structural: StructuralValidationResult,
    referential: ReferentialValidationResult
  ): 'valid' | 'warning' | 'error' {
    if (!consistency.isConsistent || !structural.isValid || !referential.isValid) {
      return 'error';
    }

    if (structural.warnings.length > 0 || referential.warnings.length > 0) {
      return 'warning';
    }

    return 'valid';
  }

  /**
   * Generates recommendations based on validation results
   */
  private generateUserValidationRecommendations(
    consistency: ValidationReport,
    structural: StructuralValidationResult,
    referential: ReferentialValidationResult
  ): string[] {
    const recommendations: string[] = [];

    // Add consistency recommendations
    recommendations.push(...consistency.recommendations);

    // Add structural recommendations
    if (!structural.isValid) {
      recommendations.push('Fix structural issues in module access data');
      if (structural.errors.some(e => e.includes('user_module_access'))) {
        recommendations.push('Repair or recreate user_module_access record');
      }
      if (structural.errors.some(e => e.includes('users.module_access'))) {
        recommendations.push('Repair or recreate users.module_access data');
      }
    }

    // Add referential recommendations
    if (!referential.isValid) {
      recommendations.push('Fix referential integrity issues');
      if (referential.errors.some(e => e.includes('does not exist'))) {
        recommendations.push('Remove orphaned permission records');
      }
      if (referential.errors.some(e => e.includes('Multiple'))) {
        recommendations.push('Consolidate duplicate permission records');
      }
    }

    if (referential.warnings.some(w => w.includes('inactive'))) {
      recommendations.push('Consider removing permissions for inactive users');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Starts tracking performance metrics for an operation
   */
  private startMetricsTracking(operationType: SyncMetrics['operationType'], userId?: string): SyncMetrics {
    const metric: SyncMetrics = {
      operationType,
      userId,
      startTime: new Date(),
      success: false
    };

    this.logStructured('info', `Starting ${operationType} operation`, {
      operationType,
      userId,
      timestamp: metric.startTime
    });

    return metric;
  }

  /**
   * Completes metrics tracking for an operation
   */
  private completeMetricsTracking(metric: SyncMetrics, success: boolean, error?: SyncError, dataSize?: number): void {
    metric.endTime = new Date();
    metric.duration = metric.endTime.getTime() - metric.startTime.getTime();
    metric.success = success;
    metric.dataSize = dataSize;

    if (error) {
      metric.errorType = error.type;
      metric.errorMessage = error.message;
      metric.retryCount = error.retryCount;
    }

    // Add to metrics history
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    this.logStructured(success ? 'info' : 'error', `Completed ${metric.operationType} operation`, {
      operationType: metric.operationType,
      userId: metric.userId,
      duration: metric.duration,
      success,
      errorType: error?.type,
      errorMessage: error?.message,
      dataSize
    });
  }

  /**
   * Creates an audit log entry for permission changes and sync activities
   */
  private createAuditLog(
    operation: string,
    details: Record<string, any>,
    userId?: string,
    performedBy?: string,
    success: boolean = true,
    errorMessage?: string
  ): void {
    const auditEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      userId,
      operation,
      details,
      timestamp: new Date(),
      performedBy,
      success,
      errorMessage
    };

    // Add to audit history
    this.auditLogs.push(auditEntry);
    if (this.auditLogs.length > this.maxAuditHistory) {
      this.auditLogs.shift();
    }

    this.logStructured('audit', `Audit: ${operation}`, {
      auditId: auditEntry.id,
      userId,
      operation,
      details,
      performedBy,
      success,
      errorMessage
    });

    // In a production environment, this would also write to a persistent audit log
    // For now, we'll just log to console with structured format
  }

  /**
   * Structured logging with consistent format
   */
  private logStructured(
    level: 'info' | 'warn' | 'error' | 'debug' | 'audit',
    message: string,
    context: Record<string, any> = {}
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: 'ModuleAccessService',
      message,
      ...context
    };

    switch (level) {
      case 'error':
        logger.error(`🔴 [${logEntry.level}] ${logEntry.message}`, 'ComponentName', logEntry);
        break;
      case 'warn':
        logger.warn(`🟡 [${logEntry.level}] ${logEntry.message}`, 'ComponentName', logEntry);
        break;
      case 'audit':
        logger.info(`📋 [${logEntry.level}] ${logEntry.message}`, 'ComponentName', logEntry);
        break;
      case 'debug':
        logger.debug(`🔍 [${logEntry.level}] ${logEntry.message}`, 'ComponentName', { logEntry });
        break;
      default:
        logger.info(`ℹ️ [${logEntry.level}] ${logEntry.message}`, 'ComponentName', logEntry);
    }
  }

  /**
   * Gets performance metrics for monitoring and reporting
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const totalOperations = this.metrics.length;
    const successfulOperations = this.metrics.filter(m => m.success).length;
    const failedOperations = totalOperations - successfulOperations;

    const durations = this.metrics.filter(m => m.duration !== undefined).map(m => m.duration!);
    const averageResponseTime = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const slowestOperation = durations.length > 0 ? Math.max(...durations) : 0;
    const fastestOperation = durations.length > 0 ? Math.min(...durations) : 0;

    const operationsByType = this.metrics.reduce((acc, metric) => {
      acc[metric.operationType] = (acc[metric.operationType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsByType = this.metrics
      .filter(m => !m.success && m.errorType)
      .reduce((acc, metric) => {
        acc[metric.errorType!] = (acc[metric.errorType!] || 0) + 1;
        return acc;
      }, {} as Record<SyncErrorType, number>);

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageResponseTime,
      slowestOperation,
      fastestOperation,
      operationsByType,
      errorsByType
    };
  }

  /**
   * Gets recent audit logs for monitoring and compliance
   */
  getAuditLogs(limit: number = 100, userId?: string, operation?: string): AuditLogEntry[] {
    let logs = [...this.auditLogs];

    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }

    if (operation) {
      logs = logs.filter(log => log.operation.includes(operation));
    }

    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clears old metrics and audit logs to prevent memory leaks
   */
  clearOldLogs(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const originalMetricsCount = this.metrics.length;
    const originalAuditCount = this.auditLogs.length;

    this.metrics = this.metrics.filter(m => m.startTime > cutoffTime);
    this.auditLogs = this.auditLogs.filter(log => log.timestamp > cutoffTime);

    this.logStructured('info', 'Cleared old logs', {
      metricsRemoved: originalMetricsCount - this.metrics.length,
      auditLogsRemoved: originalAuditCount - this.auditLogs.length,
      cutoffTime: cutoffTime.toISOString()
    });
  }

  /**
   * Creates a standardized SyncError with proper typing and context
   */
  private createSyncError(
    type: SyncErrorType,
    message: string,
    userId?: string,
    originalError?: Error,
    retryCount: number = 0
  ): SyncError {
    const error = new Error(message) as SyncError;
    error.type = type;
    error.userId = userId;
    error.timestamp = new Date();
    error.retryCount = retryCount;
    error.canRetry = type !== SyncErrorType.VALIDATION_ERROR && type !== SyncErrorType.PERMISSION_ERROR;
    error.originalError = originalError;
    
    // Enhanced structured logging for errors
    this.logStructured('error', `SyncError: ${message}`, {
      errorType: type,
      userId,
      retryCount,
      canRetry: error.canRetry,
      originalError: originalError?.message,
      stack: originalError?.stack
    });

    return error;
  }

  async getUserModuleAccess(userId: string): Promise<ModuleAccess | null> {
    const { data, error } = await supabase
      .from('user_module_access')
      .select('module_permissions')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Ensure all modules are present with default values
    const modulePermissions = data.module_permissions as ModuleAccess;
    const completePermissions: ModuleAccess = ALL_MODULES.reduce((acc, moduleKey) => {
      acc[moduleKey] = modulePermissions[moduleKey] || false;
      return acc;
    }, {} as ModuleAccess);

    return completePermissions;
  }

  async setUserModuleAccess(
    userId: string,
    permissions: ModuleAccess,
    updatedBy: string
  ): Promise<UserModuleAccess> {
    const metric = this.startMetricsTracking('write', userId);
    
    this.logStructured('info', 'Starting save operation', {
      userId,
      updatedBy,
      permissionCount: Object.keys(permissions).length
    });

    try {
      // Validate input permissions
      const validationResult = this.validateModuleAccessStructure(permissions);
      if (!validationResult.isValid) {
        const syncError = this.createSyncError(
          SyncErrorType.VALIDATION_ERROR,
          `Invalid module access structure: ${validationResult.errors.join(', ')}`,
          userId
        );
        this.completeMetricsTracking(metric, false, syncError);
        this.createAuditLog('setUserModuleAccess', {
          operation: 'validation_failed',
          errors: validationResult.errors
        }, userId, updatedBy, false, syncError.message);
        throw syncError;
      }

      // Ensure all module keys are present with boolean values
      const completePermissions: ModuleAccess = ALL_MODULES.reduce((acc, moduleKey) => {
        acc[moduleKey] = permissions[moduleKey] || false;
        return acc;
      }, {} as ModuleAccess);

      this.logStructured('debug', 'Complete permissions prepared', {
        userId,
        completePermissions
      });

      const { data: existing, error: existingError } = await supabase
        .from('user_module_access')
        .select('id, module_permissions')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingError) {
        const syncError = this.createSyncError(
          SyncErrorType.DATABASE_ERROR,
          `Failed to check existing record for user ${userId}`,
          userId,
          existingError
        );
        this.completeMetricsTracking(metric, false, syncError);
        this.createAuditLog('setUserModuleAccess', {
          operation: 'check_existing_failed',
          error: existingError.message
        }, userId, updatedBy, false, existingError.message);
        throw syncError;
      }

      this.logStructured('debug', 'Existing record check completed', {
        userId,
        hasExisting: !!existing
      });

      let result: UserModuleAccess;

      if (existing) {
        this.logStructured('info', 'Updating existing record', { userId });
        const { data, error } = await supabase
          .from('user_module_access')
          .update({
            module_permissions: completePermissions,
            updated_by: updatedBy
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          const syncError = this.createSyncError(
            SyncErrorType.DATABASE_ERROR,
            `Failed to update user_module_access for user ${userId}`,
            userId,
            error
          );
          this.completeMetricsTracking(metric, false, syncError);
          this.createAuditLog('setUserModuleAccess', {
            operation: 'update_failed',
            error: error.message
          }, userId, updatedBy, false, error.message);
          throw syncError;
        }

        this.logStructured('info', 'Update successful', { userId, recordId: data.id });

        result = {
          id: data.id,
          userId: data.user_id,
          modulePermissions: data.module_permissions as ModuleAccess,
          updatedAt: toDate(data.updated_at) || new Date(),
          updatedBy: data.updated_by
        };

        this.createAuditLog('setUserModuleAccess', {
          operation: 'update',
          recordId: data.id,
          oldPermissions: existing.module_permissions,
          newPermissions: completePermissions,
          changedFields: this.getChangedFields(existing.module_permissions, completePermissions)
        }, userId, updatedBy);
      } else {
        this.logStructured('info', 'Inserting new record', { userId });
        const { data, error } = await supabase
          .from('user_module_access')
          .insert({
            user_id: userId,
            module_permissions: completePermissions,
            updated_by: updatedBy
          })
          .select()
          .single();

        if (error) {
          const syncError = this.createSyncError(
            SyncErrorType.DATABASE_ERROR,
            `Failed to insert user_module_access for user ${userId}`,
            userId,
            error
          );
          this.completeMetricsTracking(metric, false, syncError);
          this.createAuditLog('setUserModuleAccess', {
            operation: 'insert_failed',
            error: error.message
          }, userId, updatedBy, false, error.message);
          throw syncError;
        }

        this.logStructured('info', 'Insert successful', { userId, recordId: data.id });

        result = {
          id: data.id,
          userId: data.user_id,
          modulePermissions: data.module_permissions as ModuleAccess,
          updatedAt: toDate(data.updated_at),
          updatedBy: data.updated_by
        };

        this.createAuditLog('setUserModuleAccess', {
          operation: 'insert',
          recordId: data.id,
          permissions: completePermissions
        }, userId, updatedBy);
      }

      // Sync with users.module_access for backward compatibility with enhanced error handling
      await this.syncToUsersTable(userId, completePermissions);

      this.completeMetricsTracking(metric, true, undefined, JSON.stringify(result).length);
      
      return result;
    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        this.completeMetricsTracking(metric, false, error as SyncError);
        throw error; // Re-throw SyncError as-is
      }
      const syncError = this.createSyncError(
        SyncErrorType.DATABASE_ERROR,
        `Failed to set module access for user ${userId}`,
        userId,
        error as Error
      );
      this.completeMetricsTracking(metric, false, syncError);
      this.createAuditLog('setUserModuleAccess', {
        operation: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, userId, updatedBy, false, error instanceof Error ? error.message : 'Unknown error');
      throw syncError;
    }
  }

  /**
   * Helper method to identify changed fields between old and new permissions
   */
  private getChangedFields(oldPermissions: any, newPermissions: ModuleAccess): string[] {
    const changedFields: string[] = [];
    
    for (const moduleKey of ALL_MODULES) {
      const oldValue = oldPermissions?.[moduleKey] || false;
      const newValue = newPermissions[moduleKey];
      
      if (oldValue !== newValue) {
        changedFields.push(`${moduleKey}: ${oldValue} → ${newValue}`);
      }
    }
    
    return changedFields;
  }

  /**
   * Enhanced sync method with proper error handling and retry logic
   */
  private async syncToUsersTable(userId: string, permissions: ModuleAccess, retryCount: number = 0): Promise<void> {
    const maxRetries = 3;
    const syncMetric = this.startMetricsTracking('sync', userId);
    
    try {
      this.logStructured('info', 'Starting sync to users.module_access', {
        userId,
        retryCount,
        maxRetries
      });

      const { data: syncResult, error: syncError } = await supabase
        .from('users')
        .update({
          module_access: permissions,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('module_access');

      if (syncError) {
        throw syncError;
      }

      this.logStructured('info', 'Successfully synced to users.module_access', {
        userId,
        retryCount,
        resultCount: syncResult?.length || 0
      });

      this.completeMetricsTracking(syncMetric, true, undefined, JSON.stringify(syncResult).length);
      
      this.createAuditLog('syncToUsersTable', {
        operation: 'sync_success',
        retryCount,
        permissions
      }, userId);

    } catch (syncError) {
      this.logStructured('error', 'Failed to sync to users.module_access', {
        userId,
        retryCount,
        maxRetries,
        error: (syncError as Error).message
      });
      
      if (retryCount < maxRetries) {
        const backoffDelay = Math.pow(2, retryCount) * 1000;
        this.logStructured('info', `Retrying sync with exponential backoff`, {
          userId,
          attempt: retryCount + 1,
          maxRetries,
          backoffDelay
        });
        
        this.completeMetricsTracking(syncMetric, false, this.createSyncError(
          SyncErrorType.DATABASE_ERROR,
          `Sync attempt ${retryCount + 1} failed, retrying`,
          userId,
          syncError as Error,
          retryCount
        ));

        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        return this.syncToUsersTable(userId, permissions, retryCount + 1);
      }

      // Log the sync failure but don't throw - the primary operation succeeded
      this.logStructured('error', `Failed to sync after ${maxRetries} attempts. Primary operation succeeded but sync failed.`, {
        userId,
        maxRetries,
        finalError: (syncError as Error).message
      });
      
      const finalSyncError = this.createSyncError(
        SyncErrorType.DATABASE_ERROR,
        `Failed to sync to users.module_access after ${maxRetries} attempts`,
        userId,
        syncError as Error,
        retryCount
      );

      this.completeMetricsTracking(syncMetric, false, finalSyncError);
      
      this.createAuditLog('syncToUsersTable', {
        operation: 'sync_failed',
        retryCount,
        maxRetries,
        finalError: (syncError as Error).message,
        permissions
      }, userId, undefined, false, (syncError as Error).message);
    }
  }

  async getAllUserModuleAccess(): Promise<UserModuleAccess[]> {
    const { data, error } = await supabase
      .from('user_module_access')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(record => ({
      id: record.id,
      userId: record.user_id,
      modulePermissions: record.module_permissions as ModuleAccess,
      updatedAt: toDate(record.updated_at) || new Date(),
      updatedBy: record.updated_by
    }));
  }

  async deleteUserModuleAccess(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_module_access')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  async batchUpdateModuleAccess(
    updates: Array<{ userId: string; permissions: ModuleAccess }>,
    updatedBy: string
  ): Promise<void> {
    const promises = updates.map(update =>
      this.setUserModuleAccess(update.userId, update.permissions, updatedBy)
    );

    await Promise.all(promises);
  }
}

export const moduleAccessService = new ModuleAccessService();
