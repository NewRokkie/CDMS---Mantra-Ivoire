import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Building,
  MapPin,
  Settings,
  Clock,
  User,
  Phone,
  Mail,
  Calendar,
  Loader
} from 'lucide-react';
import { Yard } from '../../types';

interface DepotFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  selectedDepot: Yard | null;
  isLoading?: boolean;
}

export const DepotFormModal: React.FC<DepotFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedDepot,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    location: '',
    totalCapacity: 1000,
    layout: 'standard' as 'tantarelli' | 'standard',
    isActive: true,
    // Contact information
    contactManager: '',
    contactPhone: '',
    contactEmail: '',
    // Address
    addressStreet: '',
    addressCity: '',
    addressState: '',
    addressZipCode: '',
    addressCountry: 'Côte d\'Ivoire',
    // Settings
    timezone: 'Africa/Abidjan',
    operatingHoursStart: '06:00',
    operatingHoursEnd: '22:00',
    autoAssignLocation: true,
    requiresApproval: false,
    maxContainersPerOperation: 10,
    defaultFreeDays: 3
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (selectedDepot) {
      // Populate form with existing depot data
      setFormData({
        name: selectedDepot.name,
        code: selectedDepot.code,
        description: selectedDepot.description,
        location: selectedDepot.location,
        totalCapacity: selectedDepot.totalCapacity,
        layout: selectedDepot.layout,
        isActive: selectedDepot.isActive,
        contactManager: selectedDepot.contactInfo?.manager || '',
        contactPhone: selectedDepot.contactInfo?.phone || '',
        contactEmail: selectedDepot.contactInfo?.email || '',
        addressStreet: selectedDepot.address?.street || '',
        addressCity: selectedDepot.address?.city || '',
        addressState: selectedDepot.address?.state || '',
        addressZipCode: selectedDepot.address?.zipCode || '',
        addressCountry: selectedDepot.address?.country || 'Côte d\'Ivoire',
        timezone: selectedDepot.timezone || 'Africa/Abidjan',
        operatingHoursStart: selectedDepot.operatingHours?.start || '06:00',
        operatingHoursEnd: selectedDepot.operatingHours?.end || '22:00',
        autoAssignLocation: selectedDepot.settings?.autoAssignLocation ?? true,
        requiresApproval: selectedDepot.settings?.requiresApproval ?? false,
        maxContainersPerOperation: selectedDepot.settings?.maxContainersPerOperation || 10,
        defaultFreeDays: selectedDepot.settings?.defaultFreeDays || 3
      });
    } else {
      // Reset form for new depot
      setFormData({
        name: '',
        code: '',
        description: '',
        location: '',
        totalCapacity: 1000,
        layout: 'standard',
        isActive: true,
        contactManager: '',
        contactPhone: '',
        contactEmail: '',
        addressStreet: '',
        addressCity: '',
        addressState: '',
        addressZipCode: '',
        addressCountry: 'Côte d\'Ivoire',
        timezone: 'Africa/Abidjan',
        operatingHoursStart: '06:00',
        operatingHoursEnd: '22:00',
        autoAssignLocation: true,
        requiresApproval: false,
        maxContainersPerOperation: 10,
        defaultFreeDays: 3
      });
    }
    setErrors({});
  }, [selectedDepot, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Depot name is required';
    }
    if (!formData.code.trim()) {
      newErrors.code = 'Depot code is required';
    } else if (!/^[A-Z0-9-]+$/.test(formData.code)) {
      newErrors.code = 'Code must contain only uppercase letters, numbers, and hyphens';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (formData.totalCapacity <= 0) {
      newErrors.totalCapacity = 'Capacity must be greater than 0';
    }
    if (formData.contactEmail && !/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const depotData = {
      name: formData.name,
      code: formData.code,
      description: formData.description,
      location: formData.location,
      totalCapacity: formData.totalCapacity,
      layout: formData.layout,
      isActive: formData.isActive,
      contactInfo: {
        manager: formData.contactManager,
        phone: formData.contactPhone,
        email: formData.contactEmail
      },
      address: {
        street: formData.addressStreet,
        city: formData.addressCity,
        state: formData.addressState,
        zipCode: formData.addressZipCode,
        country: formData.addressCountry
      },
      timezone: formData.timezone,
      operatingHours: {
        start: formData.operatingHoursStart,
        end: formData.operatingHoursEnd
      },
      settings: {
        autoAssignLocation: formData.autoAssignLocation,
        requiresApproval: formData.requiresApproval,
        maxContainersPerOperation: formData.maxContainersPerOperation,
        defaultFreeDays: formData.defaultFreeDays
      }
    };

    onSubmit(depotData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Building className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedDepot ? 'Edit Depot' : 'Create New Depot'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Depot Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter depot name"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Depot Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.code ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="DEPOT-01"
              />
              {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter depot description"
            />
          </div>

          {/* Location and Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.location ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter depot location"
                />
              </div>
              {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Capacity *
              </label>
              <input
                type="number"
                value={formData.totalCapacity}
                onChange={(e) => handleInputChange('totalCapacity', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.totalCapacity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="1000"
                min="1"
              />
              {errors.totalCapacity && <p className="mt-1 text-sm text-red-600">{errors.totalCapacity}</p>}
            </div>
          </div>

          {/* Layout and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Layout Type
              </label>
              <select
                value={formData.layout}
                onChange={(e) => handleInputChange('layout', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="standard">Standard Grid</option>
                <option value="tantarelli">Tantarelli Layout</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={formData.isActive}
                    onChange={() => handleInputChange('isActive', true)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!formData.isActive}
                    onChange={() => handleInputChange('isActive', false)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Inactive</span>
                </label>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-gray-500" />
              Contact Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manager Name
                </label>
                <input
                  type="text"
                  value={formData.contactManager}
                  onChange={(e) => handleInputChange('contactManager', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+225 XX XX XX XX XX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.contactEmail ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="manager@depot.ci"
                  />
                </div>
                {errors.contactEmail && <p className="mt-1 text-sm text-red-600">{errors.contactEmail}</p>}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-gray-500" />
              Address
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.addressStreet}
                  onChange={(e) => handleInputChange('addressStreet', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Zone Portuaire de Tantarelli"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.addressCity}
                  onChange={(e) => handleInputChange('addressCity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Abidjan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Region
                </label>
                <input
                  type="text"
                  value={formData.addressState}
                  onChange={(e) => handleInputChange('addressState', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Lagunes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.addressZipCode}
                  onChange={(e) => handleInputChange('addressZipCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="01 BP 1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.addressCountry}
                  onChange={(e) => handleInputChange('addressCountry', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Côte d'Ivoire"
                />
              </div>
            </div>
          </div>

          {/* Operating Settings */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-gray-500" />
              Operating Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Africa/Abidjan">Africa/Abidjan (GMT+0)</option>
                  <option value="UTC">UTC (GMT+0)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operating Hours
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="time"
                      value={formData.operatingHoursStart}
                      onChange={(e) => handleInputChange('operatingHoursStart', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <span className="text-gray-500">to</span>
                  <div className="relative flex-1">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="time"
                      value={formData.operatingHoursEnd}
                      onChange={(e) => handleInputChange('operatingHoursEnd', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Containers per Operation
                </label>
                <input
                  type="number"
                  value={formData.maxContainersPerOperation}
                  onChange={(e) => handleInputChange('maxContainersPerOperation', parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Free Days
                </label>
                <input
                  type="number"
                  value={formData.defaultFreeDays}
                  onChange={(e) => handleInputChange('defaultFreeDays', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoAssignLocation"
                  checked={formData.autoAssignLocation}
                  onChange={(e) => handleInputChange('autoAssignLocation', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoAssignLocation" className="ml-2 text-sm text-gray-700">
                  Auto-assign container locations
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requiresApproval"
                  checked={formData.requiresApproval}
                  onChange={(e) => handleInputChange('requiresApproval', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="requiresApproval" className="ml-2 text-sm text-gray-700">
                  Requires approval for operations
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{selectedDepot ? 'Update Depot' : 'Create Depot'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
