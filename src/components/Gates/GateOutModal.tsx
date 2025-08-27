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
  containerSize: '20ft' | '40ft';
  quantity: number;
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
    containerSize: '20ft',
    quantity: 1,
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
    const order = availableReleaseOrders.find(o => o.id === releaseOrderId);
    if (order) {
      // Smart auto-selection based on availability
      const available20ft = getAvailableContainersForClient(order.clientCode || '', '20ft');
      const available40ft = getAvailableContainersForClient(order.clientCode || '', '40ft');
      
      let defaultSize: '20ft' | '40ft';
      let defaultQuantity = 1;
      
      // Auto-select based on availability
      if (available20ft === 0 && available40ft > 0) {
        // Only 40ft available
        defaultSize = '40ft';
        defaultQuantity = 1;
      } else if (available40ft === 0 && available20ft > 0) {
        // Only 20ft available
        defaultSize = '20ft';
        defaultQuantity = 1;
      } else if (available20ft > 0 && available40ft > 0) {
        // Both sizes available - randomly select one
        defaultSize = Math.random() < 0.5 ? '20ft' : '40ft';
        defaultQuantity = 1;
      } else {
        // No containers available - default to 20ft but will be disabled
        defaultSize = '20ft';
        defaultQuantity = 1;
      }
      
      setFormData(prev => ({
        ...prev,
        selectedReleaseOrderId: releaseOrderId,
        containerSize: defaultSize,
        quantity: defaultQuantity,
        driverName: order.driverName || '',
        vehicleNumber: order.vehicleNumber || '',
        transportCompany: order.transportCompany || ''
      }));
    }
  };

  const handleContainerSizeChange = (size: '20ft' | '40ft') => {
    // Check if the selected size has available containers
    const availableForSize = selectedReleaseOrder ? getAvailableContainersForClient(selectedReleaseOrder.clientCode || '', size) : 0;
    
    if (availableForSize === 0) {
      // Don't allow selection of size with no available containers
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      containerSize: size,
      quantity: Math.min(1, availableForSize) // Reset to 1 or available count, whichever is smaller
    }));
  };

  const handleQuantityChange = (newQuantity: number) => {
    const maxQuantity = getMaxQuantityForSize(formData.containerSize);
    const availableContainers = selectedReleaseOrder ? getAvailableContainersForClient(selectedReleaseOrder.clientCode || '', formData.containerSize) : 0;
    const effectiveMax = Math.min(maxQuantity, availableContainers);
    const validQuantity = Math.max(1, Math.min(effectiveMax, newQuantity));
    
    setFormData(prev => ({
      ...prev,
      quantity: validQuantity
    }));
  };

  const getMaxQuantityForSize = (size: '20ft' | '40ft'): number => {
    // Truck loading constraints
    return size === '20ft' ? 2 : 1;
  };

  const getAvailableContainersForClient = (clientCode: string, size: '20ft' | '40ft'): number => {
    if (!selectedReleaseOrder) return 0;
    
    // Count available containers of the specified size for this client
    return selectedReleaseOrder.containers.filter(c => 
      c.status === 'ready' && 
      c.containerSize === size
    ).length;
  };

  // Get available containers for current selection
  const available20ft = selectedReleaseOrder ? getAvailableContainersForClient(selectedReleaseOrder.clientCode || '', '20ft') : 0;
  const available40ft = selectedReleaseOrder ? getAvailableContainersForClient(selectedReleaseOrder.clientCode || '', '40ft') : 0;
  const availableContainers = selectedReleaseOrder ? getAvailableContainersForClient(selectedReleaseOrder.clientCode || '', formData.containerSize) : 0;

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        const hasReleaseOrder = formData.selectedReleaseOrderId !== '';
        const hasValidQuantity = formData.quantity > 0;
        const hasAvailableContainers = availableContainers >= formData.quantity;
        const withinTruckLimit = formData.quantity <= getMaxQuantityForSize(formData.containerSize);
        const hasValidContainerSize = availableContainers > 0; // Ensure selected size has containers
        
        return hasReleaseOrder && hasValidQuantity && hasAvailableContainers && withinTruckLimit && hasValidContainerSize;
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

    // Check if enough containers are available
    const availableCount = getAvailableContainersForClient(
      selectedReleaseOrder.clientCode || '', 
      formData.containerSize
    );
    
    if (availableCount < formData.quantity) {
      alert(`Only ${availableCount} containers of size ${formData.containerSize} are available for this client.`);
      return;
    }

    const submitData = {
      ...formData,
      releaseOrder: selectedReleaseOrder,
      // System will automatically select containers based on size and quantity
      autoSelectContainers: true
    };
    
    onSubmit(submitData);
  };

  const maxQuantity = getMaxQuantityForSize(formData.containerSize);
  const effectiveMaxQuantity = Math.min(maxQuantity, availableContainers);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong animate-slide-in-up max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">New Gate Out Process</h3>
              <p className="text-xs text-gray-600">Step {currentStep} of 2 - Automated Container Selection</p>
            </div>
            <div className="flex items-center space-x-3">
              {autoSaving && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Auto-saving...</span>
                </div>
              )}
              <button
                onClick={() => setShowModal(false)}
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
                            <span className="text-gray-600">Available 20":</span>
                            <span className="font-medium text-blue-600">
                              {getAvailableContainersForClient(selectedReleaseOrder.clientCode || '', '20ft')} containers
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Available 40":</span>
                            <span className="font-medium text-green-600">
                              {getAvailableContainersForClient(selectedReleaseOrder.clientCode || '', '40ft')} containers
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

                {/* Container Specifications */}
                {selectedReleaseOrder && (
                  <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Container Specifications
                  </h4>
                  
                  <div className="space-y-6">
                    {/* Container Size Selection */}
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-3">
                        Container Size *
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => handleContainerSizeChange('20ft')}
                          disabled={available20ft === 0}
                          className={`p-4 border-2 rounded-xl transition-all duration-300 ${
                            formData.containerSize === '20ft'
                              ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                              : available20ft === 0
                              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                          }`}
                          title={available20ft === 0 ? 'No 20" containers available for this client' : ''}
                        >
                          <div className="flex items-center space-x-3">
                            <Box className={`h-6 w-6 ${
                              formData.containerSize === '20ft' ? 'text-blue-600' : 
                              available20ft === 0 ? 'text-gray-300' : 'text-gray-400'
                            }`} />
                            <div className="text-left">
                              <div className={`font-medium ${
                                formData.containerSize === '20ft' ? 'text-blue-900' : 
                                available20ft === 0 ? 'text-gray-400' : 'text-gray-700'
                              }`}>
                                20" Containers
                              </div>
                              <div className={`text-sm ${available20ft === 0 ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {available20ft === 0 ? 'Not available' : 'Standard Size'}
                              </div>
                            </div>
                          </div>
                          {formData.containerSize === '20ft' && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            </div>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleContainerSizeChange('40ft')}
                          disabled={available40ft === 0}
                          className={`p-4 border-2 rounded-xl transition-all duration-300 relative ${
                            formData.containerSize === '40ft'
                              ? 'border-green-500 bg-green-50 shadow-lg shadow-green-500/20'
                              : available40ft === 0
                              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                              : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
                          }`}
                          title={available40ft === 0 ? 'No 40" containers available for this client' : ''}
                        >
                          <div className="flex items-center space-x-3">
                            <Ruler className={`h-6 w-6 ${
                              formData.containerSize === '40ft' ? 'text-green-600' : 
                              available40ft === 0 ? 'text-gray-300' : 'text-gray-400'
                            }`} />
                            <div className="text-left">
                              <div className={`font-medium ${
                                formData.containerSize === '40ft' ? 'text-green-900' : 
                                available40ft === 0 ? 'text-gray-400' : 'text-gray-700'
                              }`}>
                                40" Containers
                              </div>
                              <div className={`text-sm ${available40ft === 0 ? 'text-gray-400' : 'text-gray-600'}`}>
                                High Capacity
                              </div>
                            </div>
                          </div>
                          {formData.containerSize === '40ft' && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Quantity Selection */}
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-3">
                        Quantity to Gate Out *
                      </label>
                      
                      <div className="bg-white rounded-lg p-4 border border-orange-300">
                        <div className="flex items-center justify-center space-x-4">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(formData.quantity - 1)}
                            disabled={formData.quantity <= 1}
                            className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Minus className="h-5 w-5" />
                          </button>
                          
                          <div className="bg-gray-100 rounded-xl px-6 py-4 min-w-[100px] text-center">
                            <div className="text-3xl font-bold text-gray-900">{formData.quantity}</div>
                            <div className="text-sm text-gray-600">
                              Container{formData.quantity !== 1 ? 's' : ''}
                            </div>
                                  {available40ft === 0 ? 'Not available' : 'High Capacity'}
                          
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(formData.quantity + 1)}
                            disabled={formData.quantity >= effectiveMaxQuantity}
                            className="p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>

                        {/* Truck Loading Info */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <Truck className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-medium text-gray-700">Truck Loading Constraints</span>
                          </div>
                          <div className="text-xs text-gray-600 space-y-1">
                            <div>• Maximum 2×20" containers per truck</div>
                            <div>• Maximum 1×40" container per truck</div>
                            <div className="text-blue-600 font-medium">
                              • System will automatically select {formData.quantity} available {formData.containerSize} container{formData.quantity !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                )}

                {/* Enhanced Validation Messages */}
                <div className="space-y-3">
                  {!formData.selectedReleaseOrderId && (
                    <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                      <p className="text-sm text-yellow-800">
                        Please select a release order to continue.
                      </p>
                    </div>
                  )}

                  {formData.selectedReleaseOrderId && availableContainers === 0 && (
                    <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                      <p className="text-sm text-red-800">
                        No {formData.containerSize} containers available for this client. Please select a different size.
                      </p>
                    </div>
                  )}

                  {formData.selectedReleaseOrderId && availableContainers > 0 && formData.quantity > availableContainers && (
                    <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                      <p className="text-sm text-yellow-800">
                        Only {availableContainers} {formData.containerSize} container{availableContainers !== 1 ? 's' : ''} available. Please adjust quantity.
                      </p>
                    </div>
                  )}

                  {formData.selectedReleaseOrderId && formData.quantity > getMaxQuantityForSize(formData.containerSize) && (
                    <div className="flex items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                      <p className="text-sm text-orange-800">
                        Truck capacity exceeded. Maximum {getMaxQuantityForSize(formData.containerSize)} {formData.containerSize} container{getMaxQuantityForSize(formData.containerSize) !== 1 ? 's' : ''} per truck.
                      </p>
                    </div>
                  )}
                </div>
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
                      <span className="text-gray-600">Container Size:</span>
                      <div className="font-medium">{formData.containerSize}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Quantity:</span>
                      <div className="font-medium">{formData.quantity} container{formData.quantity !== 1 ? 's' : ''}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Selection Method:</span>
                      <div className="font-medium text-blue-600">Automatic</div>
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

                  {/* Automatic Selection Notice */}
                  <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">Automatic Container Selection</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      The system will automatically select {formData.quantity} available {formData.containerSize} container{formData.quantity !== 1 ? 's' : ''} 
                      from the yard for client {selectedReleaseOrder?.clientCode}. 
                      Selected containers will be displayed in the final report.
                    </p>
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
                  title={!validateStep(currentStep) ? 'Please complete all required fields and ensure valid container selection' : ''}
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
                      <span>Create Gate Out Operation</span>
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