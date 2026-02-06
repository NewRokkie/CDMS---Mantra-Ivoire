/**
 * Stack Soft Delete Service
 * 
 * Handles stack lifecycle management with soft delete and location recovery:
 * - Soft delete stacks (deactivate instead of permanent deletion)
 * - Smart stack recreation with automatic location recovery
 * - Permanent deletion for inactive stacks (admin only)
 * - Stack status monitoring and reporting
 */

import { supabase } from './supabaseClient';

export interface StackCreationParams {
  yard_id: string;
  stack_number: number;
  section_name?: string;
  rows?: number;
  max_tiers?: number;
  created_by?: string;
}

export interface StackStatusSummary {
  id: string;
  yard_id: string;
  stack_number: number;
  section_name: string;
  is_active: boolean;
  capacity: number;
  current_occupancy: number;
  total_locations: number;
  active_locations: number;
  occupied_locations: number;
  created_at: string;
  updated_at: string;
}

export class StackSoftDeleteService {
  /**
   * Soft delete a stack (deactivate it and all its locations)
   */
  static async softDeleteStack(stackId: string, deletedBy?: string): Promise<{
    success: boolean;
    message: string;
    stackNumber?: number;
    affectedLocations?: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('soft_delete_stack', {
        p_stack_id: stackId,
        p_deleted_by: deletedBy
      });

      if (error) {
        console.error('Error soft deleting stack:', error);
        return {
          success: false,
          message: `Failed to soft delete stack: ${error.message}`
        };
      }

      if (!data) {
        return {
          success: false,
          message: 'Stack not found or already inactive'
        };
      }

      return {
        success: true,
        message: 'Stack successfully soft deleted and locations deactivated'
      };
    } catch (error) {
      console.error('Error in softDeleteStack:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while soft deleting the stack'
      };
    }
  }

  /**
   * Create or recreate a stack with automatic location recovery
   */
  static async recreateStackWithLocationRecovery(params: StackCreationParams): Promise<{
    success: boolean;
    message: string;
    stackId?: string;
    wasReactivated?: boolean;
    locationInfo?: {
      existing: number;
      needed: number;
    };
  }> {
    try {
      const { data: stackId, error } = await supabase.rpc('recreate_stack_with_location_recovery', {
        p_yard_id: params.yard_id,
        p_stack_number: params.stack_number,
        p_section_name: params.section_name || 'Zone A',
        p_rows: params.rows || 6,
        p_max_tiers: params.max_tiers || 4,
        p_created_by: params.created_by
      });

      if (error) {
        console.error('Error recreating stack:', error);
        return {
          success: false,
          message: `Failed to recreate stack: ${error.message}`
        };
      }

      // Check if this was a reactivation or new creation
      const { data: stackInfo } = await supabase
        .from('stacks')
        .select('created_at, updated_at')
        .eq('id', stackId)
        .single();

      const wasReactivated = stackInfo && stackInfo.created_at !== stackInfo.updated_at;

      // Get location information
      const { data: locationInfo } = await supabase
        .from('locations')
        .select('id, is_active')
        .eq('stack_id', stackId);

      const activeLocations = locationInfo?.filter(l => l.is_active).length || 0;
      const totalExpected = (params.rows || 6) * (params.max_tiers || 4);

      return {
        success: true,
        message: wasReactivated 
          ? `Stack S${params.stack_number} reactivated with existing locations`
          : `New stack S${params.stack_number} created`,
        stackId,
        wasReactivated: wasReactivated || false,
        locationInfo: {
          existing: activeLocations,
          needed: totalExpected
        }
      };
    } catch (error) {
      console.error('Error in recreateStackWithLocationRecovery:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while recreating the stack'
      };
    }
  }

  /**
   * Permanently delete an inactive stack (admin only)
   */
  static async permanentlyDeleteInactiveStack(stackId: string, deletedBy?: string): Promise<{
    success: boolean;
    message: string;
    stackNumber?: number;
    deletedLocations?: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('permanently_delete_inactive_stack', {
        p_stack_id: stackId,
        p_deleted_by: deletedBy
      });

      if (error) {
        console.error('Error permanently deleting stack:', error);
        return {
          success: false,
          message: `Failed to permanently delete stack: ${error.message}`
        };
      }

      if (!data) {
        return {
          success: false,
          message: 'Stack not found, is active, or has occupied locations'
        };
      }

      return {
        success: true,
        message: 'Stack and all its locations permanently deleted'
      };
    } catch (error) {
      console.error('Error in permanentlyDeleteInactiveStack:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while permanently deleting the stack'
      };
    }
  }

  /**
   * Get stack status summary with location counts
   */
  static async getStackStatusSummary(yardId?: string): Promise<{
    success: boolean;
    data?: StackStatusSummary[];
    message?: string;
  }> {
    try {
      let query = supabase.from('stack_status_summary').select('*');
      
      if (yardId) {
        query = query.eq('yard_id', yardId);
      }

      const { data, error } = await query.order('yard_id').order('stack_number');

      if (error) {
        console.error('Error fetching stack status summary:', error);
        return {
          success: false,
          message: `Failed to fetch stack status: ${error.message}`
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error in getStackStatusSummary:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while fetching stack status'
      };
    }
  }

  /**
   * Get only active stacks
   */
  static async getActiveStacks(yardId?: string): Promise<{
    success: boolean;
    data?: any[];
    message?: string;
  }> {
    try {
      let query = supabase.from('active_stacks').select('*');
      
      if (yardId) {
        query = query.eq('yard_id', yardId);
      }

      const { data, error } = await query.order('yard_id').order('stack_number');

      if (error) {
        console.error('Error fetching active stacks:', error);
        return {
          success: false,
          message: `Failed to fetch active stacks: ${error.message}`
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error in getActiveStacks:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while fetching active stacks'
      };
    }
  }

  /**
   * Reactivate a soft-deleted stack
   */
  static async reactivateStack(stackId: string, reactivatedBy?: string): Promise<{
    success: boolean;
    message: string;
    stackNumber?: number;
    reactivatedLocations?: number;
  }> {
    try {
      // First check if stack exists and is inactive
      const { data: stack, error: checkError } = await supabase
        .from('stacks')
        .select('stack_number, is_active')
        .eq('id', stackId)
        .single();

      if (checkError || !stack) {
        return {
          success: false,
          message: 'Stack not found'
        };
      }

      if (stack.is_active) {
        return {
          success: false,
          message: `Stack S${stack.stack_number} is already active`
        };
      }

      // Reactivate the stack
      const { error: updateError } = await supabase
        .from('stacks')
        .update({
          is_active: true,
          updated_at: new Date().toISOString(),
          updated_by: reactivatedBy
        })
        .eq('id', stackId);

      if (updateError) {
        console.error('Error reactivating stack:', updateError);
        return {
          success: false,
          message: `Failed to reactivate stack: ${updateError.message}`
        };
      }

      // Count reactivated locations
      const { data: locations } = await supabase
        .from('locations')
        .select('id')
        .eq('stack_id', stackId)
        .eq('is_active', true);

      return {
        success: true,
        message: `Stack S${stack.stack_number} reactivated successfully`,
        stackNumber: stack.stack_number,
        reactivatedLocations: locations?.length || 0
      };
    } catch (error) {
      console.error('Error in reactivateStack:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while reactivating the stack'
      };
    }
  }

  /**
   * Get inactive stacks (soft deleted)
   */
  static async getInactiveStacks(yardId?: string): Promise<{
    success: boolean;
    data?: any[];
    message?: string;
  }> {
    try {
      let query = supabase
        .from('stacks')
        .select('*')
        .eq('is_active', false);
      
      if (yardId) {
        query = query.eq('yard_id', yardId);
      }

      const { data, error } = await query.order('yard_id').order('stack_number');

      if (error) {
        console.error('Error fetching inactive stacks:', error);
        return {
          success: false,
          message: `Failed to fetch inactive stacks: ${error.message}`
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      console.error('Error in getInactiveStacks:', error);
      return {
        success: false,
        message: 'An unexpected error occurred while fetching inactive stacks'
      };
    }
  }
}

export default StackSoftDeleteService;