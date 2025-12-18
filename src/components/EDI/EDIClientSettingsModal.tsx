/**
 * Modal de gestion des paramètres EDI par client
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Users,
  Search,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { ediClientSettingsService, EDIClientSettings } from '../../services/edi/ediClientSettings';
import { ediRealDataService } from '../../services/edi/ediRealDataService';
import { useToast } from '../../hooks/useToast';

interface EDIClientSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EDIClientSettingsModal: React.FC<EDIClientSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const [clientSettings, setClientSettings] = useState<EDIClientSettings[]>([]);
  const [realClients, setRealClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<EDIClientSettings | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<Partial<EDIClientSettings>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [isLoadingRealClients, setIsLoadingRealClients] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      loadClientSettings();
      loadRealClients();
    }
  }, [isOpen]);

  const loadClientSettings = () => {
    const settings = ediClientSettingsService.getAllClientSettings();
    setClientSettings(settings);
  };

  const loadRealClients = async () => {
    try {
      setIsLoadingRealClients(true);
      const clients = await ediRealDataService.getAvailableClients();
      setRealClients(clients);
    } catch (error) {
      console.error('Error loading real clients:', error);
      toast.error('Erreur lors du chargement des clients de la base de données');
    } finally {
      setIsLoadingRealClients(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedClient(null);
    setFormData({
      clientName: '',
      clientCode: '',
      ediEnabled: true,
      gateInEdi: true,
      gateOutEdi: true,
      priority: 'normal',
      notes: ''
    });
    setValidationErrors([]);
  };

  const handleEdit = (client: EDIClientSettings) => {
    setIsEditing(true);
    setIsCreating(false);
    setSelectedClient(client);
    setFormData({ ...client });
    setValidationErrors([]);
  };

  const handleSave = () => {
    const errors = ediClientSettingsService.validateClientSettings(formData);
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    try {
      if (isCreating) {
        ediClientSettingsService.createClientSettings(formData as Omit<EDIClientSettings, 'id' | 'createdAt' | 'updatedAt'>);
        toast.success('Client settings created successfully');
      } else if (selectedClient) {
        ediClientSettingsService.updateClientSettings(selectedClient.id, formData);
        toast.success('Client settings updated successfully');
      }

      loadClientSettings();
      handleCancel();
    } catch (error) {
      toast.error(`Failed to save client settings: ${error}`);
    }
  };

  const handleDelete = (client: EDIClientSettings) => {
    if (window.confirm(`Are you sure you want to delete settings for "${client.clientName}"?`)) {
      try {
        ediClientSettingsService.deleteClientSettings(client.id);
        toast.success('Client settings deleted successfully');
        loadClientSettings();
        if (selectedClient?.id === client.id) {
          handleCancel();
        }
      } catch (error) {
        toast.error(`Failed to delete client settings: ${error}`);
      }
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setSelectedClient(null);
    setFormData({});
    setValidationErrors([]);
  };

  const handleExport = () => {
    try {
      const exportData = ediClientSettingsService.exportClientSettings();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edi_client_settings_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Client settings exported successfully');
    } catch (error) {
      toast.error(`Export failed: ${error}`);
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const result = ediClientSettingsService.importClientSettings(jsonData);
        
        if (result.success) {
          toast.success(`Successfully imported ${result.imported} client settings`);
          loadClientSettings();
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

  const toggleEdiStatus = (client: EDIClientSettings) => {
    try {
      ediClientSettingsService.updateClientSettings(client.id, {
        ediEnabled: !client.ediEnabled
      });
      loadClientSettings();
      toast.success(`EDI ${!client.ediEnabled ? 'enabled' : 'disabled'} for ${client.clientName}`);
    } catch (error) {
      toast.error(`Failed to update EDI status: ${error}`);
    }
  };

  // Filtrage des clients
  const filteredClients = clientSettings.filter(client => {
    const matchesSearch = !searchQuery || 
      client.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (client.clientCode && client.clientCode.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'enabled' && client.ediEnabled) ||
      (filterStatus === 'disabled' && !client.ediEnabled);

    return matchesSearch && matchesFilter;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            <Users className="inline h-5 w-5 mr-2" />
            Paramètres EDI par Client
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Liste des clients */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Clients</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreate}
                    disabled={isLoadingRealClients}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Ajouter</span>
                  </button>
                </div>
              </div>
              
              {/* Contrôles de recherche et filtrage */}
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Rechercher un client..."
                  />
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>
                
                <div className="flex space-x-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'enabled' | 'disabled')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Tous les clients</option>
                    <option value="enabled">EDI activé</option>
                    <option value="disabled">EDI désactivé</option>
                  </select>
                  
                  <button
                    onClick={handleExport}
                    className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export</span>
                  </button>
                  
                  <label className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors cursor-pointer">
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
            </div>

            <div className="p-4 space-y-2">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedClient?.id === client.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedClient(client)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{client.clientName}</h4>
                      {client.clientCode && (
                        <p className="text-sm text-gray-600">Code: {client.clientCode}</p>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          client.ediEnabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          EDI {client.ediEnabled ? 'Activé' : 'Désactivé'}
                        </span>
                        {client.ediEnabled && (
                          <div className="flex space-x-1">
                            {client.gateInEdi && (
                              <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                Gate In
                              </span>
                            )}
                            {client.gateOutEdi && (
                              <span className="inline-flex px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                                Gate Out
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEdiStatus(client);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title={`${client.ediEnabled ? 'Désactiver' : 'Activer'} EDI`}
                      >
                        {client.ediEnabled ? (
                          <ToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(client);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(client);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredClients.length === 0 && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Aucun client trouvé</p>
                </div>
              )}
            </div>
          </div>

          {/* Détails/Formulaire */}
          <div className="flex-1 overflow-y-auto">
            {(isCreating || isEditing) ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    {isCreating ? 'Nouveau Client' : 'Modifier Client'}
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Save className="h-4 w-4" />
                      <span>Sauvegarder</span>
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>

                {/* Erreurs de validation */}
                {validationErrors.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                      <h4 className="font-medium text-red-800">Erreurs de validation</h4>
                    </div>
                    <ul className="list-disc list-inside text-sm text-red-700">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Formulaire */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom du Client *
                      </label>
                      {isCreating ? (
                        <select
                          value={formData.clientName || ''}
                          onChange={(e) => {
                            const selectedRealClient = realClients.find(c => c.name === e.target.value);
                            setFormData({ 
                              ...formData, 
                              clientName: e.target.value,
                              clientCode: selectedRealClient?.code || ''
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Sélectionner un client...</option>
                          {realClients.map((client) => (
                            <option key={client.id} value={client.name}>
                              {client.name} ({client.code})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={formData.clientName || ''}
                          onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="MAERSK LINE"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Code Client
                      </label>
                      <input
                        type="text"
                        value={formData.clientCode || ''}
                        onChange={(e) => setFormData({ ...formData, clientCode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="MAEU"
                        readOnly={isCreating}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priorité
                    </label>
                    <select
                      value={formData.priority || 'normal'}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'high' | 'normal' | 'low' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="high">Haute</option>
                      <option value="normal">Normale</option>
                      <option value="low">Basse</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Configuration EDI
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.ediEnabled || false}
                          onChange={(e) => setFormData({ ...formData, ediEnabled: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">EDI activé pour ce client</span>
                      </label>
                      
                      {formData.ediEnabled && (
                        <div className="ml-6 space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.gateInEdi || false}
                              onChange={(e) => setFormData({ ...formData, gateInEdi: e.target.checked })}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">EDI pour Gate In</span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.gateOutEdi || false}
                              onChange={(e) => setFormData({ ...formData, gateOutEdi: e.target.checked })}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">EDI pour Gate Out</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Notes sur la configuration EDI de ce client..."
                    />
                  </div>
                </div>
              </div>
            ) : selectedClient ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Détails du Client</h3>
                  <button
                    onClick={() => handleEdit(selectedClient)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Modifier</span>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                      <p className="text-gray-900">{selectedClient.clientName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                      <p className="text-gray-900">{selectedClient.clientCode || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        selectedClient.priority === 'high' ? 'bg-red-100 text-red-800' :
                        selectedClient.priority === 'low' ? 'bg-gray-100 text-gray-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {selectedClient.priority === 'high' ? 'Haute' : 
                         selectedClient.priority === 'low' ? 'Basse' : 'Normale'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Statut EDI</label>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        selectedClient.ediEnabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedClient.ediEnabled ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {selectedClient.ediEnabled ? 'Activé' : 'Désactivé'}
                      </span>
                    </div>
                  </div>

                  {selectedClient.ediEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Opérations EDI</label>
                      <div className="flex space-x-4">
                        <span className={`inline-flex items-center px-3 py-1 text-sm rounded-full ${
                          selectedClient.gateInEdi
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          Gate In {selectedClient.gateInEdi ? '✓' : '✗'}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 text-sm rounded-full ${
                          selectedClient.gateOutEdi
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          Gate Out {selectedClient.gateOutEdi ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedClient.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedClient.notes}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Créé le</label>
                      <p className="text-gray-900">{selectedClient.createdAt.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Modifié le</label>
                      <p className="text-gray-900">{selectedClient.updatedAt.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun client sélectionné</h3>
                  <p className="text-gray-600 mb-4">
                    Sélectionnez un client dans la liste pour voir ses paramètres EDI.
                  </p>
                  <button
                    onClick={handleCreate}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Nouveau Client</span>
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