import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';

interface EDIClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: any) => void;
  editingClient: any;
  availableClients: any[];
  serverConfigs: any[];
  configuredClients?: string[]; // Array of client codes that already have EDI configured
}

export const EDIClientModal: React.FC<EDIClientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingClient,
  availableClients,
  serverConfigs,
  configuredClients = []
}) => {
  const [formData, setFormData] = useState({
    clientCode: '',
    clientName: '',
    ediEnabled: true,
    enableGateIn: true,
    enableGateOut: true,
    serverId: '',
    priority: 'normal' as 'high' | 'normal' | 'low',
    notes: ''
  });
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      if (editingClient) {
        setFormData({
          clientCode: editingClient.clientCode || '',
          clientName: editingClient.clientName || '',
          ediEnabled: editingClient.ediEnabled || false,
          enableGateIn: true,
          enableGateOut: true,
          serverId: editingClient.serverConfig?.id || '',
          priority: 'normal',
          notes: ''
        });
      } else {
        setFormData({
          clientCode: '',
          clientName: '',
          ediEnabled: true,
          enableGateIn: true,
          enableGateOut: true,
          serverId: serverConfigs.find(s => s.isDefault)?.id || serverConfigs[0]?.id || '',
          priority: 'normal',
          notes: ''
        });
      }
      setValidationErrors([]);
    }
  }, [isOpen, editingClient, serverConfigs]);

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData.clientCode?.trim()) {
      errors.push('Client code is required');
    }
    
    if (!formData.clientName?.trim()) {
      errors.push('Client name is required');
    }
    
    if (!formData.serverId && formData.ediEnabled) {
      errors.push('Server selection is required when EDI is enabled');
    }

    return errors;
  };

  const handleSave = () => {
    const errors = validateForm();
    setValidationErrors(errors);

    if (errors.length > 0) {
      return;
    }

    onSave(formData);
  };

  const handleClientSelect = (client: any) => {
    const isConfigured = configuredClients.includes(client.code);
    
    if (isConfigured && !editingClient) {
      toast.warning(`${client.name} already has EDI configured. Edit it from the Client EDI Settings tab.`);
      return;
    }
    
    setFormData({
      ...formData,
      clientCode: client.code,
      clientName: client.name
    });
  };

  const isClientConfigured = (clientCode: string) => configuredClients.includes(clientCode);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingClient ? 'Edit Client EDI Configuration' : 'Add Client EDI Configuration'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
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

          {/* Client Selection (for new clients) */}
          {!editingClient && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client *
              </label>
              <select
                value={formData.clientCode}
                onChange={(e) => {
                  const selectedClient = availableClients.find(c => c.code === e.target.value);
                  if (selectedClient) {
                    handleClientSelect(selectedClient);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a client...</option>
                {availableClients.map((client) => {
                  const configured = isClientConfigured(client.code);
                  return (
                    <option 
                      key={client.code} 
                      value={client.code}
                      disabled={configured}
                    >
                      {client.name} ({client.code}) {configured ? '- Already Configured' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Code
              </label>
              <input
                type="text"
                value={formData.clientCode}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder="Select a client first"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Name
              </label>
              <input
                type="text"
                value={formData.clientName}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder="Select a client first"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                EDI Server *
              </label>
              <select
                value={formData.serverId}
                onChange={(e) => setFormData({ ...formData, serverId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a server</option>
                {serverConfigs.filter(s => s.enabled).map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name} ({server.type}) {server.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="high">High Priority</option>
                <option value="normal">Normal Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* EDI Settings */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">EDI Settings</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.ediEnabled}
                  onChange={(e) => setFormData({ ...formData, ediEnabled: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Enable EDI for this client</span>
              </label>
              
              {formData.ediEnabled && (
                <div className="ml-6 space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.enableGateIn}
                      onChange={(e) => setFormData({ ...formData, enableGateIn: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Gate In EDI</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.enableGateOut}
                      onChange={(e) => setFormData({ ...formData, enableGateOut: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable Gate Out EDI</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes about this client's EDI configuration..."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{editingClient ? 'Update' : 'Create'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};