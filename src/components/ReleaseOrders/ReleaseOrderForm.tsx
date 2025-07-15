import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, Package, AlertTriangle, CheckCircle, Loader, User, Truck, FileText, Building, ChevronDown } from 'lucide-react';
import { ReleaseOrder, ReleaseOrderContainer, Container } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { ClientSearchField } from '../Common/ClientSearchField';

interface ReleaseOrderFormProps {
  order?: ReleaseOrder | null;
  availableContainers: Container[];
  onClose: () => void;
  onSave: (order: ReleaseOrder) => void;
}

export const ReleaseOrderForm: React.FC<ReleaseOrderFormProps> = ({
  order,
  availableContainers,
  onClose,
  onSave
}) => {
  const { user, getClientFilter } = useAuth();
  const [autoSaving, setAutoSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    clientId: order?.clientId || '',
    clientName: order?.clientName || '',
    clientCode: order?.clientCode || user?.clientCode || '',
    containerType: 'EMPTY' as 'FULL' | 'EMPTY',
    bookingNumber: '',
    transportCompany: order?.transportCompany || '',
    driverName: order?.driverName || '',
    vehicleNumber: order?.vehicleNumber || '',
    notes: order?.notes || ''
  });

  const [selectedContainers, setSelectedContainers] = useState<ReleaseOrderContainer[]>(
    order?.containers || []
  );
  const [containerSearch, setContainerSearch] = useState('');
  const [showContainerSelector, setShowContainerSelector] = useState(false);

  // Mock clients data for the search field
  const mockClients = [
    { id: '1', code: 'MAEU', name: 'Maersk Line' },
    { id: '2', code: 'MSCU', name: 'MSC Mediterranean Shipping' },
    { id: '3', code: 'CMDU', name: 'CMA CGM' },
    { id: '4', code: 'SHIP001', name: 'Shipping Solutions Inc' }
  ];

  // Filter available containers based on user permissions and current selections
  const getFilteredContainers = () => {
    let containers = availableContainers;
    
    // Apply client filter for client users
    const clientFilter = getClientFilter();
    if (clientFilter) {
      containers = containers.filter(container => 
        container.clientCode === clientFilter || 
        container.client === user?.company
      );
    }
    
    // Filter out already selected containers
    const selectedContainerIds = selectedContainers.map(sc => sc.containerId);
    containers = containers.filter(c => !selectedContainerIds.includes(c.id));
    
    // Apply search filter
    if (containerSearch) {
      containers = containers.filter(container =>
        container.number.toLowerCase().includes(containerSearch.toLowerCase()) ||
        container.location.toLowerCase().includes(containerSearch.toLowerCase())
      );
    }
    
    return containers;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Trigger auto-save
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
  };

  const handleClientChange = (clientId: string) => {
    const selectedClient = mockClients.find(c => c.id === clientId);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        clientId: selectedClient.id,
        clientCode: selectedClient.code,
        clientName: selectedClient.name
      }));
    }
  };

  const handleContainerTypeChange = (type: 'FULL' | 'EMPTY') => {
    setFormData(prev => ({
      ...prev,
      containerType: type,
      bookingNumber: type === 'EMPTY' ? '' : prev.bookingNumber
    }));
  };

  const handleAddContainer = (container: Container) => {
    const newReleaseContainer: ReleaseOrderContainer = {
      id: `roc-${Date.now()}`,
      containerId: container.id,
      containerNumber: container.number,
      containerType: container.type,
      containerSize: container.size,
      currentLocation: container.location,
      status: 'pending',
      addedAt: new Date()
    };

    setSelectedContainers(prev => [...prev, newReleaseContainer]);
    setContainerSearch('');
  };

  const handleRemoveContainer = (containerIndex: number) => {
    setSelectedContainers(prev => prev.filter((_, index) => index !== containerIndex));
  };

  const handleContainerNotes = (containerIndex: number, notes: string) => {
    setSelectedContainers(prev => prev.map((container, index) => 
      index === containerIndex ? { ...container, notes } : container
    ));
  };

  const validateForm = (): boolean => {
    const hasClient = formData.clientId !== '';
    const hasContainers = selectedContainers.length > 0;
    const hasTransport = formData.transportCompany !== '' && formData.driverName !== '' && formData.vehicleNumber !== '';
    const hasBookingIfFull = formData.containerType === 'EMPTY' || formData.bookingNumber !== '';
    
    return hasClient && hasContainers && hasTransport && hasBookingIfFull;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (selectedContainers.length === 0) {
      alert('Please select at least one container for the release order.');
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newOrder: ReleaseOrder = {
        id: order?.id || `RO-${Date.now()}`,
        clientId: formData.clientId,
        clientCode: formData.clientCode,
        clientName: formData.clientName,
        containers: selectedContainers,
        transportCompany: formData.transportCompany,
        driverName: formData.driverName,
        vehicleNumber: formData.vehicleNumber,
        status: order?.status || 'draft',
        createdBy: user?.name || 'Unknown',
        createdAt: order?.createdAt || new Date(),
        notes: formData.notes,
        validatedBy: order?.validatedBy,
        validatedAt: order?.validatedAt,
        completedAt: order?.completedAt
      };

      onSave(newOrder);
    } catch (error) {
      alert(`Error saving release order: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredContainers = getFilteredContainers();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in !mt-0">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-strong animate-slide-in-up max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {order ? 'Edit Release Order' : 'Create New Release Order'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">Complete all required information to create the release order</p>
            </div>
            <div className="flex items-center space-x-3">
              {autoSaving && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Auto-saving...</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Client Information */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Client Information
              </h4>
              
              <div className="space-y-4">
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
                    disabled={user?.role === 'client'}
                  />
                </div>
              </div>
            </div>

            {/* Container Type Selection */}
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Container Type
              </h4>
              
              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="containerType"
                    value="EMPTY"
                    checked={formData.containerType === 'EMPTY'}
                    onChange={(e) => handleContainerTypeChange(e.target.value as 'EMPTY')}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-900">Empty Containers</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="containerType"
                    value="FULL"
                    checked={formData.containerType === 'FULL'}
                    onChange={(e) => handleContainerTypeChange(e.target.value as 'FULL')}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-900">Full Containers</span>
                </label>
              </div>

              {/* Booking Number for Full Containers */}
              {formData.containerType === 'FULL' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Booking Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bookingNumber}
                    onChange={(e) => handleInputChange('bookingNumber', e.target.value)}
                    className="form-input w-full"
                    placeholder="Enter booking reference number"
                  />
                </div>
              )}
            </div>

            {/* Container Selection */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Container Selection</h4>
                    <p className="text-sm text-gray-600">
                      {selectedContainers.length} container{selectedContainers.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowContainerSelector(!showContainerSelector)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Containers</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showContainerSelector ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Enhanced Container Selector */}
              {showContainerSelector && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search containers by number or location..."
                        value={containerSearch}
                        onChange={(e) => setContainerSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowContainerSelector(false)}
                      className="px-4 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                    >
                      Done
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin">
                    {filteredContainers.map((container) => (
                      <div
                        key={container.id}
                        className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-green-100 transition-colors">
                            <Package className="h-4 w-4 text-gray-500 group-hover:text-green-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{container.number}</div>
                            <div className="text-sm text-gray-500">
                              {container.type} • {container.size} • {container.location}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddContainer(container)}
                          className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add</span>
                        </button>
                      </div>
                    ))}
                    {filteredContainers.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>No available containers found</p>
                        <p className="text-sm">Try adjusting your search criteria</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Selected Containers List */}
              <div className="space-y-3">
                {selectedContainers.map((container, index) => (
                  <div
                    key={container.id}
                    className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Package className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium text-gray-900">{container.containerNumber}</div>
                        <div className="text-sm text-gray-600">
                          {container.containerType} • {container.containerSize} • {container.currentLocation}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            container.status === 'ready' ? 'bg-green-100 text-green-800' :
                            container.status === 'released' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {container.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            Added {container.addedAt.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Container notes..."
                        value={container.notes || ''}
                        onChange={(e) => handleContainerNotes(index, e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-green-500 focus:border-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveContainer(index)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {selectedContainers.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No containers selected</p>
                    <p className="text-sm">Click "Add Containers" to select containers for this release order</p>
                  </div>
                )}
              </div>
            </div>

            {/* Transport Information */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-4 flex items-center">
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
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      required
                      value={formData.driverName}
                      onChange={(e) => handleInputChange('driverName', e.target.value)}
                      className="form-input w-full pl-10"
                      placeholder="Driver full name"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Number *
                  </label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      required
                      value={formData.vehicleNumber}
                      onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                      className="form-input w-full pl-10"
                      placeholder="License plate number"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Release Order Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="form-input w-full"
                placeholder="Additional notes for this release order..."
              />
            </div>

            {/* Final Validation */}
            {validateForm() && (
              <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-sm text-green-800">
                  Ready to create {formData.containerType.toLowerCase()} container release order with {selectedContainers.length} container{selectedContainers.length !== 1 ? 's' : ''}.
                </p>
              </div>
            )}

            {/* Validation Messages */}
            {!formData.clientId && (
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  Please select a client to continue.
                </p>
              </div>
            )}

            {formData.clientId && selectedContainers.length === 0 && (
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  Please select at least one container for the release order.
                </p>
              </div>
            )}

            {formData.containerType === 'FULL' && !formData.bookingNumber && (
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  Booking number is required for full container release orders.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer - Fixed */}
        <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isProcessing || !validateForm()}
              className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>{order ? 'Update Release Order' : 'Create Release Order'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};