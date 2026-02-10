/**
 * Database Optimization Configuration
 * 
 * Provides database connection pooling optimization and query performance
 * guidelines for location management operations.
 * 
 * Requirements Addressed:
 * - 9.4: Database connection pooling optimization for high concurrency
 * - 9.5: Performance benchmarks for location management operations
 */

import { logger } from "../../utils/logger";

/**
 * Database Connection Pool Configuration
 * 
 * Supabase uses PostgREST which handles connection pooling automatically.
 * However, we can optimize our queries and provide guidelines for best practices.
 */

export const DatabaseOptimizationConfig = {
  /**
   * Connection pool settings (for reference - Supabase handles this)
   */
  connectionPool: {
    // Supabase default pool size is 15 connections per project
    // For high concurrency, consider upgrading to Pro plan (40 connections)
    // or Enterprise plan (unlimited connections)
    recommendedPoolSize: 40,
    maxConcurrentQueries: 100,
    queryTimeout: 30000, // 30 seconds
    idleTimeout: 10000, // 10 seconds
  },

  /**
   * Query optimization guidelines
   */
  queryOptimization: {
    // Use indexes for frequently queried columns
    indexedColumns: [
      'locations.is_occupied',
      'locations.container_size',
      'locations.client_pool_id',
      'locations.yard_id',
      'locations.stack_id',
      'locations.location_id',
      'locations.is_active',
    ],

    // Batch operations when possible
    batchSize: 100,

    // Use pagination for large result sets
    defaultPageSize: 50,
    maxPageSize: 1000,

    // Query timeout thresholds
    slowQueryThreshold: 1000, // 1 second
    warningThreshold: 500, // 500ms
  },

  /**
   * Performance benchmarks
   */
  performanceBenchmarks: {
    // Target response times for different operations
    getLocationById: 50, // 50ms
    getAvailableLocations: 200, // 200ms
    assignContainer: 100, // 100ms
    releaseLocation: 100, // 100ms
    getYardStatistics: 300, // 300ms
    bulkOperations: 1000, // 1 second for bulk ops
    cacheHitRate: 95, // 95% cache hit rate target
  },

  /**
   * Caching strategy
   */
  cachingStrategy: {
    // Hot data - frequently accessed, short TTL
    hotDataTTL: 60, // 1 minute
    
    // Warm data - moderately accessed, medium TTL
    warmDataTTL: 300, // 5 minutes
    
    // Cold data - rarely accessed, long TTL
    coldDataTTL: 600, // 10 minutes
    
    // Statistics and aggregations
    statisticsTTL: 180, // 3 minutes
  },
};

/**
 * Query optimization utilities
 */
export class QueryOptimizer {
  /**
   * Check if a query should use pagination
   */
  static shouldPaginate(estimatedResults: number): boolean {
    return estimatedResults > DatabaseOptimizationConfig.queryOptimization.defaultPageSize;
  }

  /**
   * Get optimal page size for a query
   */
  static getOptimalPageSize(totalResults: number): number {
    const { defaultPageSize, maxPageSize } = DatabaseOptimizationConfig.queryOptimization;
    
    if (totalResults <= defaultPageSize) {
      return totalResults;
    }
    
    return Math.min(defaultPageSize, maxPageSize);
  }

  /**
   * Check if a query is slow
   */
  static isSlowQuery(duration: number): boolean {
    return duration > DatabaseOptimizationConfig.queryOptimization.slowQueryThreshold;
  }

  /**
   * Check if a query should trigger a warning
   */
  static shouldWarn(duration: number): boolean {
    return duration > DatabaseOptimizationConfig.queryOptimization.warningThreshold;
  }

  /**
   * Get recommended batch size for bulk operations
   */
  static getBatchSize(): number {
    return DatabaseOptimizationConfig.queryOptimization.batchSize;
  }

  /**
   * Calculate optimal cache TTL based on data access pattern
   */
  static getOptimalCacheTTL(accessFrequency: 'hot' | 'warm' | 'cold'): number {
    const { hotDataTTL, warmDataTTL, coldDataTTL } = DatabaseOptimizationConfig.cachingStrategy;
    
    switch (accessFrequency) {
      case 'hot':
        return hotDataTTL;
      case 'warm':
        return warmDataTTL;
      case 'cold':
        return coldDataTTL;
      default:
        return warmDataTTL;
    }
  }
}

/**
 * Database performance monitoring utilities
 */
export class DatabasePerformanceMonitor {
  private static queryMetrics: Map<string, number[]> = new Map();

  /**
   * Record query execution time
   */
  static recordQueryTime(queryName: string, duration: number): void {
    const metrics = this.queryMetrics.get(queryName) || [];
    metrics.push(duration);
    
    // Keep only last 1000 measurements
    if (metrics.length > 1000) {
      metrics.shift();
    }
    
    this.queryMetrics.set(queryName, metrics);
  }

  /**
   * Get average query time
   */
  static getAverageQueryTime(queryName: string): number {
    const metrics = this.queryMetrics.get(queryName);
    if (!metrics || metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, val) => acc + val, 0);
    return sum / metrics.length;
  }

  /**
   * Get query performance statistics
   */
  static getQueryStats(queryName: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.queryMetrics.get(queryName);
    if (!metrics || metrics.length === 0) return null;
    
    const sorted = [...metrics].sort((a, b) => a - b);
    const count = sorted.length;
    
    return {
      count,
      avg: sorted.reduce((acc, val) => acc + val, 0) / count,
      min: sorted[0],
      max: sorted[count - 1],
      p50: sorted[Math.floor(count * 0.5)],
      p95: sorted[Math.floor(count * 0.95)],
      p99: sorted[Math.floor(count * 0.99)],
    };
  }

  /**
   * Get all query statistics
   */
  static getAllQueryStats(): Map<string, ReturnType<typeof DatabasePerformanceMonitor.getQueryStats>> {
    const stats = new Map();
    
    for (const [queryName] of this.queryMetrics) {
      stats.set(queryName, this.getQueryStats(queryName));
    }
    
    return stats;
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.queryMetrics.clear();
  }

  /**
   * Get performance report
   */
  static getPerformanceReport(): string {
    let report = '\n=== DATABASE PERFORMANCE REPORT ===\n\n';
    
    const allStats = this.getAllQueryStats();
    
    if (allStats.size === 0) {
      report += 'No query metrics available.\n';
      return report;
    }
    
    // Sort by average duration (slowest first)
    const sortedStats = Array.from(allStats.entries())
      .filter(([_, stats]) => stats !== null)
      .sort((a, b) => (b[1]?.avg || 0) - (a[1]?.avg || 0));
    
    report += 'Query Performance (sorted by avg duration):\n\n';
    
    sortedStats.forEach(([queryName, stats]) => {
      if (!stats) return;
      
      report += `${queryName}:\n`;
      report += `  Count: ${stats.count}\n`;
      report += `  Avg: ${stats.avg.toFixed(2)}ms\n`;
      report += `  Min: ${stats.min}ms, Max: ${stats.max}ms\n`;
      report += `  P50: ${stats.p50}ms, P95: ${stats.p95}ms, P99: ${stats.p99}ms\n`;
      
      // Add warning if slow
      if (QueryOptimizer.isSlowQuery(stats.avg)) {
        report += `  ⚠️ WARNING: Average query time exceeds threshold\n`;
      }
      
      report += '\n';
    });
    
    report += '===================================\n';
    
    return report;
  }

  /**
   * Log performance report
   */
  static logPerformanceReport(): void {
    logger.info('Information', 'databaseOptimization.ts', this.getPerformanceReport());
  }
}

/**
 * Best practices for database optimization
 */
export const DatabaseBestPractices = {
  /**
   * Query optimization tips
   */
  queryOptimization: [
    'Use indexes on frequently queried columns (is_occupied, yard_id, stack_id)',
    'Limit result sets using pagination for large queries',
    'Use specific column selection instead of SELECT *',
    'Avoid N+1 queries by using joins or batch operations',
    'Use database functions for complex calculations',
    'Cache frequently accessed data with appropriate TTL',
  ],

  /**
   * Connection pooling tips
   */
  connectionPooling: [
    'Reuse database connections instead of creating new ones',
    'Close connections properly after use',
    'Monitor connection pool usage and adjust size if needed',
    'Use connection timeouts to prevent hanging connections',
    'Consider upgrading Supabase plan for higher connection limits',
  ],

  /**
   * Caching strategies
   */
  cachingStrategies: [
    'Cache hot data (availability queries) with short TTL (1 minute)',
    'Cache warm data (statistics) with medium TTL (3-5 minutes)',
    'Invalidate cache immediately on data changes',
    'Use cache warming for frequently accessed data',
    'Monitor cache hit rates and adjust TTL accordingly',
  ],

  /**
   * Performance monitoring
   */
  performanceMonitoring: [
    'Track query execution times for all operations',
    'Set up alerts for slow queries (>1 second)',
    'Monitor cache hit rates (target >95%)',
    'Log and analyze slow query patterns',
    'Regularly review and optimize slow queries',
  ],
};

/**
 * Export configuration and utilities
 */
export default {
  config: DatabaseOptimizationConfig,
  optimizer: QueryOptimizer,
  monitor: DatabasePerformanceMonitor,
  bestPractices: DatabaseBestPractices,
};
