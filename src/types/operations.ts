// ============================================
// NOUVELLES INTERFACES - TABLES NORMALISÉES
// ============================================

/**
 * Gate In EDI Details (table normalisée)
 */
export interface GateInEdiDetails {
  id: string;
  gate_in_operation_id: string;
  edi_message_id?: string;
  edi_client_name?: string;
  edi_client_code?: string;
  edi_processing_started_at?: string;
  edi_gate_in_transmitted: boolean;
  edi_transmission_date?: string;
  edi_log_id?: string;
  edi_error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Gate In Transport Info (table normalisée)
 */
export interface GateInTransportInfo {
  id: string;
  gate_in_operation_id: string;
  transport_company?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_number?: string;
  truck_arrival_date?: string;
  truck_arrival_time?: string;
  booking_reference?: string;
  equipment_reference?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Gate In Damage Assessment (table normalisée)
 */
export interface GateInDamageAssessment {
  id: string;
  gate_in_operation_id: string;
  damage_reported: boolean;
  damage_description?: string;
  damage_type?: string;
  damage_assessment?: any; // JSONB
  damage_assessment_stage: string;
  damage_assessed_by?: string;
  damage_assessed_at?: string;
  damage_assessment_started_at?: string;
  damage_assessment_completed_at?: string;
  is_buffer_assignment: boolean;
  buffer_zone_reason?: string;
  assigned_stack?: string;
  assigned_location?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Gate Out EDI Details (table normalisée)
 */
export interface GateOutEdiDetails {
  id: string;
  gate_out_operation_id: string;
  edi_message_id?: string;
  edi_client_name?: string;
  edi_processing_started_at?: string;
  edi_gate_out_transmitted: boolean;
  edi_transmission_date?: string;
  edi_log_id?: string;
  edi_error_message?: string;
  container_selection_started_at?: string;
  container_selection_completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Gate Out Transport Info (table normalisée)
 */
export interface GateOutTransportInfo {
  id: string;
  gate_out_operation_id: string;
  transport_company?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_number?: string;
  booking_number: string;
  created_at: string;
  updated_at: string;
}

/**
 * Gate In Operation Complete (avec tables normalisées)
 * Utilisé pour l'affichage avec toutes les données jointes
 */
export interface GateInOperationComplete extends GateInOperation {
  edi_details?: GateInEdiDetails;
  transport_info?: GateInTransportInfo;
  damage_assessment_data?: GateInDamageAssessment;
}

/**
 * Gate Out Operation Complete (avec tables normalisées)
 */
export interface GateOutOperationComplete extends GateOutOperation {
  edi_details?: GateOutEdiDetails;
  transport_info?: GateOutTransportInfo;
}

// ============================================
// INTERFACES EXISTANTES (inchangées pour compatibilité)
// ============================================

export interface GateInOperation {
  id: string;
  containerNumber: string;
  containerId?: string;
  clientCode: string;
  clientName: string;
  containerType: string;
  containerSize: string;
  isHighCube?: boolean; // From Gate In form (High Cube switch)
  containerQuantity: 1 | 2; // Number of containers in this operation (1 or 2 for 20ft)
  secondContainerNumber?: string; // Second container number when containerQuantity is 2
  transportCompany: string;
  driverName: string;
  truckNumber?: string; // Changed from vehicleNumber to truckNumber
  bookingNumber?: string;
  equipmentReference?: string; // Equipment reference for EDI transmission
  containerIsoCode?: string;   // ISO type from dropdown (e.g. 45G1)
  fullEmpty?: 'FULL' | 'EMPTY';
  transactionType?: 'Retour Livraison' | 'Transfert (IN)';
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
  assignedLocation?: string;
  assignedStack?: string; // Stack number extracted from assignedLocation (e.g., "S04")
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
