import React, { useState } from 'react';
import { X, Save, Loader, Package, MapPin, AlertTriangle, Plus, Trash2, ChevronDown, Search, Check, Building } from 'lucide-react';
import { Container } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface ContainerEditModalProps {
  container: Container;
  onClose: () => void;
  onSave: (container: Container) => void;
}

export const ContainerEditModal: React.FC<ContainerEditModalProps> = ({
  container,
  onClose,
  onSave,
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    number: container.number,
    type: container.type,
    size: container.size,
    status: container.status,
    location: container.location,
    client: container.client,
    clientCode: container.clientCode || '',
    damage: container.damage || [],
  });

  const [newDamage, setNewDamage] = useState('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [containerValidationError, setContainerValidationError] = useState('');

  // Helper function to validate container number format
  const validateContainerNumber = (containerNumber: string): { isValid: boolean; message?: string } => {
    if (!containerNumber) {
      return { isValid: false, message: 'Container number is required' };
    }

    if (containerNumber.length !== 11) {
      return { isValid: false, message: `${containerNumber.length}/11 characters` };
    }

    const letters = containerNumber.substring(0, 4);
    const numbers = containerNumber.substring(4, 11);

    if (!/^[A-Z]{4}$/.test(letters)) {
      return { isValid: false, message: 'First 4 characters must be letters (A-Z)' };
    }

    if (!/^[0-9]{7}$/.test(numbers)) {
      return { isValid: false, message: 'Last 7 characters must be numbers (0-9)' };
    }

    return { isValid: true };
  };

  // Mock location data
  const mockLocations = [
    { id: 'block-a-01', name: 'Block A-01', section: 'Storage Area A', type: 'storage' },
    { id: 'block-a-12', name: 'Block A-12', section: 'Storage Area A', type: 'storage' },
    { id: 'block-b-05', name: 'Block B-05', section: 'Storage Area B', type: 'storage' },
    { id: 'block-c-08', name: 'Block C-08', section: 'Storage Area C', type: 'storage' },
    { id: 'stack-s1', name: 'Stack S1-Row 1-Tier 1', section: 'Top Section', type: 'stack' },
    { id: 'stack-s3', name: 'Stack S3-Row 2-Tier 1', section: 'Top Section', type: 'stack' },
    { id: 'stack-s31', name: 'Stack S31-Row 1-Tier 2', section: 'Top Section', type: 'stack' },
    { id: 'stack-s61', name: 'Stack S61-Row 2-Tier 3', section: 'Bottom Section', type: 'stack' },
    { id: 'workshop-1', name: 'Workshop 1', section: 'Maintenance', type: 'workshop' },
    { id: 'workshop-2', name: 'Workshop 2', section: 'Maintenance', type: 'workshop' },
    { id: 'gate-1', name: 'Gate 1', section: 'Entry/Exit', type: 'gate' },
    { id: 'gate-2', name: 'Gate 2', section: 'Entry/Exit', type: 'gate' },
  ];

  // Mock client data
  const mockClients = [
    { id: '1', code: 'MAEU', name: 'Maersk Line' },
    { id: '2', code: 'MSCU', name: 'MSC Mediterranean Shipping' },
    { id: '3', code: 'CMDU', name: 'CMA CGM' },
    { id: '4', code: 'SHIP001', name: 'Shipping Solutions Inc' },
    { id: '5', code: 'HLCU', name: 'Hapag-Lloyd' },
    { id: '6', code: 'ONEY', name: 'Ocean Network Express' },
    { id: '7', code: 'EGLV', name: 'Evergreen Marine' },
    { id: '8', code: 'YMLU', name: 'Yang Ming Marine' },
  ];

  const filteredLocations = mockLocations.filter(location =>
    location.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
    location.section.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.code.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectedClient = mockClients.find(client =>
    client.name === formData.client || client.code === formData.clientCode
  );

  const handleLocationSelect = (location: any) => {
    setFormData(prev => ({
      ...prev,
      location: location.name
    }));
    setIsLocationDropdownOpen(false);
    setLocationSearch('');
  };

  const handleClientSelect = (client: any) => {
    setFormData(prev => ({
      ...prev,
      client: client.name,
      clientCode: client.code
    }));
    setIsClientDropdownOpen(false);
    setClientSearch('');
  };

  const handleInputChange = (field: string, value: any) => {
    if (field === 'number') {
      // Remove any non-alphanumeric characters (accept a-z, A-Z, 0-9) and convert to uppercase
      let cleanValue = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

      // Limit to 11 characters maximum
      if (cleanValue.length <= 11) {
        // For first 4 positions, only keep uppercase letters
        const letters = cleanValue.substring(0, 4).replace(/[^A-Z]/g, '');
        // For last 7 positions, only keep numbers
        const numbers = cleanValue.substring(4, 11).replace(/[^0-9]/g, '');

        const validValue = letters + numbers;

        setFormData(prev => ({
          ...prev,
          [field]: validValue
        }));

        // Update validation error
        const validation = validateContainerNumber(validValue);
        setContainerValidationError(validation.isValid ? '' : validation.message || '');
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleAddDamage = () => {
    if (newDamage.trim()) {
      setFormData(prev => ({
        ...prev,
        damage: [...prev.damage, newDamage.trim()]
      }));
      setNewDamage('');
    }
  };

  const handleRemoveDamage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      damage: prev.damage.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canEditContainers) {
      alert('You do not have permission to edit containers.');
      return;
    }
    
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const updatedContainer: Container = {
        ...container,
        number: formData.number,
        type: formData.type,
        size: formData.size,
        status: formData.status,
        location: formData.location,
        client: formData.client,
        clientCode: formData.clientCode,
        damage: formData.damage.length > 0 ? formData.damage : undefined,
        updatedAt: new Date(),
        updatedBy: user?.name || 'System',
      };

      onSave(updatedContainer);
    } catch (error) {
      alert('Error updating container: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = validateContainerNumber(formData.number).isValid &&
                   formData.type && formData.size &&
                   formData.status && formData.location && formData.client;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-orange-600 text-white rounded-xl">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Edit Container</h3>
                <p className="text-sm text-gray-600 mt-1">{container.number}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Basic Information */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Basic Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Container Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.number}
                    onChange={(e) => handleInputChange('number', e.target.value)}
                    className={`form-input w-full ${containerValidationError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                    placeholder="e.g., MSKU1234567"
                    maxLength={11}
                  />
                  {containerValidationError && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      <span>{containerValidationError}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Container Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="form-input w-full"
                  >
                    <option value="standard">Standard Container</option>
                    <option value="hi_cube">Hi-Cube Container</option>
                    <option value="hard_top">Hard Top Container</option>
                    <option value="ventilated">Ventilated Container</option>
                    <option value="reefer">Reefer Container</option>
                    <option value="tank">Tank Container</option>
                    <option value="flat_rack">Flat Rack</option>
                    <option value="open_top">Open Top</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Container Size *
                  </label>
                  <select
                    required
                    value={formData.size}
                    onChange={(e) => handleInputChange('size', e.target.value)}
                    className="form-input w-full"
                  >
                    <option value="20ft">20 Feet</option>
                    <option value="40ft">40 Feet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Status *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="form-input w-full"
                  >
                    <option value="in_depot">In Depot</option>
                    <option value="out_depot">Out Depot</option>
                    <option value="in_service">In Service</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="cleaning">Cleaning</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Location Information
              </h4>

              <div>
                <label className="block text-sm font-medium text-green-800 mb-2">
                  Current Location *
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                    className={`w-full flex items-center justify-between p-4 bg-white border-2 rounded-xl transition-all duration-300 ${
                      isLocationDropdownOpen
                        ? 'border-green-500 shadow-lg shadow-green-500/20 ring-4 ring-green-500/10'
                        : formData.location
                        ? 'border-green-400 shadow-md shadow-green-400/10'
                        : 'border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <MapPin className={`h-5 w-5 ${formData.location ? 'text-green-600' : 'text-gray-400'}`} />
                      <div className="text-left">
                        {formData.location ? (
                          <div className="font-medium text-gray-900">{formData.location}</div>
                        ) : (
                          <div className="text-gray-500">Select location...</div>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
                      isLocationDropdownOpen ? 'rotate-180' : ''
                    }`} />
                  </button>

                  {/* Location Dropdown */}
                  {isLocationDropdownOpen && (
                    <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-hidden animate-slide-in-up">
                      {/* Search */}
                      <div className="p-3 border-b border-gray-100">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <input
                            type="text"
                            placeholder="Search locations..."
                            value={locationSearch}
                            onChange={(e) => setLocationSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                      </div>

                      {/* Location list */}
                      <div className="max-h-48 overflow-y-auto">
                        {filteredLocations.map((location) => (
                          <button
                            key={location.id}
                            type="button"
                            onClick={() => handleLocationSelect(location)}
                            className={`w-full text-left p-4 transition-all duration-200 group ${
                              formData.location === location.name
                                ? 'bg-green-50 border-l-4 border-green-500'
                                : 'hover:bg-gray-50 border-l-4 border-transparent'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className={`p-2 rounded-lg transition-all duration-200 ${
                                formData.location === location.name
                                  ? 'bg-green-100 text-green-600'
                                  : 'bg-gray-100 text-gray-500 group-hover:bg-green-100 group-hover:text-green-600'
                              }`}>
                                <MapPin className="h-4 w-4" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{location.name}</div>
                                <div className="text-sm text-gray-600">{location.section}</div>
                              </div>
                              {formData.location === location.name && (
                                <Check className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Client Information
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
                            <div className="font-medium text-gray-900">{selectedClient.name}</div>
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
                      <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-hidden animate-slide-in-up">
                        {/* Search */}
                        <div className="p-3 border-b border-gray-100">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                              type="text"
                              placeholder="Search clients..."
                              value={clientSearch}
                              onChange={(e) => setClientSearch(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                        </div>

                        {/* Client list */}
                        <div className="max-h-48 overflow-y-auto">
                          {filteredClients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => handleClientSelect(client)}
                              className={`w-full text-left p-4 transition-all duration-200 group ${
                                selectedClient?.id === client.id
                                  ? 'bg-purple-50 border-l-4 border-purple-500'
                                  : 'hover:bg-gray-50 border-l-4 border-transparent'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg transition-all duration-200 ${
                                  selectedClient?.id === client.id
                                    ? 'bg-purple-100 text-purple-600'
                                    : 'bg-gray-100 text-gray-500 group-hover:bg-purple-100 group-hover:text-purple-600'
                                }`}>
                                  <Building className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{client.name}</div>
                                </div>
                                {selectedClient?.id === client.id && (
                                  <Check className="h-4 w-4 text-purple-600" />
                                )}
                              </div>
                            </button>
                          ))}
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
                    onChange={(e) => handleInputChange('clientCode', e.target.value)}
                    className="form-input w-full"
                    placeholder="e.g., MAEU"
                    readOnly
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Damage Information */}
            <div className="bg-red-50 rounded-xl p-6 border border-red-200">
              <h4 className="font-semibold text-red-900 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Damage Reports
              </h4>

              <div className="space-y-4">
                {/* Existing Damage List */}
                {formData.damage.length > 0 && (
                  <div className="space-y-2">
                    {formData.damage.map((damage, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-red-200">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-gray-900">{damage}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDamage(index)}
                          className="text-red-600 hover:text-red-800 p-1 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Damage */}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newDamage}
                    onChange={(e) => setNewDamage(e.target.value)}
                    className="form-input flex-1"
                    placeholder="Describe damage..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDamage();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddDamage}
                    disabled={!newDamage.trim()}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>

                {formData.damage.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No damage reports recorded</p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-end space-x-3">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !isFormValid}
              className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
