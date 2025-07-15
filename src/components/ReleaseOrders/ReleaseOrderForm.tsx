import React, { useState, useEffect } from 'react';
import { X, Save, Loader, Package, Truck, User, Search, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { ClientSearchField } from '../Common/ClientSearchField';

interface Container {
  id: string;
  number: string;
  type: string;
  size: string;
  status: 'empty' | 'full';
  location: string;
  client?: string;
}

interface ReleaseOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export const ReleaseOrderForm: React.FC<ReleaseOrderFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<'empty' | 'full'>('empty');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedContainers, setSelectedContainers] = useState<Container[]>([]);
  const [containerSearch, setContainerSearch] = useState('');
  const [isContainerSelectorOpen, setIsContainerSelectorOpen] = useState(false);
  const [bookingReference, setBookingReference] = useState('');
  const [transportInfo, setTransportInfo] = useState({
    driverName: '',
    truckNumber: '',
    transportCompany: '',
    notes: ''
  });
  const [autoSaving, setAutoSaving] = useState(false);

  // Mock client data - replace with actual data source
  const mockClients = [
    { id: '1', name: 'Maersk Line', code: 'MAEU', type: 'Shipping Line', status: 'active' },
    { id: '2', name: 'MSC Mediterranean', code: 'MSCU', type: 'Shipping Line', status: 'active' },
    { id: '3', name: 'CMA CGM', code: 'CMDU', type: 'Shipping Line', status: 'active' },
    { id: '4', name: 'COSCO Shipping', code: 'COSU', type: 'Shipping Line', status: 'active' },
    { id: '5', name: 'Hapag-Lloyd', code: 'HLCU', type: 'Shipping Line', status: 'active' },
    { id: '6', name: 'ONE (Ocean Network Express)', code: 'ONEY', type: 'Shipping Line', status: 'active' },
    { id: '7', name: 'Evergreen Marine', code: 'EGLV', type: 'Shipping Line', status: 'active' },
    { id: '8', name: 'Yang Ming Marine', code: 'YMLU', type: 'Shipping Line', status: 'active' },
  ];

  // Derive selected client object from ID
  const selectedClient = mockClients.find(client => client.id === selectedClientId) || null;

  // Mock container data - replace with actual data source
  const mockContainers: Container[] = [
    { id: '1', number: 'MSKU1234567', type: '20GP', size: '20', status: 'empty', location: 'A-01-01' },
    { id: '2', number: 'TCLU9876543', type: '40HC', size: '40', status: 'empty', location: 'B-02-03' },
    { id: '3', number: 'GESU5555555', type: '20GP', size: '20', status: 'full', location: 'C-01-02' },
    { id: '4', number: 'HLBU7777777', type: '40GP', size: '40', status: 'full', location: 'A-03-01' },
  ];

  const availableContainers = mockContainers.filter(container => 
    container.status === activeTab &&
    container.number.toLowerCase().includes(containerSearch.toLowerCase())
  );

  const handleContainerToggle = (container: Container) => {
    setSelectedContainers(prev => {
      const isSelected = prev.some(c => c.id === container.id);
      if (isSelected) {
        return prev.filter(c => c.id !== container.id);
      } else {
        return [...prev, container];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = {
      client: selectedClient,
      containerType: activeTab,
      containers: selectedContainers,
      bookingReference: activeTab === 'full' ? bookingReference : undefined,
      transport: transportInfo
    };

    onSubmit(formData);
  };

  const isFormValid = selectedClient && 
    selectedContainers.length > 0 && 
    transportInfo.driverName && 
    transportInfo.truckNumber && 
    transportInfo.transportCompany &&
    (activeTab === 'empty' || bookingReference);

  // Auto-save simulation
  useEffect(() => {
    if (selectedClientId || selectedContainers.length > 0) {
      setAutoSaving(true);
      const timer = setTimeout(() => setAutoSaving(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedClientId, selectedContainers, transportInfo]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Create Release Order</h2>
                <p className="text-blue-100 text-sm">Generate new container release order</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {autoSaving && (
                <div className="flex items-center space-x-2 text-blue-100">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Auto-saving...</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto">
          {/* Client Selection */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <User className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-blue-900">Client Information</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-blue-800 mb-2">
                  Select Client *
                </label>
                <ClientSearchField
                  clients={mockClients}
                  selectedClientId={selectedClientId}
                  onClientSelect={setSelectedClientId}
                  placeholder="Search and select client..."
                />
              </div>
            </div>
          </div>

          {/* Container Type Tabs */}
          <div className="bg-purple-50 rounded-xl border border-purple-200">
            <div className="p-6 pb-0">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-600 text-white rounded-lg">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-purple-900">Container Selection</h3>
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-1 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('empty')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'empty'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white text-purple-600 hover:bg-purple-100'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Empty Containers</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('full')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'full'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white text-purple-600 hover:bg-purple-100'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Full Containers</span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="px-6 pb-6">
              {activeTab === 'full' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    Booking Reference Number *
                  </label>
                  <input
                    type="text"
                    value={bookingReference}
                    onChange={(e) => setBookingReference(e.target.value)}
                    className="w-full px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter booking reference number..."
                    required={activeTab === 'full'}
                  />
                </div>
              )}

              {/* Container Selector */}
              <div className="space-y-4">
                <div>
                  <button
                    type="button"
                    onClick={() => setIsContainerSelectorOpen(!isContainerSelectorOpen)}
                    className="w-full flex items-center justify-between p-4 bg-white border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Search className="w-5 h-5 text-purple-600" />
                      <span className="text-purple-800 font-medium">
                        Select {activeTab === 'empty' ? 'Empty' : 'Full'} Containers
                      </span>
                      {selectedContainers.length > 0 && (
                        <span className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs">
                          {selectedContainers.length} selected
                        </span>
                      )}
                    </div>
                    {isContainerSelectorOpen ? (
                      <ChevronUp className="w-5 h-5 text-purple-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-purple-600" />
                    )}
                  </button>

                  {isContainerSelectorOpen && (
                    <div className="mt-2 bg-white border border-purple-300 rounded-lg p-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            value={containerSearch}
                            onChange={(e) => setContainerSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder={`Search ${activeTab} containers...`}
                          />
                        </div>
                      </div>

                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {availableContainers.length > 0 ? (
                          availableContainers.map((container) => {
                            const isSelected = selectedContainers.some(c => c.id === container.id);
                            return (
                              <div
                                key={container.id}
                                onClick={() => handleContainerToggle(container)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                                  isSelected
                                    ? 'bg-purple-100 border-purple-500 shadow-sm'
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium text-gray-900">{container.number}</div>
                                    <div className="text-sm text-gray-600">
                                      {container.type} • {container.size}ft • {container.location}
                                    </div>
                                  </div>
                                  <div className={`w-4 h-4 rounded border-2 ${
                                    isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                                  }`}>
                                    {isSelected && (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white rounded-full"></div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No {activeTab} containers available</p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => setIsContainerSelectorOpen(false)}
                          className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Containers Display */}
                {selectedContainers.length > 0 && (
                  <div className="bg-white rounded-lg border border-purple-300 p-4">
                    <h4 className="font-medium text-purple-800 mb-3">Selected Containers ({selectedContainers.length})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedContainers.map((container) => (
                        <div key={container.id} className="flex items-center justify-between bg-purple-50 p-2 rounded">
                          <span className="text-sm font-medium">{container.number}</span>
                          <button
                            type="button"
                            onClick={() => handleContainerToggle(container)}
                            className="text-purple-600 hover:text-purple-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Transport Information */}
          <div className="bg-green-50 rounded-xl p-6 border border-green-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-600 text-white rounded-lg">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-green-900">Transport Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-green-800 mb-2">
                  Driver Name *
                </label>
                <input
                  type="text"
                  value={transportInfo.driverName}
                  onChange={(e) => setTransportInfo(prev => ({ ...prev, driverName: e.target.value }))}
                  className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter driver name..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-green-800 mb-2">
                  Truck Number *
                </label>
                <input
                  type="text"
                  value={transportInfo.truckNumber}
                  onChange={(e) => setTransportInfo(prev => ({ ...prev, truckNumber: e.target.value }))}
                  className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter truck number..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-green-800 mb-2">
                  Transport Company *
                </label>
                <input
                  type="text"
                  value={transportInfo.transportCompany}
                  onChange={(e) => setTransportInfo(prev => ({ ...prev, transportCompany: e.target.value }))}
                  className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter transport company..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-green-800 mb-2">
                  Notes
                </label>
                <input
                  type="text"
                  value={transportInfo.notes}
                  onChange={(e) => setTransportInfo(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                isFormValid && !isLoading
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Create Release Order</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};