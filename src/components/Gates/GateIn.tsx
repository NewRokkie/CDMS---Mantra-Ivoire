import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, CheckCircle, Clock, AlertTriangle, Truck, Container as ContainerIcon, User, MapPin, Package, Calendar, X, Info, Save, RotateCcw } from 'lucide-react';
import { Container, Client } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';

interface GateInFormData {
  containerSize: '20ft' | '40ft';
  containerCount: 1 | 2;
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

interface FormErrors {
  [key: string]: string;
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
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  
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

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => {
        // Simulate auto-save
        console.log('Auto-saving form data...');
        setHasUnsavedChanges(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges]);

  // Get available locations based on container size
  const getAvailableLocations = (): LocationOption[] => {
    return mockLocations.filter(location => 
      location.containerSize === formData.containerSize || 
      location.containerSize === 'both'
    ).filter(location => location.availableSlots > 0);
  };

  // Validate container number format
  const validateContainerNumber = (containerNumber: string): boolean => {
    const containerRegex = /^[A-Z]{4}[0-9]{7}$/;
    return containerRegex.test(containerNumber.replace(/[-\s]/g, ''));
  };

  // Real-time validation
  const validateField = (field: string, value: any): string => {
    switch (field) {
      case 'clientId':
        return !value ? 'Client selection is required' : '';
      case 'transportCompany':
        return !value.trim() ? 'Transport company is required' : '';
      case 'driverName':
        return !value.trim() ? 'Driver name is required' : '';
      case 'vehicleNumber':
        return !value.trim() ? 'Vehicle number is required' : '';
      case 'selectedLocation':
        return !value ? 'Location selection is required' : '';
      case 'containerNumbers':
        const filledContainers = value.filter((num: string) => num.trim() !== '');
        if (filledContainers.length === 0) return 'At least one container number is required';
        
        for (let i = 0; i < filledContainers.length; i++) {
          if (!validateContainerNumber(filledContainers[i])) {
            return `Container ${i + 1} number format is invalid (should be 4 letters + 7 digits)`;
          }
        }
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (field: keyof GateInFormData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Handle container size change
      if (field === 'containerSize') {
        newData.containerCount = 1;
        newData.containerNumbers = [''];
        newData.selectedLocation = '';
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

    // Real-time validation
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));

    setHasUnsavedChanges(true);
  };

  const handleContainerNumberChange = (index: number, value: string) => {
    const newContainerNumbers = [...formData.containerNumbers];
    newContainerNumbers[index] = value;
    handleInputChange('containerNumbers', newContainerNumbers);
  };

  const handleAddSeal = () => {
    const sealNumber = prompt('Enter seal number:');
    if (sealNumber && sealNumber.trim()) {
      setFormData(prev => ({
        ...prev,
        sealNumbers: [...prev.sealNumbers, sealNumber.trim()]
      }));
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveSeal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sealNumbers: prev.sealNumbers.filter((_, i) => i !== index)
    }));
    setHasUnsavedChanges(true);
  };

  const handleAddDamage = () => {
    const damage = prompt('Describe damage:');
    if (damage && damage.trim()) {
      setFormData(prev => ({
        ...prev,
        damage: [...prev.damage, damage.trim()]
      }));
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveDamage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      damage: prev.damage.filter((_, i) => i !== index)
    }));
    setHasUnsavedChanges(true);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate all fields
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field as keyof GateInFormData]);
      if (error) newErrors[field] = error;
    });

    // Additional validations
    if (formData.containerSize === '20ft' && formData.containerCount === 2) {
      const filledContainers = formData.containerNumbers.filter(num => num.trim() !== '');
      if (filledContainers.length !== 2) {
        newErrors.containerNumbers = 'Both container numbers are required for double container entry';
      }
    }

    const selectedLocation = getAvailableLocations().find(loc => loc.id === formData.selectedLocation);
    if (selectedLocation && selectedLocation.availableSlots < formData.containerCount) {
      newErrors.selectedLocation = 'Selected location does not have sufficient capacity';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformGateIn) return;

    if (!validateForm()) {
      setCurrentStep(1); // Go back to first step if validation fails
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
          type: 'dry',
          size: formData.containerSize,
          status: 'in_depot',
          location: formData.selectedLocation,
          gateInDate: new Date(),
          client: formData.clientName,
          clientCode: mockClients.find(c => c.id === formData.clientId)?.code,
          damage: formData.damage.length > 0 ? formData.damage : undefined
        }));

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Show success notification
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 5000);
      
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
      setCurrentStep(1);
      setErrors({});
      setHasUnsavedChanges(false);
      setShowForm(false);
    } catch (error) {
      alert(`Error processing gate in: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetForm = () => {
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
    setCurrentStep(1);
    setErrors({});
    setHasUnsavedChanges(false);
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
  const totalSteps = 3;

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {showSuccessNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 animate-slide-in-right">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Gate In processed successfully!</span>
          <button
            onClick={() => setShowSuccessNotification(false)}
            className="ml-2 hover:bg-green-600 rounded p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gate In Management</h2>
          <p className="text-gray-600 mt-1">Process container arrivals and assign yard locations</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Plus className="h-5 w-5" />
          <span className="font-medium">New Gate In</span>
        </button>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 mb-1">Today's Gate Ins</p>
              <p className="text-3xl font-bold text-green-900">12</p>
              <p className="text-xs text-green-600 mt-1">+3 from yesterday</p>
            </div>
            <div className="p-3 bg-green-200 rounded-xl">
              <Truck className="h-8 w-8 text-green-700" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 mb-1">Containers Processed</p>
              <p className="text-3xl font-bold text-blue-900">18</p>
              <p className="text-xs text-blue-600 mt-1">+5 from yesterday</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-xl">
              <ContainerIcon className="h-8 w-8 text-blue-700" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 mb-1">Avg Processing Time</p>
              <p className="text-3xl font-bold text-yellow-900">8m</p>
              <p className="text-xs text-yellow-600 mt-1">-2m improvement</p>
            </div>
            <div className="p-3 bg-yellow-200 rounded-xl">
              <Clock className="h-8 w-8 text-yellow-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Search and Filter */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search recent gate ins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              />
            </div>
          </div>
          <button className="flex items-center space-x-2 px-4 py-3 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4" />
            <span>Advanced Filter</span>
          </button>
        </div>
      </div>

      {/* Enhanced Recent Gate Ins Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Recent Gate Ins</h3>
          <p className="text-sm text-gray-600 mt-1">Latest container arrivals and processing status</p>
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
                      <ContainerIcon className="h-5 w-5 text-gray-400 mr-3" />
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {gateIn.client}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {gateIn.gateInTime.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {gateIn.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
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

      {/* Enhanced Modal with Backdrop Blur */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl animate-slide-in-up">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">New Gate In Process</h3>
                  <p className="text-gray-600 mt-1">Process container arrival and assign yard location</p>
                </div>
                <div className="flex items-center space-x-3">
                  {hasUnsavedChanges && (
                    <div className="flex items-center space-x-2 text-sm text-yellow-600">
                      <Save className="h-4 w-4" />
                      <span>Auto-saving...</span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              {/* Progress Indicator */}
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Step {currentStep} of {totalSteps}</span>
                  <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-8 py-6 max-h-[calc(95vh-200px)] overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Step 1: Container Configuration */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Package className="h-5 w-5 mr-2 text-blue-600" />
                        Container Configuration
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Container Size *
                          </label>
                          <select
                            required
                            value={formData.containerSize}
                            onChange={(e) => handleInputChange('containerSize', e.target.value as '20ft' | '40ft')}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                              errors.containerSize ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                          >
                            <option value="20ft">20ft Container</option>
                            <option value="40ft">40ft Container</option>
                          </select>
                          {errors.containerSize && (
                            <p className="mt-1 text-sm text-red-600 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              {errors.containerSize}
                            </p>
                          )}
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
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            >
                              <option value={1}>Single Container (1)</option>
                              <option value={2}>Double Container (2)</option>
                            </select>
                            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                              <div className="flex items-start space-x-2">
                                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                                <p className="text-sm text-blue-800">
                                  Double container entry requires both containers to belong to the same client
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Container Numbers */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <ContainerIcon className="h-5 w-5 mr-2 text-green-600" />
                        Container Information
                      </h4>
                      
                      <div className="space-y-4">
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
                              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors ${
                                errors.containerNumbers ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                              placeholder="e.g., MSKU1234567"
                              pattern="[A-Z]{4}[0-9]{7}"
                              title="Container number should be 4 letters followed by 7 digits"
                            />
                            <p className="text-xs text-gray-500 mt-1">Format: 4 letters + 7 digits (e.g., MSKU1234567)</p>
                          </div>
                        ))}
                        {errors.containerNumbers && (
                          <p className="text-sm text-red-600 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            {errors.containerNumbers}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Client and Transport Information */}
                {currentStep === 2 && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Client Selection */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <User className="h-5 w-5 mr-2 text-purple-600" />
                        Client Information
                      </h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Client *
                        </label>
                        <select
                          required
                          value={formData.clientId}
                          onChange={(e) => handleInputChange('clientId', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                            errors.clientId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select a client...</option>
                          {mockClients.filter(client => client.isActive).map(client => (
                            <option key={client.id} value={client.id}>
                              {client.name} ({client.code})
                            </option>
                          ))}
                        </select>
                        {errors.clientId && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            {errors.clientId}
                          </p>
                        )}
                        {formData.clientId && (
                          <div className="mt-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="flex items-center space-x-3">
                              <User className="h-5 w-5 text-purple-600" />
                              <div>
                                <p className="font-medium text-purple-900">
                                  {mockClients.find(c => c.id === formData.clientId)?.contactPerson.name}
                                </p>
                                <p className="text-sm text-purple-700">
                                  {mockClients.find(c => c.id === formData.clientId)?.contactPerson.position}
                                </p>
                                <p className="text-sm text-purple-600">
                                  {mockClients.find(c => c.id === formData.clientId)?.contactPerson.email}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Transport Information */}
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Truck className="h-5 w-5 mr-2 text-orange-600" />
                        Transport Information
                      </h4>
                      
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
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                              errors.transportCompany ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="Transport company name"
                          />
                          {errors.transportCompany && (
                            <p className="mt-1 text-sm text-red-600 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-1" />
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
                            required
                            value={formData.driverName}
                            onChange={(e) => handleInputChange('driverName', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                              errors.driverName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="Driver full name"
                          />
                          {errors.driverName && (
                            <p className="mt-1 text-sm text-red-600 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              {errors.driverName}
                            </p>
                          )}
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
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${
                              errors.vehicleNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="License plate"
                          />
                          {errors.vehicleNumber && (
                            <p className="mt-1 text-sm text-red-600 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              {errors.vehicleNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Location and Additional Details */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Location Assignment */}
                    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-6 border border-teal-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <MapPin className="h-5 w-5 mr-2 text-teal-600" />
                        Location Assignment
                      </h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Available Locations for {formData.containerSize} Containers *
                        </label>
                        <select
                          required
                          value={formData.selectedLocation}
                          onChange={(e) => handleInputChange('selectedLocation', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
                            errors.selectedLocation ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select a location...</option>
                          {availableLocations.map(location => (
                            <option key={location.id} value={location.id}>
                              {location.name} - {location.availableSlots}/{location.totalCapacity} slots available ({location.section})
                            </option>
                          ))}
                        </select>
                        {errors.selectedLocation && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            {errors.selectedLocation}
                          </p>
                        )}
                        {formData.selectedLocation && (
                          <div className="mt-3 p-4 bg-teal-50 rounded-lg border border-teal-200">
                            <div className="flex items-center space-x-3">
                              <MapPin className="h-5 w-5 text-teal-600" />
                              <div>
                                <p className="font-medium text-teal-900">
                                  {availableLocations.find(l => l.id === formData.selectedLocation)?.name}
                                </p>
                                <p className="text-sm text-teal-700">
                                  {availableLocations.find(l => l.id === formData.selectedLocation)?.availableSlots} slots available
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {availableLocations.length === 0 && (
                          <div className="mt-3 p-4 bg-red-50 rounded-lg border border-red-200">
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                              <span className="text-sm text-red-800">No locations available for {formData.containerSize} containers</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Seal Numbers */}
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Seal Numbers
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
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
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddSeal}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          + Add Seal Number
                        </button>
                      </div>

                      {/* Damage Reports */}
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Damage Reports
                        </label>
                        <div className="space-y-2 mb-3">
                          {formData.damage.map((damage, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                            >
                              <span className="text-sm text-red-800">{damage}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveDamage(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={handleAddDamage}
                          className="text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                          + Report Damage
                        </button>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Additional Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Enter any additional notes or special instructions..."
                      />
                    </div>
                  </div>
                )}

                {/* Validation Alerts */}
                {formData.containerSize === '20ft' && formData.containerCount === 2 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="text-sm text-yellow-800 font-medium">
                        Double container entry: Both containers must belong to the same client
                      </span>
                    </div>
                  </div>
                )}

                {formData.containerSize === '40ft' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      <span className="text-sm text-blue-800 font-medium">
                        40ft containers require paired stack locations and are limited to one container per truck
                      </span>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Reset Form</span>
                  </button>
                  {Object.keys(errors).length > 0 && (
                    <div className="flex items-center space-x-2 text-sm text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>{Object.keys(errors).length} error{Object.keys(errors).length !== 1 ? 's' : ''} found</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(prev => prev - 1)}
                      className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Previous
                    </button>
                  )}
                  
                  {currentStep < totalSteps ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(prev => prev + 1)}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg"
                    >
                      Next Step
                    </button>
                  ) : (
                    <button
                      type="submit"
                      onClick={handleSubmit}
                      disabled={isProcessing || availableLocations.length === 0 || Object.keys(errors).length > 0}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          <span>Process Gate In</span>
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