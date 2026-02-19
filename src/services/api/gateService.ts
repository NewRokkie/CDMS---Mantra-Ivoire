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
  location: string;
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
   * Creates Gate In operation record
   */
  private async createGateInOperation(data: GateInData, client: any, container: any): Promise<any> {
    const result = await handleAsyncOperation(async () => {
      // Ensure second_container_number is NULL (not undefined or empty string) when container_quantity is 1
      const containerQuantity = data.containerQuantity || 1;
      const secondContainerNumber = containerQuantity === 2 && data.secondContainerNumber
        ? data.secondContainerNumber.trim().toUpperCase()
        : null;

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
          full_empty: data.fullEmpty || 'FULL', // Add full/empty status from form data
          transport_company: data.transportCompany,
          driver_name: data.driverName,
          vehicle_number: data.truckNumber,
          truck_arrival_date: data.truckArrivalDate || new Date().toISOString().split('T')[0], // Store truck arrival date
          truck_arrival_time: data.truckArrivalTime || new Date().toTimeString().slice(0, 5), // Store truck arrival time
          assigned_location: null,
          classification: data.classification || 'divers',
          transaction_type: data.transactionType || 'Retour Livraison', // Transaction type for reports
          equipment_reference: data.equipmentReference, // Equipment reference for EDI transmission
          container_iso_code: data.containerIsoCode || null, // ISO type from dropdown (e.g. 45G1)
          damage_reported: data.damageAssessment?.hasDamage || data.damageReported || false,
          damage_description: data.damageAssessment?.damageDescription || data.damageDescription,
          damage_assessment_stage: data.damageAssessment?.assessmentStage || 'assignment',
          damage_assessed_by: data.damageAssessment?.assessedBy,
          damage_assessed_at: data.damageAssessment?.assessedAt?.toISOString(),
          damage_type: data.damageAssessment?.damageType,
          // NOTE: 'weight' column does NOT exist in gate_in_operations table → removed
          booking_reference: data.bookingReference || null,
          notes: data.notes || null,
          status: 'pending',
          operator_id: data.operatorId,
          operator_name: data.operatorName,
          yard_id: data.yardId,
          edi_transmitted: false,
          completed_at: null
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
      const { data: operations, error } = await supabase
        .from('gate_out_operations')
        .select('*')
        .eq('vehicle_number', vehicleNumber.trim().toUpperCase())
        .eq('status', 'pending');

      if (error) throw error;
      return (operations?.length || 0) > 0;
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
          transport_company: data.transportCompany,
          driver_name: data.driverName,
          vehicle_number: data.vehicleNumber,
          status: 'pending',
          operator_id: data.operatorId,
          operator_name: data.operatorName,
          yard_id: data.yardId,
          edi_transmitted: false
        })
        .select()
        .single();

      if (opError) throw opError;

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
          transport_company: data.transportCompany,
          driver_name: data.driverName,
          vehicle_number: data.truckNumber,
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

  async getGateInOperations(filters?: {
    yardId?: string;
    status?: string;
    dateRange?: [Date, Date];
  }): Promise<GateInOperation[]> {
    let query = supabase
      .from('gate_in_operations')
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
      throw error;
    }

    return data?.map(this.mapToGateInOperation) || [];
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
          gateOutDate: newStatus === 'completed' ? new Date() : undefined,
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

      // Update booking reference and all containers if completed
      if (newStatus === 'completed') {
        await bookingReferenceService.update(currentOp.release_order_id, {
          remainingContainers: 0,
          status: 'completed'
        });

        // Update ALL containers in the operation to 'out_depot' status
        for (const containerId of newContainerIds) {
          const container = await containerService.getById(containerId);
          if (container && container.status === 'gate_out') {
            await containerService.update(containerId, {
              status: 'out_depot',
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
    let query = supabase
      .from('gate_out_operations')
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

    if (error) throw error;
    return data.map(this.mapToGateOutOperation);
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
}

export const gateService = new GateService();
