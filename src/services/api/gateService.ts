import { supabase } from './supabaseClient';
import { containerService } from './containerService';
import { releaseService } from './releaseService';
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
  vehicleNumber: string;
  location: string;
  weight?: number;
  operatorId: string;
  operatorName: string;
  yardId: string;
  damageReported?: boolean;
  damageDescription?: string;
}

export interface GateOutData {
  releaseOrderId: string;
  containerIds: string[];
  transportCompany: string;
  driverName: string;
  vehicleNumber: string;
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
          vehicle_number: data.vehicleNumber,
          assigned_location: data.location,
          damage_reported: data.damageReported || false,
          damage_description: data.damageDescription,
          weight: data.weight,
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

  async processGateOut(data: GateOutData): Promise<{ success: boolean; error?: string }> {
    try {
      // Get release order
      const releaseOrder = await releaseService.getById(data.releaseOrderId);
      if (!releaseOrder) {
        return { success: false, error: 'Release order not found' };
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

      // Update release order
      const newRemaining = releaseOrder.remainingContainers - data.containerIds.length;
      await releaseService.update(data.releaseOrderId, {
        remainingContainers: newRemaining,
        status: newRemaining === 0 ? 'completed' : 'in_process'
      });

      // Create gate out operation
      const { data: operation, error: opError } = await supabase
        .from('gate_out_operations')
        .insert({
          release_order_id: data.releaseOrderId,
          booking_number: releaseOrder.bookingNumber || '',
          client_code: releaseOrder.clientCode,
          client_name: releaseOrder.clientName,
          booking_type: releaseOrder.bookingType,
          total_containers: releaseOrder.totalContainers,
          processed_containers: data.containerIds.length,
          remaining_containers: newRemaining,
          processed_container_ids: data.containerIds,
          transport_company: data.transportCompany,
          driver_name: data.driverName,
          vehicle_number: data.vehicleNumber,
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

      // Get updated release order
      const updatedReleaseOrder = await releaseService.getById(data.releaseOrderId);
      if (!updatedReleaseOrder) throw new Error('Failed to fetch updated release order');

      // Map operation data
      const mappedOperation = this.mapToGateOutOperation(operation);

      // Emit GATE_OUT_COMPLETED event
      await eventBus.emit('GATE_OUT_COMPLETED', {
        containers: validContainers,
        operation: mappedOperation,
        releaseOrder: updatedReleaseOrder
      });

      return { success: true };
    } catch (error: any) {
      console.error('Gate out error:', error);

      // Emit GATE_OUT_FAILED event
      eventBus.emitSync('GATE_OUT_FAILED', {
        releaseOrderId: data.releaseOrderId,
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

    if (error) throw error;
    return data.map(this.mapToGateInOperation);
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
      vehicleNumber: data.vehicle_number,
      assignedLocation: data.assigned_location,
      damageReported: data.damage_reported,
      damageDescription: data.damage_description,
      weight: data.weight,
      status: data.status,
      operatorId: data.operator_id,
      operatorName: data.operator_name,
      yardId: data.yard_id,
      ediTransmitted: data.edi_transmitted,
      ediTransmissionDate: data.edi_transmission_date ? new Date(data.edi_transmission_date) : undefined,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined
    };
  }

  private mapToGateOutOperation(data: any): GateOutOperation {
    return {
      id: data.id,
      releaseOrderId: data.release_order_id,
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
      vehicleNumber: data.vehicle_number,
      status: data.status,
      createdBy: data.operator_name,
      operatorId: data.operator_id,
      operatorName: data.operator_name,
      yardId: data.yard_id,
      ediTransmitted: data.edi_transmitted,
      ediTransmissionDate: data.edi_transmission_date ? new Date(data.edi_transmission_date) : undefined,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      date: new Date(data.created_at)
    };
  }
}

export const gateService = new GateService();
