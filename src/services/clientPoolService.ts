/**
 * Client Pool Service - Database-connected client pool management
 * Manages client pool assignments and container placement with PostgreSQL backend
 */

import { ClientPool, StackAssignment, ClientPoolStats, ContainerAssignmentRequest, StackAvailabilityResult } from '../types/clientPool';
import { Yard, YardStack, Container } from '../types';
import { dbService } from './database/DatabaseService';
import { yardService } from './yardService';

export interface DatabaseClientPool {
  id: string;
  client_id: string;
  client_code: string;
  client_name: string;
  max_capacity: number;
  current_occupancy: number;
  is_active: boolean;
  priority: 'low' | 'medium' | 'high';
  contract_start_date: string;
  contract_end_date?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  notes?: string;
}

export interface DatabaseStackAssignment {
  id: string;
  stack_id: string;
  stack_number: number;
  client_pool_id: string;
  client_code: string;
  assignment_type: 'exclusive' | 'shared' | 'temporary' | 'emergency';
  priority: number;
  is_exclusive: boolean;
  assigned_at: string;
  assigned_by: string;
  is_active: boolean;
  notes?: string;
}

interface OptimalStackResult {
  stack_id: string;
  stack_number: number;
  section_name: string;
  available_slots: number;
  total_capacity: number;
  utilization_rate: number;
  priority_score: number;
}

/**
 * Client Pool Service - Database-connected implementation
 */
export class ClientPoolService {

  /**
   * Get all client pools from database
   */
  async getClientPools(): Promise<ClientPool[]> {
    try {
      const dbPools = await dbService.select<DatabaseClientPool>(
        'client_pools',
        '*',
        undefined,
        'client_name ASC'
      );

      return dbPools.map(pool => this.mapDatabasePoolToClientPool(pool));
    } catch (error) {
      console.error('Failed to get client pools:', error);
      return [];
    }
  }

  /**
   * Get client pool by client code
   */
  async getClientPool(clientCode: string): Promise<ClientPool | null> {
    try {
      const dbPool = await dbService.selectOne<DatabaseClientPool>(
        'client_pools',
        '*',
        { client_code: clientCode }
      );

      return dbPool ? this.mapDatabasePoolToClientPool(dbPool) : null;
    } catch (error) {
      console.error('Failed to get client pool:', error);
      return null;
    }
  }

  /**
   * Get stacks assigned to a specific client
   */
  async getClientStacks(clientCode: string): Promise<string[]> {
    try {
      const assignments = await dbService.select<{ stack_id: string }>(
        'stack_assignments',
        'stack_id',
        { client_code: clientCode, is_active: true }
      );

      return assignments.map(a => a.stack_id);
    } catch (error) {
      console.error('Failed to get client stacks:', error);
      return [];
    }
  }

  /**
   * Check if a stack is assigned to a specific client
   */
  async isStackAssignedToClient(stackId: string, clientCode: string): Promise<boolean> {
    try {
      return await dbService.exists('stack_assignments', {
        stack_id: stackId,
        client_code: clientCode,
        is_active: true
      });
    } catch (error) {
      console.error('Failed to check stack assignment:', error);
      return false;
    }
  }

  /**
   * Get available stacks for a client based on container requirements
   */
  async getAvailableStacksForClient(
    clientCode: string,
    containerSize: '20ft' | '40ft',
    yardId?: string
  ): Promise<StackAvailabilityResult[]> {
    try {
      // Use stored procedure for optimal stack selection
      const result = await dbService.callProcedure<OptimalStackResult>(
        'find_optimal_stack_for_container',
        [clientCode, containerSize, yardId]
      );

      return result.rows.map(stack => ({
        stackId: stack.stack_id,
        stackNumber: stack.stack_number,
        sectionName: stack.section_name,
        availableSlots: stack.available_slots,
        totalCapacity: stack.total_capacity,
        isRecommended: stack.utilization_rate < 80, // Consider < 80% as recommended
        distance: 0, // Could be calculated based on position
      }));
    } catch (error) {
      console.error('Failed to get available stacks for client:', error);
      return [];
    }
  }

  /**
   * Get available stacks for a client in a specific yard
   */
  async getAvailableStacksForClientInYard(
    clientCode: string,
    containerSize: '20ft' | '40ft',
    yardId: string
  ): Promise<StackAvailabilityResult[]> {
    return this.getAvailableStacksForClient(clientCode, containerSize, yardId);
  }

  /**
   * Get client pools for a specific yard
   */
  async getClientPoolsForYard(yardId: string): Promise<ClientPool[]> {
    try {
      const dbPools = await dbService.query<DatabaseClientPool>(`
        SELECT DISTINCT cp.* FROM client_pools cp
        JOIN stack_assignments sa ON cp.id = sa.client_pool_id
        JOIN yard_stacks ys ON sa.stack_id = ys.id
        WHERE ys.yard_id = $1 AND sa.is_active = true AND cp.is_active = true
        ORDER BY cp.client_name ASC
      `, [yardId]);

      return dbPools.rows.map(pool => this.mapDatabasePoolToClientPool(pool));
    } catch (error) {
      console.error('Failed to get client pools for yard:', error);
      return [];
    }
  }

  /**
   * Assign a container to the best available stack for a client
   */
  async assignContainerToClientStack(
    request: ContainerAssignmentRequest,
    userName?: string
  ): Promise<StackAvailabilityResult | null> {
    try {
      // Validate client has access
      const clientPool = await this.getClientPool(request.clientCode);
      if (!clientPool || !clientPool.isActive) {
        throw new Error(`No active client pool found for ${request.clientCode}`);
      }

      // Use stored procedure for automatic assignment
      const result = await dbService.callProcedure(
        'auto_assign_container_to_stack',
        [
          request.containerId,
          request.containerNumber,
          request.clientCode,
          request.containerSize,
          userName || 'System'
        ]
      );

      if (result.rows.length > 0) {
        console.log(`✅ Container ${request.containerNumber} assigned to optimal stack for client ${request.clientCode}`);

        // Get the assignment details
        const availableStacks = await this.getAvailableStacksForClient(
          request.clientCode,
          request.containerSize
        );

        return availableStacks[0] || null;
      }

      return null;
    } catch (error) {
      console.error('Error assigning container to client stack:', error);
      throw error;
    }
  }

  /**
   * Assign a stack to a client pool
   */
  async assignStackToClient(
    stackId: string,
    stackNumber: number,
    clientCode: string,
    assignedBy: string,
    isExclusive: boolean = true,
    priority: number = 2,
    userName?: string
  ): Promise<StackAssignment> {
    try {
      const clientPool = await this.getClientPool(clientCode);
      if (!clientPool) {
        throw new Error(`Client pool not found for ${clientCode}`);
      }

      const newAssignment = await dbService.insert<DatabaseStackAssignment>('stack_assignments', {
        stack_id: stackId,
        stack_number: stackNumber,
        client_pool_id: clientPool.id,
        client_code: clientCode,
        assignment_type: isExclusive ? 'exclusive' : 'shared',
        priority: priority,
        is_exclusive: isExclusive,
        assigned_by: assignedBy,
        notes: `Assigned to ${clientPool.clientName}`,
      });

      if (!newAssignment) {
        throw new Error('Failed to create stack assignment');
      }

      console.log(`✅ Stack ${stackNumber} assigned to client ${clientCode} by ${assignedBy}`);

      return {
        id: newAssignment.id,
        stackId: newAssignment.stack_id,
        stackNumber: newAssignment.stack_number,
        clientPoolId: newAssignment.client_pool_id,
        clientCode: newAssignment.client_code,
        assignedAt: new Date(newAssignment.assigned_at),
        assignedBy: newAssignment.assigned_by,
        isExclusive: newAssignment.is_exclusive,
        priority: newAssignment.priority,
        notes: newAssignment.notes,
      };
    } catch (error) {
      console.error('Failed to assign stack to client:', error);
      throw error;
    }
  }

  /**
   * Remove stack assignment from client
   */
  async removeStackFromClient(stackId: string, clientCode: string, userName?: string): Promise<boolean> {
    try {
      await dbService.update('stack_assignments',
        { is_active: false },
        { stack_id: stackId, client_code: clientCode }
      );

      console.log(`✅ Stack ${stackId} removed from client ${clientCode} by ${userName || 'System'}`);
      return true;
    } catch (error) {
      console.error('Error removing stack from client:', error);
      return false;
    }
  }

  /**
   * Get stack assignments for a specific stack
   */
  async getStackAssignments(stackId: string): Promise<StackAssignment[]> {
    try {
      const dbAssignments = await dbService.select<DatabaseStackAssignment>(
        'stack_assignments',
        '*',
        { stack_id: stackId, is_active: true }
      );

      return dbAssignments.map(assignment => ({
        id: assignment.id,
        stackId: assignment.stack_id,
        stackNumber: assignment.stack_number,
        clientPoolId: assignment.client_pool_id,
        clientCode: assignment.client_code,
        assignedAt: new Date(assignment.assigned_at),
        assignedBy: assignment.assigned_by,
        isExclusive: assignment.is_exclusive,
        priority: assignment.priority,
        notes: assignment.notes,
      }));
    } catch (error) {
      console.error('Failed to get stack assignments:', error);
      return [];
    }
  }

  /**
   * Get all stack assignments for a client
   */
  async getClientStackAssignments(clientCode: string): Promise<StackAssignment[]> {
    try {
      const dbAssignments = await dbService.select<DatabaseStackAssignment>(
        'stack_assignments',
        '*',
        { client_code: clientCode, is_active: true },
        'priority DESC, stack_number ASC'
      );

      return dbAssignments.map(assignment => ({
        id: assignment.id,
        stackId: assignment.stack_id,
        stackNumber: assignment.stack_number,
        clientPoolId: assignment.client_pool_id,
        clientCode: assignment.client_code,
        assignedAt: new Date(assignment.assigned_at),
        assignedBy: assignment.assigned_by,
        isExclusive: assignment.is_exclusive,
        priority: assignment.priority,
        notes: assignment.notes,
      }));
    } catch (error) {
      console.error('Failed to get client stack assignments:', error);
      return [];
    }
  }

  /**
   * Validate container assignment request
   */
  async validateContainerAssignment(
    request: ContainerAssignmentRequest,
    targetStackId: string
  ): Promise<{ isValid: boolean; reason?: string }> {
    try {
      // Check if client has access to the target stack
      const hasAccess = await this.isStackAssignedToClient(targetStackId, request.clientCode);
      if (!hasAccess) {
        return {
          isValid: false,
          reason: `Stack not assigned to client ${request.clientCode}`
        };
      }

      // Check stack capacity
      const stack = await dbService.selectOne('yard_stacks', 'capacity, current_occupancy', { id: targetStackId });
      if (!stack) {
        return {
          isValid: false,
          reason: 'Stack not found'
        };
      }

      if (stack.current_occupancy >= stack.capacity) {
        return {
          isValid: false,
          reason: 'Stack is at full capacity'
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Failed to validate container assignment:', error);
      return {
        isValid: false,
        reason: 'Validation error occurred'
      };
    }
  }

  /**
   * Get client pool statistics from database
   */
  async getClientPoolStats(): Promise<ClientPoolStats> {
    try {
      const stats = await dbService.queryOne(`
        SELECT
          COUNT(*) as total_pools,
          COUNT(*) FILTER (WHERE is_active = true) as active_clients,
          COALESCE(SUM(
            (SELECT COUNT(*) FROM stack_assignments sa WHERE sa.client_pool_id = cp.id AND sa.is_active = true)
          ), 0) as total_assigned_stacks,
          COALESCE(AVG(
            CASE WHEN max_capacity > 0 THEN (current_occupancy::DECIMAL / max_capacity) * 100 ELSE 0 END
          ), 0) as average_occupancy
        FROM client_pools cp
      `);

      if (!stats) {
        return {
          totalPools: 0,
          activeClients: 0,
          totalAssignedStacks: 0,
          averageOccupancy: 0,
          unassignedStacks: 0
        };
      }

      // Get unassigned stacks count
      const unassignedCount = await dbService.queryOne(`
        SELECT COUNT(*) as unassigned_stacks
        FROM yard_stacks ys
        WHERE ys.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM stack_assignments sa
          WHERE sa.stack_id = ys.id AND sa.is_active = true
        )
      `);

      return {
        totalPools: parseInt(stats.total_pools) || 0,
        activeClients: parseInt(stats.active_clients) || 0,
        totalAssignedStacks: parseInt(stats.total_assigned_stacks) || 0,
        averageOccupancy: parseFloat(stats.average_occupancy) || 0,
        unassignedStacks: parseInt(unassignedCount?.unassigned_stacks) || 0,
      };
    } catch (error) {
      console.error('Failed to get client pool statistics:', error);
      return {
        totalPools: 0,
        activeClients: 0,
        totalAssignedStacks: 0,
        averageOccupancy: 0,
        unassignedStacks: 0
      };
    }
  }

  /**
   * Create a new client pool
   */
  async createClientPool(
    clientId: string,
    clientCode: string,
    clientName: string,
    assignedStacks: string[],
    maxCapacity: number,
    priority: 'high' | 'medium' | 'low',
    contractStartDate: Date,
    contractEndDate?: Date,
    notes?: string,
    userName?: string
  ): Promise<ClientPool> {
    try {
      // Create client pool
      const newPool = await dbService.insert<DatabaseClientPool>('client_pools', {
        client_id: clientId,
        client_code: clientCode,
        client_name: clientName,
        max_capacity: maxCapacity,
        priority: priority,
        contract_start_date: contractStartDate.toISOString().split('T')[0],
        contract_end_date: contractEndDate?.toISOString().split('T')[0],
        notes: notes,
      });

      if (!newPool) {
        throw new Error('Failed to create client pool');
      }

      // Assign stacks to the pool
      for (const stackId of assignedStacks) {
        try {
          // Get stack number
          const stack = await dbService.selectOne('yard_stacks', 'stack_number', { id: stackId });
          if (stack) {
            await this.assignStackToClient(
              stackId,
              stack.stack_number,
              clientCode,
              userName || 'System',
              true,
              priority === 'high' ? 3 : priority === 'medium' ? 2 : 1,
              userName
            );
          }
        } catch (stackError) {
          console.error(`Failed to assign stack ${stackId}:`, stackError);
        }
      }

      console.log(`✅ Created new client pool for ${clientName} (${clientCode}) by ${userName || 'System'}`);
      return this.mapDatabasePoolToClientPool(newPool);
    } catch (error) {
      console.error('Failed to create client pool:', error);
      throw error;
    }
  }

  /**
   * Update client pool configuration
   */
  async updateClientPool(clientCode: string, updates: Partial<ClientPool>, userName?: string): Promise<ClientPool | null> {
    try {
      const updateData: Partial<DatabaseClientPool> = {};

      if (updates.clientName) updateData.client_name = updates.clientName;
      if (updates.maxCapacity !== undefined) updateData.max_capacity = updates.maxCapacity;
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.notes) updateData.notes = updates.notes;
      if (updates.contractStartDate) updateData.contract_start_date = updates.contractStartDate.toISOString().split('T')[0];
      if (updates.contractEndDate) updateData.contract_end_date = updates.contractEndDate.toISOString().split('T')[0];

      await dbService.update('client_pools', updateData, { client_code: clientCode });

      console.log(`✅ Updated client pool for ${clientCode} by ${userName || 'System'}`);
      return this.getClientPool(clientCode);
    } catch (error) {
      console.error('Failed to update client pool:', error);
      return null;
    }
  }

  /**
   * Get unassigned stacks for a yard
   */
  async getUnassignedStacks(yardId: string): Promise<YardStack[]> {
    try {
      const dbStacks = await dbService.query<any>(`
        SELECT ys.*, ysec.name as section_name
        FROM yard_stacks ys
        JOIN yard_sections ysec ON ys.section_id = ysec.id
        WHERE ys.yard_id = $1
        AND ys.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM stack_assignments sa
          WHERE sa.stack_id = ys.id AND sa.is_active = true
        )
        ORDER BY ysec.name, ys.stack_number
      `, [yardId]);

      return dbStacks.rows.map(stack => ({
        id: stack.id,
        stackNumber: stack.stack_number,
        sectionId: stack.section_id,
        rows: stack.rows,
        maxTiers: stack.max_tiers,
        currentOccupancy: stack.current_occupancy,
        capacity: stack.capacity,
        position: {
          x: stack.position_x,
          y: stack.position_y,
          z: stack.position_z,
        },
        dimensions: {
          width: stack.width,
          length: stack.length,
        },
        containerPositions: [], // Would need separate query
        isOddStack: stack.is_odd_stack,
      }));
    } catch (error) {
      console.error('Failed to get unassigned stacks:', error);
      return [];
    }
  }

  /**
   * Find optimal stack for container placement
   */
  async findOptimalStackForContainer(
    request: ContainerAssignmentRequest
  ): Promise<StackAvailabilityResult | null> {
    try {
      const availableStacks = await this.getAvailableStacksForClient(
        request.clientCode,
        request.containerSize
      );

      if (availableStacks.length === 0) return null;

      // Apply additional filtering based on requirements
      let filteredStacks = availableStacks;

      // Filter by preferred section if specified
      if (request.preferredSection) {
        const sectionFiltered = filteredStacks.filter(s =>
          s.sectionName.toLowerCase().includes(request.preferredSection!.toLowerCase())
        );
        if (sectionFiltered.length > 0) {
          filteredStacks = sectionFiltered;
        }
      }

      // Handle special requirements
      if (request.requiresSpecialHandling) {
        // Prefer stacks with lower occupancy for special handling
        filteredStacks = filteredStacks.filter(s => s.availableSlots >= s.totalCapacity * 0.5);
      }

      return filteredStacks[0] || null;
    } catch (error) {
      console.error('Failed to find optimal stack:', error);
      return null;
    }
  }

  /**
   * Get client pool utilization report
   */
  async getClientPoolUtilization(): Promise<Array<{
    clientCode: string;
    clientName: string;
    assignedStacks: number;
    occupancyRate: number;
    availableCapacity: number;
    status: 'optimal' | 'high' | 'critical' | 'underutilized';
  }>> {
    try {
      const utilization = await dbService.query(`
        SELECT
          cp.client_code,
          cp.client_name,
          COUNT(sa.stack_id) as assigned_stacks,
          ROUND((cp.current_occupancy::DECIMAL / NULLIF(cp.max_capacity, 0)) * 100, 2) as occupancy_rate,
          (cp.max_capacity - cp.current_occupancy) as available_capacity
        FROM client_pools cp
        LEFT JOIN stack_assignments sa ON cp.id = sa.client_pool_id AND sa.is_active = true
        WHERE cp.is_active = true
        GROUP BY cp.id, cp.client_code, cp.client_name, cp.current_occupancy, cp.max_capacity
        ORDER BY cp.client_name
      `);

      return utilization.rows.map(item => {
        const occupancyRate = parseFloat(item.occupancy_rate) || 0;
        let status: 'optimal' | 'high' | 'critical' | 'underutilized';

        if (occupancyRate >= 90) status = 'critical';
        else if (occupancyRate >= 75) status = 'high';
        else if (occupancyRate >= 25) status = 'optimal';
        else status = 'underutilized';

        return {
          clientCode: item.client_code,
          clientName: item.client_name,
          assignedStacks: parseInt(item.assigned_stacks) || 0,
          occupancyRate,
          availableCapacity: parseInt(item.available_capacity) || 0,
          status,
        };
      });
    } catch (error) {
      console.error('Failed to get client pool utilization:', error);
      return [];
    }
  }

  /**
   * Bulk assign stacks to client
   */
  async bulkAssignStacksToClient(
    stackIds: string[],
    clientCode: string,
    assignedBy: string,
    userName?: string
  ): Promise<StackAssignment[]> {
    try {
      const assignments: StackAssignment[] = [];

      for (const stackId of stackIds) {
        try {
          // Get stack number
          const stack = await dbService.selectOne('yard_stacks', 'stack_number', { id: stackId });
          if (stack) {
            const assignment = await this.assignStackToClient(
              stackId,
              stack.stack_number,
              clientCode,
              assignedBy,
              true,
              2,
              userName
            );
            assignments.push(assignment);
          }
        } catch (error) {
          console.error(`Failed to assign stack ${stackId} to client ${clientCode}:`, error);
        }
      }

      console.log(`✅ Bulk assigned ${assignments.length} stacks to client ${clientCode} by ${assignedBy}`);
      return assignments;
    } catch (error) {
      console.error('Failed to bulk assign stacks:', error);
      return [];
    }
  }

  /**
   * Release container from client pool (when container leaves)
   */
  async releaseContainerFromPool(containerNumber: string, clientCode: string, userName?: string): Promise<void> {
    try {
      // Update client pool occupancy
      await dbService.query(`
        UPDATE client_pools
        SET current_occupancy = GREATEST(0, current_occupancy - 1)
        WHERE client_code = $1
      `, [clientCode]);

      console.log(`✅ Container ${containerNumber} released from client pool ${clientCode} by ${userName || 'System'}`);
    } catch (error) {
      console.error('Error releasing container from pool:', error);
    }
  }

  /**
   * Get client pool dashboard data
   */
  async getClientPoolDashboard() {
    try {
      const [pools, stats, utilization] = await Promise.all([
        this.getClientPools(),
        this.getClientPoolStats(),
        this.getClientPoolUtilization()
      ]);

      return {
        pools,
        stats,
        utilization,
        summary: {
          totalClients: pools.length,
          activeClients: pools.filter(p => p.isActive).length,
          totalCapacity: pools.reduce((sum, p) => sum + p.maxCapacity, 0),
          totalOccupancy: pools.reduce((sum, p) => sum + p.currentOccupancy, 0),
          averageUtilization: stats.averageOccupancy
        }
      };
    } catch (error) {
      console.error('Failed to get client pool dashboard:', error);
      return {
        pools: [],
        stats: {
          totalPools: 0,
          activeClients: 0,
          totalAssignedStacks: 0,
          averageOccupancy: 0,
          unassignedStacks: 0
        },
        utilization: [],
        summary: {
          totalClients: 0,
          activeClients: 0,
          totalCapacity: 0,
          totalOccupancy: 0,
          averageUtilization: 0
        }
      };
    }
  }

  /**
   * Map database client pool to application interface
   */
  private mapDatabasePoolToClientPool(dbPool: DatabaseClientPool): ClientPool {
    return {
      id: dbPool.id,
      clientId: dbPool.client_id,
      clientCode: dbPool.client_code,
      clientName: dbPool.client_name,
      assignedStacks: [], // Would need separate query
      maxCapacity: dbPool.max_capacity,
      currentOccupancy: dbPool.current_occupancy,
      isActive: dbPool.is_active,
      createdAt: new Date(dbPool.created_at),
      updatedAt: new Date(dbPool.updated_at),
      createdBy: dbPool.created_by || 'system',
      updatedBy: dbPool.updated_by,
      notes: dbPool.notes,
      priority: dbPool.priority,
      contractStartDate: new Date(dbPool.contract_start_date),
      contractEndDate: dbPool.contract_end_date ? new Date(dbPool.contract_end_date) : undefined,
    };
  }

  /**
   * Get client pool with assigned stacks
   */
  async getClientPoolWithStacks(clientCode: string): Promise<ClientPool | null> {
    try {
      const pool = await this.getClientPool(clientCode);
      if (!pool) return null;

      const stackIds = await this.getClientStacks(clientCode);
      pool.assignedStacks = stackIds;

      return pool;
    } catch (error) {
      console.error('Failed to get client pool with stacks:', error);
      return null;
    }
  }

  /**
   * Get stack assignment details with additional information
   */
  async getStackAssignmentDetails(clientCode: string): Promise<any[]> {
    try {
      const details = await dbService.queryView('v_stack_assignment_details', {
        client_code: clientCode
      });

      return details;
    } catch (error) {
      console.error('Failed to get stack assignment details:', error);
      return [];
    }
  }

  /**
   * Update client pool occupancy
   */
  async updateClientPoolOccupancy(clientCode: string, change: number): Promise<void> {
    try {
      await dbService.query(`
        UPDATE client_pools
        SET current_occupancy = GREATEST(0, current_occupancy + $1)
        WHERE client_code = $2
      `, [change, clientCode]);
    } catch (error) {
      console.error('Failed to update client pool occupancy:', error);
    }
  }

  /**
   * Get containers for client pool
   */
  async getClientPoolContainers(clientCode: string, yardId?: string): Promise<Container[]> {
    try {
      let query = `
        SELECT * FROM v_container_overview
        WHERE client_code = $1
      `;
      const params: any[] = [clientCode];

      if (yardId) {
        query += ` AND current_yard_name = (SELECT name FROM yards WHERE id = $2)`;
        params.push(yardId);
      }

      query += ` ORDER BY gate_in_date DESC`;

      const containers = await dbService.query(query, params);

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
      console.error('Failed to get client pool containers:', error);
      return [];
    }
  }
}

// Singleton instance
export const clientPoolService = new ClientPoolService();
