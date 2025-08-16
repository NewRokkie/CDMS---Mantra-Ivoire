import React from 'react';
import { X, Loader, Package, User, Truck, MapPin, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { GateInFormData } from './GateIn';
import { ClientSearchField } from '../Common/ClientSearchField';
import { TimePicker } from '../Common/TimePicker';

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
  handleSubmit: () => void;
  handleNextStep: () => void;
  handlePrevStep: () => void;
  handleInputChange: (field: keyof GateInFormData, value: any) => void;
  handleContainerSizeChange: (size: '20ft' | '40ft') => void;
  handleQuantityChange: (quantity: 1 | 2) => void;
  handleStatusChange: (isFullStatus: boolean) => void;
  handleDamageChange: (isDamaged: boolean) => void;
  handleClientChange: (clientId: string) => void;
  mockClients: Array<{ id: string; code: string; name: string }>;
}

export const GateInModal: React.FC<GateInModalProps> = ({
  showForm,
  setShowForm,
  formData,
  currentStep,
  isProcessing,
  autoSaving,
  validateStep,
  handleSubmit,
  handleNextStep,
  handlePrevStep,
  handleInputChange,
  handleContainerSizeChange,
  handleQuantityChange,
  handleStatusChange,
  handleDamageChange,
  handleClientChange,
  mockClients,
}) => {
  if (!showForm) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in !mt-0">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong animate-slide-in-up max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">New Gate In Process</h3>
              <p className="text-xs text-gray-600">Step {currentStep} of 2</p>
            </div>
            <div className="flex items-center space-x-3">
              {autoSaving && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Auto-saving...</span>
                </div>
              )}
              <button
                onClick={() => setShowForm(false)}
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
                style={{ width: `${((currentStep - 1) / 1) * 100}%` }}
              ></div>
              
              <div className="flex justify-between relative z-20">
                {[1, 2].map((step) => (
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
                      {step === 1 && 'Container Info'}
                      {step === 2 && 'Transport & Summary'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
            
            {/* Step 1: Container Information */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-slide-in-right">
                
                {/* Container Details */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Container Information
                  </h4>
                  
                  <div className="space-y-4">
                    {/* Container Size and Quantity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Container Size *
                        </label>
                        <Switch
                          checked={formData.containerSize === '40ft'}
                          onChange={(is40ft) => handleContainerSizeChange(is40ft ? '40ft' : '20ft')}
                          label=""
                          leftLabel="20ft"
                          rightLabel="40ft"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity *
                        </label>
                        <Switch
                          checked={formData.containerQuantity === 2}
                          onChange={(isDouble) => handleQuantityChange(isDouble ? 2 : 1)}
                          label=""
                          leftLabel="Single (1)"
                          rightLabel="Double (2)"
                          disabled={formData.containerSize === '40ft'}
                        />
                        {formData.containerSize === '40ft' && (
                          <p className="text-xs text-gray-500 mt-1">40ft containers limited to single quantity</p>
                        )}
                      </div>
                    </div>

                    {/* Status Switches */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Container Status *
                        </label>
                        <Switch
                          checked={formData.status === 'FULL'}
                          onChange={handleStatusChange}
                          label=""
                          leftLabel="EMPTY"
                          rightLabel="FULL"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Damage Status
                        </label>
                        <Switch
                          checked={formData.isDamaged}
                          onChange={handleDamageChange}
                          label=""
                          leftLabel="Normal"
                          rightLabel="Damaged"
                        />
                      </div>
                    </div>

                    {/* Client Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client *
                      </label>
                      <ClientSearchField
                        clients={mockClients}
                        selectedClientId={formData.clientId}
                        onClientSelect={handleClientChange}
                        placeholder="Search client by name or code..."
                        required
                      />
                    </div>

                    {/* Booking Reference - Only for FULL containers */}
                    {formData.status === 'FULL' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Booking Reference *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.bookingReference}
                          onChange={(e) => handleInputChange('bookingReference', e.target.value)}
                          className="form-input w-full"
                          placeholder="e.g., BK-MAE-2025-001"
                        />
                      </div>
                    )}

                    {/* Container Numbers - Moved to the end */}
                    <div className="space-y-4 pt-4 border-t border-blue-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Container Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.containerNumber}
                          onChange={(e) => handleInputChange('containerNumber', e.target.value)}
                          className="form-input w-full"
                          placeholder="e.g., MSKU1234567"
                          pattern="[A-Z]{4}[0-9]{7}"
                          title="Format: 4 letters followed by 7 digits"
                        />
                      </div>

                      {/* Second Container Number (if quantity is 2) */}
                      {formData.containerQuantity === 2 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Second Container Number *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.secondContainerNumber}
                            onChange={(e) => handleInputChange('secondContainerNumber', e.target.value)}
                            className="form-input w-full"
                            placeholder="e.g., MSKU1234568"
                            pattern="[A-Z]{4}[0-9]{7}"
                            title="Format: 4 letters followed by 7 digits"
                          />
                        </div>
                      )}
                    </div>

                    {/* Damage Warning */}
                    {formData.isDamaged && (
                      <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                        <p className="text-sm text-red-800">
                          Container will be automatically assigned to damage stack for inspection.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Transport Details & Summary */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-slide-in-right">
                
                {/* Transport Information */}
                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                    <Truck className="h-5 w-5 mr-2" />
                    Transport Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Truck Number *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.truckNumber}
                        onChange={(e) => handleInputChange('truckNumber', e.target.value)}
                        className="form-input w-full"
                        placeholder="License plate number"
                      />
                    </div>

                    <div className="md:col-span-2">
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
                  </div>
                </div>

                {/* Operation Summary */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Operation Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Container:</span>
                      <div className="font-medium">{formData.containerNumber || 'Not specified'}</div>
                      {formData.secondContainerNumber && (
                        <div className="font-medium">{formData.secondContainerNumber}</div>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-600">Size & Quantity:</span>
                      <div className="font-medium">{formData.containerSize} • Qty: {formData.containerQuantity}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Client:</span>
                      <div className="font-medium">{formData.clientCode ? `${formData.clientCode} - ${formData.clientName}` : 'Not selected'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          formData.status === 'FULL' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {formData.status}
                        </span>
                        {formData.isDamaged && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                            Damaged
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Driver:</span>
                      <div className="font-medium">{formData.driverName || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Truck:</span>
                      <div className="font-medium">{formData.truckNumber || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Transport Company:</span>
                      <div className="font-medium">{formData.transportCompany || 'Not specified'}</div>
                    </div>
                    {formData.bookingReference && (
                      <div>
                        <span className="text-gray-600">Booking Reference:</span>
                        <div className="font-medium">{formData.bookingReference}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
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
            )}
          </form>
        </div>

        {/* Modal Footer - Fixed */}
        <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
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
                  onClick={() => handleSubmit()}
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
                      <span>Submit Operation</span>
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

// Switch component for toggle controls
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
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
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