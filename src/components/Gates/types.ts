import { BookingReference } from '../../types';

// Import DamageAssessment interface
export interface DamageAssessment {
  hasDamage: boolean;
  damageType?: string;
  damageDescription?: string;
  assessmentStage: 'assignment';
  assessedBy: string;
  assessedAt: Date;
}

// ========== FORM DATA TYPES ==========

export interface GateInFormData {
  // Step 1: Container Information
  containerSize: '20ft' | '40ft';
  containerType: 'dry' | 'hard_top' | 'ventilated' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
  isHighCube: boolean;
  containerIsoCode?: string;
  containerQuantity: 1 | 2;
  status: 'FULL' | 'EMPTY';
  clientId: string;
  clientCode: string;
  clientName: string;
  bookingReference: string;
  equipmentReference: string; // Equipment reference for EDI transmission
  containerNumber: string;
  containerNumberConfirmation: string; // Confirmation field for container number
  secondContainerNumber: string; // For when quantity is 2
  secondContainerNumberConfirmation: string; // Confirmation field for second container number

  // Container Classification (replaces damage status)
  classification: 'divers' | 'alimentaire';

  // Step 2: Transport Details
  driverName: string;
  truckNumber: string;
  transportCompany: string;

  // Location & Validation (assigned later in pending operations)
  assignedLocation?: string;
  assignedStack?: string; // Stack selection (S##R#H# format)
  truckArrivalDate: string; // Now captured in Gate In form
  truckArrivalTime: string; // Now captured in Gate In form
  truckDepartureDate: string;
  truckDepartureTime: string;

  // Damage Assessment (completed during assignment stage)
  damageAssessment?: {
    hasDamage: boolean;
    damageType?: string;
    damageDescription?: string;
    assessmentStage: 'assignment';
    assessedBy: string;
    assessedAt: Date;
  };

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
  isCurrentStepValid: boolean;
  handleSubmit: () => void;
  handleNextStep: () => void;
  handlePrevStep: () => void;
  handleInputChange: (field: keyof GateInFormData, value: any) => void;
  handleContainerSizeChange: (size: '20ft' | '40ft') => void;
  handleHighCubeChange: (isHighCube: boolean) => void;
  handleQuantityChange: (quantity: 1 | 2) => void;
  handleStatusChange: (isFullStatus: boolean) => void;
  handleClientChange: (clientId: string) => void;
  // handleStackSelect?: (stackId: string, formattedLocation: string) => void; // Removed - stack selection moved to pending operations
  // handleDamageAssessment?: (assessment: DamageAssessment) => void; // Moved to pending operations
  clients: Array<{ id: string; code: string; name: string }>;
  submissionError?: string | null;
  validationErrors?: string[];
  validationWarnings?: string[];
}

export interface GateOutModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  availableBookings: BookingReference[];
  onSubmit: (data: any) => void;
  isProcessing: boolean;
}

// ========== OPERATION DATA TYPES ==========

export interface GateInOperation {
  id: string;
  date?: Date; // Deprecated: use createdAt instead
  createdAt: Date;
  containerNumber: string;
  secondContainerNumber?: string;
  containerSize: string;
  containerType?: string;
  containerQuantity?: number;
  status?: 'FULL' | 'EMPTY' | 'pending' | 'in_process' | 'completed' | 'cancelled';
  bookingReference?: string;
  bookingType?: 'EXPORT' | 'IMPORT';
  clientCode: string;
  clientName: string;
  truckNumber?: string;
  driverName?: string;
  vehicleNumber?: string;
  transportCompany?: string;
  operationStatus?: 'pending' | 'completed';
  assignedLocation?: string;
  truckArrivalDate?: string;
  truckArrivalTime?: string;
  truckDepartureDate?: string;
  truckDepartureTime?: string;
  completedAt?: Date;
  yardId?: string;
  yardCode?: string;
  operatorId?: string;
  operatorName?: string;
  damageReported?: boolean;
  damageDescription?: string;
  weight?: number;
  ediTransmitted?: boolean;
  ediTransmissionDate?: Date;
  containerId?: string;
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
  truckNumber: string;
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
  selectedIso?: string;
  onChange: (value: string, iso?: string) => void;
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
