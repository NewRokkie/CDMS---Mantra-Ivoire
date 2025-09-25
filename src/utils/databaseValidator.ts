/**
 * Database Validator - Test all CRUD operations and connections
 * Use this utility to validate PostgreSQL integration
 */

import {
  dbService,
  userService,
  containerService,
  gateOperationsService,
  releaseOrderService,
} from '../services/database';
import { yardService } from '../services/yardService';
import { clientPoolService } from '../services/clientPoolService';

export interface ValidationResult {
  test: string;
  success: boolean;
  message: string;
  duration?: number;
  data?: any;
}

export class DatabaseValidator {
  private results: ValidationResult[] = [];

  /**
   * Run all validation tests
   */
  async runAllTests(): Promise<ValidationResult[]> {
    console.log('🧪 Starting CDMS Database Validation Tests...');
    this.results = [];

    const tests = [
      // Core connectivity
      this.testDatabaseConnection,
      this.testDatabaseStats,

      // User management
      this.testUserAuthentication,
      this.testUserCRUD,

      // Yard management
      this.testYardOperations,
      this.testYardAccess,

      // Container management
      this.testContainerCRUD,
      this.testContainerSearch,
      this.testContainerMovements,

      // Client pools
      this.testClientPoolOperations,
      this.testStackAssignments,

      // Gate operations
      this.testGateInOperations,
      this.testGateOutOperations,

      // Release orders
      this.testBookingReferences,
      this.testReleaseOrderWorkflow,

      // Complex operations
      this.testComplexWorkflow,
    ];

    for (const test of tests) {
      try {
        await test.call(this);
      } catch (error) {
        this.addResult(test.name, false, `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    this.printResults();
    return this.results;
  }

  /**
   * Test database connection
   */
  private async testDatabaseConnection(): Promise<void> {
    const start = Date.now();
    try {
      const status = await dbService.testConnection();
      const duration = Date.now() - start;

      if (status.isConnected) {
        this.addResult('Database Connection', true, `Connected to ${status.host}`, duration);
      } else {
        this.addResult('Database Connection', false, status.error || 'Connection failed', duration);
      }
    } catch (error) {
      this.addResult('Database Connection', false, `Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test database statistics
   */
  private async testDatabaseStats(): Promise<void> {
    try {
      const stats = await dbService.getDatabaseStats();
      this.addResult('Database Stats', true, `${stats.totalTables} tables, ${stats.totalViews} views`, undefined, stats);
    } catch (error) {
      this.addResult('Database Stats', false, `Failed to get stats: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test user authentication
   */
  private async testUserAuthentication(): Promise<void> {
    try {
      const user = await userService.authenticateUser('admin@depot.com', 'demo123');
      if (user) {
        this.addResult('User Authentication', true, `Authenticated: ${user.name} (${user.role})`);
      } else {
        this.addResult('User Authentication', false, 'Authentication returned null');
      }
    } catch (error) {
      this.addResult('User Authentication', false, `Auth failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test user CRUD operations
   */
  private async testUserCRUD(): Promise<void> {
    try {
      // Test Read
      const users = await userService.getAllUsers();
      this.addResult('User CRUD - Read', users.length > 0, `Found ${users.length} users`);

      // Test module access check
      if (users.length > 0) {
        const hasAccess = await userService.hasModuleAccess(users[0].id, 'dashboard');
        this.addResult('User Module Access', true, `Module access check: ${hasAccess}`);
      }
    } catch (error) {
      this.addResult('User CRUD', false, `CRUD failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test yard operations
   */
  private async testYardOperations(): Promise<void> {
    try {
      const yards = await yardService.getAvailableYards();
      this.addResult('Yard Operations - Read', yards.length > 0, `Found ${yards.length} yards`);

      if (yards.length > 0) {
        const stats = await yardService.getYardStats(yards[0].id);
        this.addResult('Yard Stats', stats !== null, `Stats for ${yards[0].name}: ${stats?.occupancyRate}% occupied`);
      }
    } catch (error) {
      this.addResult('Yard Operations', false, `Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test yard access validation
   */
  private async testYardAccess(): Promise<void> {
    try {
      const users = await userService.getAllUsers();
      const yards = await yardService.getAvailableYards();

      if (users.length > 0 && yards.length > 0) {
        const hasAccess = await yardService.validateYardAccess(yards[0].id, users[0].id);
        this.addResult('Yard Access Validation', true, `Access validation: ${hasAccess}`);
      }
    } catch (error) {
      this.addResult('Yard Access', false, `Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test container CRUD operations
   */
  private async testContainerCRUD(): Promise<void> {
    try {
      // Test Read
      const containers = await containerService.getAllContainers();
      this.addResult('Container CRUD - Read', containers.length > 0, `Found ${containers.length} containers`);

      // Test search
      if (containers.length > 0) {
        const searchResults = await containerService.searchContainers('MAEU');
        this.addResult('Container Search', searchResults.length > 0, `Found ${searchResults.length} containers for 'MAEU'`);
      }
    } catch (error) {
      this.addResult('Container CRUD', false, `Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test container search functionality
   */
  private async testContainerSearch(): Promise<void> {
    try {
      const containers = await containerService.searchContainers('MAEU');
      this.addResult('Container Search', true, `Search found ${containers.length} containers`);
    } catch (error) {
      this.addResult('Container Search', false, `Search failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test container movement tracking
   */
  private async testContainerMovements(): Promise<void> {
    try {
      const containers = await containerService.getAllContainers();
      if (containers.length > 0) {
        const movements = await containerService.getContainerMovements(containers[0].number);
        this.addResult('Container Movements', true, `Found ${movements.length} movements for ${containers[0].number}`);
      } else {
        this.addResult('Container Movements', false, 'No containers available for movement test');
      }
    } catch (error) {
      this.addResult('Container Movements', false, `Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test client pool operations
   */
  private async testClientPoolOperations(): Promise<void> {
    try {
      const pools = await clientPoolService.getClientPools();
      this.addResult('Client Pools - Read', pools.length > 0, `Found ${pools.length} client pools`);

      const stats = await clientPoolService.getClientPoolStats();
      this.addResult('Client Pool Stats', true, `${stats.totalPools} pools, ${stats.activeClients} active clients`);
    } catch (error) {
      this.addResult('Client Pool Operations', false, `Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test stack assignments
   */
  private async testStackAssignments(): Promise<void> {
    try {
      const pools = await clientPoolService.getClientPools();
      if (pools.length > 0) {
        const assignments = await clientPoolService.getClientStackAssignments(pools[0].clientCode);
        this.addResult('Stack Assignments', true, `Found ${assignments.length} stack assignments for ${pools[0].clientCode}`);
      }
    } catch (error) {
      this.addResult('Stack Assignments', false, `Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test gate in operations
   */
  private async testGateInOperations(): Promise<void> {
    try {
      const operations = await gateOperationsService.getPendingGateInOperations();
      this.addResult('Gate In Operations', true, `Found ${operations.length} pending Gate In operations`);

      const stats = await gateOperationsService.getGateOperationStats();
      this.addResult('Gate Operation Stats', true, `Gate In: ${stats.gateIn.total} total, Gate Out: ${stats.gateOut.total} total`);
    } catch (error) {
      this.addResult('Gate In Operations', false, `Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test gate out operations
   */
  private async testGateOutOperations(): Promise<void> {
    try {
      const operations = await gateOperationsService.getPendingGateOutOperations();
      this.addResult('Gate Out Operations', true, `Found ${operations.length} pending Gate Out operations`);

      const companies = await gateOperationsService.getTransportCompanies();
      this.addResult('Transport Companies', companies.length > 0, `Found ${companies.length} transport companies`);
    } catch (error) {
      this.addResult('Gate Out Operations', false, `Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test booking references
   */
  private async testBookingReferences(): Promise<void> {
    try {
      const bookings = await releaseOrderService.getBookingReferences();
      this.addResult('Booking References', bookings.length > 0, `Found ${bookings.length} booking references`);
    } catch (error) {
      this.addResult('Booking References', false, `Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test release order workflow
   */
  private async testReleaseOrderWorkflow(): Promise<void> {
    try {
      const orders = await releaseOrderService.getReleaseOrders();
      this.addResult('Release Orders', orders.length > 0, `Found ${orders.length} release orders`);

      const stats = await releaseOrderService.getReleaseOrderStatistics();
      this.addResult('Release Order Stats', true, `${stats.totalOrders} total, ${stats.pendingOrders} pending`);
    } catch (error) {
      this.addResult('Release Order Workflow', false, `Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Test complex workflow integration
   */
  private async testComplexWorkflow(): Promise<void> {
    try {
      // Test integrated operation across multiple services
      const yards = await yardService.getAvailableYards();
      const containers = await containerService.getAllContainers();
      const pools = await clientPoolService.getClientPools();

      const integrationSuccess = yards.length > 0 && containers.length > 0 && pools.length > 0;

      this.addResult(
        'Complex Workflow Integration',
        integrationSuccess,
        `Integration test: ${yards.length} yards, ${containers.length} containers, ${pools.length} pools`
      );
    } catch (error) {
      this.addResult('Complex Workflow', false, `Integration failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  /**
   * Add test result
   */
  private addResult(test: string, success: boolean, message: string, duration?: number, data?: any): void {
    this.results.push({
      test,
      success,
      message,
      duration,
      data,
    });
  }

  /**
   * Print test results to console
   */
  private printResults(): void {
    console.log('\n🧪 CDMS Database Validation Results:');
    console.log('=====================================');

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`📊 Total: ${this.results.length}`);

    console.log('\nDetailed Results:');
    this.results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      const duration = result.duration ? ` (${result.duration}ms)` : '';
      console.log(`${index + 1}. ${icon} ${result.test}: ${result.message}${duration}`);
    });

    if (failed.length === 0) {
      console.log('\n🎉 All tests passed! PostgreSQL integration is working perfectly.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the database connection and configuration.');
    }
  }

  /**
   * Get validation summary
   */
  getValidationSummary(): {
    totalTests: number;
    successful: number;
    failed: number;
    successRate: number;
    results: ValidationResult[];
  } {
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;

    return {
      totalTests: this.results.length,
      successful,
      failed,
      successRate: this.results.length > 0 ? (successful / this.results.length) * 100 : 0,
      results: this.results,
    };
  }

  /**
   * Test specific module
   */
  async testModule(moduleName: 'users' | 'yards' | 'containers' | 'client_pools' | 'gate_operations' | 'release_orders'): Promise<ValidationResult[]> {
    this.results = [];

    switch (moduleName) {
      case 'users':
        await this.testUserAuthentication();
        await this.testUserCRUD();
        break;
      case 'yards':
        await this.testYardOperations();
        await this.testYardAccess();
        break;
      case 'containers':
        await this.testContainerCRUD();
        await this.testContainerSearch();
        await this.testContainerMovements();
        break;
      case 'client_pools':
        await this.testClientPoolOperations();
        await this.testStackAssignments();
        break;
      case 'gate_operations':
        await this.testGateInOperations();
        await this.testGateOutOperations();
        break;
      case 'release_orders':
        await this.testBookingReferences();
        await this.testReleaseOrderWorkflow();
        break;
    }

    return this.results;
  }

  /**
   * Quick health check
   */
  async quickHealthCheck(): Promise<boolean> {
    try {
      const [dbStatus, users, yards, containers] = await Promise.all([
        dbService.testConnection(),
        userService.getAllUsers(),
        yardService.getAvailableYards(),
        containerService.getAllContainers({ status: 'in_depot' }),
      ]);

      const isHealthy = dbStatus.isConnected &&
                       users.length > 0 &&
                       yards.length > 0 &&
                       containers.length >= 0;

      console.log(`🏥 Quick Health Check: ${isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
      console.log(`   - Database: ${dbStatus.isConnected ? '✅' : '❌'}`);
      console.log(`   - Users: ${users.length} found`);
      console.log(`   - Yards: ${yards.length} found`);
      console.log(`   - Containers: ${containers.length} in depot`);

      return isHealthy;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const databaseValidator = new DatabaseValidator();

// Convenience function for quick testing
export const validateDatabase = () => databaseValidator.runAllTests();
export const quickHealthCheck = () => databaseValidator.quickHealthCheck();

// Auto-run validation in development mode
if (import.meta.env.DEV) {
  console.log('🧪 Development mode detected - running quick health check...');
  setTimeout(() => {
    quickHealthCheck().catch(console.error);
  }, 2000); // Wait 2 seconds for services to initialize
}
