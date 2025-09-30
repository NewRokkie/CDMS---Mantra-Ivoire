import React, { useState } from 'react';
import { Search, X, Package, MapPin, Calendar, User, Loader, Filter, Eye } from 'lucide-react';
import { Container } from '../../types';

interface ContainerSearchPanelProps {
  containers: Container[];
  selectedContainer: Container | null;
  searchQuery: string;
  isSearching: boolean;
  onContainerSearch: (containerNumber: string) => void;
  onClearSearch: () => void;
  onContainerSelect: (container: Container) => void;
}

export const ContainerSearchPanel: React.FC<ContainerSearchPanelProps> = ({
  containers,
  selectedContainer,
  searchQuery,
  isSearching,
  onContainerSearch,
  onClearSearch,
  onContainerSelect
}) => {
  const [inputValue, setInputValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onContainerSearch(inputValue.trim());
    }
  };

  const handleClear = () => {
    setInputValue('');
    onClearSearch();
  };

  // Get unique clients for filter
  const uniqueClients = Array.from(
    new Set(containers.map(c => c.clientCode).filter(Boolean))
  ).map(code => {
    const container = containers.find(c => c.clientCode === code);
    return { code, name: container?.client || code };
  });

  // Filter containers based on search and filters
  const getFilteredContainers = () => {
    let filtered = containers;

    if (searchQuery) {
      filtered = filtered.filter(container =>
        container.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        container.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        container.clientCode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(container => container.status === statusFilter);
    }

    if (clientFilter !== 'all') {
      filtered = filtered.filter(container => container.clientCode === clientFilter);
    }

    return filtered;
  };

  const filteredContainers = getFilteredContainers();

  const getClientColor = (clientCode?: string) => {
    const clientColors: { [key: string]: string } = {
      'MAEU': 'bg-blue-100 text-blue-800',
      'MSCU': 'bg-red-100 text-red-800',
      'CMDU': 'bg-green-100 text-green-800',
      'SHIP001': 'bg-purple-100 text-purple-800',
      'HLCU': 'bg-orange-100 text-orange-800',
      'SNFW': 'bg-cyan-100 text-cyan-800'
    };
    return clientColors[clientCode || ''] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: Container['status']) => {
    const statusColors = {
      'in_depot': 'bg-green-100 text-green-800',
      'out_depot': 'bg-blue-100 text-blue-800',
      'maintenance': 'bg-orange-100 text-orange-800',
      'cleaning': 'bg-purple-100 text-purple-800',
      'in_service': 'bg-yellow-100 text-yellow-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Search className="h-5 w-5 mr-2" />
          Container Search
        </h3>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter container number..."
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {(inputValue || searchQuery) && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <button
            type="submit"
            disabled={!inputValue.trim() || isSearching}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                <span>Search & Locate</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Status</option>
              <option value="in_depot">In Depot</option>
              <option value="maintenance">Maintenance</option>
              <option value="cleaning">Cleaning</option>
              <option value="out_depot">Out Depot</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client Filter</label>
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Clients</option>
              {uniqueClients.map(client => (
                <option key={client.code} value={client.code}>
                  {client.code} - {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery && (
          <div className="p-3 bg-blue-50 border-b border-blue-200">
            <div className="text-sm text-blue-800">
              {filteredContainers.length > 0 ? (
                <>Found {filteredContainers.length} container{filteredContainers.length !== 1 ? 's' : ''} matching "{searchQuery}"</>
              ) : (
                <>No containers found matching "{searchQuery}"</>
              )}
            </div>
          </div>
        )}

        {/* Container List */}
        <div className="divide-y divide-gray-200">
          {filteredContainers.map((container) => (
            <div
              key={container.id}
              onClick={() => onContainerSelect(container)}
              className={`p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                selectedContainer?.id === container.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">{getTypeIcon(container.type)}</span>
                    <span className="font-medium text-gray-900">{container.number}</span>
                    {selectedContainer?.id === container.id && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Selected
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <User className="h-3 w-3" />
                      <span>{container.client}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getClientColor(container.clientCode)}`}>
                        {container.clientCode}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-3 w-3" />
                      <span>{container.location}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Package className="h-3 w-3" />
                      <span className="capitalize">{container.type.replace('_', ' ')} • {container.size}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 flex items-center justify-center">
                        <div className={`h-2 w-2 rounded-full ${
                          container.damage && container.damage.length > 0 ? 'bg-red-500' :
                          container.status === 'in_depot' ? 'bg-green-500' :
                          container.status === 'maintenance' ? 'bg-orange-500' :
                          container.status === 'cleaning' ? 'bg-purple-500' : 'bg-gray-500'
                        }`}></div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(container.status)}`}>
                        {container.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    {container.gateInDate && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3" />
                        <span>Gate In: {container.gateInDate.toLocaleDateString()}</span>
                      </div>
                    )}

                    {container.damage && container.damage.length > 0 && (
                      <div className="flex items-center space-x-2 text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span className="text-xs">{container.damage.length} damage report{container.damage.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredContainers.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No containers found</h3>
            <p className="text-sm">
              {searchQuery || statusFilter !== 'all' || clientFilter !== 'all'
                ? "Try adjusting your search criteria or filters"
                : "No containers available in this yard"
              }
            </p>
          </div>
        )}
      </div>

      {/* Selected Container Details */}
      {selectedContainer && (
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Selected Container</h4>
            <button
              onClick={() => onContainerSelect(null)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Number:</span>
              <span className="font-medium">{selectedContainer.number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Client:</span>
              <span className="font-medium">{selectedContainer.client}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium capitalize">{selectedContainer.type.replace('_', ' ')} • {selectedContainer.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedContainer.status)}`}>
                {selectedContainer.status.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location:</span>
              <span className="font-medium">{selectedContainer.location}</span>
            </div>
            {selectedContainer.damage && selectedContainer.damage.length > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <span className="text-gray-600 text-xs">Damage Reports:</span>
                <div className="mt-1 space-y-1">
                  {selectedContainer.damage.map((damage, index) => (
                    <div key={index} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                      {damage}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};