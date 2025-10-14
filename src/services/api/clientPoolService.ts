import { supabase } from './supabaseClient';
import { ClientPool, StackAssignment, ClientPoolStats } from '../../types/clientPool';
import { toDate } from '../../utils/dateHelpers';

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
      assignedAt: toDate(assignment.assigned_at),
      assignedBy: assignment.assigned_by,
      isExclusive: assignment.is_exclusive,
      priority: assignment.priority,
      notes: assignment.notes
    }));
  }

  async assignStack(assignment: Partial<StackAssignment>, userId: string): Promise<StackAssignment> {
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

    return {
      id: data.id,
      stackId: data.stack_id,
      stackNumber: data.stack_number,
      clientPoolId: data.client_pool_id,
      clientCode: data.client_code,
      assignedAt: toDate(data.assigned_at),
      assignedBy: data.assigned_by,
      isExclusive: data.is_exclusive,
      priority: data.priority,
      notes: data.notes
    };
  }

  async unassignStack(assignmentId: string): Promise<void> {
    const { error } = await supabase
      .from('stack_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) throw error;
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
}

export const clientPoolService = new ClientPoolService();
