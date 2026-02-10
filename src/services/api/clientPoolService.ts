import { supabase } from './supabaseClient';
import { ClientPool, StackAssignment, ClientPoolStats } from '../../types/clientPool';
import { toDate } from '../../utils/dateHelpers';
import { ErrorHandler } from '../errorHandling';
import { logger } from '../../utils/logger';

class ClientPoolService {
  async getAll(yardId?: string): Promise<ClientPool[]> {
    let query = supabase
      .from('client_pools')
      .select('*')
      .order('created_at', { ascending: false });

    if (yardId) {
      query = query.eq('yard_id', yardId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(pool => ({
      ...pool,
      clientName: pool.client_name || '', // Ensure clientName is always a string
      clientCode: pool.client_code || '', // Ensure clientCode is always a string
      assignedStacks: pool.assigned_stacks || [],
      maxCapacity: pool.max_capacity,
      currentOccupancy: pool.current_occupancy,
      isActive: pool.is_active,
      createdAt: toDate(pool.created_at),
      updatedAt: toDate(pool.updated_at),
      createdBy: pool.created_by,
      updatedBy: pool.updated_by,
      contractStartDate: toDate(pool.contract_start_date),
      contractEndDate: pool.contract_end_date ? toDate(pool.contract_end_date) : undefined
    }));
  }

  async getById(id: string): Promise<ClientPool | null> {
    const { data, error } = await supabase
      .from('client_pools')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ...data,
      assignedStacks: data.assigned_stacks || [],
      maxCapacity: data.max_capacity,
      currentOccupancy: data.current_occupancy,
      isActive: data.is_active,
      createdAt: toDate(data.created_at),
      updatedAt: toDate(data.updated_at),
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      contractStartDate: toDate(data.contract_start_date),
      contractEndDate: data.contract_end_date ? toDate(data.contract_end_date) : undefined
    };
  }

  async getByClientId(clientId: string, yardId?: string): Promise<ClientPool[]> {
    let query = supabase
      .from('client_pools')
      .select('*')
      .eq('client_id', clientId);

    if (yardId) {
      query = query.eq('yard_id', yardId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(pool => ({
      ...pool,
      assignedStacks: pool.assigned_stacks || [],
      maxCapacity: pool.max_capacity,
      currentOccupancy: pool.current_occupancy,
      isActive: pool.is_active,
      createdAt: toDate(pool.created_at),
      updatedAt: toDate(pool.updated_at),
      createdBy: pool.created_by,
      updatedBy: pool.updated_by,
      contractStartDate: toDate(pool.contract_start_date),
      contractEndDate: pool.contract_end_date ? toDate(pool.contract_end_date) : undefined
    }));
  }

  async create(pool: Partial<ClientPool>, userId: string): Promise<ClientPool> {
    const { data, error } = await supabase
      .from('client_pools')
      .insert({
        yard_id: pool.yardId,
        client_id: pool.clientId,
        client_code: pool.clientCode,
        client_name: pool.clientName,
        assigned_stacks: pool.assignedStacks || [],
        max_capacity: pool.maxCapacity || 0,
        current_occupancy: 0,
        is_active: pool.isActive !== undefined ? pool.isActive : true,
        priority: pool.priority || 'medium',
        contract_start_date: pool.contractStartDate || new Date(),
        contract_end_date: pool.contractEndDate,
        notes: pool.notes,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      assignedStacks: data.assigned_stacks || [],
      maxCapacity: data.max_capacity,
      currentOccupancy: data.current_occupancy,
      isActive: data.is_active,
      createdAt: toDate(data.created_at),
      updatedAt: toDate(data.updated_at),
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      contractStartDate: toDate(data.contract_start_date),
      contractEndDate: data.contract_end_date ? toDate(data.contract_end_date) : undefined
    };
  }

  async update(id: string, updates: Partial<ClientPool>, userId: string): Promise<ClientPool> {
    const updateData: any = {
      updated_by: userId
    };

    if (updates.assignedStacks !== undefined) updateData.assigned_stacks = updates.assignedStacks;
    if (updates.maxCapacity !== undefined) updateData.max_capacity = updates.maxCapacity;
    if (updates.currentOccupancy !== undefined) updateData.current_occupancy = updates.currentOccupancy;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.contractStartDate !== undefined) updateData.contract_start_date = updates.contractStartDate;
    if (updates.contractEndDate !== undefined) updateData.contract_end_date = updates.contractEndDate;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('client_pools')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      assignedStacks: data.assigned_stacks || [],
      maxCapacity: data.max_capacity,
      currentOccupancy: data.current_occupancy,
      isActive: data.is_active,
      createdAt: toDate(data.created_at),
      updatedAt: toDate(data.updated_at),
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      contractStartDate: toDate(data.contract_start_date),
      contractEndDate: data.contract_end_date ? toDate(data.contract_end_date) : undefined
    };
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('client_pools')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getStats(yardId?: string): Promise<ClientPoolStats> {
    let query = supabase.from('client_pools').select('*');

    if (yardId) {
      query = query.eq('yard_id', yardId);
    }

    const { data: pools, error } = await query;

    if (error) throw error;

    const activePools = (pools || []).filter(p => p.is_active);
    const totalAssignedStacks = activePools.reduce((sum, p) => sum + (p.assigned_stacks?.length || 0), 0);
    const totalOccupancy = activePools.reduce((sum, p) => sum + (p.current_occupancy || 0), 0);
    const totalCapacity = activePools.reduce((sum, p) => sum + (p.max_capacity || 0), 0);

    return {
      totalPools: pools?.length || 0,
      activeClients: activePools.length,
      totalAssignedStacks,
      averageOccupancy: totalCapacity > 0 ? (totalOccupancy / totalCapacity) * 100 : 0,
      unassignedStacks: 0
    };
  }

  async getStackAssignments(clientPoolId: string): Promise<StackAssignment[]> {
    const { data, error } = await supabase
      .from('stack_assignments')
      .select('*')
      .eq('client_pool_id', clientPoolId)
      .order('stack_number', { ascending: true });

    if (error) throw error;

    return (data || []).map(assignment => ({
      id: assignment.id,
      stackId: assignment.stack_id,
      stackNumber: assignment.stack_number,
      clientPoolId: assignment.client_pool_id,
      clientCode: assignment.client_code,
      assignedAt: toDate(assignment.assigned_at) ?? new Date(),
      assignedBy: assignment.assigned_by,
      isExclusive: assignment.is_exclusive,
      priority: assignment.priority,
      notes: assignment.notes
    }));
  }

  async assignStack(assignment: Partial<StackAssignment>, userId: string): Promise<StackAssignment> {
    try {
      // Server-side role check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) throw new Error('Authentication required');

      const { data: userProfile } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', user.id)
        .single();

      if (!userProfile || !['admin','supervisor'].includes(userProfile.role)) {
        throw new Error('Insufficient permissions');
      }

      const { data, error } = await supabase
        .from('stack_assignments')
        .insert({
          yard_id: assignment.yardId,
          stack_id: assignment.stackId,
          stack_number: assignment.stackNumber,
          client_pool_id: assignment.clientPoolId,
          client_code: assignment.clientCode,
          is_exclusive: assignment.isExclusive || false,
          priority: assignment.priority || 1,
          notes: assignment.notes,
          assigned_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      // Update location access permissions for this stack
      // Requirements: 6.2 - Update location access when client pool assignments change
      if (assignment.stackId && assignment.clientPoolId) {
        await this.updateLocationAccessForStack(assignment.stackId, assignment.clientPoolId);
      }

      return {
        id: data.id,
        stackId: data.stack_id,
        stackNumber: data.stack_number,
        clientPoolId: data.client_pool_id,
        clientCode: data.client_code,
        assignedAt: toDate(data.assigned_at) ?? new Date(),
        assignedBy: data.assigned_by,
        isExclusive: data.is_exclusive,
        priority: data.priority,
        notes: data.notes
      };
    } catch (error) {
      logger.error('ClientPoolService.assignStack error', 'clientPoolService.ts', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  async unassignStack(assignmentId: string): Promise<void> {
    try {
      // Get assignment details before deleting
      const { data: assignment, error: fetchError } = await supabase
        .from('stack_assignments')
        .select('stack_id')
        .eq('id', assignmentId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('stack_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      // Clear location access permissions for this stack
      // Requirements: 6.2 - Update location access when client pool assignments change
      if (assignment?.stack_id) {
        await this.clearLocationAccessForStack(assignment.stack_id);
      }
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  async updateOccupancy(clientPoolId: string, occupancy: number): Promise<void> {
    const { error } = await supabase
      .from('client_pools')
      .update({ current_occupancy: occupancy })
      .eq('id', clientPoolId);

    if (error) throw error;
  }

  getClientPoolUtilization(): Array<{
    clientCode: string;
    occupancyRate: number;
    status: string;
    usedSlots: number;
    totalSlots: number;
  }> {
    return [];
  }

  async getAssignedStacksForClient(clientCode: string, yardId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('client_pools')
      .select('assigned_stacks')
      .eq('client_code', clientCode)
      .eq('yard_id', yardId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return [];

    return data.assigned_stacks || [];
  }

  // ============================================================================
  // LOCATION MANAGEMENT INTEGRATION METHODS
  // Requirements: 6.2, 6.4, 6.5 - Integration with location management system
  // ============================================================================

  /**
   * Update location access permissions when a stack is assigned to a client pool
   * Requirements: 6.2 - Update location access when client pool assignments change
   */
  private async updateLocationAccessForStack(stackId: string, clientPoolId: string): Promise<void> {
    try {
      // Update all unoccupied locations in this stack to have the client pool ID
      const { error } = await supabase
        .from('locations')
        .update({
          client_pool_id: clientPoolId,
          updated_at: new Date().toISOString()
        })
        .eq('stack_id', stackId)
        .eq('is_occupied', false)
        .eq('is_active', true);

      if (error) throw error;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Clear location access permissions when a stack is unassigned from a client pool
   * Requirements: 6.2 - Update location access when client pool assignments change
   */
  private async clearLocationAccessForStack(stackId: string): Promise<void> {
    try {
      // Clear client pool ID from all unoccupied locations in this stack
      const { error } = await supabase
        .from('locations')
        .update({
          client_pool_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('stack_id', stackId)
        .eq('is_occupied', false)
        .eq('is_active', true);

      if (error) throw error;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Update location access for all stacks assigned to a client pool
   * Requirements: 6.2 - Ensure location access permissions are updated
   */
  async updateLocationAccessForClientPool(clientPoolId: string): Promise<void> {
    try {
      // Get all stack assignments for this client pool
      const assignments = await this.getStackAssignments(clientPoolId);

      // Update location access for each assigned stack
      for (const assignment of assignments) {
        await this.updateLocationAccessForStack(assignment.stackId, clientPoolId);
      }
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get available locations for a client based on their pool assignment
   * Requirements: 6.4, 6.5 - Handle location access for clients with no pool configuration
   */
  async getAvailableLocationsForClient(
    clientPoolId: string | null,
    yardId: string,
    containerSize?: '20ft' | '40ft',
    limit?: number
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('locations')
        .select('*')
        .eq('yard_id', yardId)
        .eq('is_occupied', false)
        .eq('is_active', true);

      // Filter by client pool access
      // Requirements: 6.4 - Show all unassigned locations for clients with no pool
      if (clientPoolId) {
        query = query.eq('client_pool_id', clientPoolId);
      } else {
        query = query.is('client_pool_id', null);
      }

      // Apply container size filter if specified
      if (containerSize) {
        query = query.eq('container_size', containerSize);
      }

      // Order by location_id for consistent results
      query = query.order('location_id', { ascending: true });

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Validate if a client has access to a specific location
   * Requirements: 6.5 - Enforce location access restrictions
   */
  async validateClientLocationAccess(
    clientPoolId: string | null,
    locationId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('client_pool_id')
        .eq('id', locationId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return false;

      // If location has a pool assignment
      if (data.client_pool_id) {
        // Client must have matching pool ID
        return clientPoolId === data.client_pool_id;
      } else {
        // Location is unassigned - only unpooled clients can access
        return clientPoolId === null;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Get location statistics for a client pool
   * Requirements: 6.1 - Track location availability by client pool
   */
  async getClientPoolLocationStats(clientPoolId: string): Promise<{
    totalLocations: number;
    availableLocations: number;
    occupiedLocations: number;
    occupancyRate: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('is_occupied')
        .eq('client_pool_id', clientPoolId)
        .eq('is_active', true);

      if (error) throw error;

      const locations = data || [];
      const totalLocations = locations.length;
      const occupiedLocations = locations.filter(l => l.is_occupied).length;
      const availableLocations = totalLocations - occupiedLocations;
      const occupancyRate = totalLocations > 0 
        ? (occupiedLocations / totalLocations) * 100 
        : 0;

      return {
        totalLocations,
        availableLocations,
        occupiedLocations,
        occupancyRate: Math.round(occupancyRate * 100) / 100
      };
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Bulk update location access for multiple stacks
   * Requirements: 6.2 - Efficient bulk updates when assignments change
   */
  async bulkUpdateLocationAccess(
    stackIds: string[],
    clientPoolId: string | null
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('locations')
        .update({
          client_pool_id: clientPoolId,
          updated_at: new Date().toISOString()
        })
        .in('stack_id', stackIds)
        .eq('is_occupied', false)
        .eq('is_active', true);

      if (error) throw error;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }
}

export const clientPoolService = new ClientPoolService();
