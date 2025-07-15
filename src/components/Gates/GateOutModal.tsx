import React, { useState } from 'react';
import { X, Loader, Package, User, Truck, CheckCircle, AlertTriangle, FileText, Calendar, Check, Filter } from 'lucide-react';
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showContainerSelection, setShowContainerSelection] = useState(false);

  const selectedReleaseOrder = availableReleaseOrders.find(
    order => order.id === formData.selectedReleaseOrderId
  );

  const readyContainers = selectedReleaseOrder?.containers?.filter(
    container => container.status === 'ready'
  ) || [];

  const handleReleaseOrderSelect = (releaseOrder: ReleaseOrder) => {
    setFormData(prev => ({
      ...prev,
      selectedReleaseOrderId: releaseOrder.id,
      selectedContainers: []
    }));
    setShowContainerSelection(true);
    setErrors(prev => ({ ...prev, selectedReleaseOrderId: '' }));
  };

  const handleContainerToggle = (containerId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedContainers: prev.selectedContainers.includes(containerId)
        ? prev.selectedContainers.filter(id => id !== containerId)
        : [...prev.selectedContainers, containerId]
    }));
  };

  const handleSelectAll = () => {
    const allContainerIds = readyContainers.map(container => container.id);
    setFormData(prev => ({
      ...prev,
      selectedContainers: allContainerIds
    }));
  };

  const handleDeselectAll = () => {
    setFormData(prev => ({
      ...prev,
      selectedContainers: []
    }));
  };

  const handleFilterBySize = (size: string) => {
    const filteredContainers = readyContainers
      .filter(container => container.size === size)
      .map(container => container.id);
    setFormData(prev => ({
      ...prev,
      selectedContainers: filteredContainers
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.selectedReleaseOrderId) {
      newErrors.selectedReleaseOrderId = 'Please select a release order';
    }

    if (formData.selectedContainers.length === 0) {
      newErrors.selectedContainers = 'Please select at least one container';
    }

    if (!formData.driverName.trim()) {
      newErrors.driverName = 'Driver name is required';
    }

    if (!formData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = 'Vehicle number is required';
    }

    if (!formData.transportCompany.trim()) {
      newErrors.transportCompany = 'Transport company is required';
    }

    if (!formData.gateOutDate) {
      newErrors.gateOutDate = 'Gate out date is required';
    }

    if (!formData.gateOutTime) {
      newErrors.gateOutTime = 'Gate out time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      releaseOrder: selectedReleaseOrder,
      containers: readyContainers.filter(container => 
        formData.selectedContainers.includes(container.id)
      ),
      processedBy: user?.name,
      processedAt: new Date().toISOString()
    };

    onSubmit(submitData);
  };

  const handleClose = () => {
    if (!isProcessing) {
      setShowModal(false);
      setFormData({
        selectedReleaseOrderId: '',
        selectedContainers: [],
        driverName: '',
        vehicleNumber: '',
        transportCompany: '',
        gateOutDate: new Date().toISOString().split('T')[0],
        gateOutTime: new Date().toTimeString().slice(0, 5),
        notes: ''
      });
      setShowContainerSelection(false);
      setErrors({});
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in !mt-0">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Gate Out Processing</h2>
              <p className="text-sm text-gray-600">Process container gate out</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Release Order Selection */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Select Release Order</h3>
              </div>
              
              <ReleaseOrderSearchField
                releaseOrders={availableReleaseOrders}
                selectedReleaseOrder={selectedReleaseOrder}
                onOrderSelect={handleReleaseOrderSelect}
                error={errors.selectedReleaseOrderId}
                placeholder="Search by order ID, client name, or container..."
              />
            </div>

            {/* Container Selection */}
            {showContainerSelection && selectedReleaseOrder && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-medium text-gray-900">Select Containers</h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {formData.selectedContainers.length} of {readyContainers.length} selected
                    </span>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={formData.selectedContainers.length === readyContainers.length ? handleDeselectAll : handleSelectAll}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      {formData.selectedContainers.length === readyContainers.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFilterBySize('20ft')}
                      className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <Filter className="w-3 h-3" />
                      <span>20ft Only</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFilterBySize('40ft')}
                      className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <Filter className="w-3 h-3" />
                      <span>40ft Only</span>
                    </button>
                  </div>
                </div>

                {errors.selectedContainers && (
                  <div className="flex items-center space-x-2 text-red-600 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{errors.selectedContainers}</span>
                  </div>
                )}

                {/* Container Grid */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 max-h-64 overflow-y-auto">
                  {readyContainers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {readyContainers.map((container) => {
                        const isSelected = formData.selectedContainers.includes(container.id);
                        return (
                          <div
                            key={container.id}
                            onClick={() => handleContainerToggle(container.id)}
                            className={`
                              relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 transform hover:scale-105
                              ${isSelected 
                                ? 'border-blue-500 bg-gradient-to-r from-blue-100 to-blue-50 shadow-md' 
                                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                              }
                            `}
                          >
                            {/* Selection Indicator */}
                            <div className={`
                              absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
                              ${isSelected 
                                ? 'border-blue-500 bg-blue-500' 
                                : 'border-gray-300 bg-white'
                              }
                            `}>
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900">{container.number}</span>
                                <span className={`
                                  px-2 py-1 text-xs rounded-full
                                  ${container.size === '20ft' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                  }
                                `}>
                                  {container.size}
                                </span>
                              </div>
                              
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex justify-between">
                                  <span>Location:</span>
                                  <span className="font-medium">{container.location}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Status:</span>
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                    {container.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No containers available for gate out</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transport Details */}
            {formData.selectedContainers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-medium text-gray-900">Transport Details</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Driver Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.driverName}
                        onChange={(e) => setFormData(prev => ({ ...prev, driverName: e.target.value }))}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.driverName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter driver name"
                      />
                    </div>
                    {errors.driverName && (
                      <p className="mt-1 text-sm text-red-600">{errors.driverName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Number *
                    </label>
                    <div className="relative">
                      <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.vehicleNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.vehicleNumber ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter vehicle number"
                      />
                    </div>
                    {errors.vehicleNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.vehicleNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transport Company *
                    </label>
                    <input
                      type="text"
                      value={formData.transportCompany}
                      onChange={(e) => setFormData(prev => ({ ...prev, transportCompany: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.transportCompany ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter transport company"
                    />
                    {errors.transportCompany && (
                      <p className="mt-1 text-sm text-red-600">{errors.transportCompany}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gate Out Date *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        value={formData.gateOutDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, gateOutDate: e.target.value }))}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.gateOutDate ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    {errors.gateOutDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.gateOutDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gate Out Time *
                    </label>
                    <input
                      type="time"
                      value={formData.gateOutTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, gateOutTime: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.gateOutTime ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.gateOutTime && (
                      <p className="mt-1 text-sm text-red-600">{errors.gateOutTime}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Additional notes (optional)"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              {formData.selectedContainers.length > 0 && (
                <span>
                  {formData.selectedContainers.length} container(s) selected for gate out
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing || formData.selectedContainers.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Process Gate Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};