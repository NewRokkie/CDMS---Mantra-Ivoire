import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, CheckCircle, Clock, AlertTriangle, Truck, Container as ContainerIcon, User, MapPin, Package, Calendar } from 'lucide-react';
import { Container, Client } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';

interface GateInFormData {
  containerSize: '20ft' | '40ft';
  containerCount: 1 | 2; // Only for 20ft containers
  containerNumbers: string[];
  clientId: string;
  clientName: string;
  transportCompany: string;
  driverName: string;
  vehicleNumber: string;
  selectedLocation: string;
  sealNumbers: string[];
  damage: string[];
  notes: string;
}

interface LocationOption {
  id: string;
  name: string;
  stackNumber: string;
  availableSlots: number;
  totalCapacity: number;
  containerSize: '20ft' | '40ft' | 'both';
  section: string;
}

// Mock clients data from Client Master Data
const mockClients: Client[] = [
  {
    id: '1',
    name: 'Maersk Line',
    code: 'MAEU',
    email: 'operations@maersk.com',
    phone: '+1-555-0101',
    address: {
      street: '123 Harbor Drive',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA'
    },
    contactPerson: {
      name: 'John Smith',
      email: 'john.smith@maersk.com',
      phone: '+1-555-0102',
      position: 'Operations Manager'
    },
    taxId: 'US123456789',
    creditLimit: 500000,
    paymentTerms: 30,
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2025-01-10')
  },
  {
    id: '2',
    name: 'MSC Mediterranean Shipping',
    code: 'MSCU',
    email: 'depot@msc.com',
    phone: '+1-555-0201',
    address: {
      street: '456 Port Avenue',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      country: 'USA'
    },
    contactPerson: {
      name: 'Maria Garcia',
      email: 'maria.garcia@msc.com',
      phone: '+1-555-0202',
      position: 'Depot Coordinator'
    },
    taxId: 'US987654321',
    creditLimit: 750000,
    paymentTerms: 45,
    isActive: true,
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2025-01-08')
  },
  {
    id: '3',
    name: 'CMA CGM',
    code: 'CMDU',
    email: 'usa@cma-cgm.com',
    phone: '+1-555-0301',
    address: {
      street: '789 Shipping Boulevard',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      country: 'USA'
    },
    contactPerson: {
      name: 'Pierre Dubois',
      email: 'pierre.dubois@cma-cgm.com',
      phone: '+1-555-0302',
      position: 'Regional Manager'
    },
    taxId: 'US456789123',
    creditLimit: 600000,
    paymentTerms: 30,
    isActive: true,
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2025-01-05')
  },
  {
    id: '4',
    name: 'Shipping Solutions Inc',
    code: 'SHIP001',
    email: 'operations@shippingsolutions.com',
    phone: '+1-555-0401',
    address: {
      street: '321 Logistics Way',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
      country: 'USA'
    },
    contactPerson: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@shippingsolutions.com',
      phone: '+1-555-0402',
      position: 'Logistics Manager'
    },
    taxId: 'US789123456',
    creditLimit: 300000,
    paymentTerms: 30,
    isActive: true,
    createdAt: new Date('2024-04-01'),
    updatedAt: new Date('2025-01-07')
  },
  {
    id: '5',
    name: 'Hapag-Lloyd',
    code: 'HLCU',
    email: 'depot@hapag-lloyd.com',
    phone: '+1-555-0501',
    address: {
      street: '654 Maritime Plaza',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      country: 'USA'
    },
    contactPerson: {
      name: 'Klaus Mueller',
      email: 'klaus.mueller@hapag-lloyd.com',
      phone: '+1-555-0502',
      position: 'Terminal Manager'
    },
    taxId: 'US321654987',
    creditLimit: 450000,
    paymentTerms: 30,
    isActive: true,
    createdAt: new Date('2024-05-15'),
    updatedAt: new Date('2025-01-06')
  }
];

// Mock location data with container size configurations
const mockLocations: LocationOption[] = [
  // 20ft only locations
  { id: 'S1', name: 'Stack S1 - Entry Stack', stackNumber: 'S1', availableSlots: 15, totalCapacity: 20, containerSize: '20ft', section: 'Top Section' },
  { id: 'S31', name: 'Stack S31 - End Stack', stackNumber: 'S31', availableSlots: 25, totalCapacity: 35, containerSize: '20ft', section: 'Top Section' },
  { id: 'S101', name: 'Stack S101 - Single Row', stackNumber: 'S101', availableSlots: 3, totalCapacity: 5, containerSize: '20ft', section: 'Bottom Section' },
  { id: 'S103', name: 'Stack S103 - Double Row', stackNumber: 'S103', availableSlots: 7, totalCapacity: 10, containerSize: '20ft', section: 'Bottom Section' },
  
  // 40ft only locations
  { id: 'S3-S5', name: 'Stack S3+S5 Pair', stackNumber: 'S3+S5', availableSlots: 20, totalCapacity: 25, containerSize: '40ft', section: 'Top Section' },
  { id: 'S7-S9', name: 'Stack S7+S9 Pair', stackNumber: 'S7+S9', availableSlots: 18, totalCapacity: 25, containerSize: '40ft', section: 'Top Section' },
  { id: 'S11-S13', name: 'Stack S11+S13 Pair', stackNumber: 'S11+S13', availableSlots: 22, totalCapacity: 25, containerSize: '40ft', section: 'Top Section' },
  { id: 'S15-S17', name: 'Stack S15+S17 Pair', stackNumber: 'S15+S17', availableSlots: 19, totalCapacity: 25, containerSize: '40ft', section: 'Top Section' },
  { id: 'S19-S21', name: 'Stack S19+S21 Pair', stackNumber: 'S19+S21', availableSlots: 16, totalCapacity: 25, containerSize: '40ft', section: 'Top Section' },
  { id: 'S23-S25', name: 'Stack S23+S25 Pair', stackNumber: 'S23+S25', availableSlots: 21, totalCapacity: 25, containerSize: '40ft', section: 'Top Section' },
  { id: 'S27-S29', name: 'Stack S27+S29 Pair', stackNumber: 'S27+S29', availableSlots: 17, totalCapacity: 25, containerSize: '40ft', section: 'Top Section' },
  { id: 'S33-S35', name: 'Stack S33+S35 Pair', stackNumber: 'S33+S35', availableSlots: 15, totalCapacity: 25, containerSize: '40ft', section: 'Middle Section' },
  { id: 'S37-S39', name: 'Stack S37+S39 Pair', stackNumber: 'S37+S39', availableSlots: 18, totalCapacity: 25, containerSize: '40ft', section: 'Middle Section' },
  { id: 'S41-S43', name: 'Stack S41+S43 Pair', stackNumber: 'S41+S43', availableSlots: 12, totalCapacity: 20, containerSize: '40ft', section: 'Middle Section' },
  { id: 'S45-S47', name: 'Stack S45+S47 Pair', stackNumber: 'S45+S47', availableSlots: 14, totalCapacity: 20, containerSize: '40ft', section: 'Middle Section' },
  { id: 'S49-S51', name: 'Stack S49+S51 Pair', stackNumber: 'S49+S51', availableSlots: 11, totalCapacity: 20, containerSize: '40ft', section: 'Middle Section' },
  { id: 'S53-S55', name: 'Stack S53+S55 Pair', stackNumber: 'S53+S55', availableSlots: 13, totalCapacity: 20, containerSize: '40ft', section: 'Middle Section' },
  { id: 'S61-S63', name: 'Stack S61+S63 Pair - High Capacity', stackNumber: 'S61+S63', availableSlots: 25, totalCapacity: 30, containerSize: '40ft', section: 'Bottom Section' },
  { id: 'S65-S67', name: 'Stack S65+S67 Pair - High Capacity', stackNumber: 'S65+S67', availableSlots: 23, totalCapacity: 30, containerSize: '40ft', section: 'Bottom Section' },
  { id: 'S69-S71', name: 'Stack S69+S71 Pair - High Capacity', stackNumber: 'S69+S71', availableSlots: 27, totalCapacity: 30, containerSize: '40ft', section: 'Bottom Section' },
  
  // Both sizes (flexible locations)
  { id: 'S73', name: 'Stack S73 - Flexible', stackNumber: 'S73', availableSlots: 12, totalCapacity: 20, containerSize: 'both', section: 'Bottom Section' },
  { id: 'S75', name: 'Stack S75 - Flexible', stackNumber: 'S75', availableSlots: 14, totalCapacity: 20, containerSize: 'both', section: 'Bottom Section' },
  { id: 'S77', name: 'Stack S77 - Flexible', stackNumber: 'S77', availableSlots: 16, totalCapacity: 20, containerSize: 'both', section: 'Bottom Section' },
  { id: 'S79', name: 'Stack S79 - Flexible', stackNumber: 'S79', availableSlots: 13, totalCapacity: 20, containerSize: 'both', section: 'Bottom Section' }
];

// Mock data for recent gate-ins
const mockRecentGateIns = [
  {
    id: '1',
    containerNumbers: ['MSKU-123456-7'],
    client: 'Maersk Line',
    gateInTime: new Date('2025-01-11T14:30:00'),
    status: 'completed',
    location: 'Stack S3+S5 Pair'
  },
  {
    id: '2',
    containerNumbers: ['TCLU-987654-3', 'TCLU-987655-4'],
    client: 'MSC',
    gateInTime: new Date('2025-01-11T13:15:00'),
    status: 'completed',
    location: 'Stack S1 - Entry Stack'
  },
  {
    id: '3',
    containerNumbers: ['GESU-456789-1'],
    client: 'CMA CGM',
    gateInTime: new Date('2025-01-11T12:45:00'),
    status: 'completed',
    location: 'Stack S61+S63 Pair - High Capacity'
  }
];

export const GateIn: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<GateInFormData>({
    containerSize: '20ft',
    containerCount: 1,
    containerNumbers: [''],
    clientId: '',
    clientName: '',
    transportCompany: '',
    driverName: '',
    vehicleNumber: '',
    selectedLocation: '',
    sealNumbers: [],
    damage: [],
    notes: ''
  });

  const { t } = useLanguage();
  const { user } = useAuth();

  const canPerformGateIn = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';

  // Get available locations based on container size
  const getAvailableLocations = (): LocationOption[] => {
    return mockLocations.filter(location => 
      location.containerSize === formData.containerSize || 
      location.containerSize === 'both'
    ).filter(location => location.availableSlots > 0);
  };

  // Validate container number format
  const validateContainerNumber = (containerNumber: string): boolean => {
    // Basic container number validation (4 letters + 7 digits)
    const containerRegex = /^[A-Z]{4}[0-9]{7}$/;
    return containerRegex.test(containerNumber.replace(/[-\s]/g, ''));
  };

  // Check if all containers belong to the same client
  const validateSameClient = (): boolean => {
    if (formData.containerCount === 1) return true;
    
    // In a real implementation, this would check against a database
    // For now, we'll assume validation passes if both container numbers are filled
    return formData.containerNumbers.every(num => num.trim() !== '');
  };

  const handleInputChange = (field: keyof GateInFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Handle container size change
      if (field === 'containerSize') {
        newData.containerCount = 1; // Reset to single container
        newData.containerNumbers = ['']; // Reset container numbers
        newData.selectedLocation = ''; // Reset location
      }
      
      // Handle container count change
      if (field === 'containerCount') {
        if (value === 1) {
          newData.containerNumbers = [prev.containerNumbers[0] || ''];
        } else {
          newData.containerNumbers = [prev.containerNumbers[0] || '', prev.containerNumbers[1] || ''];
        }
      }
      
      // Handle client selection
      if (field === 'clientId') {
        const selectedClient = mockClients.find(c => c.id === value);
        if (selectedClient) {
          newData.clientName = selectedClient.name;
        }
      }
      
      return newData;
    });
  };

  const handleContainerNumberChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      containerNumbers: prev.containerNumbers.map((num, i) => i === index ? value : num)
    }));
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

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    // Check required fields
    if (!formData.clientId) errors.push('Client selection is required');
    if (!formData.transportCompany.trim()) errors.push('Transport company is required');
    if (!formData.driverName.trim()) errors.push('Driver name is required');
    if (!formData.vehicleNumber.trim()) errors.push('Vehicle number is required');
    if (!formData.selectedLocation) errors.push('Location selection is required');
    
    // Validate container numbers
    const filledContainers = formData.containerNumbers.filter(num => num.trim() !== '');
    if (filledContainers.length === 0) {
      errors.push('At least one container number is required');
    } else {
      filledContainers.forEach((num, index) => {
        if (!validateContainerNumber(num)) {
          errors.push(`Container ${index + 1} number format is invalid (should be 4 letters + 7 digits)`);
        }
      });
    }
    
    // For 20ft containers with 2 containers, validate same client
    if (formData.containerSize === '20ft' && formData.containerCount === 2) {
      if (formData.containerNumbers.filter(num => num.trim() !== '').length !== 2) {
        errors.push('Both container numbers are required for double container entry');
      } else if (!validateSameClient()) {
        errors.push('Both containers must belong to the same client');
      }
    }
    
    // Check location capacity
    const selectedLocation = getAvailableLocations().find(loc => loc.id === formData.selectedLocation);
    if (selectedLocation && selectedLocation.availableSlots < formData.containerCount) {
      errors.push('Selected location does not have sufficient capacity');
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformGateIn) return;

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      alert('Please fix the following errors:\n' + validationErrors.join('\n'));
      return;
    }

    setIsProcessing(true);
    try {
      // Create container objects
      const containers: Container[] = formData.containerNumbers
        .filter(num => num.trim() !== '')
        .map((containerNumber, index) => ({
          id: `${Date.now()}-${index}`,
          number: containerNumber,
          type: 'dry', // Default type, could be made selectable
          size: formData.containerSize,
          status: 'in_depot',
          location: formData.selectedLocation,
          gateInDate: new Date(),
          client: formData.clientName,
          clientCode: mockClients.find(c => c.id === formData.clientId)?.code,
          damage: formData.damage.length > 0 ? formData.damage : undefined
        }));

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      alert(`Successfully processed gate in for ${containers.length} container(s):\n${containers.map(c => c.number).join('\n')}`);
      
      // Reset form
      setFormData({
        containerSize: '20ft',
        containerCount: 1,
        containerNumbers: [''],
        clientId: '',
        clientName: '',
        transportCompany: '',
        driverName: '',
        vehicleNumber: '',
        selectedLocation: '',
        sealNumbers: [],
        damage: [],
        notes: ''
      });
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

  if (!canPerformGateIn) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to perform gate in operations.</p>
      </div>
    );
  }

  const availableLocations = getAvailableLocations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gate In Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Gate In</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
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
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ContainerIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Containers Processed</p>
              <p className="text-lg font-semibold text-gray-900">18</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
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
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
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
                  Container Numbers
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
                    <div className="flex items-center">
                      <ContainerIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {gateIn.containerNumbers.join(', ')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {gateIn.containerNumbers.length} container{gateIn.containerNumbers.length !== 1 ? 's' : ''}
                        </div>
                      </div>
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
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">New Gate In</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Container Size Selection */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Container Configuration</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Container Size *
                      </label>
                      <select
                        required
                        value={formData.containerSize}
                        onChange={(e) => handleInputChange('containerSize', e.target.value as '20ft' | '40ft')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="20ft">20ft Container</option>
                        <option value="40ft">40ft Container</option>
                      </select>
                    </div>

                    {formData.containerSize === '20ft' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Number of Containers *
                        </label>
                        <select
                          required
                          value={formData.containerCount}
                          onChange={(e) => handleInputChange('containerCount', parseInt(e.target.value) as 1 | 2)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value={1}>Single Container (1)</option>
                          <option value={2}>Double Container (2)</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Container Numbers */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Container Information</h4>
                  <div className="space-y-3">
                    {formData.containerNumbers.map((containerNumber, index) => (
                      <div key={index}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Container Number {formData.containerCount > 1 ? `${index + 1} ` : ''}*
                        </label>
                        <input
                          type="text"
                          required
                          value={containerNumber}
                          onChange={(e) => handleContainerNumberChange(index, e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="e.g., MSKU1234567"
                          pattern="[A-Z]{4}[0-9]{7}"
                          title="Container number should be 4 letters followed by 7 digits"
                        />
                        <p className="text-xs text-gray-500 mt-1">Format: 4 letters + 7 digits (e.g., MSKU1234567)</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Client Selection */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Client Information</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client *
                    </label>
                    <select
                      required
                      value={formData.clientId}
                      onChange={(e) => handleInputChange('clientId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select a client...</option>
                      {mockClients.filter(client => client.isActive).map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name} ({client.code})
                        </option>
                      ))}
                    </select>
                    {formData.clientId && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-sm text-blue-800">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>
                            {mockClients.find(c => c.id === formData.clientId)?.contactPerson.name} - 
                            {mockClients.find(c => c.id === formData.clientId)?.contactPerson.position}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Assignment */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Location Assignment</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Locations for {formData.containerSize} Containers *
                    </label>
                    <select
                      required
                      value={formData.selectedLocation}
                      onChange={(e) => handleInputChange('selectedLocation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select a location...</option>
                      {availableLocations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name} - {location.availableSlots}/{location.totalCapacity} slots available ({location.section})
                        </option>
                      ))}
                    </select>
                    {formData.selectedLocation && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-800">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>
                            Selected: {availableLocations.find(l => l.id === formData.selectedLocation)?.name}
                            {' '}({availableLocations.find(l => l.id === formData.selectedLocation)?.availableSlots} slots available)
                          </span>
                        </div>
                      </div>
                    )}
                    {availableLocations.length === 0 && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-800">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span>No locations available for {formData.containerSize} containers</span>
                        </div>
                      </div>
                    )}
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="License plate"
                      />
                    </div>
                  </div>
                </div>

                {/* Seal Numbers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seal Numbers
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.sealNumbers.map((seal, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {seal}
                        <button
                          type="button"
                          onClick={() => handleRemoveSeal(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSeal}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Seal Number
                  </button>
                </div>

                {/* Damage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Damage Reports
                  </label>
                  <div className="space-y-2 mb-2">
                    {formData.damage.map((damage, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded"
                      >
                        <span className="text-sm text-red-800">{damage}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDamage(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDamage}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    + Report Damage
                  </button>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Additional notes..."
                  />
                </div>

                {/* Validation Summary */}
                {formData.containerSize === '20ft' && formData.containerCount === 2 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        Double container entry: Both containers must belong to the same client
                      </span>
                    </div>
                  </div>
                )}

                {formData.containerSize === '40ft' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-800">
                        40ft containers require paired stack locations and are limited to one container per truck
                      </span>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing || availableLocations.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Process Gate In</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};