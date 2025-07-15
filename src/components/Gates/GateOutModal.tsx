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
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                      <div>
                        <h4 className="font-semibold text-green-900 flex items-center text-lg">
                          <Package className="h-5 w-5 mr-2" />
                          Select Containers for Gate Out
                        </h4>
                        <p className="text-sm text-green-700 mt-1">
                          {formData.selectedContainers.length} of {selectedReleaseOrder.containers.filter(c => c.status === 'ready').length} containers selected
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleSelectAllContainers}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md transform hover:-translate-y-0.5 whitespace-nowrap"
                      >
                        {formData.selectedContainers.length === selectedReleaseOrder.containers.filter(c => c.status === 'ready').length 
                          ? '✓ Deselect All' : '+ Select All Ready'}
                      </button>
                    </div>
                    
                    {/* Selection Summary */}
                    {formData.selectedContainers.length > 0 && (
                      <div className="mb-4 p-3 bg-white/60 backdrop-blur-sm rounded-lg border border-green-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-800 font-medium">
                            Ready to process {formData.selectedContainers.length} container{formData.selectedContainers.length !== 1 ? 's' : ''}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-green-600 text-xs">Selected</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Container Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto scrollbar-thin pr-2">
                      {selectedReleaseOrder.containers.map((container) => (
                        <div
                          key={container.id}
                          onClick={() => container.status === 'ready' && handleContainerSelection(container.id)}
                          className={`group relative p-4 rounded-xl transition-all duration-300 cursor-pointer transform ${
                            container.status === 'ready' 
                              ? formData.selectedContainers.includes(container.id)
                                ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-400 shadow-lg scale-[1.02] ring-2 ring-blue-200'
                                : 'bg-white border-2 border-gray-200 hover:border-green-300 hover:shadow-md hover:scale-[1.01] hover:bg-green-50/30'
                              : 'bg-gray-50 border-2 border-gray-200 cursor-not-allowed opacity-50'
                          }`}
                        >
                          {/* Selection Indicator */}
                          <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                            formData.selectedContainers.includes(container.id)
                              ? 'bg-blue-500 border-blue-500 shadow-lg scale-110'
                              : container.status === 'ready'
                              ? 'bg-white border-gray-300 group-hover:border-green-400 group-hover:bg-green-50'
                              : 'bg-gray-200 border-gray-300'
                          }`}>
                            {formData.selectedContainers.includes(container.id) ? (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : container.status === 'ready' ? (
                              <div className="w-2 h-2 bg-gray-400 rounded-full group-hover:bg-green-500 transition-colors duration-200"></div>
                            ) : null}
                          </div>

                          <div className="space-y-3">
                            {/* Container Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-sm truncate">
                                  {container.containerNumber}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  {container.containerType} • {container.containerSize}
                                </div>
                              </div>
                              
                              {/* Status Badge */}
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full shrink-0 ${
                                container.status === 'ready' ? 'bg-green-100 text-green-800' :
                                container.status === 'released' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {container.status}
                              </span>
                            </div>

                            {/* Container Details */}
                            <div className="space-y-2">
                              <div className="flex items-center text-xs text-gray-600">
                                <svg className="w-3 h-3 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="truncate">{container.currentLocation}</span>
                              </div>
                              
                              <div className="flex items-center text-xs text-gray-600">
                                <svg className="w-3 h-3 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a2 2 0 012 2v1l-1 1v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8l-1-1V9a2 2 0 012-2h3z" />
                                </svg>
                                <span>Added {container.addedAt.toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* Selection Feedback */}
                            {formData.selectedContainers.includes(container.id) && (
                              <div className="flex items-center justify-center py-2 bg-blue-100 rounded-lg">
                                <svg className="w-4 h-4 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="text-blue-800 text-xs font-medium">Selected for Gate Out</span>
                              </div>
                            )}

                            {/* Unavailable State */}
                            {container.status !== 'ready' && (
                              <div className="flex items-center justify-center py-2 bg-gray-100 rounded-lg">
                                <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <span className="text-gray-600 text-xs">Not available for release</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Empty State */}
                    {selectedReleaseOrder.containers.filter(c => c.status === 'ready').length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-yellow-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Ready Containers</h3>
                        <p className="text-gray-600 text-sm">
                          This release order has no containers ready for gate out.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Selection Actions */}
                {selectedReleaseOrder && selectedReleaseOrder.containers.filter(c => c.status === 'ready').length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const readyContainers = selectedReleaseOrder.containers.filter(c => c.status === 'ready');
                        const twentyFtContainers = readyContainers.filter(c => c.containerSize === '20ft').map(c => c.id);
                        setFormData(prev => ({ ...prev, selectedContainers: twentyFtContainers }));
                      }}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium"
                    >
                      Select 20ft Only
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const readyContainers = selectedReleaseOrder.containers.filter(c => c.status === 'ready');
                        const fortyFtContainers = readyContainers.filter(c => c.containerSize === '40ft').map(c => c.id);
                        setFormData(prev => ({ ...prev, selectedContainers: fortyFtContainers }));
                      }}
                      className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-xs font-medium"
                    >
                      Select 40ft Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, selectedContainers: [] }))}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs font-medium"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}

                {/* Validation Messages */}
                {!formData.selectedReleaseOrderId && (
                  <div className="flex items-center p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Release Order Required</p>
                      <p className="text-xs text-amber-700 mt-1">Please select a release order to continue with container selection.</p>
                    </div>
                  </div>
                )}

                {formData.selectedReleaseOrderId && formData.selectedContainers.length === 0 && (
                  <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <AlertTriangle className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Container Selection Required</p>
                      <p className="text-xs text-blue-700 mt-1">Please select at least one container for gate out processing.</p>
                    </div>
                  </div>
                )}

                {formData.selectedContainers.length > 0 && (
                  <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Ready for Gate Out</p>
                      <p className="text-xs text-green-700 mt-1">
                        {formData.selectedContainers.length} container{formData.selectedContainers.length !== 1 ? 's' : ''} selected and ready for processing.
                      </p>
                    </div>
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
                                formData.selectedContainers.includes(container.id)
                                  ? 'border-blue-500 bg-blue-500'
                                  : container.status === 'ready'
                                  ? 'border-gray-300 hover:border-blue-300'
                                  : 'border-gray-200'
                              }`}>
                                {formData.selectedContainers.includes(container.id) && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{container.containerNumber}</div>
                                <div className="text-xs text-gray-600">
                                  {container.containerType} • {container.containerSize} • {container.currentLocation}
                                </div>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    container.status === 'ready' ? 'bg-green-100 text-green-800' :
                                    container.status === 'released' ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {container.status}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Added {container.addedAt.toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Selection Status Indicator */}
                            {formData.selectedContainers.includes(container.id) && (
                              <div className="flex items-center space-x-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                  Selected
                                </span>
                              </div>
                            )}
                            
                            {container.status !== 'ready' && (
                              <div className="text-xs text-gray-500 italic">
                                Not available for release
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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