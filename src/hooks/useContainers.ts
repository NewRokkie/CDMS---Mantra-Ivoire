/**
 * useContainers Hook - Container management with database integration
 * Supporte automatiquement Supabase et PostgreSQL via l'adaptateur
 */

import { useState, useEffect } from 'react';
import { Container } from '../types';
import { databaseAdapter } from '../services/DatabaseAdapter';
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
      const loadedContainers = await databaseAdapter.getAllContainers(effectiveFilters);

      setContainers(loadedContainers);
      setFilteredContainers(loadedContainers);

      // Load statistics (pour l'instant, on utilise des stats basiques)
      // TODO: Implémenter getContainerStatistics dans l'adaptateur
      setStats({
        totalContainers: loadedContainers.length,
        containersInDepot: loadedContainers.filter(c => c.status === 'in_depot').length,
        containersOutDepot: loadedContainers.filter(c => c.status === 'out_depot').length,
        containersBySize: {
          '20ft': loadedContainers.filter(c => c.size === '20ft').length,
          '40ft': loadedContainers.filter(c => c.size === '40ft').length,
        },
        containersByType: loadedContainers.reduce((acc, c) => {
          acc[c.type] = (acc[c.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        damagedContainers: loadedContainers.filter(c => c.damage && c.damage.length > 0).length,
      });

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
      const searchResults = await databaseAdapter.searchContainers(searchTerm);

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
      return await databaseAdapter.getContainerByNumber(containerNumber);
    } catch (err) {
      console.error('Failed to get container:', err);
      return null;
    }
  };

  // Create new container
  const createContainer = async (containerData: Omit<Container, 'id' | 'createdAt' | 'updatedAt'>): Promise<Container | null> => {
    try {
      const newContainer = await databaseAdapter.createContainer(containerData);
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
      const updatedContainer = await databaseAdapter.updateContainer(containerId, updates);
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
      const success = await databaseAdapter.deleteContainer(containerId);
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
      // Pour l'instant, on utilise updateContainer avec le nouveau statut
      const container = await databaseAdapter.getContainerByNumber(containerNumber);
      if (!container) {
        throw new Error('Container not found');
      }

      const success = await databaseAdapter.updateContainer(container.id, {
        status: newStatus
      });
      if (success) {
        await loadContainers(); // Refresh list
      }
      return !!success;
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
      // Mettre à jour le conteneur avec les informations de dommage
      const container = await databaseAdapter.getContainerByNumber(containerNumber);
      if (!container) {
        throw new Error('Container not found');
      }

      await databaseAdapter.updateContainer(container.id, {
        damage: [damageData.description]
      });
      await loadContainers(); // Refresh list
      return true;
    } catch (err) {
      console.error('Failed to report damage:', err);
      throw err;
    }
  };

  // Get container movement history (simplifié pour l'adaptateur)
  const getContainerMovements = async (containerNumber: string) => {
    try {
      // TODO: Implémenter dans l'adaptateur
      console.log('getContainerMovements pas encore implémenté dans l\'adaptateur');
      return [];
    } catch (err) {
      console.error('Failed to get container movements:', err);
      return [];
    }
  };

  // Get container damage history (simplifié pour l'adaptateur)
  const getContainerDamages = async (containerNumber: string) => {
    try {
      // TODO: Implémenter dans l'adaptateur
      console.log('getContainerDamages pas encore implémenté dans l\'adaptateur');
      return [];
    } catch (err) {
      console.error('Failed to get container damages:', err);
      return [];
    }
  };

  // Get containers requiring maintenance (simplifié pour l'adaptateur)
  const getMaintenanceContainers = async () => {
    try {
      // Filtrer les conteneurs avec statut maintenance
      return containers.filter(c => c.status === 'maintenance');
    } catch (err) {
      console.error('Failed to get maintenance containers:', err);
      return [];
    }
  };

  // Get damaged containers (simplifié pour l'adaptateur)
  const getDamagedContainers = async () => {
    try {
      // Filtrer les conteneurs avec dommages
      return containers.filter(c => c.damage && c.damage.length > 0);
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
