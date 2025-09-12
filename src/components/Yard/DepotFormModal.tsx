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
  Loader,
  ChevronDown
} from 'lucide-react';
import { Yard } from '../../types';
import { useAuth } from '../../hooks/useAuth';

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
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [autoSaving, setAutoSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    setCurrentStep(1);
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

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.name && !!formData.code && !!formData.location;
      case 2:
        return true; // Contact info is optional
      case 3:
        return formData.totalCapacity > 0;
      default:
        return true;
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(3, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in !mt-0">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-strong animate-slide-in-up max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedDepot ? 'Edit Depot' : 'Create New Depot'}
                </h3>
                <p className="text-xs text-gray-600">Step {currentStep} of 3</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {autoSaving && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Auto-saving...</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="relative">
              <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200 z-0"></div>
              <div 
                className="absolute top-3 left-0 h-0.5 bg-blue-600 z-10 transition-all duration-300" 
                style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              ></div>
              
              <div className="flex justify-between relative z-20">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                      step <= currentStep 
                        ? 'bg-blue-600 text-white border border-blue-600' 
                        : 'bg-white text-gray-500 border border-gray-300'
                    }`}>
                      {step}
                    </div>
                    <span className={`mt-1.5 text-xs font-medium transition-colors duration-300 ${
                      step <= currentStep ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step === 1 && 'Basic Info'}
                      {step === 2 && 'Contact & Address'}
                      {step === 3 && 'Settings'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-slide-in-right">
                
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Basic Information
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Depot Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`form-input w-full ${errors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                        placeholder="Enter depot name"
                      />
                      {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Depot Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                        className={`form-input w-full ${errors.code ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                        placeholder="DEPOT-01"
                        maxLength={20}
                      />
                      {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={3}
                        className="form-input w-full resize-none"
                        placeholder="Enter depot description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Location *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
                        <input
                          type="text"
                          required
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          className={`form-input w-full pl-12 ${errors.location ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                          placeholder="Enter depot location"
                        />
                      </div>
                      {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Total Capacity *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.totalCapacity}
                        onChange={(e) => handleInputChange('totalCapacity', parseInt(e.target.value) || 0)}
                        className={`form-input w-full ${errors.totalCapacity ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                        placeholder="1000"
                        min="1"
                      />
                      {errors.totalCapacity && <p className="mt-1 text-sm text-red-600">{errors.totalCapacity}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Layout Type
                      </label>
                      <div className="relative">
                        <select
                          value={formData.layout}
                          onChange={(e) => handleInputChange('layout', e.target.value)}
                          className="form-input w-full appearance-none pr-10"
                        >
                          <option value="standard">Standard Grid</option>
                          <option value="tantarelli">Tantarelli Layout</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Status
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            checked={formData.isActive}
                            onChange={() => handleInputChange('isActive', true)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="text-sm font-medium text-blue-800">Active</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="status"
                            checked={!formData.isActive}
                            onChange={() => handleInputChange('isActive', false)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                          />
                          <span className="text-sm font-medium text-blue-800">Inactive</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Contact & Address */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-slide-in-right">
                
                {/* Contact Information */}
                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Contact Information
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        Manager Name
                      </label>
                      <input
                        type="text"
                        value={formData.contactManager}
                        onChange={(e) => handleInputChange('contactManager', e.target.value)}
                        className="form-input w-full"
                        placeholder="John Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        Phone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500 h-5 w-5" />
                        <input
                          type="tel"
                          value={formData.contactPhone}
                          onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                          className="form-input w-full pl-12"
                          placeholder="+225 XX XX XX XX XX"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500 h-5 w-5" />
                        <input
                          type="email"
                          value={formData.contactEmail}
                          onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                          className={`form-input w-full pl-12 ${errors.contactEmail ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                          placeholder="manager@depot.ci"
                        />
                      </div>
                      {errors.contactEmail && <p className="mt-1 text-sm text-red-600">{errors.contactEmail}</p>}
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Address Information
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-purple-800 mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={formData.addressStreet}
                        onChange={(e) => handleInputChange('addressStreet', e.target.value)}
                        className="form-input w-full"
                        placeholder="Zone Portuaire de Tantarelli"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={formData.addressCity}
                        onChange={(e) => handleInputChange('addressCity', e.target.value)}
                        className="form-input w-full"
                        placeholder="Abidjan"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-2">
                        State/Region
                      </label>
                      <input
                        type="text"
                        value={formData.addressState}
                        onChange={(e) => handleInputChange('addressState', e.target.value)}
                        className="form-input w-full"
                        placeholder="Lagunes"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-2">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        value={formData.addressZipCode}
                        onChange={(e) => handleInputChange('addressZipCode', e.target.value)}
                        className="form-input w-full"
                        placeholder="01 BP 1234"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={formData.addressCountry}
                        onChange={(e) => handleInputChange('addressCountry', e.target.value)}
                        className="form-input w-full"
                        placeholder="Côte d'Ivoire"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Operating Settings */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-slide-in-right">
                
                {/* Operating Configuration */}
                <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-4 flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Operating Configuration
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-2">
                        Timezone
                      </label>
                      <div className="relative">
                        <select
                          value={formData.timezone}
                          onChange={(e) => handleInputChange('timezone', e.target.value)}
                          className="form-input w-full appearance-none pr-10"
                        >
                          <option value="Africa/Abidjan">Africa/Abidjan (GMT+0)</option>
                          <option value="UTC">UTC (GMT+0)</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-2">
                        Operating Hours
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="relative flex-1">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500 h-4 w-4" />
                          <input
                            type="time"
                            value={formData.operatingHoursStart}
                            onChange={(e) => handleInputChange('operatingHoursStart', e.target.value)}
                            className="form-input w-full pl-10"
                          />
                        </div>
                        <span className="text-orange-700 font-medium">to</span>
                        <div className="relative flex-1">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500 h-4 w-4" />
                          <input
                            type="time"
                            value={formData.operatingHoursEnd}
                            onChange={(e) => handleInputChange('operatingHoursEnd', e.target.value)}
                            className="form-input w-full pl-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-2">
                        Max Containers per Operation
                      </label>
                      <input
                        type="number"
                        value={formData.maxContainersPerOperation}
                        onChange={(e) => handleInputChange('maxContainersPerOperation', parseInt(e.target.value) || 1)}
                        className="form-input w-full"
                        min="1"
                        max="50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-2">
                        Default Free Days
                      </label>
                      <input
                        type="number"
                        value={formData.defaultFreeDays}
                        onChange={(e) => handleInputChange('defaultFreeDays', parseInt(e.target.value) || 0)}
                        className="form-input w-full"
                        min="0"
                        max="30"
                      />
                    </div>
                  </div>
                </div>

                {/* Operational Settings */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Operational Settings
                  </h4>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                      <div>
                        <div className="font-medium text-gray-900">Auto-assign Container Locations</div>
                        <div className="text-sm text-gray-600">Automatically assign optimal locations for incoming containers</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInputChange('autoAssignLocation', !formData.autoAssignLocation)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          formData.autoAssignLocation ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.autoAssignLocation ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                      <div>
                        <div className="font-medium text-gray-900">Requires Approval for Operations</div>
                        <div className="text-sm text-gray-600">All operations require supervisor approval before execution</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleInputChange('requiresApproval', !formData.requiresApproval)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          formData.requiresApproval ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.requiresApproval ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="btn-secondary"
                >
                  Previous
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!validateStep(currentStep)}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={isLoading || !validateStep(currentStep)}
                  className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>{selectedDepot ? 'Updating...' : 'Creating...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{selectedDepot ? 'Update Depot' : 'Create Depot'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};