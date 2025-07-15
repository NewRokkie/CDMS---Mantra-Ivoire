import React, { useState } from 'react';
import { Search, Filter, CheckCircle, Clock, AlertCircle, Truck, FileText, Eye, Package, Calendar, Plus } from 'lucide-react';
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
      order.containers.some(c => c.containerNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      order.driverName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredReleaseOrders = getFilteredReleaseOrders();

  const handleSelectReleaseOrder = (order: ReleaseOrder) => {
    setSelectedReleaseOrder(order);
    setFormData({
      releaseOrderId: order.id,
      selectedContainers: [], // Start with no containers selected
      transportCompany: order.transportCompany,
    // This function is for Gate In, not Gate Out
    // Gate Out submission is handled by the modal
    console.log('Gate Out submission should be handled by GateOutModal');
  };

  const showClientNotice = !canViewAllData() && user?.role === 'client';

  if (!canPerformGateOut) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to perform gate out operations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gate Out Management</h2>
          {showClientNotice && (
            <div className="flex items-center mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800">
                You are viewing gate out operations for <strong>{user?.company}</strong> only.
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveView('pending')}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
          >
            <Clock className="h-4 w-4" />
            <span>Pending</span>
          </button>
          <button
            onClick={() => setShowGateOutModal(true)}
            className="btn-success flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Gate Out</span>
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
              <p className="text-sm font-medium text-gray-500">Today's Gate Outs</p>
              <p className="text-lg font-semibold text-gray-900">8</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Validated Orders</p>
              <p className="text-lg font-semibold text-gray-900">{filteredReleaseOrders.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Ready Containers</p>
              <p className="text-lg font-semibold text-gray-900">
                {filteredReleaseOrders.reduce((sum, order) => 
                  sum + order.containers.filter(c => c.status === 'ready').length, 0
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Average Processing Time</p>
              <p className="text-lg font-semibold text-gray-900">6 min</p>
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
              placeholder="Search release orders, containers, drivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Validated Release Orders */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Validated Release Orders</h3>
            <p className="text-sm text-gray-600">Select a release order to process gate out</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredReleaseOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => handleSelectReleaseOrder(order)}
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                  selectedReleaseOrder?.id === order.id
                    ? 'bg-blue-50 border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{order.id}</div>
                    <div className="text-sm text-gray-600">
                      {canViewAllData() ? order.clientName : 'Your Company'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Package className="h-4 w-4 mr-1" />
                      {order.containers.length} containers
                    </span>
                    <span className="flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                      {order.containers.filter(c => c.status === 'ready').length} ready
                    </span>
                  </div>
                  {order.estimatedReleaseDate && (
                    <span className="flex items-center text-blue-600">
                      <Calendar className="h-3 w-3 mr-1" />
                      {order.estimatedReleaseDate.toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {filteredReleaseOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No validated release orders found</p>
                <p className="text-sm">Release orders must be validated before gate out</p>
              </div>
            )}
          </div>
        </div>

        {/* Gate Out Processing */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedReleaseOrder ? `Process Gate Out - ${selectedReleaseOrder.id}` : 'Select Release Order'}
            </h3>
          </div>
          
          {selectedReleaseOrder ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Release Order Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Release Order Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Client:</span>
                    <span className="ml-2 font-medium">{canViewAllData() ? selectedReleaseOrder.clientName : 'Your Company'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Driver:</span>
                    <span className="ml-2 font-medium">{selectedReleaseOrder.driverName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Vehicle:</span>
                    <span className="ml-2 font-medium">{selectedReleaseOrder.vehicleNumber}</span>
                  </div>
                </div>
              </div>

              {/* Container Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">
                    Select Containers for Gate Out ({formData.selectedContainers.length} selected)
                  </h4>
                  <button
                    type="button"
                    onClick={handleSelectAllContainers}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {formData.selectedContainers.length === selectedReleaseOrder.containers.filter(c => c.status === 'ready').length 
                      ? 'Deselect All' : 'Select All Ready'}
                  </button>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedReleaseOrder.containers.map((container) => (
                    <div
                      key={container.id}
                      className={`p-3 border rounded-lg ${
                        container.status === 'ready' 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={formData.selectedContainers.includes(container.id)}
                            onChange={() => handleContainerSelection(container.id)}
                            disabled={container.status !== 'ready'}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{container.containerNumber}</div>
                            <div className="text-sm text-gray-600">
                              {container.containerType} • {container.containerSize} • {container.currentLocation}
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          container.status === 'ready' ? 'bg-green-100 text-green-800' :
                          container.status === 'released' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {container.status}
                        </span>
                      </div>
                      {container.notes && (
                        <div className="mt-2 text-xs text-gray-500">
                          Note: {container.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Gate Out Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gate Out Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes for gate out process..."
                />
              </div>

              {/* Validation Messages */}
              {formData.selectedContainers.length === 0 && (
                <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                  <p className="text-sm text-yellow-800">
                    Please select at least one container to process gate out.
                  </p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setSelectedReleaseOrder(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || formData.selectedContainers.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : `Process Gate Out (${formData.selectedContainers.length})`}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Select a validated release order to begin gate out process</p>
              <p className="text-sm">You can choose specific containers from the release order</p>
            </div>
          )}
        </div>
      </div>

      {/* Gate Out Modal */}
      {showGateOutModal && (
        <GateOutModal
          showModal={showGateOutModal}
          setShowModal={setShowGateOutModal}
          availableReleaseOrders={filteredReleaseOrders}
          onSubmit={handleSubmit}
          isProcessing={isProcessing}
        />
      )}

      {/* Recent Gate Outs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Gate Outs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
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
                  Release Order
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockRecentGateOuts.map((gateOut) => (
                <tr key={gateOut.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {gateOut.containerNumbers.join(', ')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {gateOut.containerNumbers.length} container{gateOut.containerNumbers.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {canViewAllData() ? gateOut.clientName : 'Your Company'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {gateOut.gateOutTime.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {gateOut.releaseOrderId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </span>
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