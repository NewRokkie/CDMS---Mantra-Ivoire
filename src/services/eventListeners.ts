import { eventBus } from './eventBus';
import { logger } from '../utils/logger';
import { ediDatabaseService } from './edi/ediDatabaseService';
import { sftpIntegrationService } from './edi/sftpIntegrationService';

/**
 * Initialize all event listeners for automatic inter-module linking
 */
export function initializeEventListeners() {
  logger.info('Initializing event listeners...', 'EventListeners');

  // ============================================
  // GATE IN EVENTS
  // ============================================

  // When Gate In completes
  eventBus.on('GATE_IN_COMPLETED', async ({ container, operation }) => {
    logger.info(`GATE_IN_COMPLETED: ${container.number}`, 'EventListeners');

    try {
      // 1. Yard Map is automatically updated (container stored in DB)
      logger.debug(`Container added to inventory: ${container.id}`, 'EventListeners');

      // 2. Position assigned
      if (container.location) {
        await eventBus.emit('YARD_POSITION_ASSIGNED', {
          containerId: container.id,
          location: container.location,
          yardId: container.yardPosition?.yardId || 'unknown'
        });
      }

      // 3. Request EDI transmission if client has auto_edi enabled
      const ediEnabled = await ediDatabaseService.isClientEdiEnabled(operation.clientCode);
      if (ediEnabled) {
        logger.debug(`Client ${operation.clientCode} has EDI enabled, requesting transmission`, 'EventListeners');
        await eventBus.emit('EDI_TRANSMISSION_REQUESTED', {
          entityId: operation.id,
          entityType: 'gate_in',
          messageType: 'CODECO'
        });
      } else {
        logger.debug(`Client ${operation.clientCode} has EDI disabled, skipping transmission`, 'EventListeners');
      }

      // 4. Dashboard stats auto-update (via DB queries)
      logger.debug('Dashboard will reflect new container on next refresh', 'EventListeners');

      // 5. Handle damage assessment if provided during gate in
      if (container.damage && container.damage.length > 0) {
        logger.debug('Container has damage recorded during assignment stage', 'EventListeners');
      }

    } catch (error) {
      logger.error('Error handling GATE_IN_COMPLETED', 'EventListeners', error);
    }
  });

  // When damage assessment is recorded during assignment stage
  eventBus.on('DAMAGE_ASSESSMENT_RECORDED', async ({ operationId, containerId, assessment, assessedBy }) => {
    logger.info(`DAMAGE_ASSESSMENT_RECORDED: ${operationId}`, 'EventListeners');

    try {
      // 1. Log damage assessment for audit trail
      logger.debug(`Damage assessment recorded by ${assessedBy} at ${assessment.assessmentStage} stage`, 'EventListeners');

      // 2. Update container status if severely damaged
      if (assessment.hasDamage && assessment.damageType === 'structural') {
        logger.warn('Severe damage detected - container may need special handling', 'EventListeners');
      }

      // 3. Notify relevant stakeholders if damage is reported
      if (assessment.hasDamage && containerId) {
        logger.info('Damage notification will be sent to relevant parties', 'EventListeners');
        
        // Could emit notification event
        await eventBus.emit('DAMAGE_NOTIFICATION_REQUIRED', {
          containerId,
          assessment,
          assessedBy
        });
      }

      // 4. Update dashboard statistics
      logger.debug('Dashboard damage statistics will be updated on next refresh', 'EventListeners');

    } catch (error) {
      logger.error('Error handling DAMAGE_ASSESSMENT_RECORDED', 'EventListeners', error);
    }
  });

  eventBus.on('DAMAGE_NOTIFICATION_REQUIRED', async ({ containerId }) => {
    logger.info(`DAMAGE_NOTIFICATION_REQUIRED: ${containerId}`, 'EventListeners');
    // Could send email, SMS, or system notification to relevant parties
    // Could create work orders for repairs
  });

  // ============================================
  // GATE OUT EVENTS
  // ============================================

  eventBus.on('GATE_OUT_COMPLETED', async ({ containers, operation, bookingReference }) => {
    logger.info(`GATE_OUT_COMPLETED: ${operation.bookingNumber}`, 'EventListeners');

    try {
      // 1. Containers already updated to 'out_depot' status
      logger.debug(`${containers.length} containers marked as out_depot`, 'EventListeners');

      // 2. Release order already decremented
      logger.debug(`Booking reference updated: ${bookingReference.remainingContainers} remaining`, 'EventListeners');

      // 3. EDI transmission if client has EDI enabled
      const ediEnabled = await ediDatabaseService.isClientEdiEnabled(operation.clientCode);
      if (ediEnabled) {
        logger.info(`Client ${operation.clientCode} has EDI enabled, starting SFTP transmission`, 'EventListeners');

        // Capture values to avoid race conditions in fire-and-forget
        const capturedOperationId = operation.id;
        const capturedClientCode = operation.clientCode;
        const capturedClientName = operation.clientName;
        const capturedYardId = operation.yardId;
        const capturedBookingNumber = operation.bookingNumber;
        const capturedTransportCompany = operation.transportCompany || '';
        const capturedTruckNumber = operation.truckNumber || '';
        const capturedOperatorName = operation.operatorName || operation.createdBy || 'System';
        const capturedCreatedBy = operation.createdBy || 'system';
        const capturedCompletedAt = operation.completedAt;
        const capturedContainers = containers.map(c => ({ ...c })); // Clone containers array

        // Fire-and-forget: don't block the gate out workflow
        (async () => {
          const timeoutId = setTimeout(() => {
            logger.warn('EDI transmission timeout for operation', 'EventListeners', {
              operationId: capturedOperationId
            });
          }, 30000); // 30 second timeout

          try {
            const now = new Date();
            const gateOutDate = capturedCompletedAt || now;
            
            // Track successful vs failed transmissions
            const successfulContainers = [];
            const failedContainers = [];
            const notConfiguredContainers = [];

            // Transmit one EDI per container
            for (const container of capturedContainers) {
              const result = await sftpIntegrationService.processGateOutWithSFTP({
                containerNumbers: [container.number],
                containerSize: container.size || '20ft',
                containerType: container.type || 'dry',
                clientCode: capturedClientCode,
                clientName: capturedClientName,
                transportCompany: capturedTransportCompany,
                truckNumber: capturedTruckNumber,
                gateOutDate: gateOutDate.toISOString().split('T')[0],
                gateOutTime: gateOutDate.toTimeString().slice(0, 5),
                yardId: capturedYardId,
                operatorName: capturedOperatorName,
                operatorId: capturedCreatedBy,
                bookingNumber: capturedBookingNumber,
              });

              if (result.transmitted) {
                logger.info(`EDI transmitted for container ${container.number}`, 'EventListeners', {
                  remotePath: result.remotePath
                });
                successfulContainers.push(container.number);
              } else if (result.success === false) {
                logger.error(`EDI transmission failed for container ${container.number}`, 'EventListeners', {
                  error: result.error
                });
                failedContainers.push(container.number);
              } else {
                logger.debug(`EDI not configured for client ${capturedClientCode}`, 'EventListeners');
                notConfiguredContainers.push(container.number);
              }
            }

            // Update edi_transmitted flag with detailed status
            const hasAnySuccess = successfulContainers.length > 0;
            await ediDatabaseService.updateGateOutEdiStatus(capturedOperationId, hasAnySuccess, new Date());
            
            logger.info(`EDI status updated for operation ${capturedOperationId}`, 'EventListeners', {
              successful: successfulContainers.length,
              failed: failedContainers.length,
              notConfigured: notConfiguredContainers.length,
              total: capturedContainers.length
            });
          } catch (ediError) {
            logger.error('EDI transmission error for GATE_OUT', 'EventListeners', {
              operationId: capturedOperationId,
              error: ediError
            });
          } finally {
            clearTimeout(timeoutId);
          }
        })();
      } else {
        logger.debug(`Client ${operation.clientCode} has EDI disabled, skipping transmission`, 'EventListeners');
      }

    } catch (error) {
      logger.error('Error handling GATE_OUT_COMPLETED', 'EventListeners', error);
    }
  });

  // ============================================
  // BOOKING REFERENCE EVENTS
  // ============================================

  eventBus.on('BOOKING_REFERENCE_CREATED', async ({ bookingReference }) => {
    logger.info(`BOOKING_REFERENCE_CREATED: ${bookingReference}`, 'EventListeners');

    try {
      // Could implement auto-reservation of containers here
      // For now, just log
      logger.debug(`Booking reference created for ${bookingReference.totalContainers} containers`, 'EventListeners');

      // Could send notification to client
    } catch (error) {
      logger.error('Error handling BOOKING_REFERENCE_CREATED', 'EventListeners', error);
    }
  });

  eventBus.on('BOOKING_REFERENCE_COMPLETED', async ({ bookingReference }) => {
    logger.info(`BOOKING_REFERENCE_COMPLETED: ${bookingReference}`, 'EventListeners');
    // Could send completion notification, generate invoice, etc.
  });

  // ============================================
  // CONTAINER EVENTS
  // ============================================

  eventBus.on('CONTAINER_ADDED', async ({ container }) => {
    logger.debug(`CONTAINER_ADDED: ${container.number}`, 'EventListeners');
    // Container already in DB, yard map will show it automatically
  });

  eventBus.on('CONTAINER_UPDATED', async ({ containerId }) => {
    logger.debug(`CONTAINER_UPDATED: ${containerId}`, 'EventListeners');
    // Changes logged in audit via service layer
  });

  eventBus.on('YARD_POSITION_ASSIGNED', async ({ containerId, location }) => {
    logger.debug(`YARD_POSITION_ASSIGNED: ${containerId} → ${location}`, 'EventListeners');
    // Position already saved in DB, yard map will reflect it
  });

  // ============================================
  // EDI EVENTS
  // ============================================

  eventBus.on('EDI_TRANSMISSION_REQUESTED', async ({ entityId, entityType, messageType }) => {
    logger.info(`EDI_TRANSMISSION_REQUESTED: ${messageType} for ${entityType} ${entityId}`, 'EventListeners');

    try {
      // Transmit based on entity type
      if (entityType === 'gate_in') {
        // Fetch gate in operation and transmit
        // In production, this would fetch from database
        // For now, we'll skip actual transmission
        logger.debug('EDI transmission for gate_in operation', 'EventListeners');
      } else if (entityType === 'gate_out') {
        // Fetch gate out operation and transmit
        logger.debug('EDI transmission for gate_out operation', 'EventListeners');
      }

      // Emit completion event
      await eventBus.emit('EDI_TRANSMISSION_COMPLETED', {
        entityId,
        transmissionId: `EDI-${Date.now()}`
      });

    } catch (error) {
      logger.error('Error handling EDI_TRANSMISSION_REQUESTED', 'EventListeners', error);
    }
  });

  eventBus.on('EDI_TRANSMISSION_COMPLETED', async ({ entityId, transmissionId }) => {
    logger.info(`EDI_TRANSMISSION_COMPLETED: ${transmissionId} for ${entityId}`, 'EventListeners');
    // Update operation record with edi_transmitted = true
    // In production, this would update the gate_in/out operation
  });

  // ============================================
  // CLIENT EVENTS
  // ============================================

  eventBus.on('CLIENT_CREATED', async ({ clientCode }) => {
    logger.info(`CLIENT_CREATED: ${clientCode}`, 'EventListeners');
    // Could initialize default client pool assignments
  });

  logger.info('All event listeners initialized', 'EventListeners');
  logger.debug('Listening for events', 'EventListeners', [
    'GATE_IN_COMPLETED',
    'GATE_OUT_COMPLETED',
    'BOOKING_REF_CREATED',
    'CONTAINER_ADDED',
    'EDI_TRANSMISSION_REQUESTED'
  ]);
}

/**
 * Cleanup event listeners on app shutdown
 */
export function cleanupEventListeners() {
  logger.info('Cleaning up event listeners...', 'EventListeners');
  eventBus.clearListeners();
}
