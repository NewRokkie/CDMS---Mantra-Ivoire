import React from 'react';
import { Package, Truck, FileText, AlertTriangle, CheckCircle, Clock, Building } from 'lucide-react';
import { Container } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { getDaysBetween } from '../../utils/dateHelpers';
import { formatContainerNumberForDisplay } from '../Gates/utils';
import { DataDisplayModal } from '../Common/Modal/DataDisplayModal';

interface ContainerViewModalProps {
  container: Container;
  onClose: () => void;
  isOpen: boolean;
}

export const ContainerViewModal: React.FC<ContainerViewModalProps> = ({
  container,
  onClose,
  isOpen
}) => {
  const { canViewAllData } = useAuth();

  const getStatusIcon = (status: Container['status']) => {
    switch (status) {
      case 'gate_in':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'in_depot':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'gate_out':
        return <Truck className="h-5 w-5 text-orange-600" />;
      case 'out_depot':
        return <Truck className="h-5 w-5 text-gray-600" />;
      case 'maintenance':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'cleaning':
        return <Package className="h-5 w-5 text-purple-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: Container['status']) => {
    const statusConfig = {
      gate_in: { color: 'bg-blue-100 text-blue-800', label: 'Gate In' },
      in_depot: { color: 'bg-green-100 text-green-800', label: 'In Depot' },
      gate_out: { color: 'bg-orange-100 text-orange-800', label: 'Gate Out' },
      out_depot: { color: 'bg-gray-100 text-gray-800', label: 'Out Depot' },
      maintenance: { color: 'bg-yellow-100 text-yellow-800', label: 'Maintenance' },
      cleaning: { color: 'bg-purple-100 text-purple-800', label: 'Cleaning' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
    return (
      <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${config.color}`}>
        {getStatusIcon(status)}
        <span className="ml-2">{config.label}</span>
      </span>
    );
  };

  const getTypeIcon = (type: Container['type']) => {
    switch (type) {
      case 'reefer':
        return '❄️';
      case 'tank':
        return '🛢️';
      case 'flat_rack':
        return '📦';
      case 'open_top':
        return '📂';
      default:
        return '📦';
    }
  };

  // Prepare data sections for the DataDisplayModal
  const containerInfoSection = {
    id: 'container-info',
    title: 'Container Information',
    icon: Package,
    data: {
      containerNumber: formatContainerNumberForDisplay(container.number),
      type: `${container.type.charAt(0).toUpperCase() + container.type.slice(1)} • ${container.size}`,
      currentLocation: container.location,
      gateInDate: container.gateInDate?.toLocaleString() || 'N/A',
      gateOutDate: container.gateOutDate?.toLocaleString() || 'N/A',
      daysInDepot: container.gateInDate ? `${getDaysBetween(container.gateInDate)} days` : 'N/A'
    },
    layout: 'grid' as const
  };

  const clientInfoSection = {
    id: 'client-info',
    title: 'Client Information',
    icon: Building,
    data: {
      clientName: canViewAllData() ? container.clientName : 'Your Company',
      clientCode: container.clientCode || '-'
    },
    layout: 'grid' as const
  };

  // Status and Type section with custom rendering
  const statusTypeSection = {
    id: 'status-type',
    title: 'Status & Type Details',
    icon: Package,
    data: {
      currentStatus: getStatusBadge(container.status),
      containerType: (
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getTypeIcon(container.type)}</span>
          <span className="font-medium text-gray-900">
            {container.type.charAt(0).toUpperCase() + container.type.slice(1)} • {container.size}
          </span>
        </div>
      )
    },
    layout: 'grid' as const
  };

  // Damage section if damage exists
  const damageSection = container.damage && container.damage.length > 0 ? {
    id: 'damage-info',
    title: 'Damage Reports',
    icon: AlertTriangle,
    data: {
      damageCount: `${container.damage.length} damage report(s)`,
      damages: container.damage.map((damage, index) => (
        <div key={index} className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-sm text-gray-900">{damage}</span>
        </div>
      ))
    },
    layout: 'list' as const
  } : null;

  const additionalInfoSection = {
    id: 'additional-info',
    title: 'Additional Information',
    icon: FileText,
    data: {
      containerId: container.id.slice(0, 8).toLocaleUpperCase(),
      bookingReference: container.releaseOrderId || '-'
    },
    layout: 'grid' as const
  };

  // Build sections array, filtering out null values
  const sections = [
    containerInfoSection,
    clientInfoSection,
    statusTypeSection,
    damageSection,
    additionalInfoSection
  ].filter((section): section is NonNullable<typeof section> => section !== null);

  return (
    <DataDisplayModal
      isOpen={isOpen}
      onClose={onClose}
      title="Container Details"
      subtitle={formatContainerNumberForDisplay(container.number)}
      icon={Package}
      size="lg"
      sections={sections}
      actions={[]}
    >
      {null}
    </DataDisplayModal>
  );
};
