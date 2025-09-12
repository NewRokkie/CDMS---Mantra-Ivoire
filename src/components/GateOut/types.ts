export interface PendingGateOut {
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
  estimatedReleaseDate?: Date;
  notes?: string;
  updatedBy: string;
  updatedAt?: Date;
}
