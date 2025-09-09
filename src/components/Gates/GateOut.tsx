import React, { useState } from 'react';
import { Plus, Search, Filter, CheckCircle, Clock, AlertTriangle, Truck, Container as ContainerIcon, Package, Calendar, MapPin, FileText, Eye, Edit, ArrowLeft, X, Loader } from 'lucide-react';
import { Container, ReleaseOrder, ReleaseOrderContainer } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { GateOutModal } from './GateOutModal';
import { DatePicker } from '../Common/DatePicker';
import { TimePicker } from '../Common/TimePicker';

interface GateOutFormData {
  releaseOrderId: string;
  releaseOrder?: ReleaseOrder;
  selectedContainerDetails?: ReleaseOrderContainer[];
  selectedContainers: string[]; // IDs of containers to release
  transportCompany: string;
  driverName: string;
  vehicleNumber: string;
  gateOutDate: string;
  gateOutTime: string;
  notes: string;
}

interface PendingGateOut {
  id: string;
  releaseOrderId: string;
  releaseOrder: ReleaseOrder;
  selectedContainers: ReleaseOrderContainer[];
  createdAt: Date;
  createdBy: string;
  status: 'pending';
  notes?: string;
  containerSize: '20ft' | '40ft';
  requestedQuantity: number;
  actualQuantity: number;
}

interface ContainerEntry {
  number: string;
  confirmationNumber: string;
  validationState: 'pending' | 'valid' | 'invalid';
  validationMessage: string;
}

// Mock data for validated release orders ready for gate out
const mockValidatedReleaseOrders: ReleaseOrder[] = [
  {
    id: 'BK-MAEU-2025-001',
    bookingNumber: 'BK-MAEU-2025-001',
    bookingType: 'EXPORT',
    clientId: '1',
    clientCode: 'MAEU',
    clientName: 'Maersk Line',
    containerQuantities: {
      size20ft: 0,
      size40ft: 2
    },
    totalContainers: 2,
    maxQuantityThreshold: 10,
    status: 'validated',
    containers: [
      {
        id: 'roc-1',
        containerId: '1',
        containerNumber: 'MSKU-123456-7',
        containerType: 'dry',
        containerSize: '40ft',
        currentLocation: 'Block A-12',
        status: 'ready',
        addedAt: new Date('2025-01-11T09:00:00')
      },
      {
        id: 'roc-2',
        containerId: '6',
        containerNumber: 'MAEU-555666-4',
        containerType: 'reefer',
        containerSize: '40ft',
        currentLocation: 'Block A-08',
        status: 'ready',
        addedAt: new Date('2025-01-11T09:05:00')
      }
    ],
    transportCompany: 'Swift Transport Ltd',
    driverName: 'John Smith',
    vehicleNumber: 'ABC-123',
    createdBy: 'Jane Operator',
    validatedBy: 'Mike Supervisor',
    createdAt: new Date('2025-01-11T09:00:00'),
    validatedAt: new Date('2025-01-11T10:30:00'),
    estimatedReleaseDate: new Date('2025-01-12T14:00:00'),
    notes: 'Handle with care'
  },
  {
    id: 'BK-SHIP-2025-005',
    bookingNumber: 'BK-SHIP-2025-005',
    bookingType: 'IMPORT',
    clientId: '4',
    clientCode: 'SHIP001',
    clientName: 'Shipping Solutions Inc',
    containerQuantities: {
      size20ft: 1,
      size40ft: 2
    },
    totalContainers: 3,
    status: 'validated',
    requiresDetailedBreakdown: false,
    containers: [
      {
        id: 'roc-6',
        containerId: '7',
        containerNumber: 'SHIP-777888-5',
        containerType: 'dry',
        containerSize: '20ft',
        currentLocation: 'Block C-02',
        status: 'ready',
        addedAt: new Date('2025-01-10T16:00:00')
      },
      {
        id: 'roc-7',
        containerId: '8',
        containerNumber: 'SHIP-999000-6',
        containerType: 'dry',
        containerSize: '40ft',
        currentLocation: 'Block C-05',
        status: 'ready',
        addedAt: new Date('2025-01-10T16:05:00')
      },
      {
        id: 'roc-8',
        containerId: '9',
        containerNumber: 'SHIP-111333-7',
        containerType: 'reefer',
        containerSize: '40ft',
        currentLocation: 'Block D-01',
        status: 'ready',
        addedAt: new Date('2025-01-10T16:10:00')
      }
    ],
    transportCompany: 'Express Delivery',
    driverName: 'Lisa Green',
    vehicleNumber: 'JKL-345',
    createdBy: 'Sarah Client',
    validatedBy: 'Mike Supervisor',
    createdAt: new Date('2025-01-10T16:00:00'),
    validatedAt: new Date('2025-01-11T08:15:00'),
    estimatedReleaseDate: new Date('2025-01-12T10:00:00'),
    notes: 'Multiple containers - partial release allowed'
  },
  {
    id: 'BK-CMA-2025-004',
    bookingNumber: 'BK-CMA-2025-004',
    bookingType: 'IMPORT',
    clientId: '2',
    clientCode: 'CMA',
    clientName: 'CMA CGM',
    containerQuantities: {
      size20ft: 1,
      size40ft: 0
    },
    totalContainers: 1,
    maxQuantityThreshold: 10,
    requiresDetailedBreakdown: false,
    containers: [
      {
        id: 'roc-9',
        containerId: '10',
        containerNumber: 'CMAU-444555-8',
        containerType: 'dry',
        containerSize: '20ft',
        currentLocation: 'Block B-15',
        status: 'ready',
        addedAt: new Date('2025-01-11T11:00:00')
      }
    ],
    transportCompany: 'Global Logistics',
    driverName: 'Robert Johnson',
    vehicleNumber: 'XYZ-789',
    createdBy: 'Sarah Client',
    validatedBy: 'Mike Supervisor',
    createdAt: new Date('2025-01-11T11:00:00'),
    validatedAt: new Date('2025-01-11T12:30:00'),
    estimatedReleaseDate: new Date('2025-01-12T16:00:00'),
    notes: 'Single container - urgent delivery required'
  }
];

// Mock data for recent gate outs
const mockRecentGateOuts = [
  {
    id: '1',
    containerNumbers: ['GESU-456789-1'],
    clientName: 'CMA CGM',
    gateOutTime: new Date('2025-01-11T13:45:00'),
    releaseOrderId: 'BK-CMA-2025-003',
    bookingType: 'EXPORT',
    status: 'completed'
  },
  {
    id: '2',
    containerNumbers: ['TCLU-987654-3'],
    clientName: 'MSC',
    gateOutTime: new Date('2025-01-11T11:30:00'),
    releaseOrderId: 'BK-MSCU-2025-002',
    bookingType: 'IMPORT',
    status: 'completed'
  }
];

// Mock pending gate out operations
const mockPendingGateOutOperations = [
  {
    id: 'PGO-001',
    releaseOrderId: 'BK-MAEU-2025-001',
    releaseOrder: mockValidatedReleaseOrders[0],
    selectedContainers: mockValidatedReleaseOrders[0].containers.slice(0, 1),
    createdAt: new Date('2025-01-11T14:30:00'),
    createdBy: 'Jane Operator',
    status: 'pending' as const,
    notes: 'Priority shipment - handle with care',
    containerSize: '40ft' as const,
    requestedQuantity: 1,
    actualQuantity: 1
  },
  {
    id: 'PGO-002',
    releaseOrderId: 'BK-SHIP-2025-005',
    releaseOrder: mockValidatedReleaseOrders[1],
    selectedContainers: mockValidatedReleaseOrders[1].containers.slice(0, 2), // Only first 2 containers
    createdAt: new Date('2025-01-11T15:45:00'),
    createdBy: 'Mike Supervisor',
    status: 'pending' as const,
    notes: 'Partial release - 2 of 3 containers',
    containerSize: '20ft' as const,
    requestedQuantity: 2,
    actualQuantity: 2
  },
  {
    id: 'PGO-003',
    releaseOrderId: 'BK-CMA-2025-004',
    releaseOrder: mockValidatedReleaseOrders[2],
    selectedContainers: mockValidatedReleaseOrders[2].containers,
    createdAt: new Date('2025-01-11T16:00:00'),
    createdBy: 'Sarah Client',
    status: 'pending' as const,
    notes: 'Single container release - urgent',
    containerSize: '20ft' as const,
    requestedQuantity: 1,
    actualQuantity: 1
  }
];

// Helper function to validate container number format
const validateContainerNumber = (containerNumber: string): { isValid: boolean; message?: string } => {
  if (!containerNumber) {
    return { isValid: false, message: 'Container number is required' };
  }
  
  if (containerNumber.length !== 11) {
    return { isValid: false, message: `${containerNumber.length}/11 characters` };
  }
  
  const letters = containerNumber.substring(0, 4);
  const numbers = containerNumber.substring(4, 11);
  
  if (!/^[A-Z]{4}$/.test(letters)) {
    return { isValid: false, message: 'First 4 characters must be letters (A-Z)' };
  }
  
  if (!/^[0-9]{7}$/.test(numbers)) {
    return { isValid: false, message: 'Last 7 characters must be numbers (0-9)' };
  }
  
  return { isValid: true, message: 'Valid format' };
};

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

export const GateOut: React.FC = () => {
  const [selectedReleaseOrder, setSelectedReleaseOrder] = useState<ReleaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingOperations, setPendingOperations] = useState<PendingGateOut[]>(mockPendingGateOutOperations);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGateOutModal, setShowGateOutModal] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'pending'>('overview');
  const [formData, setFormData] = useState<GateOutFormData>({
    releaseOrderId: '',
    selectedContainers: [],
    transportCompany: '',
    driverName: '',
    vehicleNumber: '',
    gateOutDate: new Date().toISOString().split('T')[0],
    gateOutTime: new Date().toTimeString().slice(0, 5),
    notes: ''
  });
  const [containerNumbers, setContainerNumbers] = useState<string[]>(['']);
  const [confirmContainerNumbers, setConfirmContainerNumbers] = useState<string[]>(['']);
  const [containerValidationErrors, setContainerValidationErrors] = useState<string[]>([]);
  const [completionModal, setCompletionModal] = useState<{
    isOpen: boolean;
    order: any;
    containers: Array<{ id: string; number: string; confirmation: string }>;
  }>({
    isOpen: false,
    order: null,
    containers: [{ id: '1', number: '', confirmation: '' }]
  });

  const { t } = useLanguage();
  const { user, canViewAllData, getClientFilter } = useAuth();

  const canPerformGateOut = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';

  // Filter release orders based on user permissions
  const getFilteredReleaseOrders = () => {
    let orders = mockValidatedReleaseOrders;
    
    // Apply client filter for client users
    const clientFilter = getClientFilter();
    if (clientFilter) {
      orders = orders.filter(order => 
        order.clientCode === clientFilter ||
        order.createdBy === user?.name
      );
    }
    
    // Apply search filter
    return orders.filter(order =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.containers.some(c => c.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const filteredReleaseOrders = getFilteredReleaseOrders();

  const handleSelectReleaseOrder = (order: ReleaseOrder) => {
    setSelectedReleaseOrder(order);
    setFormData({
      releaseOrderId: order.id,
      selectedContainers: [], // Start with no containers selected
      transportCompany: order.transportCompany,
      driverName: order.driverName,
      vehicleNumber: order.vehicleNumber,
      gateOutDate: new Date().toISOString().split('T')[0],
      gateOutTime: new Date().toTimeString().slice(0, 5),
      notes: ''
    });
  };

  const handleNewGateOut = () => {
    setShowGateOutModal(true);
  };

  const handlePendingView = () => {
    setActiveView('pending');
  };

  const handleCompleteGateOut = (order: any) => {
    setCompletionModal({
      isOpen: true,
      order,
      containers: [{ id: '1', number: '', confirmation: '' }]
    });
  };

  const handleGateOutSubmit = async (data: any) => {
    setIsProcessing(true);
    try {
      // Automatically select containers based on size and quantity
      const selectedContainers = autoSelectContainers(
        data.releaseOrder,
        data.containerSize,
        data.quantity
      );

      if (selectedContainers.length === 0) {
        throw new Error(`No available ${data.containerSize} containers found for client ${data.releaseOrder.clientCode}`);
      }

      // Create pending operation instead of completing immediately
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const pendingOperation: PendingGateOut = {
        id: `PGO-${Date.now()}`,
        releaseOrderId: data.releaseOrder.id,
        releaseOrder: data.releaseOrder,
        selectedContainers: selectedContainers,
        createdAt: new Date(),
        createdBy: user?.name || 'Unknown',
        status: 'pending',
        notes: data.notes,
        containerSize: data.containerSize,
        requestedQuantity: data.quantity,
        actualQuantity: selectedContainers.length
      };
      
      setPendingOperations(prev => [pendingOperation, ...prev]);
      
      console.log('Gate Out moved to pending:', pendingOperation);
      alert(`Gate Out operation created for ${selectedContainers.length} ${data.containerSize} containers:\n${selectedContainers.map(c => c.containerNumber).join(', ')}`);
      
      setShowGateOutModal(false);
    } catch (error) {
      alert(`Error processing gate out: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Automatic container selection function
  const autoSelectContainers = (
    releaseOrder: ReleaseOrder,
    containerSize: '20ft' | '40ft',
    quantity: number
  ): ReleaseOrderContainer[] => {
    // Get available containers of the specified size for this client
    const availableContainers = releaseOrder.containers.filter(c => 
      c.status === 'ready' && 
      c.containerSize === containerSize
    );

    // Randomly shuffle and select the requested quantity
    const shuffled = [...availableContainers].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, quantity);
  };

  const handleCompletePendingOperation = (operationId: string) => {
    setPendingOperations(prev => prev.filter(op => op.id !== operationId));
    alert('Gate Out operation completed successfully!');
  };

  const handleContainerNumberChange = (index: number, value: string) => {
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
      
      setContainerNumbers(prev => {
        const newNumbers = [...prev];
        newNumbers[index] = validValue;
        return newNumbers;
      });
      
      // Clear confirmation when main number changes
      setConfirmContainerNumbers(prev => {
        const newConfirm = [...prev];
        newConfirm[index] = '';
        return newConfirm;
      });
      
      // Update validation errors
      const validation = validateContainerNumber(validValue);
      setContainerValidationErrors(prev => {
        const newErrors = [...prev];
        newErrors[index] = validation.isValid ? '' : validation.message || '';
        return newErrors;
      });
    }
  };

  const handleConfirmContainerNumberChange = (index: number, value: string) => {
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
      
      setConfirmContainerNumbers(prev => {
        const newConfirm = [...prev];
        newConfirm[index] = validValue;
        return newConfirm;
      });
    }
  };

  const addContainerField = () => {
    setContainerNumbers(prev => [...prev, '']);
    setConfirmContainerNumbers(prev => [...prev, '']);
    setContainerValidationErrors(prev => [...prev, '']);
  };

  const removeContainerField = (index: number) => {
    if (containerNumbers.length > 1) {
      setContainerNumbers(prev => prev.filter((_, i) => i !== index));
      setConfirmContainerNumbers(prev => prev.filter((_, i) => i !== index));
      setContainerValidationErrors(prev => prev.filter((_, i) => i !== index));
    }
  };

  const isContainerNumberValid = (index: number): boolean => {
    const containerNumber = containerNumbers[index];
    const confirmNumber = confirmContainerNumbers[index];
    const validation = validateContainerNumber(containerNumber);
    return validation.isValid && containerNumber === confirmNumber;
  };

  const areAllContainerNumbersValid = (): boolean => {
    return containerNumbers.every((_, index) => isContainerNumberValid(index)) &&
           containerNumbers.every(num => num.length === 11);
  };

  // Pending Operations View
  if (activeView === 'pending') {
    return <PendingGateOutView operations={pendingOperations} onBack={() => setActiveView('overview')} onComplete={handleCompletePendingOperation} />;
  }

  const showClientNotice = !canViewAllData() && user?.role === 'client';

  if (!canPerformGateOut) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to perform gate out operations.</p>
      </div>
    );
  }

  const GateOutCompletionModal = ({ isOpen, onClose, order }: any) => {
    const [containers, setContainers] = useState(completionModal.containers);
    
    const addContainerField = () => {
      const newContainer = {
        id: Date.now().toString(),
        number: '',
        confirmation: ''
      };
      const updatedContainers = [...containers, newContainer];
      setContainers(updatedContainers);
      setCompletionModal(prev => ({
        ...prev,
        containers: updatedContainers
      }));
    };
    
    const removeContainerField = (id: string) => {
      if (containers.length > 1) {
        const updatedContainers = containers.filter(container => container.id !== id);
        setContainers(updatedContainers);
        setCompletionModal(prev => ({
          ...prev,
          containers: updatedContainers
        }));
      }
    };
    
    const updateContainerField = (id: string, field: 'number' | 'confirmation', value: string) => {
      const updatedContainers = containers.map(container =>
        container.id === id ? { ...container, [field]: value } : container
      );
      setContainers(updatedContainers);
      setCompletionModal(prev => ({
        ...prev,
        containers: updatedContainers
      }));
    };
    
    const validateContainerNumber = (containerNumber: string): boolean => {
      const cleanNumber = containerNumber.replace(/[^A-Z0-9]/g, '');
      const pattern = /^[A-Z]{4}[0-9]{7}$/;
      return pattern.test(cleanNumber);
    };
    
    const formatContainerInput = (value: string): string => {
      return value.replace(/[^A-Z0-9]/g, '').toUpperCase().slice(0, 11);
    };
    
    const formatContainerDisplay = (containerNumber: string): string => {
      if (containerNumber.length === 11) {
        return `${containerNumber.slice(0, 4)}-${containerNumber.slice(4, 10)}-${containerNumber.slice(10)}`;
      }
      return containerNumber;
    };

    if (!isOpen || !order) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Complete Gate Out</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Order Details</h4>
              <p className="text-sm text-gray-600">Booking: {order.bookingNumber}</p>
              <p className="text-sm text-gray-600">Client: {order.clientName}</p>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Container Numbers
                </label>
                <button
                  type="button"
                  onClick={addContainerField}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add Container
                </button>
              </div>
              
              {containers.map((container) => (
                <div key={container.id} className="space-y-2 mb-4 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Container {containers.indexOf(container) + 1}</span>
                    {containers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContainerField(container.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Enter container number"
                    value={container.number}
                    onChange={(e) => updateContainerField(container.id, 'number', formatContainerInput(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <input
                    type="text"
                    placeholder="Confirm container number"
                    value={container.confirmation}
                    onChange={(e) => updateContainerField(container.id, 'confirmation', formatContainerInput(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  {container.number && (
                    <div className="text-xs text-gray-500">
                      Display: {formatContainerDisplay(container.number)}
                    </div>
                  )}
                  
                  {container.number && container.confirmation && (
                    <div className={`text-xs ${
                      container.number === container.confirmation && validateContainerNumber(container.number)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {container.number === container.confirmation && validateContainerNumber(container.number)
                        ? '✓ Valid and confirmed'
                        : '✗ Invalid or not matching'
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Complete Gate Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gate Out Management</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePendingView}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Clock className="h-4 w-4" />
            <span>Pending ({pendingOperations.length})</span>
          </button>
          <button
            onClick={handleNewGateOut}
            className="btn-success flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Gate Out</span>
          </button>
        </div>
      </div>

      {/* Client Notice */}
      {showClientNotice && (
        <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
          <p className="text-sm text-blue-800">
            You are viewing gate out operations for <strong>{user?.company}</strong> only.
          </p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Today's Gate Outs</p>
              <p className="text-lg font-semibold text-gray-900">8</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Ready for Release</p>
              <p className="text-lg font-semibold text-gray-900">{filteredReleaseOrders.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ContainerIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Containers Released</p>
              <p className="text-lg font-semibold text-gray-900">156</p>
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
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search release orders, containers, drivers, or clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10 pr-4 w-full"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button className="btn-secondary flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
            {searchTerm && (
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {filteredReleaseOrders.length} result{filteredReleaseOrders.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Validated Release Orders Ready for Gate Out */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Validated Release Orders</h3>
          <p className="text-sm text-gray-600">Release orders ready for gate out processing</p>
        </div>
        
        <div className="p-6">
          {filteredReleaseOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReleaseOrders.map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleSelectReleaseOrder(order)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900">{order.bookingNumber || order.id}</span>
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {order.containers.length} container{order.containers.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">
                        {canViewAllData() ? order.clientName : 'Your Company'}
                      </span>
                    </div>
                    
                    {order.estimatedReleaseDate && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          Est: {order.estimatedReleaseDate.toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-2">
                      Ready containers: {order.containers.filter(c => c.status === 'ready').length}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No validated release orders</h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? "No release orders match your search criteria."
                  : "No validated release orders are currently available for gate out."
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Gate Out Operations */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Gate Out Operations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Release Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Containers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gate Out Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockRecentGateOuts.map((gateOut) => (
                <tr key={gateOut.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {gateOut.releaseOrderId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      gateOut.bookingType === 'IMPORT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {gateOut.bookingType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {gateOut.containerNumbers.join(', ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {canViewAllData() ? gateOut.clientName : 'Your Company'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {gateOut.gateOutTime.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {gateOut.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gate Out Modal */}
      {showGateOutModal && (
        <GateOutModal
          showModal={showGateOutModal}
          setShowModal={setShowGateOutModal}
          availableReleaseOrders={filteredReleaseOrders}
          onSubmit={handleGateOutSubmit}
          isProcessing={isProcessing}
        />
      )}

      {/* Gate Out Completion Modal */}
      <GateOutCompletionModal
        isOpen={completionModal.isOpen}
        onClose={() => setCompletionModal({ isOpen: false, order: null, containers: [{ id: '1', number: '', confirmation: '' }] })}
        order={completionModal.order}
      />
    </div>
  );
};

// Pending Gate Out Operations View Component
const PendingGateOutView: React.FC<{
  operations: PendingGateOut[];
  onBack: () => void;
  onComplete: (operationId: string) => void;
}> = ({ operations, onBack, onComplete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOperation, setSelectedOperation] = useState<PendingGateOut | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'IMPORT' | 'EXPORT'>('all');
  const { user, canViewAllData } = useAuth();

  const filteredOperations = operations.filter(operation => {
    const matchesSearch = (operation.releaseOrder.vehicleNumber && operation.releaseOrder.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (operation.releaseOrder.driverName && operation.releaseOrder.driverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (operation.releaseOrder.bookingNumber && operation.releaseOrder.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         operation.releaseOrder.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.releaseOrder.clientCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || operation.releaseOrder.bookingType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleOperationClick = (operation: PendingGateOut) => {
    setSelectedOperation(operation);
    setShowCompletionModal(true);
  };

  const handleCompleteOperation = (operationId: string) => {
    onComplete(operationId);
    setShowCompletionModal(false);
    setSelectedOperation(null);
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
          <h2 className="text-2xl font-bold text-gray-900">Pending Gate Out Operations</h2>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search by truck number, driver name, booking number, or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {['all', 'IMPORT', 'EXPORT'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(type as any)}
                  className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    typeFilter === type
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {type === 'all' ? 'All Types' : type}
                </button>
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {filteredOperations.length} result{filteredOperations.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Pending Operations Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Operations Awaiting Final Processing</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Truck Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOperations.map((operation) => (
                <tr 
                  key={operation.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleOperationClick(operation)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.createdAt.toLocaleDateString()}
                    <div className="text-xs text-gray-500">
                      {operation.createdAt.toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      operation.releaseOrder.bookingType === 'IMPORT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {operation.releaseOrder.bookingType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{operation.releaseOrder.vehicleNumber || 'Not specified'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{operation.releaseOrder.driverName || 'Not specified'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{operation.releaseOrder.bookingNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {canViewAllData() ? operation.releaseOrder.clientName : 'Your Company'}
                    </div>
                    <div className="text-xs text-gray-500">{operation.releaseOrder.clientCode}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.createdBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredOperations.length === 0 && (
          <div className="text-center py-12">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No pending operations</h3>
            <p className="text-gray-600">
              {searchTerm || typeFilter !== 'all' ? "Try adjusting your search criteria or filters." : "No gate out operations have been created yet."}
            </p>
          </div>
        )}
      </div>

      {/* Gate Out Completion Modal */}
      {showCompletionModal && selectedOperation && (
        <GateOutCompletionModal
          operation={selectedOperation}
          onClose={() => {
            setShowCompletionModal(false);
            setSelectedOperation(null);
          }}
          onComplete={handleCompleteOperation}
        />
      )}
    </div>
  );
};

interface ContainerInput {
  id: string;
  containerNumber: string;
  confirmationNumber: string;
  validationState: 'pending' | 'valid' | 'invalid';
  validationMessage: string;
  isVerified: boolean;
}

// Gate Out Completion Modal Component
const GateOutCompletionModal: React.FC<{
  operation: PendingGateOut;
  onClose: () => void;
  onComplete: (operationId: string) => void;
}> = ({ operation, onClose, onComplete }) => {
  const [containerNumbers, setContainerNumbers] = useState<string[]>(['']);
  const [confirmContainerNumbers, setConfirmContainerNumbers] = useState<string[]>(['']);
  const [containerValidationErrors, setContainerValidationErrors] = useState<string[]>([]);

  const addContainerField = () => {
    setContainerNumbers(prev => [...prev, '']);
    setConfirmContainerNumbers(prev => [...prev, '']);
    setContainerValidationErrors(prev => [...prev, '']);
  };

  const removeContainerField = (index: number) => {
    if (containerNumbers.length > 1) {
      setContainerNumbers(prev => prev.filter((_, i) => i !== index));
      setConfirmContainerNumbers(prev => prev.filter((_, i) => i !== index));
      setContainerValidationErrors(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleContainerNumberChange = (index: number, value: string) => {
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
      
      setContainerNumbers(prev => {
        const newNumbers = [...prev];
        newNumbers[index] = validValue;
        return newNumbers;
      });
      
      // Clear confirmation when main number changes
      setConfirmContainerNumbers(prev => {
        const newConfirm = [...prev];
        newConfirm[index] = '';
        return newConfirm;
      });
      
      // Update validation errors
      const validation = validateContainerNumber(validValue);
      setContainerValidationErrors(prev => {
        const newErrors = [...prev];
        newErrors[index] = validation.isValid ? '' : validation.message || '';
        return newErrors;
      });
    }
  };

  const handleConfirmContainerNumberChange = (index: number, value: string) => {
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
      
      setConfirmContainerNumbers(prev => {
        const newConfirm = [...prev];
        newConfirm[index] = validValue;
        return newConfirm;
      });
    }
  };

  const isContainerNumberValid = (index: number): boolean => {
    const containerNumber = containerNumbers[index];
    const confirmNumber = confirmContainerNumbers[index];
    const validation = validateContainerNumber(containerNumber);
    return validation.isValid && containerNumber === confirmNumber;
  };

  const [containers, setContainers] = useState<ContainerEntry[]>([
    {
      number: '',
      confirmationNumber: '',
      validationState: 'pending',
      validationMessage: '',
    }
  ]);
  const [isInVerificationMode, setIsInVerificationMode] = useState(false);
  const [isInConfirmationMode, setIsInConfirmationMode] = useState(false);
  const [currentVerifyingIndex, setCurrentVerifyingIndex] = useState(-1);
  const [gateOutDate, setGateOutDate] = useState(new Date().toISOString().split('T')[0]);
  const [gateOutTime, setGateOutTime] = useState(new Date().toTimeString().slice(0, 5));
  const [isProcessing, setIsProcessing] = useState(false);
  const [containerInputs, setContainerInputs] = useState<ContainerInput[]>([
    {
      id: '1',
      containerNumber: '',
      confirmationNumber: '',
      validationState: 'pending',
      validationMessage: '',
      isVerified: false
    }
  ]);
  const [formData, setFormData] = useState({
    driverName: operation.releaseOrder.driverName || '',
    vehicleNumber: operation.releaseOrder.vehicleNumber || '',
    transportCompany: operation.releaseOrder.transportCompany || ''
  });
  const { canViewAllData } = useAuth();

  // Mock yard database for validation
  const mockYardContainers = [
    { number: 'MSKU-123456-7', clientCode: 'MAEU', bookingRef: 'BK-MAEU-2025-001', location: 'Block A-12', status: 'ready' },
    { number: 'MAEU-555666-4', clientCode: 'MAEU', bookingRef: 'BK-MAEU-2025-001', location: 'Block A-08', status: 'ready' },
    { number: 'SHIP-777888-5', clientCode: 'SHIP001', bookingRef: 'BK-SHIP-2025-005', location: 'Block C-02', status: 'ready' },
    { number: 'SHIP-999000-6', clientCode: 'SHIP001', bookingRef: 'BK-SHIP-2025-005', location: 'Block C-05', status: 'ready' },
    { number: 'SHIP-111333-7', clientCode: 'SHIP001', bookingRef: 'BK-SHIP-2025-005', location: 'Block D-01', status: 'ready' },
    { number: 'CMAU-444555-8', clientCode: 'CMA', bookingRef: 'BK-CMA-2025-004', location: 'Block B-15', status: 'ready' }
  ];

  const validateContainer = (containerNumber: string, selectedReleaseOrder?: ReleaseOrder): { isValid: boolean; message: string } => {
    if (!containerNumber.trim()) {
      return { isValid: false, message: 'Container number is required' };
    }

    const container = mockYardContainers.find(c => c.number === containerNumber);
    
    if (!container) {
      return { isValid: false, message: 'Container not found in yard database' };
    }

    if (selectedReleaseOrder && container.bookingRef !== selectedReleaseOrder.bookingNumber) {
      return { isValid: false, message: 'Container not linked to this booking reference' };
    }

    if (selectedReleaseOrder && container.clientCode !== selectedReleaseOrder.clientCode) {
      return { isValid: false, message: 'Container not associated with correct client' };
    }

    if (container.status !== 'ready') {
      return { isValid: false, message: 'Container not available for gate out processing' };
    }

    // Check if container is already added
    const isDuplicate = containerInputs.some(c => c.containerNumber === containerNumber);
    if (isDuplicate) {
      return { isValid: false, message: 'Container already added to this transaction' };
    }

    return { isValid: true, message: 'Container validated successfully' };
  };

  const handleAddContainer = () => {
    if (containerInputs.length < 2) {
      const newInput: ContainerInput = {
        id: Date.now().toString(),
        containerNumber: '',
        confirmationNumber: '',
        validationState: 'pending',
        validationMessage: '',
        isVerified: false
      };
      setContainerInputs(prev => [...prev, newInput]);
    }
  };

  const handleRemoveContainer = (inputId: string) => {
    if (containerInputs.length > 1) {
      setContainerInputs(prev => prev.filter(input => input.id !== inputId));
    }
  };

  const handleContainerConfirmationChange = (inputId: string, confirmationNumber: string) => {
    setContainerInputs(prev => prev.map(input => 
      input.id === inputId 
        ? { 
            ...input, 
            confirmationNumber,
            isVerified: input.containerNumber && confirmationNumber && input.containerNumber === confirmationNumber && input.validationState === 'valid'
          }
        : input
    ));
  };

  const handleContainerNumberChangeForInput = (inputId: string, containerNumber: string) => {
    setTimeout(() => {
      setContainerInputs(prev => prev.map(input => 
        input.id === inputId 
          ? { 
              ...input, 
              containerNumber,
              confirmationNumber: '', // Clear confirmation when main number changes
              validationState: containerNumber ? 'pending' : 'pending',
              validationMessage: containerNumber ? 'Validating...' : '',
              isVerified: false
            }
          : input
      ));
      
      if (containerNumber) {
        // Simulate validation delay
        setTimeout(() => {
          const validation = validateContainer(containerNumber, operation.releaseOrder);
          setContainerInputs(prev => prev.map(input => 
            input.id === inputId 
              ? { 
                  ...input, 
                  validationState: validation.isValid ? 'valid' : 'invalid',
                  validationMessage: validation.message
                }
              : input
          ));
        }, 500);
      }
    }, 0);
  };

  const isFormValid = () => {
    return containerInputs.length > 0 && 
           containerInputs.every(input => 
             input.validationState === 'valid' && 
             input.confirmationNumber === input.containerNumber &&
             input.containerNumber && input.confirmationNumber
           ) &&
           formData.driverName && 
           formData.vehicleNumber && 
           formData.transportCompany;
  };

  const handleSubmit = async (submitData: any) => {
    if (!areAllContainerNumbersValid()) {
      alert('Please ensure all container numbers are valid and confirmed.');
      return;
    }
    
    setIsProcessing(true);
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const releaseOrder = submitData.releaseOrder;
      
      // Check if there are remaining containers to process
      if (!releaseOrder.remainingContainers || releaseOrder.remainingContainers <= 0) {
        throw new Error(`No remaining containers to process for booking ${releaseOrder.bookingNumber || releaseOrder.id}`);
      }

      // Create new gate out operation
      const newOperation = {
        id: `GO-${Date.now()}`,
        date: new Date(),
        containerNumber: `TEMP-${releaseOrder.clientCode}-${Date.now()}`, // Temporary container number
        releaseOrderId: releaseOrder.id,
        bookingNumber: releaseOrder.bookingNumber || releaseOrder.id,
        clientCode: releaseOrder.clientCode,
        clientName: releaseOrder.clientName,
        driverName: releaseOrder.driverName,
        vehicleNumber: releaseOrder.vehicleNumber,
        transportCompany: releaseOrder.transportCompany,
        operationStatus: 'pending' as const,
        notes: '',
        containerNumbers: containerNumbers.filter(num => num.length === 11),
        displayContainerNumbers: containerNumbers.filter(num => num.length === 11).map(formatContainerNumberForDisplay)
      };

      // Update the release order's remaining containers
      const updatedRemainingContainers = releaseOrder.remainingContainers - 1;
      
      // Update status based on remaining containers
      let newStatus: ReleaseOrder['status'] = releaseOrder.status;
      if (updatedRemainingContainers === 0) {
        newStatus = 'completed';
      } else if (updatedRemainingContainers < releaseOrder.totalContainers) {
        newStatus = 'in_process';
      }

      // Add to pending operations
      // setPendingOperations(prev => [newOperation, ...prev]);

      alert(`Gate Out operation submitted for booking ${releaseOrder.bookingNumber || releaseOrder.id}. ${updatedRemainingContainers} containers remaining.`);

      // Reset form
      // setFormData({
      //   releaseOrderId: '',
      //   selectedContainers: [],
      //   transportCompany: '',
      //   driverName: '',
      //   vehicleNumber: '',
      //   gateOutDate: new Date().toISOString().split('T')[0],
      //   gateOutTime: new Date().toTimeString().slice(0, 5),
      //   notes: ''
      // });
      
      onComplete(operation.id);
    } catch (error) {
      alert(`Error completing gate out: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const areAllContainerNumbersValid = (): boolean => {
    return containerNumbers.every((_, index) => isContainerNumberValid(index)) &&
           containerNumbers.every(num => num.length === 11);
  };

  const extractedContainerNumbers = containerInputs.map(input => input.containerNumber);
  const extractedConfirmContainerNumbers = containerInputs.map(input => input.confirmationNumber);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-strong max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Complete Gate Out</h3>
              <p className="text-sm text-gray-600">{operation.releaseOrder.bookingNumber || operation.releaseOrderId}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Operation Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Operation Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Client:</span>
                  <span className="font-medium">
                    {canViewAllData() ? operation.releaseOrder.clientName : 'Your Company'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Driver:</span>
                  <span className="font-medium">{operation.releaseOrder.driverName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Truck Number:</span>
                  <span className="font-medium">{operation.releaseOrder.vehicleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Transport Company:</span>
                  <span className="font-medium">{operation.releaseOrder.transportCompany}</span>
                </div>
              </div>
            </div>

            {/* Container Number Entry */}
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-purple-900 flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Container Numbers
                </h4>
                <button
                  type="button"
                  onClick={addContainerField}
                  className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Container</span>
                </button>
              </div>
              
              <div className="space-y-4">
                {containerNumbers.map((containerNumber, index) => {
                  const validation = validateContainerNumber(containerNumber);
                  const confirmNumber = confirmContainerNumbers[index];
                  const numbersMatch = containerNumber === confirmNumber && containerNumber.length === 11;
                  
                  return (
                    <div key={index} className="bg-white p-4 rounded-lg border border-purple-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-purple-800">
                          Container {index + 1}
                        </span>
                        {containerNumbers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeContainerField(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      
                      {/* Container Number Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Enter Container Number *
                        </label>
                        <div className="relative">
                          <input
                            type={isInConfirmationMode ? "password" : "text"}
                            onFocus={() => setIsInConfirmationMode(false)}
                            required
                            value={containerNumber}
                            onChange={(e) => handleContainerNumberChange(index, e.target.value)}
                            className={`form-input w-full pr-20 ${
                              containerNumber && !validation.isValid
                                ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                                : containerNumber && validation.isValid
                                ? 'border-green-300 bg-green-50 focus:ring-green-500 focus:border-green-500'
                                : ''
                            }`}
                            placeholder="e.g., ONEU1234567"
                            maxLength={11}
                          />
                          {/* Validation Status */}
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                            {containerNumber && (
                              <>
                                {validation.isValid ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                                <span className={`text-xs font-medium ${
                                  validation.isValid ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {validation.message}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Format: 4 letters + 7 numbers • Display: {containerNumber ? formatContainerNumberForDisplay(containerNumber) : 'ONEU-123456-7'}
                        </p>
                      </div>

                      {/* Confirm Container Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm Container Number *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            onFocus={() => setIsInConfirmationMode(true)}
                            required
                            value={confirmNumber}
                            onChange={(e) => handleConfirmContainerNumberChange(index, e.target.value)}
                            className={`form-input w-full pr-20 ${
                              confirmNumber && confirmNumber !== containerNumber
                                ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                                : confirmNumber && numbersMatch
                                ? 'border-green-300 bg-green-50 focus:ring-green-500 focus:border-green-500'
                                : ''
                            }`}
                            placeholder="Re-enter container number to confirm"
                            maxLength={11}
                          />
                          {/* Match Status */}
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                            {confirmNumber && (
                              <>
                                {numbersMatch ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                                <span className={`text-xs font-medium ${
                                  numbersMatch ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {numbersMatch ? 'Match' : 'No match'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Container Status Indicator */}
                      {validation.isValid && numbersMatch && (
                        <div className="flex items-center p-2 bg-green-100 border border-green-200 rounded-lg">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                          <span className="text-sm text-green-800">
                            Container {formatContainerNumberForDisplay(containerNumber)} validated
                          </span>
                        </div>
                      )}

                      {/* Validation Error */}
                      {containerNumber && !validation.isValid && (
                        <div className="flex items-center p-2 bg-red-100 border border-red-200 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                          <span className="text-sm text-red-800">
                            {validation.message}
                          </span>
                        </div>
                      )}

                      {/* Confirmation Error */}
                      {confirmNumber && containerNumber && confirmNumber !== containerNumber && (
                        <div className="flex items-center p-2 bg-red-100 border border-red-200 rounded-lg">
                          <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                          <span className="text-sm text-red-800">
                            Container numbers do not match
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Container Summary */}
              {containerNumbers.filter(num => num.length === 11).length > 0 && (
                <div className="mt-4 p-4 bg-white rounded-lg border-2 border-purple-300">
                  <h5 className="font-medium text-purple-900 mb-2">Container Summary</h5>
                  <div className="text-sm text-gray-700">
                    {containerNumbers.filter(num => num.length === 11).length} container{containerNumbers.filter(num => num.length === 11).length !== 1 ? 's' : ''} ready for gate out:
                  </div>
                  <div className="mt-2 space-y-1">
                    {containerNumbers.filter(num => num.length === 11).map((num, index) => (
                      <div key={index} className="text-sm font-mono text-purple-800">
                        • {formatContainerNumberForDisplay(num)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Gate Out Date & Time */}
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Gate Out Date & Time
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <DatePicker
                    value={gateOutDate}
                    onChange={setGateOutDate}
                    placeholder="Select date"
                    label="Date *"
                    required
                  />
                </div>

                <div>
                  <TimePicker
                    value={gateOutTime}
                    onChange={setGateOutTime}
                    placeholder="Select time"
                    label="Time *"
                    required
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-end space-x-3">
            {isInVerificationMode && (
              <div className="flex items-center space-x-2 text-sm text-orange-600 mr-auto">
                <Clock className="h-4 w-4" />
                <span>Verification in progress...</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              <XCircle>Cancel</XCircle>
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isProcessing || !isFormValid() || isInVerificationMode || !areAllContainerNumbersValid()}
              className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Complete Gate Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};