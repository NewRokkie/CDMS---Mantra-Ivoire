import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Search, Clock, AlertTriangle, Truck, Container as ContainerIcon, X, Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useYard } from '../../hooks/useYard';
import { gateService, clientService, containerService, realtimeService, locationManagementService, yardsService } from '../../services/api';
import { bufferZoneService } from '../../services/bufferZoneService';
import { ediTransmissionService } from '../../services/ediTransmissionService';
import { supabase } from '../../services/api/supabaseClient';

// import moment from 'moment'; // Commented out - not used in current code
import { CardSkeleton } from '../Common/CardSkeleton';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { TableSkeleton } from '../Common/TableSkeleton';
import { GateInModal } from './GateInModal';
import { PendingOperationsView } from './GateIn/PendingOperationsView';
import { MobileOperationsTable } from './GateIn/MobileOperationsTable';
import { GateInFormData } from './types';
import { isValidContainerTypeAndSize } from './GateInModal/ContainerTypeSelect';

import { ValidationService } from '../../services/validationService';
import { GateInError, handleError } from '../../services/errorHandling';
import { logger } from '../../utils/logger';
import { exportToExcel, formatDateForExport, formatDurationForExport } from '../../utils/excelExport';
import { useToast } from '../../hooks/useToast';
import { BufferZoneStats } from './BufferZoneStats';
import { BufferZoneManagement } from './BufferZoneManagement';

// Helper function to extract stack number from location (e.g., "S04R1H1" -> "S04")
const extractStackNumber = (location: string): string | null => {
  if (!location) return null;
  const match = location.match(/^(S[0-9]+)/);
  return match ? match[1] : null;
};

export const GateIn: React.FC = () => {
  const { user, hasModuleAccess } = useAuth();
  const { t } = useTranslation();
  const { currentYard, validateYardOperation } = useYard();
  const toast = useToast();

  const [activeView, setActiveView] = useState<'overview' | 'pending' | 'location'>('overview');
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [autoSaving, setAutoSaving] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [gateInOperations, setGateInOperations] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBufferZoneManagement, setShowBufferZoneManagement] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientsData, operationsData, containersData] = await Promise.all([
        clientService.getAll().catch(err => { handleError(err, 'GateIn.loadClients'); return []; }),
        gateService.getGateInOperations({ yardId: currentYard?.id }).catch(err => {
          handleError(err, 'GateIn.loadOperations');
          return [];
        }),
        containerService.getAll().catch(err => { handleError(err, 'GateIn.loadContainers'); return []; })
      ]);

      setClients(clientsData || []);
      setGateInOperations(operationsData || []);
      setContainers(containersData || []);
    } catch (error) {
      handleError(error, 'GateIn.loadData');
      setClients([]);
      setGateInOperations([]);
      setContainers([]);
    } finally {
      setLoading(false);
    }
  }, [currentYard?.id]);

  // Load data when currentYard changes
  useEffect(() => {
    if (currentYard?.id) {
      loadData();
    }
  }, [currentYard?.id, loadData]);


  useEffect(() => {
    if (!currentYard?.id) return;

    const unsubscribeGateIn = realtimeService.subscribeToGateInOperations(
      currentYard.id,
      () => {
        if (document.visibilityState === 'visible') {
          loadData();
        }
      }
    );

    const unsubscribeContainers = realtimeService.subscribeToContainers(() => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    });

    return () => {
      try { unsubscribeGateIn(); } catch { /* ignore */ }
      try { unsubscribeContainers(); } catch { /* ignore */ }
    };
  }, [currentYard?.id, loadData]);


  const pendingOperations = gateInOperations.filter(op =>
    op.status === 'pending' || !op.assignedLocation
  );
  const completedOperations = gateInOperations.filter(op =>
    op.status === 'completed' && op.assignedLocation
  );
  const [selectedFilter, setSelectedFilter] = useState('all');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState<GateInFormData>({
    containerSize: '20ft',
    containerType: 'dry',
    isHighCube: false,
    containerIsoCode: '',
    containerQuantity: 1,
    status: 'FULL',
    clientId: '',
    clientCode: '',
    clientName: '',
    bookingReference: '',
    equipmentReference: '', // Equipment reference for EDI transmission
    containerNumber: '',
    containerNumberConfirmation: '',
    secondContainerNumber: '',
    secondContainerNumberConfirmation: '',
    classification: 'divers', // Default to 'divers'
    transactionType: 'Retour Livraison', // Default to 'Retour Livraison'
    bookingType: 'EXPORT',
    driverName: '',
    truckNumber: '',
    transportCompany: '',
    truckArrivalDate: '', // Empty by default - will use system time if not manually set
    truckArrivalTime: '', // Empty by default - will use system time if not manually set
    truckDepartureDate: '',
    truckDepartureTime: '',
    notes: '',
    operationStatus: 'pending'
  });

  const canPerformGateIn = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Combine all operations for unified display
  const allOperations = [...pendingOperations, ...completedOperations].sort((a, b) =>
    new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison

  const todayGateIns = allOperations.filter(op => {
    const opDate = new Date(op.createdAt || op.date);
    opDate.setHours(0, 0, 0, 0);
    return opDate.getTime() === today.getTime();
  });

  const alimentaireContainersCount = allOperations.filter(op => op.classification === 'alimentaire').length;

  const handleHighCubeChange = useCallback((isHighCube: boolean) => {
    setFormData(prev => {
      // If switching High Cube, validate if current container type is still valid
      const isCurrentTypeValid = isValidContainerTypeAndSize(prev.containerType, prev.containerSize, isHighCube);

      return {
        ...prev,
        isHighCube,
        // Reset to default 'dry' type if current type is not valid for new high cube setting
        containerType: isCurrentTypeValid ? prev.containerType : 'dry'
      };
    });
  }, []);

  const handleStatusChange = useCallback((isFullStatus: boolean) => {
    const newStatus = isFullStatus ? 'FULL' : 'EMPTY';
    setFormData(prev => ({
      ...prev,
      status: newStatus,
      bookingReference: newStatus === 'EMPTY' ? '' : prev.bookingReference
    }));
  }, []);

  const handleQuantityChange = useCallback((quantity: 1 | 2) => {
    setFormData(prev => ({
      ...prev,
      containerQuantity: quantity,
      secondContainerNumber: quantity === 1 ? '' : prev.secondContainerNumber
    }));
  }, []);

  const handleContainerSizeChange = useCallback((size: '20ft' | '40ft') => {
    setFormData(prev => {
      // Check if current container type is valid for the new size and high cube flag
      const isCurrentTypeValid = isValidContainerTypeAndSize(prev.containerType, size, prev.isHighCube);

      // If switching to 20ft, disable High Cube since it's only for 40ft
      const newIsHighCube = size === '20ft' ? false : prev.isHighCube;

      return {
        ...prev,
        containerSize: size,
        isHighCube: newIsHighCube,
        containerQuantity: size === '40ft' ? 1 : prev.containerQuantity,
        secondContainerNumber: size === '40ft' ? '' : prev.secondContainerNumber,
        // Reset to default 'dry' type if current type is not valid for new size
        containerType: isCurrentTypeValid ? prev.containerType : 'dry'
      };
    });
  }, []);

  const handleInputChange = useCallback((field: keyof GateInFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Trigger auto-save with cleanup
    setAutoSaving(true);
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => setAutoSaving(false), 1000);
  }, []);

  const handleTransactionTypeChange = useCallback((transactionType: 'Retour Livraison' | 'Transfert (IN)') => {
    setFormData(prev => ({
      ...prev,
      transactionType
    }));
  }, []);

  const handleClientChange = useCallback((clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        clientId: selectedClient.id,
        clientCode: selectedClient.code,
        clientName: selectedClient.name
      }));
    }
  }, [clients]);

  // Memoized validation check for current step (safe for render-time calls)
  const isCurrentStepValid = React.useMemo(() => {
    try {
      if (!formData) return false;
      const hasTimeTrackingAccess = hasModuleAccess('timeTracking');
      const validationResult = ValidationService.validateStep(currentStep, formData, hasTimeTrackingAccess);
      return validationResult.isValid;
    } catch (error) {
      handleError(error, 'GateIn.isCurrentStepValid');
      return false;
    }
  }, [currentStep, formData, hasModuleAccess]);

  const validateStep = useCallback((step: number): boolean => {
    try {
      // Clear previous validation errors
      setValidationErrors([]);
      setValidationWarnings([]);

      // Ensure formData is available
      if (!formData) {
        setValidationErrors(['Form data is not available']);
        return false;
      }

      // Use enhanced validation service
      const hasTimeTrackingAccess = hasModuleAccess('timeTracking');
      const validationResult = ValidationService.validateStep(step, formData, hasTimeTrackingAccess);

      if (!validationResult.isValid) {
        const errorMessages = ValidationService.formatValidationErrors(validationResult);
        setValidationErrors(errorMessages);
      }

      const warningMessages = ValidationService.formatValidationWarnings(validationResult);
      if (warningMessages.length > 0) {
        setValidationWarnings(warningMessages);
      }

      return validationResult.isValid;
    } catch (error) {
      handleError(error, 'GateIn.validateStep');
      setValidationErrors(['Validation error occurred. Please try again.']);
      return false;
    }
  }, [formData, hasModuleAccess]);

  const handleNextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(3, prev + 1));
    }
  }, [currentStep, validateStep]);

  const handlePrevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      containerSize: '20ft',
      containerType: 'dry',
      isHighCube: false,
      containerIsoCode: '',
      containerQuantity: 1,
      status: 'EMPTY', // Default to 'EMPTY'
      clientId: '',
      clientCode: '',
      clientName: '',
      bookingReference: '',
      equipmentReference: '', // Equipment reference for EDI transmission
      bookingType: 'EXPORT',
      containerNumber: '',
      containerNumberConfirmation: '',
      secondContainerNumber: '',
      secondContainerNumberConfirmation: '',
      classification: 'divers', // Default to 'divers'
      transactionType: 'Retour Livraison', // Default to 'Retour Livraison'
      driverName: '',
      truckNumber: '',
      transportCompany: '',
      truckArrivalDate: '', // Empty by default
      truckArrivalTime: '', // Empty by default
      truckDepartureDate: '',
      truckDepartureTime: '',
      notes: '',
      operationStatus: 'pending'
    });
    setSubmissionError(null);
    setValidationErrors([]);
    setValidationWarnings([]);
  }, []);

  const handleSubmit = useCallback(async () => {

    // Clear previous errors
    setSubmissionError(null);
    setValidationErrors([]);
    setValidationWarnings([]);

    if (!canPerformGateIn) {
      const errorMessage = 'You do not have permission to perform Gate In operations';
      setSubmissionError(errorMessage);
      return;
    }

    // Validate yard operation
    const yardValidation = validateYardOperation('gate_in');
    if (!yardValidation.isValid) {
      const errorMessage = `Cannot perform Gate In: ${yardValidation.message}`;
      setSubmissionError(errorMessage);
      return;
    }

    // Comprehensive form validation
    const existingContainerNumbers = containers
      .filter(c => !c.isDeleted) // Only check active (non-deleted) containers
      .map(c => c.number.toUpperCase());
    const hasTimeTrackingAccess = hasModuleAccess('timeTracking');
    const formValidation = ValidationService.validateGateInForm(formData, undefined, hasTimeTrackingAccess);
    const businessValidation = ValidationService.validateBusinessRules(formData, existingContainerNumbers);

    // Combine validation results
    const allErrors = [...formValidation.errors, ...businessValidation.errors];
    const allWarnings = [...formValidation.warnings, ...businessValidation.warnings];

    if (allErrors.length > 0) {
      const errorMessages = allErrors.map(e => e.userMessage);
      setValidationErrors(errorMessages);
      return;
    }

    if (allWarnings.length > 0) {
      const warningMessages = allWarnings.map(w => w.userMessage);
      setValidationWarnings(warningMessages);
    }

    setIsProcessing(true);

    try {
      // Validate critical IDs before proceeding
      if (!user?.id) {
        console.error('🔴 [GateIn] user.id is missing:', user);
        setSubmissionError('User ID is missing. Please log out and log back in.');
        setIsProcessing(false);
        return;
      }
      if (!currentYard?.id) {
        console.error('� [GateIn] currentYard.id is missing:', currentYard);
        setSubmissionError('Current yard is not selected. Please select a yard.');
        setIsProcessing(false);
        return;
      }

      // Use client pool service to find optimal stack assignment
      const { clientPoolService } = await import('../../services/clientPoolService');

      // Create container assignment request
      const assignmentRequest = {
        containerId: `temp-${Date.now()}`,
        containerNumber: formData.containerNumber,
        clientCode: formData.clientCode,
        containerSize: formData.containerSize,
        requiresSpecialHandling: false
      };

      // Find optimal stack assignment
      let optimalStack;
      try {
        optimalStack = clientPoolService.findOptimalStackForContainer(
          assignmentRequest,
          { sections: [] } as any, // Would use actual yard data
          [] // Would use actual container data
        );
      } catch (error) {
        // Silently handle - not critical for gate in
      }

      // Ensure truck arrival date/time are set (use current system time if not provided)
      const now = new Date();
      const truckArrivalDate = formData.truckArrivalDate || now.toISOString().split('T')[0];
      const truckArrivalTime = formData.truckArrivalTime || now.toTimeString().slice(0, 5);

      // Validate critical IDs before proceeding
      if (!user?.id) {
        console.error('🔴 [GateIn] user.id is missing:', user);
        setSubmissionError('User ID is missing. Please log out and log back in.');
        setIsProcessing(false);
        return;
      }
      if (!currentYard?.id) {
        console.error('🔴 [GateIn] currentYard.id is missing:', currentYard);
        setSubmissionError('Current yard is not selected. Please select a yard.');
        setIsProcessing(false);
        return;
      }

      // Process Gate In through enhanced API service
      const gateInData = {
        containerNumber: formData.containerNumber.trim().toUpperCase(),
        containerQuantity: formData.containerQuantity,
        secondContainerNumber: formData.secondContainerNumber?.trim().toUpperCase(),
        clientName: formData.clientName,
        clientCode: formData.clientCode,
        containerType: formData.containerType,
        containerSize: formData.containerSize,
        containerIsoCode: formData.containerIsoCode || undefined,
        isHighCube: formData.isHighCube === true,
        fullEmpty: formData.status, // Pass the FULL/EMPTY status from form
        transportCompany: formData.transportCompany,
        driverName: formData.driverName,
        truckNumber: formData.truckNumber,
        location: formData.assignedLocation || optimalStack?.stackId || null,
        truckArrivalDate: truckArrivalDate,
        truckArrivalTime: truckArrivalTime,
        equipmentReference: formData.equipmentReference, // Equipment reference for EDI transmission
        bookingReference: formData.bookingReference || undefined,
        notes: formData.notes || undefined,
        operatorId: user.id,
        operatorName: user.name || 'Unknown Operator',
        yardId: currentYard.id,
        classification: formData.classification,
        damageReported: false, // Keep for backward compatibility
        damageDescription: undefined // Keep for backward compatibility
        // damageAssessment: moved to pending operations phase
      };

      console.log('🔍 [GateIn] Calling processGateIn with data:', {
        containerNumber: gateInData.containerNumber,
        clientCode: gateInData.clientCode,
        operatorId: gateInData.operatorId,
        yardId: gateInData.yardId,
      });

      const result = await gateService.processGateIn(gateInData);

      if (!result.success) {
        const errorMessage = result.userMessage || result.error || 'Failed to process Gate In operation';
        setSubmissionError(errorMessage);
        return;
      }

      // Update client pool occupancy if stack was assigned
      if (optimalStack) {
        try {
          await clientPoolService.assignContainerToClientStack(
            assignmentRequest,
            { sections: [] } as any,
            []
          );
        } catch (error) {
          // Silently handle - not critical
        }
      }

      // Show success message
      const successMessage = `Gate In operation completed successfully for container ${formData.containerNumber}${formData.containerQuantity === 2 ? ` and ${formData.secondContainerNumber}` : ''
        }`;

      toast.success(successMessage);

      // Reset form and close modal
      resetForm();
      setCurrentStep(1);
      setShowForm(false);

      // Refresh data
      await loadData();

    } catch (error) {
      handleError(error, 'GateIn.handleSubmit');

      let errorMessage = 'An unexpected error occurred while processing the Gate In operation';

      if (error instanceof GateInError) {
        errorMessage = error.userMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setSubmissionError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [canPerformGateIn, validateYardOperation, containers, hasModuleAccess, formData, user, currentYard, resetForm, loadData, toast]);


  const handleLocationValidation = async (operation: any, locationData: any) => {
    setIsProcessing(true);

    // Variables pour le rollback en cas d'erreur
    let createdContainerIds: string[] = [];
    let updatedContainerIds: string[] = [];
    let originalContainerStates: Map<string, any> = new Map();

    try {
      // Validate required data
      if (!operation?.containerNumber) {
        throw new Error('Container number is required');
      }
      if (!locationData?.assignedLocation) {
        throw new Error('Assigned location is required');
      }
      if (!currentYard?.id) {
        throw new Error('Current yard is not selected');
      }

      // 1. Get client info
      const client = clients.find(c => c.code === operation.clientCode);
      if (!client) {
        throw new Error(`Client not found: ${operation.clientCode}`);
      }

      // 2. Check if containers already exist (they should exist in pending state)
      const containerNumbers = [operation.containerNumber];
      if (operation.containerQuantity === 2 && operation.secondContainerNumber) {
        containerNumbers.push(operation.secondContainerNumber);
      }

      const { data: existingContainers } = await supabase
        .from('containers')
        .select('id, number, status, location, updated_at')
        .eq('is_deleted', false)
        .in('number', containerNumbers);

      // For pending operations, containers should already exist with status 'gate_in'
      // For new operations, containers should NOT exist
      const isPendingCompletion = existingContainers && existingContainers.length > 0;
      let finalContainers = existingContainers || [];

      if (isPendingCompletion) {
        // This is completing a pending operation - UPDATE existing containers
        // Save original states for rollback
        for (const container of existingContainers) {
          originalContainerStates.set(container.id, {
            status: container.status,
            location: container.location,
            updated_at: container.updated_at
          });
          updatedContainerIds.push(container.id);
        }

        const newStatus = locationData.isBufferZone ? 'in_buffer' : 'in_depot';

        for (const container of existingContainers) {
          const { error: updateError } = await supabase
            .from('containers')
            .update({
              status: newStatus,
              location: locationData.assignedLocation,
              updated_at: new Date().toISOString(),
              updated_by: user?.id
            })
            .eq('id', container.id);

          if (updateError) {
            throw new Error(`Failed to update container ${container.number}: ${updateError.message}`);
          }
        }
      } else {
        // This is a new operation - CREATE containers
        console.log('Creating new containers:', containerNumbers);

        // 3. Create container(s) in containers table (include is_high_cube, full_empty, etc. from operation)
        const baseContainerPayload = {
          number: operation.containerNumber,
          type: operation.containerType || 'dry',
          size: operation.containerSize,
          is_high_cube: operation.isHighCube === true,
          status: locationData.isBufferZone ? 'in_buffer' : 'in_depot',
          full_empty: operation.fullEmpty || 'FULL',
          location: locationData.assignedLocation,
          yard_id: currentYard?.id,
          client_id: client?.id,
          client_code: operation.clientCode,
          gate_in_date: new Date().toISOString(),
          classification: operation.classification || 'divers',
          transaction_type: operation.transactionType || 'Retour Livraison',
          created_by: user?.id
        };
        const containersToCreate: typeof baseContainerPayload[] = [baseContainerPayload];

        // If second container exists
        if (operation.containerQuantity === 2 && operation.secondContainerNumber) {
          containersToCreate.push({
            ...baseContainerPayload,
            number: operation.secondContainerNumber
          });
        }

        const { data: createdContainers, error: containerError } = await supabase
          .from('containers')
          .insert(containersToCreate)
          .select();

        if (containerError) {
          if (containerError.code === '23505') {
            throw new Error('Container number already exists in the system');
          }
          throw new Error(`Failed to create container: ${containerError.message}`);
        }

        finalContainers = createdContainers || [];
        createdContainerIds = finalContainers.map(c => c.id);
      }

      // 4. Link container ID to gate_in_operation and update assigned_location
      const updateOperationData: any = {
        container_id: finalContainers?.[0]?.id,
        assigned_location: locationData.assignedLocation,
        completed_at: new Date().toISOString(),
        status: 'completed',
      };

      // Update gate_in_operations (basic fields + location)
      // Note: assigned_stack is stored in gate_in_damage_assessments, not here
      const { error: updateError } = await supabase
        .from('gate_in_operations')
        .update(updateOperationData)
        .eq('id', operation.id);

      if (updateError) {
        throw new Error(`Failed to update Gate In operation: ${updateError.message}`);
      }

      // 4.5. Create/Update gate_in_damage_assessments with location and damage data
      const damageAssessmentData: any = {
        gate_in_operation_id: operation.id,
        assigned_location: locationData.assignedLocation,
        assigned_stack: locationData.isBufferZone ? null : extractStackNumber(locationData.assignedLocation),
        is_buffer_assignment: locationData.isBufferZone || false,
        damage_reported: false,
        damage_assessment_stage: 'assignment',
        damage_assessed_by: user?.name || user?.email,
        damage_assessed_at: new Date().toISOString(),
      };

      // Add damage assessment data if provided
      if (locationData.damageAssessment) {
        damageAssessmentData.damage_reported = locationData.damageAssessment.hasDamage;
        damageAssessmentData.damage_description = locationData.damageAssessment.damageDescription || null;
        damageAssessmentData.damage_type = locationData.damageAssessment.damageType || null;
        damageAssessmentData.damage_assessment = JSON.stringify(locationData.damageAssessment);
        if (locationData.isBufferZone) {
          damageAssessmentData.buffer_zone_reason = locationData.damageAssessment.damageType || 'Dommage détecté';
        }
      }

      // Insert or update damage assessment
      const { error: damageError } = await supabase
        .from('gate_in_damage_assessments')
        .upsert(damageAssessmentData, {
          onConflict: 'gate_in_operation_id'
        });

      if (damageError) {
        console.error('Failed to create damage assessment:', damageError);
        // Don't fail the entire operation, just log the error
      }

      // 4.6. Si zone tampon: créer l'entrée dans container_buffer_zones
      if (locationData.isBufferZone && locationData.bufferStackId && finalContainers?.[0]?.id) {
        try {
          await bufferZoneService.assignContainerToBufferZone({
            containerId: finalContainers[0].id,
            gateInOperationId: operation.id,
            bufferStackId: locationData.bufferStackId,
            yardId: currentYard?.id || '',
            damageType: locationData.damageAssessment?.damageType || 'general',
            damageDescription: locationData.damageAssessment?.damageDescription,
            damageAssessment: locationData.damageAssessment,
            createdBy: user?.id || 'system',
          });
          logger.info(`Conteneur ${operation.containerNumber} assigné à la zone tampon`, 'GateIn');
        } catch (bufferError) {
          // Ne pas bloquer l'opération si l'entrée buffer échoue
          logger.error('Impossible de créer l\'entrée zone tampon', 'GateIn', bufferError);
        }
      }

      // 4.7. Update location occupancy in locations table
      console.log('🔍 Starting location occupancy update for:', locationData.assignedLocation);
      try {
        // Parse the location to check if it's a virtual stack
        const locationMatch = locationData.assignedLocation.match(/S(\d+)R(\d+)H(\d+)/);
        if (!locationMatch) {
          console.warn(`Invalid location format: ${locationData.assignedLocation}`);
        } else {
          const stackNum = parseInt(locationMatch[1]);
          const row = locationMatch[2];
          const tier = locationMatch[3];

          console.log(`📍 Parsed location: Stack=${stackNum}, Row=${row}, Tier=${tier}`);

          // Check if this is a virtual stack (even numbers for 40ft)
          const isVirtualStack = stackNum % 2 === 0;
          console.log(`🔢 Is virtual stack: ${isVirtualStack}`);

          if (isVirtualStack && operation.containerSize === '40ft') {
            // For 40ft containers on virtual stacks, we need to occupy BOTH physical locations
            // Virtual stack S04 is made from physical stacks S03 and S05
            const physicalStack1 = stackNum - 1; // S03
            const physicalStack2 = stackNum + 1; // S05

            console.log(`🔄 Virtual stack ${stackNum} maps to physical stacks ${physicalStack1} and ${physicalStack2}`);

            // Get both physical locations
            const physicalLocation1 = `S${String(physicalStack1).padStart(2, '0')}R${row}H${tier}`;
            const physicalLocation2 = `S${String(physicalStack2).padStart(2, '0')}R${row}H${tier}`;

            console.log(`🔍 Checking both physical locations: ${physicalLocation1} and ${physicalLocation2}`);

            const { data: locationRecords, error: locationFindError } = await supabase
              .from('locations')
              .select('id, location_id, is_occupied, container_size')
              .in('location_id', [physicalLocation1, physicalLocation2])
              .eq('yard_id', currentYard?.id);

            console.log(`📊 Physical locations query result:`, { locationRecords, error: locationFindError });

            if (!locationFindError && locationRecords && locationRecords.length === 2) {
              // Check if both locations are available
              const allAvailable = locationRecords.every(loc => !loc.is_occupied);

              if (allAvailable) {
                console.log(`✅ Both physical locations are available, assigning 40ft container`);

                // Assign container to both physical locations
                for (const locationRecord of locationRecords) {
                  await locationManagementService.assignContainer({
                    locationId: locationRecord.id,
                    containerId: finalContainers[0].id,
                    containerSize: '40ft',
                    clientPoolId: undefined
                  });
                  console.log(`✓ Assigned to physical location ${locationRecord.location_id}`);
                }

                console.log(`✓ Virtual location ${locationData.assignedLocation} successfully mapped to both physical locations`);
              } else {
                const occupiedLocations = locationRecords.filter(loc => loc.is_occupied).map(loc => loc.location_id);
                console.warn(`❌ Cannot assign 40ft container - some physical locations are occupied: ${occupiedLocations.join(', ')}`);
                throw new Error(`Les emplacements physiques ${occupiedLocations.join(', ')} sont déjà occupés. Impossible d'assigner un conteneur 40ft à ${locationData.assignedLocation}.`);
              }
            } else {
              const errorMsg = `Les emplacements physiques ${physicalLocation1} et ${physicalLocation2} n'existent pas dans la base de données. Veuillez vérifier que les stacks S${String(physicalStack1).padStart(2, '0')} et S${String(physicalStack2).padStart(2, '0')} sont correctement configurés avec des locations générées.`;
              console.warn(`❌ Could not find both physical locations for virtual ${locationData.assignedLocation}`);
              console.warn(`   Expected: ${physicalLocation1} and ${physicalLocation2}`);
              console.warn(`   Found: ${locationRecords?.length || 0} location(s)`);
              throw new Error(errorMsg);
            }
          } else if (isVirtualStack && operation.containerSize === '20ft') {
            // For 20ft containers on virtual stacks, use just one physical location
            const physicalStack1 = stackNum - 1;
            const physicalLocation1 = `S${String(physicalStack1).padStart(2, '0')}R${row}H${tier}`;

            console.log(`🔍 Checking physical location for 20ft: ${physicalLocation1}`);

            const { data: locationRecord, error: locationFindError } = await supabase
              .from('locations')
              .select('id, is_occupied')
              .eq('location_id', physicalLocation1)
              .eq('yard_id', currentYard?.id)
              .maybeSingle();

            if (!locationFindError && locationRecord && !locationRecord.is_occupied) {
              await locationManagementService.assignContainer({
                locationId: locationRecord.id,
                containerId: finalContainers[0].id,
                containerSize: '20ft',
                clientPoolId: undefined
              });
              console.log(`✓ 20ft container assigned to physical location ${physicalLocation1}`);
            } else if (locationRecord?.is_occupied) {
              console.warn(`❌ Physical location ${physicalLocation1} is already occupied`);
              throw new Error(`L'emplacement physique ${physicalLocation1} est déjà occupé. Impossible d'assigner le conteneur 20ft.`);
            } else {
              console.warn(`❌ Physical location ${physicalLocation1} not found in locations table`);
              throw new Error(`L'emplacement physique ${physicalLocation1} n'existe pas dans la base de données. Veuillez vérifier que le stack S${String(physicalStack1).padStart(2, '0')} est correctement configuré.`);
            }
          } else {
            console.log(`📍 Physical stack detected, using direct mapping`);
            // Physical stack - direct mapping
            const { data: locationRecord, error: locationFindError } = await supabase
              .from('locations')
              .select('id')
              .eq('location_id', locationData.assignedLocation)
              .eq('yard_id', currentYard?.id)
              .maybeSingle();

            console.log(`📊 Physical location query result:`, { locationRecord, error: locationFindError });

            if (locationFindError) {
              console.error('Error finding location:', locationFindError);
              throw new Error(`Erreur lors de la recherche de l'emplacement ${locationData.assignedLocation}: ${locationFindError.message}`);
            } else if (locationRecord) {
              await locationManagementService.assignContainer({
                locationId: locationRecord.id,
                containerId: finalContainers[0].id,
                containerSize: operation.containerSize as '20ft' | '40ft',
                clientPoolId: undefined
              });
              console.log(`✓ Physical location ${locationData.assignedLocation} marked as occupied`);
            } else {
              console.warn(`Physical location ${locationData.assignedLocation} not found in locations table`);
              throw new Error(`L'emplacement ${locationData.assignedLocation} n'existe pas dans la base de données. Veuillez vérifier que le stack est correctement configuré avec des locations générées.`);
            }
          }
        }
      } catch (locationError) {
        console.error('❌ Error updating location occupancy:', locationError);
        // Don't fail the entire operation if location update fails
      }

      // 5. Transmission EDI GATE IN (seulement si le client a l'EDI activé)
      let ediStatus = 'not_attempted';
      // edi_transmitted DB value: null = not attempted/not configured, false = failed, true = sent
      let ediTransmittedDbValue: boolean | null = null;
      try {
        // Vérifier si le client a l'EDI activé
        const { data: ediStatusData, error: ediStatusError } = await supabase
          .rpc('get_client_edi_status', {
            p_client_code: operation.clientCode,
            p_client_name: operation.clientName,
            p_operation: 'gate_in'
          })
          .single();

        if (ediStatusError) {
          logger.warn(`Impossible de vérifier le statut EDI du client ${operation.clientCode}`, 'GateIn', ediStatusError);
        }

        const typedEdiStatusData = ediStatusData as { edi_enabled?: boolean; gate_in_enabled?: boolean } | null;
        const hasEdiEnabled = typedEdiStatusData?.edi_enabled && typedEdiStatusData?.gate_in_enabled;

        if (hasEdiEnabled) {
          // Le client a l'EDI activé, procéder à la transmission
          logger.info(`EDI activé pour le client ${operation.clientCode}, transmission en cours...`, 'GateIn');
          const ediResult = await ediTransmissionService.transmitGateInEDI(operation.id);
          if (ediResult.success) {
            ediStatus = ediResult.error?.includes('déjà transmis') ? 'already_sent' : 'transmitted';
            ediTransmittedDbValue = true;
          } else {
            ediStatus = 'failed';
            ediTransmittedDbValue = false;
            logger.error(`EDI non transmis: ${ediResult.error}`, 'GateIn');
          }
        } else {
          // Le client n'a pas l'EDI activé, ignorer la transmission
          logger.info(`EDI non activé pour le client ${operation.clientCode}, transmission ignorée`, 'GateIn');
          ediStatus = 'not_configured';
          ediTransmittedDbValue = null; // Explicit: not configured = null (shows "No EDI")
        }

        // Persist EDI transmission result to gate_in_operations table
        // This ensures the status survives page refreshes
        await supabase
          .from('gate_in_operations')
          .update({ edi_transmitted: ediTransmittedDbValue })
          .eq('id', operation.id);

      } catch (ediError) {
        // EDI transmission failed, but don't fail the entire operation
        logger.error('EDI: Erreur inattendue', 'GateIn', ediError);
        ediStatus = 'failed';
        ediTransmittedDbValue = false;
        // Still persist the failure status in DB
        try {
          await supabase
            .from('gate_in_operations')
            .update({ edi_transmitted: false })
            .eq('id', operation.id);
        } catch { /* ignore secondary failure */ }
      }

      // 6. Update local state
      setGateInOperations(prev => prev.map(op =>
        op.id === operation.id
          ? {
            ...op,
            containerId: finalContainers?.[0]?.id,
            assignedLocation: locationData.assignedLocation,
            completedAt: new Date(),
            status: 'completed',
            // null = no EDI configured, false = failed, true = sent
            ediTransmitted: ediTransmittedDbValue,
          }
          : op
      ));

      // 7. Refresh containers list and yard data (non-blocking)
      try {
        const updatedContainers = await containerService.getAll();
        setContainers(updatedContainers);

        // Refresh yard data to update occupancy
        if (currentYard?.id) {
          await yardsService.refreshYardData(currentYard.id);
        }
      } catch (refreshError) {
        logger.warn('Avertissement', 'GateIn.tsx', refreshError);
      }

      // 8. Show success message with EDI status
      const damageStatus = locationData.isBufferZone
        ? 'Zone Tampon'
        : 'Emplacement physique';

      let ediStatusMessage = '';
      switch (ediStatus) {
        case 'transmitted':
          ediStatusMessage = '✓ EDI GATE IN transmis';
          break;
        case 'already_sent':
          ediStatusMessage = '• EDI déjà transmis (ignoré)';
          break;
        case 'failed':
          ediStatusMessage = '⚠ Transmission EDI échouée (vérifier logs)';
          break;
        default:
          ediStatusMessage = '• EDI non tenté';
      }

      toast.success(`Conteneur ${operation.containerNumber}${operation.containerQuantity === 2 ? ` et ${operation.secondContainerNumber}` : ''} assigné → ${damageStatus}: ${locationData.assignedLocation} — ${ediStatusMessage}`);
      setActiveView('overview');
    } catch (error) {
      // ROLLBACK: Annuler toutes les modifications en cas d'erreur
      console.error('❌ Erreur détectée, rollback en cours...', error);

      try {
        // Rollback 1: Supprimer les conteneurs créés
        if (createdContainerIds.length > 0) {
          console.log(`🔄 Rollback: Suppression de ${createdContainerIds.length} conteneur(s) créé(s)...`);
          await supabase
            .from('containers')
            .delete()
            .in('id', createdContainerIds);
          console.log('✓ Conteneurs créés supprimés');
        }

        // Rollback 2: Restaurer l'état original des conteneurs mis à jour
        if (updatedContainerIds.length > 0) {
          console.log(`🔄 Rollback: Restauration de ${updatedContainerIds.length} conteneur(s) mis à jour...`);
          for (const containerId of updatedContainerIds) {
            const originalState = originalContainerStates.get(containerId);
            if (originalState) {
              await supabase
                .from('containers')
                .update({
                  status: originalState.status,
                  location: originalState.location,
                  updated_at: originalState.updated_at
                })
                .eq('id', containerId);
            }
          }
          console.log('✓ Conteneurs mis à jour restaurés');
        }

        console.log('✅ Rollback terminé avec succès');
      } catch (rollbackError) {
        console.error('❌ Erreur lors du rollback:', rollbackError);
        logger.error('Erreur critique: rollback échoué', 'GateIn.handleLocationValidation', rollbackError);
      }

      handleError(error, 'GateIn.handleLocationValidation');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Erreur lors de l'opération: ${errorMessage}. Les modifications ont été annulées.`);
    } finally {
      setIsProcessing(false);
    }
  };



  const filteredOperations = allOperations.filter(op => {
    const matchesSearch = !searchTerm ||
      op.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.truckNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (op.secondContainerNumber && op.secondContainerNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = selectedFilter === 'all' ||
      op.status === selectedFilter ||
      (selectedFilter === 'alimentaire' && op.classification === 'alimentaire') ||
      (selectedFilter === 'divers' && op.classification === 'divers');

    return matchesSearch && matchesFilter;
  });

  const handleExportGateIn = async () => {
    try {
      // Calculate durations for each operation
      const dataToExport = await Promise.all(
        filteredOperations.map(async (op) => {
          let durations: any = {
            totalDuration: null,
            damageAssessmentDuration: null,
            locationAssignmentDuration: null,
            ediProcessingDuration: null
          };

          // Calculate time tracking durations if operation is completed
          if (op.status === 'completed' && op.id) {
            try {
              const { gateTimeTrackingService } = await import('../../services/api/gateTimeTrackingService');
              durations = await gateTimeTrackingService.calculateGateInDurations(op.id);
            } catch (error) {
              console.warn('Failed to calculate durations for operation:', op.id, error);
            }
          }

          return {
            containerNumber: op.containerNumber || '',
            secondContainerNumber: op.secondContainerNumber || '',
            containerSize: op.containerSize || '',
            containerType: op.containerType || '',
            status: op.status || '',
            fullEmpty: op.fullEmpty || op.status || '', // Use fullEmpty or status as fallback
            clientName: op.clientName || '',
            clientCode: op.clientCode || '',
            classification: op.classification || '',
            driverName: op.driverName || '',
            truckNumber: op.truckNumber || '',
            transportCompany: op.transportCompany || '',
            assignedLocation: op.assignedLocation || '',
            truckArrivalDate: formatDateForExport(op.truckArrivalDate),
            truckArrivalTime: op.truckArrivalTime || '',
            yardName: currentYard?.name || '',
            operatorName: op.operatorName || '',
            createdAt: formatDateForExport(op.createdAt),
            updatedAt: formatDateForExport(op.updatedAt),
            notes: op.notes || '',
            transactionType: op.transactionType || 'Retour Livraison', // Default value for existing records
            // Time tracking metrics
            totalDuration: formatDurationForExport(durations?.totalDuration),
            damageAssessmentDuration: formatDurationForExport(durations?.damageAssessmentDuration),
            locationAssignmentDuration: formatDurationForExport(durations?.locationAssignmentDuration),
            ediProcessingDuration: formatDurationForExport(durations?.ediProcessingDuration),
            // Additional time tracking fields
            damageAssessmentStarted: formatDateForExport(op.damage_assessment_started),
            damageAssessmentCompleted: formatDateForExport(op.damage_assessment_completed),
            locationAssignmentStarted: formatDateForExport(op.location_assignment_started),
            locationAssignmentCompleted: formatDateForExport(op.location_assignment_completed),
            ediProcessingStarted: formatDateForExport(op.edi_processing_started),
            ediTransmissionDate: formatDateForExport(op.edi_transmission_date)
          };
        })
      );

      exportToExcel({
        filename: `gate_in_operations_${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: 'Gate In Operations',
        columns: [
          { header: 'Numéro Conteneur', key: 'containerNumber', width: 20 },
          { header: '2ème Conteneur', key: 'secondContainerNumber', width: 20 },
          { header: 'Taille', key: 'containerSize', width: 12 },
          { header: 'Type', key: 'containerType', width: 15 },
          { header: 'Statut', key: 'status', width: 15 },
          { header: 'Plein/Vide', key: 'fullEmpty', width: 12 },
          { header: 'Client', key: 'clientName', width: 25 },
          { header: 'Code Client', key: 'clientCode', width: 15 },
          { header: 'Classification', key: 'classification', width: 15 },
          { header: 'Transaction', key: 'transactionType', width: 18 },
          { header: 'Chauffeur', key: 'driverName', width: 20 },
          { header: 'Camion', key: 'truckNumber', width: 15 },
          { header: 'Transporteur', key: 'transportCompany', width: 25 },
          { header: 'Emplacement', key: 'assignedLocation', width: 20 },
          { header: 'Date Arrivée', key: 'truckArrivalDate', width: 20 },
          { header: 'Heure Arrivée', key: 'truckArrivalTime', width: 15 },
          { header: 'Dépôt', key: 'yardName', width: 20 },
          { header: 'Opérateur', key: 'operatorName', width: 20 },
          { header: 'Date Création', key: 'createdAt', width: 20 },
          { header: 'Date Modification', key: 'updatedAt', width: 20 },
          { header: 'Notes', key: 'notes', width: 30 },
          // Time tracking columns
          { header: 'Durée Totale', key: 'totalDuration', width: 15 },
          { header: 'Durée Évaluation Dommages', key: 'damageAssessmentDuration', width: 25 },
          { header: 'Durée Attribution Emplacement', key: 'locationAssignmentDuration', width: 25 },
          { header: 'Durée Traitement EDI', key: 'ediProcessingDuration', width: 20 },
          // Detailed timestamps
          { header: 'Début Évaluation Dommages', key: 'damageAssessmentStarted', width: 25 },
          { header: 'Fin Évaluation Dommages', key: 'damageAssessmentCompleted', width: 25 },
          { header: 'Début Attribution Emplacement', key: 'locationAssignmentStarted', width: 25 },
          { header: 'Fin Attribution Emplacement', key: 'locationAssignmentCompleted', width: 25 },
          { header: 'Début Traitement EDI', key: 'ediProcessingStarted', width: 20 },
          { header: 'Date Transmission EDI', key: 'ediTransmissionDate', width: 20 }
        ],
        data: dataToExport
      });

      toast.success('Export Gate In completed successfully');
    } catch (error) {
      console.error('Error exporting Gate In data:', error);
      toast.error('Failed to export Gate In data');
    }
  };



  if (!canPerformGateIn) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('common.restricted')}</h3>
        <p className="text-gray-600">{t('common.unauthorized')}</p>
      </div>
    );
  }

  // Pending Operations View
  if (activeView === 'pending') {
    return (
      <PendingOperationsView
        operations={pendingOperations}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onBack={() => setActiveView('overview')}
        onComplete={handleLocationValidation}
        isProcessing={isProcessing}
      />
    );
  }

  // Show skeletons while initial data is loading
  if (loading) return (
    <div className="min-h-screen bg-gray-50 lg:bg-transparent">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 lg:px-6 lg:py-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>

        <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-200 shadow-sm overflow-hidden p-4">
          <TableSkeleton />
        </div>
      </div>
    </div>
  );

  // Main Overview
  return (
    <div className="min-h-screen bg-gray-50 lg:bg-transparent">
      {/* Unified Mobile-First Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          {/* Title Section */}
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div>
            </div>
          </div>

          {/* Action Buttons - Mobile First */}
          <div className="grid grid-cols-2 gap-3 lg:flex lg:justify-end lg:space-x-3">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center space-x-2 px-4 py-3 lg:px-6 lg:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl lg:rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              <Plus className="h-5 w-5 lg:h-4 lg:w-4" />
              <span className="text-sm lg:text-base">Gate In</span>
            </button>

            <button
              onClick={() => setActiveView('pending')}
              className="flex items-center justify-center space-x-2 px-4 py-3 lg:px-6 lg:py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl lg:rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              <Clock className="h-5 w-5 lg:h-4 lg:w-4" />
              <span className="text-sm lg:text-base">{t('gate.in.pending')} ({pendingOperations.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unified Responsive Statistics */}
      <div className="px-4 py-4 lg:px-6 lg:py-6 space-y-4">
        {/* Mobile: 2x2 Grid | Tablet+: 5x1 Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
          {/* Today's Gate Ins */}
          <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-100 lg:border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 lg:hover:scale-100 active:scale-95">
            <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-2 lg:space-y-0">
              <div className="p-3 lg:p-2 bg-green-500 lg:bg-green-100 rounded-xl lg:rounded-lg shadow-lg lg:shadow-none">
                <Truck className="h-6 w-6 lg:h-5 lg:w-5 text-white lg:text-green-600" />
              </div>
              <div className="lg:ml-3">
                <p className="text-2xl lg:text-lg font-bold text-gray-900">{todayGateIns.length}</p>
                <p className="text-xs font-medium text-green-700 lg:text-gray-500 leading-tight">{t('gate.in.stats.today')}</p>
              </div>
            </div>
          </div>

          {/* Pending Operations */}
          <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-100 lg:border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 lg:hover:scale-100 active:scale-95">
            <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-2 lg:space-y-0">
              <div className="p-3 lg:p-2 bg-orange-500 lg:bg-yellow-100 rounded-xl lg:rounded-lg shadow-lg lg:shadow-none">
                <Clock className="h-6 w-6 lg:h-5 lg:w-5 text-white lg:text-yellow-600" />
              </div>
              <div className="lg:ml-3">
                <p className="text-2xl lg:text-lg font-bold text-gray-900">{pendingOperations.length}</p>
                <p className="text-xs font-medium text-orange-700 lg:text-gray-500 leading-tight">{t('gate.in.stats.pending')}</p>
              </div>
            </div>
          </div>

          {/* Containers Processed */}
          <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-100 lg:border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 lg:hover:scale-100 active:scale-95">
            <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-2 lg:space-y-0">
              <div className="p-3 lg:p-2 bg-blue-500 lg:bg-blue-100 rounded-xl lg:rounded-lg shadow-lg lg:shadow-none">
                <ContainerIcon className="h-6 w-6 lg:h-5 lg:w-5 text-white lg:text-blue-600" />
              </div>
              <div className="lg:ml-3">
                <p className="text-2xl lg:text-lg font-bold text-gray-900">{completedOperations.length}</p>
                <p className="text-xs font-medium text-blue-700 lg:text-gray-500 leading-tight">{t('gate.in.stats.processed')}</p>
              </div>
            </div>
          </div>

          {/* Alimentaire Containers */}
          <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-100 lg:border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 lg:hover:scale-100 active:scale-95">
            <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-2 lg:space-y-0">
              <div className="p-3 lg:p-2 bg-green-500 lg:bg-green-100 rounded-xl lg:rounded-lg shadow-lg lg:shadow-none">
                <AlertTriangle className="h-6 w-6 lg:h-5 lg:w-5 text-white lg:text-green-600" />
              </div>
              <div className="lg:ml-3">
                <p className="text-2xl lg:text-lg font-bold text-gray-900">{alimentaireContainersCount}</p>
                <p className="text-xs font-medium text-green-700 lg:text-gray-500 leading-tight">Alimentaire Containers</p>
              </div>
            </div>
          </div>

          {/* Buffer Zone Stats */}
          <div onClick={() => setShowBufferZoneManagement(true)} className="cursor-pointer">
            <BufferZoneStats />
          </div>
        </div>

        {/* Unified Search and Filter */}
        <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="lg:flex lg:justify-between lg:items-center p-4 lg:p-4">
            {/* Search Bar */}
            <div className="relative mb-4 lg:mb-0 lg:flex-1 lg:max-w-md">
              <Search className="absolute left-4 lg:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 lg:h-4 lg:w-4" />
              <input
                type="text"
                placeholder="Search operations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 lg:pl-10 pr-12 lg:pr-4 py-4 lg:py-2 text-base lg:text-sm border border-gray-300 rounded-xl lg:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 lg:bg-white focus:bg-white transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 lg:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-5 w-5 lg:h-4 lg:w-4" />
                </button>
              )}
            </div>

            {/* Filter Chips (Mobile) / Dropdown (Desktop) */}
            <div className="lg:hidden flex items-center justify-center space-x-2 overflow-x-auto py-2 scrollbar-none -mx-4 px-4">
              {['all', 'pending', 'completed', 'alimentaire', 'divers'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${selectedFilter === filter
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white transform scale-105'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                    }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            <div className="hidden lg:flex items-center space-x-3">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="alimentaire">Alimentaire</option>
                <option value="divers">Divers</option>
              </select>
              {searchTerm && (
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg font-medium">
                  {filteredOperations.length} result{filteredOperations.length !== 1 ? 's' : ''}
                </span>
              )}
              <button
                onClick={handleExportGateIn}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Export to Excel"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Unified Operations List - Mobile First */}
        <MobileOperationsTable
          operations={filteredOperations}
          searchTerm={searchTerm}
          selectedFilter={selectedFilter}
          onClearSearch={() => setSearchTerm('')}
          onClearFilter={() => setSelectedFilter('all')}
        />
      </div>

      {/* Gate In Form Modal */}
      {showForm && (
        <GateInModal
          showForm={showForm}
          setShowForm={setShowForm}
          formData={formData}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          isProcessing={isProcessing}
          autoSaving={autoSaving}
          validateStep={validateStep}
          isCurrentStepValid={isCurrentStepValid}
          handleSubmit={handleSubmit}
          handleNextStep={handleNextStep}
          handlePrevStep={handlePrevStep}
          handleInputChange={handleInputChange}
          handleContainerSizeChange={handleContainerSizeChange}
          handleHighCubeChange={handleHighCubeChange}
          handleQuantityChange={handleQuantityChange}
          handleStatusChange={handleStatusChange}
          handleClientChange={handleClientChange}
          handleTransactionTypeChange={handleTransactionTypeChange}

          clients={clients}
          submissionError={submissionError}
          validationErrors={validationErrors}
          validationWarnings={validationWarnings}
        />
      )}

      {/* Buffer Zone Management Modal */}
      <BufferZoneManagement
        isOpen={showBufferZoneManagement}
        onClose={() => setShowBufferZoneManagement(false)}
      />

      {/* Processing Spinner Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
};
