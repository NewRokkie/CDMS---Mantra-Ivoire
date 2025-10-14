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

  async getByYardId(yardId: string): Promise<YardStack[]> {
    return this.getAll(yardId);
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
    // Get stack info first
    const stack = await this.getById(id);
    if (!stack) {
      throw new Error('Stack not found');
    }

    // Check if stack has containers
    const { data: containersOnStack, error: containerCheckError } = await supabase
      .from('containers')
      .select('id, number')
      .eq('yard_id', stack.yardId)
      .eq('status', 'in_depot')
      .ilike('location', `S${String(stack.stackNumber).padStart(2, '0')}-%`);

    if (containerCheckError) throw containerCheckError;

    if (containersOnStack && containersOnStack.length > 0) {
      throw new Error(`Cannot delete stack S${String(stack.stackNumber).padStart(2, '0')}. There are ${containersOnStack.length} container(s) currently stored on this stack. Please relocate them first.`);
    }

    // Check if stack is part of a pairing
    const { data: pairingData } = await supabase
      .from('stack_pairings')
      .select('*')
      .eq('yard_id', stack.yardId)
      .or(`first_stack_number.eq.${stack.stackNumber},second_stack_number.eq.${stack.stackNumber}`)
      .eq('is_active', true)
      .maybeSingle();

    // If paired, we should deactivate the pairing
    if (pairingData) {
      await supabase
        .from('stack_pairings')
        .update({ is_active: false })
        .eq('id', pairingData.id);
    }

    // Now delete the stack
    const { error } = await supabase
      .from('stacks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }
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
      throw new Error(`Stack not found with ID: ${stackId}`);
    }

    if (currentStack.isSpecialStack && newSize === '40feet') {
      throw new Error('Special stacks cannot be configured for 40ft containers');
    }

    // Check for existing 40ft containers on this stack
    const { data: containersOnStack, error: containerCheckError } = await supabase
      .from('containers')
      .select('id, number, size, location')
      .eq('yard_id', yardId)
      .eq('status', 'in_depot')
      .ilike('location', `S${String(stackNumber).padStart(2, '0')}-%`);

    if (containerCheckError) throw containerCheckError;

    // Check if trying to change FROM 40feet to 20feet while containers exist
    if (currentStack.containerSize === '40feet' && newSize === '20feet' && containersOnStack && containersOnStack.length > 0) {
      const has40ftContainers = containersOnStack.some(c => c.size === '40ft' || c.size === '40FT');
      if (has40ftContainers) {
        throw new Error(`Cannot change stack S${String(stackNumber).padStart(2, '0')} from 40ft to 20ft. There are ${containersOnStack.filter(c => c.size === '40ft' || c.size === '40FT').length} 40ft container(s) currently stored on this stack. Please relocate them first.`);
      }
    }

    // Get pairing information from stack_pairings table
    const { data: pairingData } = await supabase
      .from('stack_pairings')
      .select('*')
      .eq('yard_id', yardId)
      .or(`first_stack_number.eq.${stackNumber},second_stack_number.eq.${stackNumber}`)
      .eq('is_active', true)
      .maybeSingle();

    // Update the current stack
    const { data, error } = await supabase
      .from('stacks')
      .update(updateData)
      .eq('id', stackId)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(`Failed to update stack ${stackNumber}. Stack may have been deleted.`);
    }

    updatedStacks.push(this.mapToStack(data));

    // If there's a pairing, update the paired stack as well
    if (pairingData) {
      const pairedStackNumber = pairingData.first_stack_number === stackNumber
        ? pairingData.second_stack_number
        : pairingData.first_stack_number;

      // Check for containers on paired stack
      const { data: containersOnPaired } = await supabase
        .from('containers')
        .select('id, number, size, location')
        .eq('yard_id', yardId)
        .eq('status', 'in_depot')
        .ilike('location', `S${String(pairedStackNumber).padStart(2, '0')}-%`);

      if (currentStack.containerSize === '40feet' && newSize === '20feet' && containersOnPaired && containersOnPaired.length > 0) {
        const has40ftContainers = containersOnPaired.some(c => c.size === '40ft' || c.size === '40FT');
        if (has40ftContainers) {
          throw new Error(`Cannot change paired stack S${String(pairedStackNumber).padStart(2, '0')} from 40ft to 20ft. There are ${containersOnPaired.filter(c => c.size === '40ft' || c.size === '40FT').length} 40ft container(s) currently stored on the paired stack. Please relocate them first.`);
        }
      }

      const pairedStack = await this.getByStackNumber(yardId, pairedStackNumber);

      if (pairedStack && !pairedStack.isSpecialStack) {
        const { data: pairedData, error: pairedError } = await supabase
          .from('stacks')
          .update(updateData)
          .eq('yard_id', yardId)
          .eq('stack_number', pairedStackNumber)
          .select()
          .maybeSingle();

        if (!pairedError && pairedData) {
          updatedStacks.push(this.mapToStack(pairedData));
        }
      }
    }

    return updatedStacks;
  }

  getAdjacentStackNumber(stackNumber: number): number | null {
    const SPECIAL_STACKS = [1, 31, 101, 103];
    if (SPECIAL_STACKS.includes(stackNumber)) return null;

    const isValidPairStack = (num: number): boolean => {
      if (num >= 3 && num <= 29) {
        const validFirstNumbers = [3, 7, 11, 15, 19, 23, 27];
        return validFirstNumbers.includes(num) || validFirstNumbers.includes(num - 2);
      } else if (num >= 33 && num <= 55) {
        const validFirstNumbers = [33, 37, 41, 45, 49, 53];
        return validFirstNumbers.includes(num) || validFirstNumbers.includes(num - 2);
      } else if (num >= 61 && num <= 99) {
        const validFirstNumbers = [61, 65, 69, 73, 77, 81, 85, 89, 93, 97];
        return validFirstNumbers.includes(num) || validFirstNumbers.includes(num - 2);
      }
      return false;
    };

    if (!isValidPairStack(stackNumber)) return null;

    let partnerNumber: number;

    if (stackNumber >= 3 && stackNumber <= 29) {
      const validFirstNumbers = [3, 7, 11, 15, 19, 23, 27];
      if (validFirstNumbers.includes(stackNumber)) {
        partnerNumber = stackNumber + 2;
      } else {
        partnerNumber = stackNumber - 2;
      }
    } else if (stackNumber >= 33 && stackNumber <= 55) {
      const validFirstNumbers = [33, 37, 41, 45, 49, 53];
      if (validFirstNumbers.includes(stackNumber)) {
        partnerNumber = stackNumber + 2;
      } else {
        partnerNumber = stackNumber - 2;
      }
    } else if (stackNumber >= 61 && stackNumber <= 99) {
      const validFirstNumbers = [61, 65, 69, 73, 77, 81, 85, 89, 93, 97];
      if (validFirstNumbers.includes(stackNumber)) {
        partnerNumber = stackNumber + 2;
      } else {
        partnerNumber = stackNumber - 2;
      }
    } else {
      return null;
    }

    return partnerNumber;
  }

  getVirtualStackNumber(stack1: number, stack2: number): number {
    const lower = Math.min(stack1, stack2);
    return lower + 1;
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
