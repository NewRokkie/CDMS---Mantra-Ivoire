import React, { useState, useEffect } from 'react';
import { Building2, Search, Check, ChevronDown, Loader, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClients() {
      try {
        setLoading(true);
        const dbClients = await clientService.getAll();
        const allContainers = await containerService.getAll();

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
              totalCapacity: client.creditLimit || 500
            };
          });

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

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-purple-500';
  };

  return (
    <div className="depot-step-spacing">
      {/* Main Client Selection Section */}
      <div className="depot-section">
        <h4 className="depot-section-header">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-3">
            <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-lg">Client Assignment</span>
              {loading && <Loader className="h-5 w-5 animate-spin text-purple-600" />}
            </div>
            <p className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-0.5">
              Select the client who owns this container
            </p>
          </div>
        </h4>

        <div className="depot-form-grid">
          {/* Client Selection */}
          <div className="space-y-2 md:col-span-2">
            <label className="label">
              Client <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                className={`w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-2 rounded-xl transition-all duration-300 ${
                  isClientDropdownOpen
                    ? 'border-purple-500 shadow-lg shadow-purple-500/20 ring-4 ring-purple-500/10'
                    : selectedClient
                    ? 'border-purple-400 shadow-md shadow-purple-400/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedClient ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Building2 className={`h-5 w-5 ${selectedClient ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
                  </div>
                  <div className="text-left">
                    {selectedClient ? (
                      <>
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{selectedClient.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{selectedClient.code}</div>
                      </>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">Select a client...</div>
                    )}
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
                  isClientDropdownOpen ? 'rotate-180' : ''
                }`} />
              </button>

              {/* Client Dropdown */}
              {isClientDropdownOpen && (
                <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-96 overflow-hidden">
                  {/* Search */}
                  <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search clients..."
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-800 dark:text-white"
                        autoFocus
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
                        <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">{t('common.noResults', 'No results found')}</p>
                        {clientSearch && (
                          <p className="text-xs text-gray-400 mt-1">{t('common.tryAdjustingSearch', 'Try adjusting your search')}</p>
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
                            className={`w-full text-left p-4 transition-all duration-200 group border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                              isSelected
                                ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-400'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-800 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                                }`}>
                                  <Building2 className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{client.name}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-1">{client.code}</div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {client.activeContainers} / {client.totalCapacity} containers
                                    </span>
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 max-w-[100px]">
                                      <div
                                        className={`h-1.5 rounded-full transition-all ${getUtilizationColor(utilizationPercentage)}`}
                                        style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center flex-shrink-0 ml-2">
                                  <Check className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
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

          {/* Client Code (Read-only) */}
          <div className="space-y-2">
            <label className="label">Client Code</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <span className="text-gray-400 text-sm">#</span>
              </div>
              <input
                type="text"
                value={formData.clientCode}
                readOnly
                disabled
                className="w-full pl-8 pr-4 py-3 bg-gray-100 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl cursor-not-allowed text-gray-500 dark:text-gray-400 font-mono"
                placeholder="Auto-filled"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Auto-populated from client selection</p>
          </div>

          {/* Client Status Summary */}
          <div className="space-y-2">
            <label className="label">Client Status</label>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              {selectedClient ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${selectedClient.activeContainers < selectedClient.totalCapacity ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {selectedClient.activeContainers < selectedClient.totalCapacity ? 'Space Available' : 'At Capacity'}
                    </span>
                  </div>
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                    {((selectedClient.activeContainers / selectedClient.totalCapacity) * 100).toFixed(0)}%
                  </span>
                </div>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">Select a client to view status</span>
              )}
            </div>
          </div>
        </div>

        {/* Client Details Card */}
        {selectedClient && (
          <div className="mt-6 p-5 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Users className="h-4 w-4 mr-2 text-purple-600" />
              Client Overview
            </h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-mono font-semibold text-purple-600 dark:text-purple-400">{selectedClient.activeContainers}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active Containers</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-mono font-semibold text-gray-900 dark:text-gray-100">{selectedClient.totalCapacity}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Capacity</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-mono font-semibold text-green-600 dark:text-green-400">
                  {selectedClient.totalCapacity - selectedClient.activeContainers}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Available Space</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-2xl font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {((selectedClient.activeContainers / selectedClient.totalCapacity) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Utilization</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl p-5">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-800 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Client Assignment</h5>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Assign this container to a client for tracking and billing purposes.
              The client code is automatically populated based on your selection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
