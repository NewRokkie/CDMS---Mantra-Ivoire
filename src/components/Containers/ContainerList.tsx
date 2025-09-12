import React, { useState } from 'react';
import { Search, Filter, Download, Eye, Edit, AlertTriangle, Package } from 'lucide-react';
import { Container } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { clientPoolService } from '../../services/clientPoolService';
import { ContainerViewModal } from './ContainerViewModal';
import { ContainerEditModal } from './ContainerEditModal';

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

// Mock data with client codes, extended audit logs, Tantarelli-compatible locations, and valid 11-char container numbers without hyphens
const initialContainers: Container[] = [
  {
    id: '1',
    number: 'MSKU1234567',
    type: 'dry',
    size: '40ft',
    status: 'in_depot',
    location: 'Stack S1-Row 1-Tier 1',
    gateInDate: new Date('2025-01-10T08:30:00'),
    client: 'Maersk Line',
    clientId: '1',
    clientCode: 'MAEU',
    createdBy: 'System',
    updatedBy: 'System',
    auditLogs: [
      { timestamp: new Date('2025-01-10T08:30:00'), user: 'System', action: 'created', details: 'Container created in depot' },
      { timestamp: new Date('2025-01-11T10:00:00'), user: 'John Doe', action: 'viewed', details: 'Container details viewed' },
      { timestamp: new Date('2025-01-12T14:20:00'), user: 'Admin User', action: 'edited', details: 'Location updated to Stack S1' },
      { timestamp: new Date('2025-01-13T09:15:00'), user: 'Jane Smith', action: 'viewed', details: 'Quick status check' },
      { timestamp: new Date('2025-01-13T16:45:00'), user: 'Operator', action: 'moved', details: 'Moved from temporary storage to final position' }
    ]
  },
  {
    id: '2',
    number: 'TCLU9876543',
    type: 'reefer',
    size: '20ft',
    status: 'out_depot',
    location: 'Stack S3-Row 2-Tier 1',
    gateInDate: new Date('2025-01-09T14:15:00'),
    gateOutDate: new Date('2025-01-11T10:00:00'),
    client: 'MSC',
    clientId: '2',
    clientCode: 'MSCU',
    releaseOrderId: 'RO-2025-001',
    createdBy: 'System',
    updatedBy: 'System',
    auditLogs: [
      { timestamp: new Date('2025-01-09T14:15:00'), user: 'System', action: 'created', details: 'Reefer container registered' },
      { timestamp: new Date('2025-01-10T11:30:00'), user: 'Tech Support', action: 'edited', details: 'Temperature settings adjusted to 4°C' },
      { timestamp: new Date('2025-01-11T08:00:00'), user: 'Gate Operator', action: 'viewed', details: 'Pre-gate out inspection completed' },
      { timestamp: new Date('2025-01-11T10:00:00'), user: 'Jane Smith', action: 'edited', details: 'Status updated to out_depot' },
      { timestamp: new Date('2025-01-11T10:05:00'), user: 'Gate Operator', action: 'moved', details: 'Released through Gate 2 with RO-2025-001' }
    ]
  },
  {
    id: '3',
    number: 'GESU4567891',
    type: 'dry',
    size: '40ft',
    status: 'in_service',
    location: 'Stack S5-Row 1-Tier 3',
    gateInDate: new Date('2025-01-08T16:45:00'),
    client: 'CMA CGM',
    clientId: '3',
    clientCode: 'CMDU',
    damage: ['Corner post damage', 'Door seal replacement needed'],
    createdBy: 'System',
    updatedBy: 'System',
    auditLogs: [
      { timestamp: new Date('2025-01-08T16:45:00'), user: 'System', action: 'created', details: 'Container with initial damage report' },
      { timestamp: new Date('2025-01-09T09:30:00'), user: 'Maintenance Team', action: 'viewed', details: 'Damage assessment initiated' },
      { timestamp: new Date('2025-01-09T12:00:00'), user: 'Repair Tech', action: 'edited', details: 'Added door seal damage to report' },
      { timestamp: new Date('2025-01-10T15:20:00'), user: 'Supervisor', action: 'viewed', details: 'Reviewed repair progress' },
      { timestamp: new Date('2025-01-10T17:00:00'), user: 'Maintenance Team', action: 'moved', details: 'Transferred to Stack S5 for repairs' }
    ]
  },
  {
    id: '4',
    number: 'SHIP1112228',
    type: 'dry',
    size: '20ft',
    status: 'in_depot',
    location: 'Stack S7-Row 3-Tier 2',
    gateInDate: new Date('2025-01-11T09:15:00'),
    client: 'Shipping Solutions Inc',
    clientId: '4',
    clientCode: 'SHIP001',
    createdBy: 'System',
    updatedBy: 'System',
    auditLogs: [
      { timestamp: new Date('2025-01-11T09:15:00'), user: 'System', action: 'created', details: 'Standard dry container added' },
      { timestamp: new Date('2025-01-11T11:00:00'), user: 'Yard Operator', action: 'moved', details: 'Placed in Stack S7 stack' },
      { timestamp: new Date('2025-01-12T10:30:00'), user: 'Client Rep', action: 'viewed', details: 'Verified container position' },
      { timestamp: new Date('2025-01-12T14:00:00'), user: 'Admin', action: 'edited', details: 'Updated client code to SHIP001' },
      { timestamp: new Date('2025-01-13T08:45:00'), user: 'Operator', action: 'viewed', details: 'Routine depot check' }
    ]
  },
  {
    id: '5',
    number: 'SHIP3334449',
    type: 'reefer',
    size: '40ft',
    status: 'maintenance',
    location: 'Stack S9-Row 2-Tier 4',
    gateInDate: new Date('2025-01-07T13:20:00'),
    client: 'Shipping Solutions Inc',
    clientId: '4',
    clientCode: 'SHIP001',
    damage: ['Refrigeration unit malfunction'],
    createdBy: 'System',
    updatedBy: 'System',
    auditLogs: [
      { timestamp: new Date('2025-01-07T13:20:00'), user: 'System', action: 'created', details: 'Reefer with refrigeration issue registered' },
      { timestamp: new Date('2025-01-07T15:00:00'), user: 'Tech Support', action: 'viewed', details: 'Initial diagnostics performed' },
      { timestamp: new Date('2025-01-08T10:00:00'), user: 'Repair Team', action: 'edited', details: 'Status changed to maintenance' },
      { timestamp: new Date('2025-01-08T14:30:00'), user: 'Supervisor', action: 'moved', details: 'Relocated to Stack S9' },
      { timestamp: new Date('2025-01-09T11:15:00'), user: 'Maintenance Lead', action: 'viewed', details: 'Progress update and approval' }
    ]
  }
];

export const ContainerList: React.FC = () => {
  const [containers, setContainers] = useState<Container[]>(initialContainers);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { t } = useLanguage();
  const { user, canViewAllData, getClientFilter } = useAuth();
  const { currentYard } = useYard();

  const getStatusBadge = (status: Container['status']) => {
    const statusConfig = {
      in_depot: { color: 'bg-green-100 text-green-800', label: 'In Depot' },
      out_depot: { color: 'bg-blue-100 text-blue-800', label: 'Out Depot' },
      in_service: { color: 'bg-yellow-100 text-yellow-800', label: 'In Service' },
      maintenance: { color: 'bg-red-100 text-red-800', label: 'Maintenance' },
      cleaning: { color: 'bg-purple-100 text-purple-800', label: 'Cleaning' }
    };

    const config = statusConfig[status];
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Filter containers based on user permissions
  const getFilteredContainers = () => {
    let filtered = containers;

    // Filter by current yard first
    if (currentYard) {
      filtered = filtered.filter(container => {
        // Check if container belongs to current yard
        // For Tantarelli yard, check for specific stack patterns
        if (currentYard.id === 'depot-tantarelli') {
          return container.location.includes('Stack S') &&
                 /Stack S(1|3|5|7|9|11|13|15|17|19|21|23|25|27|29|31|33|35|37|39|41|43|45|47|49|51|53|55|61|63|65|67|69|71|73|75|77|79|81|83|85|87|89|91|93|95|97|99|101|103)/.test(container.location);
        }
        // For other yards, use different patterns
        return container.location.includes(currentYard.code) || container.location.includes(currentYard.name);
      });
    }

    // Apply client filter for client users
    const clientFilter = getClientFilter();
    if (clientFilter) {
      // Use client pool service to filter containers by assigned stacks
      const clientStacks = clientPoolService.getClientStacks(clientFilter);
      filtered = filtered.filter(container => {
        // Check if container is in client's assigned stacks
        const containerStackMatch = container.location.match(/Stack S(\d+)/);
        if (containerStackMatch) {
          const stackNumber = parseInt(containerStackMatch[1]);
          const stackId = `stack-${stackNumber}`;
          return clientStacks.includes(stackId);
        }

        // Fallback to original filtering
        return container.clientCode === clientFilter ||
               container.client === user?.company ||
               container.client.toLowerCase().includes(clientFilter.toLowerCase());
      });
    }

    // Apply search and status filters
    return filtered.filter(container => {
      const matchesSearch = container.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           container.client.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || container.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const filteredContainers = getFilteredContainers();
  const canEditContainers = user?.role === 'admin' || user?.role === 'supervisor';

  const addAuditLog = (containerId: string, action: string, details: string = '') => {
    setContainers(prevContainers =>
      prevContainers.map(container =>
        container.id === containerId
          ? {
              ...container,
              auditLogs: [
                ...(container.auditLogs || []),
                {
                  timestamp: new Date(),
                  user: user?.name || 'Unknown User',
                  action,
                  details
                }
              ]
            }
          : container
      )
    );
  };

  const handleViewContainer = (container: Container) => {
    addAuditLog(container.id, 'viewed', 'Container details viewed');
    setSelectedContainer(container);
    setShowViewModal(true);
  };

  const handleEditContainer = (container: Container) => {
    addAuditLog(container.id, 'edit_started', 'Edit modal opened');
    setSelectedContainer(container);
    setShowEditModal(true);
  };

  const handleUpdateContainer = (updatedContainer: Container) => {
    // Update the container in state
    setContainers(prevContainers =>
      prevContainers.map(c => c.id === updatedContainer.id ? updatedContainer : c)
    );
    // Add audit log for edit
    addAuditLog(updatedContainer.id, 'edited', 'Container information updated');
    setShowEditModal(false);
    setSelectedContainer(null);
    alert('Container updated successfully!');
  };

  // Show client restriction notice
  const showClientNotice = !canViewAllData() && user?.role === 'client';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('containers.title')}</h2>
          {showClientNotice && (
            <div className="flex items-center mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800">
                You are viewing containers for <strong>{user?.company}</strong> only.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Container View Modal */}
      {showViewModal && selectedContainer && (
        <ContainerViewModal
          container={selectedContainer}
          onClose={() => {
            setShowViewModal(false);
            setSelectedContainer(null);
          }}
        />
      )}

      {/* Container Edit Modal */}
      {showEditModal && selectedContainer && (
        <ContainerEditModal
          container={selectedContainer}
          onClose={() => {
            setShowEditModal(false);
            setSelectedContainer(null);
          }}
          onSave={handleUpdateContainer}
        />
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-lg">📦</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">
                {showClientNotice ? 'Your Containers' : 'Total Containers'}
              </p>
              <p className="text-lg font-semibold text-gray-900">{filteredContainers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-lg">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">In Depot</p>
              <p className="text-lg font-semibold text-gray-900">
                {filteredContainers.filter(c => c.status === 'in_depot').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-lg">🔧</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">In Service</p>
              <p className="text-lg font-semibold text-gray-900">
                {filteredContainers.filter(c => c.status === 'in_service' || c.status === 'maintenance').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-lg">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">With Damage</p>
              <p className="text-lg font-semibold text-gray-900">
                {filteredContainers.filter(c => c.damage && c.damage.length > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={showClientNotice ? "Search your containers..." : t('containers.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="in_depot">In Depot</option>
              <option value="out_depot">Out Depot</option>
              <option value="in_service">In Service</option>
              <option value="maintenance">Maintenance</option>
              <option value="cleaning">Cleaning</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Container Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type & Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                {canViewAllData() && (<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>)}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gate In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContainers.map((container) => (
                <tr key={container.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <span className="text-lg">📦</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{formatContainerNumberForDisplay(container.number)}</div>
                        {container.damage && container.damage.length > 0 && (
                          <div className="text-xs text-red-600 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {container.damage.length} damage(s) reported
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {container.type.charAt(0).toUpperCase() + container.type.slice(1)}
                    </div>
                    <div className="text-sm text-gray-500">{container.size}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(container.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <strong>{container.location}</strong>
                  </td>
                  {canViewAllData() && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{container.client}</div>
                        {container.clientCode && (
                          <div className="text-xs text-gray-500">{container.clientCode}</div>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {container.gateInDate?.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewContainer(container)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canEditContainers && (
                        <button
                          onClick={() => handleEditContainer(container)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="Edit Container"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredContainers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <span className="text-4xl">📦</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No containers found</h3>
            <p className="text-gray-600">
              {showClientNotice
                ? "No containers found for your company. Contact the depot if you expect to see containers here."
                : "Try adjusting your search criteria or filters."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
