/**
 * useYard Hook - Database-connected yard management
 */

import { useState, useEffect, createContext, useContext } from 'react';
import { Yard, YardContext as YardContextType, YardStats } from '../types/yard';
import { yardService } from '../services/yardService';
import { useAuth } from './useAuth';

interface YardProviderType extends YardContextType {
  // Actions
  setCurrentYardById: (yardId: string) => Promise<boolean>;
  getYardContext: () => YardContextType;
  validateContainerOperation: (containerNumber: string, operation: string) => Promise<{ isValid: boolean; message?: string }>;
  getYardContainers: (yardId?: string) => Promise<any[]>;
  refreshCurrentYard: () => Promise<void>;
  getAvailablePositions: (containerSize?: '20ft' | '40ft') => Promise<any[]>;
  reservePosition: (positionId: string, containerNumber: string, clientCode: string) => Promise<boolean>;
  getOperationLogs: (yardId?: string, limit?: number) => Promise<any[]>;
  // Management (admin/supervisor)
  createYard: (yardData: Omit<Yard, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => Promise<Yard | null>;
  updateYard: (yardId: string, updates: Partial<Yard>) => Promise<Yard | null>;
  deleteYard: (yardId: string) => Promise<boolean>;
  // Utilities
  refresh: () => Promise<void>;
}

const YardContext = createContext<YardProviderType | undefined>(undefined);

export const useYard = () => {
  const context = useContext(YardContext);
  if (context === undefined) {
    throw new Error('useYard must be used within a YardProvider');
  }
  return context;
};

// Database-connected yard provider
export const useYardProvider = () => {
  const { user } = useAuth();
  const [currentYard, setCurrentYard] = useState<Yard | null>(null);
  const [availableYards, setAvailableYards] = useState<Yard[]>([]);
  const [yardStats, setYardStats] = useState<YardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load yards accessible to current user
  const loadAccessibleYards = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!user) {
        setAvailableYards([]);
        setCurrentYard(null);
        return;
      }

      // Get yards accessible to user
      const accessibleYards = await yardService.getAccessibleYards(user.id);
      setAvailableYards(accessibleYards);

      // Set current yard if not already set
      if (!currentYard && accessibleYards.length > 0) {
        // Try to find Tantarelli first, otherwise use first available
        const tantarelli = accessibleYards.find(y => y.code === 'DEPOT-01');
        const defaultYard = tantarelli || accessibleYards[0];

        await setCurrentYardById(defaultYard.id);
      }

      console.log(`✅ Loaded ${accessibleYards.length} accessible yards for user ${user.name}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load yards';
      setError(errorMessage);
      console.error('Failed to load accessible yards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Set current yard by ID
  const setCurrentYardById = async (yardId: string): Promise<boolean> => {
    try {
      if (!user) return false;

      // Validate user has access to this yard
      const hasAccess = await yardService.validateYardAccess(yardId, user.id);
      if (!hasAccess) {
        setError('Access denied to selected yard');
        return false;
      }

      const success = await yardService.setCurrentYard(yardId, user.name);
      if (success) {
        const yard = await yardService.getCurrentYard();
        setCurrentYard(yard);

        // Load stats for new current yard
        if (yard) {
          const stats = await yardService.getYardStats(yard.id);
          setYardStats(stats);
        }

        console.log(`✅ Switched to yard: ${yard?.name} (${yard?.code})`);
      }

      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set current yard';
      setError(errorMessage);
      console.error('Failed to set current yard:', err);
      return false;
    }
  };

  // Get yard context
  const getYardContext = (): YardContextType => {
    return {
      currentYard,
      availableYards,
      isLoading,
      error,
    };
  };

  // Validate container operation
  const validateContainerOperation = async (
    containerNumber: string,
    operation: string
  ): Promise<{ isValid: boolean; message?: string }> => {
    try {
      return await yardService.validateContainerOperation(containerNumber, operation);
    } catch (err) {
      console.error('Failed to validate container operation:', err);
      return { isValid: false, message: 'Validation error occurred' };
    }
  };

  // Get containers in current yard
  const getYardContainers = async (yardId?: string) => {
    try {
      const targetYardId = yardId || currentYard?.id;
      if (!targetYardId) return [];

      return await yardService.getYardContainers(targetYardId);
    } catch (err) {
      console.error('Failed to get yard containers:', err);
      return [];
    }
  };

  // Refresh current yard data
  const refreshCurrentYard = async () => {
    if (currentYard) {
      try {
        const refreshedYard = await yardService.getYardById(currentYard.id);
        setCurrentYard(refreshedYard);

        if (refreshedYard) {
          const stats = await yardService.getYardStats(refreshedYard.id);
          setYardStats(stats);
        }
      } catch (err) {
        console.error('Failed to refresh current yard:', err);
      }
    }
  };

  // Get available positions in current yard
  const getAvailablePositions = async (containerSize?: '20ft' | '40ft') => {
    try {
      if (!currentYard) return [];
      return await yardService.getAvailablePositions(currentYard.id, containerSize);
    } catch (err) {
      console.error('Failed to get available positions:', err);
      return [];
    }
  };

  // Reserve position for container
  const reservePosition = async (
    positionId: string,
    containerNumber: string,
    clientCode: string
  ): Promise<boolean> => {
    try {
      const success = await yardService.reservePosition(
        positionId,
        containerNumber,
        clientCode,
        user?.name
      );

      if (success) {
        await refreshCurrentYard(); // Refresh yard data
      }

      return success;
    } catch (err) {
      console.error('Failed to reserve position:', err);
      return false;
    }
  };

  // Get yard operation logs
  const getOperationLogs = async (yardId?: string, limit = 100) => {
    try {
      const targetYardId = yardId || currentYard?.id;
      if (!targetYardId) return [];

      return await yardService.getYardOperationLogs(targetYardId, limit);
    } catch (err) {
      console.error('Failed to get operation logs:', err);
      return [];
    }
  };

  // Create new yard (admin only)
  const createYard = async (yardData: Omit<Yard, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<Yard | null> => {
    try {
      if (user?.role !== 'admin') {
        throw new Error('Only administrators can create yards');
      }

      const newYard = await yardService.createYard(yardData, user.name);
      if (newYard) {
        await loadAccessibleYards(); // Refresh available yards
      }
      return newYard;
    } catch (err) {
      console.error('Failed to create yard:', err);
      throw err;
    }
  };

  // Update yard (admin/supervisor only)
  const updateYard = async (yardId: string, updates: Partial<Yard>): Promise<Yard | null> => {
    try {
      if (!user || !['admin', 'supervisor'].includes(user.role)) {
        throw new Error('Insufficient permissions to update yard');
      }

      const updatedYard = await yardService.updateYard(yardId, updates, user.name);
      if (updatedYard) {
        await loadAccessibleYards(); // Refresh available yards
        if (currentYard?.id === yardId) {
          setCurrentYard(updatedYard);
        }
      }
      return updatedYard;
    } catch (err) {
      console.error('Failed to update yard:', err);
      throw err;
    }
  };

  // Delete yard (admin only)
  const deleteYard = async (yardId: string): Promise<boolean> => {
    try {
      if (user?.role !== 'admin') {
        throw new Error('Only administrators can delete yards');
      }

      const success = await yardService.deleteYard(yardId, user.name);
      if (success) {
        await loadAccessibleYards(); // Refresh available yards
        // If deleted yard was current, switch to another
        if (currentYard?.id === yardId && availableYards.length > 0) {
          const newCurrentYard = availableYards.find(y => y.id !== yardId);
          if (newCurrentYard) {
            await setCurrentYardById(newCurrentYard.id);
          }
        }
      }
      return success;
    } catch (err) {
      console.error('Failed to delete yard:', err);
      throw err;
    }
  };

  // Initialize on mount or when user changes
  useEffect(() => {
    if (user) {
      loadAccessibleYards();
    } else {
      setAvailableYards([]);
      setCurrentYard(null);
      setYardStats(null);
      setIsLoading(false);
    }
  }, [user]);

  return {
    // Current state
    currentYard,
    availableYards,
    yardStats,
    isLoading,
    error,

    // Actions
    setCurrentYardById,
    getYardContext,
    validateContainerOperation,
    getYardContainers,
    refreshCurrentYard,
    getAvailablePositions,
    reservePosition,
    getOperationLogs,

    // Management (admin/supervisor)
    createYard,
    updateYard,
    deleteYard,

    // Utilities
    refresh: loadAccessibleYards,
  };
};

export { YardContext };
