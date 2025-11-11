/**
 * Redis Client Configuration
 * 
 * Provides Redis connection for caching location availability data
 * and performance optimization.
 * 
 * Requirements Addressed:
 * - 9.1: Redis caching for hot location availability data
 * - 9.2: Cache invalidation on location occupancy changes
 */

// Simple in-memory cache implementation as fallback when Redis is not available
// In production, this should be replaced with actual Redis connection

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class InMemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    // Convert Redis pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);

    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -2; // Key doesn't exist
    
    const remaining = Math.floor((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -1; // -1 means expired
  }

  async keys(pattern: string): Promise<string[]> {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);

    const matchingKeys: string[] = [];
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        const entry = this.cache.get(key);
        if (entry && Date.now() <= entry.expiresAt) {
          matchingKeys.push(key);
        }
      }
    }

    return matchingKeys;
  }

  async flushall(): Promise<void> {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  disconnect(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Export singleton instance
export const redisClient = new InMemoryCache();

// Cache key generators
export const CacheKeys = {
  // Location availability keys
  availableLocations: (yardId: string, containerSize?: string, clientPoolId?: string) => {
    const parts = ['locations', 'available', yardId];
    if (containerSize) parts.push(containerSize);
    if (clientPoolId) parts.push(clientPoolId);
    return parts.join(':');
  },

  availableLocationsCount: (yardId: string, containerSize?: string, clientPoolId?: string) => {
    const parts = ['locations', 'available', 'count', yardId];
    if (containerSize) parts.push(containerSize);
    if (clientPoolId) parts.push(clientPoolId);
    return parts.join(':');
  },

  locationById: (locationId: string) => `location:${locationId}`,

  locationByLocationId: (locationId: string) => `location:lid:${locationId}`,

  stackLocations: (stackId: string) => `locations:stack:${stackId}`,

  yardLocations: (yardId: string) => `locations:yard:${yardId}`,

  yardStatistics: (yardId: string) => `statistics:yard:${yardId}`,

  stackStatistics: (stackId: string) => `statistics:stack:${stackId}`,

  availabilitySummary: (yardId: string) => `availability:summary:${yardId}`,

  // Pattern for invalidating all location-related caches
  allLocationCaches: () => 'locations:*',

  // Pattern for invalidating yard-specific caches
  yardCaches: (yardId: string) => `*:${yardId}*`,

  // Pattern for invalidating stack-specific caches
  stackCaches: (stackId: string) => `*:stack:${stackId}*`,
};

// Cache TTL constants (in seconds)
export const CacheTTL = {
  LOCATION_DETAIL: 300, // 5 minutes
  AVAILABLE_LOCATIONS: 60, // 1 minute (hot data)
  STATISTICS: 180, // 3 minutes
  AVAILABILITY_SUMMARY: 60, // 1 minute (hot data)
  STACK_LOCATIONS: 300, // 5 minutes
  YARD_LOCATIONS: 600, // 10 minutes
};
