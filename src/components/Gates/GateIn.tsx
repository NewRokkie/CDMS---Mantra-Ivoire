import React, { useState, useEffect } from 'react';
import { X, Plus, Truck, User, MapPin, Package, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Container {
  id: string;
  number: string;
  size: '20ft' | '40ft';
  client: string;
  location: string;
  status: 'In' | 'Out' | 'Processing';
  timestamp: string;
  sealNumbers: string[];
}

interface Client {
  id: string;
  name: string;
  code: string;
  contact: string;
}

interface Location {
  id: string;
  name: string;
  section: string;
  capacity: number;
  available: number;
  acceptedSizes: ('20ft' | '40ft')[];
}

const GateIn: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  
  // Form state
  const [containerSize, setContainerSize] = useState<'20ft' | '40ft'>('20ft');
  const [quantity, setQuantity] = useState<1 | 2>(1);
  const [containerNumbers, setContainerNumbers] = useState(['', '']);
  const [selectedClient, setSelectedClient] = useState('');
  const [transportCompany, setTransportCompany] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [sealNumbers, setSealNumbers] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Mock data
  const clients: Client[] = [
    { id: '1', name: 'Maersk Line', code: 'MAEU', contact: 'John Smith' },
    { id: '2', name: 'MSC Mediterranean', code: 'MSCU', contact: 'Maria Garcia' },
    { id: '3', name: 'CMA CGM', code: 'CMAU', contact: 'Pierre Dubois' },
    { id: '4', name: 'COSCO Shipping', code: 'COSU', contact: 'Li Wei' },
  ];

  const locations: Location[] = [
    { id: 'S001', name: 'Stack S001', section: 'Top', capacity: 20, available: 15, acceptedSizes: ['20ft'] },
    { id: 'S003', name: 'Stack S003+S005', section: 'Top', capacity: 10, available: 8, acceptedSizes: ['40ft'] },
    { id: 'S031', name: 'Stack S031', section: 'Middle', capacity: 25, available: 20, acceptedSizes: ['20ft'] },
    { id: 'S073', name: 'Stack S073', section: 'Bottom', capacity: 30, available: 25, acceptedSizes: ['20ft', '40ft'] },
    { id: 'S075', name: 'Stack S075', section: 'Bottom', capacity: 28, available: 22, acceptedSizes: ['20ft', '40ft'] },
  ];

  const [containers, setContainers] = useState<Container[]>([
    {
      id: '1',
      number: 'MSKU1234567',
      size: '20ft',
      client: 'Maersk Line',
      location: 'S001-R1-T1',
      status: 'In',
      timestamp: '2024-01-15 14:30:00',
      sealNumbers: ['SL123456']
    },
    {
      id: '2',
      number: 'MSCU9876543',
      size: '40ft',
      client: 'MSC Mediterranean',
      location: 'S003-R1-T1',
      status: 'In',
      timestamp: '2024-01-15 15:45:00',
      sealNumbers: ['SL789012']
    }
  ]);

  // Filter locations based on container size
  const availableLocations = locations.filter(location => 
    location.acceptedSizes.includes(containerSize) && location.available > 0
  );

  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerNumbers[0] || selectedClient || transportCompany) {
        setAutoSaving(true);
        setTimeout(() => setAutoSaving(false), 1000);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [containerNumbers, selectedClient, transportCompany, driverName, vehicleNumber]);

  // Reset form when container size changes
  useEffect(() => {
    if (containerSize === '40ft') {
      setQuantity(1);
      setContainerNumbers(['', '']);
    }
    setSelectedLocation('');
    setErrors({});
  }, [containerSize]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!containerNumbers[0]) {
        newErrors.container1 = 'Container number is required';
      } else if (!/^[A-Z]{4}\d{7}$/.test(containerNumbers[0])) {
        newErrors.container1 = 'Invalid format (e.g., MSKU1234567)';
      }

      if (quantity === 2 && !containerNumbers[1]) {
        newErrors.container2 = 'Second container number is required';
      } else if (quantity === 2 && containerNumbers[1] && !/^[A-Z]{4}\d{7}$/.test(containerNumbers[1])) {
        newErrors.container2 = 'Invalid format (e.g., MSKU1234567)';
      }

      if (!selectedClient) {
        newErrors.client = 'Client selection is required';
      }
    }

    if (step === 2) {
      if (!transportCompany) newErrors.transportCompany = 'Transport company is required';
      if (!driverName) newErrors.driverName = 'Driver name is required';
      if (!vehicleNumber) newErrors.vehicleNumber = 'Vehicle number is required';
    }

    if (step === 3) {
      if (!selectedLocation) newErrors.location = 'Location selection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const selectedClientData = clients.find(c => c.id === selectedClient);
    const selectedLocationData = availableLocations.find(l => l.id === selectedLocation);
    
    const newContainers = containerNumbers.slice(0, quantity).map((number, index) => ({
      id: Date.now().toString() + index,
      number,
      size: containerSize,
      client: selectedClientData?.name || '',
      location: `${selectedLocationData?.name}-R1-T1`,
      status: 'In' as const,
      timestamp: new Date().toLocaleString(),
      sealNumbers: sealNumbers.filter(seal => seal.trim() !== '')
    }));

    setContainers(prev => [...newContainers, ...prev]);
    
    setIsLoading(false);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCurrentStep(1);
    setContainerSize('20ft');
    setQuantity(1);
    setContainerNumbers(['', '']);
    setSelectedClient('');
    setTransportCompany('');
    setDriverName('');
    setVehicleNumber('');
    setSelectedLocation('');
    setSealNumbers(['']);
    setNotes('');
    setErrors({});
  };

  const addSealNumber = () => {
    setSealNumbers(prev => [...prev, '']);
  };

  const removeSealNumber = (index: number) => {
    setSealNumbers(prev => prev.filter((_, i) => i !== index));
  };

  const updateSealNumber = (index: number, value: string) => {
    setSealNumbers(prev => prev.map((seal, i) => i === index ? value : seal));
  };

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const selectedLocationData = availableLocations.find(l => l.id === selectedLocation);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gate In Management</h1>
            <p className="text-gray-600">Process incoming containers and assign locations</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Gate In
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Gate Ins</p>
              <p className="text-2xl font-bold text-gray-900">24</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Truck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Containers Processed</p>
              <p className="text-2xl font-bold text-gray-900">38</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Processing Time</p>
              <p className="text-2xl font-bold text-gray-900">4.2 min</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Gate Ins Table */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Gate Ins</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {containers.map((container) => (
                <tr key={container.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {container.number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {container.size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {container.client}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {container.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      container.status === 'In' 
                        ? 'bg-green-100 text-green-800' 
                        : container.status === 'Out'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {container.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {container.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl fade-in slide-up">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">New Gate In Entry</h2>
                  <p className="text-green-100 text-sm">Step {currentStep} of 3</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="w-full bg-green-400 rounded-full h-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / 3) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 max-h-96 overflow-y-auto">
              {autoSaving && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                  <div className="spinner"></div>
                  <span className="text-sm text-blue-700">Auto-saving...</span>
                </div>
              )}

              {/* Step 1: Container Configuration */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      Container Configuration
                    </h3>
                    
                    {/* Container Size Switch */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Container Size
                      </label>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => setContainerSize('20ft')}
                          className={`px-6 py-3 rounded-lg font-medium transition-all ${
                            containerSize === '20ft'
                              ? 'bg-green-500 text-white shadow-lg'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          20ft
                        </button>
                        <button
                          type="button"
                          onClick={() => setContainerSize('40ft')}
                          className={`px-6 py-3 rounded-lg font-medium transition-all ${
                            containerSize === '40ft'
                              ? 'bg-green-500 text-white shadow-lg'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          40ft
                        </button>
                      </div>
                    </div>

                    {/* Quantity Switch (only for 20ft) */}
                    {containerSize === '20ft' && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Quantity
                        </label>
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => setQuantity(1)}
                            className={`px-6 py-3 rounded-lg font-medium transition-all ${
                              quantity === 1
                                ? 'bg-green-500 text-white shadow-lg'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            Single (1)
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuantity(2)}
                            className={`px-6 py-3 rounded-lg font-medium transition-all ${
                              quantity === 2
                                ? 'bg-green-500 text-white shadow-lg'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            Double (2)
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Container Numbers */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Container Number 1 *
                        </label>
                        <input
                          type="text"
                          value={containerNumbers[0]}
                          onChange={(e) => setContainerNumbers(prev => [e.target.value.toUpperCase(), prev[1]])}
                          placeholder="MSKU1234567"
                          className={`form-input w-full ${errors.container1 ? 'error' : ''}`}
                        />
                        {errors.container1 && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.container1}
                          </p>
                        )}
                      </div>

                      {quantity === 2 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Container Number 2 *
                          </label>
                          <input
                            type="text"
                            value={containerNumbers[1]}
                            onChange={(e) => setContainerNumbers(prev => [prev[0], e.target.value.toUpperCase()])}
                            placeholder="MSKU1234568"
                            className={`form-input w-full ${errors.container2 ? 'error' : ''}`}
                          />
                          {errors.container2 && (
                            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              {errors.container2}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Client Selection */}
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-yellow-600" />
                      Client Information
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Client *
                      </label>
                      <select
                        value={selectedClient}
                        onChange={(e) => setSelectedClient(e.target.value)}
                        className={`form-input w-full ${errors.client ? 'error' : ''}`}
                      >
                        <option value="">Choose a client...</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>
                            {client.name} ({client.code})
                          </option>
                        ))}
                      </select>
                      {errors.client && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.client}
                        </p>
                      )}
                      
                      {selectedClientData && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          <p className="text-sm text-gray-600">
                            <strong>Contact:</strong> {selectedClientData.contact}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Code:</strong> {selectedClientData.code}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Transport Information */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-green-600" />
                      Transport Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Transport Company *
                        </label>
                        <input
                          type="text"
                          value={transportCompany}
                          onChange={(e) => setTransportCompany(e.target.value)}
                          placeholder="ABC Transport Ltd."
                          className={`form-input w-full ${errors.transportCompany ? 'error' : ''}`}
                        />
                        {errors.transportCompany && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.transportCompany}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Driver Name *
                        </label>
                        <input
                          type="text"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          placeholder="John Doe"
                          className={`form-input w-full ${errors.driverName ? 'error' : ''}`}
                        />
                        {errors.driverName && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.driverName}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Vehicle Number *
                        </label>
                        <input
                          type="text"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                          placeholder="ABC-1234"
                          className={`form-input w-full ${errors.vehicleNumber ? 'error' : ''}`}
                        />
                        {errors.vehicleNumber && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.vehicleNumber}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Seal Numbers */}
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Seal Numbers
                    </h3>
                    
                    <div className="space-y-3">
                      {sealNumbers.map((seal, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={seal}
                            onChange={(e) => updateSealNumber(index, e.target.value)}
                            placeholder={`Seal ${index + 1}`}
                            className="form-input flex-1"
                          />
                          {sealNumbers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSealNumber(index)}
                              className="p-2 text-red-600 hover:bg-red-100 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={addSealNumber}
                        className="flex items-center gap-2 text-green-600 hover:text-green-700"
                      >
                        <Plus className="w-4 h-4" />
                        Add Seal Number
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Location Assignment */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-indigo-600" />
                      Location Assignment
                    </h3>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Location *
                      </label>
                      <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className={`form-input w-full ${errors.location ? 'error' : ''}`}
                      >
                        <option value="">Choose a location...</option>
                        {availableLocations.map(location => (
                          <option key={location.id} value={location.id}>
                            {location.name} - {location.section} Section ({location.available}/{location.capacity} available)
                          </option>
                        ))}
                      </select>
                      {errors.location && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.location}
                        </p>
                      )}
                      
                      {selectedLocationData && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          <p className="text-sm text-gray-600">
                            <strong>Section:</strong> {selectedLocationData.section}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Available Slots:</strong> {selectedLocationData.available} of {selectedLocationData.capacity}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Accepted Sizes:</strong> {selectedLocationData.acceptedSizes.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Entry Summary
                    </h3>
                    
                    <div className="space-y-2 text-sm">
                      <p><strong>Container Size:</strong> {containerSize}</p>
                      <p><strong>Quantity:</strong> {quantity} container{quantity > 1 ? 's' : ''}</p>
                      <p><strong>Container Numbers:</strong> {containerNumbers.slice(0, quantity).join(', ')}</p>
                      <p><strong>Client:</strong> {selectedClientData?.name}</p>
                      <p><strong>Transport Company:</strong> {transportCompany}</p>
                      <p><strong>Driver:</strong> {driverName}</p>
                      <p><strong>Vehicle:</strong> {vehicleNumber}</p>
                      <p><strong>Location:</strong> {selectedLocationData?.name}</p>
                      {sealNumbers.filter(s => s.trim()).length > 0 && (
                        <p><strong>Seals:</strong> {sealNumbers.filter(s => s.trim()).join(', ')}</p>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Any additional information..."
                      className="form-input w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentStep > 1 && (
                    <button
                      onClick={handlePrevious}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Previous
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Cancel
                  </button>
                  
                  {currentStep < 3 ? (
                    <button
                      onClick={handleNext}
                      className="btn-primary"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="btn-primary flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="spinner"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Complete Gate In
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GateIn;