import { BookingReference } from '../../types';
import { Client, MockLocations, GateInOperation, PendingGateOut } from './types';

// ========== CLIENT DATA ==========

export const mockClients: Client[] = [
  { id: '1', code: '1088663', name: 'MAERSK LINE' },
  { id: '2', code: '2045789', name: 'MSC MEDITERRANEAN SHIPPING' },
  { id: '3', code: '3067234', name: 'CMA CGM' },
  { id: '4', code: '4012567', name: 'SHIPPING SOLUTIONS INC' },
  { id: '5', code: '5098432', name: 'HAPAG-LLOYD' }
];

// ========== LOCATION DATA ==========

export const mockLocations: MockLocations = {
  '20ft': [
    { id: 'S1', name: 'Stack S1', capacity: 20, available: 15, section: 'Top Section' },
    { id: 'S31', name: 'Stack S31', capacity: 35, available: 28, section: 'Top Section' },
    { id: 'S101', name: 'Stack S101', capacity: 5, available: 3, section: 'Bottom Section' },
    { id: 'S103', name: 'Stack S103', capacity: 10, available: 7, section: 'Bottom Section' }
  ],
  '40ft': [
    { id: 'S3-S5', name: 'Stack S3+S5', capacity: 25, available: 20, section: 'Top Section' },
    { id: 'S7-S9', name: 'Stack S7+S9', capacity: 25, available: 22, section: 'Top Section' },
    { id: 'S61-S63', name: 'Stack S61+S63', capacity: 30, available: 25, section: 'Bottom Section' },
    { id: 'S65-S67', name: 'Stack S65+S67', capacity: 30, available: 28, section: 'Bottom Section' }
  ],
  damage: [
    { id: 'DMG-VIRTUAL', name: 'Damage Stack (Virtual)', capacity: 999, available: 999, section: 'Virtual' }
  ]
};

// ========== MOCK OPERATIONS DATA ==========

export const mockPendingGateInOperations: GateInOperation[] = [
  {
    id: 'PO-001',
    date: new Date('2025-01-11T14:30:00'),
    containerNumber: 'MSKU-123456-7',
    secondContainerNumber: '',
    containerSize: '40ft',
    containerType: 'dry',
    containerQuantity: 1,
    status: 'FULL',
    classification: 'divers',
    bookingReference: 'BK-MAE-2025-001',
    bookingType: 'EXPORT',
    clientCode: '1088663',
    clientName: 'MAERSK LINE',
    truckNumber: 'ABC-123',
    driverName: 'John Smith',
    transportCompany: 'Swift Transport',
    operationStatus: 'pending',
    assignedLocation: '',
    truckArrivalDate: '',
    truckArrivalTime: '',
    truckDepartureDate: '',
    truckDepartureTime: '',
    createdAt: new Date()
  },
  {
    id: 'PO-002',
    date: new Date('2025-01-11T15:45:00'),
    containerNumber: 'TCLU-987654-3',
    secondContainerNumber: 'TCLU-987654-4',
    containerSize: '20ft',
    containerType: 'reefer',
    containerQuantity: 2,
    status: 'EMPTY',
    classification: 'alimentaire',
    bookingReference: '',
    clientCode: '2045789',
    clientName: 'MSC MEDITERRANEAN SHIPPING',
    truckNumber: 'XYZ-456',
    driverName: 'Maria Garcia',
    transportCompany: 'Express Logistics',
    operationStatus: 'pending',
    assignedLocation: '',
    truckArrivalDate: '',
    truckArrivalTime: '',
    truckDepartureDate: '',
    truckDepartureTime: '',
    createdAt: new Date()
  },
  {
    id: 'PO-003',
    date: new Date('2025-01-11T16:20:00'),
    containerNumber: 'GESU-456789-1',
    secondContainerNumber: '',
    containerSize: '40ft',
    containerType: 'dry',
    containerQuantity: 1,
    status: 'FULL',
    classification: 'divers',
    bookingReference: 'BK-CMA-2025-003',
    clientCode: '3067234',
    clientName: 'CMA CGM',
    truckNumber: 'DEF-789',
    driverName: 'Robert Chen',
    transportCompany: 'Ocean Transport',
    operationStatus: 'pending',
    assignedLocation: '',
    truckArrivalDate: '',
    truckArrivalTime: '',
    truckDepartureDate: '',
    truckDepartureTime: '',
    createdAt: new Date()
  }
];

export const mockCompletedGateInOperations: GateInOperation[] = [
  {
    id: 'CO-001',
    date: new Date('2025-01-11T13:15:00'),
    containerNumber: 'SHIP-111222-8',
    secondContainerNumber: '',
    containerSize: '20ft',
    containerType: 'dry',
    containerQuantity: 1,
    status: 'FULL',
    classification: 'divers',
    bookingReference: 'BK-SHIP-2025-001',
    clientCode: '4012567',
    clientName: 'SHIPPING SOLUTIONS INC',
    truckNumber: 'GHI-012',
    driverName: 'Lisa Green',
    transportCompany: 'Local Transport',
    operationStatus: 'completed',
    assignedLocation: 'S01-R1-H1',
    truckArrivalDate: '2025-01-11',
    truckArrivalTime: '13:15',
    truckDepartureDate: '2025-01-11',
    truckDepartureTime: '13:45',
    completedAt: new Date('2025-01-11T13:45:00')
  },
  {
    id: 'CO-002',
    date: new Date('2025-01-11T12:30:00'),
    containerNumber: 'MAEU-777888-9',
    secondContainerNumber: 'MAEU-777889-0',
    containerSize: '20ft',
    containerType: 'dry',
    containerQuantity: 2,
    status: 'EMPTY',
    classification: 'divers',
    bookingReference: '',
    clientCode: '1088663',
    clientName: 'MAERSK LINE',
    truckNumber: 'JKL-345',
    driverName: 'Tom Wilson',
    transportCompany: 'Global Logistics',
    operationStatus: 'completed',
    assignedLocation: 'S31-R1-H1',
    truckArrivalDate: '2025-01-11',
    truckArrivalTime: '12:30',
    truckDepartureDate: '2025-01-11',
    truckDepartureTime: '13:00',
    completedAt: new Date('2025-01-11T13:00:00')
  }
];

// ========== GATE OUT MOCK DATA ==========

export const mockAvailableBookings: ReleaseOrder[] = [
  {
    id: 'RO-2025-001',
    bookingNumber: 'BK-MAEU-2025-001',
    clientId: '1',
    clientCode: 'MAEU',
    clientName: 'Maersk Line',
    bookingType: 'EXPORT',
    containerQuantities: { size20ft: 2, size40ft: 3 },
    totalContainers: 5,
    remainingContainers: 5,
    status: 'pending',
    createdBy: 'System',
    updatedBy: 'System',
    createdAt: new Date('2025-01-11T09:00:00'),
    notes: 'Priority booking - handle with care'
  },
  {
    id: 'RO-2025-004',
    bookingNumber: 'BK-CMA-2025-004',
    clientId: '2',
    clientCode: 'CMA',
    clientName: 'CMA CGM',
    bookingType: 'IMPORT',
    containerQuantities: { size20ft: 1, size40ft: 0 },
    totalContainers: 1,
    remainingContainers: 1,
    status: 'pending',
    createdBy: 'System',
    updatedBy: 'System',
    createdAt: new Date('2025-01-11T11:00:00'),
    notes: 'Single container booking - urgent processing required'
  }
];

export const mockPendingGateOutOperations: PendingGateOut[] = [
  {
    id: 'PGO-001',
    date: new Date('2025-01-11T14:30:00'),
    bookingNumber: 'BK-MAEU-2025-001',
    clientCode: 'MAEU',
    clientName: 'Maersk Line',
    bookingType: 'EXPORT',
    totalContainers: 5,
    processedContainers: 2,
    remainingContainers: 3,
    transportCompany: 'Swift Transport',
    driverName: 'John Smith',
    vehicleNumber: 'ABC-123',
    status: 'in_process',
    createdBy: 'Jane Operator',
    createdAt: new Date('2025-01-11T14:30:00'),
    updatedBy: 'System',
    notes: 'Priority booking - handle with care'
  },
  {
    id: 'PGO-002',
    date: new Date('2025-01-11T15:45:00'),
    bookingNumber: 'BK-CMA-2025-004',
    clientCode: 'CMA',
    clientName: 'CMA CGM',
    bookingType: 'IMPORT',
    totalContainers: 1,
    processedContainers: 0,
    remainingContainers: 1,
    transportCompany: 'Express Logistics',
    driverName: 'Maria Garcia',
    vehicleNumber: 'XYZ-456',
    status: 'pending',
    createdBy: 'Sarah Client',
    createdAt: new Date('2025-01-11T15:45:00'),
    updatedBy: 'System',
    notes: 'Single container booking - urgent processing required'
  }
];

export const mockCompletedGateOutOperations: PendingGateOut[] = [
  {
    id: 'CGO-001',
    date: new Date('2025-01-11T13:15:00'),
    bookingNumber: 'BK-SHIP-2025-003',
    clientCode: 'SHIP001',
    clientName: 'Shipping Solutions Inc',
    bookingType: 'EXPORT',
    totalContainers: 2,
    processedContainers: 2,
    remainingContainers: 0,
    transportCompany: 'Local Transport Co',
    driverName: 'David Brown',
    vehicleNumber: 'GHI-012',
    status: 'completed',
    createdBy: 'Jane Operator',
    createdAt: new Date('2025-01-11T11:30:00'),
    updatedBy: 'System',
    notes: 'Client requested release - completed successfully'
  }
];

// ========== CONTAINER TYPE OPTIONS ==========

export const containerTypeOptions = [
  { value: 'dry', label: 'Dry', code20: '22G1', code40: '42G1' },
  { value: 'high_cube', label: 'High-Cube (HC-45ft)', code20: '', code40: '45G1' },
  { value: 'hard_top', label: 'Hard Top', code20: '22H1', code40: '42H1' },
  { value: 'ventilated', label: 'Ventilated', code20: '22V1', code40: '42V1' },
  { value: 'reefer', label: 'Reefer', code20: '22R1', code40: '42R1' },
  { value: 'tank', label: 'Tank', code20: '22T1', code40: '42T1' },
  { value: 'flat_rack', label: 'Flat Rack', code20: '22P1', code40: '42P1' },
  { value: 'open_top', label: 'Open Top', code20: '22U1', code40: '42U1' },
];

// ========== FORM CONSTANTS ==========

export const GATE_IN_FORM_STEPS = {
  CONTAINER_INFO: 1,
  TRANSPORT_DETAILS: 2
} as const;

export const GATE_OUT_FORM_STEPS = {
  BOOKING_SELECTION: 1,
  TRANSPORT_DETAILS: 2
} as const;

export const CONTAINER_SIZES = {
  TWENTY_FOOT: '20ft',
  FORTY_FOOT: '40ft'
} as const;

export const CONTAINER_QUANTITIES = {
  SINGLE: 1,
  DOUBLE: 2
} as const;

export const CONTAINER_STATUS = {
  FULL: 'FULL',
  EMPTY: 'EMPTY'
} as const;

export const OPERATION_STATUS = {
  PENDING: 'pending',
  IN_PROCESS: 'in_process',
  COMPLETED: 'completed',
} as const;

// ========== VALIDATION CONSTANTS ==========

export const VALIDATION_MESSAGES = {
  CONTAINER_NUMBER_REQUIRED: 'Container number is required',
  CONTAINER_NUMBER_INVALID_LENGTH: 'Container number must be exactly 11 characters',
  CONTAINER_NUMBER_INVALID_FORMAT: 'Container number must be 4 letters followed by 7 numbers',
  BOOKING_REQUIRED: 'Please select a booking',
  DRIVER_NAME_REQUIRED: 'Driver name is required',
  VEHICLE_NUMBER_REQUIRED: 'Vehicle number is required',
  TRANSPORT_COMPANY_REQUIRED: 'Transport company is required',
  CLIENT_REQUIRED: 'Please select a client'
} as const;

// ========== UI CONSTANTS ==========

export const ANIMATION_CLASSES = {
  FADE_IN: 'animate-fade-in',
  SLIDE_IN_UP: 'animate-slide-in-up',
  SLIDE_IN_RIGHT: 'animate-slide-in-right',
  SPIN: 'animate-spin',
  BOUNCE: 'animate-bounce'
} as const;

export const COMMON_STYLES = {
  MODAL_BACKDROP: 'fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50',
  MODAL_CONTAINER: 'bg-white rounded-2xl w-full max-w-2xl shadow-strong animate-slide-in-up max-h-[90vh] overflow-hidden flex flex-col',
  CARD_CONTAINER: 'bg-white rounded-xl border border-gray-200 shadow-sm p-6',
  BUTTON_PRIMARY: 'btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 sm:px-6 sm:py-2 text-sm',
  BUTTON_SECONDARY: 'btn-secondary px-3 py-2 sm:px-6 sm:py-2 text-sm',
  INPUT_FIELD: 'form-input w-full text-base py-4'
} as const;
