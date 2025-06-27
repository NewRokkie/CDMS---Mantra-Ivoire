import React, { useState } from 'react';
import { Plus, Search, Filter, CheckCircle, Clock, AlertTriangle, Truck, Container as ContainerIcon, Package, User, MapPin, Calendar, X, Loader } from 'lucide-react';
import { Container } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';

interface GateInFormData {
  containerSize: '20ft' | '40ft';
  quantity: 1 | 2;
  containerNumbers: string[];
  client: string;
  clientCode: string;
  transportCompany: string;
  driverName: string;
  vehicleNumber: string;
  location: string;
  sealNumbers: string[];
  damage: string[];
  notes: string;
}

// Mock client data
const mockClients = [
  { id: '1', name: 'Maersk Line', code: 'MAEU' },
  { id: '2', name: 'MSC Mediterranean Shipping', code: 'MSCU' },
  { id: '3', name: 'CMA CGM', code: 'CMDU' },
  { id: '4', name: 'Shipping Solutions Inc', code: 'SHIP001' },
  { id: '5', name: 'Hapag-Lloyd', code: 'HLCU' }
];

// Mock location data based on container size
const mockLocations = {
  '20ft': [
    { id: 'S1', name: 'Stack S1', capacity: 20, available: 15 },
    { id: 'S3', name: 'Stack S3', capacity: 25, available: 18 },
    { id: 'S101', name: 'Stack S101', capacity: 5, available: 3 },
    { id: 'S103', name: 'Stack S103', capacity: 10, available: 7 }
  ],
  '40ft': [
    { id: 'S5', name: 'Stack S5', capacity: 25, available: 20 },
    { id: 'S7', name: 'Stack S7', capacity: 25, available: 22 },
    { id: 'S61', name: 'Stack S61', capacity: 30, available: 25 },
    { id: 'S65', name: 'Stack S65', capacity: 30, available: 28 }
  ]
};

// Mock data for recent gate-ins
const mockRecentGateIns = [
  {
    id: '1',
    containerNumbers: ['MSKU-123456-7'],
    client: 'Maersk Line',
    gateInTime: new Date('2025-01-11T14:30:00'),
    status: 'completed',
    location: 'Stack S5'
  },
  {
    id: '2',
    containerNumbers: ['TCLU-987654-3'],
    client: 'MSC',
    gateInTime: new Date('2025-01-11T13:15:00'),
    status: 'completed',
    location: 'Stack S3'
  }
];

// Custom Switch Component
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  leftLabel: string;
  rightLabel: string;
  disabled?: boolean;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, leftLabel, rightLabel, disabled = false }) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center space-x-4">
        <span className={`text-sm font-medium ${!checked ? 'text-blue-600' : 'text-gray-500'}`}>
          {leftLabel}
        </span>
        <button
          type="button"
          onClick={() => !disabled && onChange(!checked)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            checked ? 'bg-blue-600' : 'bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              checked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-sm font-medium ${checked ? 'text-blue-600' : 'text-gray-500'}`}>
          {rightLabel}
        </span>
      </div>
    </div>
  );
};

export const GateIn: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [autoSaving, setAutoSaving] = useState(false);
  
  const [formData, setFormData] = useState<GateInFormData>({
    containerSize: '20ft',
    quantity: 1,
    containerNumbers: [''],
    client: '',
    clientCode: '',
    transportCompany: '',
    driverName: '',
    vehicleNumber: '',
    location: '',
    sealNumbers: [],
    damage: [],
    notes: ''
  });

  const { t } = useLanguage();
  const { user } = useAuth();

  const canPerformGateIn = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';

  const handleInputChange = (field: keyof GateInFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Trigger auto-save
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
  };

  const handleContainerSizeChange = (is40ft: boolean) => {
    const newSize = is40ft ? '40ft' : '20ft';
    setFormData(prev => ({
      ...prev,
      containerSize: newSize,
      quantity: newSize === '40ft' ? 1 : prev.quantity, // Reset quantity to 1 for 40ft
      containerNumbers: newSize === '40ft' ? [''] : (prev.quantity === 2 ? ['', ''] : ['']),
      location: '' // Reset location when size changes
    }));
  };

  const handleQuantityChange = (isDouble: boolean) => {
    const newQuantity = isDouble ? 2 : 1;
    setFormData(prev => ({
      ...prev,
      quantity: newQuantity as 1 | 2,
      containerNumbers: newQuantity === 2 ? ['', ''] : ['']
    }));
  };

  const handleContainerNumberChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      containerNumbers: prev.containerNumbers.map((num, i) => i === index ? value : num)
    }));
  };

  const handleClientSelect = (clientId: string) => {
    const client = mockClients.find(c => c.id === clientId);
    if (client) {
      setFormData(prev => ({
        ...prev,
        client: client.name,
        clientCode: client.code
      }));
    }
  };

  const handleAddSeal = () => {
    const sealNumber = prompt('Enter seal number:');
    if (sealNumber && sealNumber.trim()) {
      setFormData(prev => ({
        ...prev,
        sealNumbers: [...prev.sealNumbers, sealNumber.trim()]
      }));
    }
  };

  const handleRemoveSeal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sealNumbers: prev.sealNumbers.filter((_, i) => i !== index)
    }));
  };

  const handleAddDamage = () => {
    const damage = prompt('Describe damage:');
    if (damage && damage.trim()) {
      setFormData(prev => ({
        ...prev,
        damage: [...prev.damage, damage.trim()]
      }));
    }
  };

  const handleRemoveDamage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      damage: prev.damage.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.containerNumbers.every(num => num.trim() !== '') && formData.client !== '';
      case 2:
        return formData.transportCompany !== '' && formData.driverName !== '' && formData.vehicleNumber !== '';
      case 3:
        return formData.location !== '';
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(3, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformGateIn) return;

    setIsProcessing(true);
    try {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const containerNumbers = formData.containerNumbers.filter(num => num.trim() !== '');
      alert(`Successfully processed gate in for ${containerNumbers.length} container(s): ${containerNumbers.join(', ')}`);
      
      // Reset form
      setFormData({
        containerSize: '20ft',
        quantity: 1,
        containerNumbers: [''],
        client: '',
        clientCode: '',
        transportCompany: '',
        driverName: '',
        vehicleNumber: '',
        location: '',
        sealNumbers: [],
        damage: [],
        notes: ''
      });
      setCurrentStep(1);
      setShowForm(false);
    } catch (error) {
      alert(`Error processing gate in: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredGateIns = mockRecentGateIns.filter(gateIn =>
    gateIn.containerNumbers.some(num => num.toLowerCase().includes(searchTerm.toLowerCase())) ||
    gateIn.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableLocations = mockLocations[formData.containerSize];

  if (!canPerformGateIn) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to perform gate in operations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gate In Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="btn-success flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Gate In</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Truck className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Today's Gate Ins</p>
              <p className="text-lg font-semibold text-gray-900">12</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ContainerIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Containers In Depot</p>
              <p className="text-lg font-semibold text-gray-900">892</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 interactive">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Average Processing Time</p>
              <p className="text-lg font-semibold text-gray-900">8 min</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search recent gate ins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10 w-full"
            />
          </div>
          <button className="btn-secondary flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Recent Gate Ins */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Gate Ins</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gate In Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGateIns.map((gateIn) => (
                <tr key={gateIn.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {gateIn.containerNumbers.join(', ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {gateIn.client}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {gateIn.gateInTime.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {gateIn.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gate In Form Modal - Reduced Width */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong animate-slide-in-up">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">New Gate In Process</h3>
                  <p className="text-sm text-gray-600 mt-1">Step {currentStep} of 3</p>
                </div>
                <div className="flex items-center space-x-3">
                  {autoSaving && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <Loader className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Auto-saving...</span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-white/50 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center space-x-2">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        step <= currentStep 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {step}
                      </div>
                      {step < 3 && (
                        <div className={`w-12 h-1 mx-2 rounded transition-colors ${
                          step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-600">
                  <span>Container Info</span>
                  <span>Transport Details</span>
                  <span>Location & Final</span>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-8 py-6 max-h-[60vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Container Configuration */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-slide-in-right">
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                        <Package className="h-5 w-5 mr-2" />
                        Container Configuration
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Container Size Switch */}
                        <Switch
                          checked={formData.containerSize === '40ft'}
                          onChange={handleContainerSizeChange}
                          label="Container Size *"
                          leftLabel="20ft"
                          rightLabel="40ft"
                        />

                        {/* Quantity Switch - Only for 20ft containers */}
                        {formData.containerSize === '20ft' && (
                          <Switch
                            checked={formData.quantity === 2}
                            onChange={handleQuantityChange}
                            label="Quantity *"
                            leftLabel="Single (1)"
                            rightLabel="Double (2)"
                          />
                        )}
                      </div>

                      {/* Container Number Inputs */}
                      <div className="mt-6 space-y-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Container Number{formData.quantity > 1 ? 's' : ''} *
                        </label>
                        {formData.containerNumbers.map((number, index) => (
                          <input
                            key={index}
                            type="text"
                            required
                            value={number}
                            onChange={(e) => handleContainerNumberChange(index, e.target.value)}
                            className="form-input w-full"
                            placeholder={`Container ${index + 1} number (e.g., MSKU-123456-7)`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Client Selection */}
                    <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        Client Information
                      </h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Client *
                        </label>
                        <select
                          required
                          value={formData.client ? mockClients.find(c => c.name === formData.client)?.id || '' : ''}
                          onChange={(e) => handleClientSelect(e.target.value)}
                          className="form-input w-full"
                        >
                          <option value="">Choose a client...</option>
                          {mockClients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name} ({client.code})
                            </option>
                          ))}
                        </select>
                        {formData.client && (
                          <div className="mt-2 p-3 bg-white rounded-lg border">
                            <div className="text-sm">
                              <span className="font-medium">Selected:</span> {formData.client}
                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {formData.clientCode}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Transport Information */}
                {currentStep === 2 && (
                  <div className="space-y-6 animate-slide-in-right">
                    <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                      <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
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
                          <input
                            type="text"
                            required
                            value={formData.driverName}
                            onChange={(e) => handleInputChange('driverName', e.target.value)}
                            className="form-input w-full"
                            placeholder="Driver full name"
                          />
                        </div>

                        <div className="md:col-span-2">
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
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Location Assignment */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-slide-in-right">
                    <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                      <h4 className="font-semibold text-orange-900 mb-4 flex items-center">
                        <MapPin className="h-5 w-5 mr-2" />
                        Location Assignment
                      </h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Assigned Location * (for {formData.containerSize} containers)
                        </label>
                        <select
                          required
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          className="form-input w-full"
                        >
                          <option value="">Choose location...</option>
                          {availableLocations.map((location) => (
                            <option key={location.id} value={location.name}>
                              {location.name} - {location.available}/{location.capacity} available
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Additional Details */}
                      <div className="mt-6">
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

                    {/* Summary */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-4">Gate In Summary</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Container(s):</span>
                          <div className="font-medium">
                            {formData.containerNumbers.filter(n => n.trim()).join(', ')}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Size & Quantity:</span>
                          <div className="font-medium">{formData.containerSize} × {formData.quantity}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Client:</span>
                          <div className="font-medium">{formData.client}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Location:</span>
                          <div className="font-medium">{formData.location}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Driver:</span>
                          <div className="font-medium">{formData.driverName}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">Vehicle:</span>
                          <div className="font-medium">{formData.vehicleNumber}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer - Fixed at Bottom */}
            <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
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
                    onClick={() => setShowForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  
                  {currentStep < 3 ? (
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
                      onClick={handleSubmit}
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
                          <span>Complete Gate In</span>
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