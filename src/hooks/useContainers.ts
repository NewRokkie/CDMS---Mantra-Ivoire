/**
 * useContainers Hook - Container management with database integration
 */

import { useState, useEffect } from 'react';
import { Container } from '../types';
import { containerService } from '../services/database/ContainerService';
import { useAuth } from './useAuth';

export interface ContainerFilters {
  yardId?: string;
  clientCode?: string;
  status?: Container['status'];
  size?: Container['size'];
  type?: Container['type'];
  searchTerm?: string;
}

export interface ContainerStats {
  totalContainers: number;
  containersInDepot: number;
  containersOutDepot: number;
  containersBySize: { '20ft': number; '40ft': number };
  containersByType: Record<string, number>;
  damagedContainers: number;
}

export const useContainers = (initialFilters?: ContainerFilters) => {
  const { user, getClientFilter } = useAuth();
  const [containers, setContainers] = useState<Container[]>([]);
  const [filteredContainers, setFilteredContainers] = useState<Container[]>([]);
  const [stats, setStats] = useState<ContainerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ContainerFilters>(initialFilters || {});

  // Apply client filter for client users
  const getEffectiveFilters = (): ContainerFilters => {
    const clientFilter = getClientFilter();
    if (clientFilter) {
      return { ...filters, clientCode: clientFilter };
    }
    return filters;
  };

  // Load containers from database
  const loadContainers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const effectiveFilters = getEffectiveFilters();
      const loadedContainers = await containerService.getAllContainers(effectiveFilters);

      setContainers(loadedContainers);
      setFilteredContainers(loadedContainers);

      // Load statistics
      const containerStats = await containerService.getContainerStatistics(effectiveFilters.yardId);
      setStats(containerStats);

      console.log(`✅ Loaded ${loadedContainers.length} containers`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load containers';
      setError(errorMessage);
      console.error('Failed to load containers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Search containers
  const searchContainers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredContainers(containers);
      return;
    }

    try {
      const searchResults = await containerService.searchContainers(searchTerm);

      // Apply client filter if needed
      const clientFilter = getClientFilter();
      const filteredResults = clientFilter
        ? searchResults.filter(c => c.clientCode === clientFilter)
        : searchResults;

      setFilteredContainers(filteredResults);
    } catch (err) {
      console.error('Failed to search containers:', err);
      setError('Search failed');
    }
  };

  // Get container by number
  const getContainer = async (containerNumber: string): Promise<Container | null> => {
    try {
      return await containerService.getContainerByNumber(containerNumber);
    } catch (err) {
      console.error('Failed to get container:', err);
      return null;
    }
  };

  // Create new container
  const createContainer = async (containerData: Omit<Container, 'id' | 'createdAt' | 'updatedAt'>): Promise<Container | null> => {
    try {
      const newContainer = await containerService.createContainer(containerData);
      if (newContainer) {
        await loadContainers(); // Refresh list
      }
      return newContainer;
    } catch (err) {
      console.error('Failed to create container:', err);
      throw err;
    }
  };

  // Update container
  const updateContainer = async (containerId: string, updates: Partial<Container>): Promise<Container | null> => {
    try {
      const updatedContainer = await containerService.updateContainer(containerId, updates);
      if (updatedContainer) {
        await loadContainers(); // Refresh list
      }
      return updatedContainer;
    } catch (err) {
      console.error('Failed to update container:', err);
      throw err;
    }
  };

  // Delete container
  const deleteContainer = async (containerId: string): Promise<boolean> => {
    try {
      const success = await containerService.deleteContainer(containerId);
      if (success) {
        await loadContainers(); // Refresh list
      }
      return success;
    } catch (err) {
      console.error('Failed to delete container:', err);
      throw err;
    }
  };

  // Update container status
  const updateContainerStatus = async (
    containerNumber: string,
    newStatus: Container['status'],
    reason?: string
  ): Promise<boolean> => {
    try {
      const success = await containerService.updateContainerStatus(
        containerNumber,
        newStatus,
        reason,
        user?.id
      );
      if (success) {
        await loadContainers(); // Refresh list
      }
      return success;
    } catch (err) {
      console.error('Failed to update container status:', err);
      throw err;
    }
  };

  // Report container damage
  const reportDamage = async (
    containerNumber: string,
    damageData: {
      damageType: string;
      damageLocation: string;
      severity: 'minor' | 'moderate' | 'major' | 'critical';
      description: string;
      repairRequired?: boolean;
      repairEstimate?: number;
    }
  ): Promise<boolean> => {
    try {
      await containerService.reportContainerDamage(
        containerNumber,
        damageData,
        user?.id
      );
      await loadContainers(); // Refresh list
      return true;
    } catch (err) {
      console.error('Failed to report damage:', err);
      throw err;
    }
  };

  // Get container movement history
  const getContainerMovements = async (containerNumber: string) => {
    try {
      return await containerService.getContainerMovements(containerNumber);
    } catch (err) {
      console.error('Failed to get container movements:', err);
      return [];
    }
  };

  // Get container damage history
  const getContainerDamages = async (containerNumber: string) => {
    try {
      return await containerService.getContainerDamages(containerNumber);
    } catch (err) {
      console.error('Failed to get container damages:', err);
      return [];
    }
  };

  // Get containers requiring maintenance
  const getMaintenanceContainers = async () => {
    try {
      return await containerService.getContainersRequiringMaintenance();
    } catch (err) {
      console.error('Failed to get maintenance containers:', err);
      return [];
    }
  };

  // Get damaged containers
  const getDamagedContainers = async () => {
    try {
      return await containerService.getDamagedContainers();
    } catch (err) {
      console.error('Failed to get damaged containers:', err);
      return [];
    }
  };

  // Apply filters to containers
  const applyFilters = (newFilters: ContainerFilters) => {
    setFilters(newFilters);

    let filtered = containers;

    if (newFilters.searchTerm) {
      const searchTerm = newFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(container =>
        container.number.toLowerCase().includes(searchTerm) ||
        container.client.toLowerCase().includes(searchTerm) ||
        (container.clientCode && container.clientCode.toLowerCase().includes(searchTerm))
      );
    }

    if (newFilters.status) {
      filtered = filtered.filter(container => container.status === newFilters.status);
    }

    if (newFilters.size) {
      filtered = filtered.filter(container => container.size === newFilters.size);
    }

    if (newFilters.type) {
      filtered = filtered.filter(container => container.type === newFilters.type);
    }

    setFilteredContainers(filtered);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
    setFilteredContainers(containers);
  };

  // Refresh data
  const refresh = () => {
    loadContainers();
  };

  // Load data on mount and when filters change
  useEffect(() => {
    loadContainers();
  }, []);

  useEffect(() => {
    if (containers.length > 0) {
      applyFilters(filters);
    }
  }, [containers, filters]);

  return {
    // Data
    containers: filteredContainers,
    allContainers: containers,
    stats,

    // State
    isLoading,
    error,
    filters,

    // Actions
    loadContainers,
    searchContainers,
    getContainer,
    createContainer,
    updateContainer,
    deleteContainer,
    updateContainerStatus,
    reportDamage,
    getContainerMovements,
    getContainerDamages,
    getMaintenanceContainers,
    getDamagedContainers,

    // Filtering
    applyFilters,
    clearFilters,

    // Utilities
    refresh,
  };
};
