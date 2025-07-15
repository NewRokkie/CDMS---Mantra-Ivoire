import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, Package, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { ReleaseOrder, ReleaseOrderContainer, Container } from '../../types';
import { useAuth } from '../../hooks/useAuth';

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
  const [formData, setFormData] = useState({
    clientId: order?.clientId || '',
    clientName: order?.clientName || '',
    clientCode: order?.clientCode || user?.clientCode || '',
    transportCompany: order?.transportCompany || '',
    driverName: order?.driverName || '',
    vehicleNumber: order?.vehicleNumber || '',
    estimatedReleaseDate: order?.estimatedReleaseDate ? 
      order.estimatedReleaseDate.toISOString().split('T')[0] : '',
    notes: order?.notes || ''
  });

  const [selectedContainers, setSelectedContainers] = useState<ReleaseOrderContainer[]>(
    order?.containers || []
  );
  const [containerSearch, setContainerSearch] = useState('');
  const [showContainerSelector, setShowContainerSelector] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedContainers.length === 0) {
      alert('Please select at least one container for the release order.');
      return;
    }

    const newOrder: ReleaseOrder = {
      id: order?.id || `RO-${Date.now()}`,
      clientId: user?.id || '1',
      clientCode: formData.clientCode,
      clientName: formData.clientName,
      containers: selectedContainers,
      transportCompany: formData.transportCompany,
      driverName: formData.driverName,
      vehicleNumber: formData.vehicleNumber,
      status: order?.status || 'draft',
      createdBy: user?.name || 'Unknown',
      createdAt: order?.createdAt || new Date(),
      estimatedReleaseDate: formData.estimatedReleaseDate ? 
        new Date(formData.estimatedReleaseDate) : undefined,
      notes: formData.notes,
      validatedBy: order?.validatedBy,
      validatedAt: order?.validatedAt,
      completedAt: order?.completedAt
    };

    onSave(newOrder);
  };

  const filteredContainers = getFilteredContainers();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {order ? 'Edit Release Order' : 'Create New Release Order'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Client company name"
                    disabled={user?.role === 'client'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Release Date
                  </label>
                  <input
                    type="date"
                    value={formData.estimatedReleaseDate}
                    onChange={(e) => handleInputChange('estimatedReleaseDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Transport Information */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Transport Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transport Company *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.transportCompany}
                    onChange={(e) => handleInputChange('transportCompany', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="License plate"
                  />
                </div>
              </div>
            </div>

            {/* Container Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">
                  Selected Containers ({selectedContainers.length})
                </h4>
                <button
                  type="button"
                  onClick={() => setShowContainerSelector(!showContainerSelector)}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Containers</span>
                </button>
              </div>

              {/* Container Selector */}
              {showContainerSelector && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search containers by number or location..."
                        value={containerSearch}
                        onChange={(e) => setContainerSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowContainerSelector(false)}
                      className="px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      Done
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {filteredContainers.map((container) => (
                      <div
                        key={container.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <Package className="h-5 w-5 text-gray-400" />
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
                          className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
                    className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Package className="h-5 w-5 text-blue-600" />
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
                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveContainer(index)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded"
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

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Release Order Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Additional notes for this release order..."
              />
            </div>

            {/* Validation Messages */}
            {selectedContainers.length === 0 && (
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  Please select at least one container to create the release order.
                </p>
              </div>
            )}

            {selectedContainers.length > 0 && (
              <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-sm text-green-800">
                  Ready to create release order with {selectedContainers.length} container{selectedContainers.length !== 1 ? 's' : ''}.
                </p>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selectedContainers.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {order ? 'Update Release Order' : 'Create Release Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};