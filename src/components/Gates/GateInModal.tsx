import React from 'react';
import { X, Loader, Package, User, Truck, MapPin, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { GateInFormData, GateInModalProps } from './types';
import { ClientSearchField } from '../Common/ClientSearchField';
import { TimePicker } from '../Common/TimePicker';
import { DatePicker } from '../Common/DatePicker';
import { ContainerTypeSelect, containerTypeOptions } from './GateInModal/ContainerTypeSelect';
import { Switch } from './GateInModal/Switch';
import { getContainerValidationStatus, formatContainerNumberForDisplay } from './utils';

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
  const { user } = useAuth();
  const canManageTimeTracking = user?.role === 'admin' || user?.role === 'supervisor';

  if (!showForm) return null;

  // Get the current container type option
  const currentContainerType = containerTypeOptions.find(
    option => option.value === formData.containerType
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in !mt-0">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong animate-slide-in-up max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">

        {/* Modal Header - Fixed */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-200 bg-white rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">New Gate In Process</h3>
              <p className="text-xs sm:text-sm text-gray-600">Step {currentStep} of 2</p>
            </div>
            <div className="flex items-center space-x-3">
              {autoSaving && (
                <div className="hidden sm:flex items-center space-x-2 text-green-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Auto-saving...</span>
                </div>
              )}
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 p-2 sm:p-1.5 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="h-6 w-6 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 sm:mt-4">
            <div className="relative">
              <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200 z-0"></div>
              <div
                className="absolute top-3 left-0 h-0.5 bg-blue-600 z-10 transition-all duration-300"
                style={{ width: `${((currentStep - 1) / 1) * 100}%` }}
              ></div>

              <div className="flex justify-between relative z-20">
                {[1, 2].map((step) => (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-8 h-8 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                      step <= currentStep
                        ? 'bg-blue-600 text-white border border-blue-600'
                        : 'bg-white text-gray-500 border border-gray-300'
                    }`}>
                      {step}
                    </div>
                    <span className={`mt-1.5 text-xs sm:text-xs font-medium transition-colors duration-300 text-center ${
                      step <= currentStep ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step === 1 && (
                        <span className="block">
                          <span className="sm:hidden">Info</span>
                          <span className="hidden sm:inline">Container Info</span>
                        </span>
                      )}
                      {step === 2 && (
                        <span className="block">
                          <span className="sm:hidden">Transport</span>
                          <span className="hidden sm:inline">Transport & Summary</span>
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (currentStep < 2) {
              handleNextStep();
            } else {
              handleSubmit();
            }
          }} className="space-y-6">

            {/* Step 1: Container Information */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-slide-in-right">

                {/* Container Details */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Container Information
                  </h4>

                  <div className="space-y-6">
                    {/* Container Size and Quantity */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Container Size *
                        </label>
                        <Switch
                          checked={formData.containerSize === '40ft'}
                          onChange={(is40ft) => {
                            const newSize = is40ft ? '40ft' : '20ft';
                            handleContainerSizeChange(newSize);
                            // Reset quantity to 1 if switching to 40ft and current quantity is 2
                            if (newSize === '40ft' && formData.containerQuantity === 2) {
                              handleQuantityChange(1);
                            }
                          }}
                          label=""
                          leftLabel="20ft"
                          rightLabel="40ft"
                        />
                      </div>

                      <div>
                        <ContainerTypeSelect
                          value={formData.containerType}
                          onChange={(value: string) => handleInputChange('containerType', value)}
                          containerSize={formData.containerSize}
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
                          <p className="text-xs text-gray-500 mt-2">40ft containers limited to single quantity</p>
                        )}
                      </div>
                    </div>

                    {/* Status Switches */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                          className="form-input w-full text-base py-4"
                          placeholder="e.g., BK-MAE-2025-001"
                        />
                      </div>
                    )}

                    {/* Container Numbers - Moved to the end */}
                    <div className="space-y-4 pt-4 border-t border-blue-200">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Container Number *
                        </label>
                        <div className="relative">
                        <input
                          type="text"
                          required
                          value={formData.containerNumber}
                          onChange={(e) => handleInputChange('containerNumber', e.target.value)}
                          className={`form-input w-full pr-20 ${
                            formData.containerNumber && !getContainerValidationStatus(formData.containerNumber).isValid
                              ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                              : formData.containerNumber && getContainerValidationStatus(formData.containerNumber).isValid
                              ? 'border-green-300 bg-green-50 focus:ring-green-500 focus:border-green-500'
                              : ''
                          } text-base py-4`}
                          placeholder="e.g., MSKU1234567"
                          maxLength={11}
                        />
                        {/* Validation Status */}
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                          {formData.containerNumber && (
                            <>
                              {getContainerValidationStatus(formData.containerNumber).isValid ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                              )}
                              <span className={`hidden sm:inline text-xs font-medium ${
                                getContainerValidationStatus(formData.containerNumber).isValid
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {getContainerValidationStatus(formData.containerNumber).message}
                              </span>
                            </>
                          )}
                        </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Format: 4 letters + 7 numbers (e.g., ONEU1234567) • Display: {formData.containerNumber ? formatContainerNumberForDisplay(formData.containerNumber) : 'ONEU-123456-7'}
                        </p>
                      </div>

                      {/* Second Container Number (if quantity is 2) */}
                      {formData.containerQuantity === 2 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Second Container Number *
                          </label>
                          <div className="relative">
                          <input
                            type="text"
                            required
                            value={formData.secondContainerNumber}
                            onChange={(e) => handleInputChange('secondContainerNumber', e.target.value)}
                            className={`form-input w-full pr-20 ${
                              formData.secondContainerNumber && !getContainerValidationStatus(formData.secondContainerNumber).isValid
                                ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500'
                                : formData.secondContainerNumber && getContainerValidationStatus(formData.secondContainerNumber).isValid
                                ? 'border-green-300 bg-green-50 focus:ring-green-500 focus:border-green-500'
                                : ''
                            } text-base py-4`}
                            placeholder="e.g., MSKU1234568"
                            maxLength={11}
                          />
                          {/* Validation Status */}
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                            {formData.secondContainerNumber && (
                              <>
                                {getContainerValidationStatus(formData.secondContainerNumber).isValid ? (
                                  <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                  <AlertTriangle className="h-5 w-5 text-red-500" />
                                )}
                                <span className={`hidden sm:inline text-xs font-medium ${
                                  getContainerValidationStatus(formData.secondContainerNumber).isValid
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                }`}>
                                  {getContainerValidationStatus(formData.secondContainerNumber).message}
                                </span>
                              </>
                            )}
                          </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Format: 4 letters + 7 numbers (e.g., ONEU1234568) • Display: {formData.secondContainerNumber ? formatContainerNumberForDisplay(formData.secondContainerNumber) : 'ONEU-123456-8'}
                          </p>
                        </div>
                      )}
                      </div>
                    </div>

                    {/* Damage Warning */}
                    {formData.isDamaged && (
                      <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800 leading-relaxed">
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

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Driver Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.driverName}
                        onChange={(e) => handleInputChange('driverName', e.target.value)}
                        className="form-input w-full text-base py-4"
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
                        className="form-input w-full text-base py-4"
                        placeholder="License plate number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Transport Company *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.transportCompany}
                        onChange={(e) => handleInputChange('transportCompany', e.target.value)}
                        className="form-input w-full text-base py-4"
                        placeholder="Transport company name"
                      />
                    </div>
                    </div>
                  </div>
                </div>

                {/* Truck Arrival Time Tracking */}
                {canManageTimeTracking && (
                  <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-orange-600 text-white rounded-lg">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-900">Truck Arrival Time</h4>
                        <p className="text-sm text-orange-700">Manual time tracking (Admin only) - Defaults to current system time</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-orange-800 mb-2">
                          Arrival Date
                        </label>
                        <DatePicker
                          value={formData.truckArrivalDate}
                          onChange={(date) => handleInputChange('truckArrivalDate', date)}
                          placeholder="Current system date"
                          required={false}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-orange-800 mb-2">
                          Arrival Time
                        </label>
                        <TimePicker
                          value={formData.truckArrivalTime}
                          onChange={(time) => handleInputChange('truckArrivalTime', time)}
                          placeholder="Current system time"
                          required={false}
                          includeSeconds={true}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Operation Summary */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Operation Summary</h4>
                  <div className="space-y-3 text-sm">
                    {/* Mobile: Stack layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <div className="font-medium">
                        {formData.containerType.charAt(0).toUpperCase() + formData.containerType.slice(1).replace('_', ' ')}
                        {formData.containerType && currentContainerType && (
                          <span className="text-blue-600 ml-1">
                            ({formData.containerSize === '20ft'
                              ? currentContainerType.code20
                              : currentContainerType.code40})
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Client:</span>
                      <div className="font-medium">{formData.clientCode ? `${formData.clientCode} - ${formData.clientName}` : 'Not selected'}</div>
                    </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-600">Truck:</span>
                      <div className="font-medium">{formData.truckNumber || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Transport Company:</span>
                      <div className="font-medium">{formData.transportCompany || 'Not specified'}</div>
                    </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-600">Arrival Date:</span>
                      <div className="font-medium">{formData.truckArrivalDate || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Arrival Time:</span>
                      <div className="font-medium">{formData.truckArrivalTime || 'Not specified'}</div>
                    </div>
                    </div>
                    {formData.bookingReference && (
                      <div className="md:col-span-2">
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
                    className="form-input w-full text-base py-4 resize-none"
                    placeholder="Any additional notes or special instructions..."
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer - Fixed */}
        <div className="px-4 sm:px-8 py-3 sm:py-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Previous Button */}
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                className="btn-secondary px-3 py-2 sm:px-6 sm:py-2 text-sm"
              >
                <span className="sm:hidden">← Prev</span>
                <span className="hidden sm:inline">Previous</span>
              </button>
            )}

            {/* Right: Cancel + Next/Submit */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary px-3 py-2 sm:px-6 sm:py-2 text-sm"
              >
                <span className="sm:hidden">✕</span>
                <span className="hidden sm:inline">Cancel</span>
              </button>

              {currentStep < 2 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!validateStep(currentStep)}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 sm:px-6 sm:py-2 text-sm flex items-center gap-1.5"
                >
                  <span className="sm:hidden">Next →</span>
                  <span className="hidden sm:inline">Next Step</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isProcessing || !validateStep(currentStep)}
                  className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 px-3 py-2 sm:px-6 sm:py-2 text-sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 sm:h-4 sm:w-4" />
                      <span className="sm:hidden">Submit</span>
                      <span className="hidden sm:inline">Submit Operation</span>
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
