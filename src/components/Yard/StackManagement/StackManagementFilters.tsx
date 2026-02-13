import React from 'react';
import { Search, Filter } from 'lucide-react';
import { useLanguage } from '../../../hooks/useLanguage';

interface StackManagementFiltersProps {
  searchTerm: string;
  sectionFilter: string;
  statusFilter: 'all' | 'active' | 'inactive';
  sections: string[];
  onSearchChange: (value: string) => void;
  onSectionFilterChange: (value: string) => void;
  onStatusFilterChange: (value: 'all' | 'active' | 'inactive') => void;
}

export const StackManagementFilters: React.FC<StackManagementFiltersProps> = ({
  searchTerm,
  sectionFilter,
  statusFilter,
  sections,
  onSearchChange,
  onSectionFilterChange,
  onStatusFilterChange
}) => {
  const { t } = useLanguage();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:items-center md:justify-between md:space-x-4">
        <div className="flex flex-col space-y-3 md:flex-row md:items-center md:space-y-0 md:space-x-4 flex-1">
          <div className="relative flex-1 md:flex-initial md:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder={t('stack.search')}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex gap-2 md:gap-3">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
              className="flex-1 md:flex-initial px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">{t('stack.allStacks')}</option>
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </select>

            <select
              value={sectionFilter}
              onChange={(e) => onSectionFilterChange(e.target.value)}
              className="flex-1 md:flex-initial px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">{t('stack.allSections')}</option>
              {sections.map((section, index) => (
                <option key={`section-${index}`} value={section.toLowerCase()}>{section}</option>
              ))}
            </select>
          </div>
        </div>
        
        <button className="flex items-center justify-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm whitespace-nowrap">
          <Filter className="h-4 w-4 flex-shrink-0" />
          <span>{t('stack.advancedFilter')}</span>
        </button>
      </div>
    </div>
  );
};
