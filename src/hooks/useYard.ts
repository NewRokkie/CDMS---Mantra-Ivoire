import { useState, useEffect, createContext, useContext } from 'react';
import { Yard, type YardContext } from '../types/yard';
import { useAuth } from './useAuth';
import type { Yard as ApiYard } from '../types';
import { yardsService } from '../services/api/yardsService';

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
    console.log('useYardProvider useEffect triggered with user:', user?.id);
    if (user !== null) {
      initializeYardContext();
    } else {
      // Reset yard context if user is null - no yards accessible
      setYardContext({
        currentYard: null,
        availableYards: [],
        isLoading: false,
        error: null
      });
    }
  }, [user]);

  const initializeYardContext = async () => {
    console.log('DEBUG: initializeYardContext called');
    try {
      setYardContext(prev => ({ ...prev, isLoading: true, error: null }));

      console.log('DEBUG: Using yardsService directly');

      console.log('DEBUG: yardsService imported successfully, calling getAll()');
      // Get all yards from Supabase
      const allYards = await yardsService.getAll().catch(err => {
        console.error('Error loading yards from database:', err);
        return [];
      });

      console.log('DEBUG: Retrieved yards:', allYards?.length || 0, 'yards');
      console.log('DEBUG: All yards from DB:', allYards.map(y => ({ id: y.id, code: y.code, name: y.name })));

      // Get user's yard assignments from database
      const userYardAssignments = user?.yardAssignments || [];
      console.log('DEBUG: User yard assignments:', userYardAssignments);

      // Filter accessible yards for user based on their assignments (check both ID and code)
      const accessibleYards: Yard[] = allYards.filter(yard => {
        const nameLower = yard.name.toLowerCase().replace(/\s+/g, '-'); // "Depot Tantarelli" -> "depot-tantarelli"
        const hasAccess = yard.isActive && (
          userYardAssignments.includes(yard.id) ||
          userYardAssignments.includes(yard.code) ||
          userYardAssignments.includes(nameLower) || // Check formatted name
          userYardAssignments.includes('all')
        );
        console.log('DEBUG: Yard', yard.code, 'hasAccess:', hasAccess, 'checking:', {
          id: yard.id,
          code: yard.code,
          nameFormatted: nameLower,
          userAssignments: userYardAssignments
        });
        return hasAccess;
      });

      console.log('DEBUG: Filtered accessible yards:', accessibleYards.length);

      // Set default yard if none selected - prioritize first accessible yard
      let currentYard = yardsService.getCurrentYard();
      console.log('DEBUG: Current yard from yardsService:', currentYard?.id);
      if (!currentYard || !accessibleYards.find(y => y.id === currentYard?.id)) {
        if (accessibleYards.length > 0) {
          console.log('DEBUG: Setting default yard:', accessibleYards[0].id);
          yardsService.setCurrentYard(accessibleYards[0].id);
          currentYard = accessibleYards[0];
        } else {
          // No accessible yards for this user
          currentYard = null;
        }
      }

      console.log('DEBUG: Final current yard:', currentYard?.id);
      setYardContext({
        currentYard,
        availableYards: accessibleYards,
        isLoading: false,
        error: null
      });

    } catch (error) {
      console.error('DEBUG: Error in initializeYardContext:', error);
      setYardContext(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load yards'
      }));
    }
  };

  const setCurrentYard = async (yardId: string): Promise<boolean> => {
    console.log('DEBUG: setCurrentYard called with yardId:', yardId);
    try {
      // Validate user access based on their yard assignments (check both ID and code)
      const userYardAssignments = user?.yardAssignments || [];
      console.log('DEBUG: User yard assignments for validation:', userYardAssignments);

      // Find the yard to check both ID and code
      const yardToAccess = yardContext.availableYards.find(y => y.id === yardId);
      const hasAccess = userYardAssignments.includes(yardId) ||
                       userYardAssignments.includes(yardToAccess?.code || '') ||
                       userYardAssignments.includes('all');
      console.log('DEBUG: validateYardAccess result:', hasAccess, 'for yard:', yardToAccess?.code);
      if (!hasAccess) {
        throw new Error('Access denied to selected yard');
      }

      const success = yardsService.setCurrentYard(yardId);
      console.log('DEBUG: yardsService.setCurrentYard success:', success);
      if (success) {
        const newCurrentYard = yardsService.getCurrentYard();
        console.log('DEBUG: New current yard after setting:', newCurrentYard?.id);
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
      console.error('DEBUG: Error in setCurrentYard:', error);
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
    // Filter from current available yards based on assignments (check both ID and code)
    return yardContext.availableYards.filter(yard =>
      userYardAssignments.includes(yard.id) ||
      userYardAssignments.includes(yard.code) ||
      userYardAssignments.includes('all')
    );
  };

  const validateYardOperation = (operation: string): { isValid: boolean; message?: string } => {
    console.log('DEBUG: validateYardOperation called with operation:', operation);
    console.log('DEBUG: Current yard:', yardContext.currentYard?.id, 'active:', yardContext.currentYard?.isActive);
    if (!yardContext.currentYard) {
      return { isValid: false, message: 'No yard selected' };
    }

    if (!yardContext.currentYard.isActive) {
      return { isValid: false, message: 'Current yard is not active' };
    }

    // Add operation-specific validation logic here if needed
    console.log('DEBUG: validateYardOperation result: valid');
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
