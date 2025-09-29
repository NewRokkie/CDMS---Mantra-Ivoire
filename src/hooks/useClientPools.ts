/**
 * useClientPools Hook - Client pool management with database integration
 */

import { useState, useEffect } from 'react';
import { ClientPool, StackAssignment, ClientPoolStats, ContainerAssignmentRequest, StackAvailabilityResult } from '../types/clientPool';
import { Container } from '../types';
import { clientPoolService } from '../services/clientPoolService';
import { useAuth } from './useAuth';

export interface ClientPoolFilters {
  yardId?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'active' | 'inactive';
}

export const useClientPools = (initialFilters?: ClientPoolFilters) => {
  const { user, getClientFilter } = useAuth();
  const [clientPools, setClientPools] = useState<ClientPool[]>([]);
  const [stats, setStats] = useState<ClientPoolStats | null>(null);
  const [utilization, setUtilization] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ClientPoolFilters>(initialFilters || {});

  // Apply client filter for client users
  const getEffectiveFilters = (): ClientPoolFilters => {
    const clientFilter = getClientFilter();
    if (clientFilter) {
      return { ...filters };
    }
    return filters;
  };

  // Load client pools from database
  const loadClientPools = async () => {
    try {
      const effectiveFilters = getEffectiveFilters();

      let pools: ClientPool[];
      if (effectiveFilters.yardId) {
        pools = await clientPoolService.getClientPoolsForYard(effectiveFilters.yardId);
      } else {
        pools = await clientPoolService.getClientPools();
      }

      // Filter by client if user is a client
      const clientFilter = getClientFilter();
      if (clientFilter) {
        pools = pools.filter(pool => pool.clientCode === clientFilter);
      }

      setClientPools(pools);
      console.log(`✅ Loaded ${pools.length} client pools`);
    } catch (err) {
      console.error('Failed to load client pools:', err);
      setError('Failed to load client pools');
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const [poolStats, poolUtilization] = await Promise.all([
        clientPoolService.getClientPoolStats(),
        clientPoolService.getClientPoolUtilization()
      ]);

      setStats(poolStats);
      setUtilization(poolUtilization);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  };

  // Load all data
  const loadAllData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await Promise.all([
        loadClientPools(),
        loadStatistics(),
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Failed to load client pool data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get client pool by code
  const getClientPool = async (clientCode: string): Promise<ClientPool | null> => {
    try {
      return await clientPoolService.getClientPoolWithStacks(clientCode);
    } catch (err) {
      console.error('Failed to get client pool:', err);
      return null;
    }
  };

  // Create new client pool
  const createClientPool = async (poolData: {
    clientId: string;
    clientCode: string;
    clientName: string;
    assignedStacks: string[];
    maxCapacity: number;
    priority: 'high' | 'medium' | 'low';
    contractStartDate: Date;
    contractEndDate?: Date;
    notes?: string;
  }): Promise<ClientPool | null> => {
    try {
      const newPool = await clientPoolService.createClientPool(
        poolData.clientId,
        poolData.clientCode,
        poolData.clientName,
        poolData.assignedStacks,
        poolData.maxCapacity,
        poolData.priority,
        poolData.contractStartDate,
        poolData.contractEndDate,
        poolData.notes,
        user?.name
      );

      if (newPool) {
        await loadAllData(); // Refresh all data
      }

      return newPool;
    } catch (err) {
      console.error('Failed to create client pool:', err);
      throw err;
    }
  };

  // Update client pool
  const updateClientPool = async (clientCode: string, updates: Partial<ClientPool>): Promise<ClientPool | null> => {
    try {
      const updatedPool = await clientPoolService.updateClientPool(clientCode, updates, user?.name);
      if (updatedPool) {
        await loadAllData(); // Refresh all data
      }
      return updatedPool;
    } catch (err) {
      console.error('Failed to update client pool:', err);
      throw err;
    }
  };

  // Get available stacks for client
  const getAvailableStacks = async (
    clientCode: string,
    containerSize: '20ft' | '40ft',
    yardId?: string
  ): Promise<StackAvailabilityResult[]> => {
    try {
      return await clientPoolService.getAvailableStacksForClient(clientCode, containerSize, yardId);
    } catch (err) {
      console.error('Failed to get available stacks:', err);
      return [];
    }
  };

  // Assign container to client stack
  const assignContainerToStack = async (
    request: ContainerAssignmentRequest
  ): Promise<StackAvailabilityResult | null> => {
    try {
      const result = await clientPoolService.assignContainerToClientStack(request, user?.name);
      if (result) {
        await loadStatistics(); // Refresh stats
      }
      return result;
    } catch (err) {
      console.error('Failed to assign container to stack:', err);
      throw err;
    }
  };

  // Assign stack to client
  const assignStackToClient = async (
    stackId: string,
    stackNumber: number,
    clientCode: string,
    isExclusive: boolean = true,
    priority: number = 2
  ): Promise<StackAssignment | null> => {
    try {
      const assignment = await clientPoolService.assignStackToClient(
        stackId,
        stackNumber,
        clientCode,
        user?.name || 'System',
        isExclusive,
        priority,
        user?.name
      );

      if (assignment) {
        await loadAllData(); // Refresh all data
      }

      return assignment;
    } catch (err) {
      console.error('Failed to assign stack to client:', err);
      throw err;
    }
  };

  // Remove stack from client
  const removeStackFromClient = async (stackId: string, clientCode: string): Promise<boolean> => {
    try {
      const success = await clientPoolService.removeStackFromClient(stackId, clientCode, user?.name);
      if (success) {
        await loadAllData(); // Refresh all data
      }
      return success;
    } catch (err) {
      console.error('Failed to remove stack from client:', err);
      throw err;
    }
  };

  // Bulk assign stacks to client
  const bulkAssignStacks = async (
    stackIds: string[],
    clientCode: string
  ): Promise<StackAssignment[]> => {
    try {
      const assignments = await clientPoolService.bulkAssignStacksToClient(
        stackIds,
        clientCode,
        user?.name || 'System',
        user?.name
      );

      if (assignments.length > 0) {
        await loadAllData(); // Refresh all data
      }

      return assignments;
    } catch (err) {
      console.error('Failed to bulk assign stacks:', err);
      return [];
    }
  };

  // Get client stack assignments
  const getClientStackAssignments = async (clientCode: string): Promise<StackAssignment[]> => {
    try {
      return await clientPoolService.getClientStackAssignments(clientCode);
    } catch (err) {
      console.error('Failed to get client stack assignments:', err);
      return [];
    }
  };

  // Get stack assignments for specific stack
  const getStackAssignments = async (stackId: string): Promise<StackAssignment[]> => {
    try {
      return await clientPoolService.getStackAssignments(stackId);
    } catch (err) {
      console.error('Failed to get stack assignments:', err);
      return [];
    }
  };

  // Get unassigned stacks
  const getUnassignedStacks = async (yardId: string) => {
    try {
      return await clientPoolService.getUnassignedStacks(yardId);
    } catch (err) {
      console.error('Failed to get unassigned stacks:', err);
      return [];
    }
  };

  // Find optimal stack for container
  const findOptimalStack = async (request: ContainerAssignmentRequest): Promise<StackAvailabilityResult | null> => {
    try {
      return await clientPoolService.findOptimalStackForContainer(request);
    } catch (err) {
      console.error('Failed to find optimal stack:', err);
      return null;
    }
  };

  // Release container from pool
  const releaseContainerFromPool = async (containerNumber: string, clientCode: string): Promise<void> => {
    try {
      await clientPoolService.releaseContainerFromPool(containerNumber, clientCode, user?.name);
      await loadStatistics(); // Refresh stats
    } catch (err) {
      console.error('Failed to release container from pool:', err);
      throw err;
    }
  };

  // Validate container assignment
  const validateContainerAssignment = async (
    request: ContainerAssignmentRequest,
    targetStackId: string
  ): Promise<{ isValid: boolean; reason?: string }> => {
    try {
      return await clientPoolService.validateContainerAssignment(request, targetStackId);
    } catch (err) {
      console.error('Failed to validate container assignment:', err);
      return { isValid: false, reason: 'Validation error occurred' };
    }
  };

  // Get client pool containers
  const getClientPoolContainers = async (clientCode: string, yardId?: string): Promise<Container[]> => {
    try {
      return await clientPoolService.getClientPoolContainers(clientCode, yardId);
    } catch (err) {
      console.error('Failed to get client pool containers:', err);
      return [];
    }
  };

  // Get dashboard data
  const getDashboardData = async () => {
    try {
      return await clientPoolService.getClientPoolDashboard();
    } catch (err) {
      console.error('Failed to get dashboard data:', err);
      return {
        pools: [],
        stats: {
          totalPools: 0,
          activeClients: 0,
          totalAssignedStacks: 0,
          averageOccupancy: 0,
          unassignedStacks: 0
        },
        utilization: [],
        summary: {
          totalClients: 0,
          activeClients: 0,
          totalCapacity: 0,
          totalOccupancy: 0,
          averageUtilization: 0
        }
      };
    }
  };

  // Apply filters
  const applyFilters = (newFilters: ClientPoolFilters) => {
    setFilters(newFilters);
    loadAllData(); // Reload with new filters
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
    loadAllData();
  };

  // Initialize on mount or when user changes
  useEffect(() => {
    if (user) {
      loadAllData();
    } else {
      setClientPools([]);
      setStats(null);
      setUtilization([]);
      setIsLoading(false);
    }
  }, [user]);

  return {
    // Data
    clientPools,
    stats,
    utilization,

    // State
    isLoading,
    error,
    filters,

    // Actions - Pool Management
    getClientPool,
    createClientPool,
    updateClientPool,

    // Actions - Stack Management
    getAvailableStacks,
    assignContainerToStack,
    assignStackToClient,
    removeStackFromClient,
    bulkAssignStacks,
    getClientStackAssignments,
    getStackAssignments,
    getUnassignedStacks,
    findOptimalStack,

    // Actions - Container Management
    releaseContainerFromPool,
    validateContainerAssignment,
    getClientPoolContainers,

    // Analytics
    getDashboardData,

    // Filtering
    applyFilters,
    clearFilters,

    // Utilities
    refresh: loadAllData,
    refreshPools: loadClientPools,
    refreshStats: loadStatistics,
  };
};
