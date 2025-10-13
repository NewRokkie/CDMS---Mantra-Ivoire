import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, Filter, CheckCircle, Clock, AlertTriangle, Truck, Container as ContainerIcon, Package, Calendar, MapPin, FileText, Eye, ArrowLeft, X, Menu, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { gateService, clientService, containerService, stackService } from '../../services/api';
import { supabase } from '../../services/api/supabaseClient';
import { GateInModal } from './GateInModal';
import { PendingOperationsView } from './GateIn/PendingOperationsView';
import { MobileGateInHeader } from './GateIn/MobileGateInHeader';
import { MobileGateInStats } from './GateIn/MobileGateInStats';
import { MobileOperationsTable } from './GateIn/MobileOperationsTable';
import { GateInFormData, GateInOperation } from './types';
import { validateContainerNumber, formatContainerNumberForDisplay, validateGateInStep, getStatusBadgeConfig } from './utils';
import { realtimeService } from '../../services/api/realtimeService';

export const GateIn: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { currentYard, validateYardOperation } = useYard();

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [clientsData, operationsData, containersData, stacksData] = await Promise.all([
          clientService.getAll(),
          gateService.getGateInOperations(),
          containerService.getAll(),
          stackService.getAll(currentYard?.id)
        ]);
        setClients(clientsData);
        setGateInOperations(operationsData);
        setContainers(containersData);
        setStacks(stacksData);
      } catch (error) {
        console.error('Error loading gate in data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentYard?.id]);

  useEffect(() => {
    if (!currentYard) return;

    console.log(`🔌 Setting up Gate In real-time subscriptions for yard: ${currentYard.id}`);

    const unsubscribeGateIn = realtimeService.subscribeToGateInOperations(
      currentYard.id,
      async (payload) => {
        console.log(`📡 Gate In ${payload.eventType}:`, payload.new);
        const operations = await gateService.getGateInOperations();
        setGateInOperations(operations);
      }
    );

    const unsubscribeContainers = realtimeService.subscribeToContainers(
      async (payload) => {
        console.log(`📡 Container ${payload.eventType}:`, payload.new);
        const containers = await containerService.getAll();
        setContainers(containers);
      }
    );

    return () => {
      unsubscribeGateIn();
      unsubscribeContainers();
      console.log(`🔌 Cleaned up Gate In real-time subscriptions`);
    };
  }, [currentYard?.id]);

  // Generate locations from stacks
  const mockLocations = React.useMemo(() => {
    const locations20ft: any[] = [];
    const locations40ft: any[] = [];
    const locationsDamage: any[] = [];

    stacks.forEach((stack) => {
      const available = stack.capacity - stack.currentOccupancy;
      const locationData = {
        id: stack.id,
        name: `Stack ${stack.stackNumber}`,
        capacity: stack.capacity,
        available: available,
        section: stack.sectionName || 'Main Section'
      };

      if (stack.isSpecialStack) {
        locationsDamage.push(locationData);
      } else if (stack.containerSize === '20feet') {
        locations20ft.push(locationData);
      } else if (stack.containerSize === '40feet') {
        locations40ft.push(locationData);
      }
    });

    return {
      '20ft': locations20ft,
      '40ft': locations40ft,
      damage: locationsDamage
    };
  }, [stacks]);

  const pendingOperations = gateInOperations.filter(op =>
    !op.completedAt || !op.assignedLocation
  );
  const completedOperations = gateInOperations.filter(op =>
    op.completedAt && op.assignedLocation
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState<GateInFormData>({
    containerSize: '20ft',
    containerType: 'standard',
    containerQuantity: 1,
    status: 'FULL',
    isDamaged: false,
    clientId: '',
    clientCode: '',
    clientName: '',
    bookingReference: '',
    containerNumber: '',
    secondContainerNumber: '',
    bookingType: 'EXPORT',
    driverName: '',
    truckNumber: '',
    transportCompany: '',
    assignedLocation: '',
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
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleInputChange = (field: keyof GateInFormData, value: any) => {
    // Special handling for container number validation
    if (field === 'containerNumber' || field === 'secondContainerNumber') {
      // Remove any non-alphanumeric characters and convert to uppercase
      const cleanValue = value.replace(/[^A-Z0-9]/g, '').toUpperCase();

      // Limit to 11 characters maximum
      if (cleanValue.length <= 11) {
        setFormData(prev => ({
          ...prev,
          [field]: cleanValue
        }));

        // Trigger auto-save with cleanup
        setAutoSaving(true);
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        autoSaveTimeoutRef.current = setTimeout(() => setAutoSaving(false), 1000);
        return;
      }
      return; // Don't allow more than 11 characters
    }

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
    setFormData(prev => ({
      ...prev,
      containerSize: size,
      containerQuantity: size === '40ft' ? 1 : prev.containerQuantity,
      secondContainerNumber: size === '40ft' ? '' : prev.secondContainerNumber
    }));
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

  const handleDamageChange = (isDamaged: boolean) => {
    setFormData(prev => ({
      ...prev,
      isDamaged,
      assignedLocation: isDamaged ? 'DMG-VIRTUAL' : prev.assignedLocation && prev.assignedLocation !== 'DMG-VIRTUAL' ? prev.assignedLocation : ''
    }));
  };

  const handleClientChange = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId) || mockClients.find(c => c.id === clientId);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        clientId: selectedClient.id,
        clientCode: selectedClient.code,
        clientName: selectedClient.name
      }));
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        const hasContainerNumber = formData.containerNumber.trim() !== '';
        const isValidFirstContainer = hasContainerNumber && validateContainerNumber(formData.containerNumber).isValid;
        const hasSecondContainer = formData.containerQuantity === 1 || formData.secondContainerNumber.trim() !== '';
        const isValidSecondContainer = formData.containerQuantity === 1 || (formData.secondContainerNumber ? validateContainerNumber(formData.secondContainerNumber).isValid : true);
        const hasClient = formData.clientId !== '';
        const hasBookingRef = formData.status === 'EMPTY' || formData.bookingReference.trim() !== '';
        return isValidFirstContainer && hasSecondContainer && isValidSecondContainer && hasClient && hasBookingRef;
      case 2:
        return formData.driverName !== '' && formData.truckNumber !== '' && formData.transportCompany !== '';
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(2, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    if (!canPerformGateIn) return;

    // Validate yard operation
    const yardValidation = validateYardOperation('gate_in');
    if (!yardValidation.isValid) {
      alert(`Cannot perform gate in: ${yardValidation.message}`);
      return;
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
        requiresSpecialHandling: formData.isDamaged
      };

      // Find optimal stack assignment
      const optimalStack = clientPoolService.findOptimalStackForContainer(
        assignmentRequest,
        { sections: [] } as any, // Would use actual yard data
        [] // Would use actual container data
      );

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Create new operation
      const newOperation = {
        id: `PO-${Date.now()}`,
        date: new Date(),
        yardId: currentYard?.id,
        yardCode: currentYard?.code,
        containerNumber: formatContainerNumberForDisplay(formData.containerNumber),
        secondContainerNumber: formData.secondContainerNumber ? formatContainerNumberForDisplay(formData.secondContainerNumber) : '',
        containerSize: formData.containerSize,
        containerType: formData.containerType,
        containerQuantity: formData.containerQuantity,
        status: formData.status,
        isDamaged: formData.isDamaged,
        bookingReference: formData.bookingReference,
        clientCode: formData.clientCode,
        clientName: formData.clientName,
        truckNumber: formData.truckNumber,
        driverName: formData.driverName,
        transportCompany: formData.transportCompany,
        operationStatus: 'pending' as const,
        assignedLocation: '',
        truckArrivalDate: formData.truckArrivalDate,
        truckArrivalTime: formData.truckArrivalTime,
        truckDepartureDate: '',
        truckDepartureTime: ''
      };

      // Process Gate In through API service
      const result = await gateService.processGateIn({
        containerNumber: formData.containerNumber,
        clientCode: formData.clientCode,
        containerType: formData.containerType,
        containerSize: formData.containerSize,
        transportCompany: formData.transportCompany,
        driverName: formData.driverName,
        vehicleNumber: formData.truckNumber,
        location: formData.assignedLocation || optimalStack?.stackId || 'Pending Assignment',
        weight: undefined,
        operatorId: user?.id || 'unknown',
        operatorName: user?.name || 'Unknown Operator',
        yardId: currentYard?.id || 'unknown',
        damageReported: formData.isDamaged,
        damageDescription: formData.isDamaged ? 'Container flagged as damaged during gate in' : undefined
      });

      if (!result.success) {
        alert(result.error || 'Failed to process gate in');
        setIsProcessing(false);
        return;
      }

      // Operation is already created in DB by gateService.processGateIn
      // Real-time subscription will update the UI automatically

      // Update client pool occupancy if stack was assigned
      if (optimalStack && !formData.isDamaged) {
        try {
          await clientPoolService.assignContainerToClientStack(
            assignmentRequest,
            { sections: [] } as any,
            []
          );
        } catch (error) {
          console.warn('Could not update client pool occupancy:', error);
        }
      }

      alert(`Gate In operation submitted for container ${formData.containerNumber}${formData.containerQuantity === 2 ? ` and ${formData.secondContainerNumber}` : ''}`);

      // Reset form
      setFormData({
        containerSize: '20ft',
        containerType: 'standard',
        containerQuantity: 1,
        status: 'FULL',
        isDamaged: false,
        clientId: '',
        clientCode: '',
        clientName: '',
        bookingReference: '',
        bookingType: 'EXPORT',
        containerNumber: '',
        secondContainerNumber: '',
        driverName: '',
        truckNumber: '',
        transportCompany: '',
        assignedLocation: '',
        truckArrivalDate: new Date().toISOString().split('T')[0],
        truckArrivalTime: new Date().toTimeString().slice(0, 5),
        truckDepartureDate: '',
        truckDepartureTime: '',
        notes: '',
        operationStatus: 'pending'
      });
      setCurrentStep(1);
      setShowForm(false);
    } catch (error) {
      alert(`Error processing gate in: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };


  const handleLocationValidation = async (operation: any, locationData: any) => {
    setIsProcessing(true);
    try {
      // Update operation in Supabase
      const { error } = await supabase
        .from('gate_in_operations')
        .update({
          assigned_location: locationData.assignedLocation,
          completed_at: new Date().toISOString(),
          status: 'completed'
        })
        .eq('id', operation.id);

      if (error) throw error;

      // Update local state
      setGateInOperations(prev => prev.map(op =>
        op.id === operation.id
          ? {
              ...op,
              assignedLocation: locationData.assignedLocation,
              completedAt: new Date(),
              status: 'completed'
            }
          : op
      ));

      alert(`Container ${operation.containerNumber}${operation.containerQuantity === 2 ? ` and ${operation.secondContainerNumber}` : ''} successfully assigned to ${locationData.assignedLocationName || locationData.assignedLocation}`);
      setActiveView('overview');
    } catch (error) {
      alert(`Error completing operation: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Import centralized getStatusBadgeConfig function

  const filteredOperations = allOperations.filter(op => {
    const matchesSearch = !searchTerm ||
      op.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (op.secondContainerNumber && op.secondContainerNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = selectedFilter === 'all' ||
                         op.operationStatus === selectedFilter ||
                         (selectedFilter === 'damaged' && op.isDamaged);

    return matchesSearch && matchesFilter;
  });

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
                <p className="text-2xl lg:text-lg font-bold text-gray-900">12</p>
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
                <p className="text-2xl lg:text-lg font-bold text-gray-900">892</p>
                <p className="text-xs font-medium text-blue-700 lg:text-gray-500 leading-tight">Containers Processed</p>
              </div>
            </div>
          </div>

          {/* Damaged Containers */}
          <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-100 lg:border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 lg:hover:scale-100 active:scale-95">
            <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-2 lg:space-y-0">
              <div className="p-3 lg:p-2 bg-red-500 lg:bg-purple-100 rounded-xl lg:rounded-lg shadow-lg lg:shadow-none">
                <AlertTriangle className="h-6 w-6 lg:h-5 lg:w-5 text-white lg:text-purple-600" />
              </div>
              <div className="lg:ml-3">
                <p className="text-2xl lg:text-lg font-bold text-gray-900">3</p>
                <p className="text-xs font-medium text-red-700 lg:text-gray-500 leading-tight">Damaged Containers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Search and Filter */}
        <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 lg:p-4">
            {/* Search Bar */}
            <div className="relative mb-4 lg:mb-0">
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
            <div className="lg:hidden flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
              {['all', 'pending', 'completed', 'damaged'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    selectedFilter === filter
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
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
                <option value="damaged">Damaged</option>
              </select>
              {searchTerm && (
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg font-medium">
                  {filteredOperations.length} result{filteredOperations.length !== 1 ? 's' : ''}
                </span>
              )}
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
          handleSubmit={handleSubmit}
          handleNextStep={handleNextStep}
          handlePrevStep={handlePrevStep}
          handleInputChange={handleInputChange}
          handleContainerSizeChange={handleContainerSizeChange}
          handleQuantityChange={handleQuantityChange}
          handleStatusChange={handleStatusChange}
          handleDamageChange={handleDamageChange}
          handleClientChange={handleClientChange}
          mockClients={mockClients}
        />
      )}
    </div>
  );
};
