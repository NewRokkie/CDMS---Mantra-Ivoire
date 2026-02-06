/**
 * Location ID Generator Service
 * 
 * Implements automatic location ID generation in SXXRXHX format with validation
 * and uniqueness constraints. Handles bulk location creation for stack operations.
 * 
 * Requirements Addressed:
 * - 2.1: Automatic location ID generation when stacks are created
 * - 2.2: Location ID format validation (SXXRXHX with zero-padded stack numbers)
 * - 2.4: Bulk generation methods for stack creation and updates
 */

import { supabase } from './supabaseClient';
import { ErrorHandler, GateInError } from '../errorHandling';
import { Location } from '../../types/location';
import { logger } from '../../utils/logger';

export interface LocationIdGenerationRequest {
  yardId: string;
  stackId: string;
  stackNumber: number;
  rows: number;
  tiers: number;
  containerSize?: '20ft' | '40ft';
  clientPoolId?: string;
  isVirtual?: boolean;
  virtualStackPairId?: string;
  rowTierConfig?: Array<{ row: number; maxTiers: number }>;
}

export interface BulkLocationGenerationRequest {
  yardId: string;
  stackId: string;
  stackNumber: number;
  rows: number;
  tiers: number;
  containerSize?: '20ft' | '40ft';
  clientPoolId?: string;
  rowTierConfig?: Array<{ row: number; maxTiers: number }>;
}

export interface LocationIdValidationResult {
  isValid: boolean;
  errors: string[];
}

export class LocationIdGeneratorService {
  /**
   * Get maximum tiers for a specific row based on row_tier_config
   * 
   * @param row - Row number (1-based)
   * @param defaultTiers - Default number of tiers if no custom config
   * @param rowTierConfig - Custom row-tier configuration
   * @returns Maximum tiers for the specified row
   */
  private getMaxTiersForRow(
    row: number, 
    defaultTiers: number, 
    rowTierConfig?: Array<{ row: number; maxTiers: number }>
  ): number {
    if (!rowTierConfig || rowTierConfig.length === 0) {
      return defaultTiers;
    }

    const rowConfig = rowTierConfig.find(config => config.row === row);
    return rowConfig ? rowConfig.maxTiers : defaultTiers;
  }

  /**
   * Generate a single location ID in SXXRXHX format
   * Requirements: 2.1, 2.2 - Format generation with zero-padded stack numbers
   * 
   * @param stackNumber - Stack number (will be zero-padded to 2 digits)
   * @param row - Row number (1-based)
   * @param tier - Tier/height number (1-based)
   * @returns Location ID in SXXRXHX format (e.g., S01R2H3)
   */
  generateLocationId(stackNumber: number, row: number, tier: number): string {
    // Validate inputs
    if (stackNumber < 0 || stackNumber > 999) {
      throw new GateInError({
        code: 'INVALID_STACK_NUMBER',
        message: `Stack number must be between 0 and 999, got: ${stackNumber}`,
        severity: 'error',
        retryable: false,
        userMessage: 'Invalid stack number for location ID generation'
      });
    }

    if (row < 1 || row > 9) {
      throw new GateInError({
        code: 'INVALID_ROW_NUMBER',
        message: `Row number must be between 1 and 9, got: ${row}`,
        severity: 'error',
        retryable: false,
        userMessage: 'Invalid row number for location ID generation'
      });
    }

    if (tier < 1 || tier > 9) {
      throw new GateInError({
        code: 'INVALID_TIER_NUMBER',
        message: `Tier number must be between 1 and 9, got: ${tier}`,
        severity: 'error',
        retryable: false,
        userMessage: 'Invalid tier number for location ID generation'
      });
    }

    // Format: SXXRXHX where XX is zero-padded stack number
    const stackPart = `S${String(stackNumber).padStart(2, '0')}`;
    const rowPart = `R${row}`;
    const tierPart = `H${tier}`;

    return `${stackPart}${rowPart}${tierPart}`;
  }

  /**
   * Validate location ID format
   * Requirements: 2.2 - Location ID format validation
   * 
   * @param locationId - Location ID to validate
   * @returns Validation result with errors if any
   */
  validateLocationIdFormat(locationId: string): LocationIdValidationResult {
    const errors: string[] = [];

    // Check basic format: SXXRXHX
    const pattern = /^S\d{2}R\d{1}H\d{1}$/;
    if (!pattern.test(locationId)) {
      errors.push('Location ID must match format SXXRXHX (e.g., S01R2H3)');
      return { isValid: false, errors };
    }

    // Extract components
    const stackNumber = parseInt(locationId.substring(1, 3), 10);
    const rowNumber = parseInt(locationId.substring(4, 5), 10);
    const tierNumber = parseInt(locationId.substring(6, 7), 10);

    // Validate ranges
    if (stackNumber < 0 || stackNumber > 99) {
      errors.push('Stack number must be between 00 and 99');
    }

    if (rowNumber < 1 || rowNumber > 9) {
      errors.push('Row number must be between 1 and 9');
    }

    if (tierNumber < 1 || tierNumber > 9) {
      errors.push('Tier number must be between 1 and 9');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Parse location ID into components
   * 
   * @param locationId - Location ID to parse
   * @returns Object with stack, row, and tier numbers
   */
  parseLocationId(locationId: string): { stackNumber: number; row: number; tier: number } {
    const validation = this.validateLocationIdFormat(locationId);
    if (!validation.isValid) {
      throw new GateInError({
        code: 'INVALID_LOCATION_ID_FORMAT',
        message: `Invalid location ID format: ${validation.errors.join(', ')}`,
        severity: 'error',
        retryable: false,
        userMessage: 'Location ID format is invalid'
      });
    }

    return {
      stackNumber: parseInt(locationId.substring(1, 3), 10),
      row: parseInt(locationId.substring(4, 5), 10),
      tier: parseInt(locationId.substring(6, 7), 10)
    };
  }

  /**
   * Check if an active location ID already exists in the database
   * Requirements: 2.2 - Uniqueness constraints for active locations
   * 
   * @param locationId - Location ID to check
   * @returns True if active location ID exists, false otherwise
   */
  async activeLocationIdExists(locationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id')
        .eq('location_id', locationId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Check if a location ID already exists in the database (active or inactive)
   * Requirements: 2.2 - Uniqueness constraints
   * 
   * @param locationId - Location ID to check
   * @returns True if location ID exists, false otherwise
   */
  async locationIdExists(locationId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id')
        .eq('location_id', locationId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Reactivate an inactive location or create a new one
   * 
   * @param locationId - Location ID to reactivate or create
   * @param locationData - Location data for creation
   * @returns Location record
   */
  private async reactivateOrCreateLocation(locationId: string, locationData: any): Promise<any> {
    // First, try to reactivate an existing inactive location
    const { data: existingLocation, error: fetchError } = await supabase
      .from('locations')
      .select('*')
      .eq('location_id', locationId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingLocation) {
      if (!existingLocation.is_active) {
        // Reactivate the existing location with updated data
        const { data: reactivatedData, error: updateError } = await supabase
          .from('locations')
          .update({
            ...locationData,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingLocation.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return reactivatedData;
      } else {
        // Location is already active, return it
        return existingLocation;
      }
    } else {
      // Create new location
      const { data: newData, error: insertError } = await supabase
        .from('locations')
        .insert(locationData)
        .select()
        .single();

      if (insertError) throw insertError;
      return newData;
    }
  }

  /**
   * Ensure location ID uniqueness before creation
   * Requirements: 2.2 - Location ID uniqueness across the entire yard system
   * 
   * @param locationId - Location ID to validate
   * @throws Error if location ID already exists and is active
   */
  async ensureUniqueness(locationId: string): Promise<void> {
    const exists = await this.activeLocationIdExists(locationId);
    if (exists) {
      throw new GateInError({
        code: 'LOCATION_ID_EXISTS',
        message: `Active location ID ${locationId} already exists`,
        severity: 'error',
        retryable: false,
        userMessage: `Location ${locationId} already exists in the system`
      });
    }
  }

  /**
   * Generate all location records for a stack
   * Requirements: 2.1, 2.4 - Automatic location generation for stack creation
   * 
   * @param request - Location generation request with stack configuration
   * @returns Array of created location records
   */
  async generateLocationsForStack(request: LocationIdGenerationRequest): Promise<Location[]> {
    try {
      const locations: Location[] = [];
      const locationPromises: Promise<any>[] = [];

      // Generate location IDs for all row/tier combinations
      // Use row_tier_config if available, otherwise use uniform tiers
      for (let row = 1; row <= request.rows; row++) {
        const maxTiersForRow = this.getMaxTiersForRow(row, request.tiers, request.rowTierConfig);
        
        for (let tier = 1; tier <= maxTiersForRow; tier++) {
          const locationId = this.generateLocationId(request.stackNumber, row, tier);

          const locationData = {
            location_id: locationId,
            stack_id: request.stackId,
            yard_id: request.yardId,
            row_number: row,
            tier_number: tier,
            is_virtual: request.isVirtual || false,
            virtual_stack_pair_id: request.virtualStackPairId || null,
            is_occupied: false,
            container_id: null,
            container_size: request.containerSize || null,
            client_pool_id: request.clientPoolId || null,
            is_active: true
          };

          // Use reactivateOrCreateLocation to handle both new and existing locations
          locationPromises.push(this.reactivateOrCreateLocation(locationId, locationData));
        }
      }

      // Process all locations
      if (locationPromises.length > 0) {
        try {
          const locationResults = await Promise.all(locationPromises);
          locations.push(...locationResults.map(this.mapToLocation));

          logger.info('LocationIdGeneratorService', 
            `Generated/reactivated ${locations.length} locations for stack ${request.stackNumber}`);

        } catch (error) {
          logger.error('LocationIdGeneratorService', 
            `Error generating locations for stack ${request.stackNumber}`, error);
          throw error;
        }
      }

      return locations;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Bulk generate locations for multiple stacks
   * Requirements: 2.4 - Bulk generation methods for stack creation
   * 
   * @param requests - Array of location generation requests
   * @returns Array of all created location records
   */
  async bulkGenerateLocations(requests: BulkLocationGenerationRequest[]): Promise<Location[]> {
    try {
      const allLocations: Location[] = [];

      // Process each stack sequentially to maintain data integrity
      for (const request of requests) {
        const locations = await this.generateLocationsForStack({
          yardId: request.yardId,
          stackId: request.stackId,
          stackNumber: request.stackNumber,
          rows: request.rows,
          tiers: request.tiers,
          containerSize: request.containerSize,
          clientPoolId: request.clientPoolId,
          isVirtual: false,
          rowTierConfig: request.rowTierConfig
        });

        allLocations.push(...locations);
      }

      return allLocations;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Update locations when stack configuration changes
   * Requirements: 2.4 - Handle stack configuration updates
   * 
   * @param stackId - Stack ID to update
   * @param yardId - Yard ID
   * @param stackNumber - Stack number
   * @param newRows - New number of rows
   * @param newTiers - New number of tiers (used as default if no row config)
   * @param rowTierConfig - Optional row-specific tier configuration
   * @returns Array of updated/created location records
   */
  async updateLocationsForStackConfiguration(
    stackId: string,
    yardId: string,
    stackNumber: number,
    newRows: number,
    newTiers: number,
    rowTierConfig?: Array<{ row: number; maxTiers: number }>
  ): Promise<Location[]> {
    try {

      // Get existing locations for this stack
      const { data: existingLocations, error: fetchError } = await supabase
        .from('locations')
        .select('*')
        .eq('stack_id', stackId)
        .eq('is_active', true);

      if (fetchError) throw fetchError;

      const existing = (existingLocations || []).map(this.mapToLocation);
      const existingMap = new Map(existing.map(loc => [`${loc.rowNumber}-${loc.tierNumber}`, loc]));

      // Determine which locations to add, keep, or remove
      const locationsToAdd: any[] = [];
      const locationsToKeep: Location[] = [];
      const locationsToRemove: Location[] = [];

      // Check all possible positions in new configuration
      for (let row = 1; row <= newRows; row++) {
        const maxTiersForRow = this.getMaxTiersForRow(row, newTiers, rowTierConfig);
        
        for (let tier = 1; tier <= maxTiersForRow; tier++) {
          const key = `${row}-${tier}`;
          const existingLocation = existingMap.get(key);

          if (existingLocation) {
            // Location exists, keep it
            locationsToKeep.push(existingLocation);
            existingMap.delete(key);
          } else {
            // Location doesn't exist, need to create it
            const locationId = this.generateLocationId(stackNumber, row, tier);
            locationsToAdd.push({
              location_id: locationId,
              stack_id: stackId,
              yard_id: yardId,
              row_number: row,
              tier_number: tier,
              is_virtual: false,
              is_occupied: false,
              is_active: true
            });
          }
        }
      }

      // Remaining locations in existingMap are outside new configuration
      locationsToRemove.push(...Array.from(existingMap.values()));

      // Validate that locations to remove are not occupied
      const occupiedLocations = locationsToRemove.filter(loc => loc.isOccupied);
      if (occupiedLocations.length > 0) {
        throw new GateInError({
          code: 'OCCUPIED_LOCATIONS_IN_REMOVED_AREA',
          message: `Cannot reduce stack size: ${occupiedLocations.length} occupied location(s) would be removed`,
          severity: 'error',
          retryable: false,
          userMessage: `Cannot reduce stack size. Please relocate containers from positions that will be removed.`
        });
      }

      // Deactivate locations that are outside new configuration
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
   * Delete all locations for a stack
   * Requirements: 2.5 - Handle location cleanup when stacks are deleted
   * 
   * @param stackId - Stack ID to delete locations for
   */
  async deleteLocationsForStack(stackId: string): Promise<void> {
    try {

      // Check if any locations are occupied
      const { data: occupiedLocations, error: checkError } = await supabase
        .from('locations')
        .select('id, location_id')
        .eq('stack_id', stackId)
        .eq('is_occupied', true)
        .eq('is_active', true);

      if (checkError) throw checkError;

      if (occupiedLocations && occupiedLocations.length > 0) {
        throw new GateInError({
          code: 'OCCUPIED_LOCATIONS_ON_STACK',
          message: `Cannot delete stack: ${occupiedLocations.length} occupied location(s) exist`,
          severity: 'error',
          retryable: false,
          userMessage: `Cannot delete stack. Please relocate all containers first.`
        });
      }

      // Soft delete (deactivate) all locations for this stack
      const { error: deleteError } = await supabase
        .from('locations')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('stack_id', stackId);

      if (deleteError) throw deleteError;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get all location IDs for a stack
   * 
   * @param stackId - Stack ID
   * @returns Array of location IDs
   */
  async getLocationIdsForStack(stackId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('location_id')
        .eq('stack_id', stackId)
        .eq('is_active', true)
        .order('location_id', { ascending: true });

      if (error) throw error;
      return (data || []).map(loc => loc.location_id);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
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
      containerId: data.container_id,
      containerSize: data.container_size,
      clientPoolId: data.client_pool_id,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }
}

export const locationIdGeneratorService = new LocationIdGeneratorService();
