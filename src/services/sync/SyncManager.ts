import { moduleAccessService, SyncErrorType } from '../api/moduleAccessService';
import type { 
  SyncError
} from '../api/moduleAccessService';
import type { ModuleAccess } from '../../types';
import { logger } from '../../utils/logger';

// Sync-specific interfaces
export interface SyncResult {
  totalUsers: number;
  syncedUsers: number;
  failedUsers: string[];
  inconsistenciesFound: number;
  inconsistenciesRepaired: number;
  errors: SyncError[];
  startTime: Date;
  endTime: Date;
  duration: number;
}

export interface SyncMetrics {
  totalSyncOperations: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageSyncDuration: number;
  lastSyncTime?: Date;
  nextScheduledSync?: Date;
  syncIntervalMs: number;
  isHealthy: boolean;
  errorRate: number;
  recentErrors: SyncError[];
}

export interface RepairReport {
  userId?: string;
  repairedInconsistencies: number;
  failedRepairs: DataInconsistency[];
  actions: RepairAction[];
  success: boolean;
  timestamp: Date;
  duration: number;
}

export interface DataInconsistency {
  field: string;
  usersValue: any;
  userModuleAccessValue: any;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface RepairAction {
  type: 'sync_to_users' | 'sync_to_user_module_access' | 'create_missing_record';
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
  threshold: number;
  timeout: number;
}

export interface TimestampInfo {
  userId: string;
  userModuleAccessUpdatedAt?: Date;
  usersUpdatedAt?: Date;
  userModuleAccessCreatedAt?: Date;
  usersCreatedAt?: Date;
}

export interface RepairVerificationResult {
  success: boolean;
  reason?: string;
  currentState?: {
    usersValue: any;
    userModuleAccessValue: any;
    isConsistent: boolean;
  };
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
}

export interface ErrorClassification {
  isRetryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'database' | 'validation' | 'permission' | 'timeout' | 'unknown';
  suggestedAction: string;
  escalationRequired: boolean;
}

/**
 * SyncManager - Centralized synchronization management and monitoring
 * 
 * Handles:
 * - Periodic data consistency checks
 * - Automatic repair of detected inconsistencies  
 * - Real-time sync status monitoring
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern for extended failures
 */
export class SyncManager {
  private syncInterval?: NodeJS.Timeout;
  private syncMetrics: SyncMetrics;
  private circuitBreaker: CircuitBreakerState;

  private readonly circuitBreakerThreshold = 5;
  private readonly circuitBreakerTimeout = 60000; // 1 minute
  private syncInProgress = false;
  private errorCallbacks: ((error: SyncError) => void)[] = [];

  private retryConfig: RetryConfig;

  constructor(retryConfig?: Partial<RetryConfig>) {
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitterEnabled: true,
      ...retryConfig
    };

    this.syncMetrics = {
      totalSyncOperations: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncDuration: 0,
      syncIntervalMs: 0,
      isHealthy: true,
      errorRate: 0,
      recentErrors: []
    };

    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      threshold: this.circuitBreakerThreshold,
      timeout: this.circuitBreakerTimeout
    };

    this.logStructured('info', 'SyncManager initialized', {
      circuitBreakerThreshold: this.circuitBreakerThreshold,
      circuitBreakerTimeout: this.circuitBreakerTimeout,
      retryConfig: this.retryConfig
    });
  }

  /**
   * Starts periodic synchronization with specified interval
   */
  startPeriodicSync(intervalMs: number): void {
    if (this.syncInterval) {
      this.logStructured('warn', 'Periodic sync already running, stopping previous instance');
      this.stopPeriodicSync();
    }

    this.syncMetrics.syncIntervalMs = intervalMs;
    this.syncMetrics.nextScheduledSync = new Date(Date.now() + intervalMs);

    this.syncInterval = setInterval(async () => {
      try {
        await this.executeSyncCycle();
      } catch (error) {
        this.logStructured('error', 'Periodic sync cycle failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }, intervalMs);

    this.logStructured('info', 'Periodic sync started', {
      intervalMs,
      nextSync: this.syncMetrics.nextScheduledSync
    });
  }

  /**
   * Stops periodic synchronization
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
      this.syncMetrics.nextScheduledSync = undefined;
      
      this.logStructured('info', 'Periodic sync stopped');
    }
  }

  /**
   * Forces synchronization of all users immediately
   */
  async forceSyncAll(): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync operation already in progress');
    }

    if (this.circuitBreaker.isOpen) {
      if (this.shouldResetCircuitBreaker()) {
        this.resetCircuitBreaker();
      } else {
        throw new Error(`Circuit breaker is open. Next retry at ${this.circuitBreaker.nextRetryTime}`);
      }
    }

    return this.executeSyncCycle();
  }

  /**
   * Gets current sync metrics and status
   */
  getSyncMetrics(): SyncMetrics {
    return {
      ...this.syncMetrics,
      isHealthy: this.calculateHealthStatus(),
      errorRate: this.calculateErrorRate()
    };
  }

  /**
   * Registers callback for sync error notifications
   */
  onSyncError(callback: (error: SyncError) => void): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Removes sync error callback
   */
  offSyncError(callback: (error: SyncError) => void): void {
    const index = this.errorCallbacks.indexOf(callback);
    if (index > -1) {
      this.errorCallbacks.splice(index, 1);
    }
  }

  /**
   * Gets detailed health status with error analysis
   */
  getDetailedHealthStatus(): {
    isHealthy: boolean;
    status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    issues: string[];
    recommendations: string[];
    circuitBreakerStatus: CircuitBreakerState;
    errorAnalysis: {
      recentErrorCount: number;
      errorsByType: Record<string, number>;
      criticalErrors: number;
      retryableErrors: number;
    };
  } {
    const now = Date.now();
    const recentErrors = this.syncMetrics.recentErrors.filter(
      error => now - error.timestamp.getTime() < 300000 // Last 5 minutes
    );
    
    const errorsByType = recentErrors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const criticalErrors = recentErrors.filter(error => {
      const classification = (error as any).classification as ErrorClassification;
      return classification?.severity === 'critical';
    }).length;
    
    const retryableErrors = recentErrors.filter(error => error.canRetry).length;
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze circuit breaker status
    if (this.circuitBreaker.isOpen) {
      issues.push('Circuit breaker is open - sync operations are blocked');
      recommendations.push(`Wait until ${this.circuitBreaker.nextRetryTime} for automatic retry`);
    }
    
    // Analyze error rates
    const errorRate = this.calculateErrorRate();
    if (errorRate > 0.5) {
      issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
      recommendations.push('Investigate underlying causes of sync failures');
    }
    
    // Analyze recent errors
    if (recentErrors.length > 5) {
      issues.push(`High recent error count: ${recentErrors.length} in last 5 minutes`);
      recommendations.push('Check system resources and network connectivity');
    }
    
    if (criticalErrors > 0) {
      issues.push(`${criticalErrors} critical errors requiring immediate attention`);
      recommendations.push('Review critical errors and take corrective action');
    }
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    if (criticalErrors > 0 || this.circuitBreaker.isOpen) {
      status = 'critical';
    } else if (errorRate > 0.3 || recentErrors.length > 10) {
      status = 'unhealthy';
    } else if (errorRate > 0.1 || recentErrors.length > 3) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
    
    return {
      isHealthy: status === 'healthy',
      status,
      issues,
      recommendations,
      circuitBreakerStatus: { ...this.circuitBreaker },
      errorAnalysis: {
        recentErrorCount: recentErrors.length,
        errorsByType,
        criticalErrors,
        retryableErrors
      }
    };
  }

  /**
   * Performs a health check by attempting a lightweight sync operation
   */
  async performHealthCheck(): Promise<{
    success: boolean;
    duration: number;
    issues: string[];
    timestamp: Date;
  }> {
    const startTime = Date.now();
    const timestamp = new Date();
    const issues: string[] = [];
    
    try {
      this.logStructured('info', 'Starting health check');
      
      // Check if circuit breaker is open
      if (this.circuitBreaker.isOpen) {
        issues.push('Circuit breaker is open');
        return {
          success: false,
          duration: Date.now() - startTime,
          issues,
          timestamp
        };
      }
      
      // Try to get a small sample of users for validation
      const users = await this.getAllUsersForSync();
      if (users.length === 0) {
        issues.push('No users found for sync validation');
      }
      
      // Test database connectivity by validating one user (if available)
      if (users.length > 0) {
        const testUserId = users[0];
        await moduleAccessService.validateDataConsistency(testUserId);
      }
      
      const duration = Date.now() - startTime;
      
      this.logStructured('info', 'Health check completed successfully', {
        duration,
        userCount: users.length
      });
      
      return {
        success: true,
        duration,
        issues,
        timestamp
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      issues.push(`Health check failed: ${errorMessage}`);
      
      this.logStructured('error', 'Health check failed', {
        duration,
        error: errorMessage
      });
      
      return {
        success: false,
        duration,
        issues,
        timestamp
      };
    }
  }

  /**
   * Repairs data inconsistencies for multiple users in batch
   */
  async batchRepairDataInconsistencies(userIds: string[]): Promise<RepairReport[]> {
    const reports: RepairReport[] = [];
    
    this.logStructured('info', 'Starting batch repair operation', {
      userCount: userIds.length,
      userIds: userIds.slice(0, 5) // Log first 5 for debugging
    });

    for (const userId of userIds) {
      try {
        const report = await this.repairDataInconsistencies(userId);
        reports.push(report);
        
        // Add small delay between repairs to avoid overwhelming the database
        await this.delay(50);
      } catch (error) {
        this.logStructured('error', 'Batch repair failed for user', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Create a failed repair report
        reports.push({
          userId,
          repairedInconsistencies: 0,
          failedRepairs: [],
          actions: [],
          success: false,
          timestamp: new Date(),
          duration: 0
        });
      }
    }

    const successfulRepairs = reports.filter(r => r.success).length;
    const totalInconsistenciesRepaired = reports.reduce((sum, r) => sum + r.repairedInconsistencies, 0);
    
    this.logStructured('info', 'Batch repair operation completed', {
      totalUsers: userIds.length,
      successfulRepairs,
      failedRepairs: reports.length - successfulRepairs,
      totalInconsistenciesRepaired
    });

    return reports;
  }

  /**
   * Repairs data inconsistencies for a specific user or all users
   */
  async repairDataInconsistencies(userId?: string): Promise<RepairReport> {
    const startTime = new Date();
    const actions: RepairAction[] = [];
    let repairedInconsistencies = 0;
    const failedRepairs: DataInconsistency[] = [];

    try {
      this.logStructured('info', 'Starting data repair', { userId, scope: userId ? 'single_user' : 'all_users' });

      // First, validate to find inconsistencies
      const validationReport = await moduleAccessService.validateDataConsistency(userId);
      
      if (validationReport.isConsistent) {
        this.logStructured('info', 'No inconsistencies found, repair not needed', { userId });
        return {
          userId,
          repairedInconsistencies: 0,
          failedRepairs: [],
          actions: [],
          success: true,
          timestamp: startTime,
          duration: Date.now() - startTime.getTime()
        };
      }

      // Process each inconsistency
      for (const inconsistency of validationReport.inconsistencies) {
        try {
          const repairAction = await this.repairSingleInconsistency(inconsistency, userId);
          actions.push(repairAction);
          
          if (repairAction.success) {
            repairedInconsistencies++;
          } else {
            failedRepairs.push(inconsistency);
          }
        } catch (error) {
          this.logStructured('error', 'Failed to repair inconsistency', {
            inconsistency,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          failedRepairs.push(inconsistency);
          actions.push({
            type: 'sync_to_user_module_access', // Default type
            field: inconsistency.field,
            oldValue: inconsistency.usersValue,
            newValue: inconsistency.userModuleAccessValue,
            timestamp: new Date(),
            success: false,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const success = failedRepairs.length === 0;
      const duration = Date.now() - startTime.getTime();

      this.logStructured('info', 'Data repair completed', {
        userId,
        repairedInconsistencies,
        failedRepairs: failedRepairs.length,
        success,
        duration
      });

      return {
        userId,
        repairedInconsistencies,
        failedRepairs,
        actions,
        success,
        timestamp: startTime,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime.getTime();
      
      this.logStructured('error', 'Data repair failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      });

      return {
        userId,
        repairedInconsistencies,
        failedRepairs: [],
        actions,
        success: false,
        timestamp: startTime,
        duration
      };
    }
  }

  /**
   * Executes a complete sync cycle with error handling and metrics tracking
   */
  private async executeSyncCycle(): Promise<SyncResult> {
    const startTime = new Date();
    this.syncInProgress = true;
    
    const result: SyncResult = {
      totalUsers: 0,
      syncedUsers: 0,
      failedUsers: [],
      inconsistenciesFound: 0,
      inconsistenciesRepaired: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      duration: 0
    };

    try {
      this.logStructured('info', 'Starting sync cycle');

      // Get all users that need validation
      const users = await this.getAllUsersForSync();
      result.totalUsers = users.length;

      this.logStructured('info', 'Processing users for sync', { totalUsers: users.length });

      // Process each user with retry logic
      for (const userId of users) {
        try {
          const userResult = await this.syncUserWithRetry(userId);
          
          if (userResult.success) {
            result.syncedUsers++;
            result.inconsistenciesFound += userResult.inconsistenciesFound;
            result.inconsistenciesRepaired += userResult.inconsistenciesRepaired;
          } else {
            result.failedUsers.push(userId);
            if (userResult.error) {
              result.errors.push(userResult.error);
            }
          }
        } catch (error) {
          result.failedUsers.push(userId);
          const syncError = this.createSyncError(
            SyncErrorType.DATABASE_ERROR,
            `Failed to sync user ${userId}`,
            userId,
            error as Error
          );
          result.errors.push(syncError);
          this.notifyErrorCallbacks(syncError);
        }
      }

      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();

      // Update metrics
      this.updateSyncMetrics(result);

      // Update circuit breaker
      if (result.errors.length === 0) {
        this.resetCircuitBreaker();
      } else {
        this.recordCircuitBreakerFailure();
      }

      this.logStructured('info', 'Sync cycle completed', {
        totalUsers: result.totalUsers,
        syncedUsers: result.syncedUsers,
        failedUsers: result.failedUsers.length,
        inconsistenciesFound: result.inconsistenciesFound,
        inconsistenciesRepaired: result.inconsistenciesRepaired,
        duration: result.duration,
        errors: result.errors.length
      });

      return result;

    } catch (error) {
      result.endTime = new Date();
      result.duration = result.endTime.getTime() - startTime.getTime();
      
      const syncError = this.createSyncError(
        SyncErrorType.DATABASE_ERROR,
        'Sync cycle failed',
        undefined,
        error as Error
      );
      result.errors.push(syncError);
      
      this.updateSyncMetrics(result);
      this.recordCircuitBreakerFailure();
      this.notifyErrorCallbacks(syncError);

      this.logStructured('error', 'Sync cycle failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: result.duration
      });

      throw syncError;
    } finally {
      this.syncInProgress = false;
      this.syncMetrics.lastSyncTime = new Date();
      if (this.syncMetrics.syncIntervalMs > 0) {
        this.syncMetrics.nextScheduledSync = new Date(Date.now() + this.syncMetrics.syncIntervalMs);
      }
    }
  }

  /**
   * Syncs a single user with exponential backoff retry logic and comprehensive error handling
   */
  private async syncUserWithRetry(userId: string, retryCount: number = 0): Promise<{
    success: boolean;
    inconsistenciesFound: number;
    inconsistenciesRepaired: number;
    error?: SyncError;
  }> {
    try {
      // Validate user data consistency
      const validationReport = await moduleAccessService.validateDataConsistency(userId);
      
      if (validationReport.isConsistent) {
        return {
          success: true,
          inconsistenciesFound: 0,
          inconsistenciesRepaired: 0
        };
      }

      // Repair inconsistencies
      const repairReport = await this.repairDataInconsistencies(userId);
      
      return {
        success: repairReport.success,
        inconsistenciesFound: validationReport.inconsistencies.length,
        inconsistenciesRepaired: repairReport.repairedInconsistencies
      };

    } catch (error) {
      const errorClassification = this.classifyError(error as Error);
      
      // Check if error is retryable and we haven't exceeded max retries
      if (errorClassification.isRetryable && retryCount < this.retryConfig.maxRetries) {
        const delay = this.calculateAdvancedRetryDelay(retryCount, errorClassification);
        
        this.logStructured('warn', 'User sync failed, retrying with advanced backoff', {
          userId,
          retryCount: retryCount + 1,
          maxRetries: this.retryConfig.maxRetries,
          delay,
          errorClassification,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        await this.delay(delay);
        return this.syncUserWithRetry(userId, retryCount + 1);
      }

      // Create detailed sync error with classification
      const syncError = this.createEnhancedSyncError(
        errorClassification,
        `Failed to sync user ${userId} after ${retryCount} retries`,
        userId,
        error as Error,
        retryCount
      );

      // Check if escalation is required
      if (errorClassification.escalationRequired) {
        this.logStructured('error', 'Critical error requires escalation', {
          userId,
          errorClassification,
          syncError: syncError.message
        });
        // In a production environment, this would trigger alerts/notifications
      }

      return {
        success: false,
        inconsistenciesFound: 0,
        inconsistenciesRepaired: 0,
        error: syncError
      };
    }
  }

  /**
   * Repairs a single data inconsistency using timestamp-based conflict resolution
   */
  private async repairSingleInconsistency(inconsistency: DataInconsistency, userId?: string): Promise<RepairAction> {
    const timestamp = new Date();
    const targetUserId = userId || this.extractUserIdFromField(inconsistency.field);
    
    try {
      // Get timestamp information for conflict resolution
      const timestampInfo = await this.getTimestampInfo(targetUserId);
      
      // Determine repair strategy based on inconsistency type, severity, and timestamps
      const repairType = await this.determineRepairStrategyWithTimestamps(inconsistency, timestampInfo);
      
      this.logStructured('info', 'Repairing inconsistency with timestamp-based resolution', {
        userId: targetUserId,
        field: inconsistency.field,
        repairType,
        severity: inconsistency.severity,
        timestampInfo
      });

      const oldValue = repairType === 'sync_to_users' ? inconsistency.usersValue : inconsistency.userModuleAccessValue;
      const newValue = repairType === 'sync_to_users' ? inconsistency.userModuleAccessValue : inconsistency.usersValue;

      switch (repairType) {
        case 'sync_to_users':
          await this.syncToUsersTable(targetUserId, inconsistency.userModuleAccessValue);
          break;
          
        case 'sync_to_user_module_access':
          await this.syncToUserModuleAccessTable(targetUserId, inconsistency.usersValue);
          break;
          
        case 'create_missing_record':
          await this.createMissingRecord(targetUserId, inconsistency);
          break;
      }

      // Verify the repair was successful
      const verificationResult = await this.verifyRepair(targetUserId, inconsistency.field);
      
      if (!verificationResult.success) {
        throw new Error(`Repair verification failed: ${verificationResult.reason}`);
      }

      this.logStructured('info', 'Inconsistency repair completed successfully', {
        userId: targetUserId,
        field: inconsistency.field,
        repairType,
        oldValue,
        newValue
      });

      return {
        type: repairType,
        field: inconsistency.field,
        oldValue,
        newValue,
        timestamp,
        success: true
      };

    } catch (error) {
      this.logStructured('error', 'Failed to repair inconsistency', {
        userId: targetUserId,
        field: inconsistency.field,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        type: 'sync_to_user_module_access', // Default fallback
        field: inconsistency.field,
        oldValue: inconsistency.usersValue,
        newValue: inconsistency.userModuleAccessValue,
        timestamp,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }



  /**
   * Enhanced repair strategy determination with timestamp-based conflict resolution
   */
  private async determineRepairStrategyWithTimestamps(
    inconsistency: DataInconsistency, 
    timestampInfo: TimestampInfo
  ): Promise<RepairAction['type']> {
    // If data exists only in one source, sync to the other
    if (inconsistency.userModuleAccessValue && !inconsistency.usersValue) {
      return 'sync_to_users';
    }
    
    if (inconsistency.usersValue && !inconsistency.userModuleAccessValue) {
      return 'sync_to_user_module_access';
    }
    
    // For conflicts where both sources have data, use timestamp-based resolution
    if (timestampInfo.userModuleAccessUpdatedAt && timestampInfo.usersUpdatedAt) {
      const userModuleAccessTime = timestampInfo.userModuleAccessUpdatedAt.getTime();
      const usersTime = timestampInfo.usersUpdatedAt.getTime();
      
      // Use the more recently updated source as the source of truth
      if (userModuleAccessTime > usersTime) {
        this.logStructured('info', 'Using user_module_access as source (more recent)', {
          userModuleAccessTime: timestampInfo.userModuleAccessUpdatedAt,
          usersTime: timestampInfo.usersUpdatedAt,
          timeDifference: userModuleAccessTime - usersTime
        });
        return 'sync_to_users';
      } else if (usersTime > userModuleAccessTime) {
        this.logStructured('info', 'Using users table as source (more recent)', {
          userModuleAccessTime: timestampInfo.userModuleAccessUpdatedAt,
          usersTime: timestampInfo.usersUpdatedAt,
          timeDifference: usersTime - userModuleAccessTime
        });
        return 'sync_to_user_module_access';
      }
    }
    
    // If timestamps are equal or unavailable, prefer user_module_access as primary source
    this.logStructured('info', 'Using user_module_access as default source (primary source)', {
      reason: 'timestamps_equal_or_unavailable',
      timestampInfo
    });
    return 'sync_to_users';
  }

  /**
   * Helper methods for sync operations with enhanced error handling
   */
  private async syncToUsersTable(userId: string, permissions: ModuleAccess): Promise<void> {
    const { supabase } = await import('../api/supabaseClient');
    
    this.logStructured('debug', 'Syncing permissions to users table', {
      userId,
      permissions
    });
    
    const { data, error } = await supabase
      .from('users')
      .update({
        module_access: permissions,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, module_access');

    if (error) {
      this.logStructured('error', 'Failed to sync to users table', {
        userId,
        error: error.message,
        permissions
      });
      throw error;
    }

    if (!data || data.length === 0) {
      const errorMsg = `No user found with ID ${userId} for sync to users table`;
      this.logStructured('error', errorMsg, { userId });
      throw new Error(errorMsg);
    }

    this.logStructured('debug', 'Successfully synced to users table', {
      userId,
      updatedRecords: data.length
    });
  }

  private async syncToUserModuleAccessTable(userId: string, permissions: ModuleAccess): Promise<void> {
    this.logStructured('debug', 'Syncing permissions to user_module_access table', {
      userId,
      permissions
    });

    try {
      // Use the existing ModuleAccessService method which has built-in validation and error handling
      const result = await moduleAccessService.setUserModuleAccess(userId, permissions, 'sync-manager');
      
      this.logStructured('debug', 'Successfully synced to user_module_access table', {
        userId,
        recordId: result.id
      });
    } catch (error) {
      this.logStructured('error', 'Failed to sync to user_module_access table', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        permissions
      });
      throw error;
    }
  }

  private async createMissingRecord(userId: string, inconsistency: DataInconsistency): Promise<void> {
    this.logStructured('info', 'Creating missing record', {
      userId,
      field: inconsistency.field,
      hasUsersValue: !!inconsistency.usersValue,
      hasUserModuleAccessValue: !!inconsistency.userModuleAccessValue
    });

    try {
      // Create record in the table that's missing data
      if (!inconsistency.userModuleAccessValue && inconsistency.usersValue) {
        this.logStructured('debug', 'Creating missing user_module_access record from users data');
        await this.syncToUserModuleAccessTable(userId, inconsistency.usersValue);
      } else if (!inconsistency.usersValue && inconsistency.userModuleAccessValue) {
        this.logStructured('debug', 'Creating missing users.module_access data from user_module_access');
        await this.syncToUsersTable(userId, inconsistency.userModuleAccessValue);
      } else {
        const errorMsg = 'Cannot create missing record: both sources have data or both are missing';
        this.logStructured('error', errorMsg, {
          userId,
          inconsistency
        });
        throw new Error(errorMsg);
      }

      this.logStructured('info', 'Successfully created missing record', { userId });
    } catch (error) {
      this.logStructured('error', 'Failed to create missing record', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private extractUserIdFromField(field: string): string {
    // Extract user ID from field names like "userId.moduleKey"
    const parts = field.split('.');
    return parts[0];
  }

  /**
   * Gets timestamp information for conflict resolution
   */
  private async getTimestampInfo(userId: string): Promise<TimestampInfo> {
    const { supabase } = await import('../api/supabaseClient');
    
    try {
      const [usersResult, userModuleAccessResult] = await Promise.all([
        supabase
          .from('users')
          .select('updated_at, created_at')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('user_module_access')
          .select('updated_at, created_at')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      return {
        userId,
        usersUpdatedAt: usersResult.data?.updated_at ? new Date(usersResult.data.updated_at) : undefined,
        usersCreatedAt: usersResult.data?.created_at ? new Date(usersResult.data.created_at) : undefined,
        userModuleAccessUpdatedAt: userModuleAccessResult.data?.updated_at ? new Date(userModuleAccessResult.data.updated_at) : undefined,
        userModuleAccessCreatedAt: userModuleAccessResult.data?.created_at ? new Date(userModuleAccessResult.data.created_at) : undefined
      };
    } catch (error) {
      this.logStructured('warn', 'Failed to get timestamp info, using defaults', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return { userId };
    }
  }

  /**
   * Verifies that a repair operation was successful
   */
  private async verifyRepair(userId: string, field: string): Promise<RepairVerificationResult> {
    try {
      // Wait a brief moment for database consistency
      await this.delay(100);
      
      // Re-validate the specific user to check if inconsistency is resolved
      const validationReport = await moduleAccessService.validateDataConsistency(userId);
      
      if (validationReport.isConsistent) {
        return {
          success: true,
          currentState: {
            usersValue: null,
            userModuleAccessValue: null,
            isConsistent: true
          }
        };
      }

      // Check if the specific field inconsistency is resolved
      const fieldInconsistency = validationReport.inconsistencies.find(inc => 
        inc.field === field || inc.field.endsWith(`.${field}`)
      );

      if (!fieldInconsistency) {
        return {
          success: true,
          currentState: {
            usersValue: null,
            userModuleAccessValue: null,
            isConsistent: false // Other inconsistencies may exist
          }
        };
      }

      return {
        success: false,
        reason: `Field ${field} still has inconsistency: ${fieldInconsistency.description}`,
        currentState: {
          usersValue: fieldInconsistency.usersValue,
          userModuleAccessValue: fieldInconsistency.userModuleAccessValue,
          isConsistent: false
        }
      };

    } catch (error) {
      return {
        success: false,
        reason: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Gets all users that need synchronization validation
   */
  private async getAllUsersForSync(): Promise<string[]> {
    const { supabase } = await import('../api/supabaseClient');
    
    // Get all users with module access data from either source
    const [usersResult, userModuleAccessResult] = await Promise.all([
      supabase.from('users').select('id').not('module_access', 'is', null),
      supabase.from('user_module_access').select('user_id')
    ]);

    if (usersResult.error) throw usersResult.error;
    if (userModuleAccessResult.error) throw userModuleAccessResult.error;

    // Combine and deduplicate user IDs
    const userIds = new Set<string>();
    
    usersResult.data?.forEach(user => userIds.add(user.id));
    userModuleAccessResult.data?.forEach(record => userIds.add(record.user_id));

    return Array.from(userIds);
  }

  /**
   * Enhanced circuit breaker management with failure pattern analysis
   */
  private shouldResetCircuitBreaker(): boolean {
    if (!this.circuitBreaker.nextRetryTime) {
      return true;
    }
    
    const now = Date.now();
    const canRetry = now >= this.circuitBreaker.nextRetryTime.getTime();
    
    if (canRetry) {
      this.logStructured('info', 'Circuit breaker ready for retry attempt', {
        timeSinceLastFailure: this.circuitBreaker.lastFailureTime ? 
          now - this.circuitBreaker.lastFailureTime.getTime() : 'unknown',
        failureCount: this.circuitBreaker.failureCount
      });
    }
    
    return canRetry;
  }

  private resetCircuitBreaker(): void {
    const wasOpen = this.circuitBreaker.isOpen;
    const previousFailureCount = this.circuitBreaker.failureCount;
    
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailureTime = undefined;
    this.circuitBreaker.nextRetryTime = undefined;
    
    this.logStructured('info', 'Circuit breaker reset successfully', {
      wasOpen,
      previousFailureCount,
      resetTime: new Date()
    });
  }

  private recordCircuitBreakerFailure(error?: SyncError): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = new Date();

    // Analyze error pattern for circuit breaker decision
    const shouldOpenCircuit = this.shouldOpenCircuitBreaker(error);

    if (shouldOpenCircuit && this.circuitBreaker.failureCount >= this.circuitBreaker.threshold) {
      this.openCircuitBreaker(error);
    } else {
      this.logStructured('warn', 'Circuit breaker failure recorded', {
        failureCount: this.circuitBreaker.failureCount,
        threshold: this.circuitBreaker.threshold,
        errorType: error?.type,
        remainingAttempts: this.circuitBreaker.threshold - this.circuitBreaker.failureCount
      });
    }
  }

  /**
   * Determines if circuit breaker should open based on error patterns
   */
  private shouldOpenCircuitBreaker(error?: SyncError): boolean {
    if (!error) return true;
    
    // Don't open circuit for validation or permission errors (they won't resolve with time)
    if (error.type === SyncErrorType.VALIDATION_ERROR || error.type === SyncErrorType.PERMISSION_ERROR) {
      this.logStructured('debug', 'Not opening circuit breaker for non-transient error', {
        errorType: error.type
      });
      return false;
    }
    
    // Open circuit for network, database, and timeout errors
    return [SyncErrorType.NETWORK_ERROR, SyncErrorType.DATABASE_ERROR, SyncErrorType.TIMEOUT_ERROR].includes(error.type as SyncErrorType);
  }

  /**
   * Opens the circuit breaker with adaptive timeout
   */
  private openCircuitBreaker(error?: SyncError): void {
    this.circuitBreaker.isOpen = true;
    
    // Adaptive timeout based on error type and failure history
    let timeout = this.circuitBreaker.timeout;
    
    if (error?.type === SyncErrorType.NETWORK_ERROR) {
      timeout *= 2; // Network issues may take longer to resolve
    } else if (error?.type === SyncErrorType.TIMEOUT_ERROR) {
      timeout *= 1.5; // Timeout issues need moderate delays
    }
    
    // Increase timeout for repeated circuit breaker openings
    const recentOpenings = this.getRecentCircuitBreakerOpenings();
    if (recentOpenings > 0) {
      timeout *= Math.min(Math.pow(1.5, recentOpenings), 5); // Cap at 5x timeout
    }
    
    this.circuitBreaker.nextRetryTime = new Date(Date.now() + timeout);
    
    this.logStructured('warn', 'Circuit breaker opened with adaptive timeout', {
      failureCount: this.circuitBreaker.failureCount,
      threshold: this.circuitBreaker.threshold,
      nextRetryTime: this.circuitBreaker.nextRetryTime,
      timeout,
      errorType: error?.type,
      recentOpenings
    });
  }

  /**
   * Gets count of recent circuit breaker openings for adaptive timeout
   */
  private getRecentCircuitBreakerOpenings(): number {
    // This would typically be stored in persistent storage
    // For now, we'll use a simple heuristic based on recent errors
    const recentErrors = this.syncMetrics.recentErrors.filter(
      error => Date.now() - error.timestamp.getTime() < 3600000 // Last hour
    );
    
    return Math.floor(recentErrors.length / 5); // Rough estimate
  }

  /**
   * Utility methods for error handling and retry logic
   */

  /**
   * Advanced retry delay calculation based on error classification
   */
  private calculateAdvancedRetryDelay(retryCount: number, errorClassification: ErrorClassification): number {
    let baseDelay = this.retryConfig.baseDelay;
    
    // Adjust base delay based on error severity and category
    switch (errorClassification.severity) {
      case 'critical':
        baseDelay *= 3; // Longer delays for critical errors
        break;
      case 'high':
        baseDelay *= 2;
        break;
      case 'medium':
        baseDelay *= 1.5;
        break;
      // 'low' uses default base delay
    }

    // Category-specific adjustments
    switch (errorClassification.category) {
      case 'network':
        baseDelay *= 2; // Network issues may need more time to resolve
        break;
      case 'timeout':
        baseDelay *= 1.5; // Timeout issues need moderate delays
        break;
      case 'database':
        baseDelay *= 1.2; // Database issues usually resolve quickly
        break;
      // Other categories use adjusted base delay
    }

    // Calculate exponential backoff
    const exponentialDelay = baseDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount);
    const cappedDelay = Math.min(exponentialDelay, this.retryConfig.maxDelay);
    
    // Add jitter if enabled
    if (this.retryConfig.jitterEnabled) {
      const jitter = Math.random() * cappedDelay * 0.1; // 10% jitter
      return cappedDelay + jitter;
    }
    
    return cappedDelay;
  }

  /**
   * Classifies errors for appropriate handling and retry decisions
   */
  private classifyError(error: Error): ErrorClassification {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    
    // Network-related errors
    if (errorMessage.includes('network') || errorMessage.includes('connection') || 
        errorMessage.includes('timeout') || errorName.includes('network')) {
      return {
        isRetryable: true,
        severity: 'medium',
        category: 'network',
        suggestedAction: 'Retry with exponential backoff',
        escalationRequired: false
      };
    }
    
    // Database-related errors
    if (errorMessage.includes('database') || errorMessage.includes('sql') || 
        errorMessage.includes('constraint') || errorMessage.includes('duplicate')) {
      const isConstraintViolation = errorMessage.includes('constraint') || errorMessage.includes('duplicate');
      return {
        isRetryable: !isConstraintViolation, // Don't retry constraint violations
        severity: isConstraintViolation ? 'high' : 'medium',
        category: 'database',
        suggestedAction: isConstraintViolation ? 'Manual intervention required' : 'Retry with backoff',
        escalationRequired: isConstraintViolation
      };
    }
    
    // Validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid') || 
        errorMessage.includes('malformed')) {
      return {
        isRetryable: false, // Validation errors won't resolve with retries
        severity: 'high',
        category: 'validation',
        suggestedAction: 'Fix data validation issues',
        escalationRequired: true
      };
    }
    
    // Permission errors
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized') || 
        errorMessage.includes('forbidden') || errorMessage.includes('access denied')) {
      return {
        isRetryable: false, // Permission errors won't resolve with retries
        severity: 'high',
        category: 'permission',
        suggestedAction: 'Check user permissions and access rights',
        escalationRequired: true
      };
    }
    
    // Timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      return {
        isRetryable: true,
        severity: 'medium',
        category: 'timeout',
        suggestedAction: 'Retry with increased timeout',
        escalationRequired: false
      };
    }
    
    // Circuit breaker errors
    if (errorMessage.includes('circuit breaker') || errorMessage.includes('circuit') && errorMessage.includes('open')) {
      return {
        isRetryable: false, // Circuit breaker prevents retries
        severity: 'high',
        category: 'network',
        suggestedAction: 'Wait for circuit breaker to reset',
        escalationRequired: false
      };
    }
    
    // Unknown errors - be conservative
    return {
      isRetryable: true, // Allow limited retries for unknown errors
      severity: 'medium',
      category: 'unknown',
      suggestedAction: 'Investigate error cause',
      escalationRequired: false
    };
  }

  /**
   * Creates enhanced sync error with classification information
   */
  private createEnhancedSyncError(
    classification: ErrorClassification,
    message: string,
    userId?: string,
    originalError?: Error,
    retryCount: number = 0
  ): SyncError {
    const error = new Error(message) as SyncError;
    error.type = this.mapCategoryToSyncErrorType(classification.category);
    error.userId = userId;
    error.timestamp = new Date();
    error.retryCount = retryCount;
    error.canRetry = classification.isRetryable;
    error.originalError = originalError;
    
    // Add classification information to error
    (error as any).classification = classification;
    
    this.logStructured('error', `Enhanced SyncError: ${message}`, {
      errorType: error.type,
      userId,
      retryCount,
      canRetry: error.canRetry,
      classification,
      originalError: originalError?.message,
      stack: originalError?.stack
    });

    return error;
  }

  /**
   * Maps error category to SyncErrorType
   */
  private mapCategoryToSyncErrorType(category: ErrorClassification['category']): SyncErrorType {
    switch (category) {
      case 'network':
        return SyncErrorType.NETWORK_ERROR;
      case 'database':
        return SyncErrorType.DATABASE_ERROR;
      case 'validation':
        return SyncErrorType.VALIDATION_ERROR;
      case 'permission':
        return SyncErrorType.PERMISSION_ERROR;
      case 'timeout':
        return SyncErrorType.TIMEOUT_ERROR;
      default:
        return SyncErrorType.DATABASE_ERROR; // Default fallback
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateSyncMetrics(result: SyncResult): void {
    this.syncMetrics.totalSyncOperations++;
    
    if (result.errors.length === 0) {
      this.syncMetrics.successfulSyncs++;
    } else {
      this.syncMetrics.failedSyncs++;
    }

    // Update average duration
    const totalDuration = (this.syncMetrics.averageSyncDuration * (this.syncMetrics.totalSyncOperations - 1)) + result.duration;
    this.syncMetrics.averageSyncDuration = totalDuration / this.syncMetrics.totalSyncOperations;

    // Keep recent errors (last 10)
    this.syncMetrics.recentErrors.push(...result.errors);
    if (this.syncMetrics.recentErrors.length > 10) {
      this.syncMetrics.recentErrors = this.syncMetrics.recentErrors.slice(-10);
    }
  }

  private calculateHealthStatus(): boolean {
    const errorRate = this.calculateErrorRate();
    const hasRecentErrors = this.syncMetrics.recentErrors.some(
      error => Date.now() - error.timestamp.getTime() < 300000 // 5 minutes
    );
    
    return errorRate < 0.1 && !hasRecentErrors && !this.circuitBreaker.isOpen;
  }

  private calculateErrorRate(): number {
    if (this.syncMetrics.totalSyncOperations === 0) return 0;
    return this.syncMetrics.failedSyncs / this.syncMetrics.totalSyncOperations;
  }

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
    
    return error;
  }

  private notifyErrorCallbacks(error: SyncError): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        this.logStructured('error', 'Error callback failed', {
          error: callbackError instanceof Error ? callbackError.message : 'Unknown error'
        });
      }
    });
  }

  private logStructured(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    context: Record<string, any> = {}
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      service: 'SyncManager',
      message,
      ...context
    };

    switch (level) {
      case 'error':
        logger.error(`🔴 [${logEntry.level}] ${logEntry.message}`, 'SyncManager.ts', logEntry)
        break;
      case 'warn':
        logger.warn(`🟡 [${logEntry.level}] ${logEntry.message}`, 'SyncManager.ts', logEntry);
        break;
      case 'debug':
        logger.debug(`🔍 [${logEntry.level}] ${logEntry.message}`, 'SyncManager.ts', logEntry);
        break;
      default:
        logger.info(`ℹ️ [${logEntry.level}] ${logEntry.message}`, 'SyncManager.ts', logEntry);
    }
  }
}

// Export singleton instance
export const syncManager = new SyncManager();