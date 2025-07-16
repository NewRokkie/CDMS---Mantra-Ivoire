import React, { useState, useEffect } from 'react';
import { Search, X, Truck, Package, Clock, User, MapPin, AlertCircle, CheckCircle, XCircle, Filter, Calendar, FileText, Eye, Plus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { GateInModal } from './GateInModal';

interface Container {
  id: string;
  number: string;
  type: string;
  size: string;
  status: 'empty' | 'full';
  location?: string;
  client?: string;
  bookingRef?: string;
  weight?: number;
  lastMovement?: string;
}

interface GateInOperation {
  id: string;
  containerNumber: string;
  driverName: string;
  truckNumber: string;
  client: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  notes?: string;
  containerType: string;
  containerSize: string;
  bookingReference?: string;
  weight?: number;
  damageReport?: boolean;
  location?: string;
}

interface PendingOperation {
  id: string;
  containerNumber: string;
  driverName: string;
  truckNumber: string;
  client: string;
  expectedTime: string;
  status: 'pending' | 'in-progress';
  notes?: string;
  containerType: string;
  containerSize: string;
  priority: 'normal' | 'high' | 'urgent';
  assignedTo?: string;
}

export interface GateInFormData {
  containerNumber: string;
  secondContainerNumber: string;
  containerSize: '20ft' | '40ft';
  containerQuantity: 1 | 2;
  status: 'EMPTY' | 'FULL';
  isDamaged: boolean;
  clientId: string;
  clientCode: string;
  clientName: string;
  bookingReference: string;
  driverName: string;
  truckNumber: string;
  transportCompany: string;
  notes: string;
}

export const GateIn: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'pending'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOperation, setSelectedOperation] = useState<GateInOperation | null>(null);
  const [operations, setOperations] = useState<GateInOperation[]>([]);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<GateInFormData>({
    containerNumber: '',
    secondContainerNumber: '',
    containerSize: '20ft',
    containerQuantity: 1,
    status: 'EMPTY',
    isDamaged: false,
    clientId: '',
    clientCode: '',
    clientName: '',
    bookingReference: '',
    driverName: '',
    truckNumber: '',
    transportCompany: '',
    notes: ''
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [autoSaving, setAutoSaving] = useState(false);
  const { user, canViewAllData, getClientFilter } = useAuth();

  // Mock client data
  const mockClients = [
    { id: '1', code: 'MAEU', name: 'Maersk Line' },
    { id: '2', code: 'MSCU', name: 'MSC Mediterranean' },
    { id: '3', code: 'CMDU', name: 'CMA CGM' },
    { id: '4', code: 'SHIP001', name: 'Shipping Solutions Inc' },
    { id: '5', code: 'HLCU', name: 'Hapag-Lloyd' },
    { id: '6', code: 'ONEY', name: 'ONE (Ocean Network Express)' },
    { id: '7', code: 'EGLV', name: 'Evergreen Marine' },
    { id: '8', code: 'YMLU', name: 'Yang Ming Marine' }
  ];

  // Mock data for operations
  const mockOperations: GateInOperation[] = [
    {
      id: '1',
      containerNumber: 'MSKU7834561',
      driverName: 'John Smith',
      truckNumber: 'ABC-123',
      client: 'Maersk Line',
      timestamp: '2024-01-15 14:30:00',
      status: 'completed',
      notes: 'Container inspected, no damage found',
      containerType: '20ft Standard',
      containerSize: '20ft',
      bookingReference: 'MSK-2024-001',
      weight: 18500,
      location: 'A-12-03'
    },
    {
      id: '2',
      containerNumber: 'CSQU3456789',
      driverName: 'Mike Johnson',
      truckNumber: 'XYZ-456',
      client: 'COSCO Shipping',
      timestamp: '2024-01-15 13:45:00',
      status: 'completed',
      notes: 'Minor damage on left side door',
      containerType: '40ft High Cube',
      containerSize: '40ft',
      bookingReference: 'COS-2024-045',
      weight: 25300,
      damageReport: true,
      location: 'B-08-15'
    },
    {
      id: '3',
      containerNumber: 'TEMU9876543',
      driverName: 'Sarah Wilson',
      truckNumber: 'DEF-789',
      client: 'Mediterranean Shipping',
      timestamp: '2024-01-15 12:15:00',
      status: 'failed',
      notes: 'Documentation incomplete - missing customs clearance',
      containerType: '20ft Standard',
      containerSize: '20ft',
      bookingReference: 'MSC-2024-078'
    },
    {
      id: '4',
      containerNumber: 'HLBU2345678',
      driverName: 'David Brown',
      truckNumber: 'GHI-012',
      client: 'Hapag-Lloyd',
      timestamp: '2024-01-15 11:30:00',
      status: 'completed',
      containerType: '40ft Standard',
      containerSize: '40ft',
      weight: 22100,
      location: 'C-15-07'
    },
    {
      id: '5',
      containerNumber: 'SHIP1112228',
      driverName: 'Lisa Garcia',
      truckNumber: 'JKL-345',
      client: 'Shipping Solutions Inc',
      timestamp: '2024-01-15 10:45:00',
      status: 'completed',
      containerType: '20ft Standard',
      containerSize: '20ft',
      weight: 16800,
      location: 'D-05-12'
    },
    {
      id: '6',
      containerNumber: 'MAEU5556664',
      driverName: 'Robert Chen',
      truckNumber: 'MNO-678',
      client: 'Maersk Line',
      timestamp: '2024-01-15 09:20:00',
      status: 'completed',
      containerType: '40ft Reefer',
      containerSize: '40ft',
      weight: 28500,
      location: 'A-18-05',
      notes: 'Temperature monitoring required'
    }
  ];

  // Mock data for pending operations
  const mockPendingOperations: PendingOperation[] = [
    {
      id: 'p1',
      containerNumber: 'OOLU5678901',
      driverName: 'Robert Garcia',
      truckNumber: 'JKL-345',
      client: 'OOCL',
      expectedTime: '2024-01-15 16:00:00',
      status: 'pending',
      notes: 'Reefer container - temperature monitoring required',
      containerType: '40ft Reefer',
      containerSize: '40ft',
      priority: 'high',
      assignedTo: 'Gate Officer 2'
    },
    {
      id: 'p2',
      containerNumber: 'YMLU8901234',
      driverName: 'Lisa Chen',
      truckNumber: 'MNO-678',
      client: 'Yang Ming',
      expectedTime: '2024-01-15 16:30:00',
      status: 'in-progress',
      notes: 'Driver waiting at gate - documentation being verified',
      containerType: '20ft Standard',
      containerSize: '20ft',
      priority: 'urgent',
      assignedTo: 'Gate Officer 1'
    },
    {
      id: 'p3',
      containerNumber: 'EVGU3456789',
      driverName: 'Tom Anderson',
      truckNumber: 'PQR-901',
      client: 'Evergreen',
      expectedTime: '2024-01-15 17:15:00',
      status: 'pending',
      containerType: '40ft High Cube',
      containerSize: '40ft',
      priority: 'normal'
    },
    {
      id: 'p4',
      containerNumber: 'SHIP3334449',
      driverName: 'Maria Rodriguez',
      truckNumber: 'STU-234',
      client: 'Shipping Solutions Inc',
      expectedTime: '2024-01-15 17:45:00',
      status: 'pending',
      containerType: '20ft Standard',
      containerSize: '20ft',
      priority: 'normal',
      notes: 'Standard empty container return'
    },
    {
      id: 'p5',
      containerNumber: 'CMDU7890123',
      driverName: 'Ahmed Hassan',
      truckNumber: 'VWX-567',
      client: 'CMA CGM',
      expectedTime: '2024-01-15 18:00:00',
      status: 'pending',
      containerType: '40ft Standard',
      containerSize: '40ft',
      priority: 'high',
      assignedTo: 'Gate Officer 3',
      notes: 'Priority shipment - expedite processing'
    }
  ];

  useEffect(() => {
    // Filter operations based on user permissions
    const clientFilter = getClientFilter();
    let filteredOps = mockOperations;
    let filteredPending = mockPendingOperations;

    if (clientFilter) {
      filteredOps = mockOperations.filter(op =>
        op.client.toLowerCase().includes(clientFilter.toLowerCase())
      );
      filteredPending = mockPendingOperations.filter(op =>
        op.client.toLowerCase().includes(clientFilter.toLowerCase())
      );
    }

    setOperations(filteredOps);
    setPendingOperations(filteredPending);
  }, [getClientFilter]);

  const filteredOperations = operations.filter(op =>
    op.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPendingOperations = pendingOperations.filter(op =>
    op.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clearSearch = () => {
    setSearchTerm('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'in-progress':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleNewGateIn = () => {
    // Reset form data when opening new gate in
    setFormData({
      containerNumber: '',
      secondContainerNumber: '',
      containerSize: '20ft',
      containerQuantity: 1,
      status: 'EMPTY',
      isDamaged: false,
      clientId: '',
      clientCode: '',
      clientName: '',
      bookingReference: '',
      driverName: '',
      truckNumber: '',
      transportCompany: '',
      notes: ''
    });
    setCurrentStep(1);
    setShowForm(true);
  };

  const handlePendingView = () => {
    setActiveView('pending');
  };

  const handleGateInSubmit = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newOperation: GateInOperation = {
        id: `${Date.now()}`,
        containerNumber: formData.containerNumber,
        driverName: formData.driverName,
        truckNumber: formData.truckNumber,
        client: formData.clientName,
        timestamp: new Date().toLocaleString(),
        status: 'completed',
        containerType: `${formData.containerSize} ${formData.status === 'FULL' ? 'Full' : 'Empty'}`,
        containerSize: formData.containerSize,
        bookingReference: formData.bookingReference,
        location: `Auto-assigned-${Math.floor(Math.random() * 100)}`,
        notes: formData.notes || 'Gate in processed successfully'
      };

      setOperations(prev => [newOperation, ...prev]);
      setShowForm(false);

      alert(`Gate In completed successfully for container ${formData.containerNumber}`);
    } catch (error) {
      alert(`Error processing gate in: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInputChange = (field: keyof GateInFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Trigger auto-save
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
  };

  const handleClientChange = (clientId: string) => {
    const selectedClient = mockClients.find(client => client.id === clientId);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        clientId: selectedClient.id,
        clientCode: selectedClient.code,
        clientName: selectedClient.name
      }));

      // Trigger auto-save
      setAutoSaving(true);
      setTimeout(() => setAutoSaving(false), 1000);

      console.log('Client selected:', selectedClient);
    }
  };

  const handleContainerSizeChange = (size: '20ft' | '40ft') => {
    setFormData(prev => ({
      ...prev,
      containerSize: size,
      // Reset quantity to 1 if switching to 40ft
      containerQuantity: size === '40ft' ? 1 : prev.containerQuantity
    }));
  };

  const handleQuantityChange = (quantity: 1 | 2) => {
    setFormData(prev => ({
      ...prev,
      containerQuantity: quantity,
      // Clear second container number if switching to single
      secondContainerNumber: quantity === 1 ? '' : prev.secondContainerNumber
    }));
  };

  const handleStatusChange = (isFullStatus: boolean) => {
    setFormData(prev => ({
      ...prev,
      status: isFullStatus ? 'FULL' : 'EMPTY',
      // Clear booking reference if switching to empty
      bookingReference: isFullStatus ? prev.bookingReference : ''
    }));
  };

  const handleDamageChange = (isDamaged: boolean) => {
    setFormData(prev => ({
      ...prev,
      isDamaged
    }));
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(2, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.containerNumber !== '' &&
               formData.clientId !== '' &&
               (formData.containerQuantity === 1 || formData.secondContainerNumber !== '') &&
               (formData.status === 'EMPTY' || formData.bookingReference !== '');
      case 2:
        return formData.driverName !== '' &&
               formData.truckNumber !== '' &&
               formData.transportCompany !== '';
      default:
        return true;
    }
  };

  const canPerformGateIn = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';
  const showClientNotice = !canViewAllData() && user?.role === 'client';

  if (!canPerformGateIn) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to perform gate in operations.</p>
      </div>
    );
  }

  // Pending Gate In Operations View Component
  const PendingGateInView: React.FC<{
    operations: PendingOperation[];
    onBack: () => void;
  }> = ({ operations, onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredOperations = operations.filter(op =>
      op.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      op.client.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
            <h2 className="text-2xl font-bold text-gray-900">Pending Gate In Operations</h2>
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10 w-full"
            />
          </div>
        </div>

        {/* Pending Operations Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Operations Awaiting Processing</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Container
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver & Transport
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
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
                {filteredOperations.map((operation) => (
                  <tr key={operation.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{operation.containerNumber}</div>
                      <div className="text-sm text-gray-500">{operation.containerType}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{operation.driverName}</div>
                      <div className="text-sm text-gray-500">{operation.truckNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {canViewAllData() ? operation.client : 'Your Company'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(operation.expectedTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(operation.priority)}`}>
                        {operation.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(operation.status)}`}>
                        {operation.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button className="text-green-600 hover:text-green-900 text-sm font-medium">
                          Process →
                        </button>
                      </div>
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
                {searchTerm ? "No operations match your search criteria." : "All gate in operations have been processed."}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gate In Operations</h1>
          <p className="text-gray-600">Monitor and manage incoming container operations</p>
          {showClientNotice && (
            <div className="flex items-center mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800">
                You are viewing gate in operations for <strong>{user?.company}</strong> only.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePendingView}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Clock className="h-4 w-4" />
            <span>Pending ({pendingOperations.length})</span>
          </button>

          {/* New Gate In Button */}
          <button
            onClick={handleNewGateIn}
            className="btn-success flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Gate In</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Today's Gate Ins</p>
              <p className="text-lg font-semibold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-lg font-semibold text-gray-900">
                {filteredOperations.filter(o => o.status === 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-lg font-semibold text-gray-900">{filteredPendingOperations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="text-lg font-semibold text-gray-900">
                {filteredOperations.filter(o => o.status === 'failed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder={activeView === 'pending'
                ? "Search pending operations..."
                : "Search containers, drivers, clients, or truck numbers..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10 pr-4 w-full"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
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
                {activeView === 'overview' ? filteredOperations.length : filteredPendingOperations.length} result{(activeView === 'overview' ? filteredOperations.length : filteredPendingOperations.length) !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {activeView === 'pending' ? (
        <PendingGateInView
          operations={pendingOperations}
          onBack={() => setActiveView('overview')}
        />
      ) : (
        /* Recent Gate In Operations Table */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Gate In Operations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Container
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver & Transport
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gate In Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
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
                      <div className="text-sm font-medium text-gray-900">{operation.containerNumber}</div>
                      <div className="text-sm text-gray-500">{operation.containerType}</div>
                      {operation.bookingReference && (
                        <div className="text-xs text-blue-600">{operation.bookingReference}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{operation.driverName}</div>
                      <div className="text-sm text-gray-500">{operation.truckNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {canViewAllData() ? operation.client : 'Your Company'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(operation.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(operation.status)}`}>
                          {operation.status}
                        </span>
                        {operation.damageReport && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                            Damage
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {operation.location || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOperations.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No operations found</h3>
              <p className="text-gray-600">
                {searchTerm ? "Try adjusting your search criteria." : "No gate in operations have been recorded yet."}
              </p>
            </div>
          )}
        </div>
      )}

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
          handleSubmit={handleGateInSubmit}
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