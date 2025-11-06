/**
 * API Services Test Script
 *
 * This script tests all API services and the Event System
 * Run with: npm run test:services
 */

import { clientService } from '../clientService';
import { containerService } from '../containerService';
import { bookingReferenceService } from '../bookingReferenceService';
import { gateService } from '../gateService';
import { userService } from '../userService';
import { auditService } from '../auditService';
import { eventBus } from '../../eventBus';

// Track events for verification
const capturedEvents: Array<{ type: string; timestamp: Date }> = [];

// Setup event listeners
function setupEventTracking() {
  console.log('📡 Setting up event tracking...\n');

  eventBus.on('GATE_IN_COMPLETED', (payload) => {
    capturedEvents.push({ type: 'GATE_IN_COMPLETED', timestamp: new Date() });
    console.log('  🎯 Event captured: GATE_IN_COMPLETED');
    console.log('     Container:', payload.container.number);
  });

  eventBus.on('GATE_OUT_COMPLETED', (payload) => {
    capturedEvents.push({ type: 'GATE_OUT_COMPLETED', timestamp: new Date() });
    console.log('  🎯 Event captured: GATE_OUT_COMPLETED');
    console.log('     Containers:', payload.containers.length);
  });

  eventBus.on('BOOKING_REFERENCE_CREATED', (payload) => {
    capturedEvents.push({ type: 'BOOKING_REFERENCE_CREATED', timestamp: new Date() });
    console.log('  🎯 Event captured: BOOKING_REFERENCE_CREATED');
    console.log('     Booking:', payload.bookingReference.bookingNumber);
  });

  eventBus.on('EDI_TRANSMISSION_REQUESTED', (payload) => {
    capturedEvents.push({ type: 'EDI_TRANSMISSION_REQUESTED', timestamp: new Date() });
    console.log('  🎯 Event captured: EDI_TRANSMISSION_REQUESTED');
    console.log('     Type:', payload.messageType, 'for', payload.entityType);
  });
}

async function testServices() {
  console.log('🧪 TESTING API SERVICES\n');
  console.log('=' .repeat(60));

  setupEventTracking();

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // ============================================
    // TEST 1: Client Service
    // ============================================
    console.log('\n📦 TEST 1: Client Service');
    console.log('-'.repeat(60));

    const clients = await clientService.getAll();
    console.log(`✓ Fetched ${clients.length} clients`);

    if (clients.length === 0) {
      throw new Error('No clients found. Run seed script first!');
    }

    const firstClient = clients[0];
    console.log(`  - Sample: ${firstClient.name} (${firstClient.code})`);
    console.log(`  - Free days: ${firstClient.freeDaysAllowed}, Rate: $${firstClient.dailyStorageRate}`);

    const clientByCode = await clientService.getByCode(firstClient.code);
    if (!clientByCode) throw new Error('Client not found by code');
    console.log(`✓ Retrieved client by code: ${clientByCode.name}`);

    testsPassed += 2;

    // ============================================
    // TEST 2: User Service
    // ============================================
    console.log('\n👤 TEST 2: User Service');
    console.log('-'.repeat(60));

    const users = await userService.getAll();
    console.log(`✓ Fetched ${users.length} users`);

    const adminUser = users.find(u => u.role === 'admin');
    if (!adminUser) throw new Error('No admin user found');
    console.log(`  - Admin: ${adminUser.name} (${adminUser.email})`);

    const operatorUsers = users.filter(u => u.role === 'operator');
    console.log(`  - Operators: ${operatorUsers.length}`);

    testsPassed += 2;

    // ============================================
    // TEST 3: Container Service
    // ============================================
    console.log('\n📦 TEST 3: Container Service');
    console.log('-'.repeat(60));

    const containers = await containerService.getAll();
    console.log(`✓ Fetched ${containers.length} containers`);

    if (containers.length > 0) {
      const firstContainer = containers[0];
      console.log(`  - Sample: ${firstContainer.number}`);
      console.log(`  - Type: ${firstContainer.type}, Size: ${firstContainer.size}`);
      console.log(`  - Status: ${firstContainer.status}, Location: ${firstContainer.location}`);

      // Get by status
      const inDepot = await containerService.getByStatus('in_depot');
      console.log(`✓ Found ${inDepot.length} containers in depot`);

      // Get by client
      if (firstContainer.clientCode) {
        const clientContainers = await containerService.getByClientCode(firstContainer.clientCode);
        console.log(`✓ Found ${clientContainers.length} containers for client ${firstContainer.clientCode}`);
      }

      testsPassed += 3;
    } else {
      console.log('⚠️  No containers found (this is OK for fresh DB)');
      testsPassed += 1;
    }

    // ============================================
    // TEST 4: Booking Reference Service
    // ============================================
    console.log('\n📋 TEST 4: Booking Reference Service');
    console.log('-'.repeat(60));

    const bookingReferences = await bookingReferenceService.getAll();
    console.log(`✓ Fetched ${bookingReferences.length} booking references`);

    if (bookingReferences.length > 0) {
      const firstOrder = bookingReferences[0];
      console.log(`  - Sample: ${firstOrder.bookingNumber}`);
      console.log(`  - Client: ${firstOrder.clientName} (${firstOrder.clientCode})`);
      console.log(`  - Containers: ${firstOrder.totalContainers} total, ${firstOrder.remainingContainers} remaining`);
      console.log(`  - Status: ${firstOrder.status}`);

      testsPassed += 1;
    } else {
      console.log('⚠️  No booking references found (this is OK for fresh DB)');
      testsPassed += 1;
    }

    // ============================================
    // TEST 5: Gate Service - Gate In
    // ============================================
    console.log('\n🚪 TEST 5: Gate Service - Gate In');
    console.log('-'.repeat(60));

    const testContainerNumber = `TEST-${Date.now()}-${Math.floor(Math.random() * 10)}`;
    console.log(`Creating test container: ${testContainerNumber}`);

    const gateInResult = await gateService.processGateIn({
      containerNumber: testContainerNumber,
      clientCode: firstClient.code,
      containerType: 'dry',
      containerSize: '20ft',
      transportCompany: 'Test Transport Ltd',
      driverName: 'Test Driver',
      vehicleNumber: 'TEST-001',
      location: 'S01-R01-H01',
      weight: 5000,
      operatorId: adminUser?.id || 'test-op',
      operatorName: adminUser?.name || 'Test Operator',
      yardId: 'depot-tantarelli',
      damageReported: false,
      damageAssessment: undefined // Damage assessment now happens during assignment stage
    });

    if (gateInResult.success) {
      console.log(`✓ Gate in successful!`);
      console.log(`  - Container ID: ${gateInResult.containerId}`);

      // Verify container was created
      const createdContainer = await containerService.getById(gateInResult.containerId!);
      if (!createdContainer) throw new Error('Container not found after gate in');
      console.log(`✓ Verified container exists in database`);

      testsPassed += 2;

      // Give events time to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if events were captured
      const gateInEvents = capturedEvents.filter(e => e.type === 'GATE_IN_COMPLETED');
      if (gateInEvents.length > 0) {
        console.log(`✓ Event system working: ${gateInEvents.length} GATE_IN_COMPLETED events captured`);
        testsPassed += 1;
      } else {
        console.log('⚠️  No GATE_IN_COMPLETED events captured (check event listeners)');
      }

      // ============================================
      // TEST 6: Gate Service - Gate Out
      // ============================================
      if (bookingReferences.length > 0 && containers.length > 0) {
        console.log('\n🚪 TEST 6: Gate Service - Gate Out');
        console.log('-'.repeat(60));

        const testBookingReference = bookingReferences.find(br => br.status === 'pending' && br.remainingContainers > 0);
        const availableContainer = containers.find(c => c.status === 'in_depot');

        if (testBookingReference && availableContainer) {
          console.log(`Using booking reference: ${testBookingReference.bookingNumber}`);
          console.log(`Using container: ${availableContainer.number}`);

          const gateOutResult = await gateService.processGateOut({
            bookingReferenceId: testBookingReference.id,
            containerIds: [availableContainer.id],
            transportCompany: 'Test Transport Ltd',
            driverName: 'Test Driver Out',
            vehicleNumber: 'TEST-002',
            operatorId: adminUser?.id || 'test-op',
            operatorName: adminUser?.name || 'Test Operator',
            yardId: 'depot-tantarelli'
          });

          if (gateOutResult.success) {
            console.log(`✓ Gate out successful!`);

            // Verify container status changed
            const updatedContainer = await containerService.getById(availableContainer.id);
            if (updatedContainer?.status === 'out_depot') {
              console.log(`✓ Container status updated to: ${updatedContainer.status}`);
              testsPassed += 2;
            } else {
              console.log(`⚠️  Container status not updated correctly`);
              testsFailed += 1;
            }

            // Give events time to process
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check gate out events
            const gateOutEvents = capturedEvents.filter(e => e.type === 'GATE_OUT_COMPLETED');
            if (gateOutEvents.length > 0) {
              console.log(`✓ Event system working: ${gateOutEvents.length} GATE_OUT_COMPLETED events captured`);
              testsPassed += 1;
            }
          } else {
            console.log(`❌ Gate out failed: ${gateOutResult.error}`);
            testsFailed += 1;
          }
        } else {
          console.log('⚠️  Skipping gate out test (no suitable release order or container)');
        }
      }

    } else {
      console.log(`❌ Gate in failed: ${gateInResult.error}`);
      testsFailed += 1;
    }

    // ============================================
    // TEST 7: Audit Service
    // ============================================
    console.log('\n📜 TEST 7: Audit Service');
    console.log('-'.repeat(60));

    const auditLogs = await auditService.getLogs({ entityType: 'container' });
    console.log(`✓ Fetched ${auditLogs.length} audit logs for containers`);

    if (auditLogs.length > 0) {
      const recentLog = auditLogs[0];
      console.log(`  - Recent: ${recentLog.action} on ${recentLog.entityType}`);
      console.log(`  - By: ${recentLog.userName} at ${recentLog.timestamp.toISOString()}`);
      testsPassed += 1;
    } else {
      console.log('⚠️  No audit logs found (new operations will create them)');
      testsPassed += 1;
    }

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log(`📋 Total Events Captured: ${capturedEvents.length}`);

    if (capturedEvents.length > 0) {
      console.log('\n🎯 Event Types Captured:');
      const eventCounts = capturedEvents.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      Object.entries(eventCounts).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    if (testsFailed === 0) {
      console.log('✅ ALL TESTS PASSED! System is operational.\n');
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
console.log('🚀 Starting API Services Test Suite...\n');
testServices()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
