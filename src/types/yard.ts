export interface Yard {
  id: string;
  name: string;
  description: string;
  location: string;
  isActive: boolean;
  totalCapacity: number;
  currentOccupancy: number;
  sections: YardSection[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  layout: 'tantarelli' | 'standard';
  // New multi-yard fields
  code: string; // Unique yard identifier (e.g., 'DEPOT-01', 'YARD-A')
  timezone: string; // Yard timezone for proper time handling
  contactInfo: {
    manager: string;
    phone: string;
    email: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface YardSection {
  id: string;
  name: string;
  yardId: string;
  stacks: YardStack[];
  position: {
    x: number;
    y: number;
    z: number;
  };
  dimensions: {
    width: number;
    length: number;
  };
  color?: string;
}

export interface YardStack {
  id: string;
  stackNumber: number;
  sectionId: string;
  rows: number;
  maxTiers: number;
  currentOccupancy: number;
  capacity: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  dimensions: {
    width: number;
    length: number;
  };
  containerPositions: YardPosition[];
  isOddStack?: boolean;
}

export interface YardPosition {
  id: string;
  yardId: string;
  sectionId: string;
  stackId: string;
  row: number;
  bay: number;
  tier: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  isOccupied: boolean;
  containerId?: string;
  containerNumber?: string;
  containerSize?: '20ft' | '40ft';
  reservedUntil?: Date;
  clientCode?: string;
  placedAt?: Date;
}

export interface YardBlock {
  id: string;
  name: string;
  type: 'storage' | 'maintenance' | 'inspection' | 'gate';
  capacity: number;
  currentOccupancy: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  dimensions: {
    width: number;
    length: number;
    height: number;
  };
  isActive: boolean;
}

// New interfaces for multi-yard management
export interface YardContext {
  currentYard: Yard | null;
  availableYards: Yard[];
  isLoading: boolean;
  error: string | null;
}

export interface YardOperationLog {
  id: string;
  yardId: string;
  yardCode: string;
  operationType: 'gate_in' | 'gate_out' | 'container_move' | 'stack_assignment' | 'yard_switch' | 'client_pool_create' | 'client_pool_update' | 'container_assign' | 'stack_remove' | 'stack_bulk_assign' | 'container_release' | 'yard_create' | 'yard_update' | 'yard_delete' | 'edi_transmission' | 'codeco_generate' | 'stack_create' | 'stack_update' | 'stack_delete';
  containerNumber?: string;
  userId: string;
  userName: string;
  timestamp: Date;
  details: Record<string, any>;
  status: 'success' | 'failed' | 'pending';
}

export interface YardStats {
  yardId: string;
  yardCode: string;
  totalContainers: number;
  containersIn: number;
  containersOut: number;
  occupancyRate: number;
  pendingOperations: number;
  lastUpdated: Date;
}
