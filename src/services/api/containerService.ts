import { supabase } from './supabaseClient';
import { Container } from '../../types';
import { locationManagementService } from './locationManagementService';
import { ContainerSizeEnum } from '../../types/location';
import { ErrorHandler, GateInError } from '../errorHandling';

export class ContainerService {
  async getAll(): Promise<Container[]> {
    const { data, error } = await supabase
      .from('containers')
      .select(`
        *,
        clients!containers_client_id_fkey(name, code),
        gate_in_operations(edi_transmitted, edi_transmission_date, edi_error_message)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ? data.map(this.mapToContainer) : [];
  }

  async getById(id: string): Promise<Container | null> {
    const { data, error } = await supabase
      .from('containers')
      .select(`
        *,
        clients!containers_client_id_fkey(name, code)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? this.mapToContainer(data) : null;
  }

  async getByClientCode(clientCode: string): Promise<Container[]> {
    const { data, error } = await supabase
      .from('containers')
      .select('*')
      .eq('client_code', clientCode)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapToContainer);
  }

  async getByYardId(yardId: string): Promise<Container[]> {
    const { data, error } = await supabase
      .from('containers')
      .select(`
        *,
        clients!containers_client_id_fkey(name, code)
      `)
      .eq('yard_id', yardId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapToContainer);
  }

  async getByStatus(status: Container['status']): Promise<Container[]> {
    const { data, error } = await supabase
      .from('containers')
      .select(`
        *,
        clients!containers_client_id_fkey(name, code)
      `)
      .eq('status', status)
      .order('created_at', { ascending: false});

    if (error) throw error;
    return data.map(this.mapToContainer);
  }

  async create(container: Omit<Container, 'id' | 'createdAt' | 'updatedAt'>): Promise<Container> {
    try {
      const { data, error } = await supabase
        .from('containers')
        .insert({
          number: container.number,
          type: container.type,
          size: container.size,
          status: container.status,
          full_empty: container.fullEmpty,
          location: container.location,
          yard_id: container.yardId,
          client_id: container.clientId,
          client_code: container.clientCode,
          gate_in_date: container.gateInDate?.toISOString(),
          gate_out_date: container.gateOutDate?.toISOString(),
          classification: container.classification,
          transaction_type: container.transactionType,
          damage: container.damage || [],
          booking_reference: container.bookingReference,
          created_by: container.createdBy
        })
        .select()
        .single();

      // Diagnostic logging — helps identify RLS / schema issues
      if (error) {
        console.error('[containerService.create] ❌ Supabase INSERT error:', {
          code: error.code,
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
          status: (error as any).status,
        });
        throw error;
      }

      // Guard: if data is null with no error, RLS SELECT policy blocked the row
      if (!data) {
        const rlsError = new Error(
          'INSERT returned no data — the row may have been blocked by a Row-Level Security (RLS) SELECT policy. ' +
          'Please run migration: 20260218000000_fix_container_rls_auth_uid.sql in the Supabase Dashboard.'
        );
        console.error('[containerService.create] ❌ NULL data after INSERT — likely RLS SELECT policy issue');
        throw rlsError;
      }

      return this.mapToContainer(data);
    } catch (error: any) {
      // Log raw error BEFORE wrapping — critical for diagnosing schema/RLS issues
      console.error('[containerService.create] ❌ RAW CATCH error:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        status: error?.status,
      });
      throw ErrorHandler.createGateInError(error);
    }
  }

  async update(id: string, updates: Partial<Container>): Promise<Container> {
    try {
      // Get current container to check for location changes
      const currentContainer = await this.getById(id);
      if (!currentContainer) {
        throw new GateInError({
          code: 'CONTAINER_NOT_FOUND',
          message: `Container not found: ${id}`,
          severity: 'error',
          retryable: false,
          userMessage: 'The specified container does not exist'
        });
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.number) updateData.number = updates.number;
      if (updates.type) updateData.type = updates.type;
      if (updates.size) updateData.size = updates.size;
      if (updates.status) updateData.status = updates.status;
      if (updates.fullEmpty !== undefined) updateData.full_empty = updates.fullEmpty; // Add full/empty status
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.yardId !== undefined) updateData.yard_id = updates.yardId;
      if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
      if (updates.clientCode !== undefined) updateData.client_code = updates.clientCode;
      if (updates.gateInDate !== undefined) updateData.gate_in_date = updates.gateInDate?.toISOString();
      if (updates.gateOutDate !== undefined) updateData.gate_out_date = updates.gateOutDate?.toISOString();
      if (updates.classification !== undefined) updateData.classification = updates.classification; // Add classification
      if (updates.transactionType !== undefined) updateData.transaction_type = updates.transactionType; // Add transaction type
      if (updates.damage !== undefined) updateData.damage = updates.damage;
      if (updates.bookingReference !== undefined) updateData.booking_reference = updates.bookingReference;
      if (updates.updatedBy) updateData.updated_by = updates.updatedBy;

      // Handle location changes - release old location if status changes to out_depot
      // Requirements: 4.3 - Ensure container status changes properly update location availability
      if (updates.status === 'out_depot' && currentContainer.status === 'in_depot') {
        // Container is leaving depot - release location if it has one
        if (currentContainer.location) {
          await this.releaseContainerLocation(id, currentContainer.location);
        }
      }

      const { data, error } = await supabase
        .from('containers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return this.mapToContainer(data);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Check if a container can be deleted and get blocking reasons
   */
  async checkDeletionConstraints(id: string): Promise<{
    canDelete: boolean;
    blockingReason: string | null;
    gateInCount: number;
    gateOutCount: number;
    locationAssigned: boolean;
    currentStatus: string;
  }> {
    try {
      const { data, error } = await supabase
        .rpc('check_container_deletion_constraints', { container_uuid: id });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new GateInError({
          code: 'CONTAINER_NOT_FOUND',
          message: 'Container not found',
          severity: 'error',
          retryable: false,
          userMessage: 'The specified container does not exist'
        });
      }

      const result = data[0];
      return {
        canDelete: result.can_delete,
        blockingReason: result.blocking_reason,
        gateInCount: result.gate_in_count,
        gateOutCount: result.gate_out_count,
        locationAssigned: result.location_assigned,
        currentStatus: result.current_status
      };
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Soft delete a container (marks as deleted instead of removing from database)
   */
  async delete(id: string): Promise<void> {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new GateInError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          severity: 'error',
          retryable: false,
          userMessage: 'You must be logged in to delete containers'
        });
      }

      // Get user record to pass user UUID
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userRecord) {
        throw new GateInError({
          code: 'USER_NOT_FOUND',
          message: 'User record not found',
          severity: 'error',
          retryable: false,
          userMessage: 'User profile not found'
        });
      }

      // Perform soft delete using database function
      const { data, error } = await supabase
        .rpc('soft_delete_container', {
          container_uuid: id,
          user_uuid: userRecord.id
        });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new GateInError({
          code: 'DELETE_FAILED',
          message: 'Delete operation returned no result',
          severity: 'error',
          retryable: false,
          userMessage: 'Failed to delete container'
        });
      }

      const result = data[0];

      if (!result.success) {
        throw new GateInError({
          code: 'DELETE_BLOCKED',
          message: result.blocking_reason || result.message,
          severity: 'warning',
          retryable: false,
          userMessage: result.blocking_reason || result.message
        });
      }
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Restore a soft-deleted container
   */
  async restore(id: string): Promise<void> {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new GateInError({
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          severity: 'error',
          retryable: false,
          userMessage: 'You must be logged in to restore containers'
        });
      }

      // Get user record
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userRecord) {
        throw new GateInError({
          code: 'USER_NOT_FOUND',
          message: 'User record not found',
          severity: 'error',
          retryable: false,
          userMessage: 'User profile not found'
        });
      }

      // Restore container
      const { data, error } = await supabase
        .rpc('restore_container', {
          container_uuid: id,
          user_uuid: userRecord.id
        });

      if (error) throw error;

      if (!data || data.length === 0 || !data[0].success) {
        throw new GateInError({
          code: 'RESTORE_FAILED',
          message: data?.[0]?.message || 'Failed to restore container',
          severity: 'error',
          retryable: false,
          userMessage: data?.[0]?.message || 'Failed to restore container'
        });
      }
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  // ============================================================================
  // LOCATION MANAGEMENT INTEGRATION METHODS
  // Requirements: 4.2, 4.3 - Container assignment and location tracking with UUID-based locations
  // ============================================================================

  /**
   * Assign container to a location using UUID-based location management
   * Requirements: 4.2 - Modify container assignment methods to use LocationManagementService
   */
  async assignContainerToLocation(
    containerId: string,
    locationId: string,
    clientPoolId?: string
  ): Promise<Container> {
    try {
      // Get container details
      const container = await this.getById(containerId);
      if (!container) {
        throw new GateInError({
          code: 'CONTAINER_NOT_FOUND',
          message: `Container not found: ${containerId}`,
          severity: 'error',
          retryable: false,
          userMessage: 'The specified container does not exist'
        });
      }

      // Convert container size to ContainerSizeEnum
      const containerSize = this.mapContainerSize(container.size);

      // Assign container to location using LocationManagementService
      // Requirements: 4.2 - Use LocationManagementService for container assignment
      const location = await locationManagementService.assignContainer({
        locationId,
        containerId,
        containerSize,
        clientPoolId: clientPoolId || undefined
      });

      // Update container with location information
      const updatedContainer = await this.update(containerId, {
        location: location.locationId,
        status: 'in_depot',
        updatedBy: container.updatedBy
      });

      return updatedContainer;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Release container from its current location
   * Requirements: 4.3 - Ensure container operations trigger proper location availability updates
   */
  async releaseContainerLocation(containerId: string, locationIdOrString?: string): Promise<void> {
    try {
      // Get container details
      const container = await this.getById(containerId);
      if (!container) {
        throw new GateInError({
          code: 'CONTAINER_NOT_FOUND',
          message: `Container not found: ${containerId}`,
          severity: 'error',
          retryable: false,
          userMessage: 'The specified container does not exist'
        });
      }

      // Determine location to release
      const locationToRelease = locationIdOrString || container.location;
      if (!locationToRelease) {
        return;
      }

      // Try to get location by location ID (SXXRXHX format) first, then by UUID
      let location = await locationManagementService.getByLocationId(locationToRelease);
      if (!location) {
        location = await locationManagementService.getById(locationToRelease);
      }

      if (!location) {
        return;
      }

      // Release location using LocationManagementService
      await locationManagementService.releaseLocation({
        locationId: location.id,
        containerId
      });
    } catch (error) {
      // Silent fail - don't block container operations
    }
  }

  /**
   * Move container from one location to another
   * Requirements: 4.2, 4.3 - Container location tracking with proper availability updates
   */
  async moveContainer(
    containerId: string,
    newLocationId: string,
    clientPoolId?: string
  ): Promise<Container> {
    try {
      // Get container details
      const container = await this.getById(containerId);
      if (!container) {
        throw new GateInError({
          code: 'CONTAINER_NOT_FOUND',
          message: `Container not found: ${containerId}`,
          severity: 'error',
          retryable: false,
          userMessage: 'The specified container does not exist'
        });
      }

      // Release old location if exists
      if (container.location) {
        await this.releaseContainerLocation(containerId, container.location);
      }

      // Assign to new location
      const updatedContainer = await this.assignContainerToLocation(
        containerId,
        newLocationId,
        clientPoolId
      );

      return updatedContainer;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get container's current location details
   * Requirements: 4.2 - Update container location tracking to use UUID-based location references
   */
  async getContainerLocation(containerId: string): Promise<{
    container: Container;
    location: any | null;
    isOccupied: boolean;
  }> {
    try {
      const container = await this.getById(containerId);
      if (!container) {
        throw new GateInError({
          code: 'CONTAINER_NOT_FOUND',
          message: `Container not found: ${containerId}`,
          severity: 'error',
          retryable: false,
          userMessage: 'The specified container does not exist'
        });
      }

      let location = null;
      if (container.location) {
        // Try to get location by location ID (SXXRXHX format) first, then by UUID
        location = await locationManagementService.getByLocationId(container.location);
        if (!location) {
          location = await locationManagementService.getById(container.location);
        }
      }

      return {
        container,
        location,
        isOccupied: location?.isOccupied || false
      };
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Bulk assign containers to locations
   * Requirements: 4.2 - Efficient bulk container assignment operations
   */
  async bulkAssignContainersToLocations(
    assignments: Array<{
      containerId: string;
      locationId: string;
      clientPoolId?: string;
    }>
  ): Promise<Container[]> {
    try {
      const results: Container[] = [];

      for (const assignment of assignments) {
        const container = await this.assignContainerToLocation(
          assignment.containerId,
          assignment.locationId,
          assignment.clientPoolId
        );
        results.push(container);
      }

      return results;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get containers by location
   * Requirements: 4.2 - Container location tracking with UUID-based references
   */
  async getContainersByLocation(locationIdOrString: string): Promise<Container[]> {
    try {
      // Try to get location by location ID (SXXRXHX format) first, then by UUID
      let location = await locationManagementService.getByLocationId(locationIdOrString);
      if (!location) {
        location = await locationManagementService.getById(locationIdOrString);
      }

      if (!location) {
        return [];
      }

      // Get containers at this location
      const { data, error } = await supabase
        .from('containers')
        .select(`
          *,
          clients!containers_client_id_fkey(name, code)
        `)
        .eq('location', location.locationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapToContainer);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  // ============================================================================
  // LOCATION VALIDATION METHODS
  // Requirements: 5.4, 7.4 - Location validation using new location management system
  // ============================================================================

  /**
   * Validate if a location is suitable for a container
   * Requirements: 5.4 - Implement location validation using new location management system
   */
  async validateLocationForContainer(
    containerId: string,
    locationIdOrString: string,
    clientPoolId?: string
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    location: any | null;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get container details
      const container = await this.getById(containerId);
      if (!container) {
        errors.push('Container not found');
        return { isValid: false, errors, warnings, location: null };
      }

      // Try to get location by location ID (SXXRXHX format) first, then by UUID
      let location = await locationManagementService.getByLocationId(locationIdOrString);
      if (!location) {
        location = await locationManagementService.getById(locationIdOrString);
      }

      if (!location) {
        errors.push('Location not found');
        return { isValid: false, errors, warnings, location: null };
      }

      // Check if location is active
      if (!location.isActive) {
        errors.push('Location is not active');
      }

      // Check if location is already occupied
      if (location.isOccupied) {
        errors.push(`Location ${location.locationId} is already occupied`);
      }

      // Validate container size compatibility
      // Requirements: 7.4 - Add container size compatibility checking with location constraints
      const containerSize = this.mapContainerSize(container.size);
      if (location.containerSize && location.containerSize !== containerSize) {
        errors.push(
          `Container size ${containerSize} does not match location size ${location.containerSize}`
        );
      }

      // Validate client pool access
      // Requirements: 5.4 - Update existing location validation logic in container operations
      const hasAccess = await locationManagementService.hasClientPoolAccess(
        location.id,
        clientPoolId || null
      );

      if (!hasAccess) {
        if (location.clientPoolId && !clientPoolId) {
          errors.push('Location requires a client pool assignment');
        } else if (location.clientPoolId && clientPoolId && location.clientPoolId !== clientPoolId) {
          errors.push('Location is assigned to a different client pool');
        } else if (!location.clientPoolId && clientPoolId) {
          errors.push('Location is not available for pooled clients');
        }
      }

      // Check if container already has a location
      if (container.location && container.location !== locationIdOrString) {
        warnings.push(
          `Container is currently at location ${container.location}. It will be moved to the new location.`
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        location
      };
    } catch (error) {
      errors.push('Validation failed due to an error');
      return { isValid: false, errors, warnings, location: null };
    }
  }

  /**
   * Validate container size compatibility with location
   * Requirements: 7.4 - Container size compatibility checking
   */
  async validateContainerSizeCompatibility(
    containerSize: string,
    locationIdOrString: string
  ): Promise<{
    isCompatible: boolean;
    locationSize?: ContainerSizeEnum;
    message: string;
  }> {
    try {
      // Try to get location by location ID (SXXRXHX format) first, then by UUID
      let location = await locationManagementService.getByLocationId(locationIdOrString);
      if (!location) {
        location = await locationManagementService.getById(locationIdOrString);
      }

      if (!location) {
        return {
          isCompatible: false,
          message: 'Location not found'
        };
      }

      // If location has no size constraint, it's compatible with any size
      if (!location.containerSize) {
        return {
          isCompatible: true,
          message: 'Location accepts any container size'
        };
      }

      // Map and compare sizes
      const mappedContainerSize = this.mapContainerSize(containerSize);
      const isCompatible = location.containerSize === mappedContainerSize;

      return {
        isCompatible,
        locationSize: location.containerSize,
        message: isCompatible
          ? `Container size ${mappedContainerSize} is compatible with location`
          : `Container size ${mappedContainerSize} is not compatible with location size ${location.containerSize}`
      };
    } catch (error) {
      return {
        isCompatible: false,
        message: 'Size compatibility check failed'
      };
    }
  }

  /**
   * Check if a location is available for a specific container
   * Requirements: 5.4 - Location availability validation
   */
  async isLocationAvailableForContainer(
    containerId: string,
    locationIdOrString: string,
    clientPoolId?: string
  ): Promise<boolean> {
    try {
      const validation = await this.validateLocationForContainer(
        containerId,
        locationIdOrString,
        clientPoolId
      );
      return validation.isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available locations for a container
   * Requirements: 5.4, 7.4 - Find suitable locations based on container requirements
   */
  async getAvailableLocationsForContainer(
    containerId: string,
    yardId: string,
    clientPoolId?: string,
    limit?: number
  ): Promise<any[]> {
    try {
      // Get container details
      const container = await this.getById(containerId);
      if (!container) {
        throw new GateInError({
          code: 'CONTAINER_NOT_FOUND',
          message: `Container not found: ${containerId}`,
          severity: 'error',
          retryable: false,
          userMessage: 'The specified container does not exist'
        });
      }

      // Map container size
      const containerSize = this.mapContainerSize(container.size);

      // Get available locations with client pool access
      // Requirements: 7.4 - Filter locations based on container size and client pool
      const locations = await locationManagementService.getAvailableLocationsWithPoolAccess(
        yardId,
        clientPoolId || null,
        containerSize,
        limit
      );

      return locations;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Validate bulk container assignments
   * Requirements: 5.4 - Batch validation for bulk operations
   */
  async validateBulkAssignments(
    assignments: Array<{
      containerId: string;
      locationId: string;
      clientPoolId?: string;
    }>
  ): Promise<{
    validAssignments: Array<{
      containerId: string;
      locationId: string;
      clientPoolId?: string;
    }>;
    invalidAssignments: Array<{
      containerId: string;
      locationId: string;
      clientPoolId?: string;
      errors: string[];
    }>;
    totalValid: number;
    totalInvalid: number;
  }> {
    const validAssignments: Array<{
      containerId: string;
      locationId: string;
      clientPoolId?: string;
    }> = [];
    const invalidAssignments: Array<{
      containerId: string;
      locationId: string;
      clientPoolId?: string;
      errors: string[];
    }> = [];

    for (const assignment of assignments) {
      const validation = await this.validateLocationForContainer(
        assignment.containerId,
        assignment.locationId,
        assignment.clientPoolId
      );

      if (validation.isValid) {
        validAssignments.push(assignment);
      } else {
        invalidAssignments.push({
          ...assignment,
          errors: validation.errors
        });
      }
    }

    return {
      validAssignments,
      invalidAssignments,
      totalValid: validAssignments.length,
      totalInvalid: invalidAssignments.length
    };
  }

  /**
   * Map container size to ContainerSizeEnum
   */
  private mapContainerSize(size: string): ContainerSizeEnum {
    if (size === '20ft' || size === '20ft') {
      return '20ft' as ContainerSizeEnum;
    } else if (size === '40ft' || size === '40ft') {
      return '40ft' as ContainerSizeEnum;
    }
    throw new GateInError({
      code: 'INVALID_CONTAINER_SIZE',
      message: `Invalid container size: ${size}`,
      severity: 'error',
      retryable: false,
      userMessage: 'Container size must be 20ft or 40ft'
    });
  }

  private mapToContainer(data: any): Container {
    // Get EDI info from gate_in_operations if available
    const gateInOp = data.gate_in_operations?.[0];
    
    return {
      id: data.id,
      number: data.number,
      type: data.type,
      size: data.size,
      status: data.status,
      fullEmpty: data.full_empty, // Map full/empty status
      location: data.location,
      yardId: data.yard_id,
      clientId: data.client_id,
      clientName: data.clients?.name || '',
      clientCode: data.client_code,
      gateInDate: data.gate_in_date ? new Date(data.gate_in_date) : undefined,
      gateOutDate: data.gate_out_date ? new Date(data.gate_out_date) : undefined,
      classification: data.classification, // Map classification
      transactionType: data.transaction_type, // Map transaction type
      damage: data.damage || [],
      auditLogs: data.audit_logs || [], // Map audit logs
      bookingReference: data.booking_reference,
      createdBy: data.created_by,
      updatedBy: data.updated_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      placedAt: data.gate_in_date ? new Date(data.gate_in_date) : undefined,
      // EDI fields from gate_in_operations
      ediTransmitted: gateInOp?.edi_transmitted || false,
      ediTransmissionDate: gateInOp?.edi_transmission_date ? new Date(gateInOp.edi_transmission_date) : undefined,
      ediErrorMessage: gateInOp?.edi_error_message,
      // Soft delete fields
      isDeleted: data.is_deleted || false,
      deletedAt: data.deleted_at ? new Date(data.deleted_at) : undefined,
      deletedBy: data.deleted_by
    };
  }
}

export const containerService = new ContainerService();
