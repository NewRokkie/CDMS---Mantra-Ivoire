# SyncManager - Module Access Synchronization

The SyncManager provides centralized synchronization management for module access permissions between `users.module_access` and `user_module_access.module_permissions`.

## Features

- **Bidirectional Synchronization**: Automatically keeps both data sources in sync
- **Automatic Data Repair**: Detects and fixes data inconsistencies using timestamp-based conflict resolution
- **Robust Error Handling**: Comprehensive error classification and retry logic with exponential backoff
- **Circuit Breaker Pattern**: Prevents cascading failures during extended outages
- **Health Monitoring**: Real-time sync status and health reporting
- **Batch Operations**: Efficient processing of multiple users

## Basic Usage

```typescript
import { syncManager } from '../services/sync';

// Start periodic synchronization (every 5 minutes)
syncManager.startPeriodicSync(5 * 60 * 1000);

// Force immediate synchronization of all users
const result = await syncManager.forceSyncAll();
console.log(`Synced ${result.syncedUsers}/${result.totalUsers} users`);

// Repair inconsistencies for a specific user
const repairReport = await syncManager.repairDataInconsistencies('user-id');
console.log(`Repaired ${repairReport.repairedInconsistencies} inconsistencies`);

// Get sync metrics and health status
const metrics = syncManager.getSyncMetrics();
const health = syncManager.getDetailedHealthStatus();

// Register error callback
syncManager.onSyncError((error) => {
  console.error('Sync error:', error.message);
  // Send to monitoring system, etc.
});
```

## Configuration

```typescript
import { SyncManager } from '../services/sync';

// Create with custom retry configuration
const customSyncManager = new SyncManager({
  maxRetries: 5,
  baseDelay: 2000,
  maxDelay: 60000,
  backoffMultiplier: 2.5,
  jitterEnabled: true
});
```

## Error Handling

The SyncManager classifies errors into categories and handles them appropriately:

- **Network Errors**: Retryable with exponential backoff
- **Database Errors**: Retryable unless constraint violations
- **Validation Errors**: Not retryable, require manual intervention
- **Permission Errors**: Not retryable, require access review
- **Timeout Errors**: Retryable with increased delays

## Circuit Breaker

The circuit breaker prevents overwhelming the system during failures:

- Opens after 5 consecutive failures
- Stays open for 1 minute (adaptive based on error type)
- Automatically resets after successful operations

## Health Monitoring

```typescript
// Perform health check
const healthCheck = await syncManager.performHealthCheck();

// Get detailed health status
const detailedHealth = syncManager.getDetailedHealthStatus();

if (detailedHealth.status === 'critical') {
  console.error('Sync system is in critical state:', detailedHealth.issues);
  // Take corrective action
}
```

## Integration with Module Access Service

The SyncManager works seamlessly with the existing ModuleAccessService:

```typescript
import { moduleAccessService, syncManager } from '../services/api';

// Normal module access operations trigger automatic sync
await moduleAccessService.setUserModuleAccess(userId, permissions, updatedBy);

// Manual validation and repair
const validation = await moduleAccessService.validateDataConsistency(userId);
if (!validation.isConsistent) {
  await syncManager.repairDataInconsistencies(userId);
}
```

## Best Practices

1. **Start Periodic Sync**: Always start periodic sync in your application initialization
2. **Monitor Health**: Regularly check sync health and respond to issues
3. **Handle Errors**: Register error callbacks for monitoring and alerting
4. **Batch Operations**: Use batch repair for multiple users to improve efficiency
5. **Graceful Shutdown**: Stop periodic sync during application shutdown

```typescript
// Application initialization
syncManager.startPeriodicSync(5 * 60 * 1000);

// Application shutdown
process.on('SIGTERM', () => {
  syncManager.stopPeriodicSync();
});
```