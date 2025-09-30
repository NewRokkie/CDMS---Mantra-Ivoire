import React from 'react';
import { Layers, Grid3X3 } from 'lucide-react';
import { Container } from '../../types';

interface YardZoneSelectorProps {
  selectedZone: string;
  onZoneChange: (zone: string) => void;
  containers: Container[];
}

export const YardZoneSelector: React.FC<YardZoneSelectorProps> = ({
  selectedZone,
  onZoneChange,
  containers
}) => {
  // Calculate zone statistics
  const getZoneStats = (zone: string) => {
    let zoneContainers = containers;
    
    if (zone !== 'all') {
      zoneContainers = containers.filter(container => {
        const stackMatch = container.location.match(/Stack S(\d+)/);
        if (stackMatch) {
          const stackNumber = parseInt(stackMatch[1]);
          switch (zone) {
            case 'top': return stackNumber <= 31;
            case 'center': return stackNumber > 31 && stackNumber <= 55;
            case 'bottom': return stackNumber > 55;
            default: return true;
          }
        }
        return true;
      });
    }

    return {
      total: zoneContainers.length,
      inDepot: zoneContainers.filter(c => c.status === 'in_depot').length,
      maintenance: zoneContainers.filter(c => c.status === 'maintenance').length,
      damaged: zoneContainers.filter(c => c.damage && c.damage.length > 0).length
    };
  };

  const zones = [
    { id: 'all', name: 'All Zones', icon: Grid3X3, color: 'bg-gray-500' },
    { id: 'top', name: 'Top Section', icon: Layers, color: 'bg-blue-500' },
    { id: 'center', name: 'Center Section', icon: Layers, color: 'bg-orange-500' },
    { id: 'bottom', name: 'Bottom Section', icon: Layers, color: 'bg-green-500' }
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-900">Yard Zones</h3>
      
      <div className="space-y-2">
        {zones.map((zone) => {
          const stats = getZoneStats(zone.id);
          const Icon = zone.icon;
          const isSelected = selectedZone === zone.id;
          
          return (
            <button
              key={zone.id}
              onClick={() => onZoneChange(zone.id)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 ${zone.color} rounded-lg`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{zone.name}</div>
                    <div className="text-xs text-gray-600">
                      {stats.total} containers
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{stats.inDepot}</div>
                  <div className="text-xs text-gray-500">active</div>
                </div>
              </div>
              
              {/* Zone breakdown */}
              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-600">
                <span>🟢 {stats.inDepot} Active</span>
                <span>🟠 {stats.maintenance} Maintenance</span>
                {stats.damaged > 0 && <span>🔴 {stats.damaged} Damaged</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};