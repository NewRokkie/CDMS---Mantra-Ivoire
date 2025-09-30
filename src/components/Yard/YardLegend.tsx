import React from 'react';
import { Package, AlertTriangle, Wrench, Droplets, Eye, EyeOff } from 'lucide-react';

export const YardLegend: React.FC = () => {
  const legendItems = [
    {
      color: 'bg-gray-300',
      label: 'Available Slot',
      icon: Package,
      description: 'Empty container position'
    },
    {
      color: 'bg-blue-500',
      label: 'Container In Depot',
      icon: Package,
      description: 'Container stored in yard'
    },
    {
      color: 'bg-orange-500',
      label: 'Under Maintenance',
      icon: Wrench,
      description: 'Container being repaired'
    },
    {
      color: 'bg-purple-500',
      label: 'Being Cleaned',
      icon: Droplets,
      description: 'Container in cleaning process'
    },
    {
      color: 'bg-red-500',
      label: 'Damaged Container',
      icon: AlertTriangle,
      description: 'Container with damage reports'
    },
    {
      color: 'border-yellow-400 border-2',
      label: 'Selected Container',
      icon: Eye,
      description: 'Currently selected container'
    }
  ];

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg p-4 min-w-64">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Legend</h3>
        <Package className="h-4 w-4 text-gray-400" />
      </div>
      
      <div className="space-y-2">
        {legendItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded ${item.color} flex-shrink-0`}></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </div>
              <Icon className="h-3 w-3 text-gray-400 flex-shrink-0" />
            </div>
          );
        })}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-600">
          <div className="flex items-center space-x-1 mb-1">
            <span>💡</span>
            <span className="font-medium">Tips:</span>
          </div>
          <div className="space-y-1 text-xs">
            <div>• Click containers to select</div>
            <div>• Right-click + drag to pan</div>
            <div>• Scroll to zoom in/out</div>
          </div>
        </div>
      </div>
    </div>
  );
};