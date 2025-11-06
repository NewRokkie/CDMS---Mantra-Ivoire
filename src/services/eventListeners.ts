import { eventBus } from './eventBus';
import { auditService } from './api/auditService';
import { EDIService } from './edifact/ediService';

/**
 * Initialize all event listeners for automatic inter-module linking
 */
export function initializeEventListeners() {
  console.log('[EventListeners] Initializing event listeners...');

  // ============================================
  // GATE IN EVENTS
  // ============================================

  // When Gate In completes
  eventBus.on('GATE_IN_COMPLETED', async ({ container, operation }) => {
    console.log('[EventListeners] GATE_IN_COMPLETED:', container.number);

    try {
      // 1. Yard Map is automatically updated (container stored in DB)
      console.log('  ✓ Container added to inventory:', container.id);

      // 2. Position assigned
      if (container.location) {
        await eventBus.emit('YARD_POSITION_ASSIGNED', {
          containerId: container.id,
          location: container.location,
          yardId: container.yardPosition?.yardId || 'unknown'
        });
      }

      // 3. Request EDI transmission if client has auto_edi enabled
      await eventBus.emit('EDI_TRANSMISSION_REQUESTED', {
        entityId: operation.id,
        entityType: 'gate_in',
        messageType: 'CODECO'
      });

      // 4. Dashboard stats auto-update (via DB queries)
      console.log('  ✓ Dashboard will reflect new container on next refresh');

      // 5. Handle damage assessment if provided during gate in
      if (container.damage && container.damage.length > 0) {
        console.log('  ✓ Container has damage recorded during assignment stage');
      }

    } catch (error) {
      console.error('[EventListeners] Error handling GATE_IN_COMPLETED:', error);
    }
  });

  eventBus.on('GATE_IN_FAILED', async ({ containerNumber, error }) => {
    console.error('[EventListeners] GATE_IN_FAILED:', containerNumber, error);
    // Could send notification, alert, etc.
  });

  // ============================================
  // DAMAGE ASSESSMENT EVENTS
  // ============================================

  // When damage assessment is recorded during assignment stage
  eventBus.on('DAMAGE_ASSESSMENT_RECORDED', async ({ operationId, containerId, assessment, assessedBy }) => {
    console.log('[EventListeners] DAMAGE_ASSESSMENT_RECORDED:', operationId);

    try {
      // 1. Log damage assessment for audit trail
      console.log(`  ✓ Damage assessment recorded by ${assessedBy} at ${assessment.assessmentStage} stage`);

      // 2. Update container status if severely damaged
      if (assessment.hasDamage && assessment.damageType === 'structural') {
        console.log('  ✓ Severe damage detected - container may need special handling');
      }

      // 3. Notify relevant stakeholders if damage is reported
      if (assessment.hasDamage) {
        console.log('  ✓ Damage notification will be sent to relevant parties');
        
        // Could emit notification event
        await eventBus.emit('DAMAGE_NOTIFICATION_REQUIRED', {
          containerId,
          assessment,
          assessedBy
        });
      }

      // 4. Update dashboard statistics
      console.log('  ✓ Dashboard damage statistics will be updated on next refresh');

    } catch (error) {
      console.error('[EventListeners] Error handling DAMAGE_ASSESSMENT_RECORDED:', error);
    }
  });

  eventBus.on('DAMAGE_NOTIFICATION_REQUIRED', async ({ containerId, assessment, assessedBy }) => {
    console.log('[EventListeners] DAMAGE_NOTIFICATION_REQUIRED:', containerId);
    // Could send email, SMS, or system notification to relevant parties
    // Could create work orders for repairs
    // Could update container routing for special handling
  });

  // ============================================
  // GATE OUT EVENTS
  // ============================================

  eventBus.on('GATE_OUT_COMPLETED', async ({ containers, operation, bookingNumber }) => {
    console.log('[EventListeners] GATE_OUT_COMPLETED:', operation.bookingNumber);

    try {
      // 1. Containers already updated to 'out_depot' status
      console.log(`  ✓ ${containers.length} containers marked as out_depot`);

      // 2. Release order already decremented
      console.log(`  ✓ Booking reference updated: ${bookingNumber.remainingContainers} remaining`);

      // 3. Request EDI transmission
      await eventBus.emit('EDI_TRANSMISSION_REQUESTED', {
        entityId: operation.id,
        entityType: 'gate_out',
        messageType: 'CODECO'
      });

      // 4. If booking reference completed, emit event
      if (bookingNumber.status === 'completed') {
        await eventBus.emit('BOOKING_REF_COMPLETED', { bookingNumber });
      }

    } catch (error) {
      console.error('[EventListeners] Error handling GATE_OUT_COMPLETED:', error);
    }
  });

  eventBus.on('GATE_OUT_FAILED', async ({ bookingNumberId, error }) => {
    console.error('[EventListeners] GATE_OUT_FAILED:', bookingNumberId, error);
  });

  // ============================================
  // RELEASE ORDER EVENTS
  // ============================================

  eventBus.on('BOOKING_REF_CREATED', async ({ bookingNumber }) => {
    console.log('[EventListeners] BOOKING_REF_CREATED:', bookingNumber);

    try {
      // Could implement auto-reservation of containers here
      // For now, just log
      console.log(`  ✓ Booking reference created for ${bookingNumber.totalContainers} containers`);

      // Could send notification to client
      // Could reserve containers automatically based on booking details

    } catch (error) {
      console.error('[EventListeners] Error handling BOOKING_REF_CREATED:', error);
    }
  });

  eventBus.on('BOOKING_REF_COMPLETED', async ({ bookingNumber }) => {
    console.log('[EventListeners] BOOKING_REF_COMPLETED:', bookingNumber);
    // Could send completion notification, generate invoice, etc.
  });

  // ============================================
  // CONTAINER EVENTS
  // ============================================

  eventBus.on('CONTAINER_ADDED', async ({ container, operation }) => {
    console.log('[EventListeners] CONTAINER_ADDED:', container.number);
    // Container already in DB, yard map will show it automatically
  });

  eventBus.on('CONTAINER_UPDATED', async ({ containerId, before, after }) => {
    console.log('[EventListeners] CONTAINER_UPDATED:', containerId);
    // Changes logged in audit via service layer
  });

  eventBus.on('YARD_POSITION_ASSIGNED', async ({ containerId, location, yardId }) => {
    console.log('[EventListeners] YARD_POSITION_ASSIGNED:', containerId, '→', location);
    // Position already saved in DB, yard map will reflect it
  });

  // ============================================
  // EDI EVENTS
  // ============================================

  eventBus.on('EDI_TRANSMISSION_REQUESTED', async ({ entityId, entityType, messageType }) => {
    console.log('[EventListeners] EDI_TRANSMISSION_REQUESTED:', messageType, 'for', entityType, entityId);

    try {
      // Check if auto-EDI is enabled for this operation
      // For now, just log - actual transmission would happen here

      // Simulate EDI transmission
      const shouldTransmit = Math.random() > 0.3; // 70% success rate for demo

      if (shouldTransmit) {
        // In production: Generate and send CODECO via SFTP
        // const ediService = new EDIService();
        // const codeco = await ediService.generateCODECO(entityId, entityType);
        // await ediService.transmit(codeco);

        await eventBus.emit('EDI_TRANSMISSION_COMPLETED', {
          entityId,
          transmissionId: `edi-${Date.now()}`
        });
      } else {
        await eventBus.emit('EDI_TRANSMISSION_FAILED', {
          entityId,
          error: 'Simulated transmission failure'
        });
      }

    } catch (error: any) {
      console.error('[EventListeners] Error handling EDI_TRANSMISSION_REQUESTED:', error);
      await eventBus.emit('EDI_TRANSMISSION_FAILED', {
        entityId,
        error: error.message
      });
    }
  });

  eventBus.on('EDI_TRANSMISSION_COMPLETED', async ({ entityId, transmissionId }) => {
    console.log('[EventListeners] EDI_TRANSMISSION_COMPLETED:', transmissionId, 'for', entityId);
    // Update operation record with edi_transmitted = true
    // In production, this would update the gate_in/out operation
  });

  eventBus.on('EDI_TRANSMISSION_FAILED', async ({ entityId, error }) => {
    console.error('[EventListeners] EDI_TRANSMISSION_FAILED:', entityId, error);
    // Could retry, send alert, etc.
  });

  // ============================================
  // CLIENT EVENTS
  // ============================================

  eventBus.on('CLIENT_CREATED', async ({ clientId, clientCode }) => {
    console.log('[EventListeners] CLIENT_CREATED:', clientCode);
    // Could initialize default client pool assignments
  });

  console.log('[EventListeners] ✓ All event listeners initialized');
  console.log('[EventListeners] Listening for:', [
    'GATE_IN_COMPLETED',
    'GATE_OUT_COMPLETED',
    'BOOKING_REF_CREATED',
    'DAMAGE_ASSESSMENT_RECORDED',
    'EDI_TRANSMISSION_REQUESTED',
    'YARD_POSITION_ASSIGNED',
    'and more...'
  ].join(', '));
}

/**
 * Cleanup all event listeners
 */
export function cleanupEventListeners() {
  console.log('[EventListeners] Cleaning up event listeners...');
  eventBus.clearListeners();
}
