import { supabase } from './supabaseClient';
import { YardStack } from '../../types/yard';
import { toDate } from '../../utils/dateHelpers';
import { locationIdGeneratorService } from './locationIdGeneratorService';
import { virtualLocationCalculatorService } from './virtualLocationCalculatorService';
import { locationManagementService } from './locationManagementService';
import { handleError } from '../errorHandling';
import { logger } from '../../utils/logger';

/**
 * Stack Service - Manages yard stacks with automatic location record management
 * 
 * Requirements Addressed:
 * - 5.1: Stack operations automatically create/update location records
 * - 5.2: Stack configuration changes trigger location record updates
 * - 5.3: Stack deletion properly handles associated location cleanup
 */

export class StackService {
  async getAll(yardId?: string): Promise<YardStack[]> {
    let query = supabase
      .from('stacks')
      .select('*')
      .eq('is_active', true)
      .order('stack_number', { ascending: true });

    if (yardId) {
      query = query.eq('yard_id', yardId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Map all stacks including virtual ones
    const mappedData = (data || []).map((item) => this.mapToStack(item));
    return mappedData;
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

  /**
   * Get all stacks for a yard with location-based occupancy sync
   * Requirements: 5.1, 5.2 - Stack operations integrate with location management
   * @param yardId - The yard ID
   * @param skipOccupancySync - Skip expensive occupancy sync (useful for initial loads)
   */
  async getByYardId(yardId: string, skipOccupancySync: boolean = false): Promise<YardStack[]> {
    const stacks = await this.getAll(yardId);

    // Skip occupancy sync for initial loads to improve performance
    if (skipOccupancySync) {
      return stacks;
    }

    try {
      const updatedStacks = await Promise.all(
        stacks.map(async (stack) => {
          try {
            const locationBasedOccupancy = await this.getAccurateOccupancy(stack.id);
            
            if (locationBasedOccupancy !== stack.currentOccupancy) {
              await this.updateOccupancy(stack.id, locationBasedOccupancy);
              stack.currentOccupancy = locationBasedOccupancy;
            }
            
            return stack;
          } catch (locationError) {
            // Fallback to container-based counting
            const stackPattern = `S${String(stack.stackNumber).padStart(2, '0')}-%`;
            const { data: containers, error } = await supabase
              .from('containers')
              .select('id, location, yard_id, status')
              .eq('yard_id', yardId)
              .eq('status', 'in_depot')
              .ilike('location', stackPattern);

            if (error) {
              handleError(error, 'StackService.getByYardId.containerCount');
              return stack;
            }

            const actualOccupancy = containers?.length || 0;
            
            if (actualOccupancy !== stack.currentOccupancy) {
              await this.updateOccupancy(stack.id, actualOccupancy);
              stack.currentOccupancy = actualOccupancy;
            }

            return stack;
          }
        })
      );

      return updatedStacks;
      
    } catch (error) {
      handleError(error, 'StackService.getByYardId');
      return stacks;
    }
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
    // Validate section_id if provided - only use it if it's not empty
    let sectionId = stack.sectionId && stack.sectionId.trim() !== '' ? stack.sectionId : null;
    
    // If no section provided, try to auto-assign based on stack number
    if (!sectionId && stack.stackNumber && stack.yardId) {
      const { yardsService } = await import('./yardsService');
      sectionId = yardsService.getSectionIdForStackNumber(stack.yardId, stack.stackNumber);
    }

    // Determine section name based on section ID
    let sectionName = stack.sectionName || 'Main Section';
    if (sectionId) {
      const sectionNameMap: Record<string, string> = {
        'section-top': 'Zone A',
        'section-center': 'Zone B',
        'section-bottom': 'Zone C',
        'section-a': 'Zone A',
        'section-b': 'Zone B',
        'section-c': 'Zone C'
      };
      sectionName = sectionNameMap[sectionId] || sectionName;
    }

    // Calculate capacity based on row-tier config or uniform tiers
    const capacity = stack.rowTierConfig 
      ? this.calculateCapacityFromRowTierConfig(stack.rowTierConfig, stack.rows || 6)
      : (stack.capacity || (stack.rows || 6) * (stack.maxTiers || 4));

    const { data, error } = await supabase
      .from('stacks')
      .insert({
        yard_id: stack.yardId || 'depot-tantarelli',
        stack_number: stack.stackNumber,
        section_id: sectionId,
        section_name: sectionName,
        rows: stack.rows || 6,
        max_tiers: stack.maxTiers || 4,
        row_tier_config: stack.rowTierConfig ? JSON.stringify(stack.rowTierConfig) : null,
        capacity: capacity,
        current_occupancy: stack.currentOccupancy || 0,
        position_x: stack.position?.x || 0,
        position_y: stack.position?.y || 0,
        position_z: stack.position?.z || 0,
        width: stack.dimensions?.width || 2.5,
        length: stack.dimensions?.length || 12,
        is_active: stack.isActive !== false,
        is_odd_stack: stack.isOddStack || false,
        is_special_stack: stack.isSpecialStack || false,
        container_size: stack.containerSize || '20ft',
        assigned_client_code: stack.assignedClientCode,
        notes: stack.notes,
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;
    
    const createdStack = this.mapToStack(data);

    // Automatically generate location records for the new stack
    // Requirements: 2.3 - Stack operations trigger location record creation
    try {
      const containerSize = createdStack.containerSize === '40ft' ? '40ft' : '20ft';
      await locationIdGeneratorService.generateLocationsForStack({
        yardId: createdStack.yardId || 'depot-tantarelli',
        stackId: createdStack.id,
        stackNumber: createdStack.stackNumber,
        rows: createdStack.rows,
        tiers: createdStack.maxTiers,
        containerSize,
        clientPoolId: undefined,
        isVirtual: false
      });
    } catch (locationError) {
      handleError(locationError, 'StackService.create.generateLocations');
      // Don't fail the stack creation if location generation fails
      // This allows for graceful degradation
    }

    return createdStack;
  }

  /**
   * Update stack configuration with automatic location record updates
   * Requirements: 5.1, 5.2 - Stack configuration changes trigger location record updates
   */
  async update(id: string, updates: Partial<YardStack>, userId: string): Promise<YardStack> {
    // Get current stack configuration before update
    const currentStack = await this.getById(id);
    if (!currentStack) {
      throw new Error(`Stack not found with ID: ${id}`);
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: userId
    };

    if (updates.stackNumber !== undefined) updateData.stack_number = updates.stackNumber;
    if (updates.sectionId !== undefined) updateData.section_id = updates.sectionId;
    if (updates.sectionName !== undefined) updateData.section_name = updates.sectionName;
    if (updates.rows !== undefined) updateData.rows = updates.rows;
    if (updates.maxTiers !== undefined) updateData.max_tiers = updates.maxTiers;
    if (updates.rowTierConfig !== undefined) {
      updateData.row_tier_config = updates.rowTierConfig ? JSON.stringify(updates.rowTierConfig) : null;
      // Recalculate capacity if row-tier config changes
      if (updates.rowTierConfig) {
        updateData.capacity = this.calculateCapacityFromRowTierConfig(
          updates.rowTierConfig, 
          updates.rows || currentStack.rows
        );
      }
    }
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
    
    const updatedStack = this.mapToStack(data);

    // Check if rows or tiers changed - if so, update location records
    // Requirements: 5.2 - Stack configuration updates trigger location record updates
    const rowsChanged = updates.rows !== undefined && updates.rows !== currentStack.rows;
    const tiersChanged = updates.maxTiers !== undefined && updates.maxTiers !== currentStack.maxTiers;

    if (rowsChanged || tiersChanged) {
      try {
        await locationIdGeneratorService.updateLocationsForStackConfiguration(
          updatedStack.id,
          updatedStack.yardId || 'depot-tantarelli',
          updatedStack.stackNumber,
          updatedStack.rows,
          updatedStack.maxTiers
        );
        
        // Sync occupancy with updated locations
        await this.syncOccupancyWithLocations(updatedStack.id);
      } catch (locationError) {
        handleError(locationError, 'StackService.update.updateLocations');
        // Don't fail the stack update if location update fails
      }
    }

    return updatedStack;
  }

  /**
   * Delete a stack with proper location cleanup
   * Requirements: 5.3 - Stack deletion properly handles associated location cleanup
   */
  async delete(id: string): Promise<void> {
    // Get stack info first
    const stack = await this.getById(id);
    if (!stack) {
      throw new Error('Stack not found');
    }

    // Check if stack has containers using location-based occupancy
    // Requirements: 5.3 - Proper validation before stack deletion
    try {
      const locationBasedOccupancy = await this.getAccurateOccupancy(id);
      if (locationBasedOccupancy > 0) {
        throw new Error(`Cannot delete stack S${String(stack.stackNumber).padStart(2, '0')}. There are ${locationBasedOccupancy} container(s) currently stored on this stack (location-based count). Please relocate them first.`);
      }
    } catch (occupancyError) {
      handleError(occupancyError, 'StackService.delete.getOccupancy');
      
      // Fallback to stack current_occupancy
      if (stack.currentOccupancy > 0) {
        // Double-check with containers table as backup
        const { data: containersOnStack, error: containerCheckError } = await supabase
          .from('containers')
          .select('id, number')
          .eq('yard_id', stack.yardId)
          .eq('status', 'in_depot')
          .ilike('location', `S${String(stack.stackNumber).padStart(2, '0')}-%`);

        if (containerCheckError) {
          handleError(containerCheckError, 'StackService.delete.checkContainers');
          throw containerCheckError;
        }

        if (containersOnStack && containersOnStack.length > 0) {
          throw new Error(`Cannot delete stack S${String(stack.stackNumber).padStart(2, '0')}. There are ${containersOnStack.length} container(s) currently stored on this stack. Please relocate them first.`);
        }
      }
    }

    // Check if stack is part of a pairing
    const { data: pairingData } = await supabase
      .from('stack_pairings')
      .select('*')
      .eq('yard_id', stack.yardId)
      .or(`first_stack_number.eq.${stack.stackNumber},second_stack_number.eq.${stack.stackNumber}`)
      .eq('is_active', true)
      .maybeSingle();

    // If paired, we should deactivate the pairing and cleanup virtual locations
    if (pairingData) {
      // Requirements: 3.5 - Cleanup virtual locations when pairings are removed
      try {
        const virtualPair = await virtualLocationCalculatorService.getVirtualStackPairByStacks(
          stack.yardId || 'depot-tantarelli',
          pairingData.first_stack_id,
          pairingData.second_stack_id
        );
        
        if (virtualPair) {
          await virtualLocationCalculatorService.cleanupVirtualLocations(virtualPair.id);
        }
      } catch (virtualError) {
        handleError(virtualError, 'StackService.delete.cleanupVirtual');
        // Don't fail the stack deletion if virtual cleanup fails
      }

      await supabase
        .from('stack_pairings')
        .update({ is_active: false })
        .eq('id', pairingData.id);
    }

    // Verify the stack exists before deleting
    const existingStack = await this.getById(id);

    if (!existingStack) {
      throw new Error(`Stack with ID ${id} not found in database`);
    }

    const { error, data } = await supabase
      .from('stacks')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      // Check if stack still exists
      const checkAgain = await this.getById(id);
      if (checkAgain) {
        throw new Error('Delete operation completed but stack still exists - check RLS policies');
      }
    }

    // Clean up location records for the deleted stack
    // Requirements: 5.3 - Stack deletion properly handles associated location cleanup
    try {
      await locationIdGeneratorService.deleteLocationsForStack(id);
    } catch (locationError) {
      handleError(locationError, 'StackService.delete.cleanupLocations');
      // Don't fail the stack deletion if location cleanup fails
    }
  }

  /**
   * Update stack occupancy
   * Note: This method is being phased out in favor of location-based occupancy tracking
   * Requirements: 5.1, 5.2 - Stack operations integrate with location management
   */
  async updateOccupancy(id: string, occupancy: number): Promise<void> {
    const { error } = await supabase
      .from('stacks')
      .update({ current_occupancy: occupancy, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Sync stack occupancy with location-based data
   * Requirements: 5.1, 5.2 - Ensure stack occupancy reflects location-based reality
   */
  async syncOccupancyWithLocations(stackId: string): Promise<number> {
    try {
      // Get all locations for this stack
      const locations = await locationManagementService.getByStackId(stackId);
      
      // Count occupied locations
      const occupiedCount = locations.filter(loc => loc.isOccupied).length;
      
      // Update stack occupancy
      await this.updateOccupancy(stackId, occupiedCount);
      
      return occupiedCount;
    } catch (error) {
      handleError(error, 'StackService.syncOccupancyWithLocations');
      throw error;
    }
  }

  /**
   * Get accurate stack occupancy from location data
   * Requirements: 5.1 - Stack operations properly integrate with location management
   */
  async getAccurateOccupancy(stackId: string): Promise<number> {
    try {
      const locations = await locationManagementService.getByStackId(stackId);
      return locations.filter(loc => loc.isOccupied).length;
    } catch (error) {
      handleError(error, 'StackService.getAccurateOccupancy');
      // Fallback to database value
      const stack = await this.getById(stackId);
      return stack?.currentOccupancy || 0;
    }
  }

  async updateContainerSize(
    stackId: string,
    yardId: string,
    stackNumber: number,
    newSize: '20ft' | '40ft',
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

    if (currentStack.isSpecialStack && newSize === '40ft') {
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

    // Check if trying to change FROM 40ft to 20ft while containers exist
    if (currentStack.containerSize === '40ft' && newSize === '20ft' && containersOnStack && containersOnStack.length > 0) {
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

      if (currentStack.containerSize === '40ft' && newSize === '20ft' && containersOnPaired && containersOnPaired.length > 0) {
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

      // Requirements: 3.3, 3.5, 5.3 - Handle virtual location updates when stack configurations change
      // If changing TO 40ft, create/update virtual locations
      if (newSize === '40ft' && pairingData) {
        try {
          await this.syncVirtualLocationsForPairing(
            yardId,
            pairingData.first_stack_id,
            pairingData.second_stack_id,
            pairingData.first_stack_number,
            pairingData.second_stack_number,
            currentStack.rows,
            currentStack.maxTiers
          );
        } catch (virtualError) {
          logger.error('Failed to sync virtual locations', 'ComponentName', virtualError);
          // Don't fail the stack update if virtual location sync fails
        }
      }

      // If changing FROM 40ft to 20ft, cleanup virtual locations
      if (currentStack.containerSize === '40ft' && newSize === '20ft' && pairingData) {
        try {
          // Get virtual stack pair
          const virtualPair = await virtualLocationCalculatorService.getVirtualStackPairByStacks(
            yardId,
            pairingData.first_stack_id,
            pairingData.second_stack_id
          );
          
          if (virtualPair) {
            await virtualLocationCalculatorService.cleanupVirtualLocations(virtualPair.id);
          }
        } catch (cleanupError) {
          handleError(cleanupError, 'StackService.updateContainerSize.cleanup');
          // Don't fail the stack update if cleanup fails
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

  canAssign40ft(stack: YardStack): boolean {
    if (stack.isSpecialStack) return false;

    const adjacentNumber = this.getAdjacentStackNumber(stack.stackNumber);
    if (!adjacentNumber) return false;

    return true;
  }

  /**
   * Sync virtual locations for a stack pairing
   * Requirements: 3.3, 3.5 - Automatic virtual location generation and updates
   * 
   * @param yardId - Yard ID
   * @param stack1Id - First stack ID
   * @param stack2Id - Second stack ID
   * @param stack1Number - First stack number
   * @param stack2Number - Second stack number
   * @param rows - Number of rows
   * @param tiers - Number of tiers
   */
  private async syncVirtualLocationsForPairing(
    yardId: string,
    stack1Id: string,
    stack2Id: string,
    stack1Number: number,
    stack2Number: number,
    rows: number,
    tiers: number
  ): Promise<void> {
    try {
      // Check if virtual stack pair already exists
      const existingPair = await virtualLocationCalculatorService.getVirtualStackPairByStacks(
        yardId,
        stack1Id,
        stack2Id
      );

      if (existingPair) {
        // Update existing virtual locations
        logger.info('Information', 'ComponentName', `🔄 Updating virtual locations for existing pair`)
        await virtualLocationCalculatorService.updateVirtualLocations({
          virtualStackPairId: existingPair.id,
          rows,
          tiers
        });
      } else {
        // Create new virtual locations
        logger.info('Information', 'ComponentName', `➕ Creating virtual locations for new pairing`)
        await virtualLocationCalculatorService.createVirtualLocations({
          yardId,
          stack1Id,
          stack2Id,
          stack1Number,
          stack2Number,
          rows,
          tiers
        });
      }
    } catch (error) {
      handleError(error, 'StackService.syncVirtualLocationsForPairing');
      throw error;
    }
  }

  /**
   * Calculate capacity from row-tier configuration
   */
  private calculateCapacityFromRowTierConfig(rowTierConfig: any[], totalRows: number): number {
    let capacity = 0;
    
    // Sum up tiers for each configured row
    rowTierConfig.forEach(config => {
      if (config.row <= totalRows) {
        capacity += config.maxTiers;
      }
    });
    
    return capacity;
  }

  /**
   * Get max tiers for a specific row based on row-tier config
   */
  getMaxTiersForRow(stack: YardStack, row: number): number {
    if (!stack.rowTierConfig || stack.rowTierConfig.length === 0) {
      return stack.maxTiers; // Use uniform tier height
    }
    
    const rowConfig = stack.rowTierConfig.find(config => config.row === row);
    return rowConfig ? rowConfig.maxTiers : stack.maxTiers;
  }

  private mapToStack(data: any): YardStack {
    // Parse row_tier_config if it exists
    let rowTierConfig: any[] | undefined;
    if (data.row_tier_config) {
      try {
        rowTierConfig = typeof data.row_tier_config === 'string' 
          ? JSON.parse(data.row_tier_config)
          : data.row_tier_config;
      } catch (error) {
        handleError(error, 'StackService.mapToStack.parseRowTierConfig');
        rowTierConfig = undefined;
      }
    }
    
    return {
      id: data.id,
      yardId: data.yard_id,
      stackNumber: data.stack_number,
      sectionId: data.section_id,
      sectionName: data.section_name,
      rows: data.rows,
      maxTiers: data.max_tiers,
      rowTierConfig: rowTierConfig,
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
      isVirtual: data.is_virtual || false, // Add virtual flag
      isActive: data.is_active,
      containerSize: data.container_size || '20ft',
      assignedClientCode: data.assigned_client_code,
      notes: data.notes,
      createdAt: toDate(data.created_at) || undefined,
      updatedAt: toDate(data.updated_at) || undefined,
      createdBy: data.created_by,
      updatedBy: data.updated_by
    };
  }
}

export const stackService = new StackService();
