import React, { useState } from 'react';
import { Plus, LayoutGrid, List, AlertTriangle, FileText, Clock, CheckCircle, Package } from 'lucide-react';
import { ReleaseOrder, Container } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { ReleaseOrderForm } from './ReleaseOrderForm';
import { ReleaseOrderTableView } from './ReleaseOrderTableView';

// Mock containers available for release
const mockAvailableContainers: Container[] = [
  {
    id: '1',
    number: 'MSKU-123456-7',
    type: 'dry',
    size: '40ft',
    status: 'in_depot',
    location: 'Block A-12',
    gateInDate: new Date('2025-01-10T08:30:00'),
    client: 'Maersk Line',
    clientCode: 'MAEU'
  },
  {
    id: '4',
    number: 'SHIP-111222-8',
    type: 'dry',
    size: '20ft',
    status: 'in_depot',
    location: 'Block B-05',
    gateInDate: new Date('2025-01-11T09:15:00'),
    client: 'Shipping Solutions Inc',
    clientCode: 'SHIP001'
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
    clientCode: 'MAEU'
  }
];

// Enhanced mock data with multiple containers per release order
const mockReleaseOrders: ReleaseOrder[] = [
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
    priority: 'high',
    createdBy: 'Jane Operator',
    validatedBy: 'Mike Supervisor',
    createdAt: new Date('2025-01-11T09:00:00'),
    validatedAt: new Date('2025-01-11T10:30:00'),
    estimatedReleaseDate: new Date('2025-01-12T14:00:00'),
    notes: 'Priority shipment - handle with care'
  },
  {
    id: 'RO-2025-002',
    clientId: '2',
    clientCode: 'MSCU',
    clientName: 'MSC',
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
    priority: 'medium',
    createdBy: 'Jane Operator',
    validatedBy: 'Mike Supervisor',
    createdAt: new Date('2025-01-10T14:30:00'),
    validatedAt: new Date('2025-01-10T15:45:00'),
    completedAt: new Date('2025-01-11T10:00:00'),
    notes: 'Standard release - completed successfully'
  },
  {
    id: 'RO-2025-003',
    clientId: '4',
    clientCode: 'SHIP001',
    clientName: 'Shipping Solutions Inc',
    containers: [
      {
        id: 'roc-4',
        containerId: '4',
        containerNumber: 'SHIP-111222-8',
        containerType: 'dry',
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
    status: 'pending',
    priority: 'low',
    createdBy: 'Sarah Client',
    createdAt: new Date('2025-01-11T11:30:00'),
    estimatedReleaseDate: new Date('2025-01-13T09:00:00'),
    notes: 'Client requested release - pending validation'
  },
  {
    id: 'RO-2025-004',
    clientId: '1',
    clientCode: 'MAEU',
    clientName: 'Maersk Line',
    containers: [
      {
        id: 'roc-6',
        containerId: '7',
        containerNumber: 'MAEU-777888-5',
        containerType: 'dry',
        containerSize: '40ft',
        currentLocation: 'Block A-15',
        status: 'ready',
        addedAt: new Date('2025-01-12T08:00:00')
      }
    ],
    transportCompany: 'Express Logistics',
    driverName: 'Sarah Wilson',
    vehicleNumber: 'DEF-789',
    status: 'validated',
    priority: 'medium',
    createdBy: 'Tom Operator',
    validatedBy: 'Mike Supervisor',
    createdAt: new Date('2025-01-12T08:00:00'),
    validatedAt: new Date('2025-01-12T09:15:00'),
    estimatedReleaseDate: new Date('2025-01-13T11:00:00'),
    notes: 'Single container release'
  },
  {
    id: 'RO-2025-005',
    clientId: '4',
    clientCode: 'SHIP001',
    clientName: 'Shipping Solutions Inc',
    containers: [
      {
        id: 'roc-7',
        containerId: '8',
        containerNumber: 'SHIP-999000-6',
        containerType: 'dry',
        containerSize: '40ft',
        currentLocation: 'Block C-05',
        status: 'ready',
        addedAt: new Date('2025-01-10T16:00:00')
      },
      {
        id: 'roc-8',
        containerId: '9',
        containerNumber: 'SHIP-111333-7',
        containerType: 'reefer',
        containerSize: '20ft',
        currentLocation: 'Block D-01',
        status: 'ready',
        addedAt: new Date('2025-01-10T16:05:00')
      },
      {
        id: 'roc-9',
        containerId: '10',
        containerNumber: 'SHIP-444555-8',
        containerType: 'dry',
        containerSize: '20ft',
        currentLocation: 'Block C-08',
        status: 'ready',
        addedAt: new Date('2025-01-10T16:10:00')
      }
    ],
    transportCompany: 'Express Delivery',
    driverName: 'Lisa Green',
    vehicleNumber: 'JKL-345',
    status: 'validated',
    priority: 'medium',
    createdBy: 'Sarah Client',
    validatedBy: 'Mike Supervisor',
    createdAt: new Date('2025-01-10T16:00:00'),
    validatedAt: new Date('2025-01-11T08:15:00'),
    estimatedReleaseDate: new Date('2025-01-12T10:00:00'),
    notes: 'Multiple containers - partial release allowed'
  },
  {
    id: 'RO-2025-006',
    clientId: '3',
    clientCode: 'CMDU',
    clientName: 'CMA CGM',
    containers: [
      {
        id: 'roc-10',
        containerId: '11',
        containerNumber: 'CMDU-123789-9',
        containerType: 'dry',
        containerSize: '40ft',
        currentLocation: 'Block E-02',
        status: 'pending',
        addedAt: new Date('2025-01-12T10:00:00')
      }
    ],
    transportCompany: 'Ocean Transport',
    driverName: 'Robert Chen',
    vehicleNumber: 'MNO-678',
    status: 'draft',
    priority: 'low',
    createdBy: 'Alex Operator',
    createdAt: new Date('2025-01-12T10:00:00'),
    estimatedReleaseDate: new Date('2025-01-14T15:00:00'),
    notes: 'Draft order - needs review'
  }
];

export const ReleaseOrderList: React.FC = () => {
  const [viewMode, setViewMode] = useState<'table' | 'detailed'>('table');
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ReleaseOrder | null>(null);
  const { t } = useLanguage();
  const { user, canViewAllData, getClientFilter } = useAuth();

  // Filter release orders based on user permissions
  const getFilteredOrders = () => {
    let orders = mockReleaseOrders;
    
    // Apply client filter for client users
    const clientFilter = getClientFilter();
    if (clientFilter) {
      orders = orders.filter(order => 
        order.clientCode === clientFilter ||
        order.createdBy === user?.name
      );
    }
    
    return orders;
  };

  const filteredOrders = getFilteredOrders();

  const canCreateOrders = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor' || user?.role === 'client';

  // Show client restriction notice
  const showClientNotice = !canViewAllData() && user?.role === 'client';

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setShowForm(true);
  };

  // Calculate statistics
  const getOrderStats = () => {
    return {
      total: filteredOrders.length,
      pending: filteredOrders.filter(o => o.status === 'pending').length,
      validated: filteredOrders.filter(o => o.status === 'validated').length,
      completed: filteredOrders.filter(o => o.status === 'completed').length,
      totalContainers: filteredOrders.reduce((sum, o) => sum + o.containers.length, 0),
      readyContainers: filteredOrders.reduce((sum, o) => 
        sum + o.containers.filter(c => c.status === 'ready').length, 0
      )
    };
  };

  const stats = getOrderStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('releases.title')}</h2>
          {showClientNotice && (
            <div className="flex items-center mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800">
                You are viewing release orders for <strong>{user?.company}</strong> only.
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4 mr-1 inline" />
              Table View
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'detailed'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="h-4 w-4 mr-1 inline" />
              Detailed View
            </button>
          </div>

          {canCreateOrders && (
            <button 
              onClick={handleCreateOrder}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Release Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Responsive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Orders */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <List className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600 truncate">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Pending */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-yellow-50 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600 truncate">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Validated */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-green-50 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600 truncate">Validated</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.validated}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Completed */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600 truncate">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Total Containers */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-purple-50 rounded-xl">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600 truncate">Total Containers</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalContainers}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Ready for Release - Only show on larger screens or as 6th card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 sm:col-span-2 lg:col-span-1 xl:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 bg-green-50 rounded-xl">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600 truncate">Ready for Release</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.readyContainers}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conditional View Rendering */}
      {viewMode === 'table' ? (
        <ReleaseOrderTableView orders={filteredOrders} />
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <LayoutGrid className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Detailed View</h3>
          <p className="text-gray-600">
            The detailed view with enhanced cards and filters is coming soon.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Switch to Table View to see the streamlined release orders table.
          </p>
        </div>
      )}

      {/* Release Order Form Modal */}
      {showForm && (
        <ReleaseOrderForm
          order={selectedOrder}
          availableContainers={mockAvailableContainers}
          onClose={() => setShowForm(false)}
          onSave={(order) => {
            console.log('Saving release order:', order);
            setShowForm(false);
            // In a real app, this would update the orders list
          }}
        />
      )}
    </div>
  );
};