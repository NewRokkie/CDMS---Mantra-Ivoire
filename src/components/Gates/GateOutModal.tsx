import React, { useState } from 'react';
import { X, Loader, Package, User, Truck, CheckCircle, AlertTriangle, FileText, Calendar } from 'lucide-react';
import { ReleaseOrder } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { ReleaseOrderSearchField } from './ReleaseOrderSearchField';

interface GateOutModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  availableReleaseOrders: ReleaseOrder[];
  onSubmit: (data: any) => void;
  isProcessing: boolean;
}

interface GateOutFormData {
  selectedReleaseOrderId: string;
  selectedContainers: string[];
  driverName: string;
  vehicleNumber: string;
  transportCompany: string;
  gateOutDate: string;
  gateOutTime: string;
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
    selectedContainers: [],
    driverName: '',
    vehicleNumber: '',
    transportCompany: '',
    gateOutDate: new Date().toISOString().split('T')[0],
    gateOutTime: new Date().toTimeString().slice(0, 5),
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
    const order = availableReleaseOrders.find(o => o.id === releaseOrderId);
    if (order) {
      setFormData(prev => ({
        ...prev,
        selectedReleaseOrderId: releaseOrderId,
        selectedContainers: [],
        driverName: order.driverName,
        vehicleNumber: order.vehicleNumber,
        transportCompany: order.transportCompany
      }));
    }
  };

  const handleContainerSelection = (containerId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedContainers: prev.selectedContainers.includes(containerId)
        ? prev.selectedContainers.filter(id => id !== containerId)
        : [...prev.selectedContainers, containerId]
    }));
  };

  const handleSelectAllContainers = () => {
    if (!selectedReleaseOrder) return;
    
    const readyContainerIds = selectedReleaseOrder.containers
      .filter(c => c.status === 'ready')
      .map(c => c.id);
    
    setFormData(prev => ({
      ...prev,
      selectedContainers: prev.selectedContainers.length === readyContainerIds.length 
        ? [] 
        : readyContainerIds
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.selectedReleaseOrderId !== '' && formData.selectedContainers.length > 0;
      case 2:
        return formData.driverName !== '' && formData.vehicleNumber !== '' && 
               formData.transportCompany !== '' && formData.gateOutDate !== '' && 
               formData.gateOutTime !== '';
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
    if (!selectedReleaseOrder || formData.selectedContainers.length === 0) {
      alert('Please select a release order and at least one container.');
      return;
    }

    if (!formData.driverName || !formData.vehicleNumber || !formData.transportCompany) {
      alert('Please fill in all transport information.');
      return;
    }

    if (!formData.gateOutDate || !formData.gateOutTime) {
      alert('Please specify gate out date and time.');
      return;
    }
    
    const submitData = {
      ...formData,
      releaseOrder: selectedReleaseOrder,
      selectedContainerDetails: selectedReleaseOrder?.containers.filter(c => 
        formData.selectedContainers.includes(c.id)
      ),
      gateOutDateTime: `${formData.gateOutDate}T${formData.gateOutTime}:00`
    };
    
    onSubmit(submitData);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in !mt-0">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong animate-slide-in-up max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">New Gate Out Process</h3>
              <p className="text-sm text-gray-600 mt-1">Step {currentStep} of 2</p>
            </div>
            <div className="flex items-center space-x-3">
              {autoSaving && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Auto-saving...</span>
                </div>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute top-4 left-0 right-0 h-1 bg-gray-200 z-0"></div>
              <div 
                className="absolute top-4 left-0 h-1 bg-blue-600 z-10 transition-all duration-300" 
                style={{ width: `${((currentStep - 1) / 1) * 100}%` }}
              ></div>
              
              <div className="flex justify-between relative z-20">
                {[1, 2].map((step) => (
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
                      {step === 1 && 'Release Order & Containers'}
                      {step === 2 && 'Gate Out Details'}
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
            
            {/* Step 1: Release Order & Container Selection */}
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
                            <span className="text-gray-600">Order ID:</span>
                            <span className="font-medium">{selectedReleaseOrder.id}</span>
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
                            <span className="text-gray-600">Containers:</span>
                            <span className="font-medium">
                              {selectedReleaseOrder.containers.filter(c => c.status === 'ready').length}/
                              {selectedReleaseOrder.containers.length} ready
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="font-medium">{selectedReleaseOrder.createdAt.toLocaleDateString()}</span>
                          </div>
                          {selectedReleaseOrder.estimatedReleaseDate && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Est. Release:</span>
                              <span className="font-medium text-blue-600">
                                {selectedReleaseOrder.estimatedReleaseDate.toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Container Selection */}
{selectedReleaseOrder && (
  <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-2">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Package className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-800">Select Containers</h4>
          <p className="text-xs text-gray-500">
            {formData.selectedContainers.length} of {selectedReleaseOrder.containers.filter(c => c.status === 'ready').length} ready containers selected
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleSelectAllContainers}
        className="text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-1 hover:bg-blue-50 rounded-md transition-colors"
      >
        {formData.selectedContainers.length === selectedReleaseOrder.containers.filter(c => c.status === 'ready').length 
          ? 'Deselect All' : 'Select All Ready'}
      </button>
    </div>
    
    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
      {selectedReleaseOrder.containers.map((container) => (
        <div
          key={container.id}
          onClick={() => container.status === 'ready' && handleContainerSelection(container.id)}
          className={`p-4 border rounded-lg transition-all duration-200 cursor-pointer ${
            container.status === 'ready' 
              ? formData.selectedContainers.includes(container.id)
                ? 'border-blue-300 bg-blue-50 shadow-sm ring-2 ring-blue-100'
                : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50'
              : 'border-gray-100 bg-gray-50 cursor-not-allowed'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {/* Custom checkbox */}
              <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                formData.selectedContainers.includes(container.id)
                  ? 'bg-blue-600 border-blue-600'
                  : container.status === 'ready'
                  ? 'border-gray-300 bg-white hover:border-blue-400'
                  : 'border-gray-200 bg-gray-100'
              }`}>
                {formData.selectedContainers.includes(container.id) && (
                  <Check className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{container.containerNumber}</span>
                  <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                    container.status === 'ready' ? 'bg-green-100 text-green-800' :
                    container.status === 'released' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {container.status.charAt(0).toUpperCase() + container.status.slice(1)}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mt-1">
                  {container.containerType} • {container.containerSize}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <div className="flex items-center text-xs text-gray-500">
                    <MapPin className="w-3 h-3 mr-1" />
                    {container.currentLocation}
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="w-3 h-3 mr-1" />
                    Added {container.addedAt.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Selection indicator */}
            {formData.selectedContainers.includes(container.id) && (
              <div className="flex items-center">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full flex items-center">
                  <Check className="w-3 h-3 mr-1" />
                  Selected
                </span>
              </div>
            )}
          </div>
          
          {container.status !== 'ready' && (
            <div className="mt-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-flex items-center">
              <Info className="w-3 h-3 mr-1" />
              Not available for release
            </div>
          )}
        </div>
      ))}
    </div>
    
    {/* Selected count footer */}
    {formData.selectedContainers.length > 0 && (
      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">
          {formData.selectedContainers.length} container{formData.selectedContainers.length !== 1 ? 's' : ''} selected
        </span>
        <button 
          type="button"
          onClick={() => setFormData({...formData, selectedContainers: []})}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Clear selection
        </button>
      </div>
    )}
  </div>
)}

                {/* Validation Messages */}
                {!formData.selectedReleaseOrderId && (
                  <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">
                      Please select a release order to continue.
                    </p>
                  </div>
                )}

                {formData.selectedReleaseOrderId && formData.selectedContainers.length === 0 && (
                  <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                    <p className="text-sm text-yellow-800">
                      Please select at least one container for gate out.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Gate Out Details */}
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

                {/* Gate Out Date & Time */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Gate Out Date & Time
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gate Out Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.gateOutDate}
                        onChange={(e) => handleInputChange('gateOutDate', e.target.value)}
                        className="form-input w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gate Out Time *
                      </label>
                      <input
                        type="time"
                        required
                        value={formData.gateOutTime}
                        onChange={(e) => handleInputChange('gateOutTime', e.target.value)}
                        className="form-input w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Operation Summary */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Operation Summary</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Release Order:</span>
                      <div className="font-medium">{formData.selectedReleaseOrderId}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Containers:</span>
                      <div className="font-medium">{formData.selectedContainers.length} selected</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Driver:</span>
                      <div className="font-medium">{formData.driverName || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Vehicle:</span>
                      <div className="font-medium">{formData.vehicleNumber || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Transport Company:</span>
                      <div className="font-medium">{formData.transportCompany || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Gate Out:</span>
                      <div className="font-medium">
                        {formData.gateOutDate && formData.gateOutTime 
                          ? `${formData.gateOutDate} at ${formData.gateOutTime}`
                          : 'Not specified'
                        }
                      </div>
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