/**
 * Test script for EDI Gate In integration
 * 
 * This script demonstrates how the EDI integration works with Gate In operations.
 * It shows the complete workflow from container assignment to EDI transmission.
 */

import { ediManagementService } from '../src/services/edi/ediManagement';
import { ediRealDataService } from '../src/services/edi/ediRealDataService';

// Mock Gate In operation data
const mockGateInOperation = {
  id: 'test-gate-in-001',
  containerNumber: 'TEST123456',
  containerSize: '40ft' as const,
  containerType: 'dry' as const,
  clientCode: '1052069',
  clientName: 'Test Client SA',
  truckNumber: '028-AA-01',
  driverName: 'John Doe',
  transportCompany: 'Test Transport',
  assignedLocation: 'A-01-01-01',
  yardId: '419101',
  userName: 'Test Operator',
  fullEmpty: 'FULL' as const
};

async function testEDIGateInIntegration() {
  console.log('🚀 Testing EDI Gate In Integration');
  console.log('=====================================');

  try {
    // 1. Check if client has EDI enabled
    console.log('\n1. Checking client EDI status...');
    const isEDIEnabled = await ediRealDataService.isEDIEnabledForOperation(
      mockGateInOperation.clientCode,
      'GATE_IN'
    );
    console.log(`   Client ${mockGateInOperation.clientCode} EDI enabled: ${isEDIEnabled}`);

    // 2. Prepare EDI container data
    console.log('\n2. Preparing EDI container data...');
    const ediContainerData = {
      containerNumber: mockGateInOperation.containerNumber,
      size: mockGateInOperation.containerSize,
      type: mockGateInOperation.containerType,
      clientName: mockGateInOperation.clientName,
      clientCode: mockGateInOperation.clientCode,
      transporter: mockGateInOperation.transportCompany,
      vehicleNumber: mockGateInOperation.truckNumber,
      userName: mockGateInOperation.userName,
      containerLoadStatus: mockGateInOperation.fullEmpty,
      timestamp: new Date(),
      location: mockGateInOperation.assignedLocation,
      yardId: mockGateInOperation.yardId
    };
    console.log('   EDI data prepared:', JSON.stringify(ediContainerData, null, 2));

    // 3. Process EDI transmission
    console.log('\n3. Processing EDI transmission...');
    const ediResult = await ediManagementService.processGateIn(ediContainerData);
    
    if (ediResult) {
      console.log('   ✅ EDI transmission successful!');
      console.log('   EDI Log ID:', ediResult.id);
      console.log('   Container:', ediResult.containerNumber);
      console.log('   Operation:', ediResult.operation);
      console.log('   Status:', ediResult.status);
      console.log('   File Name:', ediResult.fileName);
      console.log('   Uploaded to SFTP:', ediResult.uploadedToSftp);
    } else {
      console.log('   ❌ EDI transmission failed - no result returned');
    }

    // 4. Get EDI statistics
    console.log('\n4. Getting EDI statistics...');
    const stats = await ediRealDataService.getRealEDIStatistics();
    console.log('   Total operations:', stats.totalOperations);
    console.log('   EDI success rate:', stats.successRate.toFixed(1) + '%');
    console.log('   Clients with EDI:', stats.clientsWithEdi);

    // 5. Get transmission history
    console.log('\n5. Getting transmission history...');
    const history = await ediManagementService.getTransmissionHistory();
    console.log(`   Total transmissions in history: ${history.length}`);
    
    if (history.length > 0) {
      const recent = history[0];
      console.log('   Most recent transmission:');
      console.log('     Container:', recent.containerNumber);
      console.log('     Operation:', recent.operation);
      console.log('     Status:', recent.status);
      console.log('     Date:', recent.createdAt.toISOString());
    }

    console.log('\n✅ EDI Gate In integration test completed successfully!');

  } catch (error) {
    console.error('\n❌ EDI Gate In integration test failed:');
    console.error('Error:', error instanceof Error ? error.message : error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack trace');
  }
}

// Simulate the complete Gate In workflow with EDI
async function simulateCompleteGateInWorkflow() {
  console.log('\n\n🔄 Simulating Complete Gate In Workflow');
  console.log('=========================================');

  try {
    // Step 1: Container arrives at gate
    console.log('\n📋 Step 1: Container arrives at gate');
    console.log(`   Container: ${mockGateInOperation.containerNumber}`);
    console.log(`   Driver: ${mockGateInOperation.driverName}`);
    console.log(`   Truck: ${mockGateInOperation.truckNumber}`);
    console.log(`   Client: ${mockGateInOperation.clientName} (${mockGateInOperation.clientCode})`);

    // Step 2: Operator creates Gate In operation
    console.log('\n📝 Step 2: Operator creates Gate In operation');
    console.log('   Status: pending');
    console.log('   Awaiting location assignment...');

    // Step 3: Container assigned to location
    console.log('\n📍 Step 3: Container assigned to location');
    console.log(`   Location: ${mockGateInOperation.assignedLocation}`);
    console.log('   Status: completed');

    // Step 4: EDI transmission triggered
    console.log('\n📡 Step 4: EDI transmission triggered automatically');
    
    // Check if EDI should be processed
    const shouldProcessEDI = await ediRealDataService.isEDIEnabledForOperation(
      mockGateInOperation.clientCode,
      'GATE_IN'
    );

    if (shouldProcessEDI) {
      console.log('   ✅ Client has EDI enabled - processing transmission...');
      
      const ediData = {
        containerNumber: mockGateInOperation.containerNumber,
        size: mockGateInOperation.containerSize,
        type: mockGateInOperation.containerType,
        clientName: mockGateInOperation.clientName,
        clientCode: mockGateInOperation.clientCode,
        transporter: mockGateInOperation.transportCompany,
        vehicleNumber: mockGateInOperation.truckNumber,
        userName: mockGateInOperation.userName,
        containerLoadStatus: mockGateInOperation.fullEmpty,
        timestamp: new Date(),
        location: mockGateInOperation.assignedLocation,
        yardId: mockGateInOperation.yardId
      };

      const ediResult = await ediManagementService.processGateIn(ediData);
      
      if (ediResult) {
        console.log('   📤 EDI CODECO message generated and transmitted');
        console.log(`   📁 File: ${ediResult.fileName}`);
        console.log(`   🌐 SFTP Upload: ${ediResult.uploadedToSftp ? 'Success' : 'Failed'}`);
        console.log(`   📊 Status: ${ediResult.status}`);
      } else {
        console.log('   ❌ EDI transmission failed');
      }
    } else {
      console.log('   ⚠️  Client does not have EDI enabled - skipping transmission');
    }

    // Step 5: Operation completed
    console.log('\n✅ Step 5: Gate In operation completed');
    console.log('   Container successfully processed');
    console.log('   EDI notification sent to client (if enabled)');
    console.log('   Operation logged in system');

    console.log('\n🎉 Complete Gate In workflow simulation finished!');

  } catch (error) {
    console.error('\n❌ Workflow simulation failed:');
    console.error('Error:', error instanceof Error ? error.message : error);
  }
}

// Run the tests
async function runTests() {
  await testEDIGateInIntegration();
  await simulateCompleteGateInWorkflow();
}

// Export for use in other scripts
export {
  testEDIGateInIntegration,
  simulateCompleteGateInWorkflow,
  mockGateInOperation
};

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}