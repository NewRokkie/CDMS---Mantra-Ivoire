import React, { useState } from 'react';
import { Plus, Search, Filter, CheckCircle, Clock, AlertTriangle, Truck, Container as ContainerIcon, Package, Calendar, MapPin, FileText, Eye, Edit, ArrowLeft } from 'lucide-react';
import { Container, ReleaseOrder, ReleaseOrderContainer } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { GateOutModal } from './GateOutModal';

interface GateOutFormData {
  releaseOrderId: string;
  selectedContainers: string[]; // IDs of containers to release
  transportCompany: string;
  driverName: string;
  vehicleNumber: string;
  gateOutDate: string;
  gateOutTime: string;
  notes: string;
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
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Gate Out processed:', data);
      alert(`Gate Out processed successfully for ${data.selectedContainerDetails?.length || 0} containers`);
      
      setShowGateOutModal(false);
    } catch (error) {
      alert(`Error processing gate out: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

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
            <span>Pending</span>
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