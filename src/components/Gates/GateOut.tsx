import React, { useState } from 'react';
import { Plus, Search, Filter, CheckCircle, Clock, AlertTriangle, Truck, Container as ContainerIcon, Package, Calendar, MapPin, FileText, Eye, Edit, ArrowLeft, CheckSquare, X, Loader } from 'lucide-react';
import { Container, ReleaseOrder, ReleaseOrderContainer } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { GateOutModal } from './GateOutModal';

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
}

// Mock data for validated release orders ready for gate out
const mockValidatedReleaseOrders: ReleaseOrder[] = [
  {
    id: 'RO-2025-001',
    clientId: '1',
    clientCode: 'MAEU',
    clientName: 'Maersk Line',
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
    status: 'validated',
    createdBy: 'Jane Operator',
    validatedBy: 'Mike Supervisor',
    createdAt: new Date('2025-01-11T09:00:00'),
    validatedAt: new Date('2025-01-11T10:30:00'),
    estimatedReleaseDate: new Date('2025-01-12T14:00:00'),
    notes: 'Handle with care'
  },
  {
    id: 'RO-2025-005',
    clientId: '4',
    clientCode: 'SHIP001',
    clientName: 'Shipping Solutions Inc',
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
        containerSize: '20ft',
        currentLocation: 'Block D-01',
        status: 'ready',
        addedAt: new Date('2025-01-10T16:10:00')
      }
    ],
    transportCompany: 'Express Delivery',
    driverName: 'Lisa Green',
    vehicleNumber: 'JKL-345',
    status: 'validated',
    createdBy: 'Sarah Client',
    validatedBy: 'Mike Supervisor',
    createdAt: new Date('2025-01-10T16:00:00'),
    validatedAt: new Date('2025-01-11T08:15:00'),
    estimatedReleaseDate: new Date('2025-01-12T10:00:00'),
    notes: 'Multiple containers - partial release allowed'
  }
];

// Mock data for recent gate outs
const mockRecentGateOuts = [
  {
    id: '1',
    containerNumbers: ['GESU-456789-1'],
    clientName: 'CMA CGM',
    gateOutTime: new Date('2025-01-11T13:45:00'),
    releaseOrderId: 'RO-2025-003',
    status: 'completed'
  },
  {
    id: '2',
    containerNumbers: ['TCLU-987654-3'],
    clientName: 'MSC',
    gateOutTime: new Date('2025-01-11T11:30:00'),
    releaseOrderId: 'RO-2025-002',
    status: 'completed'
  }
];

export const GateOut: React.FC = () => {
  const [selectedReleaseOrder, setSelectedReleaseOrder] = useState<ReleaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingOperations, setPendingOperations] = useState<PendingGateOut[]>([]);
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

  const handleGateOutSubmit = async (data: any) => {
    setIsProcessing(true);
    try {
      // Create pending operation instead of completing immediately
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const pendingOperation: PendingGateOut = {
        id: `PGO-${Date.now()}`,
        releaseOrderId: data.selectedReleaseOrderId,
        releaseOrder: data.releaseOrder,
        selectedContainers: data.selectedContainerDetails || [],
        createdAt: new Date(),
        createdBy: user?.name || 'Unknown',
        status: 'pending',
        notes: data.notes
      };
      
      setPendingOperations(prev => [pendingOperation, ...prev]);
      
      console.log('Gate Out moved to pending:', pendingOperation);
      alert(`Gate Out operation created and moved to pending for ${data.selectedContainerDetails?.length || 0} containers`);
      
      setShowGateOutModal(false);
    } catch (error) {
      alert(`Error processing gate out: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompletePendingOperation = (operationId: string) => {
    setPendingOperations(prev => prev.filter(op => op.id !== operationId));
    alert('Gate Out operation completed successfully!');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gate Out Management</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePendingView}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
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
              placeholder="Search release orders..."
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
                    <span className="font-medium text-gray-900">{order.id}</span>
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
  const { user, canViewAllData } = useAuth();

  const filteredOperations = operations.filter(op =>
    op.releaseOrderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.releaseOrder.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.selectedContainers.some(c => c.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
                  Release Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Containers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
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
                    <div className="text-sm font-medium text-gray-900">{operation.releaseOrderId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {canViewAllData() ? operation.releaseOrder.clientName : 'Your Company'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {operation.selectedContainers.length} container{operation.selectedContainers.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      {operation.selectedContainers.map(c => c.containerNumber).join(', ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.createdBy}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-blue-600 hover:text-blue-900 text-sm font-medium">
                      Complete Gate Out →
                    </button>
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
              {searchTerm ? "No operations match your search criteria." : "All gate out operations have been completed."}
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

// Gate Out Completion Modal Component
const GateOutCompletionModal: React.FC<{
  operation: PendingGateOut;
  onClose: () => void;
  onComplete: (operationId: string) => void;
}> = ({ operation, onClose, onComplete }) => {
  const [containerNumber, setContainerNumber] = useState('');
  const [confirmContainerNumber, setConfirmContainerNumber] = useState('');
  const [gateOutDate, setGateOutDate] = useState(new Date().toISOString().split('T')[0]);
  const [gateOutTime, setGateOutTime] = useState(new Date().toTimeString().slice(0, 5));
  const [isProcessing, setIsProcessing] = useState(false);
  const { canViewAllData } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (containerNumber !== confirmContainerNumber) {
      alert('Container numbers do not match. Please verify and try again.');
      return;
    }

    const isValidContainer = operation.selectedContainers.some(c => 
      c.containerNumber === containerNumber
    );

    if (!isValidContainer) {
      alert('Container number does not match any container in this release order.');
      return;
    }

    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      onComplete(operation.id);
    } catch (error) {
      alert(`Error completing gate out: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-strong max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Complete Gate Out</h3>
              <p className="text-sm text-gray-600">{operation.releaseOrderId}</p>
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
                  <span className="text-gray-600">Release Order:</span>
                  <span className="font-medium">{operation.releaseOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Client:</span>
                  <span className="font-medium">
                    {canViewAllData() ? operation.releaseOrder.clientName : 'Your Company'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Containers:</span>
                  <span className="font-medium">{operation.selectedContainers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{operation.createdAt.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Container Verification */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Container Verification</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter Container Number *
                </label>
                <input
                  type="text"
                  required
                  value={containerNumber}
                  onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                  className="form-input w-full"
                  placeholder="e.g., MSKU1234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Container Number *
                </label>
                <input
                  type="text"
                  required
                  value={confirmContainerNumber}
                  onChange={(e) => setConfirmContainerNumber(e.target.value.toUpperCase())}
                  className="form-input w-full"
                  placeholder="Re-enter container number"
                />
              </div>

              {/* Available Containers */}
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900 mb-2">Available Containers:</p>
                <div className="space-y-1">
                  {operation.selectedContainers.map((container) => (
                    <div key={container.id} className="text-sm text-blue-800">
                      • {container.containerNumber} ({container.containerType} - {container.containerSize})
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gate Out Date & Time */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Gate Out Date & Time</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gate Out Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={gateOutDate}
                    onChange={(e) => setGateOutDate(e.target.value)}
                    className="form-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gate Out Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={gateOutTime}
                    onChange={(e) => setGateOutTime(e.target.value)}
                    className="form-input w-full"
                  />
                </div>
              </div>
            </div>

            {/* Validation Messages */}
            {containerNumber && confirmContainerNumber && containerNumber !== confirmContainerNumber && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-800">Container numbers do not match.</p>
              </div>
            )}

            {containerNumber && confirmContainerNumber && containerNumber === confirmContainerNumber && (
              <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckSquare className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-sm text-green-800">Container numbers match. Ready to process.</p>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isProcessing || !containerNumber || !confirmContainerNumber || containerNumber !== confirmContainerNumber}
              className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
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