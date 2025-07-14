import React, { useState, useEffect } from 'react';
import { Search, Plus, Clock, CheckCircle, AlertTriangle, Truck, User, Package, MapPin, Calendar, FileText, Save, Send, Eye, Edit, Trash2, Filter, X } from 'lucide-react';

interface Container {
  id: string;
  number: string;
  size: '20ft' | '40ft';
  type: 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
  status: 'FULL' | 'EMPTY';
  isDamaged: boolean;
  bookingReference?: string;
}

interface Transport {
  truckNumber: string;
  driverName: string;
}

interface GateInOperation {
  id: string;
  container: Container;
  transport: Transport;
  client: string;
  location?: string;
  status: 'draft' | 'pending' | 'completed';
  gateInTime: string;
  gateOutTime?: string;
  arrivalTime?: string;
  departureTime?: string;
  createdAt: string;
}

interface Client {
  id: string;
  name: string;
  code: string;
  contact: string;
}

interface Location {
  id: string;
  name: string;
  section: string;
  capacity: number;
  available: number;
  acceptedSizes: string[];
}

const GateIn: React.FC = () => {
  const [operations, setOperations] = useState<GateInOperation[]>([]);
  const [showNewGateInModal, setShowNewGateInModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<GateInOperation | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'pending' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data
  const clients: Client[] = [
    { id: '1', name: 'Maersk Line', code: 'MAEU', contact: 'John Smith' },
    { id: '2', name: 'MSC Mediterranean', code: 'MSCU', contact: 'Maria Garcia' },
    { id: '3', name: 'CMA CGM', code: 'CMAU', contact: 'Pierre Dubois' },
  ];

  const locations: Location[] = [
    { id: 'S001', name: 'Stack S001', section: 'Top', capacity: 20, available: 15, acceptedSizes: ['20ft'] },
    { id: 'S003', name: 'Stack S003', section: 'Top', capacity: 10, available: 8, acceptedSizes: ['40ft'] },
    { id: 'S031', name: 'Stack S031', section: 'Middle', capacity: 25, available: 20, acceptedSizes: ['20ft'] },
    { id: 'S073', name: 'Stack S073', section: 'Bottom', capacity: 15, available: 12, acceptedSizes: ['20ft', '40ft'] },
    { id: 'VDMG-001', name: 'Virtual Damage Stack', section: 'Virtual', capacity: 999, available: 999, acceptedSizes: ['20ft', '40ft'] },
  ];

  // Load operations from localStorage on component mount
  useEffect(() => {
    const savedOperations = localStorage.getItem('gateInOperations');
    if (savedOperations) {
      setOperations(JSON.parse(savedOperations));
    }
  }, []);

  // Save operations to localStorage whenever operations change
  useEffect(() => {
    localStorage.setItem('gateInOperations', JSON.stringify(operations));
  }, [operations]);

  const filteredOperations = operations.filter(op => {
    const matchesStatus = filterStatus === 'all' || op.status === filterStatus;
    const matchesSearch = op.container.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         op.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         op.transport.truckNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: FileText },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleNewGateIn = (operationData: Partial<GateInOperation>) => {
    const newOperation: GateInOperation = {
      id: `GI-${Date.now()}`,
      container: operationData.container!,
      transport: operationData.transport!,
      client: operationData.client!,
      location: operationData.container?.isDamaged ? 'VDMG-001' : operationData.location,
      status: 'pending',
      gateInTime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setOperations(prev => [...prev, newOperation]);
    setShowNewGateInModal(false);
  };

  const handleSaveDraft = (operationData: Partial<GateInOperation>) => {
    const draftOperation: GateInOperation = {
      id: `DRAFT-${Date.now()}`,
      container: operationData.container!,
      transport: operationData.transport!,
      client: operationData.client!,
      status: 'draft',
      gateInTime: '',
      createdAt: new Date().toISOString(),
    };

    setOperations(prev => [...prev, draftOperation]);
    setShowNewGateInModal(false);
  };

  const handleCompletePending = (operationId: string, locationId: string) => {
    setOperations(prev => prev.map(op => 
      op.id === operationId 
        ? { 
            ...op, 
            status: 'completed' as const,
            location: locationId,
            arrivalTime: new Date().toISOString(),
            departureTime: new Date().toISOString()
          }
        : op
    ));
    setShowPendingModal(false);
    setSelectedOperation(null);
  };

  const handleDeleteOperation = (operationId: string) => {
    setOperations(prev => prev.filter(op => op.id !== operationId));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gate In Operations</h1>
            <p className="text-gray-600 mt-1">Manage container entry operations</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowPendingModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Clock className="w-4 h-4 mr-2" />
              Pending ({operations.filter(op => op.status === 'pending').length})
            </button>
            <button
              onClick={() => setShowNewGateInModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Gate In
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search containers, clients, trucks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Operations Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transport
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gate In Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOperations.map((operation) => (
                <tr key={operation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {operation.container.number}
                        </div>
                        <div className="text-sm text-gray-500">
                          {operation.container.size} • {operation.container.type} • {operation.container.status}
                          {operation.container.isDamaged && (
                            <span className="ml-2 inline-flex items-center">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.client}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Truck className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm text-gray-900">{operation.transport.truckNumber}</div>
                        <div className="text-sm text-gray-500">{operation.transport.driverName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {operation.location || 'Not assigned'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(operation.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {operation.gateInTime ? new Date(operation.gateInTime).toLocaleString() : 'Not set'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedOperation(operation)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {operation.status === 'draft' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedOperation(operation);
                              setShowNewGateInModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOperation(operation.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {operation.status === 'pending' && (
                        <button
                          onClick={() => {
                            setSelectedOperation(operation);
                            setShowPendingModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredOperations.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No operations found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new gate in operation.'
              }
            </p>
          </div>
        )}
      </div>

      {/* New Gate In Modal */}
      {showNewGateInModal && (
        <NewGateInModal
          isOpen={showNewGateInModal}
          onClose={() => setShowNewGateInModal(false)}
          onSubmit={handleNewGateIn}
          onSaveDraft={handleSaveDraft}
          clients={clients}
          locations={locations}
          editOperation={selectedOperation}
        />
      )}

      {/* Pending Operations Modal */}
      {showPendingModal && (
        <PendingOperationsModal
          isOpen={showPendingModal}
          onClose={() => setShowPendingModal(false)}
          operations={operations.filter(op => op.status === 'pending')}
          locations={locations}
          onComplete={handleCompletePending}
          selectedOperation={selectedOperation}
        />
      )}
    </div>
  );
};

// New Gate In Modal Component
interface NewGateInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<GateInOperation>) => void;
  onSaveDraft: (data: Partial<GateInOperation>) => void;
  clients: Client[];
  locations: Location[];
  editOperation?: GateInOperation | null;
}

const NewGateInModal: React.FC<NewGateInModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onSaveDraft,
  clients,
  locations,
  editOperation
}) => {
  const [step, setStep] = useState(1);
  const [container, setContainer] = useState<Container>({
    id: '',
    number: '',
    size: '20ft',
    type: 'dry',
    status: 'EMPTY',
    isDamaged: false,
    bookingReference: ''
  });
  const [transport, setTransport] = useState<Transport>({
    truckNumber: '',
    driverName: ''
  });
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editOperation) {
      setContainer(editOperation.container);
      setTransport(editOperation.transport);
      setSelectedClient(editOperation.client);
      setSelectedLocation(editOperation.location || '');
    }
  }, [editOperation]);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!container.number.match(/^[A-Z]{4}\d{7}$/)) {
      newErrors.containerNumber = 'Container number must be 4 letters followed by 7 digits';
    }
    
    if (container.status === 'FULL' && !container.bookingReference) {
      newErrors.bookingReference = 'Booking reference is required for FULL containers';
    }
    
    if (!selectedClient) {
      newErrors.client = 'Client selection is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    if (!transport.truckNumber) {
      newErrors.truckNumber = 'Truck number is required';
    }
    
    if (!transport.driverName) {
      newErrors.driverName = 'Driver name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = () => {
    if (validateStep2()) {
      const operationData = {
        container,
        transport,
        client: selectedClient,
        location: container.isDamaged ? 'VDMG-001' : selectedLocation
      };
      onSubmit(operationData);
    }
  };

  const handleSaveDraft = () => {
    const operationData = {
      container,
      transport,
      client: selectedClient,
      location: selectedLocation
    };
    onSaveDraft(operationData);
  };

  const availableLocations = locations.filter(loc => 
    loc.acceptedSizes.includes(container.size) && loc.available > 0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {editOperation ? 'Edit Gate In Operation' : 'New Gate In Operation'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Step {step} of 2: {step === 1 ? 'Container Information' : 'Transport Details & Summary'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-4 ${
              step >= 2 ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              {/* Container Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Container Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Container Number *
                    </label>
                    <input
                      type="text"
                      value={container.number}
                      onChange={(e) => setContainer(prev => ({ ...prev, number: e.target.value.toUpperCase() }))}
                      placeholder="MSKU1234567"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.containerNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.containerNumber && (
                      <p className="text-red-500 text-sm mt-1">{errors.containerNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Container Size *
                    </label>
                    <select
                      value={container.size}
                      onChange={(e) => setContainer(prev => ({ ...prev, size: e.target.value as '20ft' | '40ft' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="20ft">20ft</option>
                      <option value="40ft">40ft</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Container Type *
                    </label>
                    <select
                      value={container.type}
                      onChange={(e) => setContainer(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="dry">Dry Container</option>
                      <option value="reefer">Reefer</option>
                      <option value="tank">Tank</option>
                      <option value="flat_rack">Flat Rack</option>
                      <option value="open_top">Open Top</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client *
                    </label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.client ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.name}>
                          {client.name} ({client.code})
                        </option>
                      ))}
                    </select>
                    {errors.client && (
                      <p className="text-red-500 text-sm mt-1">{errors.client}</p>
                    )}
                  </div>
                </div>

                {/* Status Switches */}
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Container Status</h4>
                      <p className="text-sm text-gray-500">Select if container is full or empty</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="status"
                          value="EMPTY"
                          checked={container.status === 'EMPTY'}
                          onChange={(e) => setContainer(prev => ({ ...prev, status: e.target.value as 'FULL' | 'EMPTY' }))}
                          className="mr-2"
                        />
                        Empty
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="status"
                          value="FULL"
                          checked={container.status === 'FULL'}
                          onChange={(e) => setContainer(prev => ({ ...prev, status: e.target.value as 'FULL' | 'EMPTY' }))}
                          className="mr-2"
                        />
                        Full
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Damage Assessment</h4>
                      <p className="text-sm text-gray-500">Mark if container has any damage</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={container.isDamaged}
                        onChange={(e) => setContainer(prev => ({ ...prev, isDamaged: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                  </div>

                  {container.isDamaged && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                        <span className="text-sm text-red-700">
                          Damaged container will be automatically assigned to Virtual Damage Stack (VDMG-001)
                        </span>
                      </div>
                    </div>
                  )}

                  {container.status === 'FULL' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Booking Reference *
                      </label>
                      <input
                        type="text"
                        value={container.bookingReference}
                        onChange={(e) => setContainer(prev => ({ ...prev, bookingReference: e.target.value }))}
                        placeholder="Enter booking reference"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.bookingReference ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.bookingReference && (
                        <p className="text-red-500 text-sm mt-1">{errors.bookingReference}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Transport Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Transport Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Truck Number *
                    </label>
                    <input
                      type="text"
                      value={transport.truckNumber}
                      onChange={(e) => setTransport(prev => ({ ...prev, truckNumber: e.target.value }))}
                      placeholder="ABC-1234"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.truckNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.truckNumber && (
                      <p className="text-red-500 text-sm mt-1">{errors.truckNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Driver Name *
                    </label>
                    <input
                      type="text"
                      value={transport.driverName}
                      onChange={(e) => setTransport(prev => ({ ...prev, driverName: e.target.value }))}
                      placeholder="John Doe"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.driverName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.driverName && (
                      <p className="text-red-500 text-sm mt-1">{errors.driverName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Entry Summary */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Entry Summary</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Container:</span>
                    <span className="text-sm font-medium">{container.number} ({container.size})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Type:</span>
                    <span className="text-sm font-medium">{container.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className="text-sm font-medium">{container.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Client:</span>
                    <span className="text-sm font-medium">{selectedClient}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Truck:</span>
                    <span className="text-sm font-medium">{transport.truckNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Driver:</span>
                    <span className="text-sm font-medium">{transport.driverName}</span>
                  </div>
                  {container.isDamaged && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Location:</span>
                      <span className="text-sm font-medium text-red-600">VDMG-001 (Damage Stack)</span>
                    </div>
                  )}
                  {container.bookingReference && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Booking Ref:</span>
                      <span className="text-sm font-medium">{container.bookingReference}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="flex space-x-3">
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleSaveDraft}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Save className="w-4 h-4 mr-2" />
              Save as Draft
            </button>
            
            {step === 1 ? (
              <button
                onClick={handleNext}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Pending Operations Modal Component
interface PendingOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  operations: GateInOperation[];
  locations: Location[];
  onComplete: (operationId: string, locationId: string) => void;
  selectedOperation: GateInOperation | null;
}

const PendingOperationsModal: React.FC<PendingOperationsModalProps> = ({
  isOpen,
  onClose,
  operations,
  locations,
  onComplete,
  selectedOperation
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOperations = operations.filter(op =>
    op.container.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableLocations = selectedOperation 
    ? locations.filter(loc => 
        loc.acceptedSizes.includes(selectedOperation.container.size) && 
        loc.available > 0
      )
    : [];

  const handleComplete = () => {
    if (selectedOperation && selectedLocationId) {
      onComplete(selectedOperation.id, selectedLocationId);
      setSelectedLocationId('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Pending Operations</h2>
            <p className="text-sm text-gray-500 mt-1">
              Complete location assignment for pending gate-in operations
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!selectedOperation ? (
            <>
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search pending operations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  />
                </div>
              </div>

              {/* Pending Operations List */}
              <div className="space-y-3">
                {filteredOperations.map((operation) => (
                  <div
                    key={operation.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedLocationId('')}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Package className="w-8 h-8 text-gray-400" />
                        <div>
                          <h3 className="font-medium text-gray-900">{operation.container.number}</h3>
                          <p className="text-sm text-gray-500">
                            {operation.container.size} • {operation.container.type} • {operation.container.status}
                          </p>
                          <p className="text-sm text-gray-500">
                            Client: {operation.client} • Truck: {operation.transport.truckNumber}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Set selected operation logic here
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                      >
                        Assign Location
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredOperations.length === 0 && (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No pending operations</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    All gate-in operations have been completed.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              {/* Operation Summary */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Operation Summary</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Container:</span>
                      <p className="font-medium">{selectedOperation.container.number}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Size/Type:</span>
                      <p className="font-medium">{selectedOperation.container.size} • {selectedOperation.container.type}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Client:</span>
                      <p className="font-medium">{selectedOperation.client}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Truck:</span>
                      <p className="font-medium">{selectedOperation.transport.truckNumber}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Assignment */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Location Assignment</h3>
                <div className="space-y-3">
                  {availableLocations.map((location) => (
                    <label
                      key={location.id}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                        selectedLocationId === location.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="location"
                        value={location.id}
                        checked={selectedLocationId === location.id}
                        onChange={(e) => setSelectedLocationId(e.target.value)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{location.name}</h4>
                          <span className="text-sm text-gray-500">
                            {location.available}/{location.capacity} available
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{location.section} Section</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Timestamps</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Arrival Time
                    </label>
                    <input
                      type="datetime-local"
                      defaultValue={new Date().toISOString().slice(0, 16)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Departure Time
                    </label>
                    <input
                      type="datetime-local"
                      defaultValue={new Date().toISOString().slice(0, 16)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={() => selectedOperation ? setSelectedLocationId('') : onClose()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {selectedOperation ? 'Back' : 'Close'}
          </button>
          
          {selectedOperation && (
            <button
              onClick={handleComplete}
              disabled={!selectedLocationId}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Operation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GateIn;