export interface GateInOperation {
  id: string;
  containerNumber: string;
  containerId?: string;
  clientCode: string;
  clientName: string;
  containerType: string;
  containerSize: string;
  transportCompany: string;
  driverName: string;
  vehicleNumber: string;
  bookingNumber?: string;
  damageReported: boolean;
  damageDescription?: string;
  sealNumbers?: string[];
  weight?: number;
  temperature?: number;
  assignedLocation?: string;
  status: 'pending' | 'in_process' | 'completed' | 'cancelled';
  operatorId: string;
  operatorName: string;
  createdAt: Date;
  completedAt?: Date;
  notes?: string;
  yardId: string;
  ediTransmitted: boolean;
  ediTransmissionId?: string;
}

export interface GateOutOperation {
  id: string;
  date: Date;
  bookingNumber: string;
  clientCode: string;
  clientName: string;
  bookingType: 'IMPORT' | 'EXPORT';
  totalContainers: number;
  processedContainers: number;
  remainingContainers: number;
  transportCompany: string;
  driverName: string;
  vehicleNumber: string;
  status: 'pending' | 'in_process' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  updatedBy?: string;
  completedAt?: Date;
  estimatedReleaseDate?: Date;
  notes?: string;
  yardId: string;
  ediTransmitted: boolean;
  processedContainerIds?: string[];
}

export interface AuditLogEntry {
  id: string;
  entityType: 'container' | 'release_order' | 'gate_operation' | 'user' | 'client' | 'yard';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'gate_in' | 'gate_out' | 'status_change';
  userId: string;
  userName: string;
  userRole: string;
  timestamp: Date;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  description: string;
  metadata?: Record<string, any>;
}
