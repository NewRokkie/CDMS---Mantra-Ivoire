import React, { useState, useEffect } from 'react';
import { Package, User, FileText, Calculator, AlertTriangle, Plus, Minus, ArrowRight, CheckCircle, ArrowLeft } from 'lucide-react';
import { ClientSearchField } from '../Common/ClientSearchField';
import { ContainerQuantityBySize, Client } from '../../types';
import { MultiStepModal } from '../Common/Modal/MultiStepModal';
import { clientService } from '../../services/api';

interface BookingReferenceFormData {
  bookingNumber: string;
  bookingType: 'IMPORT' | 'EXPORT';
  clientId: string;
  clientCode: string;
  clientName: string;
  maxQuantityThreshold: number;
  containerQuantities: ContainerQuantityBySize;
  totalContainers: number;
  requiresDetailedBreakdown: boolean;
  notes?: string;
}

interface BookingReferenceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  initialData?: Partial<BookingReferenceFormData>;
  isEditMode?: boolean;
}

export const ReleaseOrderForm: React.FC<BookingReferenceFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  initialData,
  isEditMode = false
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [autoSaving, setAutoSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  const [formData, setFormData] = useState<BookingReferenceFormData>({
    bookingNumber: '',
    bookingType: 'EXPORT',
    clientId: '',
    clientCode: '',
    clientName: '',
    maxQuantityThreshold: 0,
    containerQuantities: {
      size20ft: 0,
      size40ft: 0
    },
    totalContainers: 0,
    requiresDetailedBreakdown: false,
    notes: ''
  });

  // Fetch real clients from database
  useEffect(() => {
    const loadClients = async () => {
      try {
        const fetchedClients = await clientService.getAll();
        setClients(fetchedClients);
      } catch (error) {
        console.error('Error loading clients:', error);
        setClients([]);
      }
    };

    loadClients();
  }, []);

  // Initialize form with data if provided
  useEffect(() => {
    if (initialData && isOpen) {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));
    }
  }, [initialData, isOpen]);

  // Calculate total containers whenever quantities change
  useEffect(() => {
    const total = formData.containerQuantities.size20ft +
                  formData.containerQuantities.size40ft;

    const requiresBreakdown = total > formData.maxQuantityThreshold;

    setFormData(prev => ({
      ...prev,
      totalContainers: total,
      requiresDetailedBreakdown: requiresBreakdown
    }));
  }, [formData.containerQuantities, formData.maxQuantityThreshold]);

  // Auto-adjust container quantities when maxQuantityThreshold is lowered
  useEffect(() => {
    const currentTotal = formData.containerQuantities.size20ft + formData.containerQuantities.size40ft;

    if (currentTotal > formData.maxQuantityThreshold && formData.maxQuantityThreshold > 0) {
      const reductionRatio = formData.maxQuantityThreshold / currentTotal;

      const newSize20ft = Math.floor(formData.containerQuantities.size20ft * reductionRatio);
      const newSize40ft = Math.floor(formData.containerQuantities.size40ft * reductionRatio);

      const adjustedTotal = newSize20ft + newSize40ft;
      if (adjustedTotal === 0 && formData.maxQuantityThreshold > 0) {
        if (formData.containerQuantities.size20ft >= formData.containerQuantities.size40ft) {
          setFormData(prev => ({
            ...prev,
            containerQuantities: {
              size20ft: 1,
              size40ft: 0
            }
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            containerQuantities: {
              size20ft: 0,
              size40ft: 1
            }
          }));
        }
      } else {
        setFormData(prev => ({
          ...prev,
          containerQuantities: {
            size20ft: newSize20ft,
            size40ft: newSize40ft
          }
        }));
      }
    }
  }, [formData.maxQuantityThreshold]);

  const handleInputChange = (field: keyof BookingReferenceFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    triggerAutoSave();
  };

  const handleQuantityChange = (size: keyof ContainerQuantityBySize, value: number) => {
    const newValue = Math.max(0, value);

    const otherSize = size === 'size20ft' ? 'size40ft' : 'size20ft';
    const otherValue = formData.containerQuantities[otherSize];
    const newTotal = newValue + otherValue;

    if (newTotal > formData.maxQuantityThreshold) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      containerQuantities: {
        ...prev.containerQuantities,
        [size]: newValue
      }
    }));
    triggerAutoSave();
  };

  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find((c: Client) => c.id === clientId);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        clientId: selectedClient.id,
        clientCode: selectedClient.code,
        clientName: selectedClient.name
      }));
      triggerAutoSave();
    }
  };

  const triggerAutoSave = () => {
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.bookingNumber.trim() !== '' && formData.clientId !== '';
      case 2:
        return formData.totalContainers > 0;
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(2, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleSubmit = () => {
    if (!validateStep(currentStep)) return;
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <MultiStepModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Booking' : 'Create Booking'}
      subtitle={isEditMode ? `Update booking reference` : `Generate new booking reference`}
      icon={FileText}
      currentStep={currentStep}
      totalSteps={2}
      stepLabels={['Booking & Client', 'Container Quantities']}
      onNextStep={currentStep === 2 ? handleSubmit : handleNextStep}
      onPrevStep={handlePrevStep}
      isStepValid={validateStep(currentStep)}
      showProgressBar={true}
      size="md"
    >
      <ReleaseOrderFormContent
        currentStep={currentStep}
        formData={formData}
        isEditMode={isEditMode}
        clients={clients}
        maxQuantityThreshold={formData.maxQuantityThreshold}
        handleInputChange={handleInputChange}
        handleQuantityChange={handleQuantityChange}
        handleClientSelect={handleClientSelect}
      />
    </MultiStepModal>
  );
};

// Form content component
interface ReleaseOrderFormContentProps {
  currentStep: number;
  formData: BookingReferenceFormData;
  isEditMode: boolean;
  clients: Client[];
  maxQuantityThreshold: number;
  handleInputChange: (field: keyof BookingReferenceFormData, value: any) => void;
  handleQuantityChange: (size: keyof ContainerQuantityBySize, value: number) => void;
  handleClientSelect: (clientId: string) => void;
}

const ReleaseOrderFormContent: React.FC<ReleaseOrderFormContentProps> = ({
  currentStep,
  formData,
  isEditMode,
  clients,
  handleInputChange,
  handleQuantityChange,
  handleClientSelect
}) => {
  const getContainerBreakdownText = (): string => {
    const parts = [];
    if (formData.containerQuantities.size20ft > 0) {
      parts.push(`${formData.containerQuantities.size20ft} Container${formData.containerQuantities.size20ft !== 1 ? 's' : ''} of 20"`);
    }
    if (formData.containerQuantities.size40ft > 0) {
      parts.push(`${formData.containerQuantities.size40ft} Container${formData.containerQuantities.size40ft !== 1 ? 's' : ''} of 40"`);
    }

    if (parts.length === 0) return 'No containers specified';

    const result = parts.join(' and ');
    return `${result} for a total of ${formData.totalContainers} container${formData.totalContainers !== 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Booking Number & Client Information */}
      {currentStep === 1 && (
        <div className="space-y-5 animate-slide-in-right">
          {/* Booking Information Section */}
          <div className="rounded-xl p-6 shadow-md bg-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">Booking Information</h4>
                <p className="text-xs text-blue-700">Define the booking type and reference number</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Booking Type */}
              <div>
                <label className="block text-sm font-semibold text-blue-900 mb-3">
                  Booking Type *
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-blue-100 transition-colors flex-1">
                    <input
                      type="radio"
                      name="bookingType"
                      value="IMPORT"
                      checked={formData.bookingType === 'IMPORT'}
                      onChange={(e) => handleInputChange('bookingType', e.target.value)}
                      className="outline-none h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-blue-900">IMPORT</span>
                    <ArrowLeft className="h-4 w-4 text-blue-500 ml-auto" />
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-blue-100 transition-colors flex-1">
                    <input
                      type="radio"
                      name="bookingType"
                      value="EXPORT"
                      checked={formData.bookingType === 'EXPORT'}
                      onChange={(e) => handleInputChange('bookingType', e.target.value)}
                      className="outline-none h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-blue-900">EXPORT</span>
                    <ArrowRight className="h-4 w-4 text-blue-500 ml-auto" />
                  </label>
                </div>
              </div>

              {/* Booking Reference Number */}
              <div>
                <label className="block text-sm font-semibold text-blue-900 mb-2">
                  Booking Reference Number *
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditMode}
                  value={formData.bookingNumber}
                  onChange={(e) => handleInputChange('bookingNumber', e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm bg-white hover:bg-blue-50 transition-colors disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="e.g., ABJEXXXXXXXX"
                />
                <p className="text-xs text-blue-700 mt-2">
                  {isEditMode ? 'Reference number cannot be changed' : 'This will be used as the booking ID throughout the application'}
                </p>
              </div>
            </div>
          </div>

          {/* Client Information Section */}
          <div className="rounded-xl p-6 shadow-md bg-gray-100">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-600 text-white rounded-lg">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-green-900">Client Information</h4>
                <p className="text-xs text-green-700">Select the client for this booking</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-900 mb-3">
                Select Client *
              </label>
              <ClientSearchField
                clients={clients}
                selectedClientId={formData.clientId}
                onClientSelect={handleClientSelect}
                placeholder="Search and select client..."
                required
              />
              {formData.clientName && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-green-200 flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formData.clientName}</p>
                    <p className="text-xs text-gray-500">{formData.clientCode}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Container Quantities */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-slide-in-right">
          {/* Maximum Quantity Threshold */}
          <div className="rounded-xl p-6 shadow-md bg-gray-50">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-600 text-white rounded-lg">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-purple-900">Quantity Control</h4>
                <p className="text-xs text-purple-700">Set limits for container allocation</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-purple-900 mb-3">
                Maximum Quantity Threshold *
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="number"
                  required
                  min="1"
                  max="100"
                  value={formData.maxQuantityThreshold}
                  onChange={(e) => handleInputChange('maxQuantityThreshold', parseInt(e.target.value) || 1)}
                  className="flex-1 px-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  placeholder="10"
                />
                <span className="text-sm font-medium text-purple-900">containers</span>
              </div>
              <p className="text-xs text-purple-700 mt-2">
                Maximum containers allowed before requiring detailed breakdown per size
              </p>
            </div>
          </div>

          {/* Container Quantities by Size */}
          <div className="rounded-xl p-6 shadow-md bg-gray-50">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-orange-600 text-white rounded-lg">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-orange-900">Container Quantities by Size</h4>
                <p className="text-xs text-orange-700">
                  Total: <span className="font-bold">{formData.totalContainers}</span> container{formData.totalContainers !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {/* 20ft Containers */}
              <div className="bg-white rounded-lg p-5 border-2 border-blue-200 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-gray-900">20" Containers</span>
                  </div>
                  <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">Standard</span>
                </div>

                <div className="flex items-center justify-between space-x-3">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange('size20ft', formData.containerQuantities.size20ft - 1)}
                    disabled={formData.containerQuantities.size20ft <= 0}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Decrease 20ft containers"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.containerQuantities.size20ft}
                    onChange={(e) => handleQuantityChange('size20ft', parseInt(e.target.value) || 0)}
                    className="flex-1 text-center px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold text-lg"
                  />

                  <button
                    type="button"
                    onClick={() => handleQuantityChange('size20ft', formData.containerQuantities.size20ft + 1)}
                    disabled={formData.totalContainers >= formData.maxQuantityThreshold}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Increase 20ft containers"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 40ft Containers */}
              <div className="bg-white rounded-lg p-5 border-2 border-green-200 hover:border-green-300 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-gray-900">40" Containers</span>
                  </div>
                  <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">High Capacity</span>
                </div>

                <div className="flex items-center justify-between space-x-3">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange('size40ft', formData.containerQuantities.size40ft - 1)}
                    disabled={formData.containerQuantities.size40ft <= 0}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Decrease 40ft containers"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.containerQuantities.size40ft}
                    onChange={(e) => handleQuantityChange('size40ft', parseInt(e.target.value) || 0)}
                    className="flex-1 text-center px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-bold text-lg"
                  />

                  <button
                    type="button"
                    onClick={() => handleQuantityChange('size40ft', formData.containerQuantities.size40ft + 1)}
                    disabled={formData.totalContainers >= formData.maxQuantityThreshold}
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Increase 40ft containers"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Container Summary */}
            {formData.totalContainers > 0 && (
              <div className="space-y-3">
                <div className="p-4 bg-white rounded-lg border-2 border-orange-300">
                  <h5 className="font-semibold text-orange-900 mb-2">Summary</h5>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {getContainerBreakdownText()}
                  </p>
                </div>

                {formData.requiresDetailedBreakdown && (
                  <div className="flex items-start p-4 bg-orange-50 border border-orange-300 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-orange-900">Detailed Breakdown Required</p>
                      <p className="text-xs text-orange-700 mt-1">
                        Total exceeds threshold ({formData.maxQuantityThreshold}). Detailed breakdown will be required for processing.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="rounded-xl p-6 bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gray-600 text-white rounded-lg">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-gray-900">Additional Notes (Optional)</h4>
            </div>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none text-sm"
              rows={3}
              placeholder="Add any additional notes or special instructions..."
            />
          </div>
        </div>
      )}
    </div>
  );
};
