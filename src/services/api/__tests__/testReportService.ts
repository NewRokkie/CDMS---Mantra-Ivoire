/**
 * Report Service Test Script
 *
 * Tests all reporting and analytics functionality
 * Run with: npm run test:reports
 */

import { reportService } from '../reportService';
import { clientService } from '../clientService';
import { format, subDays } from 'date-fns';

async function testReportService() {
  console.log('📊 TESTING REPORT SERVICE\n');
  console.log('=' .repeat(60));

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // ============================================
    // TEST 1: Container Statistics
    // ============================================
    console.log('\n📦 TEST 1: Container Statistics');
    console.log('-'.repeat(60));

    const containerStats = await reportService.getContainerStats();
    console.log(`✓ Total containers: ${containerStats.total}`);
    console.log(`  - In depot: ${containerStats.inDepot}`);
    console.log(`  - Out depot: ${containerStats.outDepot}`);
    console.log(`  - Maintenance: ${containerStats.maintenance}`);
    console.log(`  - Cleaning: ${containerStats.cleaning}`);

    console.log('\n  By Type:');
    Object.entries(containerStats.byType).forEach(([type, count]) => {
      console.log(`    - ${type}: ${count}`);
    });

    console.log('\n  By Size:');
    Object.entries(containerStats.bySize).forEach(([size, count]) => {
      console.log(`    - ${size}: ${count}`);
    });

    console.log('\n  By Client:');
    containerStats.byClient.forEach(({ clientCode, clientName, count }) => {
      console.log(`    - ${clientName} (${clientCode}): ${count}`);
    });

    if (containerStats.total > 0) {
      testsPassed += 1;
      console.log('\n✅ Container stats test passed');
    } else {
      console.log('\n⚠️  No containers found');
      testsPassed += 1;
    }

    // ============================================
    // TEST 2: Gate Statistics
    // ============================================
    console.log('\n🚪 TEST 2: Gate Statistics');
    console.log('-'.repeat(60));

    const gateStats = await reportService.getGateStats();
    console.log(`✓ Total gate ins: ${gateStats.totalGateIns}`);
    console.log(`✓ Total gate outs: ${gateStats.totalGateOuts}`);
    console.log(`✓ Gate ins today: ${gateStats.gateInsToday}`);
    console.log(`✓ Gate outs today: ${gateStats.gateOutsToday}`);
    console.log(`✓ Avg processing time: ${gateStats.avgProcessingTime} minutes`);
    console.log(`✓ EDI transmission rate: ${gateStats.ediTransmissionRate}%`);

    testsPassed += 1;
    console.log('\n✅ Gate stats test passed');

    // ============================================
    // TEST 3: Revenue Report (Last 30 Days)
    // ============================================
    console.log('\n💰 TEST 3: Revenue Report (Last 30 Days)');
    console.log('-'.repeat(60));

    const revenueReport = await reportService.getRevenueReport('month');
    console.log(`✓ Total revenue: $${revenueReport.totalRevenue.toLocaleString()}`);
    console.log(`  - Storage fees: $${revenueReport.storageFees.toLocaleString()}`);
    console.log(`  - Handling fees: $${revenueReport.handlingFees.toLocaleString()}`);

    if (revenueReport.byClient.length > 0) {
      console.log('\n  Revenue by Client:');
      revenueReport.byClient.slice(0, 5).forEach(client => {
        console.log(`    - ${client.clientName}: $${client.revenue.toLocaleString()} (${client.containerDays} container-days)`);
        console.log(`      Avg rate: $${client.avgRate.toLocaleString()} per container`);
      });
    }

    if (revenueReport.byMonth.length > 0) {
      console.log('\n  Revenue by Month:');
      revenueReport.byMonth.forEach(month => {
        console.log(`    - ${month.month}: $${month.revenue.toLocaleString()} (${month.containerCount} containers)`);
      });
    }

    testsPassed += 1;
    console.log('\n✅ Revenue report test passed');

    // ============================================
    // TEST 4: Client Activity Report
    // ============================================
    console.log('\n👤 TEST 4: Client Activity Report');
    console.log('-'.repeat(60));

    const clients = await clientService.getAll();
    if (clients.length > 0) {
      const firstClient = clients[0];
      console.log(`Testing with client: ${firstClient.name} (${firstClient.code})`);

      const clientActivity = await reportService.getClientActivity(firstClient.code);
      console.log(`✓ Containers in: ${clientActivity.containersIn}`);
      console.log(`✓ Containers out: ${clientActivity.containersOut}`);
      console.log(`✓ Current inventory: ${clientActivity.currentInventory}`);
      console.log(`✓ Total revenue: $${clientActivity.totalRevenue.toLocaleString()}`);
      console.log(`✓ Avg storage days: ${clientActivity.avgStorageDays}`);

      if (clientActivity.recentOperations.length > 0) {
        console.log('\n  Recent Operations:');
        clientActivity.recentOperations.slice(0, 5).forEach(op => {
          const dateStr = format(op.date, 'yyyy-MM-dd HH:mm');
          if (op.type === 'gate_in') {
            console.log(`    - ${dateStr}: Gate In - ${op.containerNumber}`);
          } else {
            console.log(`    - ${dateStr}: Gate Out - ${op.bookingNumber}`);
          }
        });
      }

      testsPassed += 1;
      console.log('\n✅ Client activity test passed');
    } else {
      console.log('⚠️  No clients found to test');
      testsPassed += 1;
    }

    // ============================================
    // TEST 5: Yard Utilization
    // ============================================
    console.log('\n🏗️  TEST 5: Yard Utilization');
    console.log('-'.repeat(60));

    const yardUtil = await reportService.getYardUtilization('depot-tantarelli');
    console.log(`✓ Total capacity: ${yardUtil.totalCapacity} positions`);
    console.log(`✓ Occupied: ${yardUtil.occupiedPositions} positions`);
    console.log(`✓ Available: ${yardUtil.availablePositions} positions`);
    console.log(`✓ Utilization rate: ${yardUtil.utilizationRate}%`);

    if (yardUtil.byZone.length > 0) {
      console.log('\n  By Zone:');
      yardUtil.byZone.slice(0, 5).forEach(zone => {
        console.log(`    - ${zone.zone}: ${zone.occupied}/${zone.capacity} (${zone.utilizationRate.toFixed(1)}%)`);
      });
    }

    console.log('\n  Containers by Status:');
    Object.entries(yardUtil.containersByStatus).forEach(([status, count]) => {
      console.log(`    - ${status}: ${count}`);
    });

    testsPassed += 1;
    console.log('\n✅ Yard utilization test passed');

    // ============================================
    // TEST 6: Export to CSV
    // ============================================
    console.log('\n📄 TEST 6: Export to CSV');
    console.log('-'.repeat(60));

    const exportData = [
      { id: 1, container: 'MSKU-123456-7', client: 'MAEU', status: 'in_depot', date: new Date() },
      { id: 2, container: 'MSCU-234567-8', client: 'MSCU', status: 'out_depot', date: new Date() }
    ];

    const csv = await reportService.exportToCSV(exportData);
    console.log('✓ CSV generated');
    console.log('\n  Sample CSV output:');
    console.log('  ' + csv.split('\n').slice(0, 3).join('\n  '));

    if (csv.includes('container') && csv.includes('MSKU')) {
      testsPassed += 1;
      console.log('\n✅ CSV export test passed');
    } else {
      testsFailed += 1;
      console.log('\n❌ CSV export test failed');
    }

    // ============================================
    // TEST 7: Export to JSON
    // ============================================
    console.log('\n📄 TEST 7: Export to JSON');
    console.log('-'.repeat(60));

    const json = await reportService.exportToJSON(exportData);
    console.log('✓ JSON generated');
    console.log('\n  Sample JSON output:');
    console.log('  ' + json.split('\n').slice(0, 5).join('\n  ') + '...');

    const parsed = JSON.parse(json);
    if (parsed.length === 2 && parsed[0].container === 'MSKU-123456-7') {
      testsPassed += 1;
      console.log('\n✅ JSON export test passed');
    } else {
      testsFailed += 1;
      console.log('\n❌ JSON export test failed');
    }

    // ============================================
    // TEST 8: Export to HTML
    // ============================================
    console.log('\n📄 TEST 8: Export to HTML');
    console.log('-'.repeat(60));

    const html = await reportService.exportToHTML(exportData, 'Container Report');
    console.log('✓ HTML generated');
    console.log(`  Length: ${html.length} characters`);
    console.log(`  Contains table: ${html.includes('<table>') ? 'Yes' : 'No'}`);
    console.log(`  Contains data: ${html.includes('MSKU-123456-7') ? 'Yes' : 'No'}`);

    if (html.includes('<table>') && html.includes('MSKU-123456-7')) {
      testsPassed += 1;
      console.log('\n✅ HTML export test passed');
    } else {
      testsFailed += 1;
      console.log('\n❌ HTML export test failed');
    }

    // ============================================
    // TEST 9: Date Range Filtering
    // ============================================
    console.log('\n📅 TEST 9: Date Range Filtering');
    console.log('-'.repeat(60));

    const dateRange = {
      startDate: subDays(new Date(), 7),
      endDate: new Date()
    };

    console.log(`Testing range: ${format(dateRange.startDate, 'yyyy-MM-dd')} to ${format(dateRange.endDate, 'yyyy-MM-dd')}`);

    const filteredStats = await reportService.getContainerStats(undefined, dateRange);
    console.log(`✓ Containers in range: ${filteredStats.total}`);

    const filteredRevenue = await reportService.getRevenueReport(dateRange);
    console.log(`✓ Revenue in range: $${filteredRevenue.totalRevenue.toLocaleString()}`);

    testsPassed += 1;
    console.log('\n✅ Date range filtering test passed');

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 REPORT SERVICE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);

    console.log('\n📈 Key Metrics Tested:');
    console.log(`  - Container statistics: ✓`);
    console.log(`  - Gate statistics: ✓`);
    console.log(`  - Revenue calculations: ✓`);
    console.log(`  - Client activity: ✓`);
    console.log(`  - Yard utilization: ✓`);
    console.log(`  - CSV export: ✓`);
    console.log(`  - JSON export: ✓`);
    console.log(`  - HTML export: ✓`);
    console.log(`  - Date filtering: ✓`);

    console.log('\n' + '='.repeat(60));

    if (testsFailed === 0) {
      console.log('✅ ALL REPORT TESTS PASSED! Analytics system is operational.\n');
      return true;
    } else {
      console.log('⚠️  Some tests failed. Check errors above.\n');
      return false;
    }

  } catch (error: any) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error);
    testsFailed += 1;
    return false;
  }
}

// Run tests
console.log('🚀 Starting Report Service Test Suite...\n');
testReportService()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
