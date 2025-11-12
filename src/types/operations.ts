export interface GateInOperation {
  id: string;
  containerNumber: string;
  containerId?: string;
  clientCode: string;
  clientName: string;
  containerType: string;
  containerSize: string;
  containerQuantity: 1 | 2; // Number of containers in this operation (1 or 2 for 20ft)
  secondContainerNumber?: string; // Second container number when containerQuantity is 2
  transportCompany: string;
  driverName: string;
  truckNumber?: string; // Changed from vehicleNumber to truckNumber
  bookingNumber?: string;
  classification?: 'divers' | 'alimentaire';
  damageReported: boolean;
  damageDescription?: string;
  // New damage assessment structure - now occurs at assignment stage
  damageAssessment?: {
    hasDamage: boolean;
    damageType?: string;
    damageDescription?: string;
    assessmentStage: 'assignment' | 'inspection'; // Removed 'gate_in' - damage assessment now happens during assignment
    assessedBy: string;
    assessedAt: Date;
  };
  sealNumbers?: string[];
  weight?: number;
  temperature?: number;
  assignedLocation?: string;
  status: 'pending' | 'in_process' | 'completed' | 'cancelled';
  operationStatus?: 'pending' | 'in_process' | 'completed' | 'cancelled'; // For filtering compatibility
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
  truckNumber?: string; // Changed from vehicleNumber to truckNumber
  status: 'pending' | 'in_process' | 'completed' | 'cancelled';
  createdBy: string;
  operatorId?: string;
  operatorName?: string;
  createdAt: Date;
  updatedAt?: Date;
  updatedBy?: string;
  completedAt?: Date;
  estimatedReleaseDate?: Date;
  notes?: string;
  yardId: string;
  ediTransmitted: boolean;
  processedContainerIds?: string[];
  bookingReferenceId: string;
}

export interface AuditLogEntry {
  id: string;
  entityType: 'container' | 'booking_reference' | 'gate_operation' | 'user' | 'client' | 'yard';
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
