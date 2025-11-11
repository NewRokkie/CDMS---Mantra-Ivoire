/**
 * Performance Monitoring Service
 * 
 * Tracks and monitors performance metrics for location management operations
 * to identify bottlenecks and optimize query performance.
 * 
 * Requirements Addressed:
 * - 9.3: Query performance monitoring for location operations
 * - 9.4: Database connection pooling optimization for high concurrency
 * - 9.5: Performance benchmarks for location management operations
 */

import { logger } from "../../utils/logger";

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface OperationStats {
  operation: string;
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  lastExecuted: Date;
}

interface PerformanceSummary {
  totalOperations: number;
  totalDuration: number;
  avgDuration: number;
  successRate: number;
  operationStats: OperationStats[];
  slowestOperations: PerformanceMetric[];
  recentErrors: PerformanceMetric[];
}

export class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private maxMetricsSize = 10000; // Keep last 10k metrics
  private slowQueryThreshold = 1000; // 1 second
  private warningThreshold = 500; // 500ms

  /**
   * Start tracking a performance metric
   */
  startTracking(operation: string, metadata?: Record<string, any>): PerformanceTracker {
    return new PerformanceTracker(operation, metadata, this);
  }

  /**
   * Record a completed operation
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Trim metrics if exceeding max size
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize);
    }

    // Log slow queries
    if (metric.duration > this.slowQueryThreshold) {
      logger.warn(`🐌 SLOW QUERY: ${metric.operation} took ${metric.duration}ms`, 'ComponentName', metric.metadata);
    } else if (metric.duration > this.warningThreshold) {
      logger.warn(`⚠️ WARNING: ${metric.operation} took ${metric.duration}ms`, 'ComponentName', metric.metadata);
    }

    // Log errors
    if (!metric.success) {
      logger.error(`ERROR: ${metric.operation} failed after ${metric.duration}ms`, 'ComponentName', metric.error);
    }
  }

  /**
   * Get performance statistics for a specific operation
   */
  getOperationStats(operation: string): OperationStats | null {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);

    if (operationMetrics.length === 0) {
      return null;
    }

    const durations = operationMetrics.map(m => m.duration);
    const successCount = operationMetrics.filter(m => m.success).length;
    const errorCount = operationMetrics.length - successCount;

    return {
      operation,
      count: operationMetrics.length,
      totalDuration: durations.reduce((sum, d) => sum + d, 0),
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successCount,
      errorCount,
      successRate: (successCount / operationMetrics.length) * 100,
      lastExecuted: operationMetrics[operationMetrics.length - 1].timestamp
    };
  }

  /**
   * Get overall performance summary
   */
  getPerformanceSummary(timeWindowMinutes?: number): PerformanceSummary {
    let metricsToAnalyze = this.metrics;

    // Filter by time window if specified
    if (timeWindowMinutes) {
      const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
      metricsToAnalyze = this.metrics.filter(m => m.timestamp >= cutoffTime);
    }

    if (metricsToAnalyze.length === 0) {
      return {
        totalOperations: 0,
        totalDuration: 0,
        avgDuration: 0,
        successRate: 0,
        operationStats: [],
        slowestOperations: [],
        recentErrors: []
      };
    }

    // Calculate overall stats
    const totalDuration = metricsToAnalyze.reduce((sum, m) => sum + m.duration, 0);
    const successCount = metricsToAnalyze.filter(m => m.success).length;

    // Group by operation
    const operationGroups = new Map<string, PerformanceMetric[]>();
    metricsToAnalyze.forEach(metric => {
      const group = operationGroups.get(metric.operation) || [];
      group.push(metric);
      operationGroups.set(metric.operation, group);
    });

    // Calculate stats for each operation
    const operationStats: OperationStats[] = [];
    operationGroups.forEach((metrics, operation) => {
      const durations = metrics.map(m => m.duration);
      const opSuccessCount = metrics.filter(m => m.success).length;

      operationStats.push({
        operation,
        count: metrics.length,
        totalDuration: durations.reduce((sum, d) => sum + d, 0),
        avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        successCount: opSuccessCount,
        errorCount: metrics.length - opSuccessCount,
        successRate: (opSuccessCount / metrics.length) * 100,
        lastExecuted: metrics[metrics.length - 1].timestamp
      });
    });

    // Sort by average duration (slowest first)
    operationStats.sort((a, b) => b.avgDuration - a.avgDuration);

    // Get slowest operations
    const slowestOperations = [...metricsToAnalyze]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Get recent errors
    const recentErrors = metricsToAnalyze
      .filter(m => !m.success)
      .slice(-10);

    return {
      totalOperations: metricsToAnalyze.length,
      totalDuration,
      avgDuration: totalDuration / metricsToAnalyze.length,
      successRate: (successCount / metricsToAnalyze.length) * 100,
      operationStats,
      slowestOperations,
      recentErrors
    };
  }

  /**
   * Get slow queries (operations exceeding threshold)
   */
  getSlowQueries(thresholdMs?: number): PerformanceMetric[] {
    const threshold = thresholdMs || this.slowQueryThreshold;
    return this.metrics
      .filter(m => m.duration > threshold)
      .sort((a, b) => b.duration - a.duration);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 50): PerformanceMetric[] {
    return this.metrics
      .filter(m => !m.success)
      .slice(-limit);
  }

  /**
   * Get cache hit rate statistics
   */
  getCacheHitRate(): {
    totalQueries: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
  } {
    const cacheMetrics = this.metrics.filter(m => 
      m.operation.includes('getCached') || m.operation.includes('cache')
    );

    const cacheHits = cacheMetrics.filter(m => 
      m.metadata?.cacheHit === true
    ).length;

    const cacheMisses = cacheMetrics.filter(m => 
      m.metadata?.cacheHit === false
    ).length;

    const totalQueries = cacheHits + cacheMisses;

    return {
      totalQueries,
      cacheHits,
      cacheMisses,
      hitRate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0
    };
  }

  /**
   * Get performance metrics for a time range
   */
  getMetricsInTimeRange(startTime: Date, endTime: Date): PerformanceMetric[] {
    return this.metrics.filter(m => 
      m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get performance report
   */
  getPerformanceReport(timeWindowMinutes?: number): string {
    const summary = this.getPerformanceSummary(timeWindowMinutes);
    const cacheStats = this.getCacheHitRate();

    let report = '\n=== PERFORMANCE REPORT ===\n\n';
    
    report += `Total Operations: ${summary.totalOperations}\n`;
    report += `Average Duration: ${summary.avgDuration.toFixed(2)}ms\n`;
    report += `Success Rate: ${summary.successRate.toFixed(2)}%\n`;
    report += `Cache Hit Rate: ${cacheStats.hitRate.toFixed(2)}%\n\n`;

    report += '=== TOP OPERATIONS BY AVG DURATION ===\n';
    summary.operationStats.slice(0, 10).forEach((stat, index) => {
      report += `${index + 1}. ${stat.operation}\n`;
      report += `   Count: ${stat.count}, Avg: ${stat.avgDuration.toFixed(2)}ms, `;
      report += `Min: ${stat.minDuration}ms, Max: ${stat.maxDuration}ms\n`;
      report += `   Success Rate: ${stat.successRate.toFixed(2)}%\n`;
    });

    if (summary.slowestOperations.length > 0) {
      report += '\n=== SLOWEST OPERATIONS ===\n';
      summary.slowestOperations.slice(0, 5).forEach((metric, index) => {
        report += `${index + 1}. ${metric.operation}: ${metric.duration}ms\n`;
        if (metric.metadata) {
          report += `   Metadata: ${JSON.stringify(metric.metadata)}\n`;
        }
      });
    }

    if (summary.recentErrors.length > 0) {
      report += '\n=== RECENT ERRORS ===\n';
      summary.recentErrors.slice(0, 5).forEach((metric, index) => {
        report += `${index + 1}. ${metric.operation}: ${metric.error}\n`;
      });
    }

    report += '\n=========================\n';

    return report;
  }

  /**
   * Log performance report to console
   */
  logPerformanceReport(timeWindowMinutes?: number): void {
    logger.info('Information', 'ComponentName', this.getPerformanceReport(timeWindowMinutes))
  }

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(thresholdMs: number): void {
    this.slowQueryThreshold = thresholdMs;
  }

  /**
   * Set warning threshold
   */
  setWarningThreshold(thresholdMs: number): void {
    this.warningThreshold = thresholdMs;
  }
}

/**
 * Performance Tracker
 * Helper class to track individual operation performance
 */
export class PerformanceTracker {
  private startTime: number;
  private operation: string;
  private metadata?: Record<string, any>;
  private monitoringService: PerformanceMonitoringService;

  constructor(
    operation: string,
    metadata: Record<string, any> | undefined,
    monitoringService: PerformanceMonitoringService
  ) {
    this.operation = operation;
    this.metadata = metadata;
    this.monitoringService = monitoringService;
    this.startTime = Date.now();
  }

  /**
   * End tracking and record success
   */
  end(additionalMetadata?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    this.monitoringService.recordMetric({
      operation: this.operation,
      duration,
      timestamp: new Date(),
      success: true,
      metadata: { ...this.metadata, ...additionalMetadata }
    });
  }

  /**
   * End tracking and record error
   */
  error(error: Error | string, additionalMetadata?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    this.monitoringService.recordMetric({
      operation: this.operation,
      duration,
      timestamp: new Date(),
      success: false,
      error: error instanceof Error ? error.message : error,
      metadata: { ...this.metadata, ...additionalMetadata }
    });
  }

  /**
   * Get elapsed time without ending tracking
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();

// Helper function to wrap async operations with performance tracking
export async function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const tracker = performanceMonitoringService.startTracking(operation, metadata);
  
  try {
    const result = await fn();
    tracker.end();
    return result;
  } catch (error) {
    tracker.error(error as Error);
    throw error;
  }
}
