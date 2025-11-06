// Export all sync-related services and types
export { SyncManager, syncManager } from './SyncManager';
export type {
  SyncResult,
  SyncMetrics,
  RepairReport,
  DataInconsistency,
  RepairAction,
  CircuitBreakerState,
  TimestampInfo,
  RepairVerificationResult,
  RetryConfig,
  ErrorClassification
} from './SyncManager';