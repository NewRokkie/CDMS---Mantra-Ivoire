export * from './supabaseClient';
export * from './containerService';
export * from './gateService';
export * from './bookingReferenceService';
export * from './clientService';
export * from './userService';
export * from './auditService';
export * from './reportService';
export * from './clientPoolService';
// Explicitly export module access service and its types with clear names to avoid conflicts
export {
  moduleAccessService,
  type ValidationReport,
  type DataInconsistency as ModuleAccessDataInconsistency,
  type SyncMetrics as ModuleAccessSyncMetrics,
  type SyncError,
  type UserValidationResult,
  type StructuralValidationResult,
  type ReferentialValidationResult,
  type AuditLogEntry,
  type PerformanceMetrics,
} from './moduleAccessService';
export * from './stackService';
export * from './stackPairingService';
export * from './stackSoftDeleteService';
export * from './locationManagementService';
export * from './locationIdGeneratorService';
export * from './virtualLocationCalculatorService';
export * from './automaticVirtualStackService';
export * from './migrationService';
export * from './locationCompatibilityService';
export * from './locationCompatibilityApi';
export * from './redisClient';
export * from './locationCacheService';
export * from './performanceMonitoringService';
export * from './databaseOptimization';
export * from './performanceBenchmark';
// Explicitly re-export sync manager and types, aliasing conflicting names
export { SyncManager, syncManager } from '../sync';
export type {
  SyncResult,
  SyncMetrics as GlobalSyncMetrics,
  RepairReport,
  DataInconsistency as GlobalDataInconsistency,
  RepairAction,
  CircuitBreakerState,
  TimestampInfo,
  RepairVerificationResult,
  RetryConfig,
  ErrorClassification,
} from '../sync';
export * from './realtimeService';
export * from './yardsService';
export * from '../bufferZoneService';
