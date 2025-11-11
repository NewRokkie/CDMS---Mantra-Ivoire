/**
 * Location Management System Types
 * 
 * Defines TypeScript interfaces for the UUID-based location management system
 * that replaces string-based location IDs with proper database entities.
 */

export type ContainerSizeEnum = '20ft' | '40ft';

export interface Location {
  id: string; // UUID
  locationId: string; // SXXRXHX format (e.g., S01R2H3)
  stackId: string; // UUID reference to stacks table
  yardId: string;
  rowNumber: number;
  tierNumber: number;
  isVirtual: boolean;
  virtualStackPairId?: string; // UUID reference to virtual_stack_pairs
  isOccupied: boolean;
  available: boolean; // True if location is free and can accept a container
  containerId?: string; // UUID reference to containers table
  containerNumber?: string; // Container number currently occupying this location (for quick reference)
  containerSize?: ContainerSizeEnum;
  clientPoolId?: string; // UUID reference to client_pools table
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VirtualStackPair {
  id: string; // UUID
  yardId: string;
  stack1Id: string; // UUID
  stack2Id: string; // UUID
  virtualStackNumber: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationIdMapping {
  id: string; // UUID
  legacyStringId: string;
  newLocationId: string; // UUID reference to locations
  migrationBatchId: string; // UUID
  migratedAt: Date;
}

export interface LocationAuditLog {
  id: string; // UUID
  locationId?: string; // UUID reference to locations
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN' | 'RELEASE';
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  userId?: string; // UUID
  userEmail?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Query and filter interfaces
export interface LocationCriteria {
  yardId?: string;
  stackId?: string;
  isOccupied?: boolean;
  containerSize?: ContainerSizeEnum;
  clientPoolId?: string;
  isVirtual?: boolean;
  isActive?: boolean;
}

export interface LocationQuery extends LocationCriteria {
  locationId?: string;
  rowNumber?: number;
  tierNumber?: number;
  containerId?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'locationId' | 'stackId' | 'rowNumber' | 'tierNumber' | 'createdAt' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}

export interface LocationAvailabilityQuery {
  yardId: string;
  containerSize?: ContainerSizeEnum;
  clientPoolId?: string;
  sectionId?: string;
  stackId?: string;
  limit?: number;
}

export interface LocationAssignmentRequest {
  locationId: string;
  containerId: string;
  containerSize: ContainerSizeEnum;
  clientPoolId?: string;
}

export interface LocationReleaseRequest {
  locationId: string;
  containerId?: string; // Optional for validation
}

// Statistics and reporting interfaces
export interface LocationStatistics {
  yardId: string;
  totalLocations: number;
  occupiedLocations: number;
  availableLocations: number;
  virtualLocations: number;
  physicalLocations: number;
  totalStacks: number;
  assignedPools: number;
  occupancyPercentage: number;
  lastUpdated: Date;
}

export interface StackOccupancyStatistics {
  stackId: string;
  yardId: string;
  totalPositions: number;
  occupiedPositions: number;
  availablePositions: number;
  occupancyPercentage: number;
  maxRows: number;
  maxTiers: number;
  clientPoolId?: string;
  lastUpdated: Date;
}

// Error types
export interface LocationError {
  code: string;
  message: string;
  details?: any;
}

export interface LocationValidationError extends LocationError {
  field: string;
  value: any;
}
