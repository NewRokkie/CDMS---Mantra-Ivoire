import React, { useState } from 'react';
import { Search, X, Package, MapPin, Calendar, User, Loader } from 'lucide-react';
import { Container } from '../../types';

interface YardSearchPanelProps {
  containers: Container[];
  selectedContainer: Container | null;
  searchQuery: string;
  isSearching: boolean;
  onContainerSearch: (containerNumber: string) => void;
  onClearSearch: () => void;
  onContainerSelect: (container: Container) => void;
}

export const YardSearchPanel: React.FC<YardSearchPanelProps> = ({
  containers,
  selectedContainer,
  searchQuery,
  isSearching,
  onContainerSearch,
  onClearSearch,
  onContainerSelect
}) => {
  const [inputValue, setInputValue] = useState('');

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

  const filteredContainers = containers.filter(container =>
    container.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    container.client.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Container Search</h3>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter container number..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Search Results */}
      <div className="max-h-96 overflow-y-auto">
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
          {(searchQuery ? filteredContainers : containers).map((container) => (
            <div
              key={container.id}
              onClick={() => onContainerSelect(container)}
              className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                selectedContainer?.id === container.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Package className="h-4 w-4 text-gray-400" />
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
                      <span>{container.type} • {container.size}</span>
                    </div>
                    
                    {container.gateInDate && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3" />
                        <span>Gate In: {container.gateInDate.toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {containers.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No containers found</p>
            <p className="text-sm">Try adjusting your search criteria</p>
          </div>
        )}
      </div>

      {/* Selected Container Details */}
      {selectedContainer && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Selected Container</h4>
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
              <span className="font-medium">{selectedContainer.type} • {selectedContainer.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                selectedContainer.status === 'in_depot' ? 'bg-green-100 text-green-800' :
                selectedContainer.status === 'out_depot' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {selectedContainer.status.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Location:</span>
              <span className="font-medium">{selectedContainer.location}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};