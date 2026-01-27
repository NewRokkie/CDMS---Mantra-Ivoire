import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Search, Clock, AlertTriangle, Truck, Container as ContainerIcon, X, Download } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { gateService, clientService, containerService, stackService, realtimeService } from '../../services/api';
import { supabase } from '../../services/api/supabaseClient';
import { generateStackLocations } from '../../utils/locationHelpers';
import { stackPairingService } from '../../services/api/stackPairingService';
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
import { exportToExcel, formatDateForExport } from '../../utils/excelExport';
import { useToast } from '../../hooks/useToast';

export const GateIn: React.FC = () => {
  const { user, hasModuleAccess } = useAuth();
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
  const [stacks, setStacks] = useState<any[]>([]);
  const [pairingMap, setPairingMap] = useState<Map<number, number>>(new Map());
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [clientsData, operationsData, containersData, stacksData, pairingMapData] = await Promise.all([
        clientService.getAll().catch(err => { handleError(err, 'GateIn.loadClients'); return []; }),
        gateService.getGateInOperations({ yardId: currentYard?.id }).catch(err => {
          handleError(err, 'GateIn.loadOperations');
          return [];
        }),
        containerService.getAll().catch(err => { handleError(err, 'GateIn.loadContainers'); return []; }),
        stackService.getAll(currentYard?.id).catch(err => { handleError(err, 'GateIn.loadStacks'); return []; }),
        stackPairingService.getPairingMap(currentYard?.id || '').catch(err => { handleError(err, 'GateIn.loadPairingMap'); return new Map(); })
      ]);

      setClients(clientsData || []);
      setGateInOperations(operationsData || []);
      setContainers(containersData || []);
      setStacks(stacksData || []);
      setPairingMap(pairingMapData || new Map());
    } catch (error) {
      handleError(error, 'GateIn.loadData');
      setClients([]);
      setGateInOperations([]);
      setContainers([]);
      setStacks([]);
      setPairingMap(new Map());
    } finally {
      setLoading(false);
    }
  }, [currentYard?.id]);

  // Load data when currentYard changes, not when loadData function changes
  useEffect(() => {
    if (currentYard?.id) {
      loadData();
    }
  }, [currentYard?.id]); // Remove loadData from dependencies


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
    try { unsubscribeGateIn(); } catch (e) { /* ignore */ }
    try { unsubscribeContainers(); } catch (e) { /* ignore */ }
  };
}, [currentYard?.id]);

// Minimal mockLocations for pending operations view. Replace with full logic if needed.
const mockLocations = React.useMemo(() => ({ '20ft': [], '40ft': [], damage: [] }), [stacks, containers, pairingMap]);

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
    containerNumber: '',
    containerNumberConfirmation: '',
    secondContainerNumber: '',
    secondContainerNumberConfirmation: '',
    classification: 'divers', // Default to 'divers'
    bookingType: 'EXPORT',
    driverName: '',
    truckNumber: '',
    transportCompany: '',
    truckArrivalDate: new Date().toISOString().split('T')[0], // Default to today
    truckArrivalTime: new Date().toTimeString().slice(0, 5), // Default to current time
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

  const handleInputChange = (field: keyof GateInFormData, value: any) => {
    // Container number fields are now handled by ContainerNumberInput component
    // No special processing needed here since the component handles validation
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
  };

  const handleContainerSizeChange = (size: '20ft' | '40ft') => {
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
  };

  const handleQuantityChange = (quantity: 1 | 2) => {
    setFormData(prev => ({
      ...prev,
      containerQuantity: quantity,
      secondContainerNumber: quantity === 1 ? '' : prev.secondContainerNumber
    }));
  };

  const handleStatusChange = (isFullStatus: boolean) => {
    const newStatus = isFullStatus ? 'FULL' : 'EMPTY';
    setFormData(prev => ({
      ...prev,
      status: newStatus,
      bookingReference: newStatus === 'EMPTY' ? '' : prev.bookingReference
    }));
  };

  const handleHighCubeChange = (isHighCube: boolean) => {
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
  };



  const handleClientChange = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        clientId: selectedClient.id,
        clientCode: selectedClient.code,
        clientName: selectedClient.name
      }));
    }
  };

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

  const validateStep = (step: number): boolean => {
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
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(3, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {

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
    const existingContainerNumbers = containers.map(c => c.number.toUpperCase());
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

      // Process Gate In through enhanced API service
      const gateInData = {
        containerNumber: formData.containerNumber.trim().toUpperCase(),
        containerQuantity: formData.containerQuantity,
        secondContainerNumber: formData.secondContainerNumber?.trim().toUpperCase(),
        clientName: formData.clientName,
        clientCode: formData.clientCode,
        containerType: formData.containerType,
        containerSize: formData.containerSize,
        fullEmpty: formData.status, // Pass the FULL/EMPTY status from form
        transportCompany: formData.transportCompany,
        driverName: formData.driverName,
        truckNumber: formData.truckNumber,
        location: formData.assignedLocation || optimalStack?.stackId || 'Pending Assignment',
        truckArrivalDate: truckArrivalDate,
        truckArrivalTime: truckArrivalTime,
        weight: undefined,
        operatorId: user?.id || 'unknown',
        operatorName: user?.name || 'Unknown Operator',
        yardId: currentYard?.id || 'unknown',
        classification: formData.classification,
        damageReported: false, // Keep for backward compatibility
        damageDescription: undefined // Keep for backward compatibility
        // damageAssessment: moved to pending operations phase
      };

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
      const successMessage = `Gate In operation completed successfully for container ${formData.containerNumber}${
        formData.containerQuantity === 2 ? ` and ${formData.secondContainerNumber}` : ''
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
  };

  const resetForm = () => {
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
      bookingType: 'EXPORT',
      containerNumber: '',
      containerNumberConfirmation: '',
      secondContainerNumber: '',
      secondContainerNumberConfirmation: '',
      classification: 'divers', // Default to 'divers'
      driverName: '',
      truckNumber: '',
      transportCompany: '',
      truckArrivalDate: new Date().toISOString().split('T')[0],
      truckArrivalTime: new Date().toTimeString().slice(0, 5),
      truckDepartureDate: '',
      truckDepartureTime: '',
      notes: '',
      operationStatus: 'pending'
    });
    setSubmissionError(null);
    setValidationErrors([]);
    setValidationWarnings([]);
  };


  const handleLocationValidation = async (operation: any, locationData: any) => {
    setIsProcessing(true);
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

      // 2. Check if containers already exist
      const containerNumbers = [operation.containerNumber];
      if (operation.containerQuantity === 2 && operation.secondContainerNumber) {
        containerNumbers.push(operation.secondContainerNumber);
      }

      const { data: existingContainers } = await supabase
        .from('containers')
        .select('number')
        .in('number', containerNumbers);

      if (existingContainers && existingContainers.length > 0) {
        const duplicateNumbers = existingContainers.map(c => c.number).join(', ');
        throw new Error(`Container(s) already exist in the system: ${duplicateNumbers}`);
      }

      // 3. Create container(s) in containers table
      const containersToCreate = [
        {
          number: operation.containerNumber,
          type: operation.containerType || 'standard',
          size: operation.containerSize,
          status: 'in_depot',
          location: locationData.assignedLocation,
          yard_id: currentYard?.id,
          client_id: client?.id,
          client_code: operation.clientCode,
          gate_in_date: new Date().toISOString(),
          created_by: user?.id
        }
      ];

      // If second container exists
      if (operation.containerQuantity === 2 && operation.secondContainerNumber) {
        containersToCreate.push({
          number: operation.secondContainerNumber,
          type: operation.containerType || 'standard',
          size: operation.containerSize,
          status: 'in_depot',
          location: locationData.assignedLocation,
          yard_id: currentYard?.id,
          client_id: client?.id,
          client_code: operation.clientCode,
          gate_in_date: new Date().toISOString(),
          created_by: user?.id
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

      // 4. Link container ID to gate_in_operation and include damage assessment
      const updateData: any = {
        container_id: createdContainers?.[0]?.id,
        assigned_location: locationData.assignedLocation,
        completed_at: new Date().toISOString(),
        status: 'completed'
      };

      // Add damage assessment data if provided
      if (locationData.damageAssessment) {
        updateData.damage_reported = locationData.damageAssessment.hasDamage;
        updateData.damage_description = locationData.damageAssessment.damageDescription || null;
        updateData.damage_assessment = JSON.stringify(locationData.damageAssessment);
      }

      const { error: updateError } = await supabase
        .from('gate_in_operations')
        .update(updateData)
        .eq('id', operation.id);

      if (updateError) {
        throw new Error(`Failed to update Gate In operation: ${updateError.message}`);
      }

      // 5. Process EDI transmission after successful container assignment
      let ediResult = null;
      try {
        // Import EDI management service
        const { ediManagementService } = await import('../../services/edi/ediManagement');
        
        // Prepare EDI container data
        const ediContainerData = {
          containerNumber: operation.containerNumber,
          size: operation.containerSize as '20ft' | '40ft' | '45ft',
          type: (operation.containerType || 'dry') as 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top',
          clientName: operation.clientName,
          clientCode: operation.clientCode,
          transporter: operation.transportCompany || 'Unknown',
          vehicleNumber: operation.truckNumber || 'Unknown',
          userName: user?.name || 'System',
          containerLoadStatus: (operation.fullEmpty || operation.status || 'FULL') as 'FULL' | 'EMPTY',
          timestamp: new Date(),
          location: locationData.assignedLocation,
          yardId: currentYard?.id
        };

        // Process EDI transmission
        ediResult = await ediManagementService.processGateIn(ediContainerData);
        
        if (ediResult) {
          // Update gate_in_operation with EDI transmission info
          await supabase
            .from('gate_in_operations')
            .update({
              edi_transmitted: true,
              edi_transmission_date: new Date().toISOString(),
              edi_log_id: ediResult.id
            })
            .eq('id', operation.id);
        }
      } catch (ediError) {
        // EDI transmission failed, but don't fail the entire operation
        console.error('EDI transmission failed:', ediError);
        
        // Update gate_in_operation to indicate EDI failure
        await supabase
          .from('gate_in_operations')
          .update({
            edi_transmitted: false,
            edi_error_message: ediError instanceof Error ? ediError.message : 'EDI transmission failed'
          })
          .eq('id', operation.id);
      }

      // 6. Update local state
      setGateInOperations(prev => prev.map(op =>
        op.id === operation.id
          ? {
              ...op,
              containerId: createdContainers?.[0]?.id,
              assignedLocation: locationData.assignedLocation,
              completedAt: new Date(),
              status: 'completed',
              ediTransmitted: ediResult ? true : false,
              ediLogId: ediResult?.id
            }
          : op
      ));

      // 7. Refresh containers list (non-blocking)
      try {
        const updatedContainers = await containerService.getAll();
        setContainers(updatedContainers);
      } catch (refreshError) {
        logger.warn('Avertissement', 'ComponentName', refreshError);
      }

      // 8. Show success message with EDI status
      const damageStatus = locationData.damageAssessment?.hasDamage ? 'with damage reported' : 'in good condition';
      const ediStatus = ediResult ? '✓ EDI transmitted' : '⚠ EDI transmission failed';
      
      toast.success(`Container ${operation.containerNumber}${operation.containerQuantity === 2 ? ` and ${operation.secondContainerNumber}` : ''} successfully assigned to ${locationData.assignedLocation} (${damageStatus}) - ${ediStatus}`);
      setActiveView('overview');
    } catch (error) {
      handleError(error, 'GateIn.handleLocationValidation');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Error completing operation: ${errorMessage}`);
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

  const handleExportGateIn = () => {
    const dataToExport = filteredOperations.map(op => ({
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
      notes: op.notes || ''
    }));

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
        { header: 'Notes', key: 'notes', width: 30 }
      ],
      data: dataToExport
    });
  };



  if (!canPerformGateIn) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to perform gate in operations.</p>
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
        mockLocations={mockLocations}
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
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Gate In</h1>
              <p className="text-sm text-gray-600 hidden lg:block">Container entry management</p>
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
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Gate In</h1>
              <p className="text-sm text-gray-600 hidden lg:block">Container entry management</p>
            </div>
          </div>

          {/* Action Buttons - Mobile First */}
          <div className="grid grid-cols-2 gap-3 lg:flex lg:justify-end lg:space-x-3">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center space-x-2 px-4 py-3 lg:px-6 lg:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl lg:rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              <Plus className="h-5 w-5 lg:h-4 lg:w-4" />
              <span className="text-sm lg:text-base">New Gate In</span>
            </button>

            <button
              onClick={() => setActiveView('pending')}
              className="flex items-center justify-center space-x-2 px-4 py-3 lg:px-6 lg:py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl lg:rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              <Clock className="h-5 w-5 lg:h-4 lg:w-4" />
              <span className="text-sm lg:text-base">Pending ({pendingOperations.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unified Responsive Statistics */}
      <div className="px-4 py-4 lg:px-6 lg:py-6 space-y-4">
        {/* Mobile: 2x2 Grid | Tablet+: 4x1 Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {/* Today's Gate Ins */}
          <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-100 lg:border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 lg:hover:scale-100 active:scale-95">
            <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-2 lg:space-y-0">
              <div className="p-3 lg:p-2 bg-green-500 lg:bg-green-100 rounded-xl lg:rounded-lg shadow-lg lg:shadow-none">
                <Truck className="h-6 w-6 lg:h-5 lg:w-5 text-white lg:text-green-600" />
              </div>
              <div className="lg:ml-3">
                <p className="text-2xl lg:text-lg font-bold text-gray-900">{todayGateIns.length}</p>
                <p className="text-xs font-medium text-green-700 lg:text-gray-500 leading-tight">Today's Gate Ins</p>
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
                <p className="text-xs font-medium text-orange-700 lg:text-gray-500 leading-tight">Pending Operations</p>
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
                <p className="text-xs font-medium text-blue-700 lg:text-gray-500 leading-tight">Containers Processed</p>
              </div>
            </div>
          </div>

          {/* Damaged Containers */}
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
                  className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    selectedFilter === filter
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

          clients={clients}
          submissionError={submissionError}
          validationErrors={validationErrors}
          validationWarnings={validationWarnings}
        />
      )}

      {/* Processing Spinner Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      )}
    </div>
  );
};
