import { supabase } from './supabaseClient';
import { YardStack } from '../../types/yard';
import { toDate } from '../../utils/dateHelpers';
import { locationIdGeneratorService } from './locationIdGeneratorService';
import { virtualLocationCalculatorService } from './virtualLocationCalculatorService';
import { locationManagementService } from './locationManagementService';
import { automaticVirtualStackService } from './automaticVirtualStackService';
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

    // Always sync occupancy for accurate stats unless explicitly skipped
    if (skipOccupancySync) {
      return stacks;
    }

    try {
      const updatedStacks = await Promise.all(
        stacks.map(async (stack) => {
          let actualOccupancy = 0;
          
          try {
            // Try location-based occupancy first (most accurate)
            actualOccupancy = await this.getAccurateOccupancy(stack.id);
          } catch (locationError) {
            // Fallback to container-based counting with improved pattern matching
            try {
              const stackPattern = `S${String(stack.stackNumber).padStart(2, '0')}%`;
              const { data: containers, error } = await supabase
                .from('containers')
                .select('id, location, yard_id, status, size')
                .eq('yard_id', yardId)
                .in('status', ['in_depot', 'gate_in'])
                .ilike('location', stackPattern);

              if (error) {
                handleError(error, 'StackService.getByYardId.containerCount');
                actualOccupancy = stack.currentOccupancy; // Keep existing value
              } else {
                actualOccupancy = containers?.length || 0;
              }
            } catch (containerError) {
              handleError(containerError, 'StackService.getByYardId.fallback');
              actualOccupancy = stack.currentOccupancy; // Keep existing value
            }
          }
          
          // Update occupancy if it has changed
          if (actualOccupancy !== stack.currentOccupancy) {
            try {
              await this.updateOccupancy(stack.id, actualOccupancy);
              stack.currentOccupancy = actualOccupancy;
            } catch (updateError) {
              handleError(updateError, 'StackService.getByYardId.updateOccupancy');
              // Continue with old occupancy value
            }
          }
          
          return stack;
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
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToStack(data) : null;
  }

  async create(stack: Partial<YardStack>, userId: string): Promise<YardStack> {
    console.log('🔍 StackService.create called with:', {
      stackData: stack,
      userId,
      timestamp: new Date().toISOString()
    });

    // Check if a soft-deleted stack with the same yard_id and stack_number exists
    if (stack.yardId && stack.stackNumber) {
      const { data: existingStack, error: checkError } = await supabase
        .from('stacks')
        .select('id, is_active, stack_number')
        .eq('yard_id', stack.yardId)
        .eq('stack_number', stack.stackNumber)
        .maybeSingle();

      if (checkError) {
        console.error('🚨 Error checking for existing stack:', checkError);
        // Continue with creation - let the database handle constraints
      } else if (existingStack) {
        if (existingStack.is_active) {
          throw new Error(`Stack S${String(stack.stackNumber).padStart(2, '0')} already exists and is active in this yard.`);
        } else {
          // Reactivate the soft-deleted stack
          console.log(`🔄 Reactivating soft-deleted stack S${String(stack.stackNumber).padStart(2, '0')}`);
          return await this.reactivateSoftDeletedStack(existingStack.id, stack, userId);
        }
      }
    }

    // Validate section_id if provided - only use it if it's not empty
    let sectionId = stack.sectionId && stack.sectionId.trim() !== '' ? stack.sectionId : null;
    
    // If no section provided, try to auto-assign based on stack number
    if (!sectionId && stack.stackNumber && stack.yardId) {
      const { yardsService } = await import('./yardsService');
      sectionId = yardsService.getSectionIdForStackNumber(stack.yardId, stack.stackNumber);
    }

    // Determine section name - use provided name or fallback to mapping
    let sectionName = stack.sectionName || 'Zone A';
    if (!stack.sectionName && sectionId) {
      // Only use mapping if no section name was provided
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

    console.log('🔍 Section processing:', {
      providedSectionName: stack.sectionName,
      sectionId,
      finalSectionName: sectionName
    });

    // Calculate capacity and max_tiers based on row-tier config or uniform tiers
    let capacity: number;
    let maxTiers: number;
    
    if (stack.rowTierConfig && stack.rowTierConfig.length > 0) {
      // Calculate from row-tier config
      capacity = this.calculateCapacityFromRowTierConfig(stack.rowTierConfig, stack.rows || 6);
      // Set max_tiers to the highest tier value in the config
      maxTiers = Math.max(...stack.rowTierConfig.map(config => config.maxTiers));
    } else {
      // Use uniform tier calculation
      capacity = stack.capacity || (stack.rows || 6) * (stack.maxTiers || 4);
      maxTiers = stack.maxTiers || 4;
    }

    console.log('🔍 Capacity and max_tiers calculation:', {
      hasRowTierConfig: !!(stack.rowTierConfig && stack.rowTierConfig.length > 0),
      rowTierConfig: stack.rowTierConfig,
      calculatedCapacity: capacity,
      calculatedMaxTiers: maxTiers,
      providedCapacity: stack.capacity,
      providedMaxTiers: stack.maxTiers
    });

    // Prepare base insert data with proper typing
    const baseInsertData: Record<string, any> = {
      yard_id: stack.yardId || '',
      stack_number: stack.stackNumber,
      section_id: sectionId,
      section_name: sectionName,
      rows: stack.rows || 6,
      max_tiers: maxTiers,
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
    };

    // Try to add buffer zone fields if they exist in the database
    let insertData: Record<string, any> = { ...baseInsertData };
    try {
      // Check if buffer zone columns exist by trying a simple query
      const { error: checkError } = await supabase
        .from('stacks')
        .select('is_buffer_zone, buffer_zone_type, damage_types_supported')
        .limit(1);

      if (!checkError) {
        // Columns exist, add buffer zone fields
        insertData.is_buffer_zone = false;
        insertData.buffer_zone_type = null;
        insertData.damage_types_supported = JSON.stringify([]);
        console.log('🔍 Buffer zone columns detected, including in insert');
      } else {
        console.log('🔍 Buffer zone columns not found, using base insert data');
      }
    } catch (columnCheckError) {
      console.log('🔍 Column check failed, using base insert data:', columnCheckError);
    }

    console.log('🔍 Final insert data:', insertData);

    const { data, error } = await supabase
      .from('stacks')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('🚨 Database insert error:', {
        error,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        insertData,
        timestamp: new Date().toISOString()
      });
      
      // Check if it's the specific scalar extraction error
      if (error.message && error.message.includes('cannot extract elements from a scalar')) {
        console.error('🚨 SCALAR EXTRACTION ERROR DETECTED');
        console.error('🚨 This is likely a JSONB field issue');
        console.error('🚨 Insert data that caused the error:', JSON.stringify(insertData, null, 2));
        
        // Try to identify which field is causing the issue
        const jsonbFields = ['row_tier_config', 'damage_types_supported'];
        for (const field of jsonbFields) {
          if (insertData[field as keyof typeof insertData]) {
            console.error(`🚨 JSONB field ${field}:`, insertData[field as keyof typeof insertData]);
          }
        }
      }
      
      throw error;
    }
    
    const createdStack = this.mapToStack(data);

    // Automatically generate location records for the new stack
    // Requirements: 2.3 - Stack operations trigger location record creation
    try {
      const containerSize = createdStack.containerSize === '40ft' ? '40ft' : '20ft';
      await locationIdGeneratorService.generateLocationsForStack({
        yardId: createdStack.yardId || '',
        stackId: createdStack.id,
        stackNumber: createdStack.stackNumber,
        rows: createdStack.rows,
        tiers: createdStack.maxTiers,
        containerSize,
        clientPoolId: undefined,
        isVirtual: false,
        rowTierConfig: createdStack.rowTierConfig
      });
    } catch (locationError) {
      handleError(locationError, 'StackService.create.generateLocations');
      // Don't fail the stack creation if location generation fails
      // This allows for graceful degradation
    }

    return createdStack;
  }

  /**
   * Reactivate a soft-deleted stack with updated configuration
   */
  private async reactivateSoftDeletedStack(stackId: string, newConfig: Partial<YardStack>, userId: string): Promise<YardStack> {
    // Calculate capacity and max_tiers based on row-tier config or uniform tiers
    let capacity: number;
    let maxTiers: number;
    
    if (newConfig.rowTierConfig && newConfig.rowTierConfig.length > 0) {
      // Calculate from row-tier config
      capacity = this.calculateCapacityFromRowTierConfig(newConfig.rowTierConfig, newConfig.rows || 6);
      // Set max_tiers to the highest tier value in the config
      maxTiers = Math.max(...newConfig.rowTierConfig.map(config => config.maxTiers));
    } else {
      // Use uniform tier calculation
      capacity = newConfig.capacity || (newConfig.rows || 6) * (newConfig.maxTiers || 4);
      maxTiers = newConfig.maxTiers || 4;
    }

    // Prepare update data to reactivate and update the stack
    const updateData: Record<string, any> = {
      is_active: true,
      section_id: newConfig.sectionId,
      section_name: newConfig.sectionName || 'Zone A',
      rows: newConfig.rows || 6,
      max_tiers: maxTiers,
      row_tier_config: newConfig.rowTierConfig ? JSON.stringify(newConfig.rowTierConfig) : null,
      capacity: capacity,
      current_occupancy: newConfig.currentOccupancy || 0,
      position_x: newConfig.position?.x || 0,
      position_y: newConfig.position?.y || 0,
      position_z: newConfig.position?.z || 0,
      width: newConfig.dimensions?.width || 2.5,
      length: newConfig.dimensions?.length || 12,
      is_odd_stack: newConfig.isOddStack || false,
      is_special_stack: newConfig.isSpecialStack || false,
      container_size: newConfig.containerSize || '20ft',
      assigned_client_code: newConfig.assignedClientCode,
      notes: newConfig.notes,
      updated_at: new Date().toISOString(),
      updated_by: userId
    };

    // Try to add buffer zone fields if they exist in the database
    try {
      // Check if buffer zone columns exist by trying a simple query
      const { error: checkError } = await supabase
        .from('stacks')
        .select('is_buffer_zone, buffer_zone_type, damage_types_supported')
        .limit(1);

      if (!checkError) {
        // Columns exist, add buffer zone fields
        updateData.is_buffer_zone = false;
        updateData.buffer_zone_type = null;
        updateData.damage_types_supported = JSON.stringify([]);
        console.log('🔍 Buffer zone columns detected, including in reactivation');
      }
    } catch (columnCheckError) {
      console.log('🔍 Column check failed during reactivation, using base update data:', columnCheckError);
    }

    console.log('🔄 Reactivating stack with data:', updateData);

    const { data, error } = await supabase
      .from('stacks')
      .update(updateData)
      .eq('id', stackId)
      .select()
      .single();

    if (error) {
      console.error('🚨 Database reactivation error:', {
        error,
        errorMessage: error.message,
        errorCode: error.code,
        stackId,
        updateData,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
    
    const reactivatedStack = this.mapToStack(data);

    // Automatically generate location records for the reactivated stack
    // The soft delete trigger should have reactivated existing locations,
    // but we may need to generate additional ones if configuration changed
    try {
      const containerSize = reactivatedStack.containerSize === '40ft' ? '40ft' : '20ft';
      await locationIdGeneratorService.generateLocationsForStack({
        yardId: reactivatedStack.yardId || '',
        stackId: reactivatedStack.id,
        stackNumber: reactivatedStack.stackNumber,
        rows: reactivatedStack.rows,
        tiers: reactivatedStack.maxTiers,
        containerSize,
        clientPoolId: undefined,
        isVirtual: false,
        rowTierConfig: reactivatedStack.rowTierConfig
      });
    } catch (locationError) {
      handleError(locationError, 'StackService.reactivateSoftDeletedStack.generateLocations');
      // Don't fail the stack reactivation if location generation fails
    }

    console.log(`✅ Successfully reactivated stack S${String(reactivatedStack.stackNumber).padStart(2, '0')}`);
    return reactivatedStack;
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
    // Handle buffer zone fields
    if (updates.isBufferZone !== undefined) updateData.is_buffer_zone = updates.isBufferZone;
    if (updates.bufferZoneType !== undefined) updateData.buffer_zone_type = updates.bufferZoneType;
    if (updates.damageTypesSupported !== undefined) {
      updateData.damage_types_supported = updates.damageTypesSupported ? JSON.stringify(updates.damageTypesSupported) : JSON.stringify([]);
    }

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
    const containerSizeChanged = updates.containerSize !== undefined && updates.containerSize !== currentStack.containerSize;

    if (rowsChanged || tiersChanged) {
      try {
        await locationIdGeneratorService.updateLocationsForStackConfiguration(
          updatedStack.id,
          updatedStack.yardId || '',
          updatedStack.stackNumber,
          updatedStack.rows,
          updatedStack.maxTiers,
          updatedStack.rowTierConfig
        );
        
        // Sync occupancy with updated locations
        await this.syncOccupancyWithLocations(updatedStack.id);
      } catch (locationError) {
        handleError(locationError, 'StackService.update.updateLocations');
        // Don't fail the stack update if location update fails
      }
    }

    // Handle automatic virtual stack management when container_size changes
    // Requirements: Automatic virtual stack creation/deactivation based on 40ft configuration
    if (containerSizeChanged) {
      try {
        await this.handleVirtualStackManagement(updatedStack);
      } catch (virtualStackError) {
        handleError(virtualStackError, 'StackService.update.handleVirtualStackManagement');
        // Don't fail the stack update if virtual stack management fails
        logger.warn('StackService', `Virtual stack management failed for stack ${updatedStack.stackNumber}`, virtualStackError);
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
          .in('status', ['in_depot', 'gate_in'])
          .ilike('location', `S${String(stack.stackNumber).padStart(2, '0')}%`);

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
          stack.yardId || '',
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

    // Store the original container size before update
    const originalContainerSize = currentStack.containerSize;

    // Check for existing 40ft containers on this stack
    const { data: containersOnStack, error: containerCheckError } = await supabase
      .from('containers')
      .select('id, number, size, location')
      .eq('yard_id', yardId)
      .in('status', ['in_depot', 'gate_in'])
      .ilike('location', `S${String(stackNumber).padStart(2, '0')}%`);

    if (containerCheckError) throw containerCheckError;

    // Check if trying to change FROM 40ft to 20ft while containers exist
    if (originalContainerSize === '40ft' && newSize === '20ft' && containersOnStack && containersOnStack.length > 0) {
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

    // Determine paired stack - use pairing table data or fallback to adjacent logic
    let pairedStackNumber: number | null = null;
    
    if (pairingData) {
      // Use pairing table data
      pairedStackNumber = pairingData.first_stack_number === stackNumber
        ? pairingData.second_stack_number
        : pairingData.first_stack_number;
    } else {
      // Always try to find adjacent stack for potential pairing
      pairedStackNumber = this.getAdjacentStackNumber(stackNumber);
      console.log(`🔍 [Stack ${stackNumber}] Adjacent stack for pairing: ${pairedStackNumber}`);
    }

    // Handle paired stack synchronization - BIDIRECTIONAL
    if (pairedStackNumber) {
      const pairedStack = await this.getByStackNumber(yardId, pairedStackNumber);
      
      if (pairedStack && !pairedStack.isSpecialStack) {
        console.log(`🔍 [Stack ${stackNumber}] Found paired stack ${pairedStackNumber}. Synchronizing container sizes.`);
        
        // ALWAYS synchronize paired stacks - both must have the same container size
        // This works bidirectionally: S07→20ft changes S09→20ft, and S09→20ft changes S07→20ft
        if (pairedStack.containerSize !== newSize) {
          console.log(`🔍 [Stack ${stackNumber}] Updating paired stack ${pairedStackNumber} from ${pairedStack.containerSize} to ${newSize}`);
          
          const { data: pairedData, error: pairedError } = await supabase
            .from('stacks')
            .update({
              container_size: newSize,
              updated_at: new Date().toISOString(),
              updated_by: userId
            })
            .eq('yard_id', yardId)
            .eq('stack_number', pairedStackNumber)
            .select()
            .maybeSingle();

          if (pairedError) {
            console.error(`🚨 [Stack ${stackNumber}] Error updating paired stack ${pairedStackNumber}:`, pairedError);
            throw new Error(`Failed to update paired stack S${String(pairedStackNumber).padStart(2, '0')} to ${newSize}: ${pairedError.message}`);
          } else if (pairedData) {
            console.log(`✅ [Stack ${stackNumber}] Successfully updated paired stack ${pairedStackNumber} to ${newSize}`);
            updatedStacks.push(this.mapToStack(pairedData));
          }
        } else {
          console.log(`🔍 [Stack ${stackNumber}] Paired stack ${pairedStackNumber} already has container size ${newSize}`);
          // Even if sizes match, add the paired stack to updatedStacks for consistency
          updatedStacks.push(pairedStack);
        }

        // Handle pairing and virtual stack creation/deletion based on new size
        if (newSize === '40ft') {
          // Both stacks are now 40ft - create pairing if it doesn't exist
          if (!pairingData) {
            try {
              const virtualStackNumber = this.getVirtualStackNumber(stackNumber, pairedStackNumber);
              
              console.log(`🔍 [Stack ${stackNumber}] Creating pairing with virtual stack ${virtualStackNumber}`);
              
              const { data: newPairingData, error: pairingCreateError } = await supabase
                .from('stack_pairings')
                .insert({
                  yard_id: yardId,
                  first_stack_number: Math.min(stackNumber, pairedStackNumber),
                  second_stack_number: Math.max(stackNumber, pairedStackNumber),
                  first_stack_id: stackNumber < pairedStackNumber ? stackId : pairedStack.id,
                  second_stack_id: stackNumber < pairedStackNumber ? pairedStack.id : stackId,
                  virtual_stack_number: virtualStackNumber,
                  is_active: true
                })
                .select()
                .single();

              if (pairingCreateError) {
                console.error(`🚨 [Stack ${stackNumber}] Error creating pairing:`, pairingCreateError);
              } else if (newPairingData) {
                console.log(`✅ [Stack ${stackNumber}] Successfully created pairing with virtual stack ${virtualStackNumber}`, {
                  pairingId: newPairingData.id,
                  firstStack: newPairingData.first_stack_number,
                  secondStack: newPairingData.second_stack_number,
                  virtualStack: newPairingData.virtual_stack_number
                });
                
                // Create virtual stack in stacks table
                try {
                  const virtualStackData = {
                    yard_id: yardId,
                    stack_number: virtualStackNumber,
                    section_id: currentStack.sectionId,
                    section_name: currentStack.sectionName,
                    rows: currentStack.rows,
                    max_tiers: currentStack.maxTiers,
                    capacity: currentStack.rows * currentStack.maxTiers,
                    current_occupancy: 0,
                    position_x: (currentStack.position.x + pairedStack.position.x) / 2,
                    position_y: (currentStack.position.y + pairedStack.position.y) / 2,
                    position_z: currentStack.position.z,
                    width: currentStack.dimensions.width,
                    length: currentStack.dimensions.length,
                    is_active: true,
                    is_virtual: true,
                    container_size: '40ft',
                    created_by: userId
                  };

                  const { data: virtualStack, error: virtualStackError } = await supabase
                    .from('stacks')
                    .insert(virtualStackData)
                    .select()
                    .single();

                  if (virtualStackError) {
                    console.error(`🚨 [Stack ${stackNumber}] Error creating virtual stack:`, virtualStackError);
                  } else if (virtualStack) {
                    console.log(`✅ [Stack ${stackNumber}] Successfully created virtual stack ${virtualStackNumber} with ID: ${virtualStack.id}`);
                    
                    // Generate location records for the new virtual stack
                    try {
                      await locationIdGeneratorService.generateLocationsForStack({
                        yardId: yardId,
                        stackId: virtualStack.id,
                        stackNumber: virtualStackNumber,
                        rows: virtualStack.rows,
                        tiers: virtualStack.max_tiers,
                        containerSize: '40ft',
                        clientPoolId: undefined,
                        isVirtual: true,
                        rowTierConfig: virtualStack.row_tier_config ? JSON.parse(virtualStack.row_tier_config) : undefined
                      });
                      console.log(`✅ [Stack ${stackNumber}] Generated locations for virtual stack ${virtualStackNumber}`);
                    } catch (locationError) {
                      console.error(`🚨 [Stack ${stackNumber}] Error generating locations for virtual stack:`, locationError);
                    }
                  }
                } catch (virtualError) {
                  console.error(`🚨 [Stack ${stackNumber}] Error creating virtual stack:`, virtualError);
                }
              }
            } catch (error) {
              console.error(`🚨 [Stack ${stackNumber}] Error in pairing creation:`, error);
            }
          } else {
            console.log(`🔍 [Stack ${stackNumber}] Pairing already exists for 40ft stacks`);
          }
        } else if (newSize === '20ft') {
          // Stack is now 20ft - cleanup pairing and virtual stack regardless of pairing data
          console.log(`🔍 [Stack ${stackNumber}] Stack is now 20ft. Cleaning up any existing pairing and virtual stack.`);
          
          try {
            // Find virtual stack number for this pairing
            const virtualStackNumber = this.getVirtualStackNumber(stackNumber, pairedStackNumber);
            
            // Clean up virtual stack pairs (both from stack_pairings and virtual_stack_pairs tables)
            if (pairingData) {
              const virtualPair = await virtualLocationCalculatorService.getVirtualStackPairByStacks(
                yardId,
                pairingData.first_stack_id,
                pairingData.second_stack_id
              );
              
              if (virtualPair) {
                await virtualLocationCalculatorService.cleanupVirtualLocations(virtualPair.id);
              }
              
              // Deactivate the pairing in stack_pairings table
              await supabase
                .from('stack_pairings')
                .update({ is_active: false })
                .eq('id', pairingData.id);
            }
            
            // Also clean up virtual_stack_pairs table
            await supabase
              .from('virtual_stack_pairs')
              .update({ 
                is_active: false,
                updated_at: new Date().toISOString() 
              })
              .eq('yard_id', yardId)
              .eq('virtual_stack_number', virtualStackNumber);
            
            // Deactivate the virtual stack (don't delete, just deactivate)
            const { data: virtualStackData, error: virtualStackUpdateError } = await supabase
              .from('stacks')
              .update({ 
                is_active: false,
                updated_at: new Date().toISOString() 
              })
              .eq('yard_id', yardId)
              .eq('stack_number', virtualStackNumber)
              .eq('is_virtual', true)
              .select();
              
            if (virtualStackUpdateError) {
              console.error(`🚨 [Stack ${stackNumber}] Error deactivating virtual stack:`, virtualStackUpdateError);
            } else if (virtualStackData && virtualStackData.length > 0) {
              console.log(`✅ [Stack ${stackNumber}] Successfully deactivated virtual stack ${virtualStackNumber}`);
              
              // Also deactivate virtual locations
              await supabase
                .from('locations')
                .update({ 
                  is_active: false,
                  updated_at: new Date().toISOString() 
                })
                .eq('stack_id', virtualStackData[0].id)
                .eq('is_virtual', true);
            }
            
            console.log(`✅ [Stack ${stackNumber}] Successfully cleaned up pairing and virtual stack ${virtualStackNumber}`);
          } catch (cleanupError) {
            console.error(`🚨 [Stack ${stackNumber}] Error cleaning up pairing:`, cleanupError);
          }
        }
      } else if (!pairedStack) {
        console.log(`🔍 [Stack ${stackNumber}] Paired stack ${pairedStackNumber} does not exist. No pairing created.`);
      } else if (pairedStack.isSpecialStack) {
        console.log(`🔍 [Stack ${stackNumber}] Paired stack ${pairedStackNumber} is a special stack. No pairing created.`);
      }
    } else {
      console.log(`🔍 [Stack ${stackNumber}] No adjacent stack found for pairing.`);
    }

    // Call the automatic virtual stack service to handle location generation
    // This complements the SQL triggers by generating locations for newly created virtual stacks
    try {
      for (const updatedStack of updatedStacks) {
        if (updatedStack.stackNumber % 2 === 1) { // Only process odd stacks
          await this.handleVirtualStackManagement(updatedStack);
        }
      }
    } catch (automaticError) {
      logger.error('StackService', 'Error in automatic virtual stack management', automaticError);
      // Don't fail the stack update if automatic management fails
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

  /**
   * Get detailed container statistics for a stack
   */
  async getContainerStats(_stackId: string, yardId: string, stackNumber: number): Promise<{
    size20ft: number;
    size40ft: number;
    damaged: number;
    maintenance: number;
    cleaning: number;
    full: number;
    empty: number;
  }> {
    try {
      const stackPattern = `S${String(stackNumber).padStart(2, '0')}%`;
      const { data: containers, error } = await supabase
        .from('containers')
        .select('id, size, status, damage, full_empty')
        .eq('yard_id', yardId)
        .in('status', ['in_depot', 'gate_in'])
        .ilike('location', stackPattern);

      if (error) {
        handleError(error, 'StackService.getContainerStats');
        return {
          size20ft: 0,
          size40ft: 0,
          damaged: 0,
          maintenance: 0,
          cleaning: 0,
          full: 0,
          empty: 0
        };
      }

      const stats = {
        size20ft: 0,
        size40ft: 0,
        damaged: 0,
        maintenance: 0,
        cleaning: 0,
        full: 0,
        empty: 0
      };

      containers?.forEach(container => {
        // Count by size
        if (container.size === '20ft') stats.size20ft++;
        else if (container.size === '40ft') stats.size40ft++;

        // Count by condition
        if (container.damage && container.damage.length > 0) {
          stats.damaged++;
        }
        
        // Count by status
        if (container.status === 'maintenance') stats.maintenance++;
        else if (container.status === 'cleaning') stats.cleaning++;
        
        // Count by full_empty field (not status)
        if ((container as any).full_empty === 'FULL') stats.full++;
        else if ((container as any).full_empty === 'EMPTY') stats.empty++;
      });

      return stats;
    } catch (error) {
      handleError(error, 'StackService.getContainerStats');
      return {
        size20ft: 0,
        size40ft: 0,
        damaged: 0,
        maintenance: 0,
        cleaning: 0,
        full: 0,
        empty: 0
      };
    }
  }

  /**
   * Get all stacks with container stats for a yard
   */
  async getByYardIdWithStats(yardId: string, skipOccupancySync: boolean = false): Promise<YardStack[]> {
    const stacks = await this.getByYardId(yardId, skipOccupancySync);
    
    // Add container stats to each stack
    const stacksWithStats = await Promise.all(
      stacks.map(async (stack) => {
        try {
          const containerStats = await this.getContainerStats(stack.id, stack.yardId || yardId, stack.stackNumber);
          return {
            ...stack,
            containerStats
          };
        } catch (error) {
          handleError(error, 'StackService.getByYardIdWithStats');
          return stack;
        }
      })
    );

    return stacksWithStats;
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

    // Parse damage_types_supported if it exists
    let damageTypesSupported: string[] | undefined;
    if (data.damage_types_supported) {
      try {
        damageTypesSupported = typeof data.damage_types_supported === 'string' 
          ? JSON.parse(data.damage_types_supported)
          : Array.isArray(data.damage_types_supported) 
            ? data.damage_types_supported
            : [];
      } catch (error) {
        handleError(error, 'StackService.mapToStack.parseDamageTypesSupported');
        damageTypesSupported = [];
      }
    }
    
    // Fix capacity for virtual stacks if it's 0 or invalid
    let finalCapacity = data.capacity;
    if (data.is_virtual && (!finalCapacity || finalCapacity <= 0)) {
      // Calculate proper capacity for virtual stack
      if (rowTierConfig && rowTierConfig.length > 0) {
        finalCapacity = rowTierConfig.reduce((sum, config) => sum + config.maxTiers, 0);
      } else {
        finalCapacity = data.rows * data.max_tiers;
      }
      console.log(`✅ Fixed virtual stack S${String(data.stack_number).padStart(2, '0')} capacity: ${data.capacity} → ${finalCapacity}`);
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
      capacity: finalCapacity, // Use corrected capacity
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
      // Add buffer zone fields
      isBufferZone: data.is_buffer_zone || false,
      bufferZoneType: data.buffer_zone_type,
      damageTypesSupported: damageTypesSupported,
      createdAt: toDate(data.created_at) || undefined,
      updatedAt: toDate(data.updated_at) || undefined,
      createdBy: data.created_by,
      updatedBy: data.updated_by
    };
  }
  /**
   * Handle automatic virtual stack management when container_size changes
   * This method manages virtual stacks based on the 40ft configuration of adjacent odd stacks
   */
  private async handleVirtualStackManagement(stack: YardStack): Promise<void> {
    try {
      const stackNumber = stack.stackNumber;
      const yardId = stack.yardId || '';

      // Only process odd-numbered stacks and avoid duplicate processing
      if (stackNumber % 2 === 1) {
        // Use the same logic as getAdjacentStackNumber to find the correct pair
        const pairedStackNumber = this.getAdjacentStackNumber(stackNumber);
        
        if (pairedStackNumber) {
          // Only process if this is the lower number in the pair to avoid duplicates
          // This ensures we only process each pair once (e.g., only when processing S03, not S05)
          if (stackNumber < pairedStackNumber) {
            // Check if the primary system already handled this pairing
            // by looking for existing virtual stack or pairing
            const virtualStackNumber = this.getVirtualStackNumber(stackNumber, pairedStackNumber);
            
            // Check if virtual stack already exists
            const existingVirtualStack = await this.getByStackNumber(yardId, virtualStackNumber);
            
            if (existingVirtualStack) {
              logger.debug('StackService', 
                `Virtual stack S${String(virtualStackNumber).padStart(2, '0')} already exists, skipping automatic management`);
              return; // Skip if already handled by primary system
            }

            logger.info('StackService', 
              `Checking virtual stack management for pairing S${String(stackNumber).padStart(2, '0')} + S${String(pairedStackNumber).padStart(2, '0')}`);

            try {
              const result = await automaticVirtualStackService.manageVirtualStackForPairing(
                yardId,
                stackNumber,
                pairedStackNumber
              );

              if (result.success) {
                logger.info('StackService', 
                  `Virtual stack management result: ${result.action} - ${result.message}`);
              }
            } catch (pairingError) {
              // Handle conflicts gracefully - this is expected when primary system already handled it
              if (pairingError instanceof Error) {
                const errorMessage = pairingError.message.toLowerCase();
                if (errorMessage.includes('unique constraint') || 
                    errorMessage.includes('duplicate key') ||
                    errorMessage.includes('already exists') ||
                    errorMessage.includes('conflict') ||
                    errorMessage.includes('violates row-level security') ||
                    errorMessage.includes('permission denied') ||
                    errorMessage.includes('42501')) {
                  logger.debug('StackService', 
                    `Virtual stack management conflict (expected): ${pairingError.message}`);
                  // This is expected and not an error - primary system already handled it
                } else {
                  logger.error('StackService', 'Unexpected error in virtual stack management', pairingError);
                  // Don't throw - allow stack updates to continue
                }
              } else {
                logger.error('StackService', 'Unknown error in virtual stack management', pairingError);
              }
            }
          } else {
            logger.debug('StackService', 
              `Skipping virtual stack management for S${String(stackNumber).padStart(2, '0')} as it will be handled by its pair S${String(pairedStackNumber).padStart(2, '0')}`);
          }
        } else {
          logger.debug('StackService', 
            `No valid pairing found for stack S${String(stackNumber).padStart(2, '0')}`);
        }
      }

    } catch (error) {
      logger.error('StackService', 'Error in handleVirtualStackManagement', error);
      // Don't throw the error - allow stack updates to continue even if virtual stack management fails
      logger.warn('StackService', 'Virtual stack management failed but stack update will continue');
    }
  }
}

export const stackService = new StackService();
