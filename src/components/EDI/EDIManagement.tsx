import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Settings,
  Server,
  Users,
  FileText,
  RotateCcw,
  Trash2,
  Activity,
  XCircle,
  Search,
  Plus
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { DesktopOnlyMessage } from '../Common/DesktopOnlyMessage';
import { useToast } from '../../hooks/useToast';
import { EDIConfigurationModal } from './EDIConfigurationModal';
import { EDIFileProcessor } from './EDIFileProcessor';
import { EDIClientModal } from './EDIClientModal';
import { EDIValidator } from './EDIValidator';
import { ediManagementService, type EDITransmissionLog } from '../../services/edi/ediManagement';
import { ediTransmissionService } from '../../services/edi/ediTransmissionService';
import { ediRealDataService } from '../../services/edi/ediRealDataService';
import { ediConfigurationDatabaseService } from '../../services/edi/ediConfigurationDatabase';
import { type EDIServerConfig } from '../../services/edi/ediConfiguration';

const EDIManagement: React.FC = () => {
  // State management
  const [transmissionLogs, setTransmissionLogs] = useState<EDITransmissionLog[]>([]);
  const [realStats, setRealStats] = useState<any>(null);
  const [clientMappings, setClientMappings] = useState<any[]>([]);
  const [serverConfigs, setServerConfigs] = useState<EDIServerConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingServers, setIsLoadingServers] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'servers' | 'clients' | 'validator' | 'history'>('overview');
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [deletingClientCode, setDeletingClientCode] = useState<string | null>(null);
  const [togglingClientCode, setTogglingClientCode] = useState<string | null>(null);

  const { user } = useAuth();
  const { currentYard } = useYard();
  const toast = useToast();

  // Memoize the validation callback to prevent EDIValidator from unmounting
  const handleValidationComplete = React.useCallback((result: any) => {
    console.log('EDI Validation completed:', result);
  }, []);

  useEffect(() => {
    loadRealData();
  }, []);

  const loadRealData = async () => {
    setIsLoading(true);
    setIsLoadingServers(true);
    setIsLoadingClients(true);
    try {
      // Load real data from services
      const [stats, mappings, configs, logs, clients] = await Promise.all([
        ediRealDataService.getRealEDIStatistics(),
        ediRealDataService.getClientServerMappings(),
        ediConfigurationDatabaseService.getConfigurations(),
        ediTransmissionService.getTransmissionHistory(), // Use database service
        ediRealDataService.getAvailableClients()
      ]);

      setRealStats(stats);
      setClientMappings(mappings);
      setServerConfigs(configs);
      setTransmissionLogs(logs);
      setAvailableClients(clients);
    } catch (error) {
      console.error('Failed to load EDI data:', error);
      toast.error('Failed to load EDI data');
    } finally {
      setIsLoading(false);
      setIsLoadingServers(false);
      setIsLoadingClients(false);
    }
  };

  const refreshData = async () => {
    await loadRealData();
    toast.success('Data refreshed successfully');
  };

  const handleRetryTransmission = async (logId: string) => {
    setIsLoading(true);
    try {
      const result = await ediTransmissionService.retryTransmission(logId);
      if (result.success) {
        await loadRealData();
        toast.success('EDI transmission successful');
      } else {
        toast.error(`Retry failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('Retry failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleClientEDI = async (clientCode: string, enabled: boolean) => {
    try {
      setTogglingClientCode(clientCode);
      await ediRealDataService.toggleClientEDI(clientCode, enabled);
      await loadRealData();
      toast.success(`EDI ${enabled ? 'enabled' : 'disabled'} for client`);
    } catch (error) {
      toast.error('Failed to update client EDI status');
    } finally {
      setTogglingClientCode(null);
    }
  };

  const handleEditClient = (mapping: any) => {
    setEditingClient(mapping);
    setShowClientModal(true);
  };

  const handleCreateClient = () => {
    setEditingClient(null);
    setShowClientModal(true);
  };

  const handleDeleteClient = async (clientCode: string) => {
    if (window.confirm('Are you sure you want to remove EDI configuration for this client?')) {
      try {
        setDeletingClientCode(clientCode);
        await ediRealDataService.deleteClientEDI(clientCode);
        await loadRealData();
        toast.success('Client EDI configuration removed');
      } catch (error) {
        toast.error('Failed to remove client EDI configuration');
      } finally {
        setDeletingClientCode(null);
      }
    }
  };

  const handleSaveClient = async (clientData: any) => {
    try {
      // Use the new saveClientEDISettings function to properly create/update edi_client_settings
      await ediRealDataService.saveClientEDISettings({
        clientCode: clientData.clientCode,
        clientName: clientData.clientName,
        ediEnabled: clientData.ediEnabled,
        enableGateIn: clientData.enableGateIn,
        enableGateOut: clientData.enableGateOut,
        serverId: clientData.serverId,
        priority: clientData.priority,
        notes: clientData.notes,
      });

      toast.success(editingClient ? 'Client EDI configuration updated' : 'Client EDI configuration created');
      await loadRealData();
      setShowClientModal(false);
      setEditingClient(null);
    } catch (error) {
      console.error('Error saving client configuration:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save client configuration');
    }
  };

  const canManageEDI = user?.role === 'admin' || user?.role === 'supervisor';

  // Memoize DesktopContent to prevent unnecessary re-renders and unmounting of child components
  const DesktopContent = React.useMemo(() => () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">EDI Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage EDI transmissions, server configurations, and client settings
          </p>
        </div>
        {currentYard && (
          <div className="text-right text-sm text-gray-600">
            <div>Current Yard: {currentYard.name}</div>
            <div className="text-xs">{currentYard.code}</div>
          </div>
        )}
        <div className="flex space-x-3">
          <button
            onClick={() => setShowConfiguration(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Configuration</span>
          </button>
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'servers', label: 'FTP/SFTP Servers', icon: Server },
            { id: 'clients', label: 'Client EDI Settings', icon: Users },
            { id: 'validator', label: 'EDI Validator', icon: CheckCircle },
            { id: 'history', label: 'Transmission History', icon: FileText }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          {realStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-blue-600 mb-2">
                      Total Operations
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {realStats.totalOperations.toLocaleString()}
                    </div>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600 opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-green-600 mb-2">
                      EDI Success Rate
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                      {realStats.successRate.toFixed(1)}%
                    </div>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-purple-600 mb-2">
                      Clients with EDI
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {realStats.clientsWithEdi} / {realStats.totalClients}
                    </div>
                  </div>
                  <Users className="h-8 w-8 text-purple-600 opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-orange-600 mb-2">
                      Servers Configured
                    </div>
                    <div className="text-2xl font-bold text-orange-900">
                      {serverConfigs.filter(s => s.enabled).length}
                    </div>
                  </div>
                  <Server className="h-8 w-8 text-orange-600 opacity-50" />
                </div>
              </div>
            </div>
          )}

          {/* File Processor */}
          <EDIFileProcessor 
            onProcessComplete={() => {
              // Don't call refreshData here as it causes re-render and loses file state
              // Files are processed independently
            }} 
          />

          {/* Recent Operations */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent EDI Operations</h3>
            </div>
            <div className="p-6">
              {realStats?.recentOperations?.length > 0 ? (
                <div className="space-y-4">
                  {realStats.recentOperations.slice(0, 5).map((operation: any) => (
                    <div
                      key={operation.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {operation.ediTransmitted ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{operation.containerNumber}</p>
                          <p className="text-sm text-gray-600">
                            {operation.type} • {operation.clientName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-900">
                          {operation.createdAt.toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {operation.ediTransmitted ? 'EDI Sent' : 'No EDI'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No recent operations</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'servers' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">FTP/SFTP Server Configuration</h3>
              <button
                onClick={() => setShowConfiguration(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Server className="h-4 w-4" />
                <span>Configure Servers</span>
              </button>
            </div>
          </div>
          <div className="p-6">
            {isLoadingServers ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
                  <span className="text-gray-600">Loading server configurations...</span>
                </div>
              </div>
            ) : serverConfigs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {serverConfigs.map((config) => (
                  <div key={config.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{config.name}</h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        config.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {config.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {config.type} • {config.host}:{config.port}
                    </p>
                    <p className="text-xs text-gray-500">
                      {config.assignedClients?.length || 0} clients assigned
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No servers configured</p>
                <button
                  onClick={() => setShowConfiguration(true)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Configure your first server
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Client EDI Settings</h3>
              <button
                onClick={handleCreateClient}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Client</span>
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="p-6">
            {isLoadingClients ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
                  <span className="text-gray-600">Loading client configurations...</span>
                </div>
              </div>
            ) : clientMappings.length > 0 ? (
              <div className="space-y-4">
                {clientMappings
                  .filter(mapping => 
                    !clientSearchTerm || 
                    mapping.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                    mapping.clientCode.toLowerCase().includes(clientSearchTerm.toLowerCase())
                  )
                  .map((mapping) => (
                  <div key={mapping.clientCode} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{mapping.clientName}</h4>
                          <p className="text-sm text-gray-600">{mapping.clientCode}</p>
                          {mapping.serverConfig ? (
                            <p className="text-xs text-gray-500 mt-1">
                              Server: {mapping.serverConfig.name} ({mapping.serverConfig.host})
                            </p>
                          ) : (
                            <p className="text-xs text-red-500 mt-1">
                              No server assigned
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              mapping.ediEnabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              EDI: {mapping.ediEnabled ? 'ON' : 'OFF'}
                            </span>
                            {mapping.hasOperations && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {mapping.recentOperationsCount} recent ops
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditClient(mapping)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit client configuration"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleClientEDI(mapping.clientCode, !mapping.ediEnabled)}
                            disabled={togglingClientCode === mapping.clientCode}
                            className={`px-3 py-1 text-xs font-medium rounded disabled:opacity-50 ${
                              mapping.ediEnabled
                                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {togglingClientCode === mapping.clientCode ? (
                              <div className="flex items-center space-x-1">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                <span>...</span>
                              </div>
                            ) : (
                              mapping.ediEnabled ? 'Disable' : 'Enable'
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteClient(mapping.clientCode)}
                            disabled={deletingClientCode === mapping.clientCode}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Remove EDI configuration"
                          >
                            {deletingClientCode === mapping.clientCode ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No clients configured for EDI</p>
                <button
                  onClick={handleCreateClient}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Configure your first client
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'validator' && (
        <div className="space-y-6">
          <EDIValidator 
            key="edi-validator-persistent"
            onValidationComplete={handleValidationComplete}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Transmission History</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Recent EDI transmissions. Click icons to retry failed transmissions, view errors, or copy details.
                </p>
              </div>
              <button
                onClick={() => {
                  const csvData = ediManagementService.exportTransmissionLogs();
                  const blob = new Blob([csvData], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `edi_transmission_logs_${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success('Transmission logs exported');
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Container
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attempts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transmission Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transmissionLogs.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{log.containerNumber}</div>
                      <div className="text-sm text-gray-500">{log.fileName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        log.operation === 'GATE_IN'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {log.operation.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {log.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {log.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                        {log.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                        {log.status === 'retrying' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          log.status === 'success' ? 'bg-green-100 text-green-800' :
                          log.status === 'failed' ? 'bg-red-100 text-red-800' :
                          log.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {log.status.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-gray-900">{log.attempts || 0}</span>
                        {log.attempts > 1 && (
                          <span className="text-xs text-gray-500">retries</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{log.partnerCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.lastAttempt.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {log.lastAttempt.toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {log.status === 'failed' && (
                          <button
                            onClick={() => handleRetryTransmission(log.id)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Retry transmission"
                            disabled={isLoading}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        {log.errorMessage && (
                          <button
                            onClick={() => {
                              toast.error(log.errorMessage || 'Unknown error', { duration: 10000 });
                            }}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            title="View error details"
                          >
                            <AlertCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const details = `
EDI Transmission Details
========================
Container: ${log.containerNumber}
Operation: ${log.operation}
Status: ${log.status}
Partner: ${log.partnerCode}
File: ${log.fileName}
Size: ${log.fileSize} bytes
Attempts: ${log.attempts}
Last Attempt: ${log.lastAttempt.toLocaleString()}
Created: ${log.createdAt.toLocaleString()}
${log.errorMessage ? `\nError: ${log.errorMessage}` : ''}
${log.acknowledgmentReceived ? `\nAcknowledged: ${log.acknowledgmentReceived.toLocaleString()}` : ''}
                            `.trim();
                            
                            navigator.clipboard.writeText(details);
                            toast.success('Details copied to clipboard');
                          }}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 transition-colors"
                          title="Copy details to clipboard"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        {log.status === 'success' && !log.errorMessage && (
                          <span className="text-xs text-gray-400 italic">No actions needed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transmissionLogs.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No transmission logs found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  ), [
    activeTab,
    realStats,
    serverConfigs,
    clientMappings,
    transmissionLogs,
    isLoading,
    isLoadingServers,
    isLoadingClients,
    currentYard,
    clientSearchTerm,
    togglingClientCode,
    deletingClientCode,
    handleValidationComplete
  ]);

  if (!canManageEDI) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to access EDI management.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Only Message for Mobile */}
      <div className="lg:hidden">
        <DesktopOnlyMessage
          moduleName="EDI Management"
          reason="Managing EDI messages, server configurations, transmission logs, and technical configurations requires detailed interfaces optimized for desktop."
        />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <DesktopContent />
      </div>

      {/* Configuration Modal */}
      <EDIConfigurationModal
        isOpen={showConfiguration}
        onClose={() => setShowConfiguration(false)}
      />

      {/* Client EDI Modal */}
      <EDIClientModal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClient}
        editingClient={editingClient}
        availableClients={availableClients}
        serverConfigs={serverConfigs}
        configuredClients={clientMappings.map(m => m.clientCode)}
      />
    </>
  );
};

export default EDIManagement;