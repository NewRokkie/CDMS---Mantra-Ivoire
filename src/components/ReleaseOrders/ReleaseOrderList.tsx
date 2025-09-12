import React, { useState } from 'react';
import { ReleaseOrder, Container } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { ReleaseOrderForm } from './ReleaseOrderForm';
import { ReleaseOrderTableView } from './ReleaseOrderTableView';
import { ReleaseOrderKPICards } from './ReleaseOrderKPICards';
import { ReleaseOrderViewToggle } from './ReleaseOrderViewToggle';
import { ReleaseOrderDetailedView } from './ReleaseOrderDetailedView';
import { ReleaseOrderHeader } from './ReleaseOrderHeader';

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
    remainingContainers: 5, // Track remaining containers for status
    maxQuantityThreshold: 10,
    requiresDetailedBreakdown: false,
    status: 'pending', // 0 containers processed yet
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
    remainingContainers: 0, // All containers processed
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
    remainingContainers: 1, // 1 container processed, 1 remaining
    maxQuantityThreshold: 10,
    requiresDetailedBreakdown: false,
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
    status: 'in_process', // Some containers processed
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
    remainingContainers: 1, // No containers processed yet
    maxQuantityThreshold: 10,
    requiresDetailedBreakdown: false,
    status: 'pending', // 0 containers processed yet
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
    remainingContainers: 12, // No containers processed yet
    maxQuantityThreshold: 10,
    requiresDetailedBreakdown: true,
    status: 'pending', // 0 containers processed yet
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
    remainingContainers: 1, // No containers processed yet
    maxQuantityThreshold: 10,
    requiresDetailedBreakdown: false,
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
    status: 'pending', // 0 containers processed yet
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
  const { user, getClientFilter } = useAuth();
  const { currentYard } = useYard();

  // Filter release orders based on user permissions
  const getFilteredOrders = () => {
    let orders = mockBookingReferences;
    
    // Filter by current yard (in a real implementation, orders would have yard associations)
    if (currentYard) {
      // For now, we'll assume all orders are yard-agnostic
      // In a real implementation, you'd filter by yard-specific orders
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
    
    return orders;
  };

  const filteredOrders = getFilteredOrders();

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
      totalContainers: filteredOrders.reduce((sum, o) => sum + o.totalContainers, 0),
      readyContainers: filteredOrders.reduce((sum, o) => sum + o.totalContainers, 0)
    };
  };

  const stats = getOrderStats();

  return (
    <div className="space-y-6">
      <ReleaseOrderHeader onCreateOrder={handleCreateOrder} currentYard={currentYard} />

      <ReleaseOrderKPICards stats={stats} />

      <div className="flex items-center justify-end">
        <ReleaseOrderViewToggle 
          viewMode={viewMode} 
          onViewModeChange={setViewMode} 
        />
      </div>

      {/* Conditional View Rendering */}
      {viewMode === 'table' ? (
        <ReleaseOrderTableView orders={filteredOrders} />
      ) : (
        <ReleaseOrderDetailedView />
      )}

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
            // In a real app, this would update the orders list
          }}
          isLoading={false}
        />
      )}
    </div>
  );
};