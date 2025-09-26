/**
 * Database Services Index
 * Centralized exports for all database services
 */

// Core database service
export { dbService, DatabaseService, MockDatabaseService } from './DatabaseService';

// Domain-specific services
export { userService, UserService } from './UserService';
export { containerService, ContainerService } from './ContainerService';
export { gateOperationsService, GateOperationsService } from './GateOperationsService';
export { releaseOrderService, ReleaseOrderService } from './ReleaseOrderService';

// Configuration and types
export * from '../../config/database';

// Service interfaces
export type {
  DatabaseUser,
  UserModuleAccess,
  UserYardAssignment,
} from './UserService';

export type {
  DatabaseContainer,
  ContainerMovement,
  ContainerDamage,
} from './ContainerService';

export type {
  GateInOperation,
  GateOutOperation,
  TransportCompany,
  Vehicle,
  Driver,
} from './GateOperationsService';

export type {
  DatabaseBookingReference,
  DatabaseReleaseOrder,
  DatabaseReleaseOrderContainer,
} from './ReleaseOrderService';
