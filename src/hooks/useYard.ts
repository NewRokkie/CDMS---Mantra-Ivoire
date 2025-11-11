import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Yard, type YardContext } from '../types/yard';
import { useAuth } from './useAuth';
import { logger } from '../utils/logger';
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
  const isInitializingRef = React.useRef(false);
  const hasInitializedRef = React.useRef(false);

  // Direct effect without useCallback to avoid stale closure
  useEffect(() => {
    if (user === null) {
      // Reset yard context if user is null - no yards accessible
      setYardContext({
        currentYard: null,
        availableYards: [],
        isLoading: false,
        error: null
      });
      hasInitializedRef.current = false;
      return;
    }

    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current || hasInitializedRef.current) {
      return;
    }

    // Initialize yard context
    const initializeYardContext = async () => {
      isInitializingRef.current = true;
      logger.debug('Initializing yard context', 'useYard');
      try {
        setYardContext(prev => ({ ...prev, isLoading: true, error: null }));

        // Get all yards from Supabase with timeout
        logger.debug('Fetching yards from database...', 'useYard');
        const allYards = await Promise.race([
          yardsService.getAll(),
          new Promise<Yard[]>((_, reject) => 
            setTimeout(() => reject(new Error('Yard loading timeout after 10s')), 10000)
          )
        ]).catch(err => {
          logger.error('Failed to load yards from database', 'useYard', err);
          return [];
        });

        logger.debug(`Retrieved ${allYards?.length || 0} yards from database`, 'useYard');

        // Get user's yard assignments from database
        const userYardAssignments = user?.yardAssignments || [];
        logger.debug('User yard assignments loaded', 'useYard', { assignments: userYardAssignments });

        // Filter accessible yards for user based on their assignments (check both ID and code)
        const accessibleYards: Yard[] = allYards.filter(yard => {
          const nameLower = yard.name.toLowerCase().replace(/\s+/g, '-');
          const hasAccess = yard.isActive && (
            userYardAssignments.includes(yard.id) ||
            userYardAssignments.includes(yard.code) ||
            userYardAssignments.includes(nameLower) ||
            userYardAssignments.includes('all')
          );
          return hasAccess;
        });

        logger.info(`User has access to ${accessibleYards.length} yards`, 'useYard');

        // Set default yard if none selected - prioritize first accessible yard
        let currentYard = yardsService.getCurrentYard();
        if (!currentYard || !accessibleYards.find(y => y.id === currentYard?.id)) {
          if (accessibleYards.length > 0) {
            logger.debug(`Setting default yard: ${accessibleYards[0].code}`, 'useYard');
            yardsService.setCurrentYard(accessibleYards[0].id);
            currentYard = accessibleYards[0];
          } else {
            logger.warn('No accessible yards for user', 'useYard');
            currentYard = null;
          }
        }

        setYardContext({
          currentYard,
          availableYards: accessibleYards,
          isLoading: false,
          error: null
        });

        hasInitializedRef.current = true;
        logger.info('Yard context initialized successfully', 'useYard', { 
          currentYard: currentYard?.code,
          availableYards: accessibleYards.length 
        });

      } catch (error) {
        logger.error('Failed to initialize yard context', 'useYard', error);
        setYardContext(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load yards'
        }));
      } finally {
        isInitializingRef.current = false;
      }
    };

    initializeYardContext();
  }, [user?.id]); // Only run when user ID changes (login/logout)

  const setCurrentYard = async (yardId: string): Promise<boolean> => {
    logger.debug(`Attempting to set current yard: ${yardId}`, 'useYard');
    try {
      // Validate user access based on their yard assignments (check both ID and code)
      const userYardAssignments = user?.yardAssignments || [];

      // Find the yard to check both ID and code
      const yardToAccess = yardContext.availableYards.find(y => y.id === yardId);
      const hasAccess = userYardAssignments.includes(yardId) ||
                       userYardAssignments.includes(yardToAccess?.code || '') ||
                       userYardAssignments.includes('all');
      
      if (!hasAccess) {
        logger.warn(`Access denied to yard: ${yardToAccess?.code}`, 'useYard');
        throw new Error('Access denied to selected yard');
      }

      const success = yardsService.setCurrentYard(yardId);
      if (success) {
        const newCurrentYard = yardsService.getCurrentYard();
        setYardContext(prev => ({
          ...prev,
          currentYard: newCurrentYard,
          error: null
        }));

        // Store yard preference
        localStorage.setItem('selectedYardId', yardId);
        logger.info(`Yard switched successfully to: ${newCurrentYard?.code}`, 'useYard');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Failed to switch yard', 'useYard', error);
      setYardContext(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to switch yard'
      }));
      return false;
    }
  };

  const refreshYards = useCallback(async (): Promise<void> => {
    if (!user) return;
    
    hasInitializedRef.current = false; // Allow re-initialization
    logger.debug('Refreshing yards', 'useYard');
    try {
      setYardContext(prev => ({ ...prev, isLoading: true, error: null }));

      const allYards = await Promise.race([
        yardsService.getAll(),
        new Promise<Yard[]>((_, reject) => 
          setTimeout(() => reject(new Error('Yard loading timeout')), 10000)
        )
      ]).catch(err => {
        logger.error('Failed to load yards from database', 'useYard', err);
        return [];
      });

      const userYardAssignments = user?.yardAssignments || [];
      const accessibleYards: Yard[] = allYards.filter(yard => {
        const nameLower = yard.name.toLowerCase().replace(/\s+/g, '-');
        const hasAccess = yard.isActive && (
          userYardAssignments.includes(yard.id) ||
          userYardAssignments.includes(yard.code) ||
          userYardAssignments.includes(nameLower) ||
          userYardAssignments.includes('all')
        );
        return hasAccess;
      });

      let currentYard = yardsService.getCurrentYard();
      if (!currentYard || !accessibleYards.find(y => y.id === currentYard?.id)) {
        if (accessibleYards.length > 0) {
          yardsService.setCurrentYard(accessibleYards[0].id);
          currentYard = accessibleYards[0];
        } else {
          currentYard = null;
        }
      }

      setYardContext({
        currentYard,
        availableYards: accessibleYards,
        isLoading: false,
        error: null
      });

      logger.info('Yards refreshed successfully', 'useYard');
    } catch (error) {
      logger.error('Failed to refresh yards', 'useYard', error);
      setYardContext(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh yards'
      }));
    }
  }, [user]);

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
    if (!yardContext.currentYard) {
      logger.warn(`Yard operation validation failed: No yard selected`, 'useYard', { operation });
      return { isValid: false, message: 'No yard selected' };
    }

    if (!yardContext.currentYard.isActive) {
      logger.warn(`Yard operation validation failed: Yard not active`, 'useYard', { 
        operation, 
        yard: yardContext.currentYard.code 
      });
      return { isValid: false, message: 'Current yard is not active' };
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
