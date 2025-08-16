import React, { useState } from 'react';
import { X, Save, Loader, Package, MapPin, AlertTriangle, Plus, Trash2 } from 'lucide-react';
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
  onSave
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
    damage: container.damage || []
  });

  const [newDamage, setNewDamage] = useState('');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
        damage: formData.damage.length > 0 ? formData.damage : undefined
      };

      onSave(updatedContainer);
    } catch (error) {
      alert('Error updating container: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = formData.number && formData.type && formData.size && 
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
                    className="form-input w-full"
                    placeholder="e.g., MSKU1234567"
                  />
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
                    <option value="dry">Dry Container</option>
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
                    <option value="20ft">20 feet</option>
                    <option value="40ft">40 feet</option>
                    <option value="45ft">45 feet</option>
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
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="form-input w-full"
                  placeholder="e.g., Block A-12, Stack S1-Row 1-Tier 1"
                />
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Client Information
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.client}
                    onChange={(e) => handleInputChange('client', e.target.value)}
                    className="form-input w-full"
                    placeholder="e.g., Maersk Line"
                  />
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
            <button
              onClick={onClose}
              className="btn-secondary"
            >
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