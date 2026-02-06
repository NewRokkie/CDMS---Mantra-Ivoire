/**
 * Automatic Virtual Stack Management Service
 * 
 * This service handles the automatic creation and management of virtual stacks
 * based on the container_size configuration of physical stacks.
 * 
 * Logic:
 * - When two adjacent odd stacks (e.g., S03, S05) are set to 40ft → Create virtual stack S04
 * - When either stack is changed back to 20ft → Deactivate virtual stack S04
 * - Virtual stacks appear/disappear automatically in Yard Live Map
 */

import { supabase } from './supabaseClient';
import { ErrorHandler, GateInError } from '../errorHandling';
import { locationIdGeneratorService } from './locationIdGeneratorService';
import { logger } from '../../utils/logger';

export interface VirtualStackPair {
  id: string;
  yardId: string;
  stack1Id: string;
  stack2Id: string;
  virtualStackNumber: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VirtualStackManagementResult {
  success: boolean;
  action: 'created' | 'activated' | 'deactivated' | 'no_change';
  virtualStackNumber?: number;
  message: string;
}

export class AutomaticVirtualStackService {
  /**
   * Check and manage virtual stack for a specific pairing
   * This is called automatically when stack container_size changes
   */
  async manageVirtualStackForPairing(
    yardId: string,
    firstStackNumber: number,
    secondStackNumber: number
  ): Promise<VirtualStackManagementResult> {
    try {
      const virtualStackNumber = firstStackNumber + 1;
      
      logger.info('AutomaticVirtualStackService', 
        `Managing virtual stack for pairing S${String(firstStackNumber).padStart(2, '0')} + S${String(secondStackNumber).padStart(2, '0')} → S${String(virtualStackNumber).padStart(2, '0')}`);

      // Get both physical stacks with all necessary information
      const { data: stacks, error: stacksError } = await supabase
        .from('stacks')
        .select('id, stack_number, container_size, is_active, rows, max_tiers, row_tier_config, section_id, position_x, position_y, position_z, width, length')
        .eq('yard_id', yardId)
        .in('stack_number', [firstStackNumber, secondStackNumber]);

      if (stacksError) throw stacksError;

      const firstStack = stacks?.find(s => s.stack_number === firstStackNumber);
      const secondStack = stacks?.find(s => s.stack_number === secondStackNumber);

      if (!firstStack || !secondStack) {
        return {
          success: false,
          action: 'no_change',
          message: `One or both physical stacks not found: S${String(firstStackNumber).padStart(2, '0')}, S${String(secondStackNumber).padStart(2, '0')}`
        };
      }

      // Check if both stacks are 40ft and active
      const both40ft = firstStack.container_size === '40ft' && 
                      secondStack.container_size === '40ft' &&
                      firstStack.is_active && 
                      secondStack.is_active;

      // Get existing virtual stack
      const { data: virtualStack } = await supabase
        .from('stacks')
        .select('id, is_active')
        .eq('yard_id', yardId)
        .eq('stack_number', virtualStackNumber)
        .eq('is_virtual', true)
        .maybeSingle();

      // Get existing virtual pair
      const { data: virtualPair } = await supabase
        .from('virtual_stack_pairs')
        .select('id, is_active')
        .eq('yard_id', yardId)
        .eq('stack1_id', firstStack.id)
        .eq('stack2_id', secondStack.id)
        .maybeSingle();

      if (both40ft) {
        // Both stacks are 40ft → Create/activate virtual stack
        return await this.createOrActivateVirtualStack(
          yardId,
          firstStack,
          secondStack,
          virtualStackNumber,
          virtualStack,
          virtualPair
        );
      } else {
        // At least one stack is not 40ft → Deactivate virtual stack
        return await this.deactivateVirtualStack(
          virtualStackNumber,
          virtualStack,
          virtualPair
        );
      }

    } catch (error) {
      logger.error('AutomaticVirtualStackService', 'Error managing virtual stack', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Create or activate virtual stack and pairing
   */
  private async createOrActivateVirtualStack(
    yardId: string,
    firstStack: any,
    secondStack: any,
    virtualStackNumber: number,
    existingVirtualStack: any,
    existingVirtualPair: any
  ): Promise<VirtualStackManagementResult> {
    try {
      let virtualStackId = existingVirtualStack?.id;
      let action: 'created' | 'activated' = 'created';

      // 1. Create or activate virtual stack
      if (!existingVirtualStack) {
        // Create new virtual stack
        try {
          // Calculate proper capacity for virtual stack
          let virtualCapacity = firstStack.capacity;
          
          // If capacity is 0 or invalid, calculate it properly
          if (!virtualCapacity || virtualCapacity <= 0) {
            if (firstStack.row_tier_config) {
              // Calculate from row-tier config
              try {
                const rowTierConfig = typeof firstStack.row_tier_config === 'string' 
                  ? JSON.parse(firstStack.row_tier_config) 
                  : firstStack.row_tier_config;
                virtualCapacity = rowTierConfig.reduce((sum: number, config: any) => sum + config.maxTiers, 0);
              } catch (error) {
                // Fallback to uniform calculation
                virtualCapacity = firstStack.rows * firstStack.max_tiers;
              }
            } else {
              // Uniform calculation
              virtualCapacity = firstStack.rows * firstStack.max_tiers;
            }
          }

          const { data: newVirtualStack, error: createError } = await supabase
            .from('stacks')
            .insert({
              yard_id: yardId,
              stack_number: virtualStackNumber,
              section_id: firstStack.section_id,
              rows: firstStack.rows,
              max_tiers: firstStack.max_tiers,
              row_tier_config: firstStack.row_tier_config,
              capacity: virtualCapacity, // Use calculated capacity
              current_occupancy: 0,
              position_x: (firstStack.position_x || 0) + 2.5, // Position between stacks
              position_y: firstStack.position_y || 0,
              position_z: firstStack.position_z || 0,
              width: firstStack.width || 2.5,
              length: firstStack.length || 12,
              is_virtual: true,
              container_size: '40ft',
              is_active: true
            })
            .select('id')
            .single();

          if (createError) {
            // Check if it's a duplicate key error
            if (createError.message.includes('unique constraint') || 
                createError.message.includes('duplicate key')) {
              // Virtual stack already exists, try to get it
              const { data: existingStack } = await supabase
                .from('stacks')
                .select('id, is_active')
                .eq('yard_id', yardId)
                .eq('stack_number', virtualStackNumber)
                .eq('is_virtual', true)
                .maybeSingle();
              
              if (existingStack) {
                virtualStackId = existingStack.id;
                if (!existingStack.is_active) {
                  // Reactivate it
                  await supabase
                    .from('stacks')
                    .update({ 
                      is_active: true, 
                      container_size: '40ft',
                      updated_at: new Date().toISOString() 
                    })
                    .eq('id', existingStack.id);
                  action = 'activated';
                }
                logger.info('AutomaticVirtualStackService', 
                  `Found existing virtual stack S${String(virtualStackNumber).padStart(2, '0')}, reusing it`);
              } else {
                throw createError;
              }
            } else {
              throw createError;
            }
          } else {
            virtualStackId = newVirtualStack.id;
            action = 'created';
          }

          logger.info('AutomaticVirtualStackService', 
            `${action === 'created' ? 'Created' : 'Reactivated'} virtual stack S${String(virtualStackNumber).padStart(2, '0')}`);

        } catch (stackCreationError) {
          logger.error('AutomaticVirtualStackService', 'Error creating virtual stack', stackCreationError);
          throw stackCreationError;
        }

      } else if (!existingVirtualStack.is_active) {
        // Reactivate existing virtual stack
        const { error: activateError } = await supabase
          .from('stacks')
          .update({ 
            is_active: true, 
            container_size: '40ft',
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingVirtualStack.id);

        if (activateError) throw activateError;
        virtualStackId = existingVirtualStack.id;
        action = 'activated';

        logger.info('AutomaticVirtualStackService', 
          `Reactivated virtual stack S${String(virtualStackNumber).padStart(2, '0')}`);
      }

      // 2. Create or activate virtual_stack_pairs entry
      if (!existingVirtualPair) {
        try {
          const { error: pairError } = await supabase
            .from('virtual_stack_pairs')
            .insert({
              yard_id: yardId,
              stack1_id: firstStack.id,
              stack2_id: secondStack.id,
              virtual_stack_number: virtualStackNumber,
              is_active: true
            });

          if (pairError) {
            // Check if it's a duplicate key error or RLS policy error
            if (pairError.message.includes('unique constraint') || 
                pairError.message.includes('duplicate key')) {
              logger.info('AutomaticVirtualStackService', 
                `Virtual_stack_pairs entry already exists for S${String(virtualStackNumber).padStart(2, '0')}`);
            } else if (pairError.message.includes('violates row-level security') ||
                       pairError.message.includes('42501') ||
                       pairError.message.includes('permission denied')) {
              logger.warn('AutomaticVirtualStackService', 
                `RLS policy prevented virtual_stack_pairs creation for S${String(virtualStackNumber).padStart(2, '0')}. This may be handled by the primary system.`);
            } else {
              throw pairError;
            }
          } else {
            logger.info('AutomaticVirtualStackService', 
              `Created virtual_stack_pairs entry for S${String(virtualStackNumber).padStart(2, '0')}`);
          }
        } catch (pairCreationError) {
          logger.error('AutomaticVirtualStackService', 'Error creating virtual_stack_pairs', pairCreationError);
          // Don't fail the whole operation if pair creation fails due to permissions
        }

      } else if (!existingVirtualPair.is_active) {
        const { error: activatePairError } = await supabase
          .from('virtual_stack_pairs')
          .update({ 
            is_active: true,
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingVirtualPair.id);

        if (activatePairError) {
          logger.error('AutomaticVirtualStackService', 'Error activating virtual_stack_pairs', activatePairError);
          // Don't fail the whole operation
        } else {
          logger.info('AutomaticVirtualStackService', 
            `Reactivated virtual_stack_pairs entry for S${String(virtualStackNumber).padStart(2, '0')}`);
        }
      }

      // 3. Generate locations for virtual stack (handled by locationIdGeneratorService)
      if (virtualStackId && action === 'created') {
        // Generate locations for the newly created virtual stack
        try {
          await locationIdGeneratorService.generateLocationsForStack({
            yardId,
            stackId: virtualStackId,
            stackNumber: virtualStackNumber,
            rows: firstStack.rows,
            tiers: firstStack.max_tiers,
            containerSize: '40ft',
            isVirtual: true,
            virtualStackPairId: existingVirtualPair?.id,
            rowTierConfig: firstStack.row_tier_config
          });

          logger.info('AutomaticVirtualStackService', 
            `Generated locations for virtual stack S${String(virtualStackNumber).padStart(2, '0')}`);
        } catch (locationError) {
          logger.error('AutomaticVirtualStackService', 
            `Failed to generate locations for virtual stack S${String(virtualStackNumber).padStart(2, '0')}`, locationError);
          
          // Check if locations already exist for this virtual stack
          const { data: existingLocations } = await supabase
            .from('locations')
            .select('id')
            .eq('stack_id', virtualStackId)
            .eq('is_active', true)
            .limit(1);

          if (existingLocations && existingLocations.length > 0) {
            logger.info('AutomaticVirtualStackService', 
              `Locations already exist for virtual stack S${String(virtualStackNumber).padStart(2, '0')}, skipping generation`);
          } else {
            // Check if it's an RLS policy error
            const errorMessage = locationError instanceof Error ? locationError.message.toLowerCase() : '';
            if (errorMessage.includes('violates row-level security') ||
                errorMessage.includes('42501') ||
                errorMessage.includes('permission denied')) {
              logger.warn('AutomaticVirtualStackService', 
                `RLS policy prevented location generation for virtual stack S${String(virtualStackNumber).padStart(2, '0')}. This may be handled by the primary system.`);
            } else {
              // If no locations exist and generation failed for other reasons, this is a real problem
              logger.warn('AutomaticVirtualStackService', 
                `Virtual stack S${String(virtualStackNumber).padStart(2, '0')} created but location generation failed. Manual intervention may be required.`);
            }
          }
        }
      }

      return {
        success: true,
        action,
        virtualStackNumber,
        message: `Virtual stack S${String(virtualStackNumber).padStart(2, '0')} ${action} successfully`
      };

    } catch (error) {
      logger.error('AutomaticVirtualStackService', 'Error creating/activating virtual stack', error);
      throw error;
    }
  }

  /**
   * Deactivate virtual stack and pairing
   */
  private async deactivateVirtualStack(
    virtualStackNumber: number,
    existingVirtualStack: any,
    existingVirtualPair: any
  ): Promise<VirtualStackManagementResult> {
    try {
      let hasChanges = false;

      // 1. Deactivate virtual stack
      if (existingVirtualStack && existingVirtualStack.is_active) {
        const { error: deactivateError } = await supabase
          .from('stacks')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingVirtualStack.id);

        if (deactivateError) throw deactivateError;
        hasChanges = true;

        logger.info('AutomaticVirtualStackService', 
          `Deactivated virtual stack S${String(virtualStackNumber).padStart(2, '0')}`);
      }

      // 2. Deactivate virtual_stack_pairs entry
      if (existingVirtualPair && existingVirtualPair.is_active) {
        const { error: deactivatePairError } = await supabase
          .from('virtual_stack_pairs')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString() 
          })
          .eq('id', existingVirtualPair.id);

        if (deactivatePairError) throw deactivatePairError;
        hasChanges = true;

        logger.info('AutomaticVirtualStackService', 
          `Deactivated virtual_stack_pairs entry for S${String(virtualStackNumber).padStart(2, '0')}`);
      }

      // 3. Deactivate locations for virtual stack
      if (existingVirtualStack) {
        const { error: deactivateLocationsError } = await supabase
          .from('locations')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString() 
          })
          .eq('stack_id', existingVirtualStack.id)
          .eq('is_virtual', true);

        if (deactivateLocationsError) throw deactivateLocationsError;
      }

      return {
        success: true,
        action: hasChanges ? 'deactivated' : 'no_change',
        virtualStackNumber,
        message: hasChanges 
          ? `Virtual stack S${String(virtualStackNumber).padStart(2, '0')} deactivated successfully`
          : `Virtual stack S${String(virtualStackNumber).padStart(2, '0')} was already inactive`
      };

    } catch (error) {
      logger.error('AutomaticVirtualStackService', 'Error deactivating virtual stack', error);
      throw error;
    }
  }

  /**
   * Get all active virtual stack pairs for a yard
   */
  async getActiveVirtualPairs(yardId: string): Promise<VirtualStackPair[]> {
    try {
      const { data, error } = await supabase
        .from('virtual_stack_pairs')
        .select('*')
        .eq('yard_id', yardId)
        .eq('is_active', true)
        .order('virtual_stack_number');

      if (error) throw error;

      return (data || []).map(this.mapToVirtualStackPair);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Check if a virtual stack should exist for given physical stacks
   */
  async shouldVirtualStackExist(
    yardId: string,
    firstStackNumber: number,
    secondStackNumber: number
  ): Promise<boolean> {
    try {
      const { data: stacks, error } = await supabase
        .from('stacks')
        .select('container_size, is_active')
        .eq('yard_id', yardId)
        .in('stack_number', [firstStackNumber, secondStackNumber]);

      if (error) throw error;

      if (!stacks || stacks.length !== 2) return false;

      return stacks.every(stack => 
        stack.container_size === '40ft' && stack.is_active
      );
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
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
}

export const automaticVirtualStackService = new AutomaticVirtualStackService();