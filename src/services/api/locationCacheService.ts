/**
 * Location Cache Service
 * 
 * Provides caching layer for location management operations to improve
 * query performance and reduce database load.
 * 
 * Requirements Addressed:
 * - 9.1: Redis caching for hot location availability data
 * - 9.2: Cache invalidation on location occupancy changes
 * - 9.3: Cache warming strategies for frequently accessed location data
 */

import { redisClient, CacheKeys, CacheTTL } from './redisClient';
import {
  Location,
  LocationStatistics,
  StackOccupancyStatistics,
  ContainerSizeEnum
} from '../../types/location';

export class LocationCacheService {
  /**
   * Get cached available locations
   */
  async getCachedAvailableLocations(
    yardId: string,
    containerSize?: ContainerSizeEnum,
    clientPoolId?: string
  ): Promise<Location[] | null> {
    try {
      const key = CacheKeys.availableLocations(yardId, containerSize, clientPoolId);
      const cached = await redisClient.get<Location[]>(key);
      
      return cached;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache available locations
   */
  async cacheAvailableLocations(
    yardId: string,
    locations: Location[],
    containerSize?: ContainerSizeEnum,
    clientPoolId?: string
  ): Promise<void> {
    try {
      const key = CacheKeys.availableLocations(yardId, containerSize, clientPoolId);
      await redisClient.set(key, locations, CacheTTL.AVAILABLE_LOCATIONS);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get cached available locations count
   */
  async getCachedAvailableLocationsCount(
    yardId: string,
    containerSize?: ContainerSizeEnum,
    clientPoolId?: string
  ): Promise<number | null> {
    try {
      const key = CacheKeys.availableLocationsCount(yardId, containerSize, clientPoolId);
      const cached = await redisClient.get<number>(key);
      
      return cached;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache available locations count
   */
  async cacheAvailableLocationsCount(
    yardId: string,
    count: number,
    containerSize?: ContainerSizeEnum,
    clientPoolId?: string
  ): Promise<void> {
    try {
      const key = CacheKeys.availableLocationsCount(yardId, containerSize, clientPoolId);
      await redisClient.set(key, count, CacheTTL.AVAILABLE_LOCATIONS);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get cached location by ID
   */
  async getCachedLocationById(locationId: string): Promise<Location | null> {
    try {
      const key = CacheKeys.locationById(locationId);
      return await redisClient.get<Location>(key);
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache location by ID
   */
  async cacheLocationById(location: Location): Promise<void> {
    try {
      const key = CacheKeys.locationById(location.id);
      await redisClient.set(key, location, CacheTTL.LOCATION_DETAIL);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get cached location by location ID (SXXRXHX format)
   */
  async getCachedLocationByLocationId(locationId: string): Promise<Location | null> {
    try {
      const key = CacheKeys.locationByLocationId(locationId);
      return await redisClient.get<Location>(key);
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache location by location ID
   */
  async cacheLocationByLocationId(location: Location): Promise<void> {
    try {
      const key = CacheKeys.locationByLocationId(location.locationId);
      await redisClient.set(key, location, CacheTTL.LOCATION_DETAIL);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get cached stack locations
   */
  async getCachedStackLocations(stackId: string): Promise<Location[] | null> {
    try {
      const key = CacheKeys.stackLocations(stackId);
      return await redisClient.get<Location[]>(key);
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache stack locations
   */
  async cacheStackLocations(stackId: string, locations: Location[]): Promise<void> {
    try {
      const key = CacheKeys.stackLocations(stackId);
      await redisClient.set(key, locations, CacheTTL.STACK_LOCATIONS);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get cached yard statistics
   */
  async getCachedYardStatistics(yardId: string): Promise<LocationStatistics | null> {
    try {
      const key = CacheKeys.yardStatistics(yardId);
      return await redisClient.get<LocationStatistics>(key);
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache yard statistics
   */
  async cacheYardStatistics(statistics: LocationStatistics): Promise<void> {
    try {
      const key = CacheKeys.yardStatistics(statistics.yardId);
      await redisClient.set(key, statistics, CacheTTL.STATISTICS);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get cached stack statistics
   */
  async getCachedStackStatistics(stackId: string): Promise<StackOccupancyStatistics | null> {
    try {
      const key = CacheKeys.stackStatistics(stackId);
      return await redisClient.get<StackOccupancyStatistics>(key);
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache stack statistics
   */
  async cacheStackStatistics(statistics: StackOccupancyStatistics): Promise<void> {
    try {
      const key = CacheKeys.stackStatistics(statistics.stackId);
      await redisClient.set(key, statistics, CacheTTL.STATISTICS);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get cached availability summary
   */
  async getCachedAvailabilitySummary(yardId: string): Promise<any | null> {
    try {
      const key = CacheKeys.availabilitySummary(yardId);
      return await redisClient.get<any>(key);
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache availability summary
   */
  async cacheAvailabilitySummary(yardId: string, summary: any): Promise<void> {
    try {
      const key = CacheKeys.availabilitySummary(yardId);
      await redisClient.set(key, summary, CacheTTL.AVAILABILITY_SUMMARY);
    } catch (error) {
      // Silent fail
    }
  }

  // ============================================================================
  // CACHE INVALIDATION METHODS
  // Requirements: 9.2 - Cache invalidation on location occupancy changes
  // ============================================================================

  /**
   * Invalidate location cache when occupancy changes
   * This is called when a container is assigned or released
   */
  async invalidateLocationCache(location: Location): Promise<void> {
    try {
      // Invalidate specific location caches
      await redisClient.del(CacheKeys.locationById(location.id));
      await redisClient.del(CacheKeys.locationByLocationId(location.locationId));

      // Invalidate availability caches for the yard
      await this.invalidateYardAvailabilityCache(location.yardId);

      // Invalidate stack-specific caches
      await this.invalidateStackCache(location.stackId);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Invalidate all availability caches for a yard
   */
  async invalidateYardAvailabilityCache(yardId: string): Promise<void> {
    try {
      // Invalidate all availability-related caches for this yard
      await redisClient.delPattern(CacheKeys.availableLocations(yardId, '*'));
      await redisClient.delPattern(CacheKeys.availableLocationsCount(yardId, '*'));
      await redisClient.del(CacheKeys.availabilitySummary(yardId));
      await redisClient.del(CacheKeys.yardStatistics(yardId));
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Invalidate all caches for a specific stack
   */
  async invalidateStackCache(stackId: string): Promise<void> {
    try {
      await redisClient.del(CacheKeys.stackLocations(stackId));
      await redisClient.del(CacheKeys.stackStatistics(stackId));
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Invalidate all location-related caches
   * Use this for bulk operations or system-wide updates
   */
  async invalidateAllLocationCaches(): Promise<void> {
    try {
      await redisClient.delPattern(CacheKeys.allLocationCaches());
    } catch (error) {
      // Silent fail
    }
  }

  // ============================================================================
  // CACHE WARMING METHODS
  // Requirements: 9.3 - Cache warming strategies for frequently accessed data
  // ============================================================================

  /**
   * Warm up cache for a yard by pre-loading frequently accessed data
   */
  async warmYardCache(
    yardId: string,
    getAvailableLocationsFn: (yardId: string, containerSize?: ContainerSizeEnum) => Promise<Location[]>,
    getStatisticsFn: (yardId: string) => Promise<LocationStatistics | null>,
    getAvailabilitySummaryFn: (yardId: string) => Promise<any>
  ): Promise<void> {
    try {
      // Warm up available locations for both container sizes
      const [available20ft, available40ft, statistics, summary] = await Promise.all([
        getAvailableLocationsFn(yardId, '20ft'),
        getAvailableLocationsFn(yardId, '40ft'),
        getStatisticsFn(yardId),
        getAvailabilitySummaryFn(yardId)
      ]);

      // Cache the results
      await Promise.all([
        this.cacheAvailableLocations(yardId, available20ft, '20ft'),
        this.cacheAvailableLocations(yardId, available40ft, '40ft'),
        statistics ? this.cacheYardStatistics(statistics) : Promise.resolve(),
        this.cacheAvailabilitySummary(yardId, summary)
      ]);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Warm up cache for a specific stack
   */
  async warmStackCache(
    stackId: string,
    getStackLocationsFn: (stackId: string) => Promise<Location[]>,
    getStackStatisticsFn: (stackId: string) => Promise<StackOccupancyStatistics | null>
  ): Promise<void> {
    try {
      const [locations, statistics] = await Promise.all([
        getStackLocationsFn(stackId),
        getStackStatisticsFn(stackId)
      ]);

      await Promise.all([
        this.cacheStackLocations(stackId, locations),
        statistics ? this.cacheStackStatistics(statistics) : Promise.resolve()
      ]);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStatistics(): Promise<{
    totalKeys: number;
    locationKeys: number;
    availabilityKeys: number;
    statisticsKeys: number;
  }> {
    try {
      const [allKeys, locationKeys, availabilityKeys, statisticsKeys] = await Promise.all([
        redisClient.keys('*'),
        redisClient.keys('location:*'),
        redisClient.keys('locations:available:*'),
        redisClient.keys('statistics:*')
      ]);

      return {
        totalKeys: allKeys.length,
        locationKeys: locationKeys.length,
        availabilityKeys: availabilityKeys.length,
        statisticsKeys: statisticsKeys.length
      };
    } catch (error) {
      return {
        totalKeys: 0,
        locationKeys: 0,
        availabilityKeys: 0,
        statisticsKeys: 0
      };
    }
  }

  /**
   * Clear all caches (use with caution)
   */
  async clearAllCaches(): Promise<void> {
    try {
      await redisClient.flushall();
    } catch (error) {
      // Silent fail
    }
  }
}

export const locationCacheService = new LocationCacheService();
