import React from 'react';
import { List, LayoutGrid } from 'lucide-react';

interface ReleaseOrderViewToggleProps {
  viewMode: 'table' | 'detailed';
  onViewModeChange: (mode: 'table' | 'detailed') => void;
}

export const ReleaseOrderViewToggle: React.FC<ReleaseOrderViewToggleProps> = ({
  viewMode,
  onViewModeChange
}) => {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onViewModeChange('table')}
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
        onClick={() => onViewModeChange('detailed')}
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
  );
};