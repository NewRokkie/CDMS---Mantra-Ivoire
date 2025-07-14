import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Truck, User, MapPin, Package, Clock, CheckCircle, AlertCircle, Search, Home } from 'lucide-react';

interface Container {
  id: string;
  number: string;
  size: '20ft' | '40ft';
  client: string;
  location: string;
  gateInTime: string;
  status: 'active' | 'completed';
  sealNumbers: string[];
  damageReport?: string;
  notes?: string;
}

interface Client {
  id: string;
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
}

interface Location {
  id: string;
  name: string;
  section: 'Top' | 'Middle' | 'Bottom';
  availableSlots: number;
  totalSlots: number;
  acceptedSizes: ('20ft' | '40ft')[];
}

interface GateInProps {
  isOpen: boolean;
  onClose: () => void;
}

const GateIn: React.FC<GateInProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [containerSize, setContainerSize] = useState<'20ft' | '40ft'>('20ft');
  const [quantity, setQuantity] = useState<1 | 2>(1);
  const [containerNumbers, setContainerNumbers] = useState<string[]>(['']);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [transportCompany, setTransportCompany] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [sealNumbers, setSealNumbers] = useState<string[]>(['']);
  const [damageReport, setDamageReport] = useState('');
  const [notes, setNotes] = useState('');

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock data
  const clients: Client[] = [
    { id: '1', name: 'Maersk Line', code: 'MAEU', contactPerson: 'John Smith', email: 'john@maersk.com', phone: '+1-555-0101' },
    { id: '2', name: 'MSC Mediterranean', code: 'MSCU', contactPerson: 'Maria Garcia', email: 'maria@msc.com', phone: '+1-555-0102' },
    { id: '3', name: 'CMA CGM', code: 'CMAU', contactPerson: 'Pierre Dubois', email: 'pierre@cmacgm.com', phone: '+1-555-0103' },
    { id: '4', name: 'COSCO Shipping', code: 'COSU', contactPerson: 'Li Wei', email: 'li.wei@cosco.com', phone: '+1-555-0104' },
    { id: '5', name: 'Hapag-Lloyd', code: 'HLCU', contactPerson: 'Hans Mueller', email: 'hans@hapag-lloyd.com', phone: '+1-555-0105' },
  ];

  const locations: Location[] = [
    // 20ft specific locations
    { id: 'S1', name: 'Stack S1 (Entry)', section: 'Top', availableSlots: 15, totalSlots: 20, acceptedSizes: ['20ft'] },
    { id: 'S31', name: 'Stack S31 (End)', section: 'Bottom', availableSlots: 8, totalSlots: 20, acceptedSizes: ['20ft'] },
    { id: 'S101', name: 'Stack S101 (Special)', section: 'Middle', availableSlots: 12, totalSlots: 15, acceptedSizes: ['20ft'] },
    { id: 'S103', name: 'Stack S103 (Special)', section: 'Middle', availableSlots: 6, totalSlots: 15, acceptedSizes: ['20ft'] },
    
    // 40ft specific locations (paired stacks)
    { id: 'S3-S5', name: 'Stacks S3+S5 (Paired)', section: 'Top', availableSlots: 10, totalSlots: 15, acceptedSizes: ['40ft'] },
    { id: 'S7-S9', name: 'Stacks S7+S9 (Paired)', section: 'Top', availableSlots: 8, totalSlots: 15, acceptedSizes: ['40ft'] },
    { id: 'S11-S13', name: 'Stacks S11+S13 (Paired)', section: 'Middle', availableSlots: 12, totalSlots: 20, acceptedSizes: ['40ft'] },
    { id: 'S15-S17', name: 'Stacks S15+S17 (Paired)', section: 'Middle', availableSlots: 5, totalSlots: 20, acceptedSizes: ['40ft'] },
    { id: 'S19-S21', name: 'Stacks S19+S21 (Paired)', section: 'Bottom', availableSlots: 14, totalSlots: 25, acceptedSizes: ['40ft'] },
    
    // Flexible locations (both sizes)
    { id: 'S73', name: 'Stack S73 (Flexible)', section: 'Bottom', availableSlots: 18, totalSlots: 30, acceptedSizes: ['20ft', '40ft'] },
    { id: 'S75', name: 'Stack S75 (Flexible)', section: 'Bottom', availableSlots: 22, totalSlots: 30, acceptedSizes: ['20ft', '40ft'] },
    { id: 'S77', name: 'Stack S77 (Flexible)', section: 'Bottom', availableSlots: 16, totalSlots: 30, acceptedSizes: ['20ft', '40ft'] },
    { id: 'S79', name: 'Stack S79 (Flexible)', section: 'Bottom', availableSlots: 20, totalSlots: 30, acceptedSizes: ['20ft', '40ft'] },
  ];

  const [recentGateIns] = useState<Container[]>([
    {
      id: '1',
      number: 'MSKU1234567',
      size: '20ft',
      client: 'Maersk Line',
      location: 'S1',
      gateInTime: '2024-01-15 14:30',
      status: 'active',
      sealNumbers: ['SL123456'],
    },
    {
      id: '2',
      number: 'MSCU9876543',
      size: '40ft',
      client: 'MSC Mediterranean',
      location: 'S3-S5',
      gateInTime: '2024-01-15 13:45',
      status: 'completed',
      sealNumbers: ['SL789012', 'SL345678'],
    },
  ]);

  // Filter locations based on container size
  const filteredLocations = locations.filter(location => 
    location.acceptedSizes.includes(containerSize) && location.availableSlots > 0
  );

  // Auto-save functionality
  useEffect(() => {
    const autoSaveTimer = setInterval(() => {
      if (containerNumbers[0] || selectedClient || transportCompany) {
        setAutoSaving(true);
        setTimeout(() => setAutoSaving(false), 1000);
      }
    }, 3000);

    return () => clearInterval(autoSaveTimer);
  }, [containerNumbers, selectedClient, transportCompany]);

  // Reset form when container size changes
  useEffect(() => {
    if (containerSize === '40ft') {
      setQuantity(1);
      setContainerNumbers(['']);
    }
    setSelectedLocation('');
    setErrors({});
  }, [containerSize]);

  // Update container number fields based on quantity
  useEffect(() => {
    if (quantity === 1) {
      setContainerNumbers([containerNumbers[0] || '']);
    } else {
      setContainerNumbers([containerNumbers[0] || '', containerNumbers[1] || '']);
    }
  }, [quantity]);

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
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setNotification({
        type: 'success',
        message: `Successfully processed ${quantity} container(s) for gate in`
      });
      
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to process gate in. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setContainerSize('20ft');
    setQuantity(1);
    setContainerNumbers(['']);
    setSelectedClient('');
    setTransportCompany('');
    setDriverName('');
    setVehicleNumber('');
    setSelectedLocation('');
    setSealNumbers(['']);
    setDamageReport('');
    setNotes('');
    setErrors({});
    setNotification(null);
  };

  const addSealNumber = () => {
    setSealNumbers([...sealNumbers, '']);
  };

  const removeSealNumber = (index: number) => {
    setSealNumbers(sealNumbers.filter((_, i) => i !== index));
  };

  const updateSealNumber = (index: number, value: string) => {
    const updated = [...sealNumbers];
    updated[index] = value;
    setSealNumbers(updated);
  };

  const selectedClientData = clients.find(client => client.id === selectedClient);
  const selectedLocationData = locations.find(location => location.id === selectedLocation);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden fade-in slide-up">
        {/* Header */}
        <div className="bg-brand-gradient px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Truck className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Gate In - Container Entry</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-brand-black">Step {currentStep} of 3</span>
            {autoSaving && (
              <div className="flex items-center space-x-2 text-sm text-dark-green">
                <div className="spinner w-3 h-3"></div>
                <span>Auto-saving...</span>
              </div>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="progress-bar h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
          {/* Step 1: Container Configuration & Client */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Container Size Selection */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-brand-black mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-brand-green" />
                  Container Configuration
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-black mb-2">Container Size</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="containerSize"
                          value="20ft"
                          checked={containerSize === '20ft'}
                          onChange={(e) => setContainerSize(e.target.value as '20ft' | '40ft')}
                          className="sr-only"
                        />
                        <div className={`px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                          containerSize === '20ft' 
                            ? 'border-brand-green bg-brand-green text-white' 
                            : 'border-gray-300 bg-white text-brand-black hover:border-brand-green'
                        }`}>
                          20ft
                        </div>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="containerSize"
                          value="40ft"
                          checked={containerSize === '40ft'}
                          onChange={(e) => setContainerSize(e.target.value as '20ft' | '40ft')}
                          className="sr-only"
                        />
                        <div className={`px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                          containerSize === '40ft' 
                            ? 'border-brand-green bg-brand-green text-white' 
                            : 'border-gray-300 bg-white text-brand-black hover:border-brand-green'
                        }`}>
                          40ft
                        </div>
                      </label>
                    </div>
                  </div>

                  {containerSize === '20ft' && (
                    <div>
                      <label className="block text-sm font-medium text-brand-black mb-2">Quantity</label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="quantity"
                            value="1"
                            checked={quantity === 1}
                            onChange={() => setQuantity(1)}
                            className="sr-only"
                          />
                          <div className={`px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                            quantity === 1 
                              ? 'border-brand-green bg-brand-green text-white' 
                              : 'border-gray-300 bg-white text-brand-black hover:border-brand-green'
                          }`}>
                            Single (1)
                          </div>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="quantity"
                            value="2"
                            checked={quantity === 2}
                            onChange={() => setQuantity(2)}
                            className="sr-only"
                          />
                          <div className={`px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                            quantity === 2 
                              ? 'border-brand-green bg-brand-green text-white' 
                              : 'border-gray-300 bg-white text-brand-black hover:border-brand-green'
                          }`}>
                            Double (2)
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Container Numbers */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-brand-black mb-1">
                      Container Number {quantity === 2 ? '1' : ''}
                    </label>
                    <input
                      type="text"
                      value={containerNumbers[0]}
                      onChange={(e) => {
                        const updated = [...containerNumbers];
                        updated[0] = e.target.value.toUpperCase();
                        setContainerNumbers(updated);
                      }}
                      placeholder="e.g., MSKU1234567"
                      className={`form-input w-full px-3 py-2 rounded-lg ${
                        errors.container1 ? 'error' : ''
                      }`}
                    />
                    {errors.container1 && (
                      <p className="text-red-500 text-sm mt-1">{errors.container1}</p>
                    )}
                  </div>

                  {quantity === 2 && (
                    <div>
                      <label className="block text-sm font-medium text-brand-black mb-1">
                        Container Number 2
                      </label>
                      <input
                        type="text"
                        value={containerNumbers[1] || ''}
                        onChange={(e) => {
                          const updated = [...containerNumbers];
                          updated[1] = e.target.value.toUpperCase();
                          setContainerNumbers(updated);
                        }}
                        placeholder="e.g., MSKU1234568"
                        className={`form-input w-full px-3 py-2 rounded-lg ${
                          errors.container2 ? 'error' : ''
                        }`}
                      />
                      {errors.container2 && (
                        <p className="text-red-500 text-sm mt-1">{errors.container2}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Client Selection */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-brand-black mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-brand-green" />
                  Client Information
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-brand-black mb-1">Select Client</label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className={`form-input w-full px-3 py-2 rounded-lg ${
                      errors.client ? 'error' : ''
                    }`}
                  >
                    <option value="">Choose a client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.code})
                      </option>
                    ))}
                  </select>
                  {errors.client && (
                    <p className="text-red-500 text-sm mt-1">{errors.client}</p>
                  )}
                </div>

                {selectedClientData && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <h4 className="font-medium text-brand-black">{selectedClientData.name}</h4>
                    <p className="text-sm text-gray-600">Contact: {selectedClientData.contactPerson}</p>
                    <p className="text-sm text-gray-600">Email: {selectedClientData.email}</p>
                    <p className="text-sm text-gray-600">Phone: {selectedClientData.phone}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Transport Information */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-brand-black mb-4 flex items-center">
                  <Truck className="w-5 h-5 mr-2 text-brand-green" />
                  Transport Information
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-black mb-1">Transport Company</label>
                    <input
                      type="text"
                      value={transportCompany}
                      onChange={(e) => setTransportCompany(e.target.value)}
                      placeholder="Enter transport company name"
                      className={`form-input w-full px-3 py-2 rounded-lg ${
                        errors.transportCompany ? 'error' : ''
                      }`}
                    />
                    {errors.transportCompany && (
                      <p className="text-red-500 text-sm mt-1">{errors.transportCompany}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-black mb-1">Driver Name</label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Enter driver's full name"
                      className={`form-input w-full px-3 py-2 rounded-lg ${
                        errors.driverName ? 'error' : ''
                      }`}
                    />
                    {errors.driverName && (
                      <p className="text-red-500 text-sm mt-1">{errors.driverName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-brand-black mb-1">Vehicle Number</label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                      placeholder="Enter vehicle/truck number"
                      className={`form-input w-full px-3 py-2 rounded-lg ${
                        errors.vehicleNumber ? 'error' : ''
                      }`}
                    />
                    {errors.vehicleNumber && (
                      <p className="text-red-500 text-sm mt-1">{errors.vehicleNumber}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Location & Additional Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-brand-black mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-brand-green" />
                  Location Assignment
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-brand-black mb-1">
                    Select Location (for {containerSize} containers)
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className={`form-input w-full px-3 py-2 rounded-lg ${
                      errors.location ? 'error' : ''
                    }`}
                  >
                    <option value="">Choose a location...</option>
                    {filteredLocations.map(location => (
                      <option key={location.id} value={location.id}>
                        {location.name} - {location.section} Section ({location.availableSlots}/{location.totalSlots} available)
                      </option>
                    ))}
                  </select>
                  {errors.location && (
                    <p className="text-red-500 text-sm mt-1">{errors.location}</p>
                  )}
                </div>

                {selectedLocationData && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <h4 className="font-medium text-brand-black">{selectedLocationData.name}</h4>
                    <p className="text-sm text-gray-600">Section: {selectedLocationData.section}</p>
                    <p className="text-sm text-gray-600">
                      Available Slots: {selectedLocationData.availableSlots} / {selectedLocationData.totalSlots}
                    </p>
                    <p className="text-sm text-gray-600">
                      Accepted Sizes: {selectedLocationData.acceptedSizes.join(', ')}
                    </p>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-brand-black mb-4">Summary</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Container Size:</span> {containerSize}</p>
                  <p><span className="font-medium">Quantity:</span> {quantity} container(s)</p>
                  <p><span className="font-medium">Container Number(s):</span> {containerNumbers.filter(n => n).join(', ')}</p>
                  <p><span className="font-medium">Client:</span> {selectedClientData?.name || 'Not selected'}</p>
                  <p><span className="font-medium">Transport Company:</span> {transportCompany || 'Not specified'}</p>
                  <p><span className="font-medium">Driver:</span> {driverName || 'Not specified'}</p>
                  <p><span className="font-medium">Vehicle:</span> {vehicleNumber || 'Not specified'}</p>
                  <p><span className="font-medium">Location:</span> {selectedLocationData?.name || 'Not selected'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                className="btn-secondary px-4 py-2 rounded-lg font-medium transition-all"
                disabled={isLoading}
              >
                Previous
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="btn-primary px-6 py-2 rounded-lg font-medium transition-all"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="btn-primary px-6 py-2 rounded-lg font-medium transition-all flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="spinner w-4 h-4"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete Gate In</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`absolute top-4 right-4 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'notification-success' : 'notification-error'
          } fade-in`}>
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{notification.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GateIn;