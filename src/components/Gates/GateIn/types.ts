export interface GateInFormData {
  // Step 1: Container Information
  containerSize: '20ft' | '40ft';
  containerType: 'standard' | 'hi_cube' | 'hard_top' | 'ventilated' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
  containerQuantity: 1 | 2;
  status: 'FULL' | 'EMPTY';
  isDamaged: boolean;
  clientId: string;
  clientCode: string;
  clientName: string;
  bookingReference: string;
  containerNumber: string;
  secondContainerNumber: string; // For when quantity is 2

  // Step 2: Transport Details
  driverName: string;
  truckNumber: string;
  transportCompany: string;

  // Location & Validation (Step 3)
  assignedLocation: string;
  truckArrivalDate: string; // Now captured in Gate In form
  truckArrivalTime: string; // Now captured in Gate In form
  truckDepartureDate: string;
  truckDepartureTime: string;

  // Additional fields
  notes: string;
  operationStatus: 'pending' | 'completed';
}

export interface GateInOperation {
  id: string;
  date: Date;
  containerNumber: string;
  secondContainerNumber?: string;
  containerSize: string;
  containerType?: string;
  containerQuantity: number;
  status: 'FULL' | 'EMPTY';
  isDamaged: boolean;
  bookingReference?: string;
  clientCode: string;
  clientName: string;
  truckNumber: string;
  driverName: string;
  transportCompany: string;
  operationStatus: 'pending' | 'completed';
  assignedLocation?: string;
  truckArrivalDate?: string;
  truckArrivalTime?: string;
  truckDepartureDate?: string;
  truckDepartureTime?: string;
  completedAt?: Date;
}

export interface Client {
  id: string;
  code: string;
  name: string;
}

export interface LocationData {
  id: string;
  name: string;
  capacity: number;
  available: number;
  section: string;
  type?: string;
}

export interface ContainerValidation {
  isValid: boolean;
  message?: string;
}