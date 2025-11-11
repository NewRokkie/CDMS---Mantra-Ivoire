/**
 * Migration Service
 * 
 * Handles migration from string-based location IDs to UUID-based database records.
 * Provides data validation, integrity checking, and mapping between old and new systems.
 * 
 * Requirements Addressed:
 * - 8.1: Create mapping tables between old string IDs and new UUID-based records
 * - 8.4: Validate that all existing container assignments are properly migrated
 * - 8.5: Provide detailed migration reports and error handling
 */

import { supabase } from './supabaseClient';
import { ErrorHandler, GateInError } from '../errorHandling';
import { Location, LocationIdMapping } from '../../types/location';
import { locationIdGeneratorService } from './locationIdGeneratorService';
import { locationManagementService } from './locationManagementService';
import { logger } from '../../utils/logger';

export interface MigrationBatch {
  id: string;
  batchName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: MigrationError[];
  startedAt?: Date;
  completedAt?: Date;
  createdBy?: string;
}

export interface MigrationError {
  legacyId: string;
  errorCode: string;
  errorMessage: string;
  timestamp: Date;
}

export interface MigrationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
}

export interface MigrationReport {
  batchId: string;
  batchName: string;
  status: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  skippedRecords: number;
  duration: number; // milliseconds
  errors: MigrationError[];
  warnings: string[];
  startedAt: Date;
  completedAt?: Date;
}

export interface LegacyLocationData {
  legacyId: string; // Old string-based location ID
  stackId: string;
  yardId: string;
  rowNumber?: number;
  tierNumber?: number;
  isOccupied?: boolean;
  containerId?: string;
  containerSize?: '20ft' | '40ft';
  clientPoolId?: string;
}

export class MigrationService {
  /**
   * Create a new migration batch
   * Requirements: 8.5 - Detailed migration reports
   */
  async createMigrationBatch(batchName: string, createdBy?: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('migration_batches')
        .insert({
          batch_name: batchName,
          status: 'pending',
          total_records: 0,
          processed_records: 0,
          successful_records: 0,
          failed_records: 0,
          errors: [],
          created_by: createdBy
        })
        .select('id')
        .single();

      if (error) throw error;

      logger.info(`Created migration batch: ${batchName}`, 'MigrationService', { batchId: data.id });
      return data.id;
    } catch (error) {
      logger.error('Failed to create migration batch', 'MigrationService', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Validate legacy location data before migration
   * Requirements: 8.4 - Data validation during migration
   */
  async validateLegacyData(
    legacyData: LegacyLocationData[]
  ): Promise<MigrationValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let validRecords = 0;
    let invalidRecords = 0;

    const seenLegacyIds = new Set<string>();

    for (const record of legacyData) {
      let isValid = true;

      // Check for required fields
      if (!record.legacyId) {
        errors.push(`Record missing legacy ID`);
        isValid = false;
      }

      if (!record.stackId) {
        errors.push(`Record ${record.legacyId}: missing stack ID`);
        isValid = false;
      }

      if (!record.yardId) {
        errors.push(`Record ${record.legacyId}: missing yard ID`);
        isValid = false;
      }

      // Check for duplicate legacy IDs
      if (record.legacyId && seenLegacyIds.has(record.legacyId)) {
        errors.push(`Duplicate legacy ID: ${record.legacyId}`);
        isValid = false;
      } else if (record.legacyId) {
        seenLegacyIds.add(record.legacyId);
      }

      // Validate row and tier numbers if provided
      if (record.rowNumber !== undefined && (record.rowNumber < 1 || record.rowNumber > 9)) {
        errors.push(`Record ${record.legacyId}: invalid row number ${record.rowNumber}`);
        isValid = false;
      }

      if (record.tierNumber !== undefined && (record.tierNumber < 1 || record.tierNumber > 9)) {
        errors.push(`Record ${record.legacyId}: invalid tier number ${record.tierNumber}`);
        isValid = false;
      }

      // Validate container size if provided
      if (record.containerSize && !['20ft', '40ft'].includes(record.containerSize)) {
        errors.push(`Record ${record.legacyId}: invalid container size ${record.containerSize}`);
        isValid = false;
      }

      // Warning if occupied but no container ID
      if (record.isOccupied && !record.containerId) {
        warnings.push(`Record ${record.legacyId}: marked as occupied but no container ID provided`);
      }

      if (isValid) {
        validRecords++;
      } else {
        invalidRecords++;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalRecords: legacyData.length,
      validRecords,
      invalidRecords
    };
  }

  /**
   * Migrate a single legacy location record to UUID-based system
   * Requirements: 8.1 - Migration logic from string-based to UUID records
   */
  async migrateSingleLocation(
    legacyData: LegacyLocationData,
    batchId: string
  ): Promise<{ location: Location; mapping: LocationIdMapping } | null> {
    try {
      // Check if this legacy ID has already been migrated
      const existingMapping = await this.getLegacyMapping(legacyData.legacyId);
      if (existingMapping) {
        logger.warn(`Legacy ID already migrated, skipping`, 'MigrationService', { legacyId: legacyData.legacyId });
        return null;
      }

      // Parse legacy location ID to extract stack number, row, and tier
      // This assumes legacy IDs follow a parseable format
      const { stackNumber, row, tier } = this.parseLegacyLocationId(
        legacyData.legacyId,
        legacyData.rowNumber,
        legacyData.tierNumber
      );

      // Generate new location ID in SXXRXHX format
      const newLocationId = locationIdGeneratorService.generateLocationId(
        stackNumber,
        row,
        tier
      );

      // Check if location already exists
      const existingLocation = await locationManagementService.getByLocationId(newLocationId);
      
      let location: Location;
      
      if (existingLocation) {
        // Update existing location with legacy data
        location = await locationManagementService.update(existingLocation.id, {
          isOccupied: legacyData.isOccupied || false,
          containerId: legacyData.containerId,
          containerSize: legacyData.containerSize,
          clientPoolId: legacyData.clientPoolId
        });
        logger.info(`Updated existing location with legacy data`, 'MigrationService', { locationId: newLocationId });
      } else {
        // Create new location record
        location = await locationManagementService.create({
          locationId: newLocationId,
          stackId: legacyData.stackId,
          yardId: legacyData.yardId,
          rowNumber: row,
          tierNumber: tier,
          isVirtual: false,
          isOccupied: legacyData.isOccupied || false,
          containerId: legacyData.containerId,
          containerSize: legacyData.containerSize,
          clientPoolId: legacyData.clientPoolId,
          isActive: true
        });
        logger.info(`Created new location from legacy data`, 'MigrationService', { locationId: newLocationId });
      }

      // Create mapping record
      const { data: mappingData, error: mappingError } = await supabase
        .from('location_id_mappings')
        .insert({
          legacy_string_id: legacyData.legacyId,
          new_location_id: location.id,
          migration_batch_id: batchId
        })
        .select()
        .single();

      if (mappingError) throw mappingError;

      const mapping: LocationIdMapping = {
        id: mappingData.id,
        legacyStringId: mappingData.legacy_string_id,
        newLocationId: mappingData.new_location_id,
        migrationBatchId: mappingData.migration_batch_id,
        migratedAt: new Date(mappingData.created_at)
      };

      return { location, mapping };
    } catch (error) {
      logger.error(`Failed to migrate single location`, 'MigrationService', { legacyId: legacyData.legacyId, error });
      throw error;
    }
  }

  /**
   * Migrate multiple legacy location records in batch
   * Requirements: 8.1, 8.4, 8.5 - Comprehensive migration with validation and reporting
   */
  async migrateLegacyLocations(
    legacyData: LegacyLocationData[],
    batchName: string,
    createdBy?: string
  ): Promise<MigrationReport> {
    const startTime = Date.now();
    const startedAt = new Date();

    logger.info(`Starting migration batch`, 'MigrationService', { batchName, recordCount: legacyData.length });

    // Validate data first
    const validation = await this.validateLegacyData(legacyData);
    if (!validation.isValid) {
      const errorSummary = validation.errors.slice(0, 3).join('; ');
      throw new GateInError({
        code: 'MIGRATION_VALIDATION_FAILED',
        message: `Migration validation failed: ${validation.errors.length} errors found`,
        severity: 'error',
        retryable: false,
        userMessage: `Cannot proceed with migration. Please fix validation errors first.`,
        technicalDetails: `Errors: ${errorSummary}${validation.errors.length > 3 ? '...' : ''}`
      });
    }

    // Create migration batch
    const batchId = await this.createMigrationBatch(batchName, createdBy);

    // Update batch status to in_progress
    await this.updateBatchStatus(batchId, 'in_progress', {
      total_records: legacyData.length,
      started_at: startedAt.toISOString()
    });

    const errors: MigrationError[] = [];
    let successfulRecords = 0;
    let failedRecords = 0;
    let skippedRecords = 0;

    // Process each record
    for (let i = 0; i < legacyData.length; i++) {
      const record = legacyData[i];
      
      try {
        const result = await this.migrateSingleLocation(record, batchId);
        
        if (result === null) {
          skippedRecords++;
        } else {
          successfulRecords++;
        }

        // Update progress
        await this.updateBatchProgress(batchId, i + 1, successfulRecords, failedRecords);
      } catch (error: any) {
        failedRecords++;
        errors.push({
          legacyId: record.legacyId,
          errorCode: error.code || 'UNKNOWN_ERROR',
          errorMessage: error.message || 'Unknown error occurred',
          timestamp: new Date()
        });

        logger.error(`Failed to migrate record`, 'MigrationService', { legacyId: record.legacyId, error: error.message });
      }
    }

    const completedAt = new Date();
    const duration = Date.now() - startTime;

    // Update batch status to completed or failed
    const finalStatus = failedRecords === 0 ? 'completed' : 'failed';
    await this.updateBatchStatus(batchId, finalStatus, {
      processed_records: legacyData.length,
      successful_records: successfulRecords,
      failed_records: failedRecords,
      errors: errors,
      completed_at: completedAt.toISOString()
    });

    const report: MigrationReport = {
      batchId,
      batchName,
      status: finalStatus,
      totalRecords: legacyData.length,
      successfulRecords,
      failedRecords,
      skippedRecords,
      duration,
      errors,
      warnings: validation.warnings,
      startedAt,
      completedAt
    };

    logger.info(`Migration batch completed`, 'MigrationService', {
      batchName,
      successfulRecords,
      failedRecords,
      skippedRecords,
      durationSeconds: (duration / 1000).toFixed(2)
    });

    return report;
  }

  /**
   * Get mapping for a legacy location ID
   * Requirements: 8.1 - Mapping tables between old and new IDs
   */
  async getLegacyMapping(legacyId: string): Promise<LocationIdMapping | null> {
    try {
      const { data, error } = await supabase
        .from('location_id_mappings')
        .select('*')
        .eq('legacy_string_id', legacyId)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      return {
        id: data.id,
        legacyStringId: data.legacy_string_id,
        newLocationId: data.new_location_id,
        migrationBatchId: data.migration_batch_id,
        migratedAt: new Date(data.created_at)
      };
    } catch (error) {
      logger.error('Failed to get legacy mapping', 'MigrationService', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get new location UUID from legacy string ID
   * Requirements: 8.1 - Translation between old and new IDs
   */
  async getNewLocationId(legacyId: string): Promise<string | null> {
    const mapping = await this.getLegacyMapping(legacyId);
    return mapping?.newLocationId || null;
  }

  /**
   * Get legacy string ID from new location UUID
   * Requirements: 8.1 - Bidirectional mapping
   */
  async getLegacyLocationId(newLocationId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('location_id_mappings')
        .select('legacy_string_id')
        .eq('new_location_id', newLocationId)
        .maybeSingle();

      if (error) throw error;
      return data?.legacy_string_id || null;
    } catch (error) {
      logger.error('Failed to get legacy location ID', 'MigrationService', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get all mappings for a migration batch
   * Requirements: 8.5 - Migration reporting
   */
  async getBatchMappings(batchId: string): Promise<LocationIdMapping[]> {
    try {
      const { data, error } = await supabase
        .from('location_id_mappings')
        .select('*')
        .eq('migration_batch_id', batchId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(d => ({
        id: d.id,
        legacyStringId: d.legacy_string_id,
        newLocationId: d.new_location_id,
        migrationBatchId: d.migration_batch_id,
        migratedAt: new Date(d.created_at)
      }));
    } catch (error) {
      logger.error('Failed to get batch mappings', 'MigrationService', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get migration batch details
   * Requirements: 8.5 - Detailed migration reports
   */
  async getMigrationBatch(batchId: string): Promise<MigrationBatch | null> {
    try {
      const { data, error } = await supabase
        .from('migration_batches')
        .select('*')
        .eq('id', batchId)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      return {
        id: data.id,
        batchName: data.batch_name,
        status: data.status,
        totalRecords: data.total_records,
        processedRecords: data.processed_records,
        successfulRecords: data.successful_records,
        failedRecords: data.failed_records,
        errors: data.errors || [],
        startedAt: data.started_at ? new Date(data.started_at) : undefined,
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        createdBy: data.created_by
      };
    } catch (error) {
      logger.error('Failed to get migration batch', 'MigrationService', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get all migration batches
   * Requirements: 8.5 - Migration reporting
   */
  async getAllMigrationBatches(): Promise<MigrationBatch[]> {
    try {
      const { data, error } = await supabase
        .from('migration_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(d => ({
        id: d.id,
        batchName: d.batch_name,
        status: d.status,
        totalRecords: d.total_records,
        processedRecords: d.processed_records,
        successfulRecords: d.successful_records,
        failedRecords: d.failed_records,
        errors: d.errors || [],
        startedAt: d.started_at ? new Date(d.started_at) : undefined,
        completedAt: d.completed_at ? new Date(d.completed_at) : undefined,
        createdBy: d.created_by
      }));
    } catch (error) {
      logger.error('Failed to get all migration batches', 'MigrationService', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Rollback a migration batch
   * Requirements: 8.5 - Migration error handling and rollback
   */
  async rollbackMigrationBatch(batchId: string): Promise<void> {
    try {
      logger.info(`Rolling back migration batch`, 'MigrationService', { batchId });

      // Get all mappings for this batch
      const mappings = await this.getBatchMappings(batchId);

      let deletedCount = 0;
      let errorCount = 0;

      // Delete each migrated location
      for (const mapping of mappings) {
        try {
          await locationManagementService.hardDelete(mapping.newLocationId);
          deletedCount++;
        } catch (error) {
          logger.error(`Failed to delete location during rollback`, 'MigrationService', { locationId: mapping.newLocationId, error });
          errorCount++;
        }
      }

      // Delete all mappings for this batch
      const { error: deleteMappingsError } = await supabase
        .from('location_id_mappings')
        .delete()
        .eq('migration_batch_id', batchId);

      if (deleteMappingsError) throw deleteMappingsError;

      // Update batch status
      await this.updateBatchStatus(batchId, 'rolled_back', {
        completed_at: new Date().toISOString()
      });

      logger.info(`Rollback completed`, 'MigrationService', { deletedCount, errorCount });
    } catch (error) {
      logger.error('Failed to rollback migration batch', 'MigrationService', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Validate migration integrity
   * Requirements: 8.4 - Data validation and integrity checking
   */
  async validateMigrationIntegrity(batchId: string): Promise<{
    isValid: boolean;
    errors: string[];
    totalMappings: number;
    validMappings: number;
    invalidMappings: number;
  }> {
    const errors: string[] = [];
    const mappings = await this.getBatchMappings(batchId);
    let validMappings = 0;
    let invalidMappings = 0;

    for (const mapping of mappings) {
      // Check if new location exists
      const location = await locationManagementService.getById(mapping.newLocationId);
      if (!location) {
        errors.push(`Mapping ${mapping.id}: new location ${mapping.newLocationId} not found`);
        invalidMappings++;
        continue;
      }

      // Check if location is active
      if (!location.isActive) {
        errors.push(`Mapping ${mapping.id}: location ${location.locationId} is not active`);
        invalidMappings++;
        continue;
      }

      validMappings++;
    }

    return {
      isValid: errors.length === 0,
      errors,
      totalMappings: mappings.length,
      validMappings,
      invalidMappings
    };
  }

  /**
   * Parse legacy location ID to extract components
   * This is a helper method that attempts to parse various legacy formats
   */
  private parseLegacyLocationId(
    legacyId: string,
    rowNumber?: number,
    tierNumber?: number
  ): { stackNumber: number; row: number; tier: number } {
    // Try to parse if legacy ID follows SXXRXHX format
    const sxxrxhxPattern = /^S(\d{2})R(\d{1})H(\d{1})$/;
    const match = legacyId.match(sxxrxhxPattern);

    if (match) {
      return {
        stackNumber: parseInt(match[1], 10),
        row: parseInt(match[2], 10),
        tier: parseInt(match[3], 10)
      };
    }

    // Try other common formats
    // Format: "Stack-01-R2-H3" or "S01-R2-H3"
    const dashPattern = /(?:Stack-)?(\d{1,2})-?R(\d{1})-?H(\d{1})/i;
    const dashMatch = legacyId.match(dashPattern);

    if (dashMatch) {
      return {
        stackNumber: parseInt(dashMatch[1], 10),
        row: parseInt(dashMatch[2], 10),
        tier: parseInt(dashMatch[3], 10)
      };
    }

    // If we have explicit row and tier numbers, try to extract stack number
    if (rowNumber !== undefined && tierNumber !== undefined) {
      // Try to extract any number from the legacy ID as stack number
      const numberMatch = legacyId.match(/(\d+)/);
      if (numberMatch) {
        return {
          stackNumber: parseInt(numberMatch[1], 10),
          row: rowNumber,
          tier: tierNumber
        };
      }
    }

    // If all else fails, throw an error
    throw new GateInError({
      code: 'UNPARSEABLE_LEGACY_ID',
      message: `Cannot parse legacy location ID: ${legacyId}`,
      severity: 'error',
      retryable: false,
      userMessage: `Legacy location ID format not recognized: ${legacyId}`
    });
  }

  /**
   * Update migration batch status
   */
  private async updateBatchStatus(
    batchId: string,
    status: string,
    updates: Record<string, any> = {}
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('migration_batches')
        .update({
          status,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId);

      if (error) throw error;
    } catch (error) {
      logger.error('Failed to update batch status', 'MigrationService', error);
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Update migration batch progress
   */
  private async updateBatchProgress(
    batchId: string,
    processedRecords: number,
    successfulRecords: number,
    failedRecords: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('migration_batches')
        .update({
          processed_records: processedRecords,
          successful_records: successfulRecords,
          failed_records: failedRecords,
          updated_at: new Date().toISOString()
        })
        .eq('id', batchId);

      if (error) throw error;
    } catch (error) {
      logger.warn('Failed to update batch progress', 'MigrationService', error);
      // Don't throw error for progress updates to avoid interrupting migration
    }
  }
}

export const migrationService = new MigrationService();
