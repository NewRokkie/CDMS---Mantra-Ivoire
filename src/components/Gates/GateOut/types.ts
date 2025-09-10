export interface PendingGateOut {
  id: string;
  date: Date;
  bookingNumber?: string;
  clientCode?: string;
  clientName?: string;
  bookingType?: 'IMPORT' | 'EXPORT';
  totalContainers: number;
  processedContainers: number;
  remainingContainers: number;
  transportCompany?: string;
  driverName?: string;
  vehicleNumber?: string;
  status: 'pending' | 'in_process' | 'completed';
  createdBy: string;
  createdAt: Date;
  estimatedReleaseDate?: Date;
  gateOutDateTime?: Date;
  gateOutDateTime?: Date;
  notes?: string;
}

export interface GateOutFormData {
  selectedReleaseOrderId: string;
  driverName: string;
  vehicleNumber: string;
  transportCompany: string;
  notes: string;
}

export interface ContainerValidation {
  isValid: boolean;
  message?: string;
}

export interface ContainerInput {
  containerNumber: string;
  confirmContainerNumber: string;
  isValid: boolean;
  validationMessage: string;
}