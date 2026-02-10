/**
 * Location Management Service
 * 
 * Core orchestrator for all location-related operations in the database-driven
 * location management system. Provides unified API for location queries, updates,
 * and availability tracking.
 * 
 * Requirements Addressed:
 * - 2.1: Automatic location ID generation when stacks are created/modified
 * - 2.2: Location ID format validation and uniqueness
 * - 4.1: Real-time location occupancy tracking
 * - 7.1: Location search and filtering capabilities
 */

import { supabase } from './supabaseClient';
import {
  Location,
  LocationCriteria,
  LocationQuery,
  LocationAvailabilityQuery,
  LocationAssignmentRequest,
  LocationReleaseRequest,
  LocationStatistics,
  StackOccupancyStatistics,
  ContainerSizeEnum
} from '../../types/location';
import { ErrorHandler, GateInError } from '../errorHandling';
import { locationCacheService } from './locationCacheService';
import { performanceMonitoringService, trackPerformance } from './performanceMonitoringService';
import { logger } from '../../utils/logger';

export class LocationManagementService {
  /**
   * Get all locations with optional filtering
   * Requirements: 7.1 - Location search and filtering
   */
  async getAll(criteria?: LocationCriteria): Promise<Location[]> {
    try {
      let query = supabase
        .from('locations')
        .select('*')
        .order('location_id', { ascending: true });

      // Apply filters
      if (criteria?.yardId) {
        query = query.eq('yard_id', criteria.yardId);
      }
      if (criteria?.stackId) {
        query = query.eq('stack_id', criteria.stackId);
      }
      if (criteria?.isOccupied !== undefined) {
        query = query.eq('is_occupied', criteria.isOccupied);
      }
      if (criteria?.containerSize) {
        query = query.eq('container_size', criteria.containerSize);
      }
      if (criteria?.clientPoolId) {
        query = query.eq('client_pool_id', criteria.clientPoolId);
      }
      if (criteria?.isVirtual !== undefined) {
        query = query.eq('is_virtual', criteria.isVirtual);
      }
      if (criteria?.isActive !== undefined) {
        query = query.eq('is_active', criteria.isActive);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(this.mapToLocation);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get location by UUID
   * Requirements: 9.1 - Cache location details for performance
   */
  async getById(id: string): Promise<Location | null> {
    return trackPerformance('getById', async () => {
      try {
        // Check cache first
        const cached = await locationCacheService.getCachedLocationById(id);
        if (cached) {
          return cached;
        }

        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        
        const location = data ? this.mapToLocation(data) : null;
        
        // Cache the result
        if (location) {
          await locationCacheService.cacheLocationById(location);
        }
        
        return location;
      } catch (error) {
        logger.error('LocationManagementService.getById error:', 'locationManagementService.ts', error);
        throw ErrorHandler.createGateInError(error);
      }
    }, { locationId: id });
  }

  /**
   * Get location by location ID (SXXRXHX format)
   * Requirements: 2.2 - Location ID format validation, 9.1 - Cache location details
   */
  async getByLocationId(locationId: string): Promise<Location | null> {
    return trackPerformance('getByLocationId', async () => {
      try {
        // Validate location ID format
        if (!this.validateLocationIdFormat(locationId)) {
          throw new GateInError({
            code: 'INVALID_LOCATION_ID',
            message: `Invalid location ID format: ${locationId}`,
            severity: 'error',
            retryable: false,
            userMessage: 'Location ID must be in SXXRXHX format (e.g., S01R2H3)'
          });
        }

        // Check cache first
        const cached = await locationCacheService.getCachedLocationByLocationId(locationId);
        if (cached) {
          return cached;
        }

        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('location_id', locationId)
          .maybeSingle();

        if (error) throw error;
        
        const location = data ? this.mapToLocation(data) : null;
        
        // Cache the result
        if (location) {
          await locationCacheService.cacheLocationByLocationId(location);
        }
        
        return location;
      } catch (error) {
        logger.error('LocationManagementService.getByLocationId error:', 'locationManagementService.ts', error);
        throw ErrorHandler.createGateInError(error);
      }
    }, { locationId });
  }

  /**
   * Search locations with advanced filtering and pagination
   * Requirements: 7.1, 7.2 - Location search with performance optimization
   */
  async search(query: LocationQuery): Promise<Location[]> {
    try {
      let dbQuery = supabase
        .from('locations')
        .select('*');

      // Apply all filters from LocationQuery
      if (query.yardId) dbQuery = dbQuery.eq('yard_id', query.yardId);
      if (query.stackId) dbQuery = dbQuery.eq('stack_id', query.stackId);
      if (query.locationId) dbQuery = dbQuery.eq('location_id', query.locationId);
      if (query.rowNumber !== undefined) dbQuery = dbQuery.eq('row_number', query.rowNumber);
      if (query.tierNumber !== undefined) dbQuery = dbQuery.eq('tier_number', query.tierNumber);
      if (query.isOccupied !== undefined) dbQuery = dbQuery.eq('is_occupied', query.isOccupied);
      if (query.containerSize) dbQuery = dbQuery.eq('container_size', query.containerSize);
      if (query.clientPoolId) dbQuery = dbQuery.eq('client_pool_id', query.clientPoolId);
      if (query.containerId) dbQuery = dbQuery.eq('container_id', query.containerId);
      if (query.isVirtual !== undefined) dbQuery = dbQuery.eq('is_virtual', query.isVirtual);
      if (query.isActive !== undefined) dbQuery = dbQuery.eq('is_active', query.isActive);

      // Apply ordering
      const orderBy = query.orderBy || 'location_id';
      const orderDirection = query.orderDirection || 'asc';
      dbQuery = dbQuery.order(this.mapOrderByField(orderBy), { ascending: orderDirection === 'asc' });

      // Apply pagination
      if (query.limit) {
        dbQuery = dbQuery.limit(query.limit);
      }
      if (query.offset) {
        dbQuery = dbQuery.range(query.offset, query.offset + (query.limit || 100) - 1);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;
      return (data || []).map(this.mapToLocation);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get available locations based on criteria
   * Requirements: 4.1, 4.4, 6.1 - Location availability queries with filters and client pool support
   * Requirements: 9.1 - Cache hot availability data
   */
  async getAvailableLocations(query: LocationAvailabilityQuery): Promise<Location[]> {
    return trackPerformance('getAvailableLocations', async () => {
      try {
        // Check cache first (only for queries without stack filter and limit)
        if (!query.stackId && !query.limit) {
          const cached = await locationCacheService.getCachedAvailableLocations(
            query.yardId,
            query.containerSize,
            query.clientPoolId
          );
          if (cached) {
            return cached;
          }
        }

        let dbQuery = supabase
          .from('locations')
          .select('*')
          .eq('yard_id', query.yardId)
          .eq('is_occupied', false)
          .eq('is_active', true);

        // Apply optional filters
        if (query.containerSize) {
          dbQuery = dbQuery.eq('container_size', query.containerSize);
        }
        if (query.clientPoolId) {
          dbQuery = dbQuery.eq('client_pool_id', query.clientPoolId);
        }
        if (query.stackId) {
          dbQuery = dbQuery.eq('stack_id', query.stackId);
        }

        // Order by location_id for consistent results
        dbQuery = dbQuery.order('location_id', { ascending: true });

        // Apply limit
        if (query.limit) {
          dbQuery = dbQuery.limit(query.limit);
        }

        const { data, error } = await dbQuery;

        if (error) throw error;
        const locations = (data || []).map(this.mapToLocation);
        
        // Cache the result (only for queries without stack filter and limit)
        if (!query.stackId && !query.limit) {
          await locationCacheService.cacheAvailableLocations(
            query.yardId,
            locations,
            query.containerSize,
            query.clientPoolId
          );
        }
        
        return locations;
      } catch (error) {
        logger.error('LocationManagementService.getAvailableLocations error:', 'locationManagementService.ts', error);
        throw ErrorHandler.createGateInError(error);
      }
    }, { yardId: query.yardId, containerSize: query.containerSize, clientPoolId: query.clientPoolId });
  }

  /**
   * Get available locations for pooled clients
   * Requirements: 6.1, 6.3 - Separate availability queries for pooled clients
   */
  async getAvailableLocationsForPooledClient(
    yardId: string,
    clientPoolId: string,
    containerSize?: ContainerSizeEnum,
    limit?: number
  ): Promise<Location[]> {
    try {
      let dbQuery = supabase
        .from('locations')
        .select('*')
        .eq('yard_id', yardId)
        .eq('is_occupied', false)
        .eq('is_active', true)
        .eq('client_pool_id', clientPoolId);

      // Apply container size filter if specified
      if (containerSize) {
        dbQuery = dbQuery.eq('container_size', containerSize);
      }

      // Order by location_id for consistent results
      dbQuery = dbQuery.order('location_id', { ascending: true });

      // Apply limit
      if (limit) {
        dbQuery = dbQuery.limit(limit);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;
      
      return (data || []).map(this.mapToLocation);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get available locations for unpooled clients
   * Requirements: 6.3, 6.4 - Separate availability queries for unpooled clients
   */
  async getAvailableLocationsForUnpooledClient(
    yardId: string,
    containerSize?: ContainerSizeEnum,
    limit?: number
  ): Promise<Location[]> {
    try {
      let dbQuery = supabase
        .from('locations')
        .select('*')
        .eq('yard_id', yardId)
        .eq('is_occupied', false)
        .eq('is_active', true)
        .is('client_pool_id', null);

      // Apply container size filter if specified
      if (containerSize) {
        dbQuery = dbQuery.eq('container_size', containerSize);
      }

      // Order by location_id for consistent results
      dbQuery = dbQuery.order('location_id', { ascending: true });

      // Apply limit
      if (limit) {
        dbQuery = dbQuery.limit(limit);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;
      
      return (data || []).map(this.mapToLocation);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get available locations with client pool access validation
   * Requirements: 6.1, 6.2, 6.3, 6.4 - Filter locations based on client pool assignments
   */
  async getAvailableLocationsWithPoolAccess(
    yardId: string,
    clientPoolId: string | null,
    containerSize?: ContainerSizeEnum,
    limit?: number
  ): Promise<Location[]> {
    try {
      // If client has a pool, return only locations assigned to that pool
      if (clientPoolId) {
        return await this.getAvailableLocationsForPooledClient(
          yardId,
          clientPoolId,
          containerSize,
          limit
        );
      }

      // If client has no pool, return all unassigned locations
      return await this.getAvailableLocationsForUnpooledClient(
        yardId,
        containerSize,
        limit
      );
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get locations by stack ID
   * Requirements: 9.1 - Cache stack locations
   */
  async getByStackId(stackId: string): Promise<Location[]> {
    return trackPerformance('getByStackId', async () => {
      try {
        // Check cache first
        const cached = await locationCacheService.getCachedStackLocations(stackId);
        if (cached) {
          return cached;
        }

        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('stack_id', stackId)
          .eq('is_active', true)
          .order('row_number', { ascending: true })
          .order('tier_number', { ascending: true });

        if (error) throw error;
        const locations = (data || []).map(this.mapToLocation);
        
        // Cache the result
        await locationCacheService.cacheStackLocations(stackId, locations);
        
        return locations;
      } catch (error) {
        logger.error('LocationManagementService.getByStackId error:', 'locationManagementService.ts', error);
        throw ErrorHandler.createGateInError(error);
      }
    }, { stackId });
  }

  /**
   * Get locations by yard ID
   */
  async getByYardId(yardId: string): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('yard_id', yardId)
        .eq('is_active', true)
        .order('location_id', { ascending: true });

      if (error) throw error;
      return (data || []).map(this.mapToLocation);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Create a new location
   * Requirements: 2.1 - Automatic location ID generation
   */
  async create(location: Omit<Location, 'id' | 'createdAt' | 'updatedAt'>): Promise<Location> {
    try {
      // Validate location ID format
      if (!this.validateLocationIdFormat(location.locationId)) {
        throw new GateInError({
          code: 'INVALID_LOCATION_ID',
          message: `Invalid location ID format: ${location.locationId}`,
          severity: 'error',
          retryable: false,
          userMessage: 'Location ID must be in SXXRXHX format (e.g., S01R2H3)'
        });
      }

      const { data, error } = await supabase
        .from('locations')
        .insert({
          location_id: location.locationId,
          stack_id: location.stackId,
          yard_id: location.yardId,
          row_number: location.rowNumber,
          tier_number: location.tierNumber,
          is_virtual: location.isVirtual,
          virtual_stack_pair_id: location.virtualStackPairId,
          is_occupied: location.isOccupied,
          container_id: location.containerId,
          container_size: location.containerSize,
          client_pool_id: location.clientPoolId,
          is_active: location.isActive
        })
        .select()
        .single();

      if (error) throw error;
      return this.mapToLocation(data);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Update an existing location
   */
  async update(id: string, updates: Partial<Location>): Promise<Location> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.isOccupied !== undefined) updateData.is_occupied = updates.isOccupied;
      if (updates.containerId !== undefined) updateData.container_id = updates.containerId;
      if (updates.containerSize !== undefined) updateData.container_size = updates.containerSize;
      if (updates.clientPoolId !== undefined) updateData.client_pool_id = updates.clientPoolId;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.virtualStackPairId !== undefined) updateData.virtual_stack_pair_id = updates.virtualStackPairId;

      const { data, error } = await supabase
        .from('locations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return this.mapToLocation(data);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Delete a location (soft delete by setting is_active = false)
   */
  async delete(id: string): Promise<void> {
    try {
      // Check if location is occupied
      const location = await this.getById(id);
      if (location?.isOccupied) {
        throw new GateInError({
          code: 'LOCATION_OCCUPIED',
          message: 'Cannot delete occupied location',
          severity: 'error',
          retryable: false,
          userMessage: 'This location is currently occupied. Please release the container first.'
        });
      }

      const { error } = await supabase
        .from('locations')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Hard delete a location (permanent removal)
   */
  async hardDelete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get location statistics for a yard
   * Requirements: 9.1 - Performance optimization with materialized views and caching
   */
  async getYardStatistics(yardId: string): Promise<LocationStatistics | null> {
    return trackPerformance('getYardStatistics', async () => {
      try {
        // Check cache first
        const cached = await locationCacheService.getCachedYardStatistics(yardId);
        if (cached) {
          return cached;
        }

        const { data, error } = await supabase
          .from('location_statistics_by_yard')
          .select('*')
          .eq('yard_id', yardId)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) return null;

        const statistics: LocationStatistics = {
          yardId: data.yard_id,
          totalLocations: data.total_locations,
          occupiedLocations: data.occupied_locations,
          availableLocations: data.available_locations,
          virtualLocations: data.virtual_locations,
          physicalLocations: data.physical_locations,
          totalStacks: data.total_stacks,
          assignedPools: data.assigned_pools,
          occupancyPercentage: parseFloat(data.occupancy_percentage),
          lastUpdated: new Date(data.last_updated)
        };
        
        // Cache the result
        await locationCacheService.cacheYardStatistics(statistics);
        
        return statistics;
      } catch (error) {
        logger.error('LocationManagementService.getYardStatistics error:', 'locationManagementService.ts', error);
        throw ErrorHandler.createGateInError(error);
      }
    }, { yardId });
  }

  /**
   * Get stack occupancy statistics
   * Requirements: 9.1 - Cache statistics for performance
   */
  async getStackStatistics(stackId: string): Promise<StackOccupancyStatistics | null> {
    return trackPerformance('getStackStatistics', async () => {
      try {
        // Check cache first
        const cached = await locationCacheService.getCachedStackStatistics(stackId);
        if (cached) {
          return cached;
        }

        const { data, error } = await supabase
          .from('location_statistics_by_stack')
          .select('*')
          .eq('stack_id', stackId)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) return null;

        const statistics: StackOccupancyStatistics = {
          stackId: data.stack_id,
          yardId: data.yard_id,
          totalPositions: data.total_positions,
          occupiedPositions: data.occupied_positions,
          availablePositions: data.available_positions,
          occupancyPercentage: parseFloat(data.occupancy_percentage),
          maxRows: data.max_rows,
          maxTiers: data.max_tiers,
          clientPoolId: data.client_pool_id,
          lastUpdated: new Date(data.last_updated)
        };
        
        // Cache the result
        await locationCacheService.cacheStackStatistics(statistics);
        
        return statistics;
      } catch (error) {
        logger.error('LocationManagementService.getStackStatistics error:', 'locationManagementService.ts', error);
        throw ErrorHandler.createGateInError(error);
      }
    }, { stackId });
  }

  /**
   * Refresh location statistics materialized views
   */
  async refreshStatistics(): Promise<void> {
    try {
      const { error } = await supabase.rpc('refresh_location_statistics');
      if (error) throw error;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  // ============================================================================
  // LOCATION AVAILABILITY TRACKING METHODS
  // Requirements: 4.1, 4.2, 4.3, 4.4 - Real-time location occupancy tracking
  // ============================================================================

  /**
   * Assign a container to a location
   * Requirements: 4.2, 6.3, 6.5 - Immediate status updates with client pool access validation
   */
  async assignContainer(request: LocationAssignmentRequest): Promise<Location> {
    try {
      // Validate location exists and is available
      const location = await this.getById(request.locationId);
      
      if (!location) {
        throw new GateInError({
          code: 'LOCATION_NOT_FOUND',
          message: `Location not found: ${request.locationId}`,
          severity: 'error',
          retryable: false,
          userMessage: 'The specified location does not exist'
        });
      }

      if (location.isOccupied) {
        throw new GateInError({
          code: 'LOCATION_OCCUPIED',
          message: `Location ${location.locationId} is already occupied`,
          severity: 'error',
          retryable: false,
          userMessage: `Location ${location.locationId} is already occupied by another container`
        });
      }

      if (!location.isActive) {
        throw new GateInError({
          code: 'LOCATION_INACTIVE',
          message: `Location ${location.locationId} is not active`,
          severity: 'error',
          retryable: false,
          userMessage: `Location ${location.locationId} is not available for assignment`
        });
      }

      // Validate container size compatibility
      if (location.containerSize && location.containerSize !== request.containerSize) {
        throw new GateInError({
          code: 'CONTAINER_SIZE_MISMATCH',
          message: `Container size ${request.containerSize} does not match location size ${location.containerSize}`,
          severity: 'error',
          retryable: false,
          userMessage: `This location is configured for ${location.containerSize} containers only`
        });
      }

      // Validate client pool access restrictions
      // Requirements: 6.3, 6.5 - Enforce location access restrictions during container placement
      if (location.clientPoolId && request.clientPoolId) {
        if (location.clientPoolId !== request.clientPoolId) {
          throw new GateInError({
            code: 'CLIENT_POOL_ACCESS_DENIED',
            message: `Location ${location.locationId} is assigned to a different client pool`,
            severity: 'error',
            retryable: false,
            userMessage: `This location is reserved for another client pool`
          });
        }
      } else if (location.clientPoolId && !request.clientPoolId) {
        throw new GateInError({
          code: 'CLIENT_POOL_REQUIRED',
          message: `Location ${location.locationId} requires a client pool assignment`,
          severity: 'error',
          retryable: false,
          userMessage: `This location is reserved for pooled clients only`
        });
      } else if (!location.clientPoolId && request.clientPoolId) {
        throw new GateInError({
          code: 'LOCATION_NOT_POOLED',
          message: `Location ${location.locationId} is not assigned to any client pool`,
          severity: 'error',
          retryable: false,
          userMessage: `This location is not available for pooled clients`
        });
      }

      // Update location with container assignment
      const { data, error } = await supabase
        .from('locations')
        .update({
          is_occupied: true,
          container_id: request.containerId,
          container_size: request.containerSize,
          client_pool_id: request.clientPoolId || location.clientPoolId,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.locationId)
        .select()
        .single();

      if (error) throw error;

      const updatedLocation = this.mapToLocation(data);
      
      // Invalidate cache on occupancy change
      // Requirements: 9.2 - Cache invalidation on location occupancy changes
      await locationCacheService.invalidateLocationCache(updatedLocation);

      return updatedLocation;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Release a container from a location
   * Requirements: 4.3 - Immediate status updates on container removal
   */
  async releaseLocation(request: LocationReleaseRequest): Promise<Location> {
    try {
      // Validate location exists and is occupied
      const location = await this.getById(request.locationId);
      
      if (!location) {
        throw new GateInError({
          code: 'LOCATION_NOT_FOUND',
          message: `Location not found: ${request.locationId}`,
          severity: 'error',
          retryable: false,
          userMessage: 'The specified location does not exist'
        });
      }

      if (!location.isOccupied) {
        throw new GateInError({
          code: 'LOCATION_NOT_OCCUPIED',
          message: `Location ${location.locationId} is not occupied`,
          severity: 'error',
          retryable: false,
          userMessage: `Location ${location.locationId} is already empty`
        });
      }

      // Optional validation: check if container ID matches
      if (request.containerId && location.containerId !== request.containerId) {
        throw new GateInError({
          code: 'CONTAINER_MISMATCH',
          message: `Container ID mismatch at location ${location.locationId}`,
          severity: 'error',
          retryable: false,
          userMessage: 'The container at this location does not match the specified container'
        });
      }

      // Update location to release container
      const { data, error } = await supabase
        .from('locations')
        .update({
          is_occupied: false,
          container_id: null,
          container_size: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.locationId)
        .select()
        .single();

      if (error) throw error;

      const updatedLocation = this.mapToLocation(data);
      
      // Invalidate cache on occupancy change
      // Requirements: 9.2 - Cache invalidation on location occupancy changes
      await locationCacheService.invalidateLocationCache(updatedLocation);

      return updatedLocation;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get real-time occupancy status for a location
   * Requirements: 4.1 - Real-time location occupancy tracking
   */
  async getOccupancyStatus(locationId: string): Promise<{
    isOccupied: boolean;
    containerId?: string;
    containerSize?: ContainerSizeEnum;
    lastUpdated: Date;
  }> {
    try {
      const location = await this.getById(locationId);
      
      if (!location) {
        throw new GateInError({
          code: 'LOCATION_NOT_FOUND',
          message: `Location not found: ${locationId}`,
          severity: 'error',
          retryable: false,
          userMessage: 'The specified location does not exist'
        });
      }

      return {
        isOccupied: location.isOccupied,
        containerId: location.containerId,
        containerSize: location.containerSize,
        lastUpdated: location.updatedAt
      };
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Check if a location is available for assignment
   * Requirements: 4.1, 6.3 - Location availability determination with client pool access
   */
  async isLocationAvailable(
    locationId: string,
    containerSize?: ContainerSizeEnum,
    clientPoolId?: string
  ): Promise<boolean> {
    try {
      const location = await this.getById(locationId);
      
      if (!location) return false;
      if (!location.isActive) return false;
      if (location.isOccupied) return false;

      // Check container size compatibility
      if (containerSize && location.containerSize && location.containerSize !== containerSize) {
        return false;
      }

      // Check client pool access restrictions
      // Requirements: 6.3 - Validate client pool access
      if (!this.validateClientPoolAccess(location, clientPoolId)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate client pool access for a location
   * Requirements: 6.3, 6.5 - Client pool access validation
   */
  private validateClientPoolAccess(
    location: Location,
    requestedClientPoolId?: string
  ): boolean {
    // If location has a pool assignment
    if (location.clientPoolId) {
      // Client must have matching pool ID
      if (!requestedClientPoolId) return false;
      if (location.clientPoolId !== requestedClientPoolId) return false;
    } else {
      // Location is unassigned - only unpooled clients can access
      if (requestedClientPoolId) return false;
    }

    return true;
  }

  /**
   * Check if a client has access to a specific location
   * Requirements: 6.1, 6.3 - Client pool access validation
   */
  async hasClientPoolAccess(
    locationId: string,
    clientPoolId: string | null
  ): Promise<boolean> {
    try {
      const location = await this.getById(locationId);
      
      if (!location) return false;
      if (!location.isActive) return false;

      return this.validateClientPoolAccess(location, clientPoolId || undefined);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available locations count for a yard
   * Requirements: 4.4, 6.1 - Availability queries filtered by criteria including client pools
   */
  async getAvailableLocationsCount(query: LocationAvailabilityQuery): Promise<number> {
    try {
      let dbQuery = supabase
        .from('locations')
        .select('id', { count: 'exact', head: true })
        .eq('yard_id', query.yardId)
        .eq('is_occupied', false)
        .eq('is_active', true);

      // Apply optional filters
      if (query.containerSize) {
        dbQuery = dbQuery.eq('container_size', query.containerSize);
      }
      if (query.clientPoolId) {
        dbQuery = dbQuery.eq('client_pool_id', query.clientPoolId);
      }
      if (query.stackId) {
        dbQuery = dbQuery.eq('stack_id', query.stackId);
      }

      const { count, error } = await dbQuery;

      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get available locations count with client pool access filtering
   * Requirements: 6.1, 6.3 - Count available locations based on client pool access
   */
  async getAvailableLocationsCountWithPoolAccess(
    yardId: string,
    clientPoolId: string | null,
    containerSize?: ContainerSizeEnum
  ): Promise<number> {
    try {
      let dbQuery = supabase
        .from('locations')
        .select('id', { count: 'exact', head: true })
        .eq('yard_id', yardId)
        .eq('is_occupied', false)
        .eq('is_active', true);

      // Filter by client pool access
      if (clientPoolId) {
        dbQuery = dbQuery.eq('client_pool_id', clientPoolId);
      } else {
        dbQuery = dbQuery.is('client_pool_id', null);
      }

      // Apply container size filter if specified
      if (containerSize) {
        dbQuery = dbQuery.eq('container_size', containerSize);
      }

      const { count, error } = await dbQuery;

      if (error) throw error;
      return count || 0;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get occupied locations for a yard
   * Requirements: 4.1 - Real-time occupancy tracking
   */
  async getOccupiedLocations(yardId: string, clientPoolId?: string): Promise<Location[]> {
    try {
      let query = supabase
        .from('locations')
        .select('*')
        .eq('yard_id', yardId)
        .eq('is_occupied', true)
        .eq('is_active', true);

      if (clientPoolId) {
        query = query.eq('client_pool_id', clientPoolId);
      }

      query = query.order('location_id', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(this.mapToLocation);
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Bulk assign containers to locations
   * Requirements: 4.2 - Efficient bulk assignment operations
   */
  async bulkAssignContainers(assignments: LocationAssignmentRequest[]): Promise<Location[]> {
    try {
      const results: Location[] = [];

      // Process assignments sequentially to maintain data integrity
      for (const assignment of assignments) {
        const location = await this.assignContainer(assignment);
        results.push(location);
      }

      return results;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Bulk release locations
   * Requirements: 4.3 - Efficient bulk release operations
   */
  async bulkReleaseLocations(releases: LocationReleaseRequest[]): Promise<Location[]> {
    try {
      const results: Location[] = [];

      // Process releases sequentially to maintain data integrity
      for (const release of releases) {
        const location = await this.releaseLocation(release);
        results.push(location);
      }

      return results;
    } catch (error) {
      throw ErrorHandler.createGateInError(error);
    }
  }

  /**
   * Get location availability summary for a yard
   * Requirements: 4.4, 6.1 - Comprehensive availability reporting with client pool statistics
   * Requirements: 9.1 - Cache availability summary for performance
   */
  async getAvailabilitySummary(yardId: string): Promise<{
    totalLocations: number;
    availableLocations: number;
    occupiedLocations: number;
    available20ft: number;
    available40ft: number;
    occupied20ft: number;
    occupied40ft: number;
    occupancyRate: number;
    pooledLocations: number;
    unpooledLocations: number;
    availablePooledLocations: number;
    availableUnpooledLocations: number;
  }> {
    return trackPerformance('getAvailabilitySummary', async () => {
      try {
        // Check cache first
        const cached = await locationCacheService.getCachedAvailabilitySummary(yardId);
        if (cached) {
          return cached;
        }

        const { data, error } = await supabase
          .from('locations')
          .select('is_occupied, container_size, client_pool_id')
          .eq('yard_id', yardId)
          .eq('is_active', true);

        if (error) throw error;

        const locations = data || [];
        const totalLocations = locations.length;
        const occupiedLocations = locations.filter(l => l.is_occupied).length;
        const availableLocations = totalLocations - occupiedLocations;

        const available20ft = locations.filter(
          l => !l.is_occupied && (!l.container_size || l.container_size === '20ft')
        ).length;

        const available40ft = locations.filter(
          l => !l.is_occupied && (!l.container_size || l.container_size === '40ft')
        ).length;

        const occupied20ft = locations.filter(
          l => l.is_occupied && l.container_size === '20ft'
        ).length;

        const occupied40ft = locations.filter(
          l => l.is_occupied && l.container_size === '40ft'
        ).length;

        const occupancyRate = totalLocations > 0 
          ? (occupiedLocations / totalLocations) * 100 
          : 0;

        // Client pool statistics
        // Requirements: 6.1 - Track pooled vs unpooled locations
        const pooledLocations = locations.filter(l => l.client_pool_id !== null).length;
        const unpooledLocations = locations.filter(l => l.client_pool_id === null).length;
        const availablePooledLocations = locations.filter(
          l => !l.is_occupied && l.client_pool_id !== null
        ).length;
        const availableUnpooledLocations = locations.filter(
          l => !l.is_occupied && l.client_pool_id === null
        ).length;

        const summary = {
          totalLocations,
          availableLocations,
          occupiedLocations,
          available20ft,
          available40ft,
          occupied20ft,
          occupied40ft,
          occupancyRate: Math.round(occupancyRate * 100) / 100,
          pooledLocations,
          unpooledLocations,
          availablePooledLocations,
          availableUnpooledLocations
        };
        
        // Cache the result
        await locationCacheService.cacheAvailabilitySummary(yardId, summary);
        
        return summary;
      } catch (error) {
        throw ErrorHandler.createGateInError(error);
      }
    }, { yardId });
  }

  /**
   * Validate location ID format (SXXRXHX)
   * Requirements: 2.2 - Location ID format validation
   */
  private validateLocationIdFormat(locationId: string): boolean {
    const pattern = /^S\d{2}R\d{1}H\d{1}$/;
    return pattern.test(locationId);
  }

  /**
   * Map database column names to TypeScript field names
   */
  private mapOrderByField(field: string): string {
    const mapping: Record<string, string> = {
      locationId: 'location_id',
      stackId: 'stack_id',
      rowNumber: 'row_number',
      tierNumber: 'tier_number',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };
    return mapping[field] || field;
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
      available: data.available !== undefined ? data.available : !data.is_occupied, // Default to inverse of isOccupied if not set
      containerId: data.container_id,
      containerNumber: data.container_number,
      containerSize: data.container_size,
      clientPoolId: data.client_pool_id,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  // ============================================================================
  // CACHE WARMING AND PERFORMANCE METHODS
  // Requirements: 9.3 - Cache warming strategies for frequently accessed data
  // ============================================================================

  /**
   * Warm up cache for a yard
   * Pre-loads frequently accessed data to improve performance
   */
  async warmYardCache(yardId: string): Promise<void> {
    try {
      await locationCacheService.warmYardCache(
        yardId,
        (yId, size) => this.getAvailableLocations({ yardId: yId, containerSize: size }),
        (yId) => this.getYardStatistics(yId),
        (yId) => this.getAvailabilitySummary(yId)
      );
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Warm up cache for a stack
   */
  async warmStackCache(stackId: string): Promise<void> {
    try {
      await locationCacheService.warmStackCache(
        stackId,
        (sId) => this.getByStackId(sId),
        (sId) => this.getStackStatistics(sId)
      );
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): any {
    return performanceMonitoringService.getPerformanceSummary();
  }

  /**
   * Get performance report
   */
  getPerformanceReport(timeWindowMinutes?: number): string {
    return performanceMonitoringService.getPerformanceReport(timeWindowMinutes);
  }

  /**
   * Log performance report
   */
  logPerformanceReport(timeWindowMinutes?: number): void {
    performanceMonitoringService.logPerformanceReport(timeWindowMinutes);
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics(): Promise<any> {
    return locationCacheService.getCacheStatistics();
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    await locationCacheService.clearAllCaches();
  }
}

export const locationManagementService = new LocationManagementService();
