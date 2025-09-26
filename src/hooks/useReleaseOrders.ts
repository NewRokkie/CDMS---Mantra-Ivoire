/**
 * useReleaseOrders Hook - Release order management with database integration
 */

import { useState, useEffect } from 'react';
import { BookingReference, ReleaseOrder, ReleaseOrderContainer } from '../types';
import { releaseOrderService } from '../services/database/ReleaseOrderService';
import { useAuth } from './useAuth';

export interface ReleaseOrderFilters {
  clientCode?: string;
  status?: string;
  yardId?: string;
  bookingType?: 'IMPORT' | 'EXPORT';
}

export interface ReleaseOrderStats {
  totalOrders: number;
  pendingOrders: number;
  inProcessOrders: number;
  completedToday: number;
  totalContainersInProcess: number;
  averageProcessingTime: number;
}

export const useReleaseOrders = (initialFilters?: ReleaseOrderFilters) => {
  const { user, getClientFilter } = useAuth();
  const [bookingReferences, setBookingReferences] = useState<BookingReference[]>([]);
  const [releaseOrders, setReleaseOrders] = useState<ReleaseOrder[]>([]);
  const [pendingOperations, setPendingOperations] = useState<any[]>([]);
  const [stats, setStats] = useState<ReleaseOrderStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReleaseOrderFilters>(initialFilters || {});

  // Apply client filter for client users
  const getEffectiveFilters = (): ReleaseOrderFilters => {
    const clientFilter = getClientFilter();
    if (clientFilter) {
      return { ...filters, clientCode: clientFilter };
    }
    return filters;
  };

  // Load booking references
  const loadBookingReferences = async () => {
    try {
      const effectiveFilters = getEffectiveFilters();
      const bookings = await releaseOrderService.getBookingReferences(effectiveFilters);
      setBookingReferences(bookings);
      console.log(`✅ Loaded ${bookings.length} booking references`);
    } catch (err) {
      console.error('Failed to load booking references:', err);
      setError('Failed to load booking references');
    }
  };

  // Load release orders
  const loadReleaseOrders = async () => {
    try {
      const effectiveFilters = getEffectiveFilters();
      const orders = await releaseOrderService.getReleaseOrders(effectiveFilters);
      setReleaseOrders(orders);
      console.log(`✅ Loaded ${orders.length} release orders`);
    } catch (err) {
      console.error('Failed to load release orders:', err);
      setError('Failed to load release orders');
    }
  };

  // Load pending operations
  const loadPendingOperations = async () => {
    try {
      const pending = await releaseOrderService.getPendingReleaseOperations();
      setPendingOperations(pending);
    } catch (err) {
      console.error('Failed to load pending operations:', err);
    }
  };

  // Load statistics
  const loadStatistics = async () => {
    try {
      const statistics = await releaseOrderService.getReleaseOrderStatistics();
      setStats(statistics);
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
        loadBookingReferences(),
        loadReleaseOrders(),
        loadPendingOperations(),
        loadStatistics(),
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      console.error('Failed to load release order data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create booking reference
  const createBookingReference = async (bookingData: {
    bookingNumber: string;
    clientCode: string;
    clientName: string;
    bookingType: 'IMPORT' | 'EXPORT';
    containerQuantities: { size20ft: number; size40ft: number };
    maxQuantityThreshold: number;
    estimatedReleaseDate?: Date;
    notes?: string;
  }): Promise<BookingReference | null> => {
    try {
      const newBooking = await releaseOrderService.createBookingReference(bookingData);
      if (newBooking) {
        await loadBookingReferences(); // Refresh list
      }
      return newBooking;
    } catch (err) {
      console.error('Failed to create booking reference:', err);
      throw err;
    }
  };

  // Create release order
  const createReleaseOrder = async (releaseData: {
    bookingNumber?: string;
    clientCode: string;
    clientName: string;
    bookingType?: 'IMPORT' | 'EXPORT';
    containerQuantities: { size20ft: number; size40ft: number };
    transportCompany?: string;
    driverName?: string;
    vehicleNumber?: string;
    estimatedReleaseDate?: Date;
    scheduledPickupDate?: Date;
    yardId?: string;
    notes?: string;
  }): Promise<ReleaseOrder | null> => {
    try {
      const newOrder = await releaseOrderService.createReleaseOrder(releaseData);
      if (newOrder) {
        await loadReleaseOrders(); // Refresh list
      }
      return newOrder;
    } catch (err) {
      console.error('Failed to create release order:', err);
      throw err;
    }
  };

  // Get release order by ID
  const getReleaseOrder = async (releaseOrderId: string): Promise<ReleaseOrder | null> => {
    try {
      return await releaseOrderService.getReleaseOrderById(releaseOrderId);
    } catch (err) {
      console.error('Failed to get release order:', err);
      return null;
    }
  };

  // Get booking by number
  const getBookingByNumber = async (bookingNumber: string): Promise<BookingReference | null> => {
    try {
      return await releaseOrderService.getBookingByNumber(bookingNumber);
    } catch (err) {
      console.error('Failed to get booking by number:', err);
      return null;
    }
  };

  // Get containers for release order
  const getReleaseOrderContainers = async (releaseOrderId: string): Promise<ReleaseOrderContainer[]> => {
    try {
      return await releaseOrderService.getReleaseOrderContainers(releaseOrderId);
    } catch (err) {
      console.error('Failed to get release order containers:', err);
      return [];
    }
  };

  // Add container to release order
  const addContainerToReleaseOrder = async (
    releaseOrderId: string,
    containerNumber: string
  ): Promise<boolean> => {
    try {
      const success = await releaseOrderService.addContainerToReleaseOrder(
        releaseOrderId,
        containerNumber,
        'manual'
      );
      if (success) {
        await loadReleaseOrders(); // Refresh list
      }
      return success;
    } catch (err) {
      console.error('Failed to add container to release order:', err);
      throw err;
    }
  };

  // Auto-select containers for release order
  const autoSelectContainers = async (
    releaseOrderId: string,
    clientCode: string,
    quantities: { size20ft: number; size40ft: number },
    yardId?: string
  ): Promise<{ selected20ft: number; selected40ft: number }> => {
    try {
      const result = await releaseOrderService.autoSelectContainersForReleaseOrder(
        releaseOrderId,
        clientCode,
        quantities,
        yardId
      );

      if (result.selected20ft > 0 || result.selected40ft > 0) {
        await loadReleaseOrders(); // Refresh list
      }

      return result;
    } catch (err) {
      console.error('Failed to auto-select containers:', err);
      return { selected20ft: 0, selected40ft: 0 };
    }
  };

  // Mark container ready for release
  const markContainerReady = async (
    releaseOrderId: string,
    containerNumber: string
  ): Promise<boolean> => {
    try {
      const success = await releaseOrderService.markContainerReadyForRelease(
        releaseOrderId,
        containerNumber,
        user?.id
      );
      if (success) {
        await loadReleaseOrders(); // Refresh list
      }
      return success;
    } catch (err) {
      console.error('Failed to mark container ready:', err);
      throw err;
    }
  };

  // Release container
  const releaseContainer = async (
    releaseOrderId: string,
    containerNumber: string
  ): Promise<boolean> => {
    try {
      const success = await releaseOrderService.releaseContainer(
        releaseOrderId,
        containerNumber,
        user?.id
      );
      if (success) {
        await loadReleaseOrders(); // Refresh list
      }
      return success;
    } catch (err) {
      console.error('Failed to release container:', err);
      throw err;
    }
  };

  // Update release order status
  const updateReleaseOrderStatus = async (
    releaseOrderId: string,
    status: 'draft' | 'pending' | 'validated' | 'partial' | 'in_process' | 'completed' | 'cancelled',
    notes?: string
  ): Promise<boolean> => {
    try {
      const success = await releaseOrderService.updateReleaseOrderStatus(
        releaseOrderId,
        status,
        notes
      );
      if (success) {
        await loadReleaseOrders(); // Refresh list
      }
      return success;
    } catch (err) {
      console.error('Failed to update release order status:', err);
      throw err;
    }
  };

  // Cancel release order
  const cancelReleaseOrder = async (releaseOrderId: string, reason: string): Promise<boolean> => {
    try {
      const success = await releaseOrderService.cancelReleaseOrder(
        releaseOrderId,
        reason,
        user?.id
      );
      if (success) {
        await loadReleaseOrders(); // Refresh list
      }
      return success;
    } catch (err) {
      console.error('Failed to cancel release order:', err);
      throw err;
    }
  };

  // Get release order progress
  const getReleaseOrderProgress = async (releaseOrderId: string) => {
    try {
      return await releaseOrderService.getReleaseOrderProgress(releaseOrderId);
    } catch (err) {
      console.error('Failed to get release order progress:', err);
      return {
        totalContainers: 0,
        containersReady: 0,
        containersReleased: 0,
        containersRemaining: 0,
        progressPercentage: 0,
      };
    }
  };

  // Search available containers
  const searchAvailableContainers = async (
    clientCode: string,
    containerSize?: '20ft' | '40ft',
    yardId?: string
  ) => {
    try {
      return await releaseOrderService.searchAvailableContainers(clientCode, containerSize, yardId);
    } catch (err) {
      console.error('Failed to search available containers:', err);
      return [];
    }
  };

  // Apply filters
  const applyFilters = (newFilters: ReleaseOrderFilters) => {
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
      setBookingReferences([]);
      setReleaseOrders([]);
      setPendingOperations([]);
      setStats(null);
      setIsLoading(false);
    }
  }, [user]);

  return {
    // Data
    bookingReferences,
    releaseOrders,
    pendingOperations,
    stats,

    // State
    isLoading,
    error,
    filters,

    // Actions - Booking References
    createBookingReference,
    getBookingByNumber,

    // Actions - Release Orders
    createReleaseOrder,
    getReleaseOrder,
    getReleaseOrderContainers,
    addContainerToReleaseOrder,
    autoSelectContainers,
    markContainerReady,
    releaseContainer,
    updateReleaseOrderStatus,
    cancelReleaseOrder,
    getReleaseOrderProgress,
    searchAvailableContainers,

    // Filtering
    applyFilters,
    clearFilters,

    // Utilities
    refresh: loadAllData,
    refreshBookings: loadBookingReferences,
    refreshOrders: loadReleaseOrders,
    refreshPending: loadPendingOperations,
    refreshStats: loadStatistics,
  };
};
