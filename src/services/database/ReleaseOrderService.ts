/**
 * Release Order Service - Database-connected release order management
 * Handles booking references, release orders, and container assignments
 */

import { dbService } from './DatabaseService';
import { containerService } from './ContainerService';
import { BookingReference, ReleaseOrder, ReleaseOrderContainer, ContainerQuantityBySize } from '../../types';

export interface DatabaseBookingReference {
  id: string;
  booking_number: string;
  client_code: string;
  client_name: string;
  booking_type: 'IMPORT' | 'EXPORT';
  container_quantities_20ft: number;
  container_quantities_40ft: number;
  total_containers: number;
  max_quantity_threshold: number;
  requires_detailed_breakdown: boolean;
  status: 'not_validated' | 'validating' | 'validated' | 'rejected' | 'expired';
  estimated_release_date?: string;
  containers_assigned: number;
  containers_released: number;
  containers_remaining: number;
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  created_by?: string;
  notes?: string;
}

export interface DatabaseReleaseOrder {
  id: string;
  release_order_number: string;
  booking_reference_id?: string;
  booking_number?: string;
  client_code: string;
  client_name: string;
  booking_type?: 'IMPORT' | 'EXPORT';
  container_quantities_20ft: number;
  container_quantities_40ft: number;
  total_containers: number;
  remaining_containers: number;
  transport_company?: string;
  driver_name?: string;
  vehicle_number?: string;
  status: 'draft' | 'pending' | 'validated' | 'partial' | 'in_process' | 'completed' | 'cancelled' | 'expired';
  estimated_release_date?: string;
  scheduled_pickup_date?: string;
  scheduled_pickup_time?: string;
  release_from_yard_id?: string;
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  special_instructions?: string;
  documentation_complete: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  notes?: string;
}

export interface DatabaseReleaseOrderContainer {
  id: string;
  release_order_id: string;
  container_id?: string;
  container_number: string;
  container_type?: 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
  container_size?: '20ft' | '40ft';
  status: 'pending' | 'ready' | 'released' | 'cancelled';
  current_location?: string;
  current_yard_id?: string;
  selected_at?: string;
  ready_for_release_at?: string;
  released_at?: string;
  notes?: string;
}

export class ReleaseOrderService {

  /**
   * Get all booking references
   */
  async getBookingReferences(filters?: {
    clientCode?: string;
    status?: string;
    bookingType?: 'IMPORT' | 'EXPORT';
  }): Promise<BookingReference[]> {
    try {
      let whereClause: Record<string, any> = {};

      if (filters?.clientCode) whereClause.client_code = filters.clientCode;
      if (filters?.status) whereClause.status = filters.status;
      if (filters?.bookingType) whereClause.booking_type = filters.bookingType;

      const bookings = await dbService.select<DatabaseBookingReference>(
        'booking_references',
        '*',
        whereClause,
        'created_at DESC'
      );

      return bookings.map(booking => this.mapDatabaseBookingToBooking(booking));
    } catch (error) {
      console.error('Failed to get booking references:', error);
      return [];
    }
  }

  /**
   * Get booking reference by number
   */
  async getBookingByNumber(bookingNumber: string): Promise<BookingReference | null> {
    try {
      const booking = await dbService.selectOne<DatabaseBookingReference>(
        'booking_references',
        '*',
        { booking_number: bookingNumber }
      );

      return booking ? this.mapDatabaseBookingToBooking(booking) : null;
    } catch (error) {
      console.error('Failed to get booking by number:', error);
      return null;
    }
  }

  /**
   * Create booking reference
   */
  async createBookingReference(bookingData: {
    bookingNumber: string;
    clientCode: string;
    clientName: string;
    bookingType: 'IMPORT' | 'EXPORT';
    containerQuantities: ContainerQuantityBySize;
    maxQuantityThreshold: number;
    estimatedReleaseDate?: Date;
    notes?: string;
  }): Promise<BookingReference | null> {
    try {
      const newBooking = await dbService.insert<DatabaseBookingReference>('booking_references', {
        booking_number: bookingData.bookingNumber,
        client_code: bookingData.clientCode,
        client_name: bookingData.clientName,
        booking_type: bookingData.bookingType,
        container_quantities_20ft: bookingData.containerQuantities.size20ft,
        container_quantities_40ft: bookingData.containerQuantities.size40ft,
        max_quantity_threshold: bookingData.maxQuantityThreshold,
        estimated_release_date: bookingData.estimatedReleaseDate?.toISOString().split('T')[0],
        status: 'validated',
        priority_level: 'medium',
        containers_assigned: 0,
        containers_released: 0,
        notes: bookingData.notes,
      });

      if (newBooking) {
        console.log(`✅ Created booking reference ${newBooking.booking_number}`);
        return this.mapDatabaseBookingToBooking(newBooking);
      }

      return null;
    } catch (error) {
      console.error('Failed to create booking reference:', error);
      throw error;
    }
  }

  /**
   * Get all release orders
   */
  async getReleaseOrders(filters?: {
    clientCode?: string;
    status?: string;
    yardId?: string;
  }): Promise<ReleaseOrder[]> {
    try {
      let query = 'SELECT * FROM v_release_order_details';
      const params: any[] = [];
      const conditions: string[] = [];

      if (filters?.clientCode) {
        conditions.push(`client_code = $${params.length + 1}`);
        params.push(filters.clientCode);
      }

      if (filters?.status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }

      if (filters?.yardId) {
        conditions.push(`release_from_yard_id = $${params.length + 1}`);
        params.push(filters.yardId);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      const orders = await dbService.query<any>(query, params);
      return orders.rows.map(order => this.mapDatabaseReleaseOrderToReleaseOrder(order));
    } catch (error) {
      console.error('Failed to get release orders:', error);
      return [];
    }
  }

  /**
   * Get release order by ID
   */
  async getReleaseOrderById(releaseOrderId: string): Promise<ReleaseOrder | null> {
    try {
      const order = await dbService.selectOne<DatabaseReleaseOrder>(
        'release_orders',
        '*',
        { id: releaseOrderId }
      );

      return order ? this.mapDatabaseReleaseOrderToReleaseOrder(order) : null;
    } catch (error) {
      console.error('Failed to get release order by ID:', error);
      return null;
    }
  }

  /**
   * Create release order
   */
  async createReleaseOrder(releaseData: {
    bookingNumber?: string;
    clientCode: string;
    clientName: string;
    bookingType?: 'IMPORT' | 'EXPORT';
    containerQuantities: ContainerQuantityBySize;
    transportCompany?: string;
    driverName?: string;
    vehicleNumber?: string;
    estimatedReleaseDate?: Date;
    scheduledPickupDate?: Date;
    yardId?: string;
    notes?: string;
  }): Promise<ReleaseOrder | null> {
    try {
      // Find associated booking reference if exists
      let bookingRefId: string | undefined;
      if (releaseData.bookingNumber) {
        const booking = await this.getBookingByNumber(releaseData.bookingNumber);
        bookingRefId = booking?.id;
      }

      const newOrder = await dbService.insert<DatabaseReleaseOrder>('release_orders', {
        booking_reference_id: bookingRefId,
        booking_number: releaseData.bookingNumber,
        client_code: releaseData.clientCode,
        client_name: releaseData.clientName,
        booking_type: releaseData.bookingType,
        container_quantities_20ft: releaseData.containerQuantities.size20ft,
        container_quantities_40ft: releaseData.containerQuantities.size40ft,
        remaining_containers: releaseData.containerQuantities.size20ft + releaseData.containerQuantities.size40ft,
        transport_company: releaseData.transportCompany,
        driver_name: releaseData.driverName,
        vehicle_number: releaseData.vehicleNumber,
        status: 'draft',
        estimated_release_date: releaseData.estimatedReleaseDate?.toISOString().split('T')[0],
        scheduled_pickup_date: releaseData.scheduledPickupDate?.toISOString().split('T')[0],
        release_from_yard_id: releaseData.yardId,
        priority_level: 'medium',
        documentation_complete: false,
        notes: releaseData.notes,
      });

      if (newOrder) {
        console.log(`✅ Created release order ${newOrder.release_order_number}`);
        return this.mapDatabaseReleaseOrderToReleaseOrder(newOrder);
      }

      return null;
    } catch (error) {
      console.error('Failed to create release order:', error);
      throw error;
    }
  }

  /**
   * Update release order status
   */
  async updateReleaseOrderStatus(
    releaseOrderId: string,
    status: 'draft' | 'pending' | 'validated' | 'partial' | 'in_process' | 'completed' | 'cancelled',
    notes?: string
  ): Promise<boolean> {
    try {
      const updateData: any = { status };

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = notes;
      }

      await dbService.update('release_orders', updateData, { id: releaseOrderId });

      console.log(`✅ Updated release order ${releaseOrderId} status to ${status}`);
      return true;
    } catch (error) {
      console.error('Failed to update release order status:', error);
      return false;
    }
  }

  /**
   * Get containers for release order
   */
  async getReleaseOrderContainers(releaseOrderId: string): Promise<ReleaseOrderContainer[]> {
    try {
      const containers = await dbService.select<DatabaseReleaseOrderContainer>(
        'release_order_containers',
        '*',
        { release_order_id: releaseOrderId },
        'selected_at ASC'
      );

      return containers.map(container => ({
        id: container.id,
        containerId: container.container_id || '',
        containerNumber: container.container_number,
        containerType: container.container_type || 'dry',
        containerSize: container.container_size || '20ft',
        currentLocation: container.current_location || 'Unknown',
        status: container.status,
        addedAt: new Date(container.selected_at || container.id), // Use selected_at or fallback
        releasedAt: container.released_at ? new Date(container.released_at) : undefined,
        notes: container.notes,
      }));
    } catch (error) {
      console.error('Failed to get release order containers:', error);
      return [];
    }
  }

  /**
   * Add container to release order
   */
  async addContainerToReleaseOrder(
    releaseOrderId: string,
    containerNumber: string,
    assignmentMethod: 'manual' | 'auto' = 'manual'
  ): Promise<boolean> {
    try {
      // Get container details using queryOne for custom SQL
      const container = await dbService.queryOne(`
        SELECT id, container_type, container_size, current_location, current_yard_id
        FROM containers
        WHERE container_number = $1 AND status = 'in_depot'
      `, [containerNumber]);

      if (!container) {
        throw new Error('Container not found or not available in depot');
      }

      // Add to release order
      await dbService.insert('release_order_containers', {
        release_order_id: releaseOrderId,
        container_id: container.id,
        container_number: containerNumber,
        container_type: container.container_type,
        container_size: container.container_size,
        status: 'pending',
        current_location: container.current_location,
        current_yard_id: container.current_yard_id,
        selected_at: new Date().toISOString(),
        assignment_method: assignmentMethod,
      });

      console.log(`✅ Added container ${containerNumber} to release order ${releaseOrderId}`);
      return true;
    } catch (error) {
      console.error('Failed to add container to release order:', error);
      throw error;
    }
  }

  /**
   * Remove container from release order
   */
  async removeContainerFromReleaseOrder(releaseOrderId: string, containerNumber: string): Promise<boolean> {
    try {
      await dbService.update('release_order_containers',
        { status: 'cancelled' },
        { release_order_id: releaseOrderId, container_number: containerNumber }
      );

      console.log(`✅ Removed container ${containerNumber} from release order ${releaseOrderId}`);
      return true;
    } catch (error) {
      console.error('Failed to remove container from release order:', error);
      return false;
    }
  }

  /**
   * Auto-select containers for release order
   */
  async autoSelectContainersForReleaseOrder(
    releaseOrderId: string,
    clientCode: string,
    quantities: ContainerQuantityBySize,
    yardId?: string
  ): Promise<{ selected20ft: number; selected40ft: number }> {
    try {
      let selected20ft = 0;
      let selected40ft = 0;

      // Select 20ft containers
      if (quantities.size20ft > 0) {
        const result = await dbService.callProcedure('auto_select_containers_for_release_order', [
          releaseOrderId,
          clientCode,
          '20ft',
          quantities.size20ft,
          yardId
        ]);
        selected20ft = parseInt(result.rows[0]?.selected_count) || 0;
      }

      // Select 40ft containers
      if (quantities.size40ft > 0) {
        const result = await dbService.callProcedure('auto_select_containers_for_release_order', [
          releaseOrderId,
          clientCode,
          '40ft',
          quantities.size40ft,
          yardId
        ]);
        selected40ft = parseInt(result.rows[0]?.selected_count) || 0;
      }

      console.log(`✅ Auto-selected ${selected20ft} x 20ft and ${selected40ft} x 40ft containers for release order ${releaseOrderId}`);

      return { selected20ft, selected40ft };
    } catch (error) {
      console.error('Failed to auto-select containers:', error);
      return { selected20ft: 0, selected40ft: 0 };
    }
  }

  /**
   * Mark container as ready for release
   */
  async markContainerReadyForRelease(
    releaseOrderId: string,
    containerNumber: string,
    readyBy?: string
  ): Promise<boolean> {
    try {
      await dbService.update('release_order_containers', {
        status: 'ready',
        ready_for_release_at: new Date().toISOString(),
      }, {
        release_order_id: releaseOrderId,
        container_number: containerNumber
      });

      console.log(`✅ Container ${containerNumber} marked ready for release`);
      return true;
    } catch (error) {
      console.error('Failed to mark container ready:', error);
      return false;
    }
  }

  /**
   * Release container (mark as released)
   */
  async releaseContainer(
    releaseOrderId: string,
    containerNumber: string,
    releasedBy?: string
  ): Promise<boolean> {
    try {
      await dbService.update('release_order_containers', {
        status: 'released',
        released_at: new Date().toISOString(),
      }, {
        release_order_id: releaseOrderId,
        container_number: containerNumber
      });

      console.log(`✅ Container ${containerNumber} released from order ${releaseOrderId}`);
      return true;
    } catch (error) {
      console.error('Failed to release container:', error);
      return false;
    }
  }

  /**
   * Get pending release operations
   */
  async getPendingReleaseOperations(): Promise<any[]> {
    try {
      return await dbService.queryView('v_pending_release_operations');
    } catch (error) {
      console.error('Failed to get pending release operations:', error);
      return [];
    }
  }

  /**
   * Get container release queue
   */
  async getContainerReleaseQueue(): Promise<any[]> {
    try {
      return await dbService.queryView('v_container_release_queue');
    } catch (error) {
      console.error('Failed to get container release queue:', error);
      return [];
    }
  }

  /**
   * Get release order progress
   */
  async getReleaseOrderProgress(releaseOrderId: string): Promise<{
    totalContainers: number;
    containersReady: number;
    containersReleased: number;
    containersRemaining: number;
    progressPercentage: number;
  }> {
    try {
      const progress = await dbService.queryOne(`
        SELECT
          COUNT(*) as total_containers,
          COUNT(*) FILTER (WHERE status = 'ready') as containers_ready,
          COUNT(*) FILTER (WHERE status = 'released') as containers_released,
          COUNT(*) FILTER (WHERE status NOT IN ('released', 'cancelled')) as containers_remaining
        FROM release_order_containers
        WHERE release_order_id = $1
      `, [releaseOrderId]);

      if (!progress) {
        return {
          totalContainers: 0,
          containersReady: 0,
          containersReleased: 0,
          containersRemaining: 0,
          progressPercentage: 0,
        };
      }

      const total = parseInt(progress.total_containers) || 0;
      const released = parseInt(progress.containers_released) || 0;
      const progressPercentage = total > 0 ? Math.round((released / total) * 100) : 0;

      return {
        totalContainers: total,
        containersReady: parseInt(progress.containers_ready) || 0,
        containersReleased: released,
        containersRemaining: parseInt(progress.containers_remaining) || 0,
        progressPercentage,
      };
    } catch (error) {
      console.error('Failed to get release order progress:', error);
      return {
        totalContainers: 0,
        containersReady: 0,
        containersReleased: 0,
        containersRemaining: 0,
        progressPercentage: 0,
      };
    }
  }

  /**
   * Search available containers for release
   */
  async searchAvailableContainers(
    clientCode: string,
    containerSize?: '20ft' | '40ft',
    yardId?: string
  ): Promise<any[]> {
    try {
      let query = `
        SELECT * FROM v_container_overview
        WHERE client_code = $1
        AND status = 'in_depot'
        AND container_number NOT IN (
          SELECT container_number FROM release_order_containers
          WHERE status NOT IN ('cancelled', 'released')
        )
      `;
      const params: any[] = [clientCode];

      if (containerSize) {
        query += ` AND container_size = $${params.length + 1}`;
        params.push(containerSize);
      }

      if (yardId) {
        query += ` AND current_yard_name = (SELECT name FROM yards WHERE id = $${params.length + 1})`;
        params.push(yardId);
      }

      query += ` ORDER BY gate_in_date ASC`;

      const containers = await dbService.query(query, params);
      return containers.rows;
    } catch (error) {
      console.error('Failed to search available containers:', error);
      return [];
    }
  }

  /**
   * Get release order statistics
   */
  async getReleaseOrderStatistics(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    inProcessOrders: number;
    completedToday: number;
    totalContainersInProcess: number;
    averageProcessingTime: number;
  }> {
    try {
      const stats = await dbService.query(`
        SELECT
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
          COUNT(*) FILTER (WHERE status = 'in_process') as in_process_orders,
          COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE) as completed_today,
          COALESCE(SUM(remaining_containers), 0) as total_containers_in_process,
          AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600)::DECIMAL(6,2) as avg_processing_hours
        FROM release_orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      `);

      const result = stats.rows[0] || {};

      return {
        totalOrders: parseInt(result.total_orders) || 0,
        pendingOrders: parseInt(result.pending_orders) || 0,
        inProcessOrders: parseInt(result.in_process_orders) || 0,
        completedToday: parseInt(result.completed_today) || 0,
        totalContainersInProcess: parseInt(result.total_containers_in_process) || 0,
        averageProcessingTime: parseFloat(result.avg_processing_hours) || 0,
      };
    } catch (error) {
      console.error('Failed to get release order statistics:', error);
      return {
        totalOrders: 0,
        pendingOrders: 0,
        inProcessOrders: 0,
        completedToday: 0,
        totalContainersInProcess: 0,
        averageProcessingTime: 0,
      };
    }
  }

  /**
   * Validate release order can be processed
   */
  async validateReleaseOrder(releaseOrderId: string): Promise<{
    isValid: boolean;
    issues: string[];
    canProceed: boolean;
  }> {
    try {
      const issues: string[] = [];

      // Check if order exists and is in correct status
      const order = await this.getReleaseOrderById(releaseOrderId);
      if (!order) {
        return { isValid: false, issues: ['Release order not found'], canProceed: false };
      }

      if (order.status === 'completed') {
        issues.push('Release order already completed');
      }

      if (order.status === 'cancelled') {
        issues.push('Release order is cancelled');
      }

      // Check container assignments
      const containers = await this.getReleaseOrderContainers(releaseOrderId);
      if (containers.length === 0) {
        issues.push('No containers assigned to release order');
      }

      const readyContainers = containers.filter(c => c.status === 'ready');
      if (readyContainers.length === 0 && containers.length > 0) {
        issues.push('No containers are ready for release');
      }

      // Check transport information
      if (!order.transportCompany || !order.driverName || !order.vehicleNumber) {
        issues.push('Transport information incomplete');
      }

      const isValid = issues.length === 0;
      const canProceed = issues.length === 0 || (issues.length === 1 && issues[0].includes('ready'));

      return { isValid, issues, canProceed };
    } catch (error) {
      console.error('Failed to validate release order:', error);
      return { isValid: false, issues: ['Validation error occurred'], canProceed: false };
    }
  }

  /**
   * Map database booking to application booking interface
   */
  private mapDatabaseBookingToBooking(dbBooking: DatabaseBookingReference): BookingReference {
    return {
      id: dbBooking.id,
      bookingNumber: dbBooking.booking_number,
      clientId: dbBooking.client_code, // Using client_code as ID for compatibility
      clientCode: dbBooking.client_code,
      clientName: dbBooking.client_name,
      bookingType: dbBooking.booking_type,
      containerQuantities: {
        size20ft: dbBooking.container_quantities_20ft,
        size40ft: dbBooking.container_quantities_40ft,
      },
      totalContainers: dbBooking.total_containers,
      maxQuantityThreshold: dbBooking.max_quantity_threshold,
      requiresDetailedBreakdown: dbBooking.requires_detailed_breakdown,
      status: dbBooking.status as 'draft' | 'pending' | 'validated' | 'partial' | 'completed' | 'cancelled',
      createdBy: dbBooking.created_by || 'system',
      createdAt: new Date(dbBooking.created_at),
      estimatedReleaseDate: dbBooking.estimated_release_date ? new Date(dbBooking.estimated_release_date) : undefined,
      notes: dbBooking.notes,
    };
  }

  /**
   * Map database release order to application release order interface
   */
  private mapDatabaseReleaseOrderToReleaseOrder(dbOrder: any): ReleaseOrder {
    return {
      id: dbOrder.id,
      bookingNumber: dbOrder.booking_number,
      clientId: dbOrder.client_code, // Using client_code as ID for compatibility
      clientCode: dbOrder.client_code,
      clientName: dbOrder.client_name,
      bookingType: dbOrder.booking_type,
      containerQuantities: {
        size20ft: dbOrder.container_quantities_20ft || 0,
        size40ft: dbOrder.container_quantities_40ft || 0,
      },
      totalContainers: dbOrder.total_containers,
      remainingContainers: dbOrder.remaining_containers,
      transportCompany: dbOrder.transport_company,
      driverName: dbOrder.driver_name,
      vehicleNumber: dbOrder.vehicle_number,
      status: dbOrder.status,
      createdBy: dbOrder.created_by || 'system',
      createdAt: new Date(dbOrder.created_at),
      completedAt: dbOrder.completed_at ? new Date(dbOrder.completed_at) : undefined,
      estimatedReleaseDate: dbOrder.estimated_release_date ? new Date(dbOrder.estimated_release_date) : undefined,
      notes: dbOrder.notes,
    };
  }

  /**
   * Get release orders by booking number
   */
  async getReleaseOrdersByBooking(bookingNumber: string): Promise<ReleaseOrder[]> {
    try {
      const orders = await dbService.select<DatabaseReleaseOrder>(
        'release_orders',
        '*',
        { booking_number: bookingNumber },
        'created_at DESC'
      );

      return orders.map(order => this.mapDatabaseReleaseOrderToReleaseOrder(order));
    } catch (error) {
      console.error('Failed to get release orders by booking:', error);
      return [];
    }
  }

  /**
   * Get release orders by client
   */
  async getReleaseOrdersByClient(clientCode: string): Promise<ReleaseOrder[]> {
    try {
      const orders = await dbService.select<DatabaseReleaseOrder>(
        'release_orders',
        '*',
        { client_code: clientCode },
        'created_at DESC'
      );

      return orders.map(order => this.mapDatabaseReleaseOrderToReleaseOrder(order));
    } catch (error) {
      console.error('Failed to get release orders by client:', error);
      return [];
    }
  }

  /**
   * Update container status in release order
   */
  async updateContainerStatusInReleaseOrder(
    releaseOrderId: string,
    containerNumber: string,
    status: 'pending' | 'ready' | 'released' | 'cancelled',
    notes?: string
  ): Promise<boolean> {
    try {
      const updateData: any = { status };

      if (status === 'ready') {
        updateData.ready_for_release_at = new Date().toISOString();
      }

      if (status === 'released') {
        updateData.released_at = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = notes;
      }

      await dbService.update('release_order_containers', updateData, {
        release_order_id: releaseOrderId,
        container_number: containerNumber
      });

      console.log(`✅ Updated container ${containerNumber} status to ${status} in release order ${releaseOrderId}`);
      return true;
    } catch (error) {
      console.error('Failed to update container status in release order:', error);
      return false;
    }
  }

  /**
   * Cancel release order
   */
  async cancelReleaseOrder(releaseOrderId: string, reason: string, cancelledBy?: string): Promise<boolean> {
    try {
      // Update release order status
      await this.updateReleaseOrderStatus(releaseOrderId, 'cancelled', `Cancelled: ${reason}`);

      // Cancel all associated containers
      await dbService.update('release_order_containers',
        { status: 'cancelled', notes: `Order cancelled: ${reason}` },
        { release_order_id: releaseOrderId }
      );

      console.log(`✅ Cancelled release order ${releaseOrderId}: ${reason}`);
      return true;
    } catch (error) {
      console.error('Failed to cancel release order:', error);
      return false;
    }
  }

  /**
   * Get containers ready for release by client
   */
  async getContainersReadyForRelease(clientCode: string): Promise<ReleaseOrderContainer[]> {
    try {
      const containers = await dbService.query<DatabaseReleaseOrderContainer>(`
        SELECT roc.* FROM release_order_containers roc
        JOIN release_orders ro ON roc.release_order_id = ro.id
        WHERE ro.client_code = $1
        AND roc.status = 'ready'
        AND ro.status NOT IN ('completed', 'cancelled')
        ORDER BY roc.ready_for_release_at ASC
      `, [clientCode]);

      return containers.rows.map(container => ({
        id: container.id,
        containerId: container.container_id || '',
        containerNumber: container.container_number,
        containerType: container.container_type || 'dry',
        containerSize: container.container_size || '20ft',
        currentLocation: container.current_location || 'Unknown',
        status: container.status,
        addedAt: new Date(container.selected_at || container.id),
        releasedAt: container.released_at ? new Date(container.released_at) : undefined,
        notes: container.notes,
      }));
    } catch (error) {
      console.error('Failed to get containers ready for release:', error);
      return [];
    }
  }
}

// Singleton instance
export const releaseOrderService = new ReleaseOrderService();
