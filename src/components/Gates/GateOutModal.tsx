import React, { useState } from 'react';
import { X, Loader, Package, User, Truck, CheckCircle, AlertTriangle, FileText, Calculator, Plus, Minus, Box, Ruler } from 'lucide-react';
import { ReleaseOrderSearchField } from './ReleaseOrderSearchField';
import { useAuth } from '../../hooks/useAuth';

interface GateOutModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  availableReleaseOrders: ReleaseOrder[];
  onSubmit: (data: any) => void;
  isProcessing: boolean;
}

interface GateOutFormData {
  selectedReleaseOrderId: string;
  driverName: string;
  vehicleNumber: string;
  transportCompany: string;
  notes: string;
}

export const GateOutModal: React.FC<GateOutModalProps> = ({
  showModal,
  setShowModal,
  availableReleaseOrders,
  onSubmit,
  isProcessing
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [autoSaving, setAutoSaving] = useState(false);
  
  const [formData, setFormData] = useState<GateOutFormData>({
    selectedReleaseOrderId: '',
    driverName: '',
    vehicleNumber: '',
    transportCompany: '',
    notes: ''
  });

  const selectedReleaseOrder = availableReleaseOrders.find(
    order => order.id === formData.selectedReleaseOrderId
  );

  const handleInputChange = (field: keyof GateOutFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Trigger auto-save
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
  };

  const handleReleaseOrderChange = (releaseOrderId: string) => {
    // Handle reset case (empty releaseOrderId)
    if (!releaseOrderId) {
      setFormData(prev => ({
        ...prev,
        selectedReleaseOrderId: '',
        driverName: '',
        vehicleNumber: '',
        transportCompany: ''
      }));
      return;
    }

    // Handle selection case
    const order = availableReleaseOrders.find(o => o.id === releaseOrderId);
    if (order) {
      setFormData(prev => ({
        ...prev,
        selectedReleaseOrderId: releaseOrderId,
        driverName: order.driverName || '',
        vehicleNumber: order.vehicleNumber || '',
        transportCompany: order.transportCompany || ''
      }));
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.selectedReleaseOrderId !== '';
      case 2:
        return formData.driverName !== '' && formData.vehicleNumber !== '' && 
               formData.transportCompany !== '';
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

  const handleSubmit = () => {
    if (!validateStep(currentStep)) return;
    
    // Validate that we have all required data
    if (!selectedReleaseOrder) {
      alert('Please select a release order.');
      return;
    }

    if (!formData.driverName || !formData.vehicleNumber || !formData.transportCompany) {
      alert('Please fill in all transport information.');
      return;
    }

    const submitData = {
      ...formData,
      releaseOrder: selectedReleaseOrder,
    };
    
    onSubmit(submitData);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong animate-slide-in-up max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">New Gate Out Process</h3>
              <p className="text-sm text-gray-600 mt-1">Process containers for gate out operations</p>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
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
                      {step === 1 && 'Order & Container Specs'}
                      {step === 2 && 'Transport Details'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
            
            {/* Step 1: Release Order & Container Specifications */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-slide-in-right">
                
                {/* Release Order Selection */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Release Order Selection
                  </h4>
                  
                  <div className="space-y-4">
                    <ReleaseOrderSearchField
                      releaseOrders={availableReleaseOrders}
                      selectedOrderId={formData.selectedReleaseOrderId}
                      onOrderSelect={handleReleaseOrderChange}
                      placeholder="Search and select a release order..."
                      required
                      canViewAllData={user?.role !== 'client'}
                    />

                    {/* Release Order Details */}
                    {selectedReleaseOrder && (
                      <div className="bg-white p-4 rounded-lg border border-blue-200 mt-4">
                        <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                          Selected Release Order
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Booking Number:</span>
                            <span className="font-medium">{selectedReleaseOrder.bookingNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Client:</span>
                            <span className="font-medium truncate ml-2">
                              {user?.role === 'client' ? 'Your Company' : selectedReleaseOrder.clientName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              selectedReleaseOrder.status === 'validated' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {selectedReleaseOrder.status}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="font-medium">{selectedReleaseOrder.createdAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {!formData.selectedReleaseOrderId && (
                  <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">
                      Please select a release order to continue.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Transport Details */}
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
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    Operation Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Booking Number:</span>
                      <div className="font-medium">{selectedReleaseOrder?.bookingNumber || 'Not selected'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Driver:</span>
                      <div className="font-medium">{formData.driverName || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Vehicle:</span>
                      <div className="font-medium">{formData.vehicleNumber || 'Not specified'}</div>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-gray-600">Transport Company:</span>
                      <div className="font-medium">{formData.transportCompany || 'Not specified'}</div>
                    </div>
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
                    className="form-input w-full"
                    rows={3}
                    placeholder="Enter any additional notes or special instructions..."
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer - Fixed */}
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
                onClick={() => setShowModal(false)}
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
                      <span>Process Gate Out</span>
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