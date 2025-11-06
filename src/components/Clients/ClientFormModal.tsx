import React, { useState, useEffect } from 'react';
import { Building, Mail, Phone, MapPin, Calendar, DollarSign, Clock, User, FileText, Calculator } from 'lucide-react';
import { Client } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { MultiStepModal } from '../Common/Modal/MultiStepModal';
import { LoadingOverlay } from '../Common/Modal/components/LoadingOverlay';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClient?: Client | null;
  onSubmit: (clientData: any) => Promise<void>;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  selectedClient,
  onSubmit
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Côte d\'Ivoire'
    },
    contactPerson: {
      name: '',
      email: '',
      phone: '',
      position: ''
    },
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Côte d\'Ivoire'
    },
    taxId: '',
    paymentTerms: 30,
    freeDaysAllowed: 3,
    dailyStorageRate: 15000,
    currency: 'FCFA',
    isActive: true,
    notes: ''
  });

  const [useSameAddress, setUseSameAddress] = useState(true);

  // Initialize form data when editing
  useEffect(() => {
    if (selectedClient) {
      setIsLoading(true);
      // Simulate loading client data
      setTimeout(() => {
        setFormData({
          name: selectedClient.name,
          code: selectedClient.code,
          email: selectedClient.email,
          phone: selectedClient.phone,
          address: selectedClient.address,
          contactPerson: selectedClient.contactPerson,
          billingAddress: selectedClient.billingAddress || selectedClient.address,
          taxId: selectedClient.taxId || '',
          paymentTerms: selectedClient.paymentTerms,
          freeDaysAllowed: selectedClient.freeDaysAllowed,
          dailyStorageRate: selectedClient.dailyStorageRate,
          currency: selectedClient.currency,
          isActive: selectedClient.isActive,
          notes: selectedClient.notes || ''
        });
        setIsLoading(false);
      }, 500);
    } else {
      setIsLoading(false);
    }
  }, [selectedClient]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    triggerAutoSave();
  };

  const handleNestedInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev] as any,
        [field]: value
      }
    }));
    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    // Auto-save functionality handled by MultiStepModal
  };

  const validateStep = (step: number): boolean => {
    const errors: string[] = [];

    switch (step) {
      case 1:
        if (!formData.name) errors.push('Nom de l\'entreprise requis');
        if (!formData.code) errors.push('Code client requis');
        if (!formData.email) errors.push('Email principal requis');
        if (!formData.phone) errors.push('Téléphone principal requis');
        break;
      case 2:
        if (!formData.address.street) errors.push('Adresse complète requise');
        if (!formData.address.city) errors.push('Ville requise');
        if (!formData.contactPerson.name) errors.push('Nom de contact requis');
        if (!formData.contactPerson.email) errors.push('Email de contact requis');
        break;
      case 3:
        if (formData.paymentTerms <= 0) errors.push('Conditions de paiement invalides');
        if (formData.freeDaysAllowed < 0) errors.push('Jours gratuits invalides');
        if (formData.dailyStorageRate <= 0) errors.push('Tarif journalier invalide');
        break;
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      throw new Error('Validation failed');
    }

    setIsSubmitting(true);
    try {
      const clientData = {
        ...formData,
        billingAddress: useSameAddress ? formData.address : formData.billingAddress,
        createdBy: user?.name || 'System',
        updatedBy: user?.name || 'System'
      };

      await onSubmit(clientData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 3) {
      // On the last step, submit the form
      handleSubmit();
    } else {
      // Otherwise, go to next step
      setCurrentStep(prev => Math.min(3, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount);
  };

  // Validate current step when data changes
  useEffect(() => {
    validateStep(currentStep);
  }, [currentStep]); // Remove formData from dependencies to prevent infinite loop

  return (
    <MultiStepModal
      isOpen={isOpen}
      onClose={onClose}
      title={selectedClient ? 'Modifier Client' : 'Nouveau Client'}
      subtitle={selectedClient ? `Modification du client ${selectedClient.name}` : 'Création d\'un nouveau client'}
      icon={Building}
      size="xl"
      currentStep={currentStep}
      totalSteps={3}
      stepLabels={['Informations de base', 'Adresse & Contact', 'Configuration']}
      onNextStep={handleNextStep}
      onPrevStep={handlePrevStep}
      isStepValid={validateStep(currentStep)}
    >
      {/* Loading Overlay */}
      <LoadingOverlay
        isLoading={isLoading}
        message={selectedClient ? 'Chargement des données client...' : 'Initialisation du formulaire...'}
        overlay={true}
      />

      {!isLoading && (
        <div className="space-y-8">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center mb-6">
                <div className="p-2 bg-blue-600/10 text-blue-600 rounded-xl mr-3">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xl font-semibold tracking-tight text-gray-900">Informations de Base</h4>
                  <p className="text-sm text-gray-600">Informations principales de l'entreprise cliente</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l'Entreprise *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`form-input w-full ${validationErrors.includes('Nom de l\'entreprise requis') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                    placeholder="Ex: Maersk Line Côte d'Ivoire"
                  />
                  {validationErrors.includes('Nom de l\'entreprise requis') && (
                    <p className="mt-1 text-sm text-red-600">Nom de l'entreprise requis</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code Client *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    className={`form-input w-full ${validationErrors.includes('Code client requis') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                    placeholder="Ex: MAEU, MSCU, CMDU"
                    maxLength={10}
                  />
                  {validationErrors.includes('Code client requis') && (
                    <p className="mt-1 text-sm text-red-600">Code client requis</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Principal *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`form-input w-full pl-12 ${validationErrors.includes('Email principal requis') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                      placeholder="contact@entreprise.ci"
                    />
                  </div>
                  {validationErrors.includes('Email principal requis') && (
                    <p className="mt-1 text-sm text-red-600">Email principal requis</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone Principal *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`form-input w-full pl-12 ${validationErrors.includes('Téléphone principal requis') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                      placeholder="+225 XX XX XX XX XX"
                    />
                  </div>
                  {validationErrors.includes('Téléphone principal requis') && (
                    <p className="mt-1 text-sm text-red-600">Téléphone principal requis</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro d'Identification Fiscale
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => handleInputChange('taxId', e.target.value)}
                      className="form-input w-full pl-12"
                      placeholder="CI-XXXXXXXXX"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Address & Contact */}
          {currentStep === 2 && (
            <div className="space-y-8">
              {/* Address Information */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-green-600/10 text-green-600 rounded-xl mr-3">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold tracking-tight text-gray-900">Adresse de l'Entreprise</h4>
                    <p className="text-sm text-gray-600">Localisation et coordonnées de l'entreprise</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse Complète *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address.street}
                      onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
                      className={`form-input w-full ${validationErrors.includes('Adresse complète requise') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                      placeholder="Ex: Rue du Commerce, Zone Portuaire"
                    />
                    {validationErrors.includes('Adresse complète requise') && (
                      <p className="mt-1 text-sm text-red-600">Adresse complète requise</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ville *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address.city}
                      onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
                      className={`form-input w-full ${validationErrors.includes('Ville requise') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                      placeholder="Ex: Abidjan, San-Pédro"
                    />
                    {validationErrors.includes('Ville requise') && (
                      <p className="mt-1 text-sm text-red-600">Ville requise</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commune/District *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address.state}
                      onChange={(e) => handleNestedInputChange('address', 'state', e.target.value)}
                      className="form-input w-full"
                      placeholder="Ex: Plateau, Treichville, Koumassi"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Code Postal
                    </label>
                    <input
                      type="text"
                      value={formData.address.zipCode}
                      onChange={(e) => handleNestedInputChange('address', 'zipCode', e.target.value)}
                      className="form-input w-full"
                      placeholder="Ex: 01 BP 1234"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pays
                    </label>
                    <input
                      type="text"
                      value="Côte d'Ivoire"
                      readOnly
                      disabled
                      className="form-input w-full bg-gray-100 text-gray-600"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Person */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-purple-600/10 text-purple-600 rounded-xl mr-3">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold tracking-tight text-gray-900">Personne de Contact</h4>
                    <p className="text-sm text-gray-600">Responsable principal pour les communications</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom Complet *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contactPerson.name}
                      onChange={(e) => handleNestedInputChange('contactPerson', 'name', e.target.value)}
                      className={`form-input w-full ${validationErrors.includes('Nom de contact requis') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                      placeholder="Ex: Jean-Baptiste Kouassi"
                    />
                    {validationErrors.includes('Nom de contact requis') && (
                      <p className="mt-1 text-sm text-red-600">Nom de contact requis</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Poste/Fonction *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contactPerson.position}
                      onChange={(e) => handleNestedInputChange('contactPerson', 'position', e.target.value)}
                      className="form-input w-full"
                      placeholder="Ex: Directeur des Opérations"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email de Contact *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 h-5 w-5" />
                      <input
                        type="email"
                        required
                        value={formData.contactPerson.email}
                        onChange={(e) => handleNestedInputChange('contactPerson', 'email', e.target.value)}
                        className={`form-input w-full pl-12 ${validationErrors.includes('Email de contact requis') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                        placeholder="jean.kouassi@entreprise.ci"
                      />
                    </div>
                    {validationErrors.includes('Email de contact requis') && (
                      <p className="mt-1 text-sm text-red-600">Email de contact requis</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone de Contact *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 h-5 w-5" />
                      <input
                        type="tel"
                        required
                        value={formData.contactPerson.phone}
                        onChange={(e) => handleNestedInputChange('contactPerson', 'phone', e.target.value)}
                        className="form-input w-full pl-12"
                        placeholder="+225 XX XX XX XX XX"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing Address Option */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-600/10 text-orange-600 rounded-xl mr-3">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold tracking-tight text-gray-900">Adresse de Facturation</h4>
                      <p className="text-sm text-gray-600">Adresse pour l'envoi des factures</p>
                    </div>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSameAddress}
                      onChange={(e) => setUseSameAddress(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Même adresse que l'entreprise</span>
                  </label>
                </div>

                {!useSameAddress && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Adresse de Facturation
                      </label>
                      <input
                        type="text"
                        value={formData.billingAddress.street}
                        onChange={(e) => handleNestedInputChange('billingAddress', 'street', e.target.value)}
                        className="form-input w-full"
                        placeholder="Adresse différente pour la facturation"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={formData.billingAddress.city}
                        onChange={(e) => handleNestedInputChange('billingAddress', 'city', e.target.value)}
                        className="form-input w-full"
                        placeholder="Ville de facturation"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Commune/District
                      </label>
                      <input
                        type="text"
                        value={formData.billingAddress.state}
                        onChange={(e) => handleNestedInputChange('billingAddress', 'state', e.target.value)}
                        className="form-input w-full"
                        placeholder="Commune de facturation"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Configuration */}
          {currentStep === 3 && (
            <div className="space-y-8">
              {/* Financial Configuration */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-green-600/10 text-green-600 rounded-xl mr-3">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold tracking-tight text-gray-900">Configuration Financière</h4>
                    <p className="text-sm text-gray-600">Paramètres de facturation et conditions de paiement</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Conditions de Paiement (jours) *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500 h-5 w-5" />
                      <input
                        type="number"
                        required
                        min="1"
                        max="90"
                        value={formData.paymentTerms}
                        onChange={(e) => handleInputChange('paymentTerms', parseInt(e.target.value))}
                        className={`form-input w-full pl-12 ${validationErrors.includes('Conditions de paiement invalides') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                        placeholder="30"
                      />
                    </div>
                    {validationErrors.includes('Conditions de paiement invalides') && (
                      <p className="mt-1 text-sm text-red-600">Conditions de paiement invalides</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">Délai de paiement accordé au client</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jours de Stockage Gratuits *
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500 h-5 w-5" />
                      <input
                        type="number"
                        required
                        min="0"
                        max="30"
                        value={formData.freeDaysAllowed}
                        onChange={(e) => handleInputChange('freeDaysAllowed', parseInt(e.target.value))}
                        className={`form-input w-full pl-12 ${validationErrors.includes('Jours gratuits invalides') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                        placeholder="3"
                      />
                    </div>
                    {validationErrors.includes('Jours gratuits invalides') && (
                      <p className="mt-1 text-sm text-red-600">Jours gratuits invalides</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">Nombre de jours gratuits avant facturation</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tarif Journalier (FCFA) *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-500 h-5 w-5" />
                      <input
                        type="number"
                        required
                        min="1000"
                        step="500"
                        value={formData.dailyStorageRate}
                        onChange={(e) => handleInputChange('dailyStorageRate', parseInt(e.target.value))}
                        className={`form-input w-full pl-12 ${validationErrors.includes('Tarif journalier invalide') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                        placeholder="15000"
                      />
                    </div>
                    {validationErrors.includes('Tarif journalier invalide') && (
                      <p className="mt-1 text-sm text-red-600">Tarif journalier invalide</p>
                    )}
                    <p className="text-xs text-gray-600 mt-1">
                      Coût par jour après les jours gratuits: {formatCurrency(formData.dailyStorageRate)} FCFA
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Devise
                    </label>
                    <input
                      type="text"
                      value="FCFA"
                      readOnly
                      disabled
                      className="form-input w-full bg-gray-100 text-gray-600"
                    />
                  </div>
                </div>
              </div>

              {/* Billing Preview */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-blue-600/10 text-blue-600 rounded-xl mr-3">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold tracking-tight text-gray-900">Aperçu de la Facturation</h4>
                    <p className="text-sm text-gray-600">Simulation des coûts de stockage</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{formData.freeDaysAllowed}</div>
                      <div className="text-green-700">Jours Gratuits</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{formatCurrency(formData.dailyStorageRate)}</div>
                      <div className="text-blue-700">FCFA/Jour</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{formData.paymentTerms}</div>
                      <div className="text-purple-700">Jours de Paiement</div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-white rounded-lg">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div><strong>Exemple de calcul:</strong></div>
                      <div>• Conteneur placé pendant 10 jours</div>
                      <div>• Jours gratuits: {formData.freeDaysAllowed} jours</div>
                      <div>• Jours facturables: 10 - {formData.freeDaysAllowed} = {Math.max(0, 10 - formData.freeDaysAllowed)} jours</div>
                      <div>• <strong>Montant total: {formatCurrency(Math.max(0, 10 - formData.freeDaysAllowed) * formData.dailyStorageRate)} FCFA</strong></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-gray-600/10 text-gray-600 rounded-xl mr-3">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold tracking-tight text-gray-900">Notes et Instructions Spéciales</h4>
                    <p className="text-sm text-gray-600">Informations complémentaires et instructions particulières</p>
                  </div>
                </div>

                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className="form-input w-full resize-none"
                  placeholder="Instructions spéciales, exigences de manutention, ou autres notes importantes..."
                />
              </div>

              {/* Status */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-900">
                  Client Actif
                </label>
              </div>
            </div>
          )}
        </div>
      )}
    </MultiStepModal>
  );
};
