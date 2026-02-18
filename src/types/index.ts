export interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'admin' | 'operator' | 'supervisor';
  company?: string;
  avatar?: string;
  phone?: string;
  department?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  createdBy: string;
  updatedBy?: string;
  moduleAccess: ModuleAccess;
  clientCode?: string; // For client users to filter their data
  yardAssignments?: string[]; // Array of yard IDs user has access to
  yardIds?: string[]; // Array of yard IDs user has access to
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface ModuleAccess {
  dashboard: boolean;
  containers: boolean;
  gateIn: boolean;
  gateOut: boolean;
  releases: boolean;
  edi: boolean;
  yard: boolean;
  clients: boolean;
  users: boolean;
  moduleAccess: boolean;
  reports: boolean;
  depotManagement: boolean;
  timeTracking: boolean;
  analytics: boolean;
  clientPools: boolean;
  stackManagement: boolean;
  auditLogs: boolean;
  billingReports: boolean;
  operationsReports: boolean;
}

export interface ModulePermission {
  id: string;
  name: string;
  description: string;
  category: 'core' | 'operations' | 'management' | 'admin';
  requiredRole?: User['role'][];
  isSystemModule: boolean;
}

export interface Client {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contactPerson: {
    name: string;
    email: string;
    phone: string;
    position: string;
  };
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  taxId?: string;
  creditLimit: number;
  paymentTerms: number; // days
  freeDaysAllowed: number; // Free storage days
  dailyStorageRate: number; // USD per day after free days
  currency: string; // Currency for billing
  autoEDI: boolean; // Automatic EDI transmission
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  notes?: string;
}

export interface Yard {
  id: string;
  name: string;
  code: string; // Unique code identifier for the yard
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
  layout: 'tantarelli' | 'yirima'; // Layout type for different rendering
  timezone?: string;
  contactInfo?: { manager: string; phone: string; email: string };
  address?: { street: string; city: string; state: string; zipCode: string; country: string };
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
  dimensions: { width: number; length: number };
  color?: string; // For visual distinction
}

export interface RowTierConfig {
  row: number;
  maxTiers: number;
}

export interface YardStack {
  id: string;
  yardId?: string;
  stackNumber: number;
  sectionId: string;
  sectionName?: string;
  rows: number;
  maxTiers: number;
  rowTierConfig?: RowTierConfig[]; // Per-row tier configuration
  currentOccupancy: number;
  capacity: number;
  containerSize?: '20ft' | '40ft';
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
  isSpecialStack?: boolean;
  isActive?: boolean;
  assignedClientCode?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface YardBlock {
  id: string;
  name: string;
  type: 'storage' | 'maintenance' | 'inspection' | 'gate';
  capacity: number;
  currentOccupancy: number;
  position: {
    x: number; // Right (-left), Front (negative from door), Ground (0平整)
    z: number; // Stack level (0-bottom, 1-2nd, 2-3rd, 3-4th, 4-5th)
    y: number; // Bay/Cage/Bed (-from left door)
  };
  dimensions: {
    width: number;
    length: number;
    height: number;
  };
  isActive: boolean;
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
  }; // Exact coordinates in yard3D space
  isOccupied: boolean;
  containerId?: string;
  containerNumber?: string;
  containerSize?: '20ft' | '40ft';
  reservedUntil?: Date;
  clientCode?: string;
  placedAt?: Date;
}

export interface Container {
  id: string;
  number: string;
  type: 'dry' | 'high_cube' | 'hard_top' | 'ventilated' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
  size: '20ft' | '40ft';
  status: 'gate_in' | 'in_depot' | 'gate_out' | 'out_depot' | 'maintenance' | 'cleaning';
  fullEmpty?: 'FULL' | 'EMPTY'; // Full or Empty status
  location: string;
  yardId?: string; // Add yard ID for direct relations
  yardPosition?: YardPosition;
  gateInDate?: Date;
  gateOutDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  placedAt?: Date;
  createdBy: string;
  updatedBy?: string;
  clientName: string;
  clientId?: string; // Add client ID for direct relations
  clientCode?: string; // Add client code for filtering
  releaseOrderId?: string;
  classification?: 'divers' | 'alimentaire'; // Container classification
  transactionType?: 'Retour Livraison' | 'Transfert (IN)'; // Transaction type for Gate In
  damage?: string[];
  auditLogs?: AuditLog[];
  // Enhanced yard management fields
  coordinates?: string; // Grid coordinates (e.g., "A-12-03")
  contents?: string; // Description of container contents
  origin?: string; // Origin location
  destination?: string; // Destination location
  arrivalDate?: Date; // Arrival at yard
  departureDate?: Date; // Expected departure
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  temperature?: number; // For reefer containers
  hazardous?: boolean; // Hazardous materials flag
  customsStatus?: 'pending' | 'cleared' | 'hold';
  bookingReference?: string;
  // EDI fields
  ediTransmitted?: boolean; // Whether EDI was transmitted
  ediTransmissionDate?: Date; // When EDI was transmitted
  ediErrorMessage?: string; // Error message if EDI failed
  // Soft delete fields
  isDeleted?: boolean; // Soft delete flag
  deletedAt?: Date; // When container was deleted
  deletedBy?: string; // User ID who deleted the container
}

export interface BookinReferenceContainer {
  id: string;
  containerId: string;
  containerNumber: string;
  containerType: string;
  containerSize: string;
  currentLocation: string;
  status: 'pending' | 'ready' | 'released' | 'cancelled';
  addedAt: Date;
  releasedAt?: Date;
  notes?: string;
}

export interface ContainerQuantityBySize {
  size20ft: number;
  size40ft: number;
}

export interface BookingReference {
  containers: any;
  remainingContainers: number;
  id: string;
  bookingNumber: string;
  clientId: string;
  clientCode?: string;
  clientName: string;
  bookingType: 'IMPORT' | 'EXPORT';
  transactionType?: 'Positionnement' | 'Transfert (OUT)'; // Transaction type for Gate Out reports
  containerQuantities: ContainerQuantityBySize;
  totalContainers: number;
  maxQuantityThreshold: number;
  requiresDetailedBreakdown: boolean;
  status: 'pending' | 'in_process' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
  notes?: string;
  cancellationReason?: string;
  newBookingReference?: string;
}

export interface CODECOMessage {
  messageHeader: {
    messageType: 'CODECO';
    version: string;
    release: string;
    controllingAgency: string;
    messageReferenceNumber: string;
    documentDate: Date;
    documentTime: string;
  };
  beginningOfMessage: {
    documentNameCode: string;
    documentNumber: string;
    messageFunction: string;
  };
  dateTimePeriod: {
    qualifier: string;
    dateTime: Date;
    formatQualifier: string;
  };
  transportDetails: {
    transportStageQualifier: string;
    conveyanceReferenceNumber: string;
    modeOfTransport: string;
  };
  locationDetails: {
    locationQualifier: string;
    locationIdentification: string;
    locationName?: string;
  };
  equipmentDetails: EquipmentDetail[];
}

export interface EquipmentDetail {
  equipmentQualifier: string;
  equipmentIdentification: string;
  equipmentSizeAndType: {
    sizeTypeCode: string;
    codeListQualifier: string;
  };
  statusOfEquipment: { equipmentStatusCode: string; fullEmptyIndicator: string };
  measurements?: {
    measurementUnitQualifier: string;
    measurementValue: number;
    measurementUnitCode: string;
  };
  damageDetails?: DamageDetail[];
  sealNumbers?: string[];
  temperatureSettings?: {
    temperatureTypeQualifier: string;
    temperatureValue: number;
    temperatureUnitCode: string;
  };
}

export interface DamageDetail {
  damageDetailsQualifier: string;
  damageCode: string;
  damageLocation: string;
  damageType: string;
  damageExtent: string;
}

export interface EDITransmissionConfig {
  sftpHost: string;
  sftpPort: number;
  sftpUsername: string;
  sftpPassword?: string;
  sftpPrivateKey?: string;
  remotePath: string;
  fileNamePattern: string;
  partnerCode: string;
  senderCode: string;
  testMode: boolean;
}

export interface EDITransmissionLog {
  id: string;
  messageType: 'CODECO';
  operation: 'GATE_IN' | 'GATE_OUT';
  containerNumber: string;
  fileName: string;
  transmissionDate: Date;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'ACKNOWLEDGED';
  errorMessage?: string;
  partnerCode: string;
  retryCount: number;
  acknowledgmentReceived?: Date;
}

export type Language = 'en' | 'fr';

export interface DashboardStats {
  totalContainers: number;
  containersIn: number;
  containersOut: number;
  pendingReleaseOrders: number;
  todayMovements: number;
  revenue: number;
  occupancyRate: number;
}

export interface AuditLog {
  timestamp: Date;
  user: string;
  action: string;
  details?: string;
}

export interface UserDetails extends User {
  yardDetails: YardAssignment[];
  activityHistory: UserActivity[];
  permissionSummary: PermissionSummary;
  loginHistory: LoginRecord[];
  createdByName?: string; // Name of the user who created this user
}

export interface YardAssignment {
  yardId: string;
  yardName: string;
  yardCode: string;
  assignedAt: Date;
  assignedBy: string;
}

export interface UserActivity {
  id: string;
  action: string;
  timestamp: Date;
  details?: string;
  ipAddress?: string;
}

export interface PermissionSummary {
  totalModules: number;
  enabledModules: number;
  disabledModules: number;
  moduleList: {
    module: keyof ModuleAccess;
    enabled: boolean;
    category: 'core' | 'operations' | 'management' | 'admin';
  }[];
}

export interface LoginRecord {
  id: string;
  userId: string;
  loginTime: Date;
  logoutTime?: Date;
  ipAddress?: string;
  userAgent?: string;
  sessionDuration?: number; // in minutes
}

// Location Management Types
export * from './location';
export * from './yard';
