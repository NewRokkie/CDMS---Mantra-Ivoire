import React, { useState } from 'react';
import { Building, MapPin, Users, Settings, Edit, Trash2 } from 'lucide-react';
import { Yard } from '../../../types';
import { DataDisplayModal } from '../../Common/Modal/DataDisplayModal';
import { DataSection, ModalAction } from '../../Common/Modal/types';

import { RadialGauge } from './Depot View/RadialGauge';
import { GlassCard } from './Depot View/GlassCard';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  depot: Yard | null;
  onEdit?: (depot: Yard) => void;
  onDelete?: (depot: Yard) => void;
}

export const DepotDetailModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  depot,
  onEdit,
  onDelete 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'contact' | 'structure' | 'metadata'>('overview');

  if (!depot) return null;

  const occupancyRate = depot.totalCapacity ? (depot.currentOccupancy / depot.totalCapacity) * 100 : 0;

  // Define data sections for different tabs
  const overviewSection: DataSection = {
    id: 'overview',
    title: 'Basic Information',
    icon: Building,
    data: {
      name: depot.name,
      code: depot.code,
      description: depot.description || '-',
      layout: depot.layout,
      status: depot.isActive ? 'Active' : 'Inactive',
      totalCapacity: depot.totalCapacity?.toLocaleString() || '0',
      currentOccupancy: depot.currentOccupancy?.toLocaleString() || '0',
      occupancyRate: `${occupancyRate.toFixed(1)}%`
    },
    layout: 'grid'
  };

  const contactSection: DataSection = {
    id: 'contact',
    title: 'Contact & Address',
    icon: MapPin,
    data: {
      street: depot.address?.street || '-',
      city: depot.address?.city || '-',
      state: depot.address?.state || '-',
      zipCode: depot.address?.zipCode || '-',
      country: depot.address?.country || '-',
      phone: depot.contactInfo?.phone || '-',
      email: depot.contactInfo?.email || '-',
      manager: depot.contactInfo?.manager || '-'
    },
    layout: 'grid'
  };

  const structureSection: DataSection = {
    id: 'structure',
    title: 'Yard Structure',
    icon: Settings,
    data: {
      totalSections: depot.sections?.length?.toString() || '0',
      totalStacks: depot.sections?.reduce((total, section) => total + (section.stacks?.length || 0), 0)?.toString() || '0',
      layout: depot.layout || '-',
      location: depot.location || '-',
      timezone: depot.timezone || '-',
      capacity: depot.totalCapacity?.toString() || '0'
    },
    layout: 'grid'
  };

  const metadataSection: DataSection = {
    id: 'metadata',
    title: 'System Information',
    icon: Users,
    data: {
      createdAt: depot.createdAt ? new Date(depot.createdAt).toLocaleDateString() : '-',
      updatedAt: depot.updatedAt ? new Date(depot.updatedAt).toLocaleDateString() : '-',
      createdBy: depot.createdBy || '-',
      lastModifiedBy: depot.updatedBy || '-',
      yardId: depot.id || '-'
    },
    layout: 'list'
  };

  // Define actions
  const actions: ModalAction[] = [
    ...(onEdit ? [{
      label: 'Edit Depot',
      onClick: () => onEdit(depot),
      variant: 'primary' as const,
      icon: Edit
    }] : []),
    ...(onDelete ? [{
      label: 'Delete Depot',
      onClick: () => onDelete(depot),
      variant: 'danger' as const,
      icon: Trash2
    }] : [])
  ];

  // Get sections based on active tab
  const getSections = () => {
    switch (activeTab) {
      case 'overview':
        return [overviewSection];
      case 'contact':
        return [contactSection];
      case 'structure':
        return [structureSection];
      case 'metadata':
        return [metadataSection];
      default:
        return [overviewSection];
    }
  };

  return (
    <DataDisplayModal
      isOpen={isOpen}
      onClose={onClose}
      title={depot.name}
      subtitle={`${depot.code} - ${depot.isActive ? 'Active' : 'Inactive'}`}
      icon={Building}
      size="xl"
      data={depot}
      sections={getSections()}
      actions={actions}
    >
      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: Building },
            { id: 'contact', label: 'Contact & Address', icon: MapPin },
            { id: 'structure', label: 'Yard Structure', icon: Settings },
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
              <Settings className="h-5 w-5 mr-2" />
              Capacity Overview
            </h3>
            <div className="flex items-center justify-center mb-4">
              <RadialGauge value={occupancyRate} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600 animate-count">
                  {depot.totalCapacity?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-gray-600 mt-1">Total Capacity</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600 animate-count">
                  {depot.currentOccupancy?.toLocaleString() || '0'}
                </div>
                <div className="text-xs text-gray-600 mt-1">Current Occupancy</div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Location Preview for Contact Tab */}
      {activeTab === 'contact' && depot.address && (
        <div className="mb-6">
          <GlassCard>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Location Preview
            </h3>
            <div className="relative h-40 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
              <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-lg text-xs shadow-sm">
                📍 {depot.address.city || 'Unknown'}, {depot.address.country || 'N/A'}
              </div>
              <div className="absolute bottom-4 right-4 h-12 w-12 rounded-full bg-blue-500/20 blur-xl" />
              <div className="absolute bottom-4 right-4 h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
            </div>
          </GlassCard>
        </div>
      )}
    </DataDisplayModal>
  );
};
