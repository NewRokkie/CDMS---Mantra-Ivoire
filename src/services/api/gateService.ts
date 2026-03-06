import { supabase } from './supabaseClient';
import { containerService } from './containerService';
import { bookingReferenceService } from './bookingReferenceService';
import { auditService } from './auditService';
import { eventBus } from '../eventBus';
import { Container } from '../../types';
import { GateInOperation, GateOutOperation } from '../../types/operations';
import { RetryManager, GateInError, handleAsyncOperation } from '../errorHandling';
import { ValidationService } from '../validationService';

export interface GateInData {
  containerNumber: string;
  containerQuantity?: 1 | 2; // Number of containers (1 or 2 for 20ft)
  secondContainerNumber?: string; // Second container number when quantity is 2
  clientCode: string;
  clientName?: string;
  containerType: string;
  containerSize: string;
  isHighCube?: boolean; // High cube variant (e.g. Dry 40ft HC), from Gate In form
  fullEmpty?: 'FULL' | 'EMPTY'; // Full or Empty status
  transportCompany: string;
  driverName: string;
  truckNumber: string;
  location: string | null;
  truckArrivalDate?: string;
  truckArrivalTime?: string;
  operatorId: string;
  operatorName: string;
  yardId: string;
  classification?: 'divers' | 'alimentaire';
  transactionType?: 'Retour Livraison' | 'Transfert (IN)'; // Transaction type for reports
  equipmentReference?: string; // Equipment reference for EDI transmission
  containerIsoCode?: string;   // ISO type code from dropdown (e.g. 45G1)
  bookingReference?: string;   // Booking reference number
  notes?: string;              // Additional notes
  damageReported?: boolean; // Keep for backward compatibility during migration
  damageDescription?: string;
  // New damage assessment structure - now defaults to assignment stage
  damageAssessment?: {
    hasDamage: boolean;
    damageType?: string;
    damageDescription?: string;
    assessmentStage: 'assignment' | 'inspection'; // Removed 'gate_in' as it's no longer used
    assessedBy: string;
    assessedAt: Date;
  };
}

export interface GateOutData {
  bookingReferenceId: string;
  containerIds: string[];
  transportCompany: string;
  driverName: string;
  truckNumber: string;
  operatorId: string;
  operatorName: string;
  yardId: string;
}

export class GateService {
  /**
   * Enhanced Gate In processing with robust error handling and validation
   */
  async processGateIn(data: GateInData): Promise<{ success: boolean; containerId?: string; error?: string; userMessage?: string }> {
    return await RetryManager.executeWithRetry(async () => {
      // Pre-validation checks
      await this.validateGateInData(data);

      // Get client info with enhanced error handling
      const client = await this.getClientWithValidation(data.clientCode);

      // Check for duplicate containers
      await this.checkDuplicateContainer(data.containerNumber);

      // Create container with transaction safety
      const newContainer = await this.createContainerSafely(data, client);

      // Create gate in operation
      const operation = await this.createGateInOperation(data, client, newContainer);

      // Create audit log
      await this.createAuditLog(data, newContainer);

      // Emit success event
      await this.emitGateInCompletedEvent(newContainer, operation);

      return { success: true, containerId: newContainer.id };

    }, { maxAttempts: 3, baseDelay: 1000 })
      .catch((error: GateInError) => {
        // Log the actual error details before converting to generic response
        console.error('🔴 [gateService.processGateIn] Error caught:', {
          code: error.code,
          message: error.message,
          userMessage: error.userMessage,
          technicalDetails: error.technicalDetails,
          stack: error.stack,
        });

        // Emit failure event
        eventBus.emitSync('GATE_IN_FAILED', {
          containerNumber: data.containerNumber,
          error: error.userMessage || error.message
        });

        return {
          success: false,
          error: error.message,
          userMessage: error.userMessage
        };
      });
  }

  /**
   * Validates Gate In data before processing
   */
  private async validateGateInData(data: GateInData): Promise<void> {
    // Basic required field validation
    const requiredFields = [
      'containerNumber', 'clientCode', 'containerType', 'containerSize',
      'transportCompany', 'driverName', 'truckNumber', 'operatorId', 'yardId'
    ];

    for (const field of requiredFields) {
      if (!data[field as keyof GateInData] || String(data[field as keyof GateInData]).trim() === '') {
        throw new GateInError({
          code: 'MISSING_REQUIRED_FIELD',
          message: `Required field ${field} is missing`,
          severity: 'error',
          retryable: false,
          userMessage: `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`
        });
      }
    }

    // Container number format validation
    const containerValidation = ValidationService.validateContainerNumber(data.containerNumber);
    if (!containerValidation.isValid) {
      const firstError = containerValidation.errors[0];
      throw new GateInError({
        code: firstError.code,
        message: firstError.message,
        severity: 'error',
        retryable: false,
        userMessage: firstError.userMessage
      });
    }

    // Container size validation
    if (!['20ft', '40ft'].includes(data.containerSize)) {
      throw new GateInError({
        code: 'INVALID_CONTAINER_SIZE',
        message: `Invalid container size: ${data.containerSize}`,
        severity: 'error',
        retryable: false,
        userMessage: 'Container size must be either 20ft or 40ft'
      });
    }
  }

  /**
   * Gets client with enhanced validation and error handling
   */
  private async getClientWithValidation(clientCode: string): Promise<any> {
    const result = await handleAsyncOperation(async () => {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('code', clientCode)
        .maybeSingle();

      if (clientError) {
        throw clientError;
      }

      if (!client) {
        throw new GateInError({
          code: 'CLIENT_NOT_FOUND',
          message: `Client with code ${clientCode} not found`,
          severity: 'error',
          retryable: false,
          userMessage: `Client '${clientCode}' could not be found. Please verify the client code.`
        });
      }

      return client;
    }, 'getClient');

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }

  /**
   * Checks for duplicate containers in the system
   */
  private async checkDuplicateContainer(containerNumber: string): Promise<void> {
    const result = await handleAsyncOperation(async () => {
      const existing = await containerService.getAll();
      // Only check active (non-deleted) containers
      return existing.find(c =>
        c.number === containerNumber.trim().toUpperCase() &&
        !c.isDeleted
      );
    }, 'checkDuplicateContainer');

    if (!result.success) {
      throw result.error;
    }

    if (result.data) {
      throw new GateInError({
        code: 'DUPLICATE_CONTAINER',
        message: `Container ${containerNumber} already exists in system`,
        severity: 'error',
        retryable: false,
        userMessage: `Container ${containerNumber} is already registered in the system`
      });
    }
  }

  /**
   * Creates container with transaction safety
   */
  private async createContainerSafely(data: GateInData, client: any): Promise<any> {
    // Calculate actual gate in date/time from truck arrival
    let gateInDateTime: Date;
    if (data.truckArrivalDate && data.truckArrivalTime) {
      // Handle time format - if it already has seconds (HH:MM:SS), use as-is, otherwise add :00
      const timeWithSeconds = data.truckArrivalTime.split(':').length === 3
        ? data.truckArrivalTime
        : `${data.truckArrivalTime}:00`;

      const dateTimeString = `${data.truckArrivalDate}T${timeWithSeconds}`;
      gateInDateTime = new Date(dateTimeString);

      // Validate the parsed date
      if (isNaN(gateInDateTime.getTime())) {
        console.error('🔴 [createContainerSafely] Invalid date/time:', dateTimeString);
        throw new GateInError({
          code: 'INVALID_DATE_TIME',
          message: `Invalid date/time format: ${dateTimeString}`,
          severity: 'error',
          retryable: false,
          userMessage: `Invalid truck arrival date/time. Please check the date (${data.truckArrivalDate}) and time (${data.truckArrivalTime}) format.`,
        });
      }
    } else {
      gateInDateTime = new Date();
    }

    // ── DIAGNOSTIC: direct Supabase INSERT to reveal raw error ──
    const diagPayload = {
      number: data.containerNumber.trim().toUpperCase(),
      type: data.containerType,
      size: data.containerSize,
      is_high_cube: data.isHighCube === true,
      status: 'gate_in',
      full_empty: data.fullEmpty || 'FULL',
      location: data.location,
      yard_id: data.yardId,
      client_id: client.id,
      client_code: client.code,
      gate_in_date: gateInDateTime.toISOString(),
      gate_out_date: null,
      classification: data.classification || 'divers',
      transaction_type: data.transactionType || 'Retour Livraison',
      damage: [],
      booking_reference: data.bookingReference || null,
      created_by: data.operatorName,
    };
    console.log('🔍 [createContainerSafely] Payload envoyé à Supabase:', JSON.stringify(diagPayload, null, 2));

    const { data: diagData, error: diagError } = await supabase
      .from('containers')
      .insert(diagPayload)
      .select()
      .single();

    if (diagError) {
      console.error('🔴 [createContainerSafely] Erreur Supabase INSERT:', {
        code: diagError.code,
        message: diagError.message,
        details: (diagError as any).details,
        hint: (diagError as any).hint,
        status: (diagError as any).status,
      });
      throw new GateInError({
        code: diagError.code === '23505' ? 'DUPLICATE_CONTAINER' : 'DATABASE_ERROR',
        message: diagError.message,
        severity: 'error',
        retryable: false,
        userMessage: diagError.code === '23505'
          ? `Le conteneur ${data.containerNumber} existe déjà dans le système`
          : `Erreur DB (${diagError.code}): ${diagError.message}`,
        technicalDetails: (diagError as any).hint || diagError.message,
      });
    }

    if (!diagData) {
      console.error('🔴 [createContainerSafely] INSERT OK mais data null — RLS SELECT bloqué');
      throw new GateInError({
        code: 'DATABASE_ERROR',
        message: 'INSERT returned no data',
        severity: 'error',
        retryable: false,
        userMessage: 'Insertion réussie mais lecture bloquée par RLS — appliquer la migration fix_all_rls_policies.sql',
      });
    }

    console.log('🟢 [createContainerSafely] INSERT OK, container id:', diagData.id);
    // ── FIN DIAGNOSTIC ──

    // Map to Container format for downstream use
    const damage: string[] = data.damageAssessment?.hasDamage && data.damageAssessment.damageDescription
      ? [data.damageAssessment.damageDescription]
      : (data.damageReported && data.damageDescription ? [data.damageDescription] : []);

    return {
      id: diagData.id,
      number: diagData.number,
      type: diagData.type,
      size: diagData.size,
      status: diagData.status,
      fullEmpty: diagData.full_empty,
      location: diagData.location,
      yardId: diagData.yard_id,
      clientId: diagData.client_id,
      clientCode: diagData.client_code,
      classification: diagData.classification,
      transactionType: diagData.transaction_type,
      damage,
      createdBy: diagData.created_by,
      createdAt: new Date(diagData.created_at),
      updatedAt: new Date(diagData.updated_at),
    };
  }

  /**
   * Creates Gate In operation record (with normalized tables)
   * NOTE: Data is now split across multiple tables:
   * - gate_in_operations: base operation data
   * - gate_in_edi_details: EDI information
   * - gate_in_transport_info: Transport information
   * - gate_in_damage_assessments: Damage assessment
   */
  private async createGateInOperation(data: GateInData, client: any, container: any): Promise<any> {
    const result = await handleAsyncOperation(async () => {
      // Ensure second_container_number is NULL (not undefined or empty string) when container_quantity is 1
      const containerQuantity = data.containerQuantity || 1;
      const secondContainerNumber = containerQuantity === 2 && data.secondContainerNumber
        ? data.secondContainerNumber.trim().toUpperCase()
        : null;

      // 1. Insert into gate_in_operations (base fields only)
      const { data: operation, error: opError } = await supabase
        .from('gate_in_operations')
        .insert({
          container_id: container.id,
          container_number: data.containerNumber.trim().toUpperCase(),
          container_quantity: containerQuantity,
          second_container_number: secondContainerNumber,
          client_code: data.clientCode,
          client_name: client.name,
          container_type: data.containerType,
          container_size: data.containerSize,
          is_high_cube: data.isHighCube === true,
          full_empty: data.fullEmpty || 'FULL',
          classification: data.classification || 'divers',
          transaction_type: data.transactionType || 'Retour Livraison',
          container_iso_code: data.containerIsoCode || null,
          notes: data.notes || null,
          status: 'pending',
          operator_id: data.operatorId,
          operator_name: data.operatorName,
          yard_id: data.yardId,
          edi_transmitted: false,
          completed_at: null
          // ❌ REMOVED: transport_*, damage_*, booking_reference → moved to normalized tables
        })
        .select()
        .maybeSingle();

      if (opError) {
        console.error('🔴 [createGateInOperation] Erreur Supabase INSERT:', {
          code: opError.code,
          message: opError.message,
          details: (opError as any).details,
          hint: (opError as any).hint,
          status: (opError as any).status,
        });
        throw opError;
      }
      if (!operation) {
        console.error('🔴 [createGateInOperation] INSERT OK mais data null — RLS SELECT bloqué sur gate_in_operations');
      } else {
        console.log('🟢 [createGateInOperation] INSERT OK, operation id:', operation.id);
      }

      // 2. Insert into gate_in_transport_info (normalized)
      if (data.transportCompany || data.driverName || data.truckNumber) {
        const { error: transportError } = await supabase
          .from('gate_in_transport_info')
          .insert({
            gate_in_operation_id: operation.id,
            transport_company: data.transportCompany,
            driver_name: data.driverName,
            vehicle_number: data.truckNumber,
            truck_arrival_date: data.truckArrivalDate || new Date().toISOString().split('T')[0],
            truck_arrival_time: data.truckArrivalTime || new Date().toTimeString().slice(0, 5),
            booking_reference: data.bookingReference || null,
            equipment_reference: data.equipmentReference || null,
          });
        
        if (transportError) {
          console.error('⚠️  [createGateInOperation] Failed to insert transport info:', transportError.message);
          // Don't throw - transport info is optional
        }
      }

      // 3. Insert into gate_in_edi_details (normalized, if EDI data exists)
      // Use upsert to handle duplicate gate_in_operation_id
      if (data.equipmentReference) {
        const { error: ediError } = await supabase
          .from('gate_in_edi_details')
          .upsert({
            gate_in_operation_id: operation.id,
            edi_message_id: `EDI-${data.containerNumber}-IN`,
            edi_client_name: client.name,
            edi_client_code: data.clientCode,
            edi_gate_in_transmitted: true,
            edi_transmission_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'gate_in_operation_id'
          });

        if (ediError) {
          console.error('⚠️  [createGateInOperation] Failed to upsert EDI details:', ediError.message);
          // Don't throw - EDI info is optional
        }
      }

      // 4. Insert into gate_in_damage_assessments (normalized, if damage reported)
      if (data.damageAssessment?.hasDamage || data.damageReported) {
        const { error: damageError } = await supabase
          .from('gate_in_damage_assessments')
          .insert({
            gate_in_operation_id: operation.id,
            damage_reported: true,
            damage_description: data.damageAssessment?.damageDescription || data.damageDescription,
            damage_type: data.damageAssessment?.damageType,
            damage_assessment: data.damageAssessment ? JSON.stringify({
              hasDamage: data.damageAssessment.hasDamage,
              damageType: data.damageAssessment.damageType,
              damageDescription: data.damageAssessment.damageDescription,
            }) : null,
            damage_assessment_stage: data.damageAssessment?.assessmentStage || 'assignment',
            damage_assessed_by: data.damageAssessment?.assessedBy,
            damage_assessed_at: data.damageAssessment?.assessedAt?.toISOString() || new Date().toISOString(),
            is_buffer_assignment: false,
          });
        
        if (damageError) {
          console.error('⚠️  [createGateInOperation] Failed to insert damage assessment:', damageError.message);
          // Don't throw - damage info is optional
        }
      }

      return operation;
    }, 'createGateInOperation');

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }

  /**
   * Creates audit log entry
   */
  private async createAuditLog(data: GateInData, container: any): Promise<void> {
    try {
      await auditService.log({
        entityType: 'container',
        entityId: container.id,
        action: 'create',
        changes: { created: container },
        userId: data.operatorId,
        userName: data.operatorName
      });
    } catch (error) {
      // Audit log failure shouldn't fail the entire operation
    }
  }

  /**
   * Emits Gate In completed event
   */
  private async emitGateInCompletedEvent(container: any, operation: any): Promise<void> {
    try {
      const mappedOperation = this.mapToGateInOperation(operation);
      await eventBus.emit('GATE_IN_COMPLETED', {
        container: container,
        operation: mappedOperation
      });
    } catch (error) {
      // Event emission failure shouldn't fail the entire operation
    }
  }

  /**
   * Checks if there's a pending operation with the same truck number
   */
  async checkPendingOperationByTruckNumber(vehicleNumber: string): Promise<boolean> {
    try {
      // Query gate_out_transport_info table instead of gate_out_operations
      const { data: transportRecords, error } = await supabase
        .from('gate_out_transport_info')
        .select(`
          vehicle_number,
          gate_out_operations (
            status
          )
        `)
        .eq('vehicle_number', vehicleNumber.trim().toUpperCase());

      if (error) throw error;
      
      // Filter for pending operations
      const pendingOperations = transportRecords?.filter(t => 
        t.gate_out_operations?.status === 'pending'
      ) || [];
      
      return pendingOperations.length > 0;
    } catch (error: any) {
      console.error('Error checking pending operations by truck number:', error);
      return false;
    }
  }

  async createPendingGateOut(data: {
    bookingReferenceId: string;
    transportCompany: string;
    driverName: string;
    vehicleNumber: string;
    notes?: string;
    operatorId: string;
    operatorName: string;
    yardId: string;
  }): Promise<{ success: boolean; operationId?: string; error?: string }> {
    try {
      // Check for existing pending operations with the same truck number
      const hasPendingOperation = await this.checkPendingOperationByTruckNumber(data.vehicleNumber);
      if (hasPendingOperation) {
        return {
          success: false,
          error: `Cannot proceed: Truck ${data.vehicleNumber} has a pending operation in progress. Please complete or cancel the existing operation before proceeding with a new one.`
        };
      }

      // Get booking reference
      const bookingReference = await bookingReferenceService.getById(data.bookingReferenceId);
      if (!bookingReference) {
        return { success: false, error: 'Booking reference not found' };
      }

      // Create pending gate out operation
      const { data: operation, error: opError } = await supabase
        .from('gate_out_operations')
        .insert({
          release_order_id: data.bookingReferenceId,
          booking_number: bookingReference.bookingNumber || '',
          client_code: bookingReference.clientCode,
          client_name: bookingReference.clientName,
          booking_type: bookingReference.bookingType,
          total_containers: bookingReference.totalContainers,
          processed_containers: 0,
          remaining_containers: bookingReference.remainingContainers,
          processed_container_ids: [],
          status: 'pending',
          operator_id: data.operatorId,
          operator_name: data.operatorName,
          yard_id: data.yardId,
          edi_transmitted: false
        })
        .select()
        .single();

      if (opError) throw opError;

      // Create gate_out_transport_info record ONLY if we have actual data
      const hasTransportData = 
        (data.transportCompany && data.transportCompany.trim()) ||
        (data.driverName && data.driverName.trim()) ||
        (data.vehicleNumber && data.vehicleNumber.trim());
      
      if (hasTransportData) {
        try {
          const insertData = {
            gate_out_operation_id: operation.id,
            booking_number: bookingReference.bookingNumber || operation.booking_number || '',
            transport_company: data.transportCompany?.trim() || undefined,
            driver_name: data.driverName?.trim() || undefined,
            vehicle_number: data.vehicleNumber?.trim().toUpperCase() || undefined
          };
          
          const { data: insertResult, error: insertError } = await supabase
            .from('gate_out_transport_info')
            .insert(insertData)
            .select();
          
          if (insertError) {
            console.warn('Failed to create gate_out_transport_info:', insertError);
          }
        } catch (transportError: any) {
          console.warn('Failed to create gate_out_transport_info:', transportError);
        }
      }

      // Create audit log
      await auditService.log({
        entityType: 'gate_out_operation',
        entityId: operation.id,
        action: 'create',
        changes: { created: operation },
        userId: data.operatorId,
        userName: data.operatorName
      });

      return { success: true, operationId: operation.id };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create pending gate out' };
    }
  }

  async processGateOut(data: GateOutData): Promise<{ success: boolean; error?: string }> {
    try {
      // Get booking reference
      const bookingReference = await bookingReferenceService.getById(data.bookingReferenceId);
      if (!bookingReference) {
        return { success: false, error: 'Booking reference not found' };
      }

      // Get containers
      const containers = await Promise.all(
        data.containerIds.map(id => containerService.getById(id))
      );
      const validContainers = containers.filter(Boolean) as Container[];

      if (validContainers.length !== data.containerIds.length) {
        return { success: false, error: 'One or more containers not found' };
      }

      // Update containers - direct gate out means immediate completion (Status 04: Out Depot)
      for (const container of validContainers) {
        await containerService.update(container.id, {
          status: 'out_depot',
          location: null, // Clear location when container leaves depot
          gateOutDate: new Date(),
          updatedBy: data.operatorName
        });

        // Create audit log
        await auditService.log({
          entityType: 'container',
          entityId: container.id,
          action: 'update',
          changes: {
            before: { status: container.status },
            after: { status: 'out_depot', gateOutDate: new Date() }
          },
          userId: data.operatorId,
          userName: data.operatorName
        });
      }

      // Update booking reference
      const newRemaining = bookingReference.remainingContainers - data.containerIds.length;
      await bookingReferenceService.update(data.bookingReferenceId, {
        remainingContainers: newRemaining,
        status: newRemaining === 0 ? 'completed' : 'in_process'
      });

      // Create gate out operation
      const { data: operation, error: opError } = await supabase
        .from('gate_out_operations')
        .insert({
          release_order_id: data.bookingReferenceId,
          booking_number: bookingReference.bookingNumber || '',
          client_code: bookingReference.clientCode,
          client_name: bookingReference.clientName,
          booking_type: bookingReference.bookingType,
          total_containers: bookingReference.totalContainers,
          processed_containers: data.containerIds.length,
          remaining_containers: newRemaining,
          processed_container_ids: data.containerIds,
          status: 'completed',
          operator_id: data.operatorId,
          operator_name: data.operatorName,
          yard_id: data.yardId,
          edi_transmitted: false,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (opError) throw opError;

      // Create gate_out_transport_info record ONLY if we have actual data
      const hasTransportData = 
        (data.transportCompany && data.transportCompany.trim()) ||
        (data.driverName && data.driverName.trim()) ||
        (data.truckNumber && data.truckNumber.trim());
      
      if (hasTransportData) {
        try {
          const insertData = {
            gate_out_operation_id: operation.id,
            booking_number: bookingReference.bookingNumber || operation.booking_number || '',
            transport_company: data.transportCompany?.trim() || undefined,
            driver_name: data.driverName?.trim() || undefined,
            vehicle_number: data.truckNumber?.trim().toUpperCase() || undefined
          };
          
          const { data: insertResult, error: insertError } = await supabase
            .from('gate_out_transport_info')
            .insert(insertData)
            .select();
          
          if (insertError) {
            console.warn('Failed to create gate_out_transport_info:', insertError);
          }
        } catch (transportError: any) {
          console.warn('Failed to create gate_out_transport_info:', transportError);
        }
      }

      // Get updated booking reference
      const updatedBookingReference = await bookingReferenceService.getById(data.bookingReferenceId);
      if (!updatedBookingReference) throw new Error('Failed to fetch updated booking reference');

      // Map operation data
      const mappedOperation = this.mapToGateOutOperation(operation);

      // Emit GATE_OUT_COMPLETED event
      await eventBus.emit('GATE_OUT_COMPLETED', {
        containers: validContainers,
        operation: mappedOperation,
        bookingReference: updatedBookingReference
      });

      return { success: true };
    } catch (error: any) {
      // Emit GATE_OUT_FAILED event
      eventBus.emitSync('GATE_OUT_FAILED', {
        bookingReferenceId: data.bookingReferenceId,
        error: error.message || 'Failed to process gate out'
      });

      return { success: false, error: error.message || 'Failed to process gate out' };
    }
  }

  /**
   * Get Gate In Operations (using normalized view for complete data)
   */
  async getGateInOperations(filters?: {
    yardId?: string;
    status?: string;
    dateRange?: [Date, Date];
  }): Promise<GateInOperation[]> {
    // Use the normalized view to get all data in one query
    let query = supabase
      .from('v_gate_in_operations_full')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.yardId) {
      query = query.eq('yard_id', filters.yardId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange[0].toISOString())
        .lte('created_at', filters.dateRange[1].toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('🔴 [getGateInOperations] Error fetching operations:', error.message);
      throw error;
    }

    return data?.map(this.mapToGateInOperation) || [];
  }

  /**
   * Get Gate In Operation with full normalized details
   * Returns complete data including EDI, Transport, and Damage info
   */
  async getGateInOperationWithDetails(operationId: string): Promise<GateInOperationComplete | null> {
    const { data, error } = await supabase
      .from('v_gate_in_operations_full')
      .select('*')
      .eq('id', operationId)
      .single();

    if (error) {
      console.error('🔴 [getGateInOperationWithDetails] Error:', error.message);
      return null;
    }

    return data as GateInOperationComplete;
  }

  async updateGateOutOperation(operationId: string, data: {
    containerIds: string[];
    operatorId: string;
    operatorName: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current operation
      const { data: currentOp, error: fetchError } = await supabase
        .from('gate_out_operations')
        .select('*')
        .eq('id', operationId)
        .single();

      if (fetchError) throw fetchError;
      if (!currentOp) {
        return { success: false, error: 'Operation not found' };
      }

      // Calculate new counts
      const existingContainerIds = currentOp.processed_container_ids || [];
      const newContainerIds = [...existingContainerIds, ...data.containerIds];
      const processedCount = newContainerIds.length;
      const remainingCount = currentOp.total_containers - processedCount;
      const newStatus = remainingCount === 0 ? 'completed' : 'in_process';

      // Process containers - update their status based on operation completion
      for (const containerId of data.containerIds) {
        const containerStatus = newStatus === 'completed' ? 'out_depot' : 'gate_out';

        await containerService.update(containerId, {
          status: containerStatus, // Status 03: Gate Out (pending) or 04: Out Depot (completed)
          location: containerStatus === 'out_depot' ? null : undefined, // Clear location only when fully out of depot (confirmed)
          gateOutDate: newStatus === 'completed' ? new Date() : undefined,
          gateOutOperationId: operationId, // Link container to this gate out operation
          updatedBy: data.operatorName
        });

        // Create audit log
        await auditService.log({
          entityType: 'container',
          entityId: containerId,
          action: 'update',
          changes: { status: containerStatus },
          userId: data.operatorId,
          userName: data.operatorName
        });
      }

      const { error: updateError } = await supabase
        .from('gate_out_operations')
        .update({
          processed_containers: processedCount,
          remaining_containers: remainingCount,
          processed_container_ids: newContainerIds,
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', operationId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Get current booking to calculate new remaining containers
      const currentBooking = await bookingReferenceService.getById(currentOp.release_order_id);
      if (!currentBooking) {
        return { success: false, error: 'Booking reference not found' };
      }

      // Calculate new booking remaining containers
      const newBookingRemaining = currentBooking.remainingContainers - data.containerIds.length;
      const bookingStatus = newBookingRemaining === 0 ? 'completed' : 'in_process';

      // Update booking reference with new remaining count
      await bookingReferenceService.update(currentOp.release_order_id, {
        remainingContainers: Math.max(0, newBookingRemaining),
        status: bookingStatus,
        completedAt: bookingStatus === 'completed' ? new Date() : undefined
      });

      // Update ALL containers in the operation to 'out_depot' status if operation is completed
      if (newStatus === 'completed') {
        for (const containerId of newContainerIds) {
          const container = await containerService.getById(containerId);
          if (container && container.status === 'gate_out') {
            await containerService.update(containerId, {
              status: 'out_depot',
              location: null, // Clear location when container leaves depot
              gateOutDate: new Date(),
              updatedBy: data.operatorName
            });
          }
        }
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update gate out operation' };
    }
  }

  async getGateOutOperations(filters?: {
    yardId?: string;
    status?: string;
    dateRange?: [Date, Date];
  }): Promise<GateOutOperation[]> {
    // Fetch gate_out_operations with joined booking_references for accurate container counts
    let query = supabase
      .from('gate_out_operations')
      .select(`
        *,
        booking_references (
          total_containers,
          remaining_containers,
          container_quantities
        )
      `)
      .order('created_at', { ascending: false });

    if (filters?.yardId) {
      query = query.eq('yard_id', filters.yardId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange[0].toISOString())
        .lte('created_at', filters.dateRange[1].toISOString());
    }

    const { data: operations, error: queryError } = await query;

    if (queryError) throw queryError;
    if (!operations || operations.length === 0) return [];

    // Fetch transport info separately and merge
    const operationIds = operations.map(op => op.id);
    const { data: transportData } = await supabase
      .from('gate_out_transport_info')
      .select('gate_out_operation_id, driver_name, vehicle_number, transport_company')
      .in('gate_out_operation_id', operationIds);

    // Create map: operation_id -> transport_info
    const transportInfoMap = new Map<string, any>();
    transportData?.forEach(t => {
      transportInfoMap.set(t.gate_out_operation_id, t);
    });

    // Merge and map, using booking_references data for accurate counts
    return operations.map(op => {
      const transportInfo = transportInfoMap.get(op.id) || {};
      const booking = op.booking_references;
      
      // Use booking_references data if available, otherwise fallback to operation data
      return this.mapToGateOutOperation({
        ...op,
        total_containers: booking?.total_containers ?? op.total_containers,
        remaining_containers: booking?.remaining_containers ?? op.remaining_containers,
        driver_name: transportInfo.driver_name || op.driver_name,
        vehicle_number: transportInfo.vehicle_number || op.vehicle_number,
        transport_company: transportInfo.transport_company || op.transport_company
      });
    });
  }

  private mapToGateInOperation(data: any): GateInOperation {
    return {
      id: data.id,
      containerId: data.container_id,
      containerNumber: data.container_number,
      clientCode: data.client_code,
      clientName: data.client_name,
      containerType: data.container_type,
      containerSize: data.container_size,
      isHighCube: data.is_high_cube === true,
      containerQuantity: data.container_quantity || 1, // Default to 1 if not set
      secondContainerNumber: data.second_container_number,
      transportCompany: data.transport_company,
      driverName: data.driver_name,
      truckNumber: data.vehicle_number, // Fix: map vehicle_number to truckNumber
      assignedLocation: data.assigned_location,
      assignedStack: data.assigned_stack, // Map assigned_stack
      fullEmpty: data.full_empty || 'FULL',
      transactionType: data.transaction_type || 'Retour Livraison',
      containerIsoCode: data.container_iso_code || undefined,
      classification: data.classification || 'divers', // Fix: default to 'divers' not 'autres'
      damageReported: data.damage_reported,
      damageDescription: data.damage_description,
      damageAssessment: data.damage_assessment_stage ? {
        hasDamage: data.damage_reported || false,
        damageType: data.damage_type,
        damageDescription: data.damage_description,
        assessmentStage: data.damage_assessment_stage as 'assignment' | 'inspection',
        assessedBy: data.damage_assessed_by || 'Unknown',
        assessedAt: data.damage_assessed_at ? new Date(data.damage_assessed_at) : new Date()
      } : undefined,
      status: data.status,
      operationStatus: data.completed_at ? 'completed' : 'pending', // Map status based on completion
      operatorId: data.operator_id,
      operatorName: data.operator_name,
      yardId: data.yard_id,
      ediTransmitted: data.edi_transmitted,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined
    };
  }

  private mapToGateOutOperation(data: any): GateOutOperation {
    return {
      id: data.id,
      date: new Date(data.created_at),
      bookingNumber: data.booking_number,
      clientCode: data.client_code,
      clientName: data.client_name,
      bookingType: data.booking_type,
      totalContainers: data.total_containers,
      processedContainers: data.processed_containers,
      remainingContainers: data.remaining_containers,
      processedContainerIds: data.processed_container_ids || [],
      transportCompany: data.transport_company,
      driverName: data.driver_name,
      truckNumber: data.vehicle_number, // Fix: map vehicle_number to truckNumber
      status: data.status,
      createdBy: data.operator_name,
      operatorName: data.operator_name,
      yardId: data.yard_id,
      ediTransmitted: data.edi_transmitted,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      bookingReferenceId: data.release_order_id
    };
  }

  /**
   * Get recent gate out operations with container details
   * Shows both pending operations and completed containers
   * 
   * Status Flow:
   * - Phase 1: Create gate_out_operation with status 'pending'
   * - Phase 2: Process containers, set container status to 'gate_out' (03)
   * - Phase 3: Complete operation, set container status to 'out_depot' (04)
   * 
   * This method displays:
   * 1. All containers with status 'gate_out' or 'out_depot' (completed gate outs)
   * 2. All pending gate_out_operations (awaiting container processing)
   */
  async getRecentGateOutOperations(limit: number = 50): Promise<any[]> {
    try {
      // Fetch all gate out operations with transport info from normalized table
      // Fetch all gate out operations with booking_references join for accurate counts
      const { data: operations, error: opsError } = await supabase
        .from('gate_out_operations')
        .select(`
          id,
          created_at,
          booking_number,
          booking_type,
          client_code,
          client_name,
          status,
          total_containers,
          processed_containers,
          remaining_containers,
          edi_transmitted,
          edi_transmission_date,
          completed_at,
          booking_references (
            total_containers,
            remaining_containers
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (opsError) {
        console.error('Error fetching gate out operations:', opsError);
        throw opsError;
      }

      // Fetch transport info separately and merge
      let transportInfoMap = new Map<string, any>();
      if (operations && operations.length > 0) {
        const operationIds = operations.map(op => op.id);
        const { data: transportData, error: transportError } = await supabase
          .from('gate_out_transport_info')
          .select('gate_out_operation_id, driver_name, vehicle_number, transport_company')
          .in('gate_out_operation_id', operationIds);
        
        if (transportError) {
          console.warn('Failed to fetch transport info:', transportError);
        } else if (transportData) {
          transportData.forEach(t => {
            transportInfoMap.set(t.gate_out_operation_id, t);
          });
        }
      }

      // Merge operations with transport info and booking data
      const operationsWithTransport = operations?.map(op => {
        const booking = op.booking_references;
        return {
          ...op,
          // Use booking_references data for accurate counts
          total_containers: booking?.total_containers ?? op.total_containers,
          remaining_containers: booking?.remaining_containers ?? op.remaining_containers,
          gate_out_transport_info: transportInfoMap.has(op.id) ? [transportInfoMap.get(op.id)] : []
        };
      }) || [];

      // Fetch ALL containers with status 'gate_out' (03) or 'out_depot' (04)
      // Join with gate_out_operations to get full details
      const { data: allGateOutContainers, error: containerError } = await supabase
        .from('containers')
        .select(`
          id,
          number,
          size,
          type,
          booking_reference,
          gate_out_date,
          edi_gate_out_transmitted,
          edi_gate_out_transmission_date,
          client_code,
          status,
          gate_out_operation_id,
          gate_out_operations:gate_out_operation_id (
            id,
            booking_number,
            booking_type,
            client_code,
            client_name,
            gate_out_transport_info (
              driver_name,
              vehicle_number,
              transport_company
            )
          )
        `)
        .in('status', ['gate_out', 'out_depot'])
        .order('gate_out_date', { ascending: false })
        .limit(limit);

      if (containerError) {
        console.error('Error fetching gate out containers:', containerError);
      }

      const results: any[] = [];

      // Add all gate out/out_depot containers as completed operations
      if (allGateOutContainers && allGateOutContainers.length > 0) {
        // Get unique client codes to fetch client names
        const clientCodes = [...new Set(allGateOutContainers.map(c => c.client_code).filter(Boolean))];
        
        // Fetch client names
        let clientMap = new Map<string, string>();
        if (clientCodes.length > 0) {
          const { data: clients } = await supabase
            .from('clients')
            .select('code, name')
            .in('code', clientCodes);
          
          if (clients) {
            clients.forEach(client => {
              clientMap.set(client.code, client.name);
            });
          }
        }

        allGateOutContainers.forEach(container => {
          // Use joined operation data if available, otherwise try to find matching operation
          const linkedOp = container.gate_out_operations;
          const matchingOp = linkedOp || operations?.find(op => op.booking_number === container.booking_reference);
          
          // Get client name from map, linked operation, or matching operation
          const clientName = clientMap.get(container.client_code) || 
                            linkedOp?.client_name || 
                            matchingOp?.client_name || 
                            '-';
          
          // Get transport info from nested gate_out_transport_info array (first item)
          const transportInfo = linkedOp?.gate_out_transport_info?.[0] || matchingOp?.gate_out_transport_info?.[0] || {};

          results.push({
            id: `container-${container.id}`,
            operationId: linkedOp?.id || matchingOp?.id || null,
            exitDate: container.gate_out_date ? new Date(container.gate_out_date) : null,
            containerNumber: container.number,
            containerSize: container.size,
            containerType: container.type,
            bookingNumber: linkedOp?.booking_number || container.booking_reference || '-',
            bookingType: linkedOp?.booking_type || matchingOp?.booking_type || null,
            clientCode: container.client_code || linkedOp?.client_code || matchingOp?.client_code || '-',
            clientName: clientName,
            driverName: transportInfo.driver_name || '-',
            truckNumber: transportInfo.vehicle_number || '-',
            transportCompany: transportInfo.transport_company || '-',
            status: 'completed',
            ediTransmitted: container.edi_gate_out_transmitted || false,
            ediTransmissionDate: container.edi_gate_out_transmission_date ? new Date(container.edi_gate_out_transmission_date) : null
          });
        });
      }

      // Add pending operations (Phase 1 - awaiting container processing)
      if (operationsWithTransport && operationsWithTransport.length > 0) {
        // Fetch containers linked to these pending bookings
        const pendingBookingNumbers = operationsWithTransport
          .filter(op => op.status === 'pending' || op.processed_containers === 0)
          .map(op => op.booking_number);
        
        let containersByBooking = new Map<string, any[]>();
        if (pendingBookingNumbers.length > 0) {
          const { data: bookingContainers } = await supabase
            .from('containers')
            .select('id, number, size, type, status, booking_reference')
            .in('booking_reference', pendingBookingNumbers);
          
          if (bookingContainers) {
            bookingContainers.forEach(c => {
              if (!containersByBooking.has(c.booking_reference)) {
                containersByBooking.set(c.booking_reference, []);
              }
              containersByBooking.get(c.booking_reference)!.push(c);
            });
          }
        }
        
        operationsWithTransport.forEach(op => {
          if (op.status === 'pending' || op.processed_containers === 0) {
            // Get transport info from merged data
            const transportInfo = op.gate_out_transport_info?.[0] || {};
            
            // Get containers for this booking
            const bookingContainers = containersByBooking.get(op.booking_number) || [];
            const processedCount = op.processed_containers || 0;
            const totalCount = op.total_containers || 0;
            
            results.push({
              id: `operation-${op.id}`,
              operationId: op.id,
              exitDate: null,
              containerNumber: null,
              containerSize: null,
              containerType: null,
              bookingNumber: op.booking_number,
              bookingType: op.booking_type,
              clientCode: op.client_code,
              clientName: op.client_name,
              driverName: transportInfo.driver_name || '-',
              truckNumber: transportInfo.vehicle_number || '-',
              transportCompany: transportInfo.transport_company || '-',
              status: op.status,
              ediTransmitted: false,
              ediTransmissionDate: null,
              // Container tracking
              processedContainers: processedCount,
              totalContainers: totalCount,
              remainingContainers: totalCount - processedCount,
              // List of container numbers for this booking
              containerNumbers: bookingContainers.map(c => c.number),
              processedContainerIds: op.processed_container_ids || []
            });
          }
        });
      }

      // Sort by date (most recent first)
      results.sort((a, b) => {
        const dateA = a.exitDate || new Date(0);
        const dateB = b.exitDate || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      return results;
    } catch (error) {
      console.error('Error in getRecentGateOutOperations:', error);
      return [];
    }
  }
}

export const gateService = new GateService();
