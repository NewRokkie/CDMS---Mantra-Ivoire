import React, { useState, useEffect } from 'react';
import { Calendar, Filter, X, Save, RotateCcw, Search, Check, ChevronDown } from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';
import { StandardModal } from '../Common/Modal/StandardModal';
import { useSuccessNotification, useInfoNotification } from '../Common/Notifications/NotificationSystem';

export interface FilterOptions {
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
    preset?: string;
  };
  containerSize: string[];
  containerStatus: string[];
  clientCode: string[];
}

interface AdvancedFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  availableOptions?: {
    containerSizes?: string[];
    containerStatuses?: string[];
    clients?: Array<{ code: string; name: string }>;
  };
  isVisible: boolean;
  onClose: () => void;
}

const DATE_PRESETS = [
  { label: 'Today', value: 'today', getDates: () => ({ start: new Date(), end: new Date() }) },
  { label: 'Last 7 days', value: 'last7days', getDates: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: 'Last 30 days', value: 'last30days', getDates: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: 'This month', value: 'thismonth', getDates: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
  { label: 'Custom', value: 'custom', getDates: () => ({ start: null, end: null }) }
];

// Client Filter Component with Search
interface ClientFilterProps {
  clients: Array<{ code: string; name: string }>;
  selectedClients: string[];
  onSelectionChange: (selectedCodes: string[]) => void;
}

const ClientFilter: React.FC<ClientFilterProps> = ({ clients, selectedClients, onSelectionChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClientToggle = (clientCode: string) => {
    const newSelection = selectedClients.includes(clientCode)
      ? selectedClients.filter(code => code !== clientCode)
      : [...selectedClients, clientCode];
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedClients.length === filteredClients.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredClients.map(c => c.code));
    }
  };

  return (
    <div className="relative">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Client</h4>
      
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <span className="text-sm text-gray-700">
          {selectedClients.length === 0 
            ? 'Select clients...' 
            : `${selectedClients.length} client${selectedClients.length > 1 ? 's' : ''} selected`
          }
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Select All Option */}
          <div className="p-2 border-b border-gray-100">
            <label className="flex items-center px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Select All ({filteredClients.length})
              </span>
            </label>
          </div>

          {/* Client List */}
          <div className="max-h-40 overflow-y-auto">
            {filteredClients.length > 0 ? (
              filteredClients.map(client => (
                <label key={client.code} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedClients.includes(client.code)}
                    onChange={() => handleClientToggle(client.code)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-2 flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{client.name}</div>
                    <div className="text-xs text-gray-500">{client.code}</div>
                  </div>
                  {selectedClients.includes(client.code) && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </label>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No clients found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Clients Display */}
      {selectedClients.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedClients.slice(0, 3).map(code => {
            const client = clients.find(c => c.code === code);
            return client ? (
              <span key={code} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                {client.code}
                <button
                  onClick={() => handleClientToggle(code)}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : null;
          })}
          {selectedClients.length > 3 && (
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              +{selectedClients.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  filters,
  onFiltersChange,
  onApplyFilters,
  onResetFilters,
  availableOptions = {},
  isVisible,
  onClose
}) => {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);
  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; filters: FilterOptions }>>([]);

  // Notification hooks
  const showSuccess = useSuccessNotification();
  const showInfo = useInfoNotification();

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    // Load saved filters from localStorage
    const saved = localStorage.getItem('reports-saved-filters');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load saved filters:', error);
      }
    }
  }, []);

  const handleDatePresetChange = (preset: string) => {
    const presetConfig = DATE_PRESETS.find(p => p.value === preset);
    if (presetConfig) {
      const dates = presetConfig.getDates();
      setLocalFilters(prev => ({
        ...prev,
        dateRange: {
          startDate: dates.start,
          endDate: dates.end,
          preset
        }
      }));
    }
  };

  const handleMultiSelectChange = (field: keyof FilterOptions, value: string, checked: boolean) => {
    setLocalFilters(prev => {
      const currentValues = prev[field] as string[];
      const newValues = checked
        ? [...currentValues, value]
        : currentValues.filter(v => v !== value);
      
      return {
        ...prev,
        [field]: newValues
      };
    });
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onApplyFilters();
    onClose();
  };

  const handleResetFilters = () => {
    const resetFilters: FilterOptions = {
      dateRange: { startDate: null, endDate: null },
      containerSize: [],
      containerStatus: [],
      clientCode: []
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onResetFilters();
  };

  const handleSaveFilters = () => {
    const name = prompt('Enter a name for this filter set:');
    if (name && name.trim()) {
      const newSavedFilters = [...savedFilters, { name: name.trim(), filters: localFilters }];
      setSavedFilters(newSavedFilters);
      localStorage.setItem('reports-saved-filters', JSON.stringify(newSavedFilters));
      showSuccess('Filtres sauvegardés', `Configuration "${name.trim()}" enregistrée avec succès`);
    }
  };

  const handleLoadSavedFilter = (savedFilter: { name: string; filters: FilterOptions }) => {
    setLocalFilters(savedFilter.filters);
    showInfo('Filtres chargés', `Configuration "${savedFilter.name}" appliquée`);
  };

  const handleDeleteSavedFilter = (index: number) => {
    const filterName = savedFilters[index]?.name;
    const newSavedFilters = savedFilters.filter((_, i) => i !== index);
    setSavedFilters(newSavedFilters);
    localStorage.setItem('reports-saved-filters', JSON.stringify(newSavedFilters));
    showInfo('Filtre supprimé', `Configuration "${filterName}" supprimée`);
  };

  return (
    <StandardModal
      isOpen={isVisible}
      onClose={onClose}
      title="Advanced Filters"
      subtitle="Filter reports by date range, container properties, and clients"
      icon={Filter}
      size="xl"
      hideDefaultFooter={true}
      customFooter={
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSaveFilters}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Save Filters</span>
            </button>
            <button
              onClick={handleResetFilters}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset All</span>
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Date Range Filter */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-gray-600" />
            Date Range
          </h3>
          
          {/* Date Presets */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {DATE_PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => handleDatePresetChange(preset.value)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  localFilters.dateRange.preset === preset.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {localFilters.dateRange.preset === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={localFilters.dateRange.startDate ? format(localFilters.dateRange.startDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setLocalFilters(prev => ({
                    ...prev,
                    dateRange: {
                      ...prev.dateRange,
                      startDate: e.target.value ? new Date(e.target.value) : null
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={localFilters.dateRange.endDate ? format(localFilters.dateRange.endDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setLocalFilters(prev => ({
                    ...prev,
                    dateRange: {
                      ...prev.dateRange,
                      endDate: e.target.value ? new Date(e.target.value) : null
                    }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Container Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Container Size */}
          {availableOptions.containerSizes && availableOptions.containerSizes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Container Size</h4>
              <div className="space-y-2">
                {availableOptions.containerSizes.map(size => (
                  <label key={size} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={localFilters.containerSize.includes(size)}
                      onChange={(e) => handleMultiSelectChange('containerSize', size, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{size}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Container Status */}
          {availableOptions.containerStatuses && availableOptions.containerStatuses.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Container Status</h4>
              <div className="space-y-2">
                {availableOptions.containerStatuses.map(status => (
                  <label key={status} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={localFilters.containerStatus.includes(status)}
                      onChange={(e) => handleMultiSelectChange('containerStatus', status, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Client */}
          {availableOptions.clients && availableOptions.clients.length > 0 && (
            <ClientFilter
              clients={availableOptions.clients}
              selectedClients={localFilters.clientCode}
              onSelectionChange={(selectedCodes) => 
                setLocalFilters(prev => ({ ...prev, clientCode: selectedCodes }))
              }
            />
          )}
        </div>

        {/* Saved Filters */}
        {savedFilters.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Saved Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedFilters.map((savedFilter, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <button
                    onClick={() => handleLoadSavedFilter(savedFilter)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex-1 text-left"
                  >
                    {savedFilter.name}
                  </button>
                  <button
                    onClick={() => handleDeleteSavedFilter(index)}
                    className="ml-2 p-1 text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </StandardModal>
  );
};