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
  moduleAccess: ModuleAccess;
  clientCode?: string; // For client users to filter their data
  yardAssignments?: string[]; // Array of yard IDs user has access to
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
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export interface Yard {
  id: string;
  name: string;
  description: string;
  location: string;
  isActive: boolean;
  totalCapacity: number;
  currentOccupancy: number;
  sections: YardSection[];
  createdAt: Date;
  updatedAt: Date;
  layout: 'tantarelli' | 'standard'; // Layout type for different rendering
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
  dimensions: {
    width: number;
    length: number;
  };
  color?: string; // For visual distinction
}

export interface YardStack {
  id: string;
  stackNumber: number;
  sectionId: string;
  rows: number;
  maxTiers: number; // Maximum height (5 containers)
  currentOccupancy: number;
  capacity: number; // rows * maxTiers
  position: {
    x: number;
    y: number;
    z: number;
  };
  dimensions: {
    width: number; // Based on container size (20ft = 6m, 40ft = 12m)
    length: number; // Row depth
  };
  containerPositions: YardPosition[];
  isOddStack?: boolean; // For Tantarelli layout (odd numbered stacks)
}

export interface YardBlock {
  id: string;
  name: string;
  type: 'storage' | 'maintenance' | 'inspection' | 'gate';
  capacity: number;
  currentOccupancy: number;
  position: {
    x: number;
    y: number;
    z: number;
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
  };
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
  type: 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
  size: '20ft' | '40ft';
  status: 'in_depot' | 'out_depot' | 'in_service' | 'maintenance' | 'cleaning';
  location: string;
  yardPosition?: YardPosition;
  gateInDate?: Date;
  gateOutDate?: Date;
  client: string;
  clientId?: string;
  clientCode?: string; // Add client code for filtering
  releaseOrderId?: string;
  damage?: string[];
}

export interface ReleaseOrderContainer {
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
  id: string;
  bookingNumber: string;
  clientId: string;
  clientCode?: string;
  clientName: string;
  bookingType: 'IMPORT' | 'EXPORT';
  containerQuantities: ContainerQuantityBySize;
  totalContainers: number;
  maxQuantityThreshold: number;
  requiresDetailedBreakdown: boolean;
  status: 'draft' | 'pending' | 'validated' | 'partial' | 'completed' | 'cancelled';
  createdBy: string;
  validatedBy?: string;
  createdAt: Date;
  validatedAt?: Date;
  completedAt?: Date;
  notes?: string;
  estimatedReleaseDate?: Date;
}

export interface ReleaseOrder {
  id: string;
  bookingNumber?: string;
  clientId: string;
  clientCode?: string;
  clientName: string;
  bookingType?: 'IMPORT' | 'EXPORT';
  containerQuantities?: ContainerQuantityBySize | { size20ft: 0; size40ft: 0 };
  totalContainers: number;
  remainingContainers?: number; // Track remaining containers for status calculation
  maxQuantityThreshold?: number;
  requiresDetailedBreakdown?: boolean;
  containers?: ReleaseOrderContainer[];
  transportCompany?: string;
  driverName?: string;
  vehicleNumber?: string;
  status: 'pending' | 'in_process' | 'completed' | 'cancelled';
  createdBy: string;
  validatedBy?: string;
  createdAt: Date;
  validatedAt?: Date;
  completedAt?: Date;
  notes?: string;
  estimatedReleaseDate?: Date;
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
  statusOfEquipment: {
    equipmentStatusCode: string;
    fullEmptyIndicator: string;
  };
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
