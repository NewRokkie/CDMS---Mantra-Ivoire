import { supabase } from './supabaseClient';
import { containerService } from './containerService';
import { bookingReferenceService } from './bookingReferenceService';
import { auditService } from './auditService';
import { eventBus } from '../eventBus';
import { Container } from '../../types';
import { GateInOperation, GateOutOperation } from '../../types/operations';

export interface GateInData {
  containerNumber: string;
  clientCode: string;
  containerType: string;
  containerSize: string;
  transportCompany: string;
  driverName: string;
  truckNumber: string;
  location: string;
  weight?: number;
  operatorId: string;
  operatorName: string;
  yardId: string;
  damageReported?: boolean;
  damageDescription?: string;
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
  async processGateIn(data: GateInData): Promise<{ success: boolean; containerId?: string; error?: string }> {
    try {
      // Get client info
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('code', data.clientCode)
        .maybeSingle();

      if (clientError) throw clientError;
      if (!client) {
        return { success: false, error: 'Client not found' };
      }

      // Check if container already exists
      const existing = await containerService.getAll();
      const existingContainer = existing.find(c => c.number === data.containerNumber);

      if (existingContainer) {
        return { success: false, error: 'Container already exists in system' };
      }

      // Create container
      const newContainer = await containerService.create({
        number: data.containerNumber,
        type: data.containerType as any,
        size: data.containerSize as any,
        status: 'in_depot',
        location: data.location,
        yardId: data.yardId,
        clientId: client.id,
        client: client.name,
        clientCode: client.code,
        gateInDate: new Date(),
        weight: data.weight,
        damage: data.damageReported && data.damageDescription
          ? [data.damageDescription]
          : [],
        createdBy: data.operatorName
      } as any);

      // Create gate in operation
      const { data: operation, error: opError } = await supabase
        .from('gate_in_operations')
        .insert({
          container_id: newContainer.id,
          container_number: data.containerNumber,
          client_code: data.clientCode,
          client_name: client.name,
          container_type: data.containerType,
          container_size: data.containerSize,
          transport_company: data.transportCompany,
          driver_name: data.driverName,
          vehicle_number: data.truckNumber,
          assigned_location: null,
          damage_reported: data.damageReported || false,
          damage_description: data.damageDescription,
          weight: data.weight,
          status: 'pending',
          operator_id: data.operatorId,
          operator_name: data.operatorName,
          yard_id: data.yardId,
          edi_transmitted: false,
          completed_at: null
        })
        .select()
        .single();

      if (opError) throw opError;

      // Create audit log
      await auditService.log({
        entityType: 'container',
        entityId: newContainer.id,
        action: 'create',
        changes: { created: newContainer },
        userId: data.operatorId,
        userName: data.operatorName
      });

      // Map operation data to GateInOperation type
      const mappedOperation = this.mapToGateInOperation(operation);

      // Emit GATE_IN_COMPLETED event
      await eventBus.emit('GATE_IN_COMPLETED', {
        container: newContainer,
        operation: mappedOperation
      });

      return { success: true, containerId: newContainer.id };
    } catch (error: any) {
      console.error('Gate in error:', error);

      // Emit GATE_IN_FAILED event
      eventBus.emitSync('GATE_IN_FAILED', {
        containerNumber: data.containerNumber,
        error: error.message || 'Failed to process gate in'
      });

      return { success: false, error: error.message || 'Failed to process gate in' };
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
      // Get booking reference
      const bookingReference = await bookingReferenceService.getById(data.bookingReferenceId);
      if (!bookingReference) {
        return { success: false, error: 'Booking reference not found' };
      }

      // Create pending gate out operation
      const { data: operation, error: opError } = await supabase
        .from('gate_out_operations')
        .insert({
          booking_reference_id: data.bookingReferenceId,
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
      console.error('Create pending gate out error:', error);
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

      // Update containers
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
          booking_reference_id: data.bookingReferenceId,
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
      console.error('Gate out error:', error);

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
    console.log('🔍 [GateService] getGateInOperations called with filters:', filters);

    // First, let's check if there are ANY records in the table
    const { data: allRecords, error: countError } = await supabase
      .from('gate_in_operations')
      .select('id, yard_id, created_at, status', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ [GateService] Error counting gate_in_operations:', countError);
    } else {
      console.log('🔍 [GateService] Total gate_in_operations in database:', allRecords);
      console.log('🔍 [GateService] Sample records:', allRecords?.slice(0, 5) || []);
    }

    let query = supabase
      .from('gate_in_operations')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.yardId) {
      console.log('🔍 [GateService] Filtering by yard_id:', filters.yardId);
      query = query.eq('yard_id', filters.yardId);
    } else {
      console.log('🔍 [GateService] No yard_id filter applied');
    }

    if (filters?.status) {
      console.log('🔍 [GateService] Filtering by status:', filters.status);
      query = query.eq('status', filters.status);
    }

    if (filters?.dateRange) {
      console.log('🔍 [GateService] Filtering by date range:', filters.dateRange);
      query = query
        .gte('created_at', filters.dateRange[0].toISOString())
        .lte('created_at', filters.dateRange[1].toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [GateService] Error querying gate_in_operations:', error);
      throw error;
    }

    console.log('🔍 [GateService] Query returned', data?.length || 0, 'records for yard', filters?.yardId);
    console.log('🔍 [GateService] First few records:', data?.slice(0, 3) || []);
    console.log('🔍 [GateService] All records:', data || []);

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

      // Process containers - update their status
      for (const containerId of data.containerIds) {
        await containerService.update(containerId, {
          status: 'out_depot',
          gateOutDate: new Date(),
          updatedBy: data.operatorName
        });

        // Create audit log
        await auditService.log({
          entityType: 'container',
          entityId: containerId,
          action: 'update',
          changes: { status: 'out_depot' },
          userId: data.operatorId,
          userName: data.operatorName
        });
      }

      // Update operation
      const existingContainerIds = currentOp.processed_container_ids || [];
      const newContainerIds = [...existingContainerIds, ...data.containerIds];
      const processedCount = newContainerIds.length;
      const remainingCount = currentOp.total_containers - processedCount;
      const newStatus = remainingCount === 0 ? 'completed' : 'in_process';

      const { data: updated, error: updateError } = await supabase
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

      // Update booking reference if completed
      if (newStatus === 'completed') {
        await bookingReferenceService.update(currentOp.booking_reference_id, {
          remainingContainers: 0,
          status: 'completed'
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error('Update gate out operation error:', error);
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
      transportCompany: data.transport_company,
      driverName: data.driver_name,
      truckNumber: data.vehicle_number, // Fix: map vehicle_number to truckNumber
      assignedLocation: data.assigned_location,
      damageReported: data.damage_reported,
      damageDescription: data.damage_description,
      weight: data.weight,
      status: data.status,
      operationStatus: data.completed_at ? 'completed' : 'pending', // Map status based on completion
      isDamaged: data.damage_reported || false, // Map damage_reported to isDamaged for filtering
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
      bookingReferenceId: data.booking_reference_id
    };
  }
}

export const gateService = new GateService();
