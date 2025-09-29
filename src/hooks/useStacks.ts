/**
 * useStacks Hook - Stack management with database integration
 */

import { useState, useEffect } from 'react';
import { Stack, StackFormData } from '../types/stack';
import { stackService } from '../services/stackService';
import { useAuth } from './useAuth';
import { useYard } from './useYard';

export interface StackFilters {
  yardId?: string;
  sectionId?: string;
  containerSize?: '20ft' | '40ft' | 'both';
  isActive?: boolean;
  assignedClientCode?: string;
  searchTerm?: string;
}

export interface StackStats {
  totalStacks: number;
  activeStacks: number;
  totalCapacity: number;
  currentOccupancy: number;
  utilizationRate: number;
  stacksBySize: Record<string, number>;
  stacksBySection: Record<string, number>;
}

export const useStacks = (initialFilters?: StackFilters) => {
  const { user } = useAuth();
  const { currentYard } = useYard();
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [filteredStacks, setFilteredStacks] = useState<Stack[]>([]);
  const [stats, setStats] = useState<StackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<StackFilters>(initialFilters || {});

  // Load stacks from database
  const loadStacks = async () => {
    if (!currentYard) {
      setStacks([]);
      setFilteredStacks([]);
      setStats(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const yardStacks = await stackService.getStacksForYard(currentYard.id);
      setStacks(yardStacks);
      setFilteredStacks(yardStacks);

      console.log(`✅ Loaded ${yardStacks.length} stacks for ${currentYard.name}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load stacks';
      setError(errorMessage);
      console.error('Failed to load stacks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    if (!currentYard) return;

    try {
      const stackStats = await stackService.getStackStatistics(currentYard.id);
      setStats(stackStats);
    } catch (err) {
      console.error('Failed to load stack statistics:', err);
    }
  };

  // Create new stack
  const createStack = async (stackData: StackFormData): Promise<Stack | null> => {
    if (!currentYard) return null;

    try {
      const newStack = await stackService.createStack(currentYard.id, stackData, user?.name || 'System');
      if (newStack) {
        await loadStacks();
        await loadStatistics();
      }
      return newStack;
    } catch (err) {
      console.error('Failed to create stack:', err);
      throw err;
    }
  };

  // Update stack
  const updateStack = async (stackId: string, updates: Partial<StackFormData>): Promise<Stack | null> => {
    try {
      const updatedStack = await stackService.updateStack(stackId, updates, user?.name || 'System');
      if (updatedStack) {
        await loadStacks();
        await loadStatistics();
      }
      return updatedStack;
    } catch (err) {
      console.error('Failed to update stack:', err);
      throw err;
    }
  };

  // Delete stack
  const deleteStack = async (stackId: string): Promise<boolean> => {
    try {
      const success = await stackService.deleteStack(stackId, user?.name || 'System');
      if (success) {
        await loadStacks();
        await loadStatistics();
      }
      return success;
    } catch (err) {
      console.error('Failed to delete stack:', err);
      throw err;
    }
  };

  // Get stack by ID
  const getStack = async (stackId: string): Promise<Stack | null> => {
    try {
      return await stackService.getStackById(stackId);
    } catch (err) {
      console.error('Failed to get stack:', err);
      return null;
    }
  };

  // Validate stack data
  const validateStackData = async (stackData: StackFormData, excludeStackId?: string): Promise<any> => {
    if (!currentYard) return { isValid: false, errors: ['No yard selected'], warnings: [] };

    try {
      return await stackService.validateStackData(currentYard.id, stackData, excludeStackId);
    } catch (err) {
      console.error('Failed to validate stack data:', err);
      return { isValid: false, errors: ['Validation error occurred'], warnings: [] };
    }
  };

  // Generate Tantarelli layout
  const generateTantarelliLayout = async (): Promise<boolean> => {
    if (!currentYard) return false;

    try {
      const success = await stackService.generateTantarelliLayout(currentYard.id, user?.name || 'System');
      if (success) {
        await loadStacks();
        await loadStatistics();
      }
      return success;
    } catch (err) {
      console.error('Failed to generate Tantarelli layout:', err);
      throw err;
    }
  };

  // Clone stacks from another yard
  const cloneStacksFromYard = async (sourceYardId: string): Promise<boolean> => {
    if (!currentYard) return false;

    try {
      const success = await stackService.cloneStacksFromYard(sourceYardId, currentYard.id, user?.name || 'System');
      if (success) {
        await loadStacks();
        await loadStatistics();
      }
      return success;
    } catch (err) {
      console.error('Failed to clone stacks:', err);
      throw err;
    }
  };

  // Apply filters to stacks
  const applyFilters = (newFilters: StackFilters) => {
    setFilters(newFilters);

    let filtered = stacks;

    if (newFilters.searchTerm) {
      const searchTerm = newFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(stack =>
        stack.stackNumber.toString().includes(searchTerm) ||
        (stack.notes && stack.notes.toLowerCase().includes(searchTerm))
      );
    }

    if (newFilters.sectionId) {
      filtered = filtered.filter(stack => stack.sectionId === newFilters.sectionId);
    }

    if (newFilters.containerSize) {
      filtered = filtered.filter(stack => stack.containerSize === newFilters.containerSize);
    }

    if (newFilters.isActive !== undefined) {
      filtered = filtered.filter(stack => stack.isActive === newFilters.isActive);
    }

    if (newFilters.assignedClientCode) {
      filtered = filtered.filter(stack => stack.assignedClientCode === newFilters.assignedClientCode);
    }

    setFilteredStacks(filtered);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({});
    setFilteredStacks(stacks);
  };

  // Refresh data
  const refresh = () => {
    loadStacks();
    loadStatistics();
  };

  // Load data on mount and when yard changes
  useEffect(() => {
    loadStacks();
    loadStatistics();
  }, [currentYard]);

  useEffect(() => {
    if (stacks.length > 0) {
      applyFilters(filters);
    }
  }, [stacks, filters]);

  return {
    // Data
    stacks: filteredStacks,
    allStacks: stacks,
    stats,

    // State
    isLoading,
    error,
    filters,

    // Actions
    loadStacks,
    createStack,
    updateStack,
    deleteStack,
    getStack,
    validateStackData,
    generateTantarelliLayout,
    cloneStacksFromYard,

    // Filtering
    applyFilters,
    clearFilters,

    // Utilities
    refresh,
  };
};