/**
 * Location Compatibility API
 * 
 * Provides drop-in replacement API functions for legacy systems using string-based location IDs.
 * This layer automatically translates between legacy and UUID-based systems.
 * 
 * Requirements Addressed:
 * - 8.2: API compatibility layers during transition period
 * - 8.3: Translation layer for legacy systems
 * - 8.5: Migration progress tracking and reporting
 */

import { locationCompatibilityService, LegacyLocationResponse } from './locationCompatibilityService';
import { locationManagementService } from './locationManagementService';
import { migrationService } from './migrationService';
import {
  LocationQuery,
  LocationAvailabilityQuery,
  LocationAssignmentRequest,
  LocationReleaseRequest,
  ContainerSizeEnum
} from '../../types/location';
import { ErrorHandler, GateInError, handleError } from '../errorHandling';
import { logger } from '../../utils/logger';

/**
 * Legacy API request/response types
 */
export interface LegacyLocationAssignmentRequest {
  locationId: string; // Can be legacy string ID or UUID
  containerId: string;
  containerSize: ContainerSizeEnum;
  clientPoolId?: string;
}

export interface LegacyLocationReleaseRequest {
  locationId: string; // Can be legacy string ID or UUID
  containerId?: string;
}

export interface LegacyLocationQueryRequest {
  locationId?: string; // Can be legacy string ID or UUID
  yardId?: string;
  stackId?: string;
  isOccupied?: boolean;
  containerSize?: ContainerSizeEnum;
  clientPoolId?: string;
  limit?: number;
  offset?: number;
}

export interface MigrationStatusResponse {
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

/**
 * Location Compatibility API Class
 * Provides backward-compatible API methods for legacy systems
 */
export class LocationCompatibilityApi {
  /**
   * Get location by ID (legacy-compatible)
   * Automatically detects and translates legacy IDs
   * 
   * Requirements: 8.2, 8.3 - API compatibility with automatic translation
   */
  async getLocation(locationId: string): Promise<LegacyLocationResponse | null> {
    try {
      return await locationCompatibilityService.getLocationById(locationId);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get multiple locations (legacy-compatible)
   * Supports both legacy and UUID-based queries
   * 
   * Requirements: 8.2 - Backward compatibility for list operations
   */
  async getLocations(query?: LegacyLocationQueryRequest): Promise<LegacyLocationResponse[]> {
    try {
      if (!query) {
        return await locationCompatibilityService.getAllLocations();
      }

      // Convert legacy query to standard LocationQuery
      const standardQuery: LocationQuery & { legacyId?: string } = {
        yardId: query.yardId,
        stackId: query.stackId,
        isOccupied: query.isOccupied,
        containerSize: query.containerSize,
        clientPoolId: query.clientPoolId,
        limit: query.limit,
        offset: query.offset
      };

      // If locationId is provided, check if it's legacy or UUID
      if (query.locationId) {
        const isUuid = this.isUuidFormat(query.locationId);
        if (isUuid) {
          // Direct UUID lookup
          const location = await locationManagementService.getById(query.locationId);
          if (!location) return [];
          
          const legacyId = await locationCompatibilityService.translateUuidToLegacy(query.locationId);
          return [{
            legacyId: legacyId || location.locationId,
            location,
            isMigrated: !!legacyId
          }];
        } else {
          // Legacy ID - use compatibility service
          standardQuery.legacyId = query.locationId;
        }
      }

      return await locationCompatibilityService.searchLocations(standardQuery);
    } catch (error) {
      logger.error('LocationCompatibilityApi.getLocations error:', 'locationCompatibilityApi.ts', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get available locations (legacy-compatible)
   * 
   * Requirements: 8.2 - Backward compatibility for availability queries
   */
  async getAvailableLocations(query: LocationAvailabilityQuery): Promise<LegacyLocationResponse[]> {
    try {
      const locations = await locationManagementService.getAvailableLocations(query);

      // Enrich with legacy IDs
      const results: LegacyLocationResponse[] = [];
      for (const location of locations) {
        const legacyId = await locationCompatibilityService.translateUuidToLegacy(location.id);
        results.push({
          legacyId: legacyId || location.locationId,
          location,
          isMigrated: !!legacyId
        });
      }

      return results;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Assign container to location (legacy-compatible)
   * Automatically translates legacy location IDs
   * 
   * Requirements: 8.2, 8.3 - API compatibility with translation
   */
  async assignContainer(request: LegacyLocationAssignmentRequest): Promise<LegacyLocationResponse> {
    try {
      // Translate location ID if it's a legacy ID
      let locationUuid = request.locationId;
      let isLegacyId = false;

      if (!this.isUuidFormat(request.locationId)) {
        // Try to translate legacy ID
        const translated = await locationCompatibilityService.translateLegacyToUuid(request.locationId);
        
        if (translated) {
          locationUuid = translated;
          isLegacyId = true;
        } else {
          // Try to find by location_id (SXXRXHX format)
          const location = await locationManagementService.getByLocationId(request.locationId);
          if (!location) {
            throw new GateInError({
              code: 'LOCATION_NOT_FOUND',
              message: `Location not found: ${request.locationId}`,
              severity: 'error',
              retryable: false,
              userMessage: `Cannot find location with ID: ${request.locationId}`
            });
          }
          locationUuid = location.id;
        }
      }

      // Perform assignment using UUID
      const assignmentRequest: LocationAssignmentRequest = {
        locationId: locationUuid,
        containerId: request.containerId,
        containerSize: request.containerSize,
        clientPoolId: request.clientPoolId
      };

      const location = await locationManagementService.assignContainer(assignmentRequest);

      return {
        legacyId: isLegacyId ? request.locationId : location.locationId,
        location,
        isMigrated: isLegacyId
      };
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Release location (legacy-compatible)
   * Automatically translates legacy location IDs
   * 
   * Requirements: 8.2, 8.3 - API compatibility with translation
   */
  async releaseLocation(request: LegacyLocationReleaseRequest): Promise<LegacyLocationResponse> {
    try {
      // Translate location ID if it's a legacy ID
      let locationUuid = request.locationId;
      let isLegacyId = false;

      if (!this.isUuidFormat(request.locationId)) {
        // Try to translate legacy ID
        const translated = await locationCompatibilityService.translateLegacyToUuid(request.locationId);
        
        if (translated) {
          locationUuid = translated;
          isLegacyId = true;
        } else {
          // Try to find by location_id (SXXRXHX format)
          const location = await locationManagementService.getByLocationId(request.locationId);
          if (!location) {
            throw new GateInError({
              code: 'LOCATION_NOT_FOUND',
              message: `Location not found: ${request.locationId}`,
              severity: 'error',
              retryable: false,
              userMessage: `Cannot find location with ID: ${request.locationId}`
            });
          }
          locationUuid = location.id;
        }
      }

      // Perform release using UUID
      const releaseRequest: LocationReleaseRequest = {
        locationId: locationUuid,
        containerId: request.containerId
      };

      const location = await locationManagementService.releaseLocation(releaseRequest);

      return {
        legacyId: isLegacyId ? request.locationId : location.locationId,
        location,
        isMigrated: isLegacyId
      };
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Check if location is available (legacy-compatible)
   * 
   * Requirements: 8.2 - Backward compatibility for availability checks
   */
  async isLocationAvailable(
    locationId: string,
    containerSize?: ContainerSizeEnum,
    clientPoolId?: string
  ): Promise<boolean> {
    try {
      // Translate location ID if needed
      let locationUuid = locationId;

      if (!this.isUuidFormat(locationId)) {
        const translated = await locationCompatibilityService.translateLegacyToUuid(locationId);
        if (translated) {
          locationUuid = translated;
        } else {
          // Try to find by location_id
          const location = await locationManagementService.getByLocationId(locationId);
          if (!location) return false;
          locationUuid = location.id;
        }
      }

      return await locationManagementService.isLocationAvailable(
        locationUuid,
        containerSize,
        clientPoolId
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get migration status and progress
   * 
   * Requirements: 8.5 - Migration progress tracking and reporting
   */
  async getMigrationStatus(): Promise<MigrationStatusResponse> {
    try {
      // Get migration progress
      const progress = await locationCompatibilityService.getMigrationProgress();

      // Get compatibility stats
      const compatStats = locationCompatibilityService.getCompatibilityStats();
      const cacheStats = locationCompatibilityService.getCacheStats();

      // Calculate translation success rate
      const totalTranslations = compatStats.translationSuccesses + compatStats.translationFailures;
      const translationSuccessRate = totalTranslations > 0
        ? (compatStats.translationSuccesses / totalTranslations) * 100
        : 100;

      return {
        migrationActive: progress.activeBatches > 0,
        progress: {
          totalLocations: progress.totalLocations,
          migratedLocations: progress.migratedLocations,
          unmigratedLocations: progress.unmigratedLocations,
          migrationPercentage: progress.migrationPercentage
        },
        batches: {
          activeBatches: progress.activeBatches,
          completedBatches: progress.completedBatches,
          failedBatches: progress.failedBatches
        },
        compatibility: {
          totalRequests: compatStats.totalRequests,
          legacyRequests: compatStats.legacyRequests,
          uuidRequests: compatStats.uuidRequests,
          translationSuccessRate: Math.round(translationSuccessRate * 100) / 100,
          cacheHitRate: cacheStats.cacheHitRate
        },
        lastUpdated: new Date()
      };
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get detailed migration report
   * 
   * Requirements: 8.5 - Detailed migration reports
   */
  async getMigrationReport(batchId?: string): Promise<any> {
    try {
      if (batchId) {
        // Get specific batch report
        const batch = await migrationService.getMigrationBatch(batchId);
        if (!batch) {
          throw new GateInError({
            code: 'BATCH_NOT_FOUND',
            message: `Migration batch not found: ${batchId}`,
            severity: 'error',
            retryable: false,
            userMessage: 'The specified migration batch does not exist'
          });
        }

        // Get mappings for this batch
        const mappings = await migrationService.getBatchMappings(batchId);

        // Get integrity validation
        const integrity = await migrationService.validateMigrationIntegrity(batchId);

        return {
          batch,
          mappings: {
            total: mappings.length,
            sample: mappings.slice(0, 10) // First 10 mappings as sample
          },
          integrity
        };
      } else {
        // Get all batches summary
        const batches = await migrationService.getAllMigrationBatches();
        const status = await this.getMigrationStatus();

        return {
          summary: status,
          batches: batches.map(b => ({
            id: b.id,
            batchName: b.batchName,
            status: b.status,
            totalRecords: b.totalRecords,
            successfulRecords: b.successfulRecords,
            failedRecords: b.failedRecords,
            startedAt: b.startedAt,
            completedAt: b.completedAt
          }))
        };
      }
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Validate backward compatibility
   * 
   * Requirements: 8.2 - Ensure backward compatibility
   */
  async validateCompatibility(): Promise<{
    isCompatible: boolean;
    errors: string[];
    warnings: string[];
    details: any;
  }> {
    try {
      const validation = await locationCompatibilityService.validateBackwardCompatibility();

      return {
        isCompatible: validation.isCompatible,
        errors: validation.errors,
        warnings: validation.warnings,
        details: {
          testedMappings: validation.testedMappings,
          successfulTranslations: validation.successfulTranslations,
          failedTranslations: validation.failedTranslations,
          successRate: validation.testedMappings > 0
            ? (validation.successfulTranslations / validation.testedMappings) * 100
            : 0
        }
      };
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Warm up translation cache
   * 
   * Requirements: 8.2 - Performance optimization
   */
  async warmupCache(limit: number = 1000): Promise<{
    success: boolean;
    cachedMappings: number;
    cacheStats: any;
  }> {
    try {
      await locationCompatibilityService.warmupCache(limit);
      const stats = locationCompatibilityService.getCacheStats();

      return {
        success: true,
        cachedMappings: stats.forwardCacheSize,
        cacheStats: stats
      };
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    locationCompatibilityService.clearCache();
  }

  /**
   * Reset compatibility statistics
   */
  resetStats(): void {
    locationCompatibilityService.resetStats();
  }

  /**
   * Get compatibility statistics
   * 
   * Requirements: 8.5 - Reporting capabilities
   */
  getStats(): {
    compatibility: any;
    cache: any;
  } {
    return {
      compatibility: locationCompatibilityService.getCompatibilityStats(),
      cache: locationCompatibilityService.getCacheStats()
    };
  }

  /**
   * Check if string is UUID format
   */
  private isUuidFormat(id: string): boolean {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(id);
  }
}

// Export singleton instance
export const locationCompatibilityApi = new LocationCompatibilityApi();

