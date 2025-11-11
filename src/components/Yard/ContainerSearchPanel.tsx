import React, { useState, useMemo } from 'react';
import { Search, Filter, X, Package, MapPin, Calendar, User, AlertTriangle } from 'lucide-react';
import { Container } from '../../types';

interface ContainerSearchPanelProps {
  containers: Container[];
  searchTerm: string;
  onSearch: (term: string) => void;
  selectedContainer: Container | null;
  onContainerSelect: (container: Container | null) => void;
  statusFilter: string;
  onStatusFilterChange: (filter: string) => void;
  clientFilter: string;
  onClientFilterChange: (filter: string) => void;
  uniqueClients: Array<{ code: string; name: string }>;
  canViewAllData: boolean;
}

export const ContainerSearchPanel: React.FC<ContainerSearchPanelProps> = ({
  containers,
  searchTerm,
  onSearch,
  selectedContainer,
  onContainerSelect,
  statusFilter,
  onStatusFilterChange,
  clientFilter,
  onClientFilterChange,
  uniqueClients,
  canViewAllData
}) => {
  const [showFilters, setShowFilters] = useState(false);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];

    return containers
      .filter(container =>
        container.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        container.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        container.location.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 10);
  }, [containers, searchTerm]);

  const getStatusBadge = (status: Container['status']) => {
    const statusConfig = {
      gate_in: { color: 'bg-blue-100 text-blue-800', label: 'Gate In' },
      in_depot: { color: 'bg-green-100 text-green-800', label: 'In Depot' },
      gate_out: { color: 'bg-orange-100 text-orange-800', label: 'Gate Out' },
      out_depot: { color: 'bg-gray-100 text-gray-800', label: 'Out Depot' },
      maintenance: { color: 'bg-yellow-100 text-yellow-800', label: 'Maintenance' },
      cleaning: { color: 'bg-purple-100 text-purple-800', label: 'Cleaning' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
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
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search containers..."
            value={searchTerm}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-12 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {searchResults.map((container) => (
              <button
                key={container.id}
                onClick={() => {
                  onContainerSelect(container);
                  onSearch('');
                }}
                className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{container.number}</div>
                    <div className="text-sm text-gray-600">
                      {canViewAllData ? container.clientName : 'Your Company'} • {container.location}
                    </div>
                  </div>
                  {getStatusBadge(container.status)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Filters</h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <Filter className="h-4 w-4" />
          <span>{showFilters ? 'Hide' : 'Show'}</span>
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="gate_in">Gate In</option>
              <option value="in_depot">In Depot</option>
              <option value="gate_out">Gate Out</option>
              <option value="out_depot">Out Depot</option>
              <option value="maintenance">Maintenance</option>
              <option value="cleaning">Cleaning</option>
              <option value="damaged">Damaged</option>
            </select>
          </div>

          {/* Client Filter */}
          {canViewAllData && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
              <select
                value={clientFilter}
                onChange={(e) => onClientFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Clients</option>
                {uniqueClients.map((client) => (
                  <option key={client.code} value={client.code}>
                    {client.code} - {client.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Container List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">
            Containers ({containers.length})
          </h3>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {containers.slice(0, 20).map((container) => (
            <button
              key={container.id}
              onClick={() => onContainerSelect(container)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                selectedContainer?.id === container.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900 truncate">{container.number}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-600 mb-1">
                    <User className="h-3 w-3" />
                    <span className="truncate">
                      {canViewAllData ? container.clientName : 'Your Company'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-600 mb-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{container.location}</span>
                  </div>
                  {container.gateInDate && (
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(container.gateInDate)}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end space-y-1 ml-2">
                  {getStatusBadge(container.status)}
                  {container.damage && container.damage.length > 0 && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Damaged
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{container.size}</span>
                </div>
              </div>
            </button>
          ))}

          {containers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No containers found</p>
              <p className="text-xs">Try adjusting your search or filters</p>
            </div>
          )}

          {containers.length > 20 && (
            <div className="text-center py-2">
              <span className="text-xs text-gray-500">
                Showing first 20 of {containers.length} containers
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
