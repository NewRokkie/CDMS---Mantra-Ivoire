/**
 * Hooks Index - Centralized exports for all React hooks
 */

// Authentication
export { useAuth, useAuthProvider, AuthContext } from './useAuth';

// Language support
export { useLanguage } from './useLanguage';

// Core domain hooks
export { useYard } from './useYard';
export { useContainers } from './useContainers';
export { useReleaseOrders } from './useReleaseOrders';
export { useGateOperations } from './useGateOperations';
export { useClientPools } from './useClientPools';

// Re-export types that might be needed
export type { ContainerFilters, ContainerStats } from './useContainers';
export type { ReleaseOrderFilters, ReleaseOrderStats } from './useReleaseOrders';
export type { GateOperationStats, DailyOperationSummary } from './useGateOperations';
export type { ClientPoolFilters } from './useClientPools';
