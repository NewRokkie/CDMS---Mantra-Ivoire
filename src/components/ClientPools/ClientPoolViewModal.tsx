import React, { useState } from 'react';
import { Building, Package, Calendar, Settings, Edit, Trash2, Users } from 'lucide-react';
import { ClientPool } from '../../types/clientPool';
import { DataDisplayModal } from '../Common/Modal/DataDisplayModal';
import { DataSection, ModalAction } from '../Common/Modal/types';
import { RadialGauge } from '../Yard/DepotManagement/Depot View/RadialGauge';
import { GlassCard } from '../Yard/DepotManagement/Depot View/GlassCard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  clientPool: ClientPool | null;
  onEdit?: (pool: ClientPool) => void;
  onDelete?: (pool: ClientPool) => void;
}

export const ClientPoolViewModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  clientPool,
  onEdit,
  onDelete 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'stacks' | 'contract' | 'metadata'>('overview');

  if (!clientPool) return null;

  const utilizationRate = clientPool.maxCapacity ? (clientPool.currentOccupancy / clientPool.maxCapacity) * 100 : 0;

  // Define data sections for different tabs
  const overviewSection: DataSection = {
    id: 'overview',
    title: 'Pool Information',
    icon: Building,
    data: {
      clientName: clientPool.clientName,
      clientCode: clientPool.clientCode,
      priority: clientPool.priority.charAt(0).toUpperCase() + clientPool.priority.slice(1),
      status: clientPool.isActive ? 'Active' : 'Inactive',
      maxCapacity: clientPool.maxCapacity?.toLocaleString() || '0',
      currentOccupancy: clientPool.currentOccupancy?.toLocaleString() || '0',
      utilizationRate: `${utilizationRate.toFixed(1)}%`,
      assignedStacks: `${clientPool.assignedStacks.length} stacks`
    },
    layout: 'grid'
  };

  const stacksSection: DataSection = {
    id: 'stacks',
    title: 'Stack Assignments',
    icon: Package,
    data: {
      totalStacks: clientPool.assignedStacks.length.toString(),
      stackList: clientPool.assignedStacks.map(stackId => 
        `S${stackId.split('-').pop()?.toString().padStart(2, '0')}`
      ).join(', '),
      maxCapacity: clientPool.maxCapacity?.toLocaleString() || '0',
      currentOccupancy: clientPool.currentOccupancy?.toLocaleString() || '0',
      availableSpace: (clientPool.maxCapacity - clientPool.currentOccupancy).toLocaleString()
    },
    layout: 'list'
  };

  const contractSection: DataSection = {
    id: 'contract',
    title: 'Contract Details',
    icon: Calendar,
    data: {
      contractStartDate: clientPool.contractStartDate ? new Date(clientPool.contractStartDate).toLocaleDateString() : '-',
      contractEndDate: clientPool.contractEndDate ? new Date(clientPool.contractEndDate).toLocaleDateString() : 'Ongoing',
      priority: clientPool.priority.charAt(0).toUpperCase() + clientPool.priority.slice(1),
      notes: clientPool.notes || 'No additional notes'
    },
    layout: 'list'
  };

  const metadataSection: DataSection = {
    id: 'metadata',
    title: 'System Information',
    icon: Users,
    data: {
      createdAt: clientPool.createdAt ? new Date(clientPool.createdAt).toLocaleDateString() : '-',
      updatedAt: clientPool.updatedAt ? new Date(clientPool.updatedAt).toLocaleDateString() : '-',
      createdBy: clientPool.createdBy || '-',
      lastModifiedBy: clientPool.updatedBy || '-',
      poolId: clientPool.id || '-',
      yardId: clientPool.yardId || '-'
    },
    layout: 'list'
  };

  // Define actions
  const actions: ModalAction[] = [
    ...(onEdit ? [{
      label: 'Edit Pool',
      onClick: () => onEdit(clientPool),
      variant: 'primary' as const,
      icon: Edit
    }] : []),
    ...(onDelete ? [{
      label: 'Delete Pool',
      onClick: () => onDelete(clientPool),
      variant: 'danger' as const,
      icon: Trash2
    }] : [])
  ];

  // Get sections based on active tab
  const getSections = () => {
    switch (activeTab) {
      case 'overview':
        return [overviewSection];
      case 'stacks':
        return [stacksSection];
      case 'contract':
        return [contractSection];
      case 'metadata':
        return [metadataSection];
      default:
        return [overviewSection];
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <DataDisplayModal
      isOpen={isOpen}
      onClose={onClose}
      title={clientPool.clientName}
      subtitle={`${clientPool.clientCode} - ${clientPool.isActive ? 'Active' : 'Inactive'}`}
      icon={Building}
      size="xl"
      data={clientPool}
      sections={getSections()}
      actions={actions}
    >
      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: Building },
            { id: 'stacks', label: 'Stack Assignments', icon: Package },
            { id: 'contract', label: 'Contract Details', icon: Calendar },
            { id: 'metadata', label: 'Metadata', icon: Users }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Capacity Overview for Overview Tab */}
      {activeTab === 'overview' && (
        <div className="mb-6">
          <GlassCard className="border-green-200 bg-white shadow-sm">
            <h3 className="text-lg font-semibold text-green-700 mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Capacity Overview
            </h3>
            <div className="flex items-center justify-center mb-4">
              <RadialGauge value={utilizationRate} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600 animate-count">
                  {clientPool.maxCapacity?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-gray-600 mt-1">Max Capacity</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 animate-count">
                  {clientPool.currentOccupancy?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-gray-600 mt-1">Current Occupancy</div>
              </div>
            </div>
          </GlassCard>

          {/* Priority Badge */}
          <div className="mt-4">
            <GlassCard>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Priority Level</span>
                </div>
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(clientPool.priority)}`}>
                  {clientPool.priority.charAt(0).toUpperCase() + clientPool.priority.slice(1)}
                </span>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Stack Visualization for Stacks Tab */}
      {activeTab === 'stacks' && (
        <div className="mb-6">
          <GlassCard>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Assigned Stacks
            </h3>
            <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
              {clientPool.assignedStacks.map((stackId) => {
                const stackNumber = stackId.split('-').pop();
                return (
                  <div
                    key={stackId}
                    className="aspect-square bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md hover:shadow-lg transition-shadow"
                    title={`Stack ${stackNumber}`}
                  >
                    {stackNumber?.toString().padStart(2, '0')}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>{clientPool.assignedStacks.length}</strong> stacks assigned with a total capacity of{' '}
                <strong>{clientPool.maxCapacity.toLocaleString()}</strong> containers
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Contract Timeline for Contract Tab */}
      {activeTab === 'contract' && (
        <div className="mb-6">
          <GlassCard>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Contract Timeline
            </h3>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Start Date</div>
                  <div className="text-gray-600">
                    {clientPool.contractStartDate ? new Date(clientPool.contractStartDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : '-'}
                  </div>
                </div>
                <div className="text-sm text-right">
                  <div className="font-medium text-gray-900">End Date</div>
                  <div className="text-gray-600">
                    {clientPool.contractEndDate ? new Date(clientPool.contractEndDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Ongoing'}
                  </div>
                </div>
              </div>
              <div className="w-full h-2 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 rounded-full"></div>
            </div>
          </GlassCard>
        </div>
      )}
    </DataDisplayModal>
  );
};
