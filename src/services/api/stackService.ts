import { supabase } from './supabaseClient';
import { YardStack } from '../../types/yard';
import { toDate } from '../../utils/dateHelpers';

export class StackService {
  async getAll(yardId?: string): Promise<YardStack[]> {
    let query = supabase
      .from('stacks')
      .select('*')
      .order('stack_number', { ascending: true });

    if (yardId) {
      query = query.eq('yard_id', yardId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((item) => this.mapToStack(item));
  }

  async getById(id: string): Promise<YardStack | null> {
    const { data, error } = await supabase
      .from('stacks')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToStack(data) : null;
  }

  async getByStackNumber(yardId: string, stackNumber: number): Promise<YardStack | null> {
    const { data, error } = await supabase
      .from('stacks')
      .select('*')
      .eq('yard_id', yardId)
      .eq('stack_number', stackNumber)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToStack(data) : null;
  }

  async create(stack: Partial<YardStack>, userId: string): Promise<YardStack> {
    const { data, error } = await supabase
      .from('stacks')
      .insert({
        yard_id: stack.yardId || 'depot-tantarelli',
        stack_number: stack.stackNumber,
        section_id: stack.sectionId,
        section_name: stack.sectionName || 'Main Section',
        rows: stack.rows || 6,
        max_tiers: stack.maxTiers || 4,
        capacity: stack.capacity || 0,
        current_occupancy: stack.currentOccupancy || 0,
        position_x: stack.position?.x || 0,
        position_y: stack.position?.y || 0,
        position_z: stack.position?.z || 0,
        width: stack.dimensions?.width || 2.5,
        length: stack.dimensions?.length || 12,
        is_active: stack.isActive !== false,
        is_odd_stack: stack.isOddStack || false,
        is_special_stack: stack.isSpecialStack || false,
        container_size: stack.containerSize || '20feet',
        assigned_client_code: stack.assignedClientCode,
        notes: stack.notes,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapToStack(data);
  }

  async update(id: string, updates: Partial<YardStack>, userId: string): Promise<YardStack> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: userId
    };

    if (updates.stackNumber !== undefined) updateData.stack_number = updates.stackNumber;
    if (updates.sectionId !== undefined) updateData.section_id = updates.sectionId;
    if (updates.sectionName !== undefined) updateData.section_name = updates.sectionName;
    if (updates.rows !== undefined) updateData.rows = updates.rows;
    if (updates.maxTiers !== undefined) updateData.max_tiers = updates.maxTiers;
    if (updates.capacity !== undefined) updateData.capacity = updates.capacity;
    if (updates.currentOccupancy !== undefined) updateData.current_occupancy = updates.currentOccupancy;
    if (updates.position?.x !== undefined) updateData.position_x = updates.position.x;
    if (updates.position?.y !== undefined) updateData.position_y = updates.position.y;
    if (updates.position?.z !== undefined) updateData.position_z = updates.position.z;
    if (updates.dimensions?.width !== undefined) updateData.width = updates.dimensions.width;
    if (updates.dimensions?.length !== undefined) updateData.length = updates.dimensions.length;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.isOddStack !== undefined) updateData.is_odd_stack = updates.isOddStack;
    if (updates.isSpecialStack !== undefined) updateData.is_special_stack = updates.isSpecialStack;
    if (updates.containerSize !== undefined) updateData.container_size = updates.containerSize;
    if (updates.assignedClientCode !== undefined) updateData.assigned_client_code = updates.assignedClientCode;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('stacks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.mapToStack(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('stacks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateOccupancy(id: string, occupancy: number): Promise<void> {
    const { error } = await supabase
      .from('stacks')
      .update({ current_occupancy: occupancy, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async updateContainerSize(
    stackId: string,
    yardId: string,
    stackNumber: number,
    newSize: '20feet' | '40feet',
    userId: string
  ): Promise<YardStack[]> {
    const updatedStacks: YardStack[] = [];
    const updateData = {
      container_size: newSize,
      updated_at: new Date().toISOString(),
      updated_by: userId
    };

    const currentStack = await this.getById(stackId);
    if (!currentStack) {
      throw new Error('Stack not found');
    }

    if (currentStack.isSpecialStack && newSize === '40feet') {
      throw new Error('Special stacks cannot be configured for 40ft containers');
    }

    const { data, error } = await supabase
      .from('stacks')
      .update(updateData)
      .eq('id', stackId)
      .select()
      .single();

    if (error) throw error;
    updatedStacks.push(this.mapToStack(data));

    if (newSize === '40feet') {
      const adjacentStackNumber = this.getAdjacentStackNumber(stackNumber);
      if (adjacentStackNumber) {
        const adjacentStack = await this.getByStackNumber(yardId, adjacentStackNumber);

        if (adjacentStack && !adjacentStack.isSpecialStack) {
          const { data: adjacentData, error: adjacentError } = await supabase
            .from('stacks')
            .update(updateData)
            .eq('yard_id', yardId)
            .eq('stack_number', adjacentStackNumber)
            .select()
            .maybeSingle();

          if (!adjacentError && adjacentData) {
            updatedStacks.push(this.mapToStack(adjacentData));
          }
        }
      }
    }

    return updatedStacks;
  }

  getAdjacentStackNumber(stackNumber: number): number | null {
    if (stackNumber % 2 === 1) {
      return stackNumber + 1;
    } else if (stackNumber % 2 === 0) {
      return stackNumber - 1;
    }
    return null;
  }

  canAssign40Feet(stack: YardStack): boolean {
    if (stack.isSpecialStack) return false;

    const adjacentNumber = this.getAdjacentStackNumber(stack.stackNumber);
    if (!adjacentNumber) return false;

    return true;
  }

  private mapToStack(data: any): YardStack {
    return {
      id: data.id,
      yardId: data.yard_id,
      stackNumber: data.stack_number,
      sectionId: data.section_id,
      sectionName: data.section_name,
      rows: data.rows,
      maxTiers: data.max_tiers,
      currentOccupancy: data.current_occupancy,
      capacity: data.capacity,
      position: {
        x: parseFloat(data.position_x) || 0,
        y: parseFloat(data.position_y) || 0,
        z: parseFloat(data.position_z) || 0
      },
      dimensions: {
        width: parseFloat(data.width) || 2.5,
        length: parseFloat(data.length) || 12
      },
      containerPositions: [],
      isOddStack: data.is_odd_stack,
      isSpecialStack: data.is_special_stack || false,
      isActive: data.is_active,
      containerSize: data.container_size || '20feet',
      assignedClientCode: data.assigned_client_code,
      notes: data.notes,
      createdAt: toDate(data.created_at),
      updatedAt: toDate(data.updated_at),
      createdBy: data.created_by,
      updatedBy: data.updated_by
    };
  }
}

export const stackService = new StackService();
