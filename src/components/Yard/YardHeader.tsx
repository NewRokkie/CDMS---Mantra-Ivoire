import React from 'react';
import { Grid3X3, Move3D } from 'lucide-react';
import { Yard } from '../../types';

interface YardHeaderProps {
  selectedYard: Yard;
  yards: Yard[];
  viewMode: '3d' | 'grid';
  onYardChange: (yardId: string) => void;
  onViewModeChange: (mode: '3d' | 'grid') => void;
}

export const YardHeader: React.FC<YardHeaderProps> = ({
  selectedYard,
  yards,
  viewMode,
  onYardChange,
  onViewModeChange
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Yard Management</h2>
        <p className="text-gray-600">Monitor and manage container yard operations</p>
      </div>
      <div className="flex items-center space-x-3">
        {/* Yard Selector */}
        <select
          value={selectedYard.id}
          onChange={(e) => onYardChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {yards.map(yard => (
            <option key={yard.id} value={yard.id}>
              {yard.name}
            </option>
          ))}
        </select>

        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('3d')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === '3d'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Move3D className="h-4 w-4 mr-1 inline" />
            3D View
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Grid3X3 className="h-4 w-4 mr-1 inline" />
            Grid View
          </button>
        </div>
      </div>
    </div>
  );
};