import React, { useState } from 'react';
import { Plus, Search, Filter, CheckCircle, Clock, AlertTriangle, Truck, Container as ContainerIcon, Package, Calendar, MapPin, FileText, Eye, Edit, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { GateInModal } from './GateInModal';

// Enhanced interface for the new gate-in process
export interface GateInFormData {
  // Step 1: Container Information
  containerSize: '20ft' | '40ft';
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
    containerNumber: 'MSKU1234567',
    secondContainerNumber: '',
    containerSize: '40ft',
    containerQuantity: 1,
    status: 'FULL',
    isDamaged: false,
    bookingReference: 'BK-MAE-2025-001',
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
    containerNumber: 'TCLU9876543',
    secondContainerNumber: 'TCLU9876544',
    containerSize: '20ft',
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
    containerNumber: 'GESU4567891',
    secondContainerNumber: '',
    containerSize: '40ft',
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
    containerNumber: 'SHIP1112228',
    secondContainerNumber: '',
    containerSize: '20ft',
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
    containerNumber: 'MAEU7778889',
    secondContainerNumber: 'MAEU7778890',
    containerSize: '20ft',
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

  const [formData, setFormData] = useState<GateInFormData>({
    containerSize: '20ft',
    containerQuantity: 1,
    status: 'FULL',
    isDamaged: false,
    clientId: '',
    clientCode: '',
    clientName: '',
    bookingReference: '',
    containerNumber: '',
    secondContainerNumber: '',
    driverName: '',
    truckNumber: '',
    transportCompany: '',
    assignedLocation: '',
    truckArrivalDate: '',
    truckArrivalTime: '',
    truckDepartureDate: '',
    truckDepartureTime: '',
    notes: '',
    operationStatus: 'pending'
  });

  const { t } = useLanguage();
  const { user } = useAuth();

  const canPerformGateIn = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';

  // Combine all operations for unified display
  const allOperations = [...pendingOperations, ...completedOperations].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleInputChange = (field: keyof GateInFormData, value: any) => {
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
        const hasSecondContainer = formData.containerQuantity === 1 || formData.secondContainerNumber.trim() !== '';
        const hasClient = formData.clientId !== '';
        const hasBookingRef = formData.status === 'EMPTY' || formData.bookingReference.trim() !== '';
        return hasContainerNumber && hasSecondContainer && hasClient && hasBookingRef;
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
        containerNumber: formData.containerNumber,
        secondContainerNumber: formData.secondContainerNumber,
        containerSize: formData.containerSize,
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
        truckArrivalDate: '',
        truckArrivalTime: '',
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
        containerQuantity: 1,
        status: 'FULL',
        isDamaged: false,
        clientId: '',
        clientCode: '',
        clientName: '',
        bookingReference: '',
        containerNumber: '',
        secondContainerNumber: '',
        driverName: '',
        truckNumber: '',
        transportCompany: '',
        assignedLocation: '',
        truckArrivalDate: '',
        truckArrivalTime: '',
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
    setActiveView('location');
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
        truckArrivalDate: locationData.truckArrivalDate,
        truckArrivalTime: locationData.truckArrivalTime,
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

  // Location & Validation View
  if (activeView === 'location' && selectedOperation) {
    return (
      <LocationValidationView
        operation={selectedOperation}
        onBack={() => setActiveView('pending')}
        onComplete={handleLocationValidation}
        isProcessing={isProcessing}
        mockLocations={mockLocations}
      />
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
        onOperationClick={handlePendingOperationClick}
      />
    );
  }

  // Main Overview
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gate In Management</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveView('pending')}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Clock className="h-4 w-4" />
            <span>Pending ({pendingOperations.length})</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-success flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Gate In</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Truck className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Today's Gate Ins</p>
              <p className="text-lg font-semibold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Pending Operations</p>
              <p className="text-lg font-semibold text-gray-900">{pendingOperations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ContainerIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Containers Processed</p>
              <p className="text-lg font-semibold text-gray-900">892</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Damaged Containers</p>
              <p className="text-lg font-semibold text-gray-900">3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search operations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10 w-full"
            />
          </div>
          <button className="btn-secondary flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Recent Gate In Operations */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Gate In Operations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Truck
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status & Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOperations.map((operation) => (
                <tr key={operation.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {operation.date.toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {operation.date.toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{operation.containerNumber}</div>
                    {operation.secondContainerNumber && (
                      <div className="text-sm font-medium text-gray-900">{operation.secondContainerNumber}</div>
                    )}
                    <div className="text-sm text-gray-500">
                      {operation.containerSize}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{operation.clientCode} - {operation.clientName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.truckNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{operation.driverName}</div>
                    <div className="text-sm text-gray-500">{operation.transportCompany}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(operation.operationStatus)}
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        operation.status === 'FULL' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {operation.status}
                      </span>
                      {operation.isDamaged && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Damaged
                        </span>
                      )}
                    </div>
                    {operation.bookingReference && (
                      <div className="text-xs text-gray-500 mt-1">
                        Booking: {operation.bookingReference}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.assignedLocation || (
                      <span className="text-gray-400 italic">Pending assignment</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOperations.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No operations found</h3>
            <p className="text-gray-600">
              {searchTerm ? "Try adjusting your search criteria." : "No gate in operations have been created yet."}
            </p>
          </div>
        )}
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

// Pending Operations View Component
const PendingOperationsView: React.FC<{
  operations: any[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onBack: () => void;
  onOperationClick: (operation: any) => void;
}> = ({ operations, searchTerm, onSearchChange, onBack, onOperationClick }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Pending Operations</h2>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search pending operations..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="form-input pl-10 w-full"
          />
        </div>
      </div>

      {/* Pending Operations Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Operations Awaiting Location Assignment</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Truck
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {operations.map((operation) => (
                <tr
                  key={operation.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => onOperationClick(operation)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.date.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{operation.containerNumber}</div>
                    {operation.secondContainerNumber && (
                      <div className="text-sm font-medium text-gray-900">{operation.secondContainerNumber}</div>
                    )}
                    <div className="text-sm text-gray-500">
                      {operation.containerSize}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{operation.clientCode} - {operation.clientName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.truckNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{operation.driverName}</div>
                    <div className="text-sm text-gray-500">{operation.transportCompany}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        operation.status === 'FULL' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {operation.status}
                      </span>
                      {operation.isDamaged && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Damaged
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                      Assign Location →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Location & Validation View Component
const LocationValidationView: React.FC<{
  operation: any;
  onBack: () => void;
  onComplete: (operation: any, locationData: any) => void;
  isProcessing: boolean;
  mockLocations: any;
}> = ({ operation, onBack, onComplete, isProcessing, mockLocations }) => {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [truckArrivalDate, setTruckArrivalDate] = useState('');
  const [truckArrivalTime, setTruckArrivalTime] = useState('');
  const [truckDepartureDate, setTruckDepartureDate] = useState('');
  const [truckDepartureTime, setTruckDepartureTime] = useState('');
  const [searchLocation, setSearchLocation] = useState('');

  // Auto-assign damage stack for damaged containers
  React.useEffect(() => {
    if (operation.isDamaged) {
      setSelectedLocation('DMG-VIRTUAL');
    }
  }, [operation.isDamaged]);

  const availableLocations = operation.isDamaged
    ? mockLocations.damage
    : mockLocations[operation.containerSize] || [];

  const filteredLocations = availableLocations.filter((loc: any) =>
    loc.name.toLowerCase().includes(searchLocation.toLowerCase())
  );

  const handleComplete = () => {
    if (!selectedLocation || !truckArrivalDate || !truckArrivalTime) {
      alert('Please fill in all required fields');
      return;
    }

    const locationData = {
      assignedLocation: selectedLocation,
      truckArrivalDate,
      truckArrivalTime,
      truckDepartureDate,
      truckDepartureTime
    };

    onComplete(operation, locationData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Location & Validation</h2>
        </div>
      </div>

      {/* Operation Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Operation Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-600">Container:</span>
            <div className="font-medium">{operation.containerNumber}</div>
            {operation.secondContainerNumber && (
              <div className="font-medium">{operation.secondContainerNumber}</div>
            )}
          </div>
          <div>
            <span className="text-sm text-gray-600">Size & Qty:</span>
            <div className="font-medium">{operation.containerSize} • Qty: {operation.containerQuantity}</div>
          </div>
          <div>
            <span className="text-sm text-gray-600">Client:</span>
            <div className="font-medium">{operation.clientCode} - {operation.clientName}</div>
          </div>
          <div>
            <span className="text-sm text-gray-600">Status:</span>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                operation.status === 'FULL' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {operation.status}
              </span>
              {operation.isDamaged && (
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                  Damaged
                </span>
              )}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600">Driver:</span>
            <div className="font-medium">{operation.driverName}</div>
          </div>
          <div>
            <span className="text-sm text-gray-600">Truck:</span>
            <div className="font-medium">{operation.truckNumber}</div>
          </div>
        </div>
        {operation.bookingReference && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-600">Booking Reference:</span>
            <div className="font-medium">{operation.bookingReference}</div>
          </div>
        )}
      </div>

      {/* Location Assignment */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {operation.isDamaged ? 'Auto-Assigned to Damage Stack' : 'Stack Selection'}
        </h3>

        {!operation.isDamaged && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search stacks..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="form-input pl-10 w-full"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.map((location: any) => (
            <div
              key={location.id}
              onClick={() => !operation.isDamaged && setSelectedLocation(location.id)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedLocation === location.id
                  ? 'border-blue-500 bg-blue-50'
                  : operation.isDamaged
                  ? 'border-red-200 bg-red-50 cursor-not-allowed'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">{location.name}</div>
              <div className="text-sm text-gray-600">{location.section}</div>
              <div className="text-sm text-gray-500 mt-2">
                Available: {location.available}/{location.capacity}
              </div>
              {operation.isDamaged && location.id === 'DMG-VIRTUAL' && (
                <div className="text-xs text-red-600 mt-1">Auto-assigned for damaged container</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Time Tracking */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Tracking</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Truck Arrival *</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={truckArrivalDate}
                  onChange={(e) => setTruckArrivalDate(e.target.value)}
                  className="form-input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={truckArrivalTime}
                  onChange={(e) => setTruckArrivalTime(e.target.value)}
                  className="form-input w-full"
                  required
                />
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Truck Departure</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={truckDepartureDate}
                  onChange={(e) => setTruckDepartureDate(e.target.value)}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={truckDepartureTime}
                  onChange={(e) => setTruckDepartureTime(e.target.value)}
                  className="form-input w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3">
        <button onClick={onBack} className="btn-secondary">
          Cancel
        </button>
        <button
          onClick={handleComplete}
          disabled={isProcessing || !selectedLocation || !truckArrivalDate || !truckArrivalTime}
          className="btn-success disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Complete Operation'}
        </button>
      </div>
    </div>
  );
};