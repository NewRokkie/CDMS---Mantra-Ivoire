import React, { useState } from 'react';
import { ReleaseOrder, Container } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { ReleaseOrderForm } from './ReleaseOrderForm';
import { MobileReleaseOrderHeader } from './MobileReleaseOrderHeader';
import { MobileReleaseOrderStats } from './MobileReleaseOrderStats';
import { MobileReleaseOrderTable } from './MobileReleaseOrderTable';
import { Search, X, Eye, Package, Calendar, User, FileText, Clock, AlertTriangle } from 'lucide-react';

// Mock containers available for release
const mockAvailableContainers: Container[] = [
  {
    id: '1',
    number: 'MSKU-123456-7',
    type: 'standard',
    size: '40ft',
    status: 'in_depot',
    location: 'Block A-12',
    gateInDate: new Date('2025-01-10T08:30:00'),
    client: 'Maersk Line',
    clientCode: 'MAEU',
    createdBy: 'System'
  },
  {
    id: '4',
    number: 'SHIP-111222-8',
    type: 'standard',
    size: '20ft',
    status: 'in_depot',
    location: 'Block B-05',
    gateInDate: new Date('2025-01-11T09:15:00'),
    client: 'Shipping Solutions Inc',
    clientCode: 'SHIP001',
    createdBy: 'System'
  },
  {
    id: '6',
    number: 'MAEU-555666-4',
    type: 'reefer',
    size: '40ft',
    status: 'in_depot',
    location: 'Block A-08',
    gateInDate: new Date('2025-01-09T11:20:00'),
    client: 'Maersk Line',
    clientCode: 'MAEU',
    createdBy: 'System'
  }
];

// Enhanced mock data with multiple containers per release order
const mockBookingReferences: ReleaseOrder[] = [
  {
    id: 'RO-2025-001',
    bookingNumber: 'BK-MAEU-2025-001',
    clientId: '1',
    clientCode: 'MAEU',
    clientName: 'Maersk Line',
    bookingType: 'EXPORT',
    containerQuantities: {
      size20ft: 2,
      size40ft: 3
    },
    totalContainers: 5,
    remainingContainers: 5,
    maxQuantityThreshold: 10,
    requiresDetailedBreakdown: false,
    status: 'pending',
    createdBy: 'Jane Operator',
    validatedBy: 'Mike Supervisor',
    createdAt: new Date('2025-01-11T09:00:00'),
    validatedAt: new Date('2025-01-11T10:30:00'),
    estimatedReleaseDate: new Date('2025-01-12T14:00:00'),
    notes: 'Priority booking - handle with care'
  },
  {
    id: 'RO-2025-002',
    bookingNumber: 'BK-MSCU-2025-002',
    clientId: '2',
    clientCode: 'MSCU',
    clientName: 'MSC',
    bookingType: 'IMPORT',
    containerQuantities: {
      size20ft: 1,
      size40ft: 0
    },
    totalContainers: 1,
    remainingContainers: 0,
    maxQuantityThreshold: 10,
    requiresDetailedBreakdown: false,
    containers: [
      {
        id: 'roc-3',
        containerId: '2',
        containerNumber: 'TCLU-987654-3',
        containerType: 'reefer',
        containerSize: '20ft',
        currentLocation: 'Block B-03',
        status: 'released',
        addedAt: new Date('2025-01-10T14:30:00'),
        releasedAt: new Date('2025-01-11T10:00:00')
      }
    ],
    transportCompany: 'Global Logistics',
    driverName: 'Mike Johnson',
    vehicleNumber: 'XYZ-456',
    status: 'completed',
    createdBy: 'Jane Operator',
    validatedBy: 'Mike Supervisor',
    createdAt: new Date('2025-01-10T14:30:00'),
    validatedAt: new Date('2025-01-10T15:45:00'),
    completedAt: new Date('2025-01-11T10:00:00'),
    notes: 'Standard release - completed successfully'
  },
  {
    id: 'RO-2025-003',
    bookingNumber: 'BK-SHIP-2025-003',
    clientId: '4',
    clientCode: 'SHIP001',
    clientName: 'Shipping Solutions Inc',
    bookingType: 'EXPORT',
    containerQuantities: {
      size20ft: 1,
      size40ft: 1
    },
    totalContainers: 2,
    remainingContainers: 1,
    maxQuantityThreshold: 10,
    requiresDetailedBreakdown: false,
    containers: [
      {
        id: 'roc-4',
        containerId: '4',
        containerNumber: 'SHIP-111222-8',
        containerType: 'standard',
        containerSize: '20ft',
        currentLocation: 'Block B-05',
        status: 'pending',
        addedAt: new Date('2025-01-11T11:30:00')
      },
      {
        id: 'roc-5',
        containerId: '5',
        containerNumber: 'SHIP-333444-9',
        containerType: 'reefer',
        containerSize: '40ft',
        currentLocation: 'Workshop 2',
        status: 'pending',
        addedAt: new Date('2025-01-11T11:35:00'),
        notes: 'Waiting for maintenance completion'
      }
    ],
    transportCompany: 'Local Transport Co',
    driverName: 'David Brown',
    vehicleNumber: 'GHI-012',
    status: 'in_process',
    createdBy: 'Sarah Client',
    createdAt: new Date('2025-01-11T11:30:00'),
    estimatedReleaseDate: new Date('2025-01-13T09:00:00'),
    notes: 'Client requested release - pending validation'
  },
  {
    id: 'RO-2025-004',
    bookingNumber: 'BK-CMA-2025-004',
    clientId: '2',
    clientCode: 'CMA',
    clientName: 'CMA CGM',
    bookingType: 'IMPORT',
    containerQuantities: {
      size20ft: 1,
      size40ft: 0
    },
    totalContainers: 1,
    remainingContainers: 1,
    maxQuantityThreshold: 10,
    requiresDetailedBreakdown: false,
    status: 'pending',
    createdBy: 'Sarah Client',
    validatedBy: 'Mike Supervisor',
    createdAt: new Date('2025-01-11T11:00:00'),
    validatedAt: new Date('2025-01-11T12:30:00'),
    estimatedReleaseDate: new Date('2025-01-12T16:00:00'),
    notes: 'Single container booking - urgent processing required'
  },
  {
    id: 'RO-2025-005',
    bookingNumber: 'BK-SHIP-2025-005',
    clientId: '4',
    clientCode: 'SHIP001',
    clientName: 'Shipping Solutions Inc',
    bookingType: 'EXPORT',
    containerQuantities: {
      size20ft: 8,
      size40ft: 4
    },
    totalContainers: 12,
    remainingContainers: 12,
    maxQuantityThreshold: 10,
    requiresDetailedBreakdown: true,
    status: 'pending',
    createdBy: 'Sarah Client',
    validatedBy: 'Mike Supervisor',
    createdAt: new Date('2025-01-10T16:00:00'),
    validatedAt: new Date('2025-01-11T08:15:00'),
    estimatedReleaseDate: new Date('2025-01-12T10:00:00'),
    notes: 'Large booking - requires detailed breakdown processing'
  },
  {
    id: 'RO-2025-006',
    bookingNumber: 'BK-CMDU-2025-006',
    clientId: '3',
    clientCode: 'CMDU',
    clientName: 'CMA CGM',
    bookingType: 'IMPORT',
    containerQuantities: {
      size20ft: 0,
      size40ft: 1
    },
    totalContainers: 1,
    remainingContainers: 1,
    maxQuantityThreshold: 10,
    requiresDetailedBreakdown: false,
    containers: [
      {
        id: 'roc-10',
        containerId: '11',
        containerNumber: 'CMDU-123789-9',
        containerType: 'standard',
        containerSize: '40ft',
        currentLocation: 'Block E-02',
        status: 'pending',
        addedAt: new Date('2025-01-12T10:00:00')
      }
    ],
    transportCompany: 'Ocean Transport',
    driverName: 'Robert Chen',
    vehicleNumber: 'MNO-678',
    status: 'pending',
    createdBy: 'Alex Operator',
    createdAt: new Date('2025-01-12T10:00:00'),
    estimatedReleaseDate: new Date('2025-01-14T15:00:00'),
    notes: 'Draft order - needs review'
  }
];

export const ReleaseOrderList: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ReleaseOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { user, getClientFilter, canViewAllData } = useAuth();
  const { currentYard } = useYard();

  // Filter release orders based on user permissions and search/status filters
  const getFilteredOrders = () => {
    let orders = mockBookingReferences;

    // Filter by current yard
    if (currentYard) {
      console.log(`Filtering orders for yard: ${currentYard.name}`);
    }

    // Apply client filter for client users
    const clientFilter = getClientFilter();
    if (clientFilter) {
      orders = orders.filter(order =>
        order.clientCode === clientFilter ||
        order.createdBy === user?.name
      );
    }

    // Apply search filter
    if (searchTerm) {
      orders = orders.filter(order =>
        (order.bookingNumber || order.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (selectedFilter !== 'all') {
      orders = orders.filter(order => order.status === selectedFilter);
    }

    return orders;
  };

  const filteredOrders = getFilteredOrders();

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setShowForm(true);
  };

  const handleViewDetails = (order: ReleaseOrder) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  // Calculate statistics
  const getOrderStats = () => {
    return {
      total: filteredOrders.length,
      pending: filteredOrders.filter(o => o.status === 'pending').length,
      validated: filteredOrders.filter(o => o.status === 'in_process').length,
      completed: filteredOrders.filter(o => o.status === 'completed').length,
      totalContainers: filteredOrders.reduce((sum, o) => sum + o.totalContainers, 0),
      readyContainers: filteredOrders.reduce((sum, o) => sum + o.totalContainers, 0)
    };
  };

  const stats = getOrderStats();

  const getStatusBadge = (status: ReleaseOrder['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      in_process: { color: 'bg-orange-100 text-orange-800', label: 'In Process' },
      validated: { color: 'bg-green-100 text-green-800', label: 'Validated' },
      completed: { color: 'bg-blue-600 text-white', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          {status || 'Unknown'}
        </span>
      );
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 lg:bg-transparent">
      {/* Unified Mobile-First Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          {/* Title Section */}
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Booking Management</h1>
              <p className="text-sm text-gray-600 hidden lg:block">Release orders & container bookings</p>
            </div>
          </div>

          {/* Action Button - Mobile First */}
          <div className="lg:flex lg:justify-end">
            <button
              onClick={handleCreateOrder}
              className="w-full lg:w-auto flex items-center justify-center space-x-2 px-4 py-3 lg:px-6 lg:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl lg:rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              <FileText className="h-5 w-5 lg:h-4 lg:w-4" />
              <span className="text-sm lg:text-base">Create Booking</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unified Responsive Statistics */}
      <div className="px-4 py-4 lg:px-6 lg:py-6 space-y-4">
        <MobileReleaseOrderStats stats={stats} />

        {/* Unified Search and Filter */}
        <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 lg:p-4">
            {/* Search Bar */}
            <div className="relative mb-4 lg:mb-0">
              <Search className="absolute left-4 lg:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 lg:h-4 lg:w-4" />
              <input
                type="text"
                placeholder="Search bookings..."
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
              {['all', 'pending', 'in_process', 'validated', 'completed'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    selectedFilter === filter
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter === 'in_process' ? 'In Process' : filter.charAt(0).toUpperCase() + filter.slice(1)}
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
                <option value="in_process">In Process</option>
                <option value="validated">Validated</option>
                <option value="completed">Completed</option>
              </select>
              {searchTerm && (
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg font-medium">
                  {filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Unified Bookings List - Mobile First */}
        <MobileReleaseOrderTable
          orders={filteredOrders}
          searchTerm={searchTerm}
          selectedFilter={selectedFilter}
          onViewDetails={handleViewDetails}
        />
      </div>

      {/* Release Order Form Modal */}
      {showForm && (
        <ReleaseOrderForm
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedOrder(null);
          }}
          onSubmit={(order) => {
            console.log('Saving release order:', order);
            setShowForm(false);
            setSelectedOrder(null);
          }}
          isLoading={false}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full h-[90vh] flex flex-col overflow-hidden">
            {/* Fixed Header */}
            <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Booking Details
                  </h3>
                  <div className="flex items-center space-x-3 mt-2">
                    {getStatusBadge(selectedOrder.status)}
                    {selectedOrder.bookingType && (
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        selectedOrder.bookingType === 'IMPORT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {selectedOrder.bookingType}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Order Information and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Order Information */}
                <div className="space-y-4 md:col-span-1">
                  <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Booking Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-600">Booking Reference:</span>
                        <span className="ml-2 font-medium">{selectedOrder.bookingNumber || selectedOrder.id}</span>
                      </div>
                    </div>
                    {selectedOrder.bookingType && (
                      <div className="flex items-center space-x-3">
                        <Package className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="text-sm text-gray-600">Type:</span>
                          <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                            selectedOrder.bookingType === 'IMPORT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {selectedOrder.bookingType}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-600">Client:</span>
                        <span className="ml-2 font-medium">
                          {canViewAllData() ? selectedOrder.clientName : 'Your Company'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-600">Created:</span>
                        <span className="ml-2 font-medium">
                          {selectedOrder.createdAt.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-600">Total Containers:</span>
                        <span className="ml-2 font-medium">{selectedOrder.totalContainers}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-600">Remaining:</span>
                        <span className="ml-2 font-medium">{selectedOrder.remainingContainers ?? selectedOrder.totalContainers}</span>
                      </div>
                    </div>
                    {selectedOrder.estimatedReleaseDate && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="text-sm text-gray-600">Est. Release:</span>
                          <span className="ml-2 font-medium">
                            {selectedOrder.estimatedReleaseDate.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-4 md:col-span-1">
                  <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Notes
                  </h4>
                  {selectedOrder.notes ? (
                    <div className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm leading-relaxed">
                      {selectedOrder.notes}
                    </div>
                  ) : (
                    <div className="text-gray-500 italic text-sm">
                      No notes available
                    </div>
                  )}
                </div>
              </div>

              {/* Container Quantities Breakdown */}
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-6">
                  Container Quantities Breakdown
                </h4>

                <div className="flex justify-center">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                    {/* 20ft Containers */}
                    <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                      <div className="flex items-center space-x-3 mb-4">
                        <Package className="h-6 w-6 text-blue-600" />
                        <div>
                          <h5 className="font-semibold text-blue-900">20" Containers</h5>
                          <p className="text-sm text-blue-700">Standard Size</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-900 mb-2">
                          {selectedOrder.containerQuantities?.size20ft || 0}
                        </div>
                        <div className="text-sm text-blue-700">
                          {(selectedOrder.containerQuantities?.size20ft || 0) === 1 ? 'Container' : 'Containers'}
                        </div>
                      </div>
                    </div>

                    {/* 40ft Containers */}
                    <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                      <div className="flex items-center space-x-3 mb-4">
                        <Package className="h-6 w-6 text-green-600" />
                        <div>
                          <h5 className="font-semibold text-green-900">40" Containers</h5>
                          <p className="text-sm text-green-700">High Capacity</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-900 mb-2">
                          {selectedOrder.containerQuantities?.size40ft || 0}
                        </div>
                        <div className="text-sm text-green-700">
                          {(selectedOrder.containerQuantities?.size40ft || 0) === 1 ? 'Container' : 'Containers'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 mb-2">
                      Total: {selectedOrder.totalContainers} Container{selectedOrder.totalContainers !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Processed: {selectedOrder.totalContainers - (selectedOrder.remainingContainers || selectedOrder.totalContainers)} •
                      Remaining: {selectedOrder.remainingContainers || selectedOrder.totalContainers}
                    </div>
                    {selectedOrder.requiresDetailedBreakdown && (
                      <div className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Requires Detailed Breakdown
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
