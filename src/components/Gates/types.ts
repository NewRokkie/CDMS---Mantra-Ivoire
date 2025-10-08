import { ReleaseOrder } from '../../types';

// ========== FORM DATA TYPES ==========

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
  bookingType?: 'EXPORT' | 'IMPORT';
}

export interface GateOutFormData {
  selectedReleaseOrderId: string;
  driverName: string;
  vehicleNumber: string;
  transportCompany: string;
  notes: string;
}

// ========== COMPONENT PROPS TYPES ==========

export interface GateInModalProps {
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  formData: GateInFormData;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isProcessing: boolean;
  autoSaving: boolean;
  validateStep: (step: number) => boolean;
  handleSubmit: () => void;
  handleNextStep: () => void;
  handlePrevStep: () => void;
  handleInputChange: (field: keyof GateInFormData, value: any) => void;
  handleContainerSizeChange: (size: '20ft' | '40ft') => void;
  handleQuantityChange: (quantity: 1 | 2) => void;
  handleStatusChange: (isFullStatus: boolean) => void;
  handleDamageChange: (isDamaged: boolean) => void;
  handleClientChange: (clientId: string) => void;
  mockClients: Array<{ id: string; code: string; name: string }>;
}

export interface GateOutModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  availableBookings: ReleaseOrder[];
  onSubmit: (data: any) => void;
  isProcessing: boolean;
}

// ========== OPERATION DATA TYPES ==========

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
  bookingType?: 'EXPORT' | 'IMPORT';
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
  yardId?: string;
  yardCode?: string;
}

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
  updatedBy: string;
  updatedAt?: Date;
  notes?: string;
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

// ========== COMPONENT TYPES ==========

export interface ContainerTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  containerSize: '20ft' | '40ft';
}

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  leftLabel: string;
  rightLabel: string;
  disabled?: boolean;
}

// ========== MOCK DATA TYPES ==========

export interface MockLocation {
  id: string;
  name: string;
  capacity: number;
  available: number;
  section: string;
}

export interface MockLocations {
  '20ft': MockLocation[];
  '40ft': MockLocation[];
  damage: MockLocation[];
}
