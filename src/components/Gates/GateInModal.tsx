// GateInModal.tsx
import React from 'react';
import { Plus, Search, Filter, CheckCircle, Clock, AlertTriangle, Truck, Container as ContainerIcon, Package, User, MapPin, Calendar, X, Loader } from 'lucide-react';
import { Container } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { GateInFormData } from './GateIn'; // We'll define this interface in the main file

interface GateInModalProps {
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  formData: GateInFormData;
  setFormData: (data: GateInFormData) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isProcessing: boolean;
  autoSaving: boolean;
  validateStep: (step: number) => boolean;
  handleSubmit: (e: React.FormEvent) => void;
  handleNextStep: () => void;
  handlePrevStep: () => void;
  handleContainerSizeChange: (is40ft: boolean) => void;
  handleQuantityChange: (isDouble: boolean) => void;
  handleContainerNumberChange: (index: number, value: string) => void;
  handleClientSelect: (clientId: string) => void;
  handleInputChange: (field: keyof GateInFormData, value: any) => void;
  mockClients: Array<{ id: string; name: string; code: string }>;
  availableLocations: Array<{ id: string; name: string; capacity: number; available: number }>;
}

export const GateInModal: React.FC<GateInModalProps> = ({
  showForm,
  setShowForm,
  formData,
  setFormData,
  currentStep,
  setCurrentStep,
  isProcessing,
  autoSaving,
  validateStep,
  handleSubmit,
  handleNextStep,
  handlePrevStep,
  handleContainerSizeChange,
  handleQuantityChange,
  handleContainerNumberChange,
  handleClientSelect,
  handleInputChange,
  mockClients,
  availableLocations,
}) => {
  if (!showForm) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full h-full max-w-2xl shadow-strong animate-slide-in-up">
        
{/* Modal Header */}
<div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
  <div className="flex items-center justify-between">
    <div>
      <h3 className="text-xl font-bold text-gray-900">New Gate In Process</h3>
      <p className="text-sm text-gray-600 mt-1">Step {currentStep} of 3</p>
    </div>
    <div className="flex items-center space-x-3">
      {autoSaving && (
        <div className="flex items-center space-x-2 text-green-600">
          <Loader className="h-4 w-4 animate-spin" />
          <span className="text-sm">Auto-saving...</span>
        </div>
      )}
      <button
        onClick={() => setShowForm(false)}
        className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-white/50 transition-colors"
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  </div>
  
  {/* Progress Bar */}
  <div className="mt-6">
    <div className="relative">
      {/* Progress line */}
      <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 z-0"></div>
      <div 
        className="absolute top-4 left-0 h-1 bg-blue-600 z-10 transition-all duration-300" 
        style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
      ></div>
      
      <div className="flex justify-between relative z-20">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
              step <= currentStep 
                ? 'bg-blue-600 text-white border-2 border-blue-600' 
                : 'bg-white text-gray-500 border-2 border-gray-300'
            }`}>
              {step}
            </div>
            <span className={`mt-3 text-xs font-medium transition-colors duration-300 ${
              step <= currentStep ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {step === 1 && 'Container Info'}
              {step === 2 && 'Transport Details'}
              {step === 3 && 'Location & Validation'}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
</div>

        {/* Modal Body */}
        <div className="px-8 py-6 max-h-[60vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Container Configuration */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-slide-in-right">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Container Configuration
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Container Size Switch */}
                    <Switch
                      checked={formData.containerSize === '40ft'}
                      onChange={handleContainerSizeChange}
                      label="Container Size *"
                      leftLabel="20ft"
                      rightLabel="40ft"
                    />

                    {/* Quantity Switch - Only for 20ft containers */}
                    {formData.containerSize === '20ft' && (
                      <Switch
                        checked={formData.quantity === 2}
                        onChange={handleQuantityChange}
                        label="Quantity *"
                        leftLabel="Single (1)"
                        rightLabel="Double (2)"
                      />
                    )}
                  </div>

                  {/* Container Number Inputs */}
                  <div className="mt-6 space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Container Number{formData.quantity > 1 ? 's' : ''} *
                    </label>
                    {formData.containerNumbers.map((number, index) => (
                      <input
                        key={index}
                        type="text"
                        required
                        value={number}
                        onChange={(e) => handleContainerNumberChange(index, e.target.value)}
                        className="form-input w-full"
                        placeholder={`Container ${index + 1} number (e.g., MSKU-123456-7)`}
                      />
                    ))}
                  </div>
                </div>

                {/* Client Selection */}
                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Client Information
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Client *
                    </label>
                    <select
                      required
                      value={formData.client ? mockClients.find(c => c.name === formData.client)?.id || '' : ''}
                      onChange={(e) => handleClientSelect(e.target.value)}
                      className="form-input w-full"
                    >
                      <option value="">Choose a client...</option>
                      {mockClients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name} ({client.code})
                        </option>
                      ))}
                    </select>
                    {formData.client && (
                      <div className="mt-2 p-3 bg-white rounded-lg border">
                        <div className="text-sm">
                          <span className="font-medium">Selected:</span> {formData.client}
                          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {formData.clientCode}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Transport Information */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-slide-in-right">
                <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                    <Truck className="h-5 w-5 mr-2" />
                    Transport Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Transport Company *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.transportCompany}
                        onChange={(e) => handleInputChange('transportCompany', e.target.value)}
                        className="form-input w-full"
                        placeholder="Transport company name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Driver Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.driverName}
                        onChange={(e) => handleInputChange('driverName', e.target.value)}
                        className="form-input w-full"
                        placeholder="Driver full name"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.vehicleNumber}
                        onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                        className="form-input w-full"
                        placeholder="License plate number"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Location Assignment */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-slide-in-right">
                <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-4 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Location Assignment
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Location * (for {formData.containerSize} containers)
                    </label>
                    <select
                      required
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="form-input w-full"
                    >
                      <option value="">Choose location...</option>
                      {availableLocations.map((location) => (
                        <option key={location.id} value={location.name}>
                          {location.name} - {location.available}/{location.capacity} available
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Additional Details */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={3}
                      className="form-input w-full"
                      placeholder="Any additional notes or special instructions..."
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Gate In Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Container(s):</span>
                      <div className="font-medium">
                        {formData.containerNumbers.filter(n => n.trim()).join(', ')}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Size & Quantity:</span>
                      <div className="font-medium">{formData.containerSize} × {formData.quantity}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Client:</span>
                      <div className="font-medium">{formData.client}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Location:</span>
                      <div className="font-medium">{formData.location}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Driver:</span>
                      <div className="font-medium">{formData.driverName}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Vehicle:</span>
                      <div className="font-medium">{formData.vehicleNumber}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer - Fixed at Bottom */}
        <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
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
                onClick={() => setShowForm(false)}
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
                  disabled={isProcessing || !validateStep(currentStep)}
                  className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Complete Gate In</span>
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

// Switch component remains the same as in the original file
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  leftLabel: string;
  rightLabel: string;
  disabled?: boolean;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, leftLabel, rightLabel, disabled = false }) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center space-x-4">
        <span className={`text-sm font-medium ${!checked ? 'text-blue-600' : 'text-gray-500'}`}>
          {leftLabel}
        </span>
        <button
          type="button"
          onClick={() => !disabled && onChange(!checked)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            checked ? 'bg-blue-600' : 'bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              checked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${checked ? 'text-blue-600' : 'text-gray-500'}`}>
          {rightLabel}
        </span>
      </div>
    </div>
  );
};