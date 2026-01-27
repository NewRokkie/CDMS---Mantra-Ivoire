import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  TestTube,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Loader,
  Settings,
  Users,
  Search
} from 'lucide-react';
import { ediConfigurationDatabaseService } from '../../services/edi/ediConfigurationDatabase';
import { EDIServerConfig } from '../../services/edi/ediConfiguration';
import { useToast } from '../../hooks/useToast';

interface EDIConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EDIConfigurationModal: React.FC<EDIConfigurationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [configurations, setConfigurations] = useState<EDIServerConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<EDIServerConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState<Partial<EDIServerConfig>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [availableClients, setAvailableClients] = useState<string[]>([]);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      loadConfigurations();
      loadAvailableClients();
    }
  }, [isOpen]);

  const loadAvailableClients = async () => {
    try {
      const clients = await ediConfigurationDatabaseService.getAvailableClients();
      setAvailableClients(clients);
    } catch (error) {
      toast.error(`Failed to load available clients: ${error}`);
      setAvailableClients([]);
    }
  };

  useEffect(() => {
    const searchClients = async () => {
      try {
        if (clientSearchQuery) {
          const filtered = await ediConfigurationDatabaseService.searchClients(clientSearchQuery);
          setAvailableClients(filtered);
        } else {
          const clients = await ediConfigurationDatabaseService.getAvailableClients();
          setAvailableClients(clients);
        }
      } catch (error) {
        toast.error(`Failed to search clients: ${error}`);
        setAvailableClients([]);
      }
    };

    searchClients();
  }, [clientSearchQuery]);

  const loadConfigurations = async () => {
    try {
      const configs = await ediConfigurationDatabaseService.getConfigurations();
      setConfigurations(configs);
    } catch (error) {
      toast.error(`Failed to load configurations : ${error}`);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedConfig(null);
    setFormData({
      name: '',
      type: 'SFTP',
      host: '',
      port: 22,
      username: '',
      password: '',
      remotePath: '/incoming/codeco',
      enabled: true,
      testMode: true,
      timeout: 30000,
      retryAttempts: 3,
      partnerCode: '',
      senderCode: 'MANTRA',
      fileNamePattern: 'CODECO_{timestamp}_{container}_{operation}.edi',
      assignedClients: [],
      isDefault: false
    });
    setValidationErrors([]);
    setTestResult(null);
  };

  const handleEdit = (config: EDIServerConfig) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedConfig(config);
    setFormData({ ...config });
    setValidationErrors([]);
    setTestResult(null);
  };

  const handleSave = async () => {
    const errors = ediConfigurationDatabaseService.validateConfiguration(formData);
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    try {
      if (isCreating) {
        await ediConfigurationDatabaseService.saveConfiguration(formData as Omit<EDIServerConfig, 'id' | 'createdAt' | 'updatedAt'>);
        toast.success('Configuration created successfully');
      } else if (selectedConfig) {
        await ediConfigurationDatabaseService.updateConfiguration(selectedConfig.id, formData);
        toast.success('Configuration updated successfully');
      }

      await loadConfigurations();
      handleCancel();
    } catch (error) {
      toast.error(`Failed to save configuration: ${error}`);
    }
  };

  const handleDelete = async (config: EDIServerConfig) => {
    if (config.id === '00000000-0000-0000-0000-000000000001') {
      toast.error('Cannot delete default configuration');
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${config.name}"?`)) {
      try {
        await ediConfigurationDatabaseService.deleteConfiguration(config.id);
        toast.success('Configuration deleted successfully');
        await loadConfigurations();
        if (selectedConfig?.id === config.id) {
          handleCancel();
        }
      } catch (error) {
        toast.error(`Failed to delete configuration: ${error}`);
      }
    }
  };

  const handleTestConnection = async () => {
    const errors = ediConfigurationDatabaseService.validateConfiguration(formData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await ediConfigurationDatabaseService.testConnection(formData as EDIServerConfig);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: `Test failed: ${error}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setSelectedConfig(null);
    setFormData({});
    setValidationErrors([]);
    setTestResult(null);
  };

  const handleExport = async () => {
    try {
      const exportData = await ediConfigurationDatabaseService.exportConfigurations();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edi_configurations_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Configurations exported successfully');
    } catch (error) {
      toast.error(`Export failed: ${error}`);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = e.target?.result as string;
        const result = await ediConfigurationDatabaseService.importConfigurations(jsonData);
        
        if (result.success) {
          toast.success(`Successfully imported ${result.imported} configurations`);
          await loadConfigurations();
        } else {
          toast.error(`Import failed: ${result.errors.join(', ')}`);
        }
      } catch (error) {
        toast.error(`Import failed: ${error}`);
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const handleAddClient = (clientName: string) => {
    if (!formData.assignedClients) {
      setFormData({ ...formData, assignedClients: [] });
    }
    
    const clients = formData.assignedClients || [];
    if (!clients.includes(clientName)) {
      setFormData({
        ...formData,
        assignedClients: [...clients, clientName]
      });
    }
    setClientSearchQuery('');
    setShowClientSearch(false);
  };

  const handleRemoveClient = (clientName: string) => {
    const clients = formData.assignedClients || [];
    setFormData({
      ...formData,
      assignedClients: clients.filter(c => c !== clientName)
    });
  };

  const handleAddCustomClient = () => {
    if (clientSearchQuery.trim() && formData.assignedClients) {
      handleAddClient(clientSearchQuery.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">EDI Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Configuration List */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Configurations</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreate}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
              
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={handleExport}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
                <label className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <span>Import</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="p-4 space-y-2">
              {configurations.map((config) => (
                <div
                  key={config.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedConfig?.id === config.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedConfig(config)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{config.name}</h4>
                      <p className="text-sm text-gray-600">{config.host}:{config.port}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          config.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {config.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                          {config.type}
                        </span>
                        {config.isDefault && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                            Default
                          </span>
                        )}
                      </div>
                      {config.assignedClients && config.assignedClients.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">
                            <Users className="inline h-3 w-3 mr-1" />
                            Clients ({config.assignedClients.length}):
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {config.assignedClients.slice(0, 3).map((client, index) => (
                              <span
                                key={index}
                                className="inline-flex px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded"
                              >
                                {client}
                              </span>
                            ))}
                            {config.assignedClients.length > 3 && (
                              <span className="inline-flex px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                +{config.assignedClients.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(config);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {config.id !== 'default' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(config);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Configuration Details/Form */}
          <div className="flex-1 overflow-y-auto">
            {(isCreating || isEditing) ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    {isCreating ? 'Create Configuration' : 'Edit Configuration'}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleTestConnection}
                      disabled={isTesting}
                      className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                    >
                      {isTesting ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                      <span>Test Connection</span>
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                      <h4 className="font-medium text-red-800">Validation Errors</h4>
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-700">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Test Result */}
                {testResult && (
                  <div className={`mb-6 p-4 border rounded-lg ${
                    testResult.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center">
                      {testResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                      )}
                      <span className={`font-medium ${
                        testResult.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {testResult.message}
                      </span>
                    </div>
                  </div>
                )}

                {/* Form */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Configuration Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="My EDI Server"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Server Type *
                    </label>
                    <select
                      value={formData.type || 'SFTP'}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'FTP' | 'SFTP' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="SFTP">SFTP</option>
                      <option value="FTP">FTP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Host *
                    </label>
                    <input
                      type="text"
                      value={formData.host || ''}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="edi.example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Port *
                    </label>
                    <input
                      type="number"
                      value={formData.port || 22}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="65535"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={formData.username || ''}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="depot_user"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remote Path *
                    </label>
                    <input
                      type="text"
                      value={formData.remotePath || ''}
                      onChange={(e) => setFormData({ ...formData, remotePath: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="/incoming/codeco"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Partner Code *
                    </label>
                    <input
                      type="text"
                      value={formData.partnerCode || ''}
                      onChange={(e) => setFormData({ ...formData, partnerCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="PARTNER001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sender Code *
                    </label>
                    <input
                      type="text"
                      value={formData.senderCode || ''}
                      onChange={(e) => setFormData({ ...formData, senderCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="DEPOT001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={formData.timeout || 30000}
                      onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1000"
                      max="300000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Retry Attempts
                    </label>
                    <input
                      type="number"
                      value={formData.retryAttempts || 3}
                      onChange={(e) => setFormData({ ...formData, retryAttempts: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max="10"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      File Name Pattern *
                    </label>
                    <input
                      type="text"
                      value={formData.fileNamePattern || ''}
                      onChange={(e) => setFormData({ ...formData, fileNamePattern: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="CODECO_{timestamp}_{container}_{operation}.edi"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Available placeholders: {'{timestamp}'}, {'{container}'}, {'{operation}'}
                    </p>
                  </div>

                  {/* Gestion des Clients */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="inline h-4 w-4 mr-1" />
                      Clients Assignés
                    </label>
                    <div className="space-y-3">
                      {/* Clients actuellement assignés */}
                      <div className="flex flex-wrap gap-2">
                        {(formData.assignedClients || []).map((client, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {client}
                            <button
                              type="button"
                              onClick={() => handleRemoveClient(client)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                        {(formData.assignedClients || []).length === 0 && (
                          <span className="text-sm text-gray-500 italic">Aucun client assigné</span>
                        )}
                      </div>

                      {/* Recherche et ajout de clients */}
                      <div className="flex space-x-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            onFocus={() => setShowClientSearch(true)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Rechercher ou ajouter un client..."
                          />
                          <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                          
                          {/* Dropdown des clients disponibles */}
                          {showClientSearch && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {availableClients.slice(0, 10).map((client, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => handleAddClient(client)}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                                  disabled={(formData.assignedClients || []).includes(client)}
                                >
                                  <span className={`${
                                    (formData.assignedClients || []).includes(client) 
                                      ? 'text-gray-400' 
                                      : 'text-gray-900'
                                  }`}>
                                    {client}
                                  </span>
                                  {(formData.assignedClients || []).includes(client) && (
                                    <span className="ml-2 text-xs text-gray-400">(déjà assigné)</span>
                                  )}
                                </button>
                              ))}
                              {clientSearchQuery && !availableClients.includes(clientSearchQuery.toUpperCase()) && (
                                <button
                                  type="button"
                                  onClick={handleAddCustomClient}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-t border-gray-200 text-blue-600"
                                >
                                  <Plus className="inline h-3 w-3 mr-1" />
                                  Ajouter "{clientSearchQuery}"
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowClientSearch(false)}
                          className="px-3 py-2 text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <p className="text-xs text-gray-500">
                        Les conteneurs de ces clients utiliseront automatiquement ce serveur EDI.
                      </p>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.enabled || false}
                          onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Enabled</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.testMode || false}
                          onChange={(e) => setFormData({ ...formData, testMode: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Test Mode</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.isDefault || false}
                          onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Serveur par défaut</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedConfig ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Configuration Details</h3>
                  <button
                    onClick={() => handleEdit(selectedConfig)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-gray-900">{selectedConfig.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <p className="text-gray-900">{selectedConfig.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                    <p className="text-gray-900">{selectedConfig.host}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                    <p className="text-gray-900">{selectedConfig.port}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <p className="text-gray-900">{selectedConfig.username}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remote Path</label>
                    <p className="text-gray-900">{selectedConfig.remotePath}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Partner Code</label>
                    <p className="text-gray-900">{selectedConfig.partnerCode}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sender Code</label>
                    <p className="text-gray-900">{selectedConfig.senderCode}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      selectedConfig.enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedConfig.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Test Mode</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      selectedConfig.testMode
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedConfig.testMode ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">File Name Pattern</label>
                    <p className="text-gray-900 font-mono text-sm bg-gray-50 p-2 rounded">
                      {selectedConfig.fileNamePattern}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="inline h-4 w-4 mr-1" />
                      Clients Assignés
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedConfig.assignedClients && selectedConfig.assignedClients.length > 0 ? (
                        selectedConfig.assignedClients.map((client, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                          >
                            {client}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500 italic">
                          {selectedConfig.isDefault ? 'Serveur par défaut (tous les clients non assignés)' : 'Aucun client assigné'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p className="text-gray-900">{selectedConfig.createdAt.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <p className="text-gray-900">{selectedConfig.updatedAt.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-gray-400 mb-4">
                    <Settings className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Configuration Selected</h3>
                  <p className="text-gray-600 mb-4">
                    Select a configuration from the list to view details, or create a new one.
                  </p>
                  <button
                    onClick={handleCreate}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Configuration</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};