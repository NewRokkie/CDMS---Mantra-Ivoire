import React, { useState, useEffect } from 'react';
import { Package, User, FileText, Calculator, AlertTriangle, Plus, Minus, ArrowRight, CheckCircle, ArrowLeft } from 'lucide-react';
import { ClientSearchField } from '../Common/ClientSearchField';
import { ContainerQuantityBySize, Client } from '../../types';
import { MultiStepModal } from '../Common/Modal/MultiStepModal';
import { clientService } from '../../services/api';
import { TransactionOutSwitch } from './TransactionOutSwitch';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

interface BookingReferenceFormData {
  bookingNumber: string;
  bookingType: 'IMPORT' | 'EXPORT';
  transactionType: 'Positionnement' | 'Transfert (OUT)';
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

export const BookingForm: React.FC<BookingReferenceFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  initialData,
  isEditMode = false
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [autoSaving, setAutoSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  const [formData, setFormData] = useState<BookingReferenceFormData>({
    bookingNumber: '',
    bookingType: 'EXPORT',
    transactionType: 'Positionnement', // Default to 'Positionnement'
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

  const handleTransactionTypeChange = (transactionType: 'Positionnement' | 'Transfert (OUT)') => {
    setFormData(prev => ({
      ...prev,
      transactionType
    }));
    triggerAutoSave();
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
      title={isEditMode ? t('bookings.edit') : t('bookings.createBooking')}
      subtitle={isEditMode ? t('bookings.subtitle.edit') : t('bookings.subtitle.create')}
      icon={FileText}
      currentStep={currentStep}
      totalSteps={2}
      stepLabels={[t('bookings.form.bookingInfo'), t('bookings.form.quantities')]}
      onNextStep={currentStep === 2 ? handleSubmit : handleNextStep}
      onPrevStep={handlePrevStep}
      isStepValid={validateStep(currentStep)}
      showProgressBar={true}
      size="md"
    >
      <BookingFormContent
        currentStep={currentStep}
        formData={formData}
        isEditMode={isEditMode}
        clients={clients}
        maxQuantityThreshold={formData.maxQuantityThreshold}
        handleInputChange={handleInputChange}
        handleQuantityChange={handleQuantityChange}
        handleClientSelect={handleClientSelect}
        handleTransactionTypeChange={handleTransactionTypeChange}
      />
    </MultiStepModal>
  );
};

// Form content component
interface BookingFormContentProps {
  currentStep: number;
  formData: BookingReferenceFormData;
  isEditMode: boolean;
  clients: Client[];
  maxQuantityThreshold: number;
  handleInputChange: (field: keyof BookingReferenceFormData, value: any) => void;
  handleQuantityChange: (size: keyof ContainerQuantityBySize, value: number) => void;
  handleClientSelect: (clientId: string) => void;
  handleTransactionTypeChange: (transactionType: 'Positionnement' | 'Transfert (OUT)') => void;
}

const BookingFormContent: React.FC<BookingFormContentProps> = ({
  currentStep,
  formData,
  isEditMode,
  clients,
  handleInputChange,
  handleQuantityChange,
  handleClientSelect,
  handleTransactionTypeChange
}) => {
  const { t } = useTranslation();

  const getContainerBreakdownText = (): string => {
    const parts = [];
    if (formData.containerQuantities.size20ft > 0) {
      parts.push(`${formData.containerQuantities.size20ft} ${t('common.container')}${formData.containerQuantities.size20ft !== 1 ? 's' : ''} of 20"`);
    }
    if (formData.containerQuantities.size40ft > 0) {
      parts.push(`${formData.containerQuantities.size40ft} ${t('common.container')}${formData.containerQuantities.size40ft !== 1 ? 's' : ''} of 40"`);
    }

    if (parts.length === 0) return t('common.noContainers');

    const result = parts.join(' and ');
    return `${result} for a total of ${formData.totalContainers} ${t('common.container')}${formData.totalContainers !== 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Booking Number & Client Information */}
      {currentStep === 1 && (
        <div className="space-y-5 animate-slide-in-right">
          {/* Booking Information Section */}
          <div className="rounded-xl p-6 shadow-md bg-gray-100 dark:bg-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">{t('bookings.form.bookingInfo')}</h4>
                <p className="text-xs text-blue-700 dark:text-blue-300">{t('bookings.form.bookingDesc')}</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Booking Type */}
              <div>
                <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                  {t('bookings.form.bookingType')} *
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex-1">
                    <input
                      type="radio"
                      name="bookingType"
                      value="IMPORT"
                      checked={formData.bookingType === 'IMPORT'}
                      onChange={(e) => handleInputChange('bookingType', e.target.value)}
                      className="outline-none h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">IMPORT</span>
                    <ArrowLeft className="h-4 w-4 text-blue-500 ml-auto" />
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex-1">
                    <input
                      type="radio"
                      name="bookingType"
                      value="EXPORT"
                      checked={formData.bookingType === 'EXPORT'}
                      onChange={(e) => handleInputChange('bookingType', e.target.value)}
                      className="outline-none h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">EXPORT</span>
                    <ArrowRight className="h-4 w-4 text-blue-500 ml-auto" />
                  </label>
                </div>
              </div>

              {/* Transaction Type */}
              <div>
                <TransactionOutSwitch
                  value={formData.transactionType}
                  onChange={handleTransactionTypeChange}
                />
              </div>

              {/* Booking Reference Number */}
              <div>
                <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  {t('bookings.form.bookingNumber')} *
                </label>
                <input
                  type="text"
                  required
                  disabled={isEditMode}
                  value={formData.bookingNumber}
                  onChange={(e) => handleInputChange('bookingNumber', e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm bg-white dark:bg-gray-600 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500"
                  placeholder="e.g., ABJEXXXXXXXX"
                />
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                  {isEditMode ? t('bookings.form.refImmutable') : t('bookings.form.refHelp')}
                </p>
              </div>
            </div>
          </div>

          {/* Client Information Section */}
          <div className="rounded-xl p-6 shadow-md bg-gray-100 dark:bg-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-green-600 text-white rounded-lg">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-green-900 dark:text-green-100">{t('bookings.form.clientInfo')}</h4>
                <p className="text-xs text-green-700 dark:text-green-300">{t('bookings.form.clientDesc')}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-900 dark:text-green-100 mb-3">
                {t('bookings.form.client')} *
              </label>
              <ClientSearchField
                clients={clients}
                selectedClientId={formData.clientId}
                onClientSelect={handleClientSelect}
                placeholder={t('gate.in.form.searchClient')}
                required
              />
              {formData.clientName && (
                <div className="mt-3 p-3 bg-white dark:bg-gray-600 rounded-lg border border-green-200 dark:border-green-700 flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formData.clientName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{formData.clientCode}</p>
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
          <div className="rounded-xl p-6 shadow-md bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-600 text-white rounded-lg">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 dark:text-purple-100">{t('bookings.form.qtyControl')}</h4>
                <p className="text-xs text-purple-700 dark:text-purple-300">{t('bookings.form.qtyControlDesc')}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-purple-900 dark:text-purple-100 mb-3">
                {t('bookings.form.threshold')} *
              </label>
              <div className="flex items-center justify-center space-x-4">
                <button
                  type="button"
                  onClick={() => handleInputChange('maxQuantityThreshold', Math.max(1, formData.maxQuantityThreshold - 1))}
                  disabled={formData.maxQuantityThreshold <= 1}
                  className="w-10 h-10 flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/50 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Decrease threshold"
                >
                  <Minus className="h-5 w-5" />
                </button>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    min="1"
                    max="100"
                    value={formData.maxQuantityThreshold}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      handleInputChange('maxQuantityThreshold', Math.max(0, Math.min(100, val)));
                    }}
                    className="w-16 text-center px-2 py-2 border-2 border-purple-300 dark:border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-bold text-xl text-purple-900 dark:text-white bg-white dark:bg-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">{t('common.containers')}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleInputChange('maxQuantityThreshold', Math.min(100, formData.maxQuantityThreshold + 1))}
                  disabled={formData.maxQuantityThreshold >= 100}
                  className="w-10 h-10 flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/50 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Increase threshold"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-purple-700 dark:text-purple-300 mt-3 text-center">
                {t('bookings.form.thresholdHelp')}
              </p>
            </div>
          </div>

          {/* Container Quantities by Size */}
          <div className="rounded-xl p-6 shadow-md bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-orange-600 text-white rounded-lg">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-orange-900 dark:text-orange-100">{t('bookings.form.quantitiesTitle')}</h4>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  {t('common.total')}: <span className="font-bold">{formData.totalContainers}</span> {t('common.container')}{formData.totalContainers !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              {/* 20ft Containers */}
              <div className="bg-white dark:bg-gray-600 rounded-lg p-5 border-2 border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">{t('bookings.form.containers20')}</span>
                  </div>
                  <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">{t('common.standard')}</span>
                </div>

                <div className="flex items-center justify-center space-x-4">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange('size20ft', formData.containerQuantities.size20ft - 1)}
                    disabled={formData.containerQuantities.size20ft <= 0}
                    className="w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Decrease 20ft containers"
                  >
                    <Minus className="h-5 w-5" />
                  </button>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    max="50"
                    value={formData.containerQuantities.size20ft}
                    onChange={(e) => handleQuantityChange('size20ft', Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                    className="w-16 text-center px-2 py-2 border-2 border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-xl text-blue-900 dark:text-white bg-white dark:bg-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleQuantityChange('size20ft', formData.containerQuantities.size20ft + 1)}
                    disabled={formData.totalContainers >= formData.maxQuantityThreshold}
                    className="w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Increase 20ft containers"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* 40ft Containers */}
              <div className="bg-white dark:bg-gray-600 rounded-lg p-5 border-2 border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-500 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">{t('bookings.form.containers40')}</span>
                  </div>
                  <span className="text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-2 py-1 rounded">{t('common.highCapacity')}</span>
                </div>

                <div className="flex items-center justify-center space-x-4">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange('size40ft', formData.containerQuantities.size40ft - 1)}
                    disabled={formData.containerQuantities.size40ft <= 0}
                    className="w-10 h-10 flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/50 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Decrease 40ft containers"
                  >
                    <Minus className="h-5 w-5" />
                  </button>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    max="50"
                    value={formData.containerQuantities.size40ft}
                    onChange={(e) => handleQuantityChange('size40ft', Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                    className="w-16 text-center px-2 py-2 border-2 border-green-300 dark:border-green-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-bold text-xl text-green-900 dark:text-white bg-white dark:bg-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleQuantityChange('size40ft', formData.containerQuantities.size40ft + 1)}
                    disabled={formData.totalContainers >= formData.maxQuantityThreshold}
                    className="w-10 h-10 flex items-center justify-center bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/50 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Increase 40ft containers"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Container Summary */}
            {formData.totalContainers > 0 && (
              <div className="space-y-3">
                <div className="p-4 bg-white dark:bg-gray-600 rounded-lg border-2 border-orange-300 dark:border-orange-700">
                  <h5 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">{t('common.summary')}</h5>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {getContainerBreakdownText()}
                  </p>
                </div>

                {formData.requiresDetailedBreakdown && (
                  <div className="flex items-start p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-orange-900 dark:text-orange-300">{t('bookings.breakdown.required')}</p>
                      <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                        {t('bookings.breakdown.help')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="rounded-xl p-6 bg-gradient-to-br from-gray-50 dark:from-gray-700 to-slate-50 dark:to-slate-700 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gray-600 text-white rounded-lg">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">{t('gate.in.form.notes')}</h4>
            </div>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none text-sm dark:bg-gray-600 dark:text-white"
              rows={3}
              placeholder="Add any additional notes or special instructions..."
            />
          </div>
        </div>
      )}
    </div>
  );
};
