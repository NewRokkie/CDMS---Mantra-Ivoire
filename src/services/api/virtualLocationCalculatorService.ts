/**
 * Virtual Location Calculator Service
 * 
 * Implements virtual location calculations for 40ft container stacks.
 * Creates bidirectional mapping between virtual and physical locations.
 * 
 * Requirements Addressed:
 * - 3.1: Virtual stack number calculation using MIN(stack1, stack2) + 1 formula
 * - 3.2: Virtual location ID generation following SXXRXHX format
 * - 3.4: Methods for creating and managing virtual location records
 */

import { supabase } from './supabaseClient';
import { ErrorHandler, GateInError } from '../errorHandling';
import { Location, VirtualStackPair } from '../../types/location';
import { locationIdGeneratorService } from './locationIdGeneratorService';
import { logger } from '../../utils/logger';

export interface VirtualLocationRequest {
  yardId: string;
  stack1Id: string;
  stack2Id: string;
  stack1Number: number;
  stack2Number: number;
  rows: number;
  tiers: number;
  clientPoolId?: string;
}

export interface VirtualLocationUpdateRequest {
  virtualStackPairId: string;
  rows?: number;
  tiers?: number;
}

export class VirtualLocationCalculatorService {
  /**
   * Calculate virtual stack number using MIN(stack1, stack2) + 1 formula
   * Requirements: 3.1 - Virtual stack number calculation
   * 
   * @param stack1Number - First stack number
   * @param stack2Number - Second stack number
   * @returns Virtual stack number
   */
  calculateVirtualStackNumber(stack1Number: number, stack2Number: number): number {
    if (stack1Number === stack2Number) {
      throw new GateInError({
        code: 'IDENTICAL_STACK_NUMBERS',
        message: 'Cannot create virtual stack from identical stack numbers',
        severity: 'error',
        retryable: false,
        userMessage: 'Stack numbers must be different for virtual stack pairing'
      });
    }

    // Formula: MIN(stack1, stack2) + 1
    const minStack = Math.min(stack1Number, stack2Number);
    const virtualStackNumber = minStack + 1;

    return virtualStackNumber;
  }

  /**
   * Generate virtual location ID in SXXRXHX format
   * Requirements: 3.2 - Virtual location ID generation following SXXRXHX format
   * 
   * @param virtualStackNumber - Virtual stack number
   * @param row - Row number
   * @param tier - Tier number
   * @returns Virtual location ID
   */
  generateVirtualLocationId(virtualStackNumber: number, row: number, tier: number): string {
    // Use the same format as physical locations
    return locationIdGeneratorService.generateLocationId(virtualStackNumber, row, tier);
  }

  /**
   * Create or get virtual stack pair record
   * Requirements: 3.4 - Methods for creating and managing virtual location records
   * 
   * Note: This method normalizes stack IDs by sorting them to ensure consistent
   * ordering and prevent duplicate pairs caused by different stack ID orderings
   * (e.g., stack1=A,stack2=B vs stack1=B,stack2=A representing the same logical pair)
   * 
   * @param request - Virtual location request
   * @returns Virtual stack pair record
   */
  async createOrGetVirtualStackPair(request: VirtualLocationRequest): Promise<VirtualStackPair> {
    try {
      const virtualStackNumber = this.calculateVirtualStackNumber(
        request.stack1Number,
        request.stack2Number
      );

      // Normalize stack IDs to ensure consistent ordering
      const [normalizedStack1Id, normalizedStack2Id] = [request.stack1Id, request.stack2Id].sort();

      logger.info('Debug', 'VirtualLocationCalculatorService', 
        `🔍 Checking for existing pair: yard=${request.yardId}, original=(${request.stack1Id}, ${request.stack2Id}), normalized=(${normalizedStack1Id}, ${normalizedStack2Id})`);

      // Use upsert approach to handle race conditions
      // First, try to find existing pair with both possible orderings
      const existingPair = await this.findExistingVirtualStackPair(
        request.yardId, 
        normalizedStack1Id, 
        normalizedStack2Id
      );

      if (existingPair) {
        logger.info('Debug', 'VirtualLocationCalculatorService', 
          `✅ Found existing pair: ${existingPair.id}`);
        return existingPair;
      }

      // Use PostgreSQL's upsert to handle concurrent inserts
      logger.info('Debug', 'VirtualLocationCalculatorService', 
        `➕ Creating new pair with upsert: yard=${request.yardId}, stack1=${normalizedStack1Id}, stack2=${normalizedStack2Id}, virtualNum=${virtualStackNumber}`);

      try {
        // Use raw SQL with ON CONFLICT to handle race conditions
        const { data: newPair, error: createError } = await supabase.rpc('upsert_virtual_stack_pair', {
          p_yard_id: request.yardId,
          p_stack1_id: normalizedStack1Id,
          p_stack2_id: normalizedStack2Id,
          p_virtual_stack_number: virtualStackNumber
        });

        if (createError) {
          logger.error('Error', 'VirtualLocationCalculatorService', 
            `❌ Failed to upsert pair: ${createError.message}`);
          throw createError;
        }

        if (!newPair || newPair.length === 0) {
          throw new Error('Upsert returned no data');
        }

        return this.mapToVirtualStackPair(newPair[0]);
      } catch (error) {
        // Fallback: if upsert function doesn't exist, try regular insert with error handling
        logger.info('Debug', 'VirtualLocationCalculatorService', 
          `⚠️ Upsert function not available, falling back to insert with error handling`);
        
        const { data: newPair, error: createError } = await supabase
          .from('virtual_stack_pairs')
          .insert({
            yard_id: request.yardId,
            stack1_id: normalizedStack1Id,
            stack2_id: normalizedStack2Id,
            virtual_stack_number: virtualStackNumber,
            is_active: true
          })
          .select()
          .single();

        if (createError) {
          // If it's a duplicate key error, try to find the existing pair
          if (createError.code === '23505' || createError.message.includes('unique constraint')) {
            logger.info('Debug', 'VirtualLocationCalculatorService', 
              `🔄 Duplicate detected, searching for existing pair`);
            
            // Add a small delay to ensure the conflicting record is committed
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const existingAfterError = await this.findExistingVirtualStackPair(
              request.yardId, 
              normalizedStack1Id, 
              normalizedStack2Id
            );
            
            if (existingAfterError) {
              logger.info('Debug', 'VirtualLocationCalculatorService', 
                `✅ Found existing pair after conflict: ${existingAfterError.id}`);
              return existingAfterError;
            }
          }
          
          logger.error('Error', 'VirtualLocationCalculatorService', 
            `❌ Failed to create pair: ${createError.message}`);
          throw createError;
        }

        return this.mapToVirtualStackPair(newPair);
      }
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Find existing virtual stack pair with both possible orderings
   * @private
   */
  private async findExistingVirtualStackPair(
    yardId: string, 
    normalizedStack1Id: string, 
    normalizedStack2Id: string
  ): Promise<VirtualStackPair | null> {
    logger.info('Debug', 'VirtualLocationCalculatorService', 
      `🔍 Searching for existing pair: yard=${yardId}, normalized=(${normalizedStack1Id}, ${normalizedStack2Id})`);

    // Get all active pairs for this yard and filter in memory
    // This is more reliable than complex Supabase queries
    const { data: allPairs, error } = await supabase
      .from('virtual_stack_pairs')
      .select('*')
      .eq('yard_id', yardId)
      .eq('is_active', true);

    if (error) {
      logger.error('Error', 'VirtualLocationCalculatorService', 
        `❌ Error searching for pairs: ${error.message}`);
      throw error;
    }

    if (!allPairs || allPairs.length === 0) {
      logger.info('Debug', 'VirtualLocationCalculatorService', 
        `❌ No active pairs found for yard ${yardId}`);
      return null;
    }

    // Log all existing pairs for debugging
    logger.info('Debug', 'VirtualLocationCalculatorService', 
      `📋 Found ${allPairs.length} active pairs in yard:`);
    allPairs.forEach((pair, index) => {
      logger.info('Debug', 'VirtualLocationCalculatorService', 
        `   Pair ${index + 1}: (${pair.stack1_id}, ${pair.stack2_id}) - Virtual Stack: ${pair.virtual_stack_number}`);
    });

    // Find matching pair by checking both possible orderings
    const matchingPair = allPairs.find(pair => {
      const pairStack1 = pair.stack1_id;
      const pairStack2 = pair.stack2_id;
      
      const match = (
        (pairStack1 === normalizedStack1Id && pairStack2 === normalizedStack2Id) ||
        (pairStack1 === normalizedStack2Id && pairStack2 === normalizedStack1Id)
      );
      
      if (match) {
        logger.info('Debug', 'VirtualLocationCalculatorService', 
          `🎯 Match found! Pair (${pairStack1}, ${pairStack2}) matches normalized (${normalizedStack1Id}, ${normalizedStack2Id})`);
      }
      
      return match;
    });

    if (matchingPair) {
      logger.info('Debug', 'VirtualLocationCalculatorService', 
        `✅ Found matching pair: ${matchingPair.id} with stacks (${matchingPair.stack1_id}, ${matchingPair.stack2_id})`);
      return this.mapToVirtualStackPair(matchingPair);
    }

    logger.info('Debug', 'VirtualLocationCalculatorService', 
      `❌ No matching pair found among ${allPairs.length} active pairs`);
    logger.info('Debug', 'VirtualLocationCalculatorService', 
      `   Looking for: (${normalizedStack1Id}, ${normalizedStack2Id})`);
    return null;
  }

  /**
   * Create virtual locations for a stack pair
   * Requirements: 3.2, 3.4 - Virtual location creation and management
   * 
   * @param request - Virtual location request
   * @returns Array of created virtual location records
   */
  async createVirtualLocations(request: VirtualLocationRequest): Promise<Location[]> {
    try {
      // Create or get virtual stack pair
      const virtualStackPair = await this.createOrGetVirtualStackPair(request);

      const virtualLocations: Location[] = [];
      const locationInserts: any[] = [];

      // Generate virtual location IDs for all row/tier combinations
      for (let row = 1; row <= request.rows; row++) {
        for (let tier = 1; tier <= request.tiers; tier++) {
          const locationId = this.generateVirtualLocationId(
            virtualStackPair.virtualStackNumber,
            row,
            tier
          );

          // Check if virtual location already exists
          const exists = await locationIdGeneratorService.locationIdExists(locationId);
          if (exists) {
            continue;
          }

          locationInserts.push({
            location_id: locationId,
            stack_id: request.stack1Id, // Reference to first stack (arbitrary choice)
            yard_id: request.yardId,
            row_number: row,
            tier_number: tier,
            is_virtual: true,
            virtual_stack_pair_id: virtualStackPair.id,
            is_occupied: false,
            container_id: null,
            container_size: '40ft', // Virtual locations are for 40ft containers
            client_pool_id: request.clientPoolId || null,
            is_active: true
          });
        }
      }

      // Bulk insert all virtual locations
      if (locationInserts.length > 0) {
        const { data, error } = await supabase
          .from('locations')
          .insert(locationInserts)
          .select();

        if (error) throw error;

        virtualLocations.push(...(data || []).map(this.mapToLocation));
      }

      return virtualLocations;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Update virtual locations when stack configuration changes
   * Requirements: 3.4 - Managing virtual location records
   * 
   * @param request - Virtual location update request
   * @returns Array of updated virtual location records
   */
  async updateVirtualLocations(request: VirtualLocationUpdateRequest): Promise<Location[]> {
    try {
      // Get virtual stack pair
      const virtualStackPair = await this.getVirtualStackPairById(request.virtualStackPairId);
      if (!virtualStackPair) {
        throw new GateInError({
          code: 'VIRTUAL_STACK_PAIR_NOT_FOUND',
          message: `Virtual stack pair not found: ${request.virtualStackPairId}`,
          severity: 'error',
          retryable: false,
          userMessage: 'Virtual stack pair does not exist'
        });
      }

      // Get existing virtual locations
      const { data: existingLocations, error: fetchError } = await supabase
        .from('locations')
        .select('*')
        .eq('virtual_stack_pair_id', request.virtualStackPairId)
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      const existing = (existingLocations || []).map(this.mapToLocation);
      const existingMap = new Map(existing.map(loc => [`${loc.rowNumber}-${loc.tierNumber}`, loc]));

      // Determine new configuration
      const newRows = request.rows || Math.max(...existing.map(loc => loc.rowNumber));
      const newTiers = request.tiers || Math.max(...existing.map(loc => loc.tierNumber));

      const locationsToAdd: any[] = [];
      const locationsToKeep: Location[] = [];
      const locationsToRemove: Location[] = [];

      // Check all possible positions in new configuration
      for (let row = 1; row <= newRows; row++) {
        for (let tier = 1; tier <= newTiers; tier++) {
          const key = `${row}-${tier}`;
          const existingLocation = existingMap.get(key);

          if (existingLocation) {
            locationsToKeep.push(existingLocation);
            existingMap.delete(key);
          } else {
            const locationId = this.generateVirtualLocationId(
              virtualStackPair.virtualStackNumber,
              row,
              tier
            );
            locationsToAdd.push({
              location_id: locationId,
              stack_id: virtualStackPair.stack1Id,
              yard_id: virtualStackPair.yardId,
              row_number: row,
              tier_number: tier,
              is_virtual: true,
              virtual_stack_pair_id: virtualStackPair.id,
              is_occupied: false,
              container_size: '40ft',
              is_active: true
            });
          }
        }
      }

      // Remaining locations are outside new configuration
      locationsToRemove.push(...Array.from(existingMap.values()));

      // Validate that locations to remove are not occupied
      const occupiedLocations = locationsToRemove.filter(loc => loc.isOccupied);
      if (occupiedLocations.length > 0) {
        throw new GateInError({
          code: 'OCCUPIED_VIRTUAL_LOCATIONS',
          message: `Cannot reduce virtual stack size: ${occupiedLocations.length} occupied location(s)`,
          severity: 'error',
          retryable: false,
          userMessage: 'Cannot reduce virtual stack size. Please relocate containers first.'
        });
      }

      // Deactivate locations outside new configuration
      if (locationsToRemove.length > 0) {
        const idsToDeactivate = locationsToRemove.map(loc => loc.id);
        const { error: deactivateError } = await supabase
          .from('locations')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .in('id', idsToDeactivate);

        if (deactivateError) throw deactivateError;
      }

      // Create new locations
      let newLocations: Location[] = [];
      if (locationsToAdd.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('locations')
          .insert(locationsToAdd)
          .select();

        if (insertError) throw insertError;
        newLocations = (insertedData || []).map(this.mapToLocation);
      }

      const allLocations = [...locationsToKeep, ...newLocations];

      return allLocations;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Cleanup virtual locations when stack pairing is removed
   * Requirements: 3.5 - Handle virtual location cleanup
   * 
   * @param virtualStackPairId - Virtual stack pair ID
   */
  async cleanupVirtualLocations(virtualStackPairId: string): Promise<void> {
    try {

      // Check if any virtual locations are occupied
      const { data: occupiedLocations, error: checkError } = await supabase
        .from('locations')
        .select('id, location_id')
        .eq('virtual_stack_pair_id', virtualStackPairId)
        .eq('is_occupied', true)
        .eq('is_active', true);

      if (checkError) throw checkError;

      if (occupiedLocations && occupiedLocations.length > 0) {
        throw new GateInError({
          code: 'OCCUPIED_VIRTUAL_LOCATIONS',
          message: `Cannot remove virtual stack pair: ${occupiedLocations.length} occupied location(s)`,
          severity: 'error',
          retryable: false,
          userMessage: 'Cannot remove virtual stack pairing. Please relocate all containers first.'
        });
      }

      // Deactivate all virtual locations for this pair
      const { error: deactivateError } = await supabase
        .from('locations')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('virtual_stack_pair_id', virtualStackPairId);

      if (deactivateError) throw deactivateError;

      // Deactivate the virtual stack pair
      const { error: pairError } = await supabase
        .from('virtual_stack_pairs')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', virtualStackPairId);

      if (pairError) throw pairError;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get virtual stack pair by ID
   * 
   * @param id - Virtual stack pair ID
   * @returns Virtual stack pair or null
   */
  async getVirtualStackPairById(id: string): Promise<VirtualStackPair | null> {
    try {
      const { data, error } = await supabase
        .from('virtual_stack_pairs')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data ? this.mapToVirtualStackPair(data) : null;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get virtual stack pair by stack IDs
   * 
   * Note: This method normalizes stack IDs by sorting them to handle both
   * possible orderings (stack1,stack2) and (stack2,stack1) for the same logical pair
   * 
   * @param yardId - Yard ID
   * @param stack1Id - First stack ID
   * @param stack2Id - Second stack ID
   * @returns Virtual stack pair or null
   */
  async getVirtualStackPairByStacks(
    yardId: string,
    stack1Id: string,
    stack2Id: string
  ): Promise<VirtualStackPair | null> {
    try {
      // Normalize stack IDs to ensure consistent ordering
      const [normalizedStack1Id, normalizedStack2Id] = [stack1Id, stack2Id].sort();

      return await this.findExistingVirtualStackPair(yardId, normalizedStack1Id, normalizedStack2Id);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get all virtual stack pairs for a yard
   * 
   * @param yardId - Yard ID
   * @returns Array of virtual stack pairs
   */
  async getVirtualStackPairsByYard(yardId: string): Promise<VirtualStackPair[]> {
    try {
      const { data, error } = await supabase
        .from('virtual_stack_pairs')
        .select('*')
        .eq('yard_id', yardId)
        .eq('is_active', true)
        .order('virtual_stack_number', { ascending: true });

      if (error) throw error;
      return (data || []).map(this.mapToVirtualStackPair);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get virtual locations for a virtual stack pair
   * 
   * @param virtualStackPairId - Virtual stack pair ID
   * @returns Array of virtual locations
   */
  async getVirtualLocationsByPair(virtualStackPairId: string): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('virtual_stack_pair_id', virtualStackPairId)
        .eq('is_active', true)
        .order('row_number', { ascending: true })
        .order('tier_number', { ascending: true });

      if (error) throw error;
      return (data || []).map(this.mapToLocation);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Check if a virtual stack pair exists for given stacks
   * 
   * @param yardId - Yard ID
   * @param stack1Number - First stack number
   * @param stack2Number - Second stack number
   * @returns True if virtual stack pair exists
   */
  async virtualStackPairExists(
    yardId: string,
    stack1Number: number,
    stack2Number: number
  ): Promise<boolean> {
    try {
      const virtualStackNumber = this.calculateVirtualStackNumber(stack1Number, stack2Number);

      const { data, error } = await supabase
        .from('virtual_stack_pairs')
        .select('id')
        .eq('yard_id', yardId)
        .eq('virtual_stack_number', virtualStackNumber)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Map database row to VirtualStackPair interface
   */
  private mapToVirtualStackPair(data: any): VirtualStackPair {
    return {
      id: data.id,
      yardId: data.yard_id,
      stack1Id: data.stack1_id,
      stack2Id: data.stack2_id,
      virtualStackNumber: data.virtual_stack_number,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  /**
   * Map database row to Location interface
   */
  private mapToLocation(data: any): Location {
    return {
      id: data.id,
      locationId: data.location_id,
      stackId: data.stack_id,
      yardId: data.yard_id,
      rowNumber: data.row_number,
      tierNumber: data.tier_number,
      isVirtual: data.is_virtual,
      virtualStackPairId: data.virtual_stack_pair_id,
      isOccupied: data.is_occupied,
      available: !data.is_occupied && data.is_active,
      containerId: data.container_id,
      containerNumber: data.container_number,
      containerSize: data.container_size,
      clientPoolId: data.client_pool_id,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

export const virtualLocationCalculatorService = new VirtualLocationCalculatorService();
