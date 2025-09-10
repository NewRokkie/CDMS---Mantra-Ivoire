import React from 'react';
import { Search, Filter, X } from 'lucide-react';

interface GateInSearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filteredCount: number;
}

export const GateInSearchFilter: React.FC<GateInSearchFilterProps> = ({
  searchTerm,
  onSearchChange,
  filteredCount
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by truck number, driver name, booking number, or client..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button className="btn-secondary flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </button>
          {searchTerm && (
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {filteredCount} result{filteredCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};