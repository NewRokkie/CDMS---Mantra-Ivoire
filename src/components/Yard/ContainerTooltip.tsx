import React from 'react';
import { Package, MapPin, Calendar, User, AlertTriangle, Clock } from 'lucide-react';
import { Container } from '../../types';

interface ContainerTooltipProps {
  container: Container | null;
}

export const ContainerTooltip: React.FC<ContainerTooltipProps> = ({ container }) => {
  if (!container) return null;

  const getStatusColor = (status: Container['status']) => {
    const statusColors = {
      'in_depot': 'bg-green-500 text-white',
      'out_depot': 'bg-blue-500 text-white',
      'maintenance': 'bg-orange-500 text-white',
      'cleaning': 'bg-purple-500 text-white',
      'in_service': 'bg-yellow-500 text-white'
    };
    return statusColors[status] || 'bg-gray-500 text-white';
  };

  const getTypeIcon = (type: Container['type']) => {
    const typeIcons = {
      'standard': '📦',
      'hi_cube': '📈',
      'hard_top': '🔒',
      'ventilated': '💨',
      'reefer': '❄️',
      'tank': '🛢️',
      'flat_rack': '📋',
      'open_top': '📂'
    };
    return typeIcons[type] || '📦';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-gray-900 text-white rounded-xl p-4 shadow-2xl max-w-sm animate-slide-in-up">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="text-2xl">{getTypeIcon(container.type)}</div>
          <div>
            <div className="font-bold text-lg">{container.number}</div>
            <div className="text-sm opacity-75">{container.client}</div>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 opacity-75" />
              <span>Type & Size:</span>
            </div>
            <span className="font-medium capitalize">
              {container.type.replace('_', ' ')} • {container.size}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4 opacity-75" />
              <span>Location:</span>
            </div>
            <span className="font-medium">{container.location}</span>
          </div>

          {container.gateInDate && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 opacity-75" />
                <span>Gate In:</span>
              </div>
              <span className="font-medium">{formatDate(container.gateInDate)}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 opacity-75" />
              <span>Status:</span>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(container.status)}`}>
              {container.status.replace('_', ' ')}
            </span>
          </div>

          {container.damage && container.damage.length > 0 && (
            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center space-x-2 text-red-300 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Damage Reports:</span>
              </div>
              <div className="space-y-1">
                {container.damage.slice(0, 2).map((damage, index) => (
                  <div key={index} className="text-xs bg-red-900 bg-opacity-50 px-2 py-1 rounded">
                    {damage}
                  </div>
                ))}
                {container.damage.length > 2 && (
                  <div className="text-xs text-red-300">
                    +{container.damage.length - 2} more...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-gray-700 text-xs opacity-75">
          Click to select • Right-click to pan view
        </div>
      </div>
    </div>
  );
};