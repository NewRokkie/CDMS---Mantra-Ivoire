/**
 * Container Service - Database-connected container management
 * Handles container CRUD operations, movement tracking, and status management
 */

import { dbService } from './DatabaseService';
import { Container, AuditLog } from '../../types';

export interface DatabaseContainer {
  id: string;
  container_number: string;
  check_digit?: string;
  container_type: 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
  container_size: '20ft' | '40ft';
  status: 'in_depot' | 'out_depot' | 'in_service' | 'maintenance' | 'cleaning';
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  full_empty_status: 'FULL' | 'EMPTY';
  current_yard_id?: string;
  current_position_id?: string;
  location_description?: string;
  client_id?: string;
  client_code?: string;
  client_name?: string;
  gate_in_date?: string;
  gate_out_date?: string;
  estimated_departure?: string;
  tare_weight?: number;
  gross_weight?: number;
  max_gross_weight?: number;
  seal_numbers?: string[];
  is_damaged: boolean;
  damage_description?: string;
  booking_reference?: string;
  daily_storage_rate: number;
  currency: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ContainerMovement {
  id: string;
  container_id: string;
  container_number: string;
  movement_type: 'gate_in' | 'gate_out' | 'yard_move' | 'stack_move' | 'maintenance' | 'cleaning' | 'inspection';
  movement_date: string;
  from_yard_id?: string;
  to_yard_id?: string;
  from_location?: string;
  to_location?: string;
  performed_by?: string;
  performed_by_name?: string;
  notes?: string;
}

export interface ContainerDamage {
  id: string;
  container_id: string;
  container_number: string;
  damage_type: string;
  damage_location: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  description: string;
  detected_at: string;
  detected_by?: string;
  repair_required: boolean;
  repair_estimate?: number;
  is_active: boolean;
}

export class ContainerService {

  /**
   * Get all containers with optional filtering
   */
  async getAllContainers(filters?: {
    yardId?: string;
    clientCode?: string;
    status?: Container['status'];
    size?: Container['size'];
    type?: Container['type'];
  }): Promise<Container[]> {
    try {
      let query = 'SELECT * FROM v_container_overview';
      const params: any[] = [];
      const conditions: string[] = [];

      if (filters?.yardId) {
        conditions.push(`current_yard_name = (SELECT name FROM yards WHERE id = $${params.length + 1})`);
        params.push(filters.yardId);
      }

      if (filters?.clientCode) {
        conditions.push(`client_code = $${params.length + 1}`);
        params.push(filters.clientCode);
      }

      if (filters?.status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
      }

      if (filters?.size) {
        conditions.push(`container_size = $${params.length + 1}`);
        params.push(filters.size);
      }

      if (filters?.type) {
        conditions.push(`container_type = $${params.length + 1}`);
        params.push(filters.type);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY container_number ASC';

      const result = await dbService.query(query, params);
      return result.rows.map(row => this.mapDatabaseContainerToContainer(row));
    } catch (error) {
      console.error('Failed to get containers:', error);
      return [];
    }
  }

  /**
   * Get container by number
   */
  async getContainerByNumber(containerNumber: string): Promise<Container | null> {
    try {
      const container = await dbService.selectOne<DatabaseContainer>(
        'containers',
        '*',
        { container_number: containerNumber }
      );

      return container ? this.mapDatabaseContainerToContainer(container) : null;
    } catch (error) {
      console.error('Failed to get container by number:', error);
      return null;
    }
  }

  /**
   * Get container by ID
   */
  async getContainerById(containerId: string): Promise<Container | null> {
    try {
      const container = await dbService.selectOne<DatabaseContainer>(
        'containers',
        '*',
        { id: containerId }
      );

      return container ? this.mapDatabaseContainerToContainer(container) : null;
    } catch (error) {
      console.error('Failed to get container by ID:', error);
      return null;
    }
  }

  /**
   * Create new container
   */
  async createContainer(containerData: Omit<Container, 'id' | 'createdAt' | 'updatedAt'>): Promise<Container | null> {
    try {
      const newContainer = await dbService.insert<DatabaseContainer>('containers', {
        container_number: containerData.number,
        container_type: containerData.type,
        container_size: containerData.size,
        status: containerData.status,
        location_description: containerData.location,
        client_code: containerData.clientCode,
        client_name: containerData.client,
        gate_in_date: containerData.gateInDate?.toISOString(),
        gate_out_date: containerData.gateOutDate?.toISOString(),
        is_damaged: containerData.damage && containerData.damage.length > 0,
        damage_description: containerData.damage?.join(', '),
        daily_storage_rate: 15.00, // Default rate
        currency: 'USD',
        notes: 'Created via application',
      });

      if (!newContainer) {
        throw new Error('Failed to create container');
      }

      console.log(`✅ Created container ${newContainer.container_number}`);
      return this.mapDatabaseContainerToContainer(newContainer);
    } catch (error) {
      console.error('Failed to create container:', error);
      throw error;
    }
  }

  /**
   * Update container
   */
  async updateContainer(containerId: string, updates: Partial<Container>): Promise<Container | null> {
    try {
      const updateData: Partial<DatabaseContainer> = {};

      if (updates.number) updateData.container_number = updates.number;
      if (updates.type) updateData.container_type = updates.type;
      if (updates.size) updateData.container_size = updates.size;
      if (updates.status) updateData.status = updates.status;
      if (updates.location) updateData.location_description = updates.location;
      if (updates.clientCode) updateData.client_code = updates.clientCode;
      if (updates.client) updateData.client_name = updates.client;
      if (updates.gateInDate) updateData.gate_in_date = updates.gateInDate.toISOString();
      if (updates.gateOutDate) updateData.gate_out_date = updates.gateOutDate.toISOString();
      if (updates.damage !== undefined) {
        updateData.is_damaged = updates.damage && updates.damage.length > 0;
        updateData.damage_description = updates.damage?.join(', ');
      }

      await dbService.update('containers', updateData, { id: containerId });

      console.log(`✅ Updated container ${containerId}`);
      return this.getContainerById(containerId);
    } catch (error) {
      console.error('Failed to update container:', error);
      throw error;
    }
  }

  /**
   * Delete container
   */
  async deleteContainer(containerId: string): Promise<boolean> {
    try {
      // Check if container can be deleted (not in active operations)
      const activeOperations = await dbService.count('gate_in_operations', {
        container_id: containerId,
        operation_status: 'in_progress'
      });

      if (activeOperations > 0) {
        throw new Error('Cannot delete container with active gate operations');
      }

      await dbService.delete('containers', { id: containerId });

      console.log(`✅ Deleted container ${containerId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete container:', error);
      return false;
    }
  }

  /**
   * Get container movement history
   */
  async getContainerMovements(containerNumber: string): Promise<ContainerMovement[]> {
    try {
      const movements = await dbService.select<ContainerMovement>(
        'container_movements',
        '*',
        { container_number: containerNumber },
        'movement_date DESC'
      );

      return movements;
    } catch (error) {
      console.error('Failed to get container movements:', error);
      return [];
    }
  }

  /**
   * Get container damage records
   */
  async getContainerDamages(containerNumber: string): Promise<ContainerDamage[]> {
    try {
      const damages = await dbService.select<ContainerDamage>(
        'container_damages',
        '*',
        { container_number: containerNumber, is_active: true },
        'detected_at DESC'
      );

      return damages;
    } catch (error) {
      console.error('Failed to get container damages:', error);
      return [];
    }
  }

  /**
   * Report container damage
   */
  async reportContainerDamage(
    containerNumber: string,
    damageData: {
      damageType: string;
      damageLocation: string;
      severity: 'minor' | 'moderate' | 'major' | 'critical';
      description: string;
      repairRequired?: boolean;
      repairEstimate?: number;
      detectedDuring?: string;
    },
    detectedBy?: string
  ): Promise<ContainerDamage | null> {
    try {
      const container = await this.getContainerByNumber(containerNumber);
      if (!container) {
        throw new Error('Container not found');
      }

      const newDamage = await dbService.insert<ContainerDamage>('container_damages', {
        container_id: container.id,
        container_number: containerNumber,
        damage_type: damageData.damageType,
        damage_location: damageData.damageLocation,
        severity: damageData.severity,
        description: damageData.description,
        detected_during: damageData.detectedDuring || 'manual_report',
        detected_by: detectedBy,
        repair_required: damageData.repairRequired || false,
        repair_estimate: damageData.repairEstimate,
        is_active: true,
      });

      if (newDamage) {
        console.log(`✅ Reported damage for container ${containerNumber}`);
      }

      return newDamage;
    } catch (error) {
      console.error('Failed to report container damage:', error);
      throw error;
    }
  }

  /**
   * Move container to new position
   */
  async moveContainer(
    containerNumber: string,
    newYardId: string,
    newPositionId: string,
    reason: string,
    performedBy?: string
  ): Promise<boolean> {
    try {
      const container = await this.getContainerByNumber(containerNumber);
      if (!container) {
        throw new Error('Container not found');
      }

      // Update container location
      await dbService.update('containers', {
        current_yard_id: newYardId,
        current_position_id: newPositionId,
        location_description: `Moved to new position - ${reason}`,
      }, { container_number: containerNumber });

      console.log(`✅ Moved container ${containerNumber} to new position`);
      return true;
    } catch (error) {
      console.error('Failed to move container:', error);
      return false;
    }
  }

  /**
   * Get containers in specific yard
   */
  async getContainersByYard(yardId: string): Promise<Container[]> {
    try {
      const containers = await dbService.query(`
        SELECT * FROM v_container_overview
        WHERE current_yard_name = (SELECT name FROM yards WHERE id = $1)
        ORDER BY container_number ASC
      `, [yardId]);

      return containers.rows.map(row => this.mapDatabaseContainerToContainer(row));
    } catch (error) {
      console.error('Failed to get containers by yard:', error);
      return [];
    }
  }

  /**
   * Get containers by client
   */
  async getContainersByClient(clientCode: string): Promise<Container[]> {
    try {
      const containers = await dbService.select<DatabaseContainer>(
        'containers',
        '*',
        { client_code: clientCode },
        'gate_in_date DESC'
      );

      return containers.map(container => this.mapDatabaseContainerToContainer(container));
    } catch (error) {
      console.error('Failed to get containers by client:', error);
      return [];
    }
  }

  /**
   * Get containers by status
   */
  async getContainersByStatus(status: Container['status']): Promise<Container[]> {
    try {
      const containers = await dbService.select<DatabaseContainer>(
        'containers',
        '*',
        { status },
        'updated_at DESC'
      );

      return containers.map(container => this.mapDatabaseContainerToContainer(container));
    } catch (error) {
      console.error('Failed to get containers by status:', error);
      return [];
    }
  }

  /**
   * Search containers by number or client
   */
  async searchContainers(searchTerm: string): Promise<Container[]> {
    try {
      const containers = await dbService.query<DatabaseContainer>(`
        SELECT * FROM containers
        WHERE UPPER(container_number) LIKE UPPER($1)
        OR UPPER(client_code) LIKE UPPER($1)
        OR UPPER(client_name) LIKE UPPER($1)
        ORDER BY container_number ASC
        LIMIT 50
      `, [`%${searchTerm}%`]);

      return containers.rows.map(container => this.mapDatabaseContainerToContainer(container));
    } catch (error) {
      console.error('Failed to search containers:', error);
      return [];
    }
  }

  /**
   * Get container audit logs
   */
  async getContainerAuditLogs(containerId: string): Promise<AuditLog[]> {
    try {
      const logs = await dbService.query(`
        SELECT
          al.performed_at as timestamp,
          u.name as user,
          al.operation as action,
          al.new_values::text as details
        FROM cdms_audit.audit_log al
        LEFT JOIN users u ON al.performed_by::uuid = u.id
        WHERE al.table_name = 'containers' AND al.record_id = $1
        ORDER BY al.performed_at DESC
        LIMIT 100
      `, [containerId]);

      return logs.rows.map(log => ({
        timestamp: new Date(log.timestamp),
        user: log.user || 'System',
        action: log.action,
        details: log.details,
      }));
    } catch (error) {
      console.error('Failed to get container audit logs:', error);
      return [];
    }
  }

  /**
   * Update container status
   */
  async updateContainerStatus(
    containerNumber: string,
    newStatus: Container['status'],
    reason?: string,
    performedBy?: string
  ): Promise<boolean> {
    try {
      await dbService.update('containers', {
        status: newStatus,
        notes: reason ? `Status changed: ${reason}` : undefined,
      }, { container_number: containerNumber });

      console.log(`✅ Updated container ${containerNumber} status to ${newStatus}`);
      return true;
    } catch (error) {
      console.error('Failed to update container status:', error);
      return false;
    }
  }

  /**
   * Get containers requiring maintenance
   */
  async getContainersRequiringMaintenance(): Promise<Container[]> {
    try {
      const containers = await dbService.query<DatabaseContainer>(`
        SELECT c.* FROM containers c
        LEFT JOIN container_damages cd ON c.id = cd.container_id AND cd.is_active = true
        WHERE c.status = 'maintenance'
        OR cd.repair_required = true
        OR c.next_inspection_due <= CURRENT_DATE
        ORDER BY cd.severity DESC, c.next_inspection_due ASC
      `);

      return containers.rows.map(container => this.mapDatabaseContainerToContainer(container));
    } catch (error) {
      console.error('Failed to get containers requiring maintenance:', error);
      return [];
    }
  }

  /**
   * Get damaged containers
   */
  async getDamagedContainers(): Promise<Container[]> {
    try {
      const containers = await dbService.select<DatabaseContainer>(
        'containers',
        '*',
        { is_damaged: true },
        'updated_at DESC'
      );

      return containers.map(container => this.mapDatabaseContainerToContainer(container));
    } catch (error) {
      console.error('Failed to get damaged containers:', error);
      return [];
    }
  }

  /**
   * Get containers ready for gate out
   */
  async getContainersReadyForGateOut(clientCode?: string): Promise<Container[]> {
    try {
      let query = `
        SELECT * FROM v_container_overview
        WHERE status = 'in_depot'
        AND container_number IN (
          SELECT container_number FROM release_order_containers
          WHERE status = 'ready'
        )
      `;
      const params: any[] = [];

      if (clientCode) {
        query += ` AND client_code = $1`;
        params.push(clientCode);
      }

      query += ` ORDER BY gate_in_date ASC`;

      const containers = await dbService.query(query, params);
      return containers.rows.map(row => this.mapDatabaseContainerToContainer(row));
    } catch (error) {
      console.error('Failed to get containers ready for gate out:', error);
      return [];
    }
  }

  /**
   * Process gate in for container
   */
  async processGateIn(
    containerNumber: string,
    containerData: {
      type: Container['type'];
      size: Container['size'];
      clientCode: string;
      clientName: string;
      yardId: string;
      positionId?: string;
      location: string;
      isDamaged?: boolean;
      damageDescription?: string;
      bookingReference?: string;
      seals?: string[];
      weight?: number;
    },
    performedBy?: string
  ): Promise<Container | null> {
    try {
      // Check if container already exists
      let container = await this.getContainerByNumber(containerNumber);

      if (container) {
        // Update existing container
        await dbService.update('containers', {
          status: 'in_depot',
          current_yard_id: containerData.yardId,
          current_position_id: containerData.positionId,
          location_description: containerData.location,
          gate_in_date: new Date().toISOString(),
          client_code: containerData.clientCode,
          client_name: containerData.clientName,
          is_damaged: containerData.isDamaged || false,
          damage_description: containerData.damageDescription,
          booking_reference: containerData.bookingReference,
          seal_numbers: containerData.seals,
          gross_weight: containerData.weight,
        }, { container_number: containerNumber });
      } else {
        // Create new container
        const newContainer = await dbService.insert<DatabaseContainer>('containers', {
          container_number: containerNumber,
          container_type: containerData.type,
          container_size: containerData.size,
          status: 'in_depot',
          current_yard_id: containerData.yardId,
          current_position_id: containerData.positionId,
          location_description: containerData.location,
          gate_in_date: new Date().toISOString(),
          client_code: containerData.clientCode,
          client_name: containerData.clientName,
          is_damaged: containerData.isDamaged || false,
          damage_description: containerData.damageDescription,
          booking_reference: containerData.bookingReference,
          seal_numbers: containerData.seals,
          gross_weight: containerData.weight,
          daily_storage_rate: 15.00,
          currency: 'USD',
        });

        if (newContainer) {
          container = this.mapDatabaseContainerToContainer(newContainer);
        }
      }

      console.log(`✅ Processed gate in for container ${containerNumber}`);
      return container;
    } catch (error) {
      console.error('Failed to process gate in:', error);
      throw error;
    }
  }

  /**
   * Process gate out for container
   */
  async processGateOut(
    containerNumber: string,
    gateOutData: {
      transportCompany?: string;
      driverName?: string;
      vehicleNumber?: string;
      finalWeight?: number;
      seals?: string[];
    },
    performedBy?: string
  ): Promise<boolean> {
    try {
      await dbService.update('containers', {
        status: 'out_depot',
        gate_out_date: new Date().toISOString(),
        current_yard_id: null,
        current_position_id: null,
        location_description: 'Out of depot',
      }, { container_number: containerNumber });

      console.log(`✅ Processed gate out for container ${containerNumber}`);
      return true;
    } catch (error) {
      console.error('Failed to process gate out:', error);
      return false;
    }
  }

  /**
   * Get container statistics
   */
  async getContainerStatistics(yardId?: string): Promise<{
    totalContainers: number;
    containersInDepot: number;
    containersOutDepot: number;
    containersBySize: { '20ft': number; '40ft': number };
    containersByType: Record<string, number>;
    damagedContainers: number;
  }> {
    try {
      let whereClause = '';
      const params: any[] = [];

      if (yardId) {
        whereClause = 'WHERE current_yard_id = $1';
        params.push(yardId);
      }

      const stats = await dbService.query(`
        SELECT
          COUNT(*) as total_containers,
          COUNT(*) FILTER (WHERE status = 'in_depot') as containers_in_depot,
          COUNT(*) FILTER (WHERE status = 'out_depot') as containers_out_depot,
          COUNT(*) FILTER (WHERE container_size = '20ft') as containers_20ft,
          COUNT(*) FILTER (WHERE container_size = '40ft') as containers_40ft,
          COUNT(*) FILTER (WHERE container_type = 'dry') as dry_containers,
          COUNT(*) FILTER (WHERE container_type = 'reefer') as reefer_containers,
          COUNT(*) FILTER (WHERE container_type = 'tank') as tank_containers,
          COUNT(*) FILTER (WHERE container_type = 'flat_rack') as flat_rack_containers,
          COUNT(*) FILTER (WHERE container_type = 'open_top') as open_top_containers,
          COUNT(*) FILTER (WHERE is_damaged = true) as damaged_containers
        FROM containers
        ${whereClause}
      `, params);

      const result = stats.rows[0];

      return {
        totalContainers: parseInt(result.total_containers) || 0,
        containersInDepot: parseInt(result.containers_in_depot) || 0,
        containersOutDepot: parseInt(result.containers_out_depot) || 0,
        containersBySize: {
          '20ft': parseInt(result.containers_20ft) || 0,
          '40ft': parseInt(result.containers_40ft) || 0,
        },
        containersByType: {
          dry: parseInt(result.dry_containers) || 0,
          reefer: parseInt(result.reefer_containers) || 0,
          tank: parseInt(result.tank_containers) || 0,
          flat_rack: parseInt(result.flat_rack_containers) || 0,
          open_top: parseInt(result.open_top_containers) || 0,
        },
        damagedContainers: parseInt(result.damaged_containers) || 0,
      };
    } catch (error) {
      console.error('Failed to get container statistics:', error);
      return {
        totalContainers: 0,
        containersInDepot: 0,
        containersOutDepot: 0,
        containersBySize: { '20ft': 0, '40ft': 0 },
        containersByType: { dry: 0, reefer: 0, tank: 0, flat_rack: 0, open_top: 0 },
        damagedContainers: 0,
      };
    }
  }

  /**
   * Validate container number format
   */
  validateContainerNumber(containerNumber: string): { isValid: boolean; message?: string } {
    // Basic container number validation (11 characters: ABCD1234567)
    if (!containerNumber || containerNumber.length !== 11) {
      return {
        isValid: false,
        message: 'Container number must be 11 characters long'
      };
    }

    const pattern = /^[A-Z]{4}[0-9]{7}$/;
    if (!pattern.test(containerNumber)) {
      return {
        isValid: false,
        message: 'Container number format invalid (should be ABCD1234567)'
      };
    }

    return { isValid: true };
  }

  /**
   * Map database container to application container interface
   */
  private mapDatabaseContainerToContainer(dbContainer: any): Container {
    return {
      id: dbContainer.id,
      number: dbContainer.container_number,
      type: dbContainer.container_type,
      size: dbContainer.container_size,
      status: dbContainer.status,
      location: dbContainer.location_description || dbContainer.current_location || 'Unknown',
      gateInDate: dbContainer.gate_in_date ? new Date(dbContainer.gate_in_date) : undefined,
      gateOutDate: dbContainer.gate_out_date ? new Date(dbContainer.gate_out_date) : undefined,
      createdAt: dbContainer.created_at ? new Date(dbContainer.created_at) : undefined,
      updatedAt: dbContainer.updated_at ? new Date(dbContainer.updated_at) : undefined,
      createdBy: dbContainer.created_by || 'system',
      updatedBy: dbContainer.updated_by,
      client: dbContainer.client_name || dbContainer.client_code || 'Unknown',
      clientId: dbContainer.client_id,
      clientCode: dbContainer.client_code,
      releaseOrderId: dbContainer.release_order_id,
      damage: dbContainer.is_damaged && dbContainer.damage_description ?
        [dbContainer.damage_description] : undefined,
    };
  }
}

// Singleton instance
export const containerService = new ContainerService();
