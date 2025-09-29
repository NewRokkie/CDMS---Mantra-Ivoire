/**
 * Yard Service - Database-connected yard management
 * Manages multiple independent yards with PostgreSQL backend
 */

import { Yard, YardContext, YardOperationLog, YardStats, YardStack, YardSection, YardPosition } from '../types/yard';
import { Container } from '../types';
import { dbService } from './database/DatabaseService';

export interface DatabaseYard {
  id: string;
  name: string;
  code: string;
  description: string;
  location: string;
  layout: 'tantarelli' | 'standard';
  is_active: boolean;
  total_capacity: number;
  current_occupancy: number;
  timezone: string;
  contact_manager: string;
  contact_phone: string;
  contact_email: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip_code: string;
  address_country: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface DatabaseYardSection {
  id: string;
  yard_id: string;
  name: string;
  description: string;
  position_x: number;
  position_y: number;
  position_z: number;
  width: number;
  length: number;
  color_hex: string;
  is_active: boolean;
}

export interface DatabaseYardStack {
  id: string;
  yard_id: string;
  section_id: string;
  stack_number: number;
  rows: number;
  max_tiers: number;
  capacity: number;
  current_occupancy: number;
  position_x: number;
  position_y: number;
  position_z: number;
  width: number;
  length: number;
  is_odd_stack: boolean;
  is_active: boolean;
}

export interface DatabaseYardPosition {
  id: string;
  yard_id: string;
  section_id: string;
  stack_id: string;
  row_number: number;
  bay_number: number;
  tier_number: number;
  position_x: number;
  position_y: number;
  position_z: number;
  is_occupied: boolean;
  container_id?: string;
  container_number?: string;
  container_size?: '20ft' | '40ft';
  client_code?: string;
  placed_at?: string;
}

/**
 * Yard Service - Database-connected implementation
 */
export class YardService {
  private currentYardId: string | null = null;

  constructor() {
    // Initialize with default yard if available
    this.initializeCurrentYard();
  }

  /**
   * Initialize current yard from database or default
   */
  private async initializeCurrentYard(): Promise<void> {
    try {
      const yards = await this.getAvailableYards();
      if (yards.length > 0) {
        // Set Tantarelli as default if available
        const tantarelli = yards.find(y => y.code === 'DEPOT-01');
        this.currentYardId = tantarelli ? tantarelli.id : yards[0].id;
        console.log('✅ Current yard initialized:', this.currentYardId);
      }
    } catch (error) {
      console.error('Failed to initialize current yard:', error);
    }
  }

  /**
   * Get all available yards from database
   */
  async getAvailableYards(): Promise<Yard[]> {
    try {
      const dbYards = await dbService.select<DatabaseYard>(
        'yards',
        '*',
        { is_active: true },
        'name ASC'
      );

      const yards = await Promise.all(
        dbYards.map(async (dbYard) => {
          const sections = await this.getYardSections(dbYard.id);
          return this.mapDatabaseYardToYard(dbYard, sections);
        })
      );

      return yards;
    } catch (error) {
      console.error('Failed to get available yards:', error);
      return [];
    }
  }

  /**
   * Get current yard from database
   */
  async getCurrentYard(): Promise<Yard | null> {
    if (!this.currentYardId) {
      await this.initializeCurrentYard();
    }

    if (!this.currentYardId) return null;

    return this.getYardById(this.currentYardId);
  }

  /**
   * Set current yard
   */
  async setCurrentYard(yardId: string, userName?: string): Promise<boolean> {
    try {
      const yard = await this.getYardById(yardId);
      if (yard && yard.isActive) {
        this.currentYardId = yardId;

        // Log yard switch operation
        await this.logOperation('yard_switch', undefined, userName || 'System', {
          previousYard: this.currentYardId,
          newYard: yardId
        });

        console.log(`✅ Current yard set to: ${yard.name} (${yard.code})`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to set current yard:', error);
      return false;
    }
  }

  /**
   * Get yard by ID from database
   */
  async getYardById(yardId: string): Promise<Yard | null> {
    try {
      const dbYard = await dbService.selectOne<DatabaseYard>('yards', '*', { id: yardId });

      if (!dbYard) return null;

      const sections = await this.getYardSections(yardId);
      return this.mapDatabaseYardToYard(dbYard, sections);
    } catch (error) {
      console.error('Failed to get yard by ID:', error);
      return null;
    }
  }

  /**
   * Get yard by code from database
   */
  async getYardByCode(yardCode: string): Promise<Yard | null> {
    try {
      const dbYard = await dbService.selectOne<DatabaseYard>('yards', '*', { code: yardCode });

      if (!dbYard) return null;

      const sections = await this.getYardSections(dbYard.id);
      return this.mapDatabaseYardToYard(dbYard, sections);
    } catch (error) {
      console.error('Failed to get yard by code:', error);
      return null;
    }
  }

  /**
   * Validate yard access for user
   */
  async validateYardAccess(yardId: string, userId: string): Promise<boolean> {
    try {
      const hasAccess = await dbService.exists('user_yard_assignments', {
        user_id: userId,
        yard_id: yardId,
        is_active: true
      });

      return hasAccess;
    } catch (error) {
      console.error('Failed to validate yard access:', error);
      return false;
    }
  }

  /**
   * Get yards accessible by user
   */
  async getAccessibleYards(userId: string): Promise<Yard[]> {
    try {
      const dbYards = await dbService.query<DatabaseYard>(`
        SELECT y.* FROM yards y
        JOIN user_yard_assignments uya ON y.id = uya.yard_id
        WHERE uya.user_id = $1 AND uya.is_active = true AND y.is_active = true
        ORDER BY y.name ASC
      `, [userId]);

      const yards = await Promise.all(
        dbYards.rows.map(async (dbYard) => {
          const sections = await this.getYardSections(dbYard.id);
          return this.mapDatabaseYardToYard(dbYard, sections);
        })
      );

      return yards;
    } catch (error) {
      console.error('Failed to get accessible yards:', error);
      return [];
    }
  }

  /**
   * Log yard operation to database
   */
  async logOperation(
    operationType: YardOperationLog['operationType'],
    containerNumber: string | undefined,
    userName: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      const currentYard = await this.getCurrentYard();
      if (!currentYard) {
        console.warn('Cannot log operation: No current yard selected');
        return;
      }

      await dbService.insert('yard_operation_logs', {
        yard_id: currentYard.id,
        yard_code: currentYard.code,
        operation_type: operationType,
        container_number: containerNumber,
        user_name: userName,
        details: JSON.stringify(details),
        status: 'success',
      });
    } catch (error) {
      console.error('Failed to log yard operation:', error);
    }
  }

  /**
   * Get operation logs for a yard from database
   */
  async getYardOperationLogs(yardId: string, limit: number = 100): Promise<YardOperationLog[]> {
    try {
      const logs = await dbService.select(
        'yard_operation_logs',
        '*',
        { yard_id: yardId },
        'timestamp DESC',
        limit
      );

      return logs.map(log => ({
        id: log.id,
        yardId: log.yard_id,
        yardCode: log.yard_code,
        operationType: log.operation_type,
        containerNumber: log.container_number,
        userId: log.user_id || 'system',
        userName: log.user_name,
        timestamp: new Date(log.timestamp),
        details: JSON.parse(log.details || '{}'),
        status: log.status,
      }));
    } catch (error) {
      console.error('Failed to get yard operation logs:', error);
      return [];
    }
  }

  /**
   * Get yard statistics from database
   */
  async getYardStats(yardId: string): Promise<YardStats | null> {
    try {
      const yard = await this.getYardById(yardId);
      if (!yard) return null;

      // Get real-time statistics from database views
      const stats = await dbService.queryOne(`
        SELECT
          y.id as yard_id,
          y.code as yard_code,
          y.current_occupancy as total_containers,
          COUNT(c.id) FILTER (WHERE c.status = 'in_depot') as containers_in,
          COUNT(c.id) FILTER (WHERE c.status = 'out_depot') as containers_out,
          ROUND((y.current_occupancy::DECIMAL / NULLIF(y.total_capacity, 0)) * 100, 2) as occupancy_rate,
          COUNT(gio.id) FILTER (WHERE gio.operation_status = 'pending') +
          COUNT(goo.id) FILTER (WHERE goo.operation_status = 'pending') as pending_operations
        FROM yards y
        LEFT JOIN containers c ON c.current_yard_id = y.id
        LEFT JOIN gate_in_operations gio ON gio.assigned_yard_id = y.id
        LEFT JOIN gate_out_operations goo ON goo.current_yard_id = y.id
        WHERE y.id = $1
        GROUP BY y.id, y.code, y.current_occupancy, y.total_capacity
      `, [yardId]);

      if (!stats) return null;

      return {
        yardId: stats.yard_id,
        yardCode: stats.yard_code,
        totalContainers: parseInt(stats.total_containers) || 0,
        containersIn: parseInt(stats.containers_in) || 0,
        containersOut: parseInt(stats.containers_out) || 0,
        occupancyRate: parseFloat(stats.occupancy_rate) || 0,
        pendingOperations: parseInt(stats.pending_operations) || 0,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error('Failed to get yard statistics:', error);
      return null;
    }
  }

  /**
   * Create new yard
   */
  async createYard(yardData: Omit<Yard, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, userName?: string): Promise<Yard | null> {
    try {
      const newYard = await dbService.insert<DatabaseYard>('yards', {
        name: yardData.name,
        code: yardData.code,
        description: yardData.description,
        location: yardData.location,
        layout: yardData.layout,
        is_active: yardData.isActive,
        total_capacity: yardData.totalCapacity,
        current_occupancy: yardData.currentOccupancy,
        timezone: yardData.timezone || 'Africa/Abidjan',
        contact_manager: yardData.contactInfo?.manager,
        contact_phone: yardData.contactInfo?.phone,
        contact_email: yardData.contactInfo?.email,
        address_street: yardData.address?.street,
        address_city: yardData.address?.city,
        address_state: yardData.address?.state,
        address_zip_code: yardData.address?.zipCode,
        address_country: yardData.address?.country || 'Côte d\'Ivoire',
      });

      if (!newYard) {
        throw new Error('Failed to create yard');
      }

      console.log(`✅ Created new yard ${newYard.name} by ${userName || 'System'}`);
      return this.getYardById(newYard.id);
    } catch (error) {
      console.error('Failed to create yard:', error);
      throw error;
    }
  }

  /**
   * Update yard
   */
  async updateYard(yardId: string, updates: Partial<Yard>, userName?: string): Promise<Yard | null> {
    try {
      const updateData: Partial<DatabaseYard> = {};

      if (updates.name) updateData.name = updates.name;
      if (updates.code) updateData.code = updates.code;
      if (updates.description) updateData.description = updates.description;
      if (updates.location) updateData.location = updates.location;
      if (updates.layout) updateData.layout = updates.layout;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.totalCapacity) updateData.total_capacity = updates.totalCapacity;
      if (updates.currentOccupancy !== undefined) updateData.current_occupancy = updates.currentOccupancy;
      if (updates.timezone) updateData.timezone = updates.timezone;

      if (updates.contactInfo) {
        updateData.contact_manager = updates.contactInfo.manager;
        updateData.contact_phone = updates.contactInfo.phone;
        updateData.contact_email = updates.contactInfo.email;
      }

      if (updates.address) {
        updateData.address_street = updates.address.street;
        updateData.address_city = updates.address.city;
        updateData.address_state = updates.address.state;
        updateData.address_zip_code = updates.address.zipCode;
        updateData.address_country = updates.address.country;
      }

      await dbService.update('yards', updateData, { id: yardId });

      console.log(`✅ Updated yard ${yardId} by ${userName || 'System'}`);
      return this.getYardById(yardId);
    } catch (error) {
      console.error('Failed to update yard:', error);
      throw error;
    }
  }

  /**
   * Delete yard
   */
  async deleteYard(yardId: string, userName?: string): Promise<boolean> {
    try {
      const yard = await this.getYardById(yardId);
      if (!yard) return false;

      // Prevent deletion of the current yard
      if (this.currentYardId === yardId) {
        throw new Error('Cannot delete the currently selected yard');
      }

      // Check if yard has containers
      const containerCount = await dbService.count('containers', { current_yard_id: yardId });
      if (containerCount > 0) {
        throw new Error('Cannot delete yard with containers. Please move all containers first.');
      }

      await dbService.delete('yards', { id: yardId });

      // Log deletion
      await this.logOperation('yard_delete', undefined, userName || 'System', {
        deletedYardId: yardId,
        deletedYardName: yard.name,
        deletedYardCode: yard.code
      });

      console.log(`✅ Deleted yard ${yardId} (${yard.name}) by ${userName || 'System'}`);
      return true;
    } catch (error) {
      console.error('Failed to delete yard:', error);
      throw error;
    }
  }

  /**
   * Get yard context for UI
   */
  async getYardContext(): Promise<YardContext> {
    try {
      const [currentYard, availableYards] = await Promise.all([
        this.getCurrentYard(),
        this.getAvailableYards()
      ]);

      return {
        currentYard,
        availableYards,
        isLoading: false,
        error: null
      };
    } catch (error) {
      console.error('Failed to get yard context:', error);
      return {
        currentYard: null,
        availableYards: [],
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get yard sections from database
   */
  private async getYardSections(yardId: string): Promise<YardSection[]> {
    try {
      const dbSections = await dbService.select<DatabaseYardSection>(
        'yard_sections',
        '*',
        { yard_id: yardId, is_active: true },
        'name ASC'
      );

      const sections = await Promise.all(
        dbSections.map(async (dbSection) => {
          const stacks = await this.getSectionStacks(dbSection.id);
          return this.mapDatabaseSectionToSection(dbSection, stacks);
        })
      );

      return sections;
    } catch (error) {
      console.error('Failed to get yard sections:', error);
      return [];
    }
  }

  /**
   * Get stacks for a section from database
   */
  private async getSectionStacks(sectionId: string): Promise<YardStack[]> {
    try {
      const dbStacks = await dbService.select<DatabaseYardStack>(
        'yard_stacks',
        '*',
        { section_id: sectionId, is_active: true },
        'stack_number ASC'
      );

      const stacks = await Promise.all(
        dbStacks.map(async (dbStack) => {
          const positions = await this.getStackPositions(dbStack.id);
          return this.mapDatabaseStackToStack(dbStack, positions);
        })
      );

      return stacks;
    } catch (error) {
      console.error('Failed to get section stacks:', error);
      return [];
    }
  }

  /**
   * Get positions for a stack from database
   */
  private async getStackPositions(stackId: string): Promise<YardPosition[]> {
    try {
      const dbPositions = await dbService.select<DatabaseYardPosition>(
        'yard_positions',
        '*',
        { stack_id: stackId },
        'tier_number ASC, row_number ASC'
      );

      return dbPositions.map(dbPos => this.mapDatabasePositionToPosition(dbPos));
    } catch (error) {
      console.error('Failed to get stack positions:', error);
      return [];
    }
  }

  /**
   * Get containers for current yard
   */
  async getYardContainers(yardId: string): Promise<Container[]> {
    try {
      const containers = await dbService.query<any>(`
        SELECT * FROM v_container_overview
        WHERE current_yard_name IS NOT NULL
        AND current_yard_code = (SELECT code FROM yards WHERE id = $1)
        ORDER BY container_number ASC
      `, [yardId]);

      return containers.rows.map(container => ({
        id: container.id,
        number: container.container_number,
        type: container.container_type,
        size: container.container_size,
        status: container.status,
        location: container.location_description || container.current_location,
        gateInDate: container.gate_in_date ? new Date(container.gate_in_date) : undefined,
        gateOutDate: container.gate_out_date ? new Date(container.gate_out_date) : undefined,
        createdAt: container.created_at ? new Date(container.created_at) : undefined,
        updatedAt: container.updated_at ? new Date(container.updated_at) : undefined,
        createdBy: 'system',
        client: container.client_name || container.client_code,
        clientId: container.client_id,
        clientCode: container.client_code,
        damage: container.is_damaged ? ['damage detected'] : undefined,
      }));
    } catch (error) {
      console.error('Failed to get yard containers:', error);
      return [];
    }
  }

  /**
   * Check if container belongs to specific yard
   */
  async isContainerInYard(container: Container, yardId: string): Promise<boolean> {
    try {
      const count = await dbService.count('containers', {
        container_number: container.number,
        current_yard_id: yardId
      });
      return count > 0;
    } catch (error) {
      console.error('Failed to check container in yard:', error);
      return false;
    }
  }

  /**
   * Validate container operation in current yard
   */
  async validateContainerOperation(containerNumber: string, operation: string): Promise<{ isValid: boolean; message?: string }> {
    try {
      const currentYard = await this.getCurrentYard();
      if (!currentYard) {
        return { isValid: false, message: 'No yard selected' };
      }

      if (!currentYard.isActive) {
        return { isValid: false, message: 'Current yard is not active' };
      }

      // Additional validation based on operation type
      if (operation === 'gate_out') {
        const container = await dbService.selectOne('containers', 'status', {
          container_number: containerNumber,
          current_yard_id: currentYard.id
        });

        if (!container) {
          return { isValid: false, message: 'Container not found in current yard' };
        }

        if (container.status !== 'in_depot') {
          return { isValid: false, message: 'Container is not available for gate out' };
        }
      }

      return { isValid: true };
    } catch (error) {
      console.error('Failed to validate container operation:', error);
      return { isValid: false, message: 'Validation error occurred' };
    }
  }

  /**
   * Map database yard to application yard interface
   */
  private mapDatabaseYardToYard(dbYard: DatabaseYard, sections: YardSection[]): Yard {
    return {
      id: dbYard.id,
      name: dbYard.name,
      code: dbYard.code,
      description: dbYard.description,
      location: dbYard.location,
      isActive: dbYard.is_active,
      totalCapacity: dbYard.total_capacity,
      currentOccupancy: dbYard.current_occupancy,
      sections,
      createdAt: new Date(dbYard.created_at),
      updatedAt: new Date(dbYard.updated_at),
      createdBy: dbYard.created_by || 'system',
      updatedBy: dbYard.updated_by,
      layout: dbYard.layout,
      timezone: dbYard.timezone,
      contactInfo: {
        manager: dbYard.contact_manager,
        phone: dbYard.contact_phone,
        email: dbYard.contact_email,
      },
      address: {
        street: dbYard.address_street,
        city: dbYard.address_city,
        state: dbYard.address_state,
        zipCode: dbYard.address_zip_code,
        country: dbYard.address_country,
      },
    };
  }

  /**
   * Map database section to application section interface
   */
  private mapDatabaseSectionToSection(dbSection: DatabaseYardSection, stacks: YardStack[]): YardSection {
    return {
      id: dbSection.id,
      name: dbSection.name,
      yardId: dbSection.yard_id,
      stacks,
      position: {
        x: dbSection.position_x,
        y: dbSection.position_y,
        z: dbSection.position_z,
      },
      dimensions: {
        width: dbSection.width,
        length: dbSection.length,
      },
      color: dbSection.color_hex,
    };
  }

  /**
   * Map database stack to application stack interface
   */
  private mapDatabaseStackToStack(dbStack: DatabaseYardStack, positions: YardPosition[]): YardStack {
    return {
      id: dbStack.id,
      stackNumber: dbStack.stack_number,
      sectionId: dbStack.section_id,
      rows: dbStack.rows,
      maxTiers: dbStack.max_tiers,
      currentOccupancy: dbStack.current_occupancy,
      capacity: dbStack.capacity,
      position: {
        x: dbStack.position_x,
        y: dbStack.position_y,
        z: dbStack.position_z,
      },
      dimensions: {
        width: dbStack.width,
        length: dbStack.length,
      },
      containerPositions: positions,
      isOddStack: dbStack.is_odd_stack,
    };
  }

  /**
   * Map database position to application position interface
   */
  private mapDatabasePositionToPosition(dbPos: DatabaseYardPosition): YardPosition {
    return {
      id: dbPos.id,
      yardId: dbPos.yard_id,
      sectionId: dbPos.section_id,
      stackId: dbPos.stack_id,
      row: dbPos.row_number,
      bay: dbPos.bay_number,
      tier: dbPos.tier_number,
      position: {
        x: dbPos.position_x,
        y: dbPos.position_y,
        z: dbPos.position_z,
      },
      isOccupied: dbPos.is_occupied,
      containerId: dbPos.container_id,
      containerNumber: dbPos.container_number,
      containerSize: dbPos.container_size,
      clientCode: dbPos.client_code,
      placedAt: dbPos.placed_at ? new Date(dbPos.placed_at) : undefined,
    };
  }

  /**
   * Get available positions in yard
   */
  async getAvailablePositions(yardId: string, containerSize?: '20ft' | '40ft'): Promise<YardPosition[]> {
    try {
      let query = `
        SELECT yp.* FROM yard_positions yp
        JOIN yard_stacks ys ON yp.stack_id = ys.id
        WHERE yp.yard_id = $1 AND yp.is_occupied = false AND yp.is_accessible = true
      `;
      const params: any[] = [yardId];

      if (containerSize === '40ft') {
        query += ` AND ys.config_rule IN ('paired_40ft', 'both')`;
      }

      query += ` ORDER BY yp.tier_number ASC, yp.row_number ASC`;

      const positions = await dbService.query<DatabaseYardPosition>(query, params);
      return positions.rows.map(pos => this.mapDatabasePositionToPosition(pos));
    } catch (error) {
      console.error('Failed to get available positions:', error);
      return [];
    }
  }

  /**
   * Reserve position for container
   */
  async reservePosition(positionId: string, containerNumber: string, clientCode: string, userName?: string): Promise<boolean> {
    try {
      await dbService.update('yard_positions', {
        reserved_until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        container_number: containerNumber,
        client_code: clientCode,
      }, { id: positionId });

      console.log(`✅ Position ${positionId} reserved for container ${containerNumber}`);
      return true;
    } catch (error) {
      console.error('Failed to reserve position:', error);
      return false;
    }
  }
}

// Singleton instance
export const yardService = new YardService();
