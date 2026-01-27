/**
 * Performance Benchmark Utility
 * 
 * Provides benchmarking tools for location management operations
 * to validate performance requirements.
 * 
 * Requirements Addressed:
 * - 9.5: Performance benchmarks for location management operations
 */

import { locationManagementService } from './locationManagementService';
import { DatabaseOptimizationConfig } from './databaseOptimization';
import { logger } from '../../utils/logger';

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
  successRate: number;
  passedBenchmark: boolean;
  targetDuration: number;
}

interface BenchmarkSuite {
  suiteName: string;
  results: BenchmarkResult[];
  overallPassRate: number;
  totalDuration: number;
}

export class PerformanceBenchmark {
  /**
   * Run a single benchmark test
   */
  static async runBenchmark(
    operation: string,
    fn: () => Promise<any>,
    iterations: number = 100,
    targetDuration: number
  ): Promise<BenchmarkResult> {
    const durations: number[] = [];
    let successCount = 0;

    logger.info(`Running benchmark: ${operation}`, 'PerformanceBenchmark', { iterations });

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      try {
        await fn();
        const duration = Date.now() - startTime;
        durations.push(duration);
        successCount++;
      } catch (error) {
        logger.error(`Benchmark iteration failed`, 'PerformanceBenchmark', { iteration: i + 1, error });
        durations.push(0);
      }
    }

    // Calculate statistics
    const sorted = durations.filter(d => d > 0).sort((a, b) => a - b);
    const totalDuration = sorted.reduce((sum, d) => sum + d, 0);
    const avgDuration = totalDuration / sorted.length;
    const minDuration = sorted[0] || 0;
    const maxDuration = sorted[sorted.length - 1] || 0;
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
    const successRate = (successCount / iterations) * 100;
    const passedBenchmark = avgDuration <= targetDuration && successRate >= 95;

    const result: BenchmarkResult = {
      operation,
      iterations,
      totalDuration,
      avgDuration,
      minDuration,
      maxDuration,
      p50,
      p95,
      p99,
      successRate,
      passedBenchmark,
      targetDuration,
    };

    this.logBenchmarkResult(result);

    return result;
  }

  /**
   * Run location management benchmark suite
   */
  static async runLocationManagementBenchmarks(
    yardId: string,
    stackId: string,
    locationId: string
  ): Promise<BenchmarkSuite> {
    logger.info('Starting location management performance benchmark suite', 'PerformanceBenchmark');

    const results: BenchmarkResult[] = [];
    const startTime = Date.now();

    // Benchmark 1: Get location by ID
    results.push(
      await this.runBenchmark(
        'getLocationById',
        () => locationManagementService.getById(locationId),
        100,
        DatabaseOptimizationConfig.performanceBenchmarks.getLocationById
      )
    );

    // Benchmark 2: Get available locations
    results.push(
      await this.runBenchmark(
        'getAvailableLocations',
        () => locationManagementService.getAvailableLocations({ yardId }),
        50,
        DatabaseOptimizationConfig.performanceBenchmarks.getAvailableLocations
      )
    );

    // Benchmark 3: Get yard statistics
    results.push(
      await this.runBenchmark(
        'getYardStatistics',
        () => locationManagementService.getYardStatistics(yardId),
        50,
        DatabaseOptimizationConfig.performanceBenchmarks.getYardStatistics
      )
    );

    // Benchmark 4: Get stack locations
    results.push(
      await this.runBenchmark(
        'getByStackId',
        () => locationManagementService.getByStackId(stackId),
        100,
        DatabaseOptimizationConfig.performanceBenchmarks.getLocationById
      )
    );

    // Benchmark 5: Get availability summary
    results.push(
      await this.runBenchmark(
        'getAvailabilitySummary',
        () => locationManagementService.getAvailabilitySummary(yardId),
        50,
        DatabaseOptimizationConfig.performanceBenchmarks.getAvailableLocations
      )
    );

    const totalDuration = Date.now() - startTime;
    const passedCount = results.filter(r => r.passedBenchmark).length;
    const overallPassRate = (passedCount / results.length) * 100;

    const suite: BenchmarkSuite = {
      suiteName: 'Location Management Benchmarks',
      results,
      overallPassRate,
      totalDuration,
    };

    this.logBenchmarkSuite(suite);

    return suite;
  }

  /**
   * Run cache performance benchmark
   */
  static async runCacheBenchmark(
    yardId: string,
    iterations: number = 100
  ): Promise<{
    withoutCache: BenchmarkResult;
    withCache: BenchmarkResult;
    cacheSpeedup: number;
  }> {
    logger.info('Starting cache performance benchmark', 'PerformanceBenchmark');

    // Clear cache first
    await locationManagementService.clearAllCaches();

    // Benchmark without cache (first run)
    logger.info('Testing without cache (cold start)', 'PerformanceBenchmark');
    const withoutCache = await this.runBenchmark(
      'getAvailableLocations (no cache)',
      () => locationManagementService.getAvailableLocations({ yardId }),
      iterations,
      DatabaseOptimizationConfig.performanceBenchmarks.getAvailableLocations
    );

    // Warm up cache
    await locationManagementService.warmYardCache(yardId);

    // Benchmark with cache
    logger.info('Testing with cache (warm start)', 'PerformanceBenchmark');
    const withCache = await this.runBenchmark(
      'getAvailableLocations (with cache)',
      () => locationManagementService.getAvailableLocations({ yardId }),
      iterations,
      DatabaseOptimizationConfig.performanceBenchmarks.getAvailableLocations / 2 // Expect 2x speedup
    );

    const cacheSpeedup = withoutCache.avgDuration / withCache.avgDuration;

    logger.info('Cache benchmark completed', 'PerformanceBenchmark', {
      cacheSpeedup: cacheSpeedup.toFixed(2),
      targetHitRate: DatabaseOptimizationConfig.performanceBenchmarks.cacheHitRate
    });

    return {
      withoutCache,
      withCache,
      cacheSpeedup,
    };
  }

  /**
   * Run concurrent operations benchmark
   */
  static async runConcurrencyBenchmark(
    yardId: string,
    concurrentRequests: number = 50
  ): Promise<BenchmarkResult> {
    logger.info('Starting concurrency benchmark', 'PerformanceBenchmark', { concurrentRequests });

    const startTime = Date.now();
    const promises: Promise<any>[] = [];

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        locationManagementService.getAvailableLocations({ yardId })
      );
    }

    try {
      await Promise.all(promises);
      const duration = Date.now() - startTime;

      const result: BenchmarkResult = {
        operation: `${concurrentRequests} concurrent getAvailableLocations`,
        iterations: concurrentRequests,
        totalDuration: duration,
        avgDuration: duration / concurrentRequests,
        minDuration: 0,
        maxDuration: duration,
        p50: duration / concurrentRequests,
        p95: duration / concurrentRequests,
        p99: duration / concurrentRequests,
        successRate: 100,
        passedBenchmark: duration < 5000, // Should complete within 5 seconds
        targetDuration: 5000,
      };

      this.logBenchmarkResult(result);

      return result;
    } catch (error) {
      logger.error('Concurrency benchmark failed', 'PerformanceBenchmark', error);
      throw error;
    }
  }

  /**
   * Log benchmark result
   */
  private static logBenchmarkResult(result: BenchmarkResult): void {
    const status = result.passedBenchmark ? 'PASS' : 'FAIL';
    
    logger.info(`Benchmark ${status}: ${result.operation}`, 'PerformanceBenchmark', {
      iterations: result.iterations,
      avgMs: result.avgDuration.toFixed(2),
      targetMs: result.targetDuration,
      minMs: result.minDuration,
      maxMs: result.maxDuration,
      p50Ms: result.p50,
      p95Ms: result.p95,
      p99Ms: result.p99,
      successRate: result.successRate.toFixed(2)
    });
  }

  /**
   * Log benchmark suite results
   */
  private static logBenchmarkSuite(suite: BenchmarkSuite): void {
    const passedCount = suite.results.filter(r => r.passedBenchmark).length;
    
    logger.info('Benchmark suite summary', 'PerformanceBenchmark', {
      suite: suite.suiteName,
      totalDurationSeconds: (suite.totalDuration / 1000).toFixed(2),
      overallPassRate: suite.overallPassRate.toFixed(2),
      testsPassed: `${passedCount}/${suite.results.length}`
    });

    // Show failed tests
    const failedTests = suite.results.filter(r => !r.passedBenchmark);
    if (failedTests.length > 0) {
      failedTests.forEach(test => {
        logger.warn(`Benchmark test failed: ${test.operation}`, 'PerformanceBenchmark', {
          avgMs: test.avgDuration.toFixed(2),
          targetMs: test.targetDuration
        });
      });
    }
  }

  /**
   * Generate benchmark report
   */
  static generateReport(suite: BenchmarkSuite): string {
    let report = '\n=== PERFORMANCE BENCHMARK REPORT ===\n\n';
    
    report += `Suite: ${suite.suiteName}\n`;
    report += `Total Duration: ${(suite.totalDuration / 1000).toFixed(2)}s\n`;
    report += `Overall Pass Rate: ${suite.overallPassRate.toFixed(2)}%\n`;
    report += `Tests Passed: ${suite.results.filter(r => r.passedBenchmark).length}/${suite.results.length}\n\n`;

    report += '=== DETAILED RESULTS ===\n\n';
    
    suite.results.forEach(result => {
      const status = result.passedBenchmark ? '✅ PASS' : '❌ FAIL';
      report += `${status} ${result.operation}\n`;
      report += `  Iterations: ${result.iterations}\n`;
      report += `  Avg: ${result.avgDuration.toFixed(2)}ms (target: ${result.targetDuration}ms)\n`;
      report += `  Min: ${result.minDuration}ms, Max: ${result.maxDuration}ms\n`;
      report += `  P50: ${result.p50}ms, P95: ${result.p95}ms, P99: ${result.p99}ms\n`;
      report += `  Success Rate: ${result.successRate.toFixed(2)}%\n\n`;
    });

    report += '====================================\n';

    return report;
  }
}

export default PerformanceBenchmark;
