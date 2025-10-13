export interface ClientPool {
  id: string;
  yardId?: string;
  clientId: string;
  clientCode: string;
  clientName: string;
  assignedStacks: string[]; // Array of stack IDs
  maxCapacity: number;
  currentOccupancy: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  notes?: string;
  priority: 'high' | 'medium' | 'low';
  contractStartDate: Date;
  contractEndDate?: Date;
}

export interface StackAssignment {
  id: string;
  yardId?: string;
  stackId: string;
  stackNumber: number;
  clientPoolId: string;
  clientCode: string;
  assignedAt: Date;
  assignedBy: string;
  isExclusive: boolean; // If true, only this client can use this stack
  priority: number; // Higher number = higher priority
  notes?: string;
}

export interface ClientPoolStats {
  totalPools: number;
  activeClients: number;
  totalAssignedStacks: number;
  averageOccupancy: number;
  unassignedStacks: number;
}

export interface ContainerAssignmentRequest {
  containerId: string;
  containerNumber: string;
  clientCode: string;
  containerSize: '20ft' | '40ft';
  preferredSection?: string;
  requiresSpecialHandling?: boolean;
  userName?: string;
}

export interface StackAvailabilityResult {
  stackId: string;
  stackNumber: number;
  sectionName: string;
  availableSlots: number;
  totalCapacity: number;
  isRecommended: boolean;
  distance?: number; // Distance from preferred location
}
