import React, { useState, useEffect } from 'react';
import { X, Save, Loader, Package, User, FileText, Calculator, AlertTriangle, Plus, Minus } from 'lucide-react';
import { DatePicker } from '../Common/DatePicker';
import { ClientSearchField } from '../Common/ClientSearchField';
import { ContainerQuantityBySize } from '../../types';

interface BookingReferenceFormData {
  bookingNumber: string;
  clientId: string;
  clientCode: string;
  clientName: string;
  maxQuantityThreshold: number;
  containerQuantities: ContainerQuantityBySize;
  totalContainers: number;
  requiresDetailedBreakdown: boolean;
  estimatedReleaseDate: string;
  notes: string;
}

interface BookingReferenceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const ReleaseOrderForm: React.FC<BookingReferenceFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [autoSaving, setAutoSaving] = useState(false);
  
  const [formData, setFormData] = useState<BookingReferenceFormData>({
    bookingNumber: '',
    clientId: '',
    clientCode: '',
    clientName: '',
    maxQuantityThreshold: 10,
    containerQuantities: {
      size20ft: 0,
      size40ft: 0,
      size45ft: 0
    },
    totalContainers: 0,
    requiresDetailedBreakdown: false,
    estimatedReleaseDate: '',
    notes: ''
  });

  // Mock client data
  const mockClients = [
    { id: '1', name: 'Maersk Line', code: 'MAEU' },
    { id: '2', name: 'MSC Mediterranean', code: 'MSCU' },
    { id: '3', name: 'CMA CGM', code: 'CMDU' },
    { id: '4', name: 'COSCO Shipping', code: 'COSU' },
    { id: '5', name: 'Hapag-Lloyd', code: 'HLCU' },
    { id: '6', name: 'ONE (Ocean Network Express)', code: 'ONEY' },
    { id: '7', name: 'Evergreen Marine', code: 'EGLV' },
    { id: '8', name: 'Yang Ming Marine', code: 'YMLU' }
  ];

  // Calculate total containers whenever quantities change
  useEffect(() => {
    const total = formData.containerQuantities.size20ft + 
                  formData.containerQuantities.size40ft + 
                  formData.containerQuantities.size45ft;
    
    const requiresBreakdown = total > formData.maxQuantityThreshold;
    
    setFormData(prev => ({
      ...prev,
      totalContainers: total,
      requiresDetailedBreakdown: requiresBreakdown
    }));
  }, [formData.containerQuantities, formData.maxQuantityThreshold]);

  const handleInputChange = (field: keyof BookingReferenceFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    triggerAutoSave();
  };

  const handleQuantityChange = (size: keyof ContainerQuantityBySize, value: number) => {
    const newValue = Math.max(0, value); // Ensure non-negative
    setFormData(prev => ({
      ...prev,
      containerQuantities: {
        ...prev.containerQuantities,
        [size]: newValue
      }
    }));
    triggerAutoSave();
  };

  const handleClientSelect = (clientId: string) => {
    const selectedClient = mockClients.find(c => c.id === clientId);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        clientId: selectedClient.id,
        clientCode: selectedClient.code,
        clientName: selectedClient.name
      }));
      triggerAutoSave();
    }
  };

  const triggerAutoSave = () => {
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.bookingNumber.trim() !== '' && formData.clientId !== '';
      case 2:
        return formData.totalContainers > 0;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(2, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(currentStep)) return;

    const bookingData = {
      ...formData,
      containerBreakdown: getContainerBreakdownText()
    };

    onSubmit(bookingData);
  };

  const getContainerBreakdownText = (): string => {
    const parts = [];
    if (formData.containerQuantities.size20ft > 0) {
      parts.push(`${formData.containerQuantities.size20ft} Container${formData.containerQuantities.size20ft !== 1 ? 's' : ''} of 20"`);
    }
    if (formData.containerQuantities.size40ft > 0) {
      parts.push(`${formData.containerQuantities.size40ft} Container${formData.containerQuantities.size40ft !== 1 ? 's' : ''} of 40"`);
    }
    if (formData.containerQuantities.size45ft > 0) {
      parts.push(`${formData.containerQuantities.size45ft} Container${formData.containerQuantities.size45ft !== 1 ? 's' : ''} of 45"`);
    }
    
    if (parts.length === 0) return 'No containers specified';
    
    const result = parts.join(' and ');
    return `${result} for a total of ${formData.totalContainers} container${formData.totalContainers !== 1 ? 's' : ''}`;
  };

  const isFormValid = validateStep(1) && validateStep(2);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Create Booking Reference</h2>
                <p className="text-blue-100 text-xs">Step {currentStep} of 2 - Generate new booking reference</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {autoSaving && (
                <div className="flex items-center space-x-2 text-blue-100">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Auto-saving...</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="relative">
              <div className="absolute top-3 left-0 right-0 h-0.5 bg-white/20 z-0"></div>
              <div 
                className="absolute top-3 left-0 h-0.5 bg-white z-10 transition-all duration-300" 
                style={{ width: `${((currentStep - 1) / 1) * 100}%` }}
              ></div>
              
              <div className="flex justify-between relative z-20">
                {[1, 2].map((step) => (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                      step <= currentStep 
                        ? 'bg-white text-blue-600 border border-white' 
                        : 'bg-white/20 text-white border border-white/30'
                    }`}>
                      {step}
                    </div>
                    <span className={`mt-1.5 text-xs font-medium transition-colors duration-300 ${
                      step <= currentStep ? 'text-white' : 'text-white/70'
                    }`}>
                      {step === 1 && 'Booking & Client'}
                      {step === 2 && 'Container Quantities'}
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
          
          {/* Step 1: Booking Number & Client Information */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-slide-in-right">
              
              {/* Booking Number */}
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-green-600 text-white rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-green-900">Booking Information</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-green-800 mb-2">
                    Booking Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bookingNumber}
                    onChange={(e) => handleInputChange('bookingNumber', e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono"
                    placeholder="e.g., BK-MAEU-2025-001"
                  />
                  <p className="text-xs text-green-600 mt-1">
                    This will be used as the booking reference ID throughout the application
                  </p>
                </div>
              </div>

              {/* Client Selection */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-600 text-white rounded-lg">
                    <User className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-blue-900">Client Information</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Select Client *
                  </label>
                  <ClientSearchField
                    clients={mockClients}
                    selectedClientId={formData.clientId}
                    onClientSelect={handleClientSelect}
                    placeholder="Search and select client..."
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Container Quantities */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-slide-in-right">
              
              {/* Maximum Quantity Threshold */}
              <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-purple-600 text-white rounded-lg">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-purple-900">Quantity Control</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    Maximum Quantity Threshold *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={formData.maxQuantityThreshold}
                    onChange={(e) => handleInputChange('maxQuantityThreshold', parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="10"
                  />
                  <p className="text-xs text-purple-600 mt-1">
                    Maximum containers allowed before requiring detailed breakdown per size
                  </p>
                </div>
              </div>

              {/* Container Quantities by Size */}
              <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-600 text-white rounded-lg">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-orange-900">Container Quantities by Size</h3>
                      <p className="text-sm text-orange-700">
                        Total: {formData.totalContainers} container{formData.totalContainers !== 1 ? 's' : ''}
                        {formData.requiresDetailedBreakdown && (
                          <span className="ml-2 px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full">
                            Detailed breakdown required
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 20ft Containers */}
                  <div className="bg-white rounded-lg p-4 border border-orange-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-gray-900">20" Containers</span>
                      </div>
                      <span className="text-xs text-gray-500">Standard</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange('size20ft', formData.containerQuantities.size20ft - 1)}
                        disabled={formData.containerQuantities.size20ft <= 0}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={formData.containerQuantities.size20ft}
                        onChange={(e) => handleQuantityChange('size20ft', parseInt(e.target.value) || 0)}
                        className="flex-1 text-center px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                      />
                      
                      <button
                        type="button"
                        onClick={() => handleQuantityChange('size20ft', formData.containerQuantities.size20ft + 1)}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* 40ft Containers */}
                  <div className="bg-white rounded-lg p-4 border border-orange-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-gray-900">40" Containers</span>
                      </div>
                      <span className="text-xs text-gray-500">High Capacity</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange('size40ft', formData.containerQuantities.size40ft - 1)}
                        disabled={formData.containerQuantities.size40ft <= 0}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={formData.containerQuantities.size40ft}
                        onChange={(e) => handleQuantityChange('size40ft', parseInt(e.target.value) || 0)}
                        className="flex-1 text-center px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-medium"
                      />
                      
                      <button
                        type="button"
                        onClick={() => handleQuantityChange('size40ft', formData.containerQuantities.size40ft + 1)}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* 45ft Containers */}
                  <div className="bg-white rounded-lg p-4 border border-orange-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-purple-600" />
                        <span className="font-medium text-gray-900">45" Containers</span>
                      </div>
                      <span className="text-xs text-gray-500">Extended</span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange('size45ft', formData.containerQuantities.size45ft - 1)}
                        disabled={formData.containerQuantities.size45ft <= 0}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={formData.containerQuantities.size45ft}
                        onChange={(e) => handleQuantityChange('size45ft', parseInt(e.target.value) || 0)}
                        className="flex-1 text-center px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
                      />
                      
                      <button
                        type="button"
                        onClick={() => handleQuantityChange('size45ft', formData.containerQuantities.size45ft + 1)}
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Container Summary */}
                {formData.totalContainers > 0 && (
                  <div className="mt-6 p-4 bg-white rounded-lg border-2 border-orange-300">
                    <h4 className="font-medium text-orange-900 mb-2">Container Summary</h4>
                    <div className="text-sm text-gray-700">
                      {getContainerBreakdownText()}
                    </div>
                    
                    {formData.requiresDetailedBreakdown && (
                      <div className="mt-3 flex items-center p-3 bg-orange-100 border border-orange-200 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-orange-600 mr-2" />
                        <p className="text-sm text-orange-800">
                          Total exceeds threshold ({formData.maxQuantityThreshold}). Detailed breakdown will be required for processing.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Additional Information */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Release Date
                    </label>
                    <DatePicker
                      value={formData.estimatedReleaseDate}
                      onChange={(date) => handleInputChange('estimatedReleaseDate', date)}
                      placeholder="Select estimated release date"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes & Special Instructions
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Enter any special instructions or notes..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          </form>
        </div>

        {/* Footer */}
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
              
              {currentStep < 2 ? (
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
                  disabled={!isFormValid || isLoading}
                  className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Create Booking Reference</span>
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
            
            {currentStep < 2 ? (
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
                disabled={!isFormValid || isLoading}
                className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Create Booking Reference</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};