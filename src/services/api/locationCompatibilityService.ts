/**
 * Location Compatibility Service
 * 
 * Provides API compatibility layer for legacy systems using string-based location IDs.
 * Translates between old string-based IDs and new UUID-based system during transition period.
 * 
 * Requirements Addressed:
 * - 8.2: Provide API compatibility layers during the transition period
 * - 8.3: Translate legacy string-based ID queries to UUID-based queries
 * - 8.5: Migration progress tracking and reporting
 */

import { supabase } from './supabaseClient';
import { ErrorHandler, GateInError } from '../errorHandling';
import { Location, LocationQuery, LocationCriteria } from '../../types/location';
import { locationManagementService } from './locationManagementService';
import { migrationService } from './migrationService';
import { logger } from '../../utils/logger';

export interface LegacyLocationResponse {
  legacyId: string;
  location: Location;
  isMigrated: boolean;
}

export interface CompatibilityStats {
  totalRequests: number;
  legacyRequests: number;
  uuidRequests: number;
  translationSuccesses: number;
  translationFailures: number;
  cacheHits: number;
  cacheMisses: number;
}

export class LocationCompatibilityService {
  private translationCache: Map<string, string> = new Map(); // legacyId -> UUID
  private reverseCache: Map<string, string> = new Map(); // UUID -> legacyId
  private stats: CompatibilityStats = {
    totalRequests: 0,
    legacyRequests: 0,
    uuidRequests: 0,
    translationSuccesses: 0,
    translationFailures: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  /**
   * Get location by ID (supports both legacy string IDs and UUIDs)
   * Requirements: 8.2, 8.3 - API compatibility with translation
   */
  async getLocationById(id: string): Promise<LegacyLocationResponse | null> {
    this.stats.totalRequests++;

    try {
      // Check if ID is a UUID (36 characters with dashes)
      const isUuid = this.isUuidFormat(id);

      if (isUuid) {
        this.stats.uuidRequests++;
        
        // Direct UUID lookup
        const location = await locationManagementService.getById(id);
        if (!location) return null;

        // Try to get legacy ID for response
        const legacyId = await this.getLegacyIdFromCache(id);

        return {
          legacyId: legacyId || id,
          location,
          isMigrated: !!legacyId
        };
      } else {
        this.stats.legacyRequests++;
        
        // Legacy string ID - translate to UUID
        const uuid = await this.translateLegacyToUuid(id);
        
        if (!uuid) {
          // Try direct lookup by location_id (SXXRXHX format)
          const location = await locationManagementService.getByLocationId(id);
          if (!location) return null;

          return {
            legacyId: id,
            location,
            isMigrated: false
          };
        }

        const location = await locationManagementService.getById(uuid);
        if (!location) return null;

        return {
          legacyId: id,
          location,
          isMigrated: true
        };
      }
    } catch (error) {
      logger.error('LocationCompatibilityService.getLocationById error:', 'locationCompatibilityService.ts', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Search locations with legacy ID support
   * Requirements: 8.2, 8.3 - Query translation for legacy systems
   */
  async searchLocations(query: LocationQuery & { legacyId?: string }): Promise<LegacyLocationResponse[]> {
    this.stats.totalRequests++;

    try {
      // If legacy ID is provided, translate it
      if (query.legacyId) {
        this.stats.legacyRequests++;
        
        const uuid = await this.translateLegacyToUuid(query.legacyId);
        if (uuid) {
          // Replace legacy ID with UUID in query
          const modifiedQuery = { ...query };
          delete modifiedQuery.legacyId;
          
          const location = await locationManagementService.getById(uuid);
          if (!location) return [];

          return [{
            legacyId: query.legacyId,
            location,
            isMigrated: true
          }];
        }
      }

      // Standard search
      const locations = await locationManagementService.search(query);

      // Enrich with legacy IDs where available
      const results: LegacyLocationResponse[] = [];
      for (const location of locations) {
        const legacyId = await this.getLegacyIdFromCache(location.id);
        results.push({
          legacyId: legacyId || location.locationId,
          location,
          isMigrated: !!legacyId
        });
      }

      return results;
    } catch (error) {
      logger.error('LocationCompatibilityService.searchLocations error', 'locationCompatibilityService.ts', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get all locations with legacy ID support
   * Requirements: 8.2 - Backward compatibility for list operations
   */
  async getAllLocations(criteria?: LocationCriteria): Promise<LegacyLocationResponse[]> {
    this.stats.totalRequests++;

    try {
      const locations = await locationManagementService.getAll(criteria);

      // Enrich with legacy IDs where available
      const results: LegacyLocationResponse[] = [];
      for (const location of locations) {
        const legacyId = await this.getLegacyIdFromCache(location.id);
        results.push({
          legacyId: legacyId || location.locationId,
          location,
          isMigrated: !!legacyId
        });
      }

      return results;
    } catch (error) {
      logger.error('LocationCompatibilityService.getAllLocations error', 'locationCompatibilityService.ts', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Translate legacy string ID to UUID
   * Requirements: 8.3 - Translation layer for legacy systems
   */
  async translateLegacyToUuid(legacyId: string): Promise<string | null> {
    try {
      // Check cache first
      if (this.translationCache.has(legacyId)) {
        this.stats.cacheHits++;
        return this.translationCache.get(legacyId) || null;
      }

      this.stats.cacheMisses++;

      // Look up in migration mappings
      const uuid = await migrationService.getNewLocationId(legacyId);

      if (uuid) {
        // Cache the translation
        this.translationCache.set(legacyId, uuid);
        this.reverseCache.set(uuid, legacyId);
        this.stats.translationSuccesses++;
        return uuid;
      }

      this.stats.translationFailures++;
      return null;
    } catch (error) {
      logger.error('LocationCompatibilityService.translateLegacyToUuid error', 'locationCompatibilityService.ts', error);
      this.stats.translationFailures++;
      return null;
    }
  }

  /**
   * Translate UUID to legacy string ID
   * Requirements: 8.3 - Bidirectional translation
   */
  async translateUuidToLegacy(uuid: string): Promise<string | null> {
    try {
      // Check cache first
      if (this.reverseCache.has(uuid)) {
        this.stats.cacheHits++;
        return this.reverseCache.get(uuid) || null;
      }

      this.stats.cacheMisses++;

      // Look up in migration mappings
      const legacyId = await migrationService.getLegacyLocationId(uuid);

      if (legacyId) {
        // Cache the translation
        this.reverseCache.set(uuid, legacyId);
        this.translationCache.set(legacyId, uuid);
        this.stats.translationSuccesses++;
        return legacyId;
      }

      this.stats.translationFailures++;
      return null;
    } catch (error) {
      logger.error('LocationCompatibilityService.translateUuidToLegacy error', 'locationCompatibilityService.ts', error);
      this.stats.translationFailures++;
      return null;
    }
  }

  /**
   * Batch translate legacy IDs to UUIDs
   * Requirements: 8.3 - Efficient batch translation
   */
  async batchTranslateLegacyToUuid(legacyIds: string[]): Promise<Map<string, string>> {
    const translations = new Map<string, string>();

    for (const legacyId of legacyIds) {
      const uuid = await this.translateLegacyToUuid(legacyId);
      if (uuid) {
        translations.set(legacyId, uuid);
      }
    }

    return translations;
  }

  /**
   * Batch translate UUIDs to legacy IDs
   * Requirements: 8.3 - Efficient batch translation
   */
  async batchTranslateUuidToLegacy(uuids: string[]): Promise<Map<string, string>> {
    const translations = new Map<string, string>();

    for (const uuid of uuids) {
      const legacyId = await this.translateUuidToLegacy(uuid);
      if (legacyId) {
        translations.set(uuid, legacyId);
      }
    }

    return translations;
  }

  /**
   * Check if a location has been migrated
   * Requirements: 8.5 - Migration progress tracking
   */
  async isLocationMigrated(legacyId: string): Promise<boolean> {
    const uuid = await this.translateLegacyToUuid(legacyId);
    return uuid !== null;
  }

  /**
   * Get migration progress statistics
   * Requirements: 8.5 - Migration progress tracking and reporting
   */
  async getMigrationProgress(): Promise<{
    totalLocations: number;
    migratedLocations: number;
    unmigratedLocations: number;
    migrationPercentage: number;
    activeBatches: number;
    completedBatches: number;
    failedBatches: number;
  }> {
    try {
      // Get total locations count
      const { count: totalCount, error: totalError } = await supabase
        .from('locations')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);

      if (totalError) throw totalError;

      // Get migrated locations count
      const { count: migratedCount, error: migratedError } = await supabase
        .from('location_id_mappings')
        .select('id', { count: 'exact', head: true });

      if (migratedError) throw migratedError;

      const totalLocations = totalCount || 0;
      const migratedLocations = migratedCount || 0;
      const unmigratedLocations = totalLocations - migratedLocations;
      const migrationPercentage = totalLocations > 0 
        ? (migratedLocations / totalLocations) * 100 
        : 0;

      // Get batch statistics
      const batches = await migrationService.getAllMigrationBatches();
      const activeBatches = batches.filter(b => b.status === 'in_progress').length;
      const completedBatches = batches.filter(b => b.status === 'completed').length;
      const failedBatches = batches.filter(b => b.status === 'failed').length;

      return {
        totalLocations,
        migratedLocations,
        unmigratedLocations,
        migrationPercentage: Math.round(migrationPercentage * 100) / 100,
        activeBatches,
        completedBatches,
        failedBatches
      };
    } catch (error) {
      logger.error('LocationCompatibilityService.getMigrationProgress error', 'locationCompatibilityService.ts', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get compatibility layer statistics
   * Requirements: 8.5 - Reporting capabilities
   */
  getCompatibilityStats(): CompatibilityStats {
    return { ...this.stats };
  }

  /**
   * Reset compatibility statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      legacyRequests: 0,
      uuidRequests: 0,
      translationSuccesses: 0,
      translationFailures: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.translationCache.clear();
    this.reverseCache.clear();
  }

  /**
   * Warm up translation cache with common mappings
   * Requirements: 8.2 - Performance optimization for compatibility layer
   */
  async warmupCache(limit: number = 1000): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('location_id_mappings')
        .select('legacy_string_id, new_location_id')
        .limit(limit);

      if (error) throw error;

      let count = 0;
      for (const mapping of data || []) {
        this.translationCache.set(mapping.legacy_string_id, mapping.new_location_id);
        this.reverseCache.set(mapping.new_location_id, mapping.legacy_string_id);
        count++;
      }
    } catch (error) {
      logger.error('LocationCompatibilityService.warmupCache error', 'locationCompatibilityService.ts', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    forwardCacheSize: number;
    reverseCacheSize: number;
    cacheHitRate: number;
  } {
    const totalCacheRequests = this.stats.cacheHits + this.stats.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0 
      ? (this.stats.cacheHits / totalCacheRequests) * 100 
      : 0;

    return {
      forwardCacheSize: this.translationCache.size,
      reverseCacheSize: this.reverseCache.size,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100
    };
  }

  /**
   * Check if string is UUID format
   */
  private isUuidFormat(id: string): boolean {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(id);
  }

  /**
   * Get legacy ID from cache (helper method)
   */
  private async getLegacyIdFromCache(uuid: string): Promise<string | null> {
    if (this.reverseCache.has(uuid)) {
      return this.reverseCache.get(uuid) || null;
    }

    // Try to fetch from database
    const legacyId = await migrationService.getLegacyLocationId(uuid);
    if (legacyId) {
      this.reverseCache.set(uuid, legacyId);
      this.translationCache.set(legacyId, uuid);
    }

    return legacyId;
  }

  /**
   * Validate that legacy system can still access locations
   * Requirements: 8.2 - Ensure backward compatibility
   */
  async validateBackwardCompatibility(): Promise<{
    isCompatible: boolean;
    errors: string[];
    warnings: string[];
    testedMappings: number;
    successfulTranslations: number;
    failedTranslations: number;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let testedMappings = 0;
    let successfulTranslations = 0;
    let failedTranslations = 0;

    try {
      // Get a sample of mappings to test
      const { data: mappings, error: mappingsError } = await supabase
        .from('location_id_mappings')
        .select('legacy_string_id, new_location_id')
        .limit(100);

      if (mappingsError) throw mappingsError;

      for (const mapping of mappings || []) {
        testedMappings++;

        // Test forward translation
        const uuid = await this.translateLegacyToUuid(mapping.legacy_string_id);
        if (uuid !== mapping.new_location_id) {
          errors.push(`Forward translation failed for ${mapping.legacy_string_id}`);
          failedTranslations++;
          continue;
        }

        // Test reverse translation
        const legacyId = await this.translateUuidToLegacy(mapping.new_location_id);
        if (legacyId !== mapping.legacy_string_id) {
          errors.push(`Reverse translation failed for ${mapping.new_location_id}`);
          failedTranslations++;
          continue;
        }

        // Test location retrieval
        const result = await this.getLocationById(mapping.legacy_string_id);
        if (!result || !result.location) {
          errors.push(`Location retrieval failed for ${mapping.legacy_string_id}`);
          failedTranslations++;
          continue;
        }

        if (!result.isMigrated) {
          warnings.push(`Location ${mapping.legacy_string_id} not marked as migrated`);
        }

        successfulTranslations++;
      }

      return {
        isCompatible: errors.length === 0,
        errors,
        warnings,
        testedMappings,
        successfulTranslations,
        failedTranslations
      };
    } catch (error) {
      logger.error('LocationCompatibilityService.validateBackwardCompatibility error:', 'locationCompatibilityService.ts', error);
      throw ErrorHandler.createGateInError(error);
    }
  }
}

export const locationCompatibilityService = new LocationCompatibilityService();
