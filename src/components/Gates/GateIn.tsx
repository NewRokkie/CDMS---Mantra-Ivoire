import React, { useState } from 'react';
import { Plus, Search, Filter, CheckCircle, Clock, AlertTriangle, Truck, Container as ContainerIcon, Package, Calendar, MapPin, FileText, Eye, Edit, ArrowLeft, X, Menu, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { GateInModal } from './GateInModal';
import { PendingOperationsView } from './GateIn/PendingOperationsView';
import { MobileGateInHeader } from './GateIn/MobileGateInHeader';
import { MobileGateInStats } from './GateIn/MobileGateInStats';
import { MobileOperationsTable } from './GateIn/MobileOperationsTable';

// Enhanced interface for the new gate-in process
export interface GateInFormData {
  // Step 1: Container Information
  containerSize: '20ft' | '40ft';
  containerType: 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
  containerQuantity: 1 | 2;
  status: 'FULL' | 'EMPTY';
  isDamaged: boolean;
  clientId: string;
  clientCode: string;
  clientName: string;
  bookingReference: string;
  bookingType: 'IMPORT' | 'EXPORT';
  containerNumber: string;
  secondContainerNumber: string; // For when quantity is 2

  // Step 2: Transport Details
  driverName: string;
  truckNumber: string;
  transportCompany: string;

  // Location & Validation (Step 3)
  assignedLocation: string;
  truckArrivalDate: string;
  truckArrivalTime: string;
  truckDepartureDate: string;
  truckDepartureTime: string;

  // Additional fields
  notes: string;
  operationStatus: 'pending' | 'completed';
}

// Mock client data with code - name format
const mockClients = [
  { id: '1', code: '1088663', name: 'MAERSK LINE' },
  { id: '2', code: '2045789', name: 'MSC MEDITERRANEAN SHIPPING' },
  { id: '3', code: '3067234', name: 'CMA CGM' },
  { id: '4', code: '4012567', name: 'SHIPPING SOLUTIONS INC' },
  { id: '5', code: '5098432', name: 'HAPAG-LLOYD' }
];

// Mock location data
const mockLocations = {
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

// Mock pending operations
const mockPendingOperations = [
  {
    id: 'PO-001',
    date: new Date('2025-01-11T14:30:00'),
    containerNumber: 'MSKU-123456-7',
    secondContainerNumber: '',
    containerSize: '40ft',
    containerType: 'dry',
    containerQuantity: 1,
    status: 'FULL',
    isDamaged: false,
    bookingReference: 'BK-MAE-2025-001',
    bookingType: 'EXPORT' as const,
    clientCode: '1088663',
    clientName: 'MAERSK LINE',
    truckNumber: 'ABC-123',
    driverName: 'John Smith',
    transportCompany: 'Swift Transport',
    operationStatus: 'pending' as const,
    assignedLocation: '',
    truckArrivalDate: '',
    truckArrivalTime: '',
    truckDepartureDate: '',
    truckDepartureTime: ''
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
    isDamaged: true,
    bookingReference: '',
    clientCode: '2045789',
    clientName: 'MSC MEDITERRANEAN SHIPPING',
    truckNumber: 'XYZ-456',
    driverName: 'Maria Garcia',
    transportCompany: 'Express Logistics',
    operationStatus: 'pending' as const,
    assignedLocation: '',
    truckArrivalDate: '',
    truckArrivalTime: '',
    truckDepartureDate: '',
    truckDepartureTime: ''
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
    isDamaged: false,
    bookingReference: 'BK-CMA-2025-003',
    clientCode: '3067234',
    clientName: 'CMA CGM',
    truckNumber: 'DEF-789',
    driverName: 'Robert Chen',
    transportCompany: 'Ocean Transport',
    operationStatus: 'pending' as const,
    assignedLocation: '',
    truckArrivalDate: '',
    truckArrivalTime: '',
    truckDepartureDate: '',
    truckDepartureTime: ''
  }
];

// Mock completed operations
const mockCompletedOperations = [
  {
    id: 'CO-001',
    date: new Date('2025-01-11T13:15:00'),
    containerNumber: 'SHIP-111222-8',
    secondContainerNumber: '',
    containerSize: '20ft',
    containerType: 'dry',
    containerQuantity: 1,
    status: 'FULL',
    isDamaged: false,
    bookingReference: 'BK-SHIP-2025-001',
    clientCode: '4012567',
    clientName: 'SHIPPING SOLUTIONS INC',
    truckNumber: 'GHI-012',
    driverName: 'Lisa Green',
    transportCompany: 'Local Transport',
    operationStatus: 'completed' as const,
    assignedLocation: 'Stack S1',
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
    isDamaged: false,
    bookingReference: '',
    clientCode: '1088663',
    clientName: 'MAERSK LINE',
    truckNumber: 'JKL-345',
    driverName: 'Tom Wilson',
    transportCompany: 'Global Logistics',
    operationStatus: 'completed' as const,
    assignedLocation: 'Stack S31',
    truckArrivalDate: '2025-01-11',
    truckArrivalTime: '12:30',
    truckDepartureDate: '2025-01-11',
    truckDepartureTime: '13:00',
    completedAt: new Date('2025-01-11T13:00:00')
  }
];

// Helper function to format container number for display (adds hyphens)
const formatContainerNumberForDisplay = (containerNumber: string): string => {
  if (containerNumber.length === 11) {
    const letters = containerNumber.substring(0, 4);
    const numbers1 = containerNumber.substring(4, 10);
    const numbers2 = containerNumber.substring(10, 11);
    return `${letters}-${numbers1}-${numbers2}`;
  }
  return containerNumber;
};

// Helper function to validate container number format
const validateContainerNumber = (containerNumber: string): { isValid: boolean; message?: string } => {
  if (!containerNumber) {
    return { isValid: false, message: 'Container number is required' };
  }
  
  if (containerNumber.length !== 11) {
    return { isValid: false, message: 'Container number must be exactly 11 characters' };
  }
  
  const letters = containerNumber.substring(0, 4);
  const numbers = containerNumber.substring(4, 11);
  
  if (!/^[A-Z]{4}$/.test(letters)) {
    return { isValid: false, message: 'First 4 characters must be letters (A-Z)' };
  }
  
  if (!/^[0-9]{7}$/.test(numbers)) {
    return { isValid: false, message: 'Last 7 characters must be numbers (0-9)' };
  }
  
  return { isValid: true };
};

export const GateIn: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'pending' | 'location'>('overview');
  const [showForm, setShowForm] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [autoSaving, setAutoSaving] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(mockPendingOperations);
  const [completedOperations, setCompletedOperations] = useState(mockCompletedOperations);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const [formData, setFormData] = useState<GateInFormData>({
    containerSize: '20ft',
    containerType: 'dry',
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

  const { t } = useLanguage();
  const { user } = useAuth();
  const { currentYard, validateYardOperation } = useYard();

  const canPerformGateIn = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';

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
        const letters = cleanValue.substring(0, 4);
        const numbers = cleanValue.substring(4, 11);
        
        // Only allow letters in first 4 positions
        const validLetters = letters.replace(/[^A-Z]/g, '');
        // Only allow numbers in positions 5-11
        const validNumbers = numbers.replace(/[^0-9]/g, '');
        
        const validValue = validLetters + validNumbers;
        
        setFormData(prev => ({
          ...prev,
          [field]: validValue
        }));
        
        // Trigger auto-save
        setAutoSaving(true);
        setTimeout(() => setAutoSaving(false), 1000);
        return;
      }
      return; // Don't allow more than 11 characters
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Trigger auto-save
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
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
      assignedLocation: isDamaged ? 'DMG-VIRTUAL' : ''
    }));
  };

  const handleClientChange = (clientId: string) => {
    const selectedClient = mockClients.find(c => c.id === clientId);
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
        const isValidSecondContainer = formData.containerQuantity === 1 || validateContainerNumber(formData.secondContainerNumber).isValid;
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

      // Add to pending operations
      setPendingOperations(prev => [newOperation, ...prev]);
      
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
        containerType: 'dry',
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

  const handlePendingOperationClick = (operation: any) => {
    setSelectedOperation(operation);
  };

  const handleLocationValidation = async (operation: any, locationData: any) => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Move from pending to completed
      const completedOperation = {
        ...operation,
        operationStatus: 'completed' as const,
        assignedLocation: locationData.assignedLocation,
        truckDepartureDate: locationData.truckDepartureDate,
        truckDepartureTime: locationData.truckDepartureTime,
        completedAt: new Date()
      };

      // Remove from pending and add to completed
      setPendingOperations(prev => prev.filter(op => op.id !== operation.id));
      setCompletedOperations(prev => [completedOperation, ...prev]);

      alert(`Container ${operation.containerNumber}${operation.containerQuantity === 2 ? ` and ${operation.secondContainerNumber}` : ''} successfully assigned to ${locationData.assignedLocation}`);
      setActiveView('overview');
      setSelectedOperation(null);
    } catch (error) {
      alert(`Error completing operation: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const filteredOperations = allOperations.filter(op =>
    op.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (op.secondContainerNumber && op.secondContainerNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        operations={pendingOperations.filter(op =>
          op.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          op.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          op.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          op.clientName.toLowerCase().includes(searchTerm.toLowerCase())
        )}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onBack={() => setActiveView('overview')}
        onOperationClick={() => {}} // Not used anymore, handled internally
        onComplete={handleLocationValidation}
        isProcessing={isProcessing}
        mockLocations={mockLocations}
      />
    );
  }

  // Main Overview
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Header */}
      <MobileGateInHeader
        pendingCount={pendingOperations.length}
        onShowPending={() => setActiveView('pending')}
        onShowForm={() => setShowForm(true)}
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Mobile-Optimized Statistics */}
      <div className="px-4 py-6 space-y-6">
        <MobileGateInStats
          todayGateIns={12}
          pendingOperations={pendingOperations.length}
          containersProcessed={892}
          damagedContainers={3}
        />

        {/* Mobile-First Search and Filter */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {/* Mobile Search Bar */}
          <div className="p-4 border-b border-gray-100 sm:border-b-0">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search operations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-12 py-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Mobile Filter Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            {['all', 'pending', 'completed', 'damaged'].map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedFilter === filter
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile-Optimized Operations List */}
        <MobileOperationsTable
          operations={filteredOperations}
          searchTerm={searchTerm}
          selectedFilter={selectedFilter}
          onOperationClick={handlePendingOperationClick}
        />
      </div>

      {/* Gate In Form Modal */}
      {showForm && (
        <GateInModal
          showForm={showForm}
          setShowForm={setShowForm}
          formData={formData}
          setFormData={setFormData}
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