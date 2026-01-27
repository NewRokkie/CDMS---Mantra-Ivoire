import React, { useState, useEffect } from 'react';
import { Building, Search, Check, ChevronDown, Loader } from 'lucide-react';
import { ContainerFormData } from '../ContainerEditModal';
import { clientService, containerService } from '../../../services/api';
import { handleError } from '../../../services/errorHandling';

interface ClientInformationStepProps {
  formData: ContainerFormData;
  updateFormData: (updates: Partial<ContainerFormData>) => void;
}

interface ClientOption {
  id: string;
  code: string;
  name: string;
  activeContainers: number;
  totalCapacity: number;
}

export const ClientInformationStep: React.FC<ClientInformationStepProps> = ({
  formData,
  updateFormData
}) => {
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch clients from database
  useEffect(() => {
    async function loadClients() {
      try {
        setLoading(true);
        const dbClients = await clientService.getAll();
        const allContainers = await containerService.getAll();

        // Transform clients to ClientOption format with container counts
        const clientOptions: ClientOption[] = dbClients
          .filter(client => client.isActive)
          .map(client => {
            const activeContainers = allContainers.filter(
              c => c.clientId === client.id || c.clientCode === client.code
            ).length;

            return {
              id: client.id,
              code: client.code,
              name: client.name,
              activeContainers,
              totalCapacity: client.creditLimit || 500 // Use credit limit as proxy for capacity
            };
          });

        // Sort by name
        clientOptions.sort((a, b) => a.name.localeCompare(b.name));

        setClients(clientOptions);
      } catch (error) {
        handleError(error, 'ClientInformationStep.loadClients');
        setClients([]);
      } finally {
        setLoading(false);
      }
    }

    loadClients();
  }, []);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.code.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectedClient = clients.find(client =>
    client.name === formData.client || client.code === formData.clientCode
  );

  const handleClientSelect = (client: ClientOption) => {
    updateFormData({
      client: client.name,
      clientCode: client.code,
      clientId: client.id
    });
    setIsClientDropdownOpen(false);
    setClientSearch('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
        <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
          <Building className="h-5 w-5 mr-2" />
          Client Assignment
          {loading && <Loader className="h-4 w-4 ml-2 animate-spin text-purple-600" />}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-purple-800 mb-2">
              Client Name *
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                className={`w-full flex items-center justify-between p-4 bg-white border-2 rounded-xl transition-all duration-300 ${
                  isClientDropdownOpen
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20 ring-4 ring-purple-500/10'
                    : selectedClient
                    ? 'border-purple-400 shadow-md shadow-purple-400/10'
                    : 'border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Building className={`h-5 w-5 ${selectedClient ? 'text-purple-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    {selectedClient ? (
                      <>
                        <div className="font-medium text-gray-900">{selectedClient.name}</div>
                      </>
                    ) : (
                      <div className="text-gray-500">Select client...</div>
                    )}
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
                  isClientDropdownOpen ? 'rotate-180' : ''
                }`} />
              </button>

              {/* Client Dropdown */}
              {isClientDropdownOpen && (
                <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-96 overflow-hidden">
                  {/* Search */}
                  <div className="p-3 border-b border-gray-100 bg-gray-50">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search clients..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Client list */}
                  <div className="max-h-80 overflow-y-auto">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader className="h-6 w-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-sm text-gray-500">Loading clients...</span>
                      </div>
                    ) : filteredClients.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Building className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No clients found</p>
                        {clientSearch && (
                          <p className="text-xs text-gray-400 mt-1">Try adjusting your search</p>
                        )}
                      </div>
                    ) : (
                      filteredClients.map((client) => {
                      const isSelected = selectedClient?.id === client.id;
                      const utilizationPercentage = (client.activeContainers / client.totalCapacity) * 100;

                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => handleClientSelect(client)}
                          className={`w-full text-left p-4 transition-all duration-200 group border-b border-gray-100 last:border-b-0 ${
                            isSelected
                              ? 'bg-purple-50 border-l-4 border-purple-500'
                              : 'hover:bg-gray-50 border-l-4 border-transparent'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1">
                              <div className={`p-2 rounded-lg transition-all duration-200 ${
                                isSelected
                                  ? 'bg-purple-100 text-purple-600'
                                  : 'bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600'
                              }`}>
                                <Building className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">{client.name}</div>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-xs text-gray-500">
                                    {client.activeContainers} / {client.totalCapacity} containers
                                  </span>
                                  <div className="flex-1 bg-gray-200 rounded-full h-1.5 max-w-[100px]">
                                    <div
                                      className="bg-purple-500 h-1.5 rounded-full transition-all"
                                      style={{ width: `${utilizationPercentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-5 w-5 text-purple-600 flex-shrink-0 ml-2" />
                            )}
                          </div>
                        </button>
                      );
                    })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-800 mb-2">
              Client Code
            </label>
            <input
              type="text"
              value={formData.clientCode}
              readOnly
              disabled
              className="w-full bg-gray-100 flex items-center justify-between p-4 border-2 rounded-xl cursor-not-allowed"
              placeholder="Auto-filled"
            />
          </div>
        </div>

        {selectedClient && (
          <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Client Overview</h5>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Active Containers:</span>
                <span className="ml-2 font-medium text-gray-900">{selectedClient.activeContainers}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Capacity:</span>
                <span className="ml-2 font-medium text-gray-900">{selectedClient.totalCapacity}</span>
              </div>
              <div>
                <span className="text-gray-600">Available Space:</span>
                <span className="ml-2 font-medium text-gray-900">{selectedClient.totalCapacity - selectedClient.activeContainers}</span>
              </div>
              <div>
                <span className="text-gray-600">Utilization:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {((selectedClient.activeContainers / selectedClient.totalCapacity) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Building className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h5 className="text-sm font-medium text-purple-900 mb-1">Client Assignment</h5>
            <p className="text-xs text-purple-700">
              Assign this container to a client for tracking and billing purposes. 
              The client code is automatically populated based on your selection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
