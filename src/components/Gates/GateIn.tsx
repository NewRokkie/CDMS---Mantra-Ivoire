// GateIn.tsx
import React, { useState } from 'react';
import { Plus, Search, Filter, CheckCircle, Clock, AlertTriangle, Truck, Container as ContainerIcon, Package } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { GateInModal } from './GateInModal';

// Move the interface to the top level so it can be imported
export interface GateInFormData {
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

      {/* Gate In Form Modal */}
      <GateInModal
        showForm={showForm}
        setShowForm={setShowForm}
        formData={formData}
        setFormData={setFormData}
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        isProcessing={isProcessing}
        autoSaving={autoSaving}
        validateStep={validateStep}
        handleSubmit={handleSubmit}
        handleNextStep={handleNextStep}
        handlePrevStep={handlePrevStep}
        handleContainerSizeChange={handleContainerSizeChange}
        handleQuantityChange={handleQuantityChange}
        handleContainerNumberChange={handleContainerNumberChange}
        handleClientSelect={handleClientSelect}
        handleInputChange={handleInputChange}
        mockClients={mockClients}
        availableLocations={availableLocations}
      />
    </div>
  );
};