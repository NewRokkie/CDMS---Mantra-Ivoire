/**
 * Gate Operations Service - Database-connected gate management
 * Handles Gate In/Out operations, validation, and transport management
 */

import { dbService } from './DatabaseService';
import { containerService } from './ContainerService';

export interface GateInOperation {
  id: string;
  operation_number: string;
  container_number: string;
  second_container_number?: string;
  container_size: '20ft' | '40ft';
  container_type: 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
  container_quantity: number;
  full_empty_status: 'FULL' | 'EMPTY';
  is_damaged: boolean;
  damage_description?: string;
  client_code: string;
  client_name: string;
  booking_reference?: string;
  transport_company: string;
  truck_number: string;
  driver_name: string;
  truck_arrival_date?: string;
  truck_arrival_time?: string;
  truck_departure_date?: string;
  truck_departure_time?: string;
  assigned_yard_id?: string;
  assigned_position_id?: string;
  assigned_location?: string;
  operation_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  notes?: string;
}

export interface GateOutOperation {
  id: string;
  operation_number: string;
  container_number: string;
  container_size: '20ft' | '40ft';
  client_code: string;
  client_name: string;
  booking_number?: string;
  release_order_id?: string;
  transport_company: string;
  vehicle_number: string;
  driver_name: string;
  current_yard_id?: string;
  current_location?: string;
  operation_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_pickup?: string;
  actual_pickup_started?: string;
  actual_pickup_completed?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface TransportCompany {
  id: string;
  name: string;
  code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'blacklisted' | 'suspended';
  is_approved: boolean;
  total_operations: number;
  successful_operations: number;
  average_rating: number;
}

export interface Vehicle {
  id: string;
  vehicle_number: string;
  license_plate?: string;
  vehicle_type: 'truck' | 'trailer' | 'chassis' | 'container_truck';
  transport_company_id?: string;
  transport_company_name?: string;
  is_active: boolean;
  is_available: boolean;
}

export interface Driver {
  id: string;
  name: string;
  license_number?: string;
  phone?: string;
  transport_company_id?: string;
  transport_company_name?: string;
  is_active: boolean;
  is_available: boolean;
  current_status: 'available' | 'on_trip' | 'off_duty' | 'suspended';
  total_trips: number;
  safety_rating: number;
}

export class GateOperationsService {

  /**
   * Get all pending Gate In operations
   */
  async getPendingGateInOperations(): Promise<GateInOperation[]> {
    try {
      const operations = await dbService.queryView<GateInOperation>('v_pending_gate_in');
      return operations;
    } catch (error) {
      console.error('Failed to get pending gate in operations:', error);
      return [];
    }
  }

  /**
   * Get all pending Gate Out operations
   */
  async getPendingGateOutOperations(): Promise<GateOutOperation[]> {
    try {
      const operations = await dbService.queryView<GateOutOperation>('v_pending_gate_out');
      return operations;
    } catch (error) {
      console.error('Failed to get pending gate out operations:', error);
      return [];
    }
  }

  /**
   * Create Gate In operation
   */
  async createGateInOperation(data: {
    containerNumber: string;
    secondContainerNumber?: string;
    containerSize: '20ft' | '40ft';
    containerType: 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
    containerQuantity: number;
    fullEmptyStatus: 'FULL' | 'EMPTY';
    isDamaged: boolean;
    damageDescription?: string;
    clientCode: string;
    clientName: string;
    bookingReference?: string;
    transportCompany: string;
    truckNumber: string;
    driverName: string;
    truckArrivalDate?: string;
    truckArrivalTime?: string;
    assignedYardId?: string;
    notes?: string;
  }): Promise<GateInOperation | null> {
    try {
      const newOperation = await dbService.insert<GateInOperation>('gate_in_operations', {
        container_number: data.containerNumber,
        second_container_number: data.secondContainerNumber,
        container_size: data.containerSize,
        container_type: data.containerType,
        container_quantity: data.containerQuantity,
        full_empty_status: data.fullEmptyStatus,
        is_damaged: data.isDamaged,
        damage_description: data.damageDescription,
        client_code: data.clientCode,
        client_name: data.clientName,
        booking_reference: data.bookingReference,
        transport_company: data.transportCompany,
        truck_number: data.truckNumber,
        driver_name: data.driverName,
        truck_arrival_date: data.truckArrivalDate,
        truck_arrival_time: data.truckArrivalTime,
        assigned_yard_id: data.assignedYardId,
        operation_status: 'pending',
        notes: data.notes,
      });

      if (newOperation) {
        console.log(`✅ Created Gate In operation ${newOperation.operation_number}`);
      }

      return newOperation;
    } catch (error) {
      console.error('Failed to create Gate In operation:', error);
      throw error;
    }
  }

  /**
   * Create Gate Out operation
   */
  async createGateOutOperation(data: {
    containerNumber: string;
    containerSize: '20ft' | '40ft';
    clientCode: string;
    clientName: string;
    bookingNumber?: string;
    releaseOrderId?: string;
    transportCompany: string;
    vehicleNumber: string;
    driverName: string;
    currentYardId?: string;
    currentLocation?: string;
    scheduledPickup?: string;
    notes?: string;
  }): Promise<GateOutOperation | null> {
    try {
      const newOperation = await dbService.insert<GateOutOperation>('gate_out_operations', {
        container_number: data.containerNumber,
        container_size: data.containerSize,
        client_code: data.clientCode,
        client_name: data.clientName,
        booking_number: data.bookingNumber,
        release_order_id: data.releaseOrderId,
        transport_company: data.transportCompany,
        vehicle_number: data.vehicleNumber,
        driver_name: data.driverName,
        current_yard_id: data.currentYardId,
        current_location: data.currentLocation,
        scheduled_pickup: data.scheduledPickup,
        operation_status: 'pending',
        notes: data.notes,
      });

      if (newOperation) {
        console.log(`✅ Created Gate Out operation ${newOperation.operation_number}`);
      }

      return newOperation;
    } catch (error) {
      console.error('Failed to create Gate Out operation:', error);
      throw error;
    }
  }

  /**
   * Update Gate In operation status
   */
  async updateGateInOperationStatus(
    operationId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
    assignedLocation?: string,
    notes?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        operation_status: status,
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.processing_completed_at = new Date().toISOString();
      }

      if (status === 'in_progress') {
        updateData.processing_started_at = new Date().toISOString();
      }

      if (assignedLocation) {
        updateData.assigned_location = assignedLocation;
        updateData.location_confirmed = true;
        updateData.location_confirmed_at = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = notes;
      }

      await dbService.update('gate_in_operations', updateData, { id: operationId });

      console.log(`✅ Updated Gate In operation ${operationId} status to ${status}`);
      return true;
    } catch (error) {
      console.error('Failed to update Gate In operation status:', error);
      return false;
    }
  }

  /**
   * Update Gate Out operation status
   */
  async updateGateOutOperationStatus(
    operationId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
    notes?: string
  ): Promise<boolean> {
    try {
      const updateData: any = {
        operation_status: status,
      };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
        updateData.actual_pickup_completed = new Date().toISOString();
      }

      if (status === 'in_progress') {
        updateData.actual_pickup_started = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = notes;
      }

      await dbService.update('gate_out_operations', updateData, { id: operationId });

      console.log(`✅ Updated Gate Out operation ${operationId} status to ${status}`);
      return true;
    } catch (error) {
      console.error('Failed to update Gate Out operation status:', error);
      return false;
    }
  }

  /**
   * Complete Gate In operation
   */
  async completeGateInOperation(
    operationId: string,
    finalData: {
      assignedYardId: string;
      assignedPositionId?: string;
      assignedLocation: string;
      grossWeight?: number;
      tareWeight?: number;
      sealNumbers?: string[];
      inspectionPassed?: boolean;
      inspectionNotes?: string;
    },
    performedBy?: string
  ): Promise<boolean> {
    try {
      // Get the operation details
      const operation = await dbService.selectOne<GateInOperation>(
        'gate_in_operations',
        '*',
        { id: operationId }
      );

      if (!operation) {
        throw new Error('Gate In operation not found');
      }

      // Update operation status
      await this.updateGateInOperationStatus(
        operationId,
        'completed',
        finalData.assignedLocation
      );

      // Process gate in for the container
      await containerService.processGateIn(
        operation.container_number,
        {
          type: operation.container_type,
          size: operation.container_size,
          clientCode: operation.client_code,
          clientName: operation.client_name,
          yardId: finalData.assignedYardId,
          positionId: finalData.assignedPositionId,
          location: finalData.assignedLocation,
          isDamaged: operation.is_damaged,
          damageDescription: operation.damage_description,
          bookingReference: operation.booking_reference,
          seals: finalData.sealNumbers,
          weight: finalData.grossWeight,
        },
        performedBy
      );

      console.log(`✅ Completed Gate In operation for container ${operation.container_number}`);
      return true;
    } catch (error) {
      console.error('Failed to complete Gate In operation:', error);
      return false;
    }
  }

  /**
   * Complete Gate Out operation
   */
  async completeGateOutOperation(
    operationId: string,
    finalData: {
      finalWeight?: number;
      newSeals?: string[];
      deliveryOrderNumber?: string;
    },
    performedBy?: string
  ): Promise<boolean> {
    try {
      // Get the operation details
      const operation = await dbService.selectOne<GateOutOperation>(
        'gate_out_operations',
        '*',
        { id: operationId }
      );

      if (!operation) {
        throw new Error('Gate Out operation not found');
      }

      // Update operation status
      await this.updateGateOutOperationStatus(operationId, 'completed');

      // Process gate out for the container
      await containerService.processGateOut(
        operation.container_number,
        {
          transportCompany: operation.transport_company,
          driverName: operation.driver_name,
          vehicleNumber: operation.vehicle_number,
          finalWeight: finalData.finalWeight,
          seals: finalData.newSeals,
        },
        performedBy
      );

      console.log(`✅ Completed Gate Out operation for container ${operation.container_number}`);
      return true;
    } catch (error) {
      console.error('Failed to complete Gate Out operation:', error);
      return false;
    }
  }

  /**
   * Get Gate In operation by ID
   */
  async getGateInOperation(operationId: string): Promise<GateInOperation | null> {
    try {
      return await dbService.selectOne<GateInOperation>(
        'gate_in_operations',
        '*',
        { id: operationId }
      );
    } catch (error) {
      console.error('Failed to get Gate In operation:', error);
      return null;
    }
  }

  /**
   * Get Gate Out operation by ID
   */
  async getGateOutOperation(operationId: string): Promise<GateOutOperation | null> {
    try {
      return await dbService.selectOne<GateOutOperation>(
        'gate_out_operations',
        '*',
        { id: operationId }
      );
    } catch (error) {
      console.error('Failed to get Gate Out operation:', error);
      return null;
    }
  }

  /**
   * Get operations by container number
   */
  async getOperationsByContainer(containerNumber: string): Promise<{
    gateInOperations: GateInOperation[];
    gateOutOperations: GateOutOperation[];
  }> {
    try {
      const [gateInOps, gateOutOps] = await Promise.all([
        dbService.select<GateInOperation>(
          'gate_in_operations',
          '*',
          { container_number: containerNumber },
          'created_at DESC'
        ),
        dbService.select<GateOutOperation>(
          'gate_out_operations',
          '*',
          { container_number: containerNumber },
          'created_at DESC'
        )
      ]);

      return {
        gateInOperations: gateInOps,
        gateOutOperations: gateOutOps,
      };
    } catch (error) {
      console.error('Failed to get operations by container:', error);
      return {
        gateInOperations: [],
        gateOutOperations: [],
      };
    }
  }

  /**
   * Get gate operation statistics
   */
  async getGateOperationStats(): Promise<{
    gateIn: {
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
      today: number;
    };
    gateOut: {
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
      today: number;
    };
  }> {
    try {
      const stats = await dbService.queryView('v_gate_operation_stats');

      const gateInStats = stats.find(s => s.operation_type === 'gate_in') || {
        total_operations: 0,
        pending_operations: 0,
        in_progress_operations: 0,
        completed_operations: 0,
        today_operations: 0,
      };

      const gateOutStats = stats.find(s => s.operation_type === 'gate_out') || {
        total_operations: 0,
        pending_operations: 0,
        in_progress_operations: 0,
        completed_operations: 0,
        today_operations: 0,
      };

      return {
        gateIn: {
          total: parseInt(gateInStats.total_operations) || 0,
          pending: parseInt(gateInStats.pending_operations) || 0,
          inProgress: parseInt(gateInStats.in_progress_operations) || 0,
          completed: parseInt(gateInStats.completed_operations) || 0,
          today: parseInt(gateInStats.today_operations) || 0,
        },
        gateOut: {
          total: parseInt(gateOutStats.total_operations) || 0,
          pending: parseInt(gateOutStats.pending_operations) || 0,
          inProgress: parseInt(gateOutStats.in_progress_operations) || 0,
          completed: parseInt(gateOutStats.completed_operations) || 0,
          today: parseInt(gateOutStats.today_operations) || 0,
        },
      };
    } catch (error) {
      console.error('Failed to get gate operation statistics:', error);
      return {
        gateIn: { total: 0, pending: 0, inProgress: 0, completed: 0, today: 0 },
        gateOut: { total: 0, pending: 0, inProgress: 0, completed: 0, today: 0 },
      };
    }
  }

  /**
   * Get all transport companies
   */
  async getTransportCompanies(): Promise<TransportCompany[]> {
    try {
      return await dbService.select<TransportCompany>(
        'transport_companies',
        '*',
        { status: 'active' },
        'name ASC'
      );
    } catch (error) {
      console.error('Failed to get transport companies:', error);
      return [];
    }
  }

  /**
   * Get vehicles for transport company
   */
  async getVehiclesByCompany(companyId: string): Promise<Vehicle[]> {
    try {
      return await dbService.select<Vehicle>(
        'vehicles',
        '*',
        { transport_company_id: companyId, is_active: true },
        'vehicle_number ASC'
      );
    } catch (error) {
      console.error('Failed to get vehicles by company:', error);
      return [];
    }
  }

  /**
   * Get drivers for transport company
   */
  async getDriversByCompany(companyId: string): Promise<Driver[]> {
    try {
      return await dbService.select<Driver>(
        'drivers',
        '*',
        { transport_company_id: companyId, is_active: true },
        'name ASC'
      );
    } catch (error) {
      console.error('Failed to get drivers by company:', error);
      return [];
    }
  }

  /**
   * Search transport companies
   */
  async searchTransportCompanies(searchTerm: string): Promise<TransportCompany[]> {
    try {
      const companies = await dbService.query<TransportCompany>(`
        SELECT * FROM transport_companies
        WHERE UPPER(name) LIKE UPPER($1) OR UPPER(code) LIKE UPPER($1)
        AND status = 'active'
        ORDER BY name ASC
        LIMIT 20
      `, [`%${searchTerm}%`]);

      return companies.rows;
    } catch (error) {
      console.error('Failed to search transport companies:', error);
      return [];
    }
  }

  /**
   * Validate container for gate operation
   */
  async validateContainerForGateOperation(
    containerNumber: string,
    operationType: 'gate_in' | 'gate_out'
  ): Promise<{ isValid: boolean; message?: string }> {
    try {
      const validation = await dbService.query(`
        SELECT
          c.id,
          c.status,
          c.current_yard_id,
          CASE
            WHEN $2 = 'gate_in' AND c.status IN ('out_depot', 'in_service') THEN true
            WHEN $2 = 'gate_out' AND c.status = 'in_depot' THEN true
            ELSE false
          END as is_valid_status,
          CASE
            WHEN $2 = 'gate_in' THEN 'Container can be processed for gate in'
            WHEN $2 = 'gate_out' AND c.status != 'in_depot' THEN 'Container is not in depot'
            WHEN $2 = 'gate_out' AND c.current_yard_id IS NULL THEN 'Container location unknown'
            ELSE 'Container ready for gate out'
          END as validation_message
        FROM containers c
        WHERE c.container_number = $1
      `, [containerNumber, operationType]);

      if (validation.rows.length === 0) {
        if (operationType === 'gate_in') {
          return { isValid: true, message: 'New container - ready for gate in' };
        } else {
          return { isValid: false, message: 'Container not found in system' };
        }
      }

      const result = validation.rows[0];
      return {
        isValid: result.is_valid_status,
        message: result.validation_message,
      };
    } catch (error) {
      console.error('Failed to validate container:', error);
      return { isValid: false, message: 'Validation error occurred' };
    }
  }

  /**
   * Get operation queue
   */
  async getOperationQueue(): Promise<any[]> {
    try {
      const queue = await dbService.select(
        'gate_operation_queue',
        '*',
        { queue_status: 'waiting' },
        'queue_priority DESC, created_at ASC'
      );

      return queue;
    } catch (error) {
      console.error('Failed to get operation queue:', error);
      return [];
    }
  }

  /**
   * Add operation to queue
   */
  async addToQueue(
    operationType: 'in' | 'out',
    operationId: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<boolean> {
    try {
      // Get next queue number
      const maxQueue = await dbService.queryOne(`
        SELECT COALESCE(MAX(queue_number), 0) + 1 as next_number
        FROM gate_operation_queue
        WHERE DATE(created_at) = CURRENT_DATE
      `);

      const queueData: any = {
        operation_type: operationType,
        queue_number: maxQueue?.next_number || 1,
        queue_priority: priority,
        queue_status: 'waiting',
      };

      if (operationType === 'in') {
        queueData.gate_in_operation_id = operationId;
      } else {
        queueData.gate_out_operation_id = operationId;
      }

      await dbService.insert('gate_operation_queue', queueData);

      console.log(`✅ Added operation ${operationId} to queue`);
      return true;
    } catch (error) {
      console.error('Failed to add operation to queue:', error);
      return false;
    }
  }

  /**
   * Get daily gate operation summary
   */
  async getDailyOperationSummary(date?: Date): Promise<{
    date: Date;
    gateInOperations: number;
    gateOutOperations: number;
    containersProcessed: number;
    averageProcessingTime: number;
    pendingOperations: number;
  }> {
    try {
      const targetDate = date || new Date();
      const dateStr = targetDate.toISOString().split('T')[0];

      const summary = await dbService.query(`
        SELECT
          COUNT(gio.id) as gate_in_operations,
          COUNT(goo.id) as gate_out_operations,
          COUNT(gio.id) + COUNT(goo.id) as containers_processed,
          AVG(EXTRACT(EPOCH FROM gio.processing_duration)/60)::DECIMAL(6,2) as avg_processing_minutes,
          COUNT(gio.id) FILTER (WHERE gio.operation_status = 'pending') +
          COUNT(goo.id) FILTER (WHERE goo.operation_status = 'pending') as pending_operations
        FROM gate_in_operations gio
        FULL OUTER JOIN gate_out_operations goo ON DATE(gio.created_at) = DATE(goo.created_at)
        WHERE DATE(COALESCE(gio.created_at, goo.created_at)) = $1
      `, [dateStr]);

      const result = summary.rows[0] || {};

      return {
        date: targetDate,
        gateInOperations: parseInt(result.gate_in_operations) || 0,
        gateOutOperations: parseInt(result.gate_out_operations) || 0,
        containersProcessed: parseInt(result.containers_processed) || 0,
        averageProcessingTime: parseFloat(result.avg_processing_minutes) || 0,
        pendingOperations: parseInt(result.pending_operations) || 0,
      };
    } catch (error) {
      console.error('Failed to get daily operation summary:', error);
      return {
        date: date || new Date(),
        gateInOperations: 0,
        gateOutOperations: 0,
        containersProcessed: 0,
        averageProcessingTime: 0,
        pendingOperations: 0,
      };
    }
  }

  /**
   * Cancel gate operation
   */
  async cancelGateOperation(
    operationId: string,
    operationType: 'gate_in' | 'gate_out',
    reason: string,
    cancelledBy?: string
  ): Promise<boolean> {
    try {
      const table = operationType === 'gate_in' ? 'gate_in_operations' : 'gate_out_operations';

      await dbService.update(table, {
        operation_status: 'cancelled',
        notes: `Cancelled: ${reason}`,
      }, { id: operationId });

      console.log(`✅ Cancelled ${operationType} operation ${operationId}`);
      return true;
    } catch (error) {
      console.error(`Failed to cancel ${operationType} operation:`, error);
      return false;
    }
  }

  /**
   * Get operations by client
   */
  async getOperationsByClient(clientCode: string, limit = 50): Promise<{
    gateInOperations: GateInOperation[];
    gateOutOperations: GateOutOperation[];
  }> {
    try {
      const [gateInOps, gateOutOps] = await Promise.all([
        dbService.select<GateInOperation>(
          'gate_in_operations',
          '*',
          { client_code: clientCode },
          'created_at DESC',
          limit
        ),
        dbService.select<GateOutOperation>(
          'gate_out_operations',
          '*',
          { client_code: clientCode },
          'created_at DESC',
          limit
        )
      ]);

      return {
        gateInOperations: gateInOps,
        gateOutOperations: gateOutOps,
      };
    } catch (error) {
      console.error('Failed to get operations by client:', error);
      return {
        gateInOperations: [],
        gateOutOperations: [],
      };
    }
  }

  /**
   * Get recent operations
   */
  async getRecentOperations(limit = 20): Promise<{
    gateInOperations: GateInOperation[];
    gateOutOperations: GateOutOperation[];
  }> {
    try {
      const [gateInOps, gateOutOps] = await Promise.all([
        dbService.select<GateInOperation>(
          'gate_in_operations',
          '*',
          undefined,
          'created_at DESC',
          limit
        ),
        dbService.select<GateOutOperation>(
          'gate_out_operations',
          '*',
          undefined,
          'created_at DESC',
          limit
        )
      ]);

      return {
        gateInOperations: gateInOps,
        gateOutOperations: gateOutOps,
      };
    } catch (error) {
      console.error('Failed to get recent operations:', error);
      return {
        gateInOperations: [],
        gateOutOperations: [],
      };
    }
  }

  /**
   * Validate transport company
   */
  async validateTransportCompany(companyName: string): Promise<TransportCompany | null> {
    try {
      return await dbService.selectOne<TransportCompany>(
        'transport_companies',
        '*',
        { name: companyName, status: 'active' }
      );
    } catch (error) {
      console.error('Failed to validate transport company:', error);
      return null;
    }
  }

  /**
   * Create transport company if not exists
   */
  async createTransportCompanyIfNotExists(companyName: string): Promise<TransportCompany> {
    try {
      let company = await this.validateTransportCompany(companyName);

      if (!company) {
        company = await dbService.insert<TransportCompany>('transport_companies', {
          name: companyName,
          code: companyName.toUpperCase().replace(/\s+/g, '').substring(0, 10),
          status: 'active',
          is_approved: true,
          total_operations: 0,
          successful_operations: 0,
          average_rating: 0,
        });

        if (company) {
          console.log(`✅ Created new transport company: ${companyName}`);
        }
      }

      return company as TransportCompany;
    } catch (error) {
      console.error('Failed to create transport company:', error);
      throw error;
    }
  }
}

// Singleton instance
export const gateOperationsService = new GateOperationsService();
