import React from 'react';
import { Search, Filter } from 'lucide-react';
import { YardSection } from '../../../types';

interface StackManagementFiltersProps {
  searchTerm: string;
  sectionFilter: string;
  sections: YardSection[];
  onSearchChange: (value: string) => void;
  onSectionFilterChange: (value: string) => void;
}

export const StackManagementFilters: React.FC<StackManagementFiltersProps> = ({
  searchTerm,
  sectionFilter,
  sections,
  onSearchChange,
  onSectionFilterChange
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search stacks or sections..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={sectionFilter}
            onChange={(e) => onSectionFilterChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Sections</option>
            {sections.map(section => (
              <option key={section.id} value={section.id}>{section.name}</option>
            ))}
          </select>
        </div>
        
        <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Filter className="h-4 w-4" />
          <span>Advanced Filter</span>
        </button>
      </div>
    </div>
  );
};