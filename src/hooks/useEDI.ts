/**
 * Hook React pour la gestion EDI
 */

import { useState, useCallback } from 'react';
import { ediManagementService } from '../services/edi/ediManagement';
import { EDIContainerData, EDITransmissionLog } from '../types/edi';

export const useEDI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processGateIn = useCallback(async (
    containerData: Omit<EDIContainerData, 'status'>
  ): Promise<EDITransmissionLog | null> => {
    try {
      setLoading(true);
      setError(null);

      // Valider les données
      const validationErrors = ediManagementService.validateContainerData(containerData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
      }

      const log = await ediManagementService.processGateIn(containerData);
      return log;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const processGateOut = useCallback(async (
    containerData: Omit<EDIContainerData, 'status'>
  ): Promise<EDITransmissionLog | null> => {
    try {
      setLoading(true);
      setError(null);

      // Valider les données
      const validationErrors = ediManagementService.validateContainerData(containerData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
      }

      const log = await ediManagementService.processGateOut(containerData);
      return log;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const retryTransmission = useCallback(async (logId: string): Promise<EDITransmissionLog | null> => {
    try {
      setLoading(true);
      setError(null);
      const log = await ediManagementService.retryTransmission(logId);
      return log;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTransmissionHistory = useCallback((containerNumber?: string) => {
    return ediManagementService.getTransmissionHistory(containerNumber);
  }, []);

  const getEDIStatistics = useCallback(() => {
    return ediManagementService.getEDIStatistics();
  }, []);

  const validateContainerData = useCallback((data: Partial<EDIContainerData>) => {
    return ediManagementService.validateContainerData(data);
  }, []);

  const exportTransmissionLogs = useCallback(() => {
    return ediManagementService.exportTransmissionLogs();
  }, []);

  return {
    loading,
    error,
    processGateIn,
    processGateOut,
    retryTransmission,
    getTransmissionHistory,
    getEDIStatistics,
    validateContainerData,
    exportTransmissionLogs,
  };
};