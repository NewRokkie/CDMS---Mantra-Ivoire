/**
 * useGateOperations Hook - Gate operations management with database integration
 */

import { useState, useEffect } from 'react';
import {
  gateOperationsService,
  GateInOperation,
  GateOutOperation,
  TransportCompany,
  Vehicle,
  Driver
} from '../services/database/GateOperationsService';
import { useAuth } from './useAuth';

export interface GateOperationStats {
  gateIn: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    today: number;
  };
  gateOut: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    today: number;
  };
}

export interface DailyOperationSummary {
  date: Date;
  gateInOperations: number;
  gateOutOperations: number;
  containersProcessed: number;
  averageProcessingTime: number;
  pendingOperations: number;
}

export const useGateOperations = () => {
  const { user } = useAuth();
  const [gateInOperations, setGateInOperations] = useState<GateInOperation[]>([]);
  const [gateOutOperations, setGateOutOperations] = useState<GateOutOperation[]>([]);
  const [transportCompanies, setTransportCompanies] = useState<TransportCompany[]>([]);
  const [operationQueue, setOperationQueue] = useState<any[]>([]);
  const [stats, setStats] = useState<GateOperationStats | null>(null);
  const [dailySummary, setDailySummary] = useState<DailyOperationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load pending Gate In operations
  const loadPendingGateInOperations = async () => {
    try {
      const operations = await gateOperationsService.getPendingGateInOperations();
      setGateInOperations(operations);
      console.log(`✅ Loaded ${operations.length} pending Gate In operations`);
    } catch (err) {
      console.error('Failed to load Gate In operations:', err);
      setError('Failed to load Gate In operations');
    }
  };

  // Load pending Gate Out operations
  const loadPendingGateOutOperations = async () => {
    try {
      const operations = await gateOperationsService.getPendingGateOutOperations();
      setGateOutOperations(operations);
      console.log(`✅ Loaded ${operations.length} pending Gate Out operations`);
    } catch (err) {
      console.error('Failed to load Gate Out operations:', err);
      setError('Failed to load Gate Out operations');
    }
  };

  // Load transport companies
  const loadTransportCompanies = async () => {
    try {
      const companies = await gateOperationsService.getTransportCompanies();
      setTransportCompanies(companies);
    } catch (err) {
      console.error('Failed to load transport companies:', err);
    }
  };

  // Load operation queue
  const loadOperationQueue = async () => {
    try {
      const queue = await gateOperationsService.getOperationQueue();
      setOperationQueue(queue);
    } catch (err) {
      console.error('Failed to load operation queue:', err);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const [operationStats, dailyStats] = await Promise.all([
        gateOperationsService.getGateOperationStats(),
        gateOperationsService.getDailyOperationSummary()
      ]);

      setStats(operationStats);
      setDailySummary(dailyStats);
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
        loadPendingGateInOperations(),
        loadPendingGateOutOperations(),
        loadTransportCompanies(),
        loadOperationQueue(),
        loadStatistics(),
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Failed to load gate operations data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create Gate In operation
  const createGateInOperation = async (data: {
    containerNumber: string;
    secondContainerNumber?: string;
    containerSize: '20ft' | '40ft';
    containerType: 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
    containerQuantity: number;
    fullEmptyStatus: 'FULL' | 'EMPTY';
    isDamaged: boolean;
    damageDescription?: string;
    clientCode: string;
    clientName: string;
    bookingReference?: string;
    transportCompany: string;
    truckNumber: string;
    driverName: string;
    truckArrivalDate?: string;
    truckArrivalTime?: string;
    assignedYardId?: string;
    notes?: string;
  }): Promise<GateInOperation | null> => {
    try {
      const newOperation = await gateOperationsService.createGateInOperation(data);
      if (newOperation) {
        await loadPendingGateInOperations(); // Refresh list
        await loadStatistics(); // Update stats
      }
      return newOperation;
    } catch (err) {
      console.error('Failed to create Gate In operation:', err);
      throw err;
    }
  };

  // Create Gate Out operation
  const createGateOutOperation = async (data: {
    containerNumber: string;
    containerSize: '20ft' | '40ft';
    clientCode: string;
    clientName: string;
    bookingNumber?: string;
    releaseOrderId?: string;
    transportCompany: string;
    vehicleNumber: string;
    driverName: string;
    currentYardId?: string;
    currentLocation?: string;
    scheduledPickup?: string;
    notes?: string;
  }): Promise<GateOutOperation | null> => {
    try {
      const newOperation = await gateOperationsService.createGateOutOperation(data);
      if (newOperation) {
        await loadPendingGateOutOperations(); // Refresh list
        await loadStatistics(); // Update stats
      }
      return newOperation;
    } catch (err) {
      console.error('Failed to create Gate Out operation:', err);
      throw err;
    }
  };

  // Complete Gate In operation
  const completeGateInOperation = async (
    operationId: string,
    finalData: {
      assignedYardId: string;
      assignedPositionId?: string;
      assignedLocation: string;
      grossWeight?: number;
      tareWeight?: number;
      sealNumbers?: string[];
      inspectionPassed?: boolean;
      inspectionNotes?: string;
    }
  ): Promise<boolean> => {
    try {
      const success = await gateOperationsService.completeGateInOperation(
        operationId,
        finalData,
        user?.id
      );

      if (success) {
        await loadPendingGateInOperations(); // Refresh list
        await loadStatistics(); // Update stats
      }

      return success;
    } catch (err) {
      console.error('Failed to complete Gate In operation:', err);
      throw err;
    }
  };

  // Complete Gate Out operation
  const completeGateOutOperation = async (
    operationId: string,
    finalData: {
      finalWeight?: number;
      newSeals?: string[];
      deliveryOrderNumber?: string;
    }
  ): Promise<boolean> => {
    try {
      const success = await gateOperationsService.completeGateOutOperation(
        operationId,
        finalData,
        user?.id
      );

      if (success) {
        await loadPendingGateOutOperations(); // Refresh list
        await loadStatistics(); // Update stats
      }

      return success;
    } catch (err) {
      console.error('Failed to complete Gate Out operation:', err);
      throw err;
    }
  };

  // Cancel gate operation
  const cancelGateOperation = async (
    operationId: string,
    operationType: 'gate_in' | 'gate_out',
    reason: string
  ): Promise<boolean> => {
    try {
      const success = await gateOperationsService.cancelGateOperation(
        operationId,
        operationType,
        reason,
        user?.id
      );

      if (success) {
        if (operationType === 'gate_in') {
          await loadPendingGateInOperations();
        } else {
          await loadPendingGateOutOperations();
        }
        await loadStatistics();
      }

      return success;
    } catch (err) {
      console.error('Failed to cancel gate operation:', err);
      throw err;
    }
  };

  // Validate container for gate operation
  const validateContainer = async (
    containerNumber: string,
    operationType: 'gate_in' | 'gate_out'
  ): Promise<{ isValid: boolean; message?: string }> => {
    try {
      return await gateOperationsService.validateContainerForGateOperation(
        containerNumber,
        operationType
      );
    } catch (err) {
      console.error('Failed to validate container:', err);
      return { isValid: false, message: 'Validation error occurred' };
    }
  };

  // Get operations by container
  const getOperationsByContainer = async (containerNumber: string) => {
    try {
      return await gateOperationsService.getOperationsByContainer(containerNumber);
    } catch (err) {
      console.error('Failed to get operations by container:', err);
      return { gateInOperations: [], gateOutOperations: [] };
    }
  };

  // Search transport companies
  const searchTransportCompanies = async (searchTerm: string): Promise<TransportCompany[]> => {
    try {
      return await gateOperationsService.searchTransportCompanies(searchTerm);
    } catch (err) {
      console.error('Failed to search transport companies:', err);
      return [];
    }
  };

  // Get vehicles for company
  const getVehiclesByCompany = async (companyId: string): Promise<Vehicle[]> => {
    try {
      return await gateOperationsService.getVehiclesByCompany(companyId);
    } catch (err) {
      console.error('Failed to get vehicles:', err);
      return [];
    }
  };

  // Get drivers for company
  const getDriversByCompany = async (companyId: string): Promise<Driver[]> => {
    try {
      return await gateOperationsService.getDriversByCompany(companyId);
    } catch (err) {
      console.error('Failed to get drivers:', err);
      return [];
    }
  };

  // Validate and create transport company if needed
  const ensureTransportCompany = async (companyName: string): Promise<TransportCompany> => {
    try {
      return await gateOperationsService.createTransportCompanyIfNotExists(companyName);
    } catch (err) {
      console.error('Failed to ensure transport company:', err);
      throw err;
    }
  };

  // Add operation to queue
  const addToQueue = async (
    operationType: 'in' | 'out',
    operationId: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<boolean> => {
    try {
      const success = await gateOperationsService.addToQueue(operationType, operationId, priority);
      if (success) {
        await loadOperationQueue(); // Refresh queue
      }
      return success;
    } catch (err) {
      console.error('Failed to add to queue:', err);
      return false;
    }
  };

  // Get recent operations
  const getRecentOperations = async (limit = 20) => {
    try {
      return await gateOperationsService.getRecentOperations(limit);
    } catch (err) {
      console.error('Failed to get recent operations:', err);
      return { gateInOperations: [], gateOutOperations: [] };
    }
  };

  // Update operation status
  const updateGateInOperationStatus = async (
    operationId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
    assignedLocation?: string,
    notes?: string
  ): Promise<boolean> => {
    try {
      const success = await gateOperationsService.updateGateInOperationStatus(
        operationId,
        status,
        assignedLocation,
        notes
      );

      if (success) {
        await loadPendingGateInOperations(); // Refresh list
      }

      return success;
    } catch (err) {
      console.error('Failed to update Gate In operation status:', err);
      throw err;
    }
  };

  const updateGateOutOperationStatus = async (
    operationId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
    notes?: string
  ): Promise<boolean> => {
    try {
      const success = await gateOperationsService.updateGateOutOperationStatus(
        operationId,
        status,
        notes
      );

      if (success) {
        await loadPendingGateOutOperations(); // Refresh list
      }

      return success;
    } catch (err) {
      console.error('Failed to update Gate Out operation status:', err);
      throw err;
    }
  };

  // Refresh all data
  const refresh = () => {
    loadAllData();
  };

  // Initialize on mount or when user changes
  useEffect(() => {
    if (user) {
      loadAllData();
    } else {
      setGateInOperations([]);
      setGateOutOperations([]);
      setTransportCompanies([]);
      setOperationQueue([]);
      setStats(null);
      setDailySummary(null);
      setIsLoading(false);
    }
  }, [user]);

  return {
    // Data
    gateInOperations,
    gateOutOperations,
    transportCompanies,
    operationQueue,
    stats,
    dailySummary,

    // State
    isLoading,
    error,

    // Actions - Gate In
    createGateInOperation,
    updateGateInOperationStatus,
    completeGateInOperation,

    // Actions - Gate Out
    createGateOutOperation,
    updateGateOutOperationStatus,
    completeGateOutOperation,

    // Actions - General
    cancelGateOperation,
    validateContainer,
    getOperationsByContainer,
    addToQueue,
    getRecentOperations,

    // Transport management
    searchTransportCompanies,
    getVehiclesByCompany,
    getDriversByCompany,
    ensureTransportCompany,

    // Utilities
    refresh,
    refreshGateIn: loadPendingGateInOperations,
    refreshGateOut: loadPendingGateOutOperations,
    refreshTransport: loadTransportCompanies,
    refreshQueue: loadOperationQueue,
    refreshStats: loadStatistics,
  };
};
