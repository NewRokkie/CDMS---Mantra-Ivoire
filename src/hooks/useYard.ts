import { useState, useEffect, createContext, useContext } from 'react';
import { Yard, type YardContext } from '../types/yard';
import { yardService } from '../services/yardService';
import { useAuth } from './useAuth';

interface YardContextType extends YardContext {
  setCurrentYard: (yardId: string) => Promise<boolean>;
  refreshYards: () => Promise<void>;
  getAccessibleYards: () => Yard[];
  validateYardOperation: (operation: string) => { isValid: boolean; message?: string };
}

const YardContext = createContext<YardContextType | undefined>(undefined);

export const useYard = () => {
  const context = useContext(YardContext);
  if (context === undefined) {
    throw new Error('useYard must be used within a YardProvider');
  }
  return context;
};

export const useYardProvider = () => {
  const [yardContext, setYardContext] = useState<YardContext>({
    currentYard: null,
    availableYards: [],
    isLoading: true,
    error: null
  });

  const { user } = useAuth();

  useEffect(() => {
    console.log('useYardProvider useEffect triggered with user:', user);
    initializeYardContext();
  }, [user]);

  const initializeYardContext = async () => {
    try {
      setYardContext(prev => ({ ...prev, isLoading: true, error: null }));

      // Get user's yard assignments
      const userYardAssignments = user?.yardAssignments || ['depot-tantarelli']; // Default assignment

      // Get accessible yards for user
      const accessibleYards = yardService.getAccessibleYards(userYardAssignments);

      // Set default yard if none selected
      let currentYard = yardService.getCurrentYard();
      if (!currentYard || !userYardAssignments.includes(currentYard.id)) {
        if (accessibleYards.length > 0) {
          yardService.setCurrentYard(accessibleYards[0].id);
          currentYard = accessibleYards[0];
        }
      }

      setYardContext({
        currentYard,
        availableYards: accessibleYards,
        isLoading: false,
        error: null
      });

    } catch (error) {
      setYardContext(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load yards'
      }));
    }
  };

  const setCurrentYard = async (yardId: string): Promise<boolean> => {
    try {
      // Validate user access
      const userYardAssignments = user?.yardAssignments || [];
      if (!yardService.validateYardAccess(yardId, user?.id || '', userYardAssignments)) {
        throw new Error('Access denied to selected yard');
      }

      const success = yardService.setCurrentYard(yardId);
      if (success) {
        const newCurrentYard = yardService.getCurrentYard();
        setYardContext(prev => ({
          ...prev,
          currentYard: newCurrentYard,
          error: null
        }));

        // Store yard preference
        localStorage.setItem('selectedYardId', yardId);
        return true;
      }
      return false;
    } catch (error) {
      setYardContext(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to switch yard'
      }));
      return false;
    }
  };

  const refreshYards = async (): Promise<void> => {
    await initializeYardContext();
  };

  const getAccessibleYards = (): Yard[] => {
    const userYardAssignments = user?.yardAssignments || [];
    return yardService.getAccessibleYards(userYardAssignments);
  };

  const validateYardOperation = (operation: string): { isValid: boolean; message?: string } => {
    if (!yardContext.currentYard) {
      return { isValid: false, message: 'No yard selected' };
    }

    if (!yardContext.currentYard.isActive) {
      return { isValid: false, message: 'Current yard is not active' };
    }

    // Add operation-specific validation
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const { start, end } = yardContext.currentYard.operatingHours;

    if (currentTime < start || currentTime > end) {
      return {
        isValid: false,
        message: `Yard operations are only allowed between ${start} and ${end}`
      };
    }

    return { isValid: true };
  };

  return {
    ...yardContext,
    setCurrentYard,
    refreshYards,
    getAccessibleYards,
    validateYardOperation
  };
};

export { YardContext };
