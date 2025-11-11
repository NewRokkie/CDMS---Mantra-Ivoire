# Migration Service Documentation

## Overview

The Migration Service provides comprehensive functionality for migrating from string-based location IDs to UUID-based database records. It includes data validation, integrity checking, and API compatibility layers for seamless transition.

## Architecture

The migration system consists of three main components:

1. **MigrationService**: Core migration logic and data transformation
2. **LocationCompatibilityService**: Low-level translation and caching layer
3. **LocationCompatibilityApi**: High-level API wrapper for legacy systems

```
┌─────────────────────────────────────────────────────────────┐
│                    Legacy Systems                            │
│              (Using string-based location IDs)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           LocationCompatibilityApi (API Layer)               │
│  • Drop-in replacement for legacy API calls                 │
│  • Automatic ID translation                                 │
│  • Migration status and reporting                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│      LocationCompatibilityService (Translation Layer)        │
│  • ID translation with caching                              │
│  • Backward compatibility validation                        │
│  • Performance optimization                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         LocationManagementService (Core Service)             │
│  • UUID-based location operations                           │
│  • Real-time availability tracking                          │
│  • Location assignment/release                              │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. MigrationService (`migrationService.ts`)

Handles the core migration logic from legacy string-based location IDs to UUID-based records.

**Key Features:**
- Batch migration processing with progress tracking
- Data validation before migration
- Mapping table creation between old and new IDs
- Rollback capabilities for failed migrations
- Comprehensive error handling and reporting

**Main Methods:**

```typescript
// Create a migration batch
await migrationService.createMigrationBatch(batchName, createdBy);

// Validate legacy data before migration
const validation = await migrationService.validateLegacyData(legacyData);

// Migrate legacy locations
const report = await migrationService.migrateLegacyLocations(
  legacyData,
  batchName,
  createdBy
);

// Get mapping for legacy ID
const mapping = await migrationService.getLegacyMapping(legacyId);

// Translate between old and new IDs
const newId = await migrationService.getNewLocationId(legacyId);
const oldId = await migrationService.getLegacyLocationId(newLocationId);

// Rollback a migration batch
await migrationService.rollbackMigrationBatch(batchId);

// Validate migration integrity
const integrity = await migrationService.validateMigrationIntegrity(batchId);
```

**Data Structures:**

```typescript
interface LegacyLocationData {
  legacyId: string;
  stackId: string;
  yardId: string;
  rowNumber?: number;
  tierNumber?: number;
  isOccupied?: boolean;
  containerId?: string;
  containerSize?: '20ft' | '40ft';
  clientPoolId?: string;
}

interface MigrationReport {
  batchId: string;
  batchName: string;
  status: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  skippedRecords: number;
  duration: number;
  errors: MigrationError[];
  warnings: string[];
  startedAt: Date;
  completedAt?: Date;
}
```

### 2. LocationCompatibilityService (`locationCompatibilityService.ts`)

Low-level translation and caching layer for ID conversion between legacy and UUID systems.

**Key Features:**
- Transparent translation between legacy and UUID-based IDs
- In-memory caching for performance
- Backward compatibility validation
- Migration progress tracking
- Statistics and reporting

**Main Methods:**

```typescript
// Get location by ID (supports both legacy and UUID)
const result = await locationCompatibilityService.getLocationById(id);

// Search locations with legacy ID support
const results = await locationCompatibilityService.searchLocations(query);

// Translate IDs
const uuid = await locationCompatibilityService.translateLegacyToUuid(legacyId);
const legacyId = await locationCompatibilityService.translateUuidToLegacy(uuid);

// Batch translation
const translations = await locationCompatibilityService.batchTranslateLegacyToUuid(legacyIds);

// Check migration status
const isMigrated = await locationCompatibilityService.isLocationMigrated(legacyId);

// Get migration progress
const progress = await locationCompatibilityService.getMigrationProgress();

// Cache management
await locationCompatibilityService.warmupCache(1000);
locationCompatibilityService.clearCache();

// Get statistics
const stats = locationCompatibilityService.getCompatibilityStats();
const cacheStats = locationCompatibilityService.getCacheStats();

// Validate backward compatibility
const validation = await locationCompatibilityService.validateBackwardCompatibility();
```

**Response Format:**

```typescript
interface LegacyLocationResponse {
  legacyId: string;
  location: Location;
  isMigrated: boolean;
}
```

### 3. LocationCompatibilityApi (`locationCompatibilityApi.ts`)

High-level API wrapper providing drop-in replacement functions for legacy systems.

**Key Features:**
- Drop-in replacement for legacy API calls
- Automatic ID translation (transparent to caller)
- Migration status and progress reporting
- Backward compatibility validation
- Performance monitoring and statistics

**Main Methods:**

```typescript
// Get location (supports both legacy and UUID)
const result = await locationCompatibilityApi.getLocation('S01R2H3');
const result2 = await locationCompatibilityApi.getLocation('uuid-string');

// Get multiple locations with filtering
const locations = await locationCompatibilityApi.getLocations({
  yardId: 'yard-uuid',
  isOccupied: false,
  containerSize: '20ft'
});

// Get available locations
const available = await locationCompatibilityApi.getAvailableLocations({
  yardId: 'yard-uuid',
  containerSize: '40ft',
  limit: 10
});

// Assign container (legacy ID supported)
const assigned = await locationCompatibilityApi.assignContainer({
  locationId: 'S01R2H3', // Can be legacy or UUID
  containerId: 'container-uuid',
  containerSize: '20ft',
  clientPoolId: 'pool-uuid'
});

// Release location (legacy ID supported)
const released = await locationCompatibilityApi.releaseLocation({
  locationId: 'S01R2H3', // Can be legacy or UUID
  containerId: 'container-uuid'
});

// Check availability (legacy ID supported)
const isAvailable = await locationCompatibilityApi.isLocationAvailable(
  'S01R2H3',
  '20ft',
  'pool-uuid'
);

// Get migration status
const status = await locationCompatibilityApi.getMigrationStatus();
console.log(`Migration: ${status.progress.migrationPercentage}% complete`);
console.log(`Active batches: ${status.batches.activeBatches}`);
console.log(`Translation success rate: ${status.compatibility.translationSuccessRate}%`);

// Get detailed migration report
const report = await locationCompatibilityApi.getMigrationReport();
const batchReport = await locationCompatibilityApi.getMigrationReport('batch-uuid');

// Validate backward compatibility
const validation = await locationCompatibilityApi.validateCompatibility();
console.log(`Compatible: ${validation.isCompatible}`);
console.log(`Success rate: ${validation.details.successRate}%`);

// Cache management
await locationCompatibilityApi.warmupCache(1000);
locationCompatibilityApi.clearCache();
locationCompatibilityApi.resetStats();

// Get statistics
const stats = locationCompatibilityApi.getStats();
console.log('Compatibility stats:', stats.compatibility);
console.log('Cache stats:', stats.cache);
```

**Response Format:**

```typescript
interface LegacyLocationResponse {
  legacyId: string;        // Original legacy ID or location_id
  location: Location;      // Full location object with UUID
  isMigrated: boolean;     // Whether this was migrated from legacy system
}

interface MigrationStatusResponse {
  migrationActive: boolean;
  progress: {
    totalLocations: number;
    migratedLocations: number;
    unmigratedLocations: number;
    migrationPercentage: number;
  };
  batches: {
    activeBatches: number;
    completedBatches: number;
    failedBatches: number;
  };
  compatibility: {
    totalRequests: number;
    legacyRequests: number;
    uuidRequests: number;
    translationSuccessRate: number;
    cacheHitRate: number;
  };
  lastUpdated: Date;
}
```

## Migration Workflow

### Step 1: Prepare Legacy Data

```typescript
const legacyData: LegacyLocationData[] = [
  {
    legacyId: 'S01R2H3',
    stackId: 'uuid-of-stack',
    yardId: 'uuid-of-yard',
    rowNumber: 2,
    tierNumber: 3,
    isOccupied: false
  },
  // ... more records
];
```

### Step 2: Validate Data

```typescript
const validation = await migrationService.validateLegacyData(legacyData);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
  console.warn('Validation warnings:', validation.warnings);
  return;
}
```

### Step 3: Run Migration

```typescript
const report = await migrationService.migrateLegacyLocations(
  legacyData,
  'Initial Migration Batch',
  'admin-user-id'
);

console.log(`Migration completed:`);
console.log(`- Total: ${report.totalRecords}`);
console.log(`- Successful: ${report.successfulRecords}`);
console.log(`- Failed: ${report.failedRecords}`);
console.log(`- Skipped: ${report.skippedRecords}`);
console.log(`- Duration: ${report.duration}ms`);

if (report.errors.length > 0) {
  console.error('Migration errors:', report.errors);
}
```

### Step 4: Validate Migration

```typescript
const integrity = await migrationService.validateMigrationIntegrity(report.batchId);

if (!integrity.isValid) {
  console.error('Integrity check failed:', integrity.errors);
  
  // Optionally rollback
  await migrationService.rollbackMigrationBatch(report.batchId);
}
```

### Step 5: Enable Compatibility Layer

```typescript
// Warm up the cache for better performance
await locationCompatibilityService.warmupCache(1000);

// Now legacy systems can use the compatibility layer
const location = await locationCompatibilityService.getLocationById('S01R2H3');
console.log('Location:', location.location);
console.log('Is migrated:', location.isMigrated);
```

## Legacy ID Format Support

The migration service supports multiple legacy location ID formats:

1. **SXXRXHX Format** (Standard): `S01R2H3`
   - S = Stack prefix
   - XX = Zero-padded stack number (01-99)
   - R = Row prefix
   - X = Row number (1-9)
   - H = Height/Tier prefix
   - X = Tier number (1-9)

2. **Dash-separated Format**: `Stack-01-R2-H3` or `S01-R2-H3`

3. **Custom Formats**: If row and tier numbers are provided separately, the service will attempt to extract the stack number from the legacy ID.

## Database Tables

### location_id_mappings

Stores the mapping between legacy string IDs and new UUID-based location records.

```sql
CREATE TABLE location_id_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_string_id VARCHAR(50) NOT NULL UNIQUE,
    new_location_id UUID NOT NULL REFERENCES locations(id),
    migration_batch_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### migration_batches

Tracks migration batch execution and status.

```sql
CREATE TABLE migration_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Performance Considerations

### Caching Strategy

The compatibility service uses in-memory caching to minimize database lookups:

- **Forward Cache**: Legacy ID → UUID
- **Reverse Cache**: UUID → Legacy ID
- **Cache Warmup**: Pre-load frequently accessed mappings
- **Cache Statistics**: Monitor hit rates and performance

### Batch Processing

For large migrations:

1. Process in batches of 100-1000 records
2. Use sequential processing to maintain data integrity
3. Monitor progress with batch status updates
4. Handle errors gracefully without stopping the entire migration

### Query Optimization

- Indexed lookups on `legacy_string_id` and `new_location_id`
- Efficient batch translation methods
- Minimal database round-trips with caching

## Error Handling

### Validation Errors

- Missing required fields
- Invalid location ID formats
- Duplicate legacy IDs
- Invalid row/tier numbers
- Container size mismatches

### Migration Errors

- Location already exists
- Stack not found
- Unparseable legacy ID format
- Database constraint violations

### Recovery Mechanisms

- Rollback capability for failed batches
- Integrity validation after migration
- Detailed error reporting with timestamps
- Skip already-migrated records

## Monitoring and Reporting

### Migration Progress

```typescript
const progress = await locationCompatibilityService.getMigrationProgress();
console.log(`Migration: ${progress.migrationPercentage}% complete`);
console.log(`Migrated: ${progress.migratedLocations}/${progress.totalLocations}`);
console.log(`Active batches: ${progress.activeBatches}`);
console.log(`Completed batches: ${progress.completedBatches}`);
console.log(`Failed batches: ${progress.failedBatches}`);
```

### Compatibility Statistics

```typescript
const stats = locationCompatibilityService.getCompatibilityStats();
console.log(`Total requests: ${stats.totalRequests}`);
console.log(`Legacy requests: ${stats.legacyRequests}`);
console.log(`UUID requests: ${stats.uuidRequests}`);
console.log(`Translation success rate: ${
  (stats.translationSuccesses / (stats.translationSuccesses + stats.translationFailures)) * 100
}%`);
```

### Cache Performance

```typescript
const cacheStats = locationCompatibilityService.getCacheStats();
console.log(`Cache size: ${cacheStats.forwardCacheSize} forward, ${cacheStats.reverseCacheSize} reverse`);
console.log(`Cache hit rate: ${cacheStats.cacheHitRate}%`);
```

## Best Practices

1. **Always validate data before migration**
   - Run validation checks first
   - Fix errors before proceeding
   - Review warnings carefully

2. **Use batch processing for large datasets**
   - Break into manageable chunks
   - Monitor progress regularly
   - Handle errors gracefully

3. **Validate integrity after migration**
   - Run integrity checks
   - Verify mapping completeness
   - Test backward compatibility

4. **Warm up cache for production**
   - Pre-load common mappings
   - Monitor cache hit rates
   - Adjust cache size as needed

5. **Monitor migration progress**
   - Track batch status
   - Review error reports
   - Validate completion

6. **Plan for rollback**
   - Test rollback procedures
   - Keep backup of legacy data
   - Document rollback steps

## Requirements Addressed

- **8.1**: Create mapping tables between old string IDs and new UUID-based records ✅
- **8.2**: Provide API compatibility layers during the transition period ✅
- **8.3**: Translate legacy string-based ID queries to UUID-based queries ✅
- **8.4**: Validate that all existing container assignments are properly migrated ✅
- **8.5**: Provide detailed migration reports and error handling ✅

## Integration with Existing Services

The migration services integrate seamlessly with:

- **LocationManagementService**: For creating and updating location records
- **LocationIdGeneratorService**: For generating new location IDs
- **ContainerService**: For validating container assignments
- **AuditService**: For tracking migration operations

## Using the API Compatibility Layer

### For Legacy Systems

Legacy systems can use the `LocationCompatibilityApi` as a drop-in replacement for existing location API calls:

```typescript
import { locationCompatibilityApi } from './services/api';

// Example: Legacy system assigning a container
async function assignContainerLegacy(legacyLocationId: string, containerId: string) {
  try {
    // This works with both legacy IDs (e.g., "S01R2H3") and UUIDs
    const result = await locationCompatibilityApi.assignContainer({
      locationId: legacyLocationId,
      containerId: containerId,
      containerSize: '20ft'
    });

    console.log(`Container assigned to location: ${result.legacyId}`);
    console.log(`Is migrated: ${result.isMigrated}`);
    
    return result.location;
  } catch (error) {
    console.error('Assignment failed:', error);
    throw error;
  }
}

// Example: Legacy system querying locations
async function findAvailableLocationsLegacy(yardId: string) {
  const locations = await locationCompatibilityApi.getAvailableLocations({
    yardId: yardId,
    containerSize: '20ft',
    limit: 10
  });

  // Each location includes both legacy ID and full location data
  locations.forEach(loc => {
    console.log(`Legacy ID: ${loc.legacyId}`);
    console.log(`Location ID: ${loc.location.locationId}`);
    console.log(`Is migrated: ${loc.isMigrated}`);
  });

  return locations;
}
```

### For New Systems

New systems should use the UUID-based `LocationManagementService` directly:

```typescript
import { locationManagementService } from './services/api';

// Example: New system assigning a container
async function assignContainerNew(locationUuid: string, containerId: string) {
  const location = await locationManagementService.assignContainer({
    locationId: locationUuid,
    containerId: containerId,
    containerSize: '20ft'
  });

  return location;
}
```

### Migration Monitoring Dashboard

Use the compatibility API to build a migration monitoring dashboard:

```typescript
import { locationCompatibilityApi } from './services/api';

async function getMigrationDashboardData() {
  // Get overall migration status
  const status = await locationCompatibilityApi.getMigrationStatus();

  // Get detailed report
  const report = await locationCompatibilityApi.getMigrationReport();

  // Validate compatibility
  const validation = await locationCompatibilityApi.validateCompatibility();

  // Get performance stats
  const stats = locationCompatibilityApi.getStats();

  return {
    status,
    report,
    validation,
    stats,
    recommendations: generateRecommendations(status, validation, stats)
  };
}

function generateRecommendations(status: any, validation: any, stats: any) {
  const recommendations = [];

  // Check migration progress
  if (status.progress.migrationPercentage < 50) {
    recommendations.push({
      type: 'warning',
      message: 'Migration is less than 50% complete. Consider accelerating migration efforts.'
    });
  }

  // Check translation success rate
  if (status.compatibility.translationSuccessRate < 95) {
    recommendations.push({
      type: 'error',
      message: `Translation success rate is ${status.compatibility.translationSuccessRate}%. Investigate failed translations.`
    });
  }

  // Check cache hit rate
  if (stats.cache.cacheHitRate < 80) {
    recommendations.push({
      type: 'info',
      message: `Cache hit rate is ${stats.cache.cacheHitRate}%. Consider warming up cache with more mappings.`
    });
  }

  // Check compatibility validation
  if (!validation.isCompatible) {
    recommendations.push({
      type: 'error',
      message: `Backward compatibility validation failed. ${validation.errors.length} errors found.`
    });
  }

  // Check for failed batches
  if (status.batches.failedBatches > 0) {
    recommendations.push({
      type: 'warning',
      message: `${status.batches.failedBatches} migration batches have failed. Review and retry.`
    });
  }

  return recommendations;
}
```

### Gradual Migration Strategy

Implement a gradual migration strategy using feature flags:

```typescript
import { locationCompatibilityApi, locationManagementService } from './services/api';

// Feature flag to control which API to use
const USE_NEW_LOCATION_API = process.env.USE_NEW_LOCATION_API === 'true';

async function getLocation(locationId: string) {
  if (USE_NEW_LOCATION_API) {
    // New system: Use UUID-based API
    return await locationManagementService.getById(locationId);
  } else {
    // Legacy system: Use compatibility API
    const result = await locationCompatibilityApi.getLocation(locationId);
    return result?.location;
  }
}

async function assignContainer(locationId: string, containerId: string, containerSize: string) {
  if (USE_NEW_LOCATION_API) {
    // New system
    return await locationManagementService.assignContainer({
      locationId,
      containerId,
      containerSize: containerSize as any
    });
  } else {
    // Legacy system
    const result = await locationCompatibilityApi.assignContainer({
      locationId,
      containerId,
      containerSize: containerSize as any
    });
    return result.location;
  }
}
```

### Performance Optimization

Optimize performance during the transition period:

```typescript
import { locationCompatibilityApi } from './services/api';

// 1. Warm up cache on application startup
async function initializeApp() {
  console.log('Warming up translation cache...');
  const result = await locationCompatibilityApi.warmupCache(5000);
  console.log(`Cache warmed up with ${result.cachedMappings} mappings`);
  console.log(`Cache hit rate: ${result.cacheStats.cacheHitRate}%`);
}

// 2. Periodically refresh cache for hot data
setInterval(async () => {
  const stats = locationCompatibilityApi.getStats();
  
  // If cache hit rate is low, refresh cache
  if (stats.cache.cacheHitRate < 70) {
    console.log('Cache hit rate low, refreshing...');
    await locationCompatibilityApi.warmupCache(1000);
  }
}, 3600000); // Every hour

// 3. Monitor and log compatibility statistics
setInterval(() => {
  const stats = locationCompatibilityApi.getStats();
  console.log('Compatibility Stats:', {
    totalRequests: stats.compatibility.totalRequests,
    legacyRequests: stats.compatibility.legacyRequests,
    translationSuccessRate: stats.compatibility.translationSuccessRate,
    cacheHitRate: stats.cache.cacheHitRate
  });
}, 300000); // Every 5 minutes
```

## Example Usage

See the examples in the workflow section above for complete usage patterns.

## Support

For issues or questions about the migration service:

1. Check validation errors and warnings
2. Review migration batch reports
3. Validate data integrity
4. Check compatibility statistics
5. Review error logs and technical details
