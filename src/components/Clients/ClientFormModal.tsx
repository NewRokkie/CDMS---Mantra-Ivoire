import React, { useState, useEffect } from 'react';
import { X, Save, Loader, Building, Mail, Phone, MapPin, Calendar, DollarSign, Clock, User, FileText, Calculator } from 'lucide-react';
import { Client } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClient?: Client | null;
  onSubmit: (clientData: any) => void;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  selectedClient,
  onSubmit
}) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

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
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.name && !!formData.code && !!formData.email && !!formData.phone;
      case 2:
        return !!formData.address.street && !!formData.address.city &&
               !!formData.contactPerson.name && !!formData.contactPerson.email;
      case 3:
        return formData.paymentTerms > 0 && formData.freeDaysAllowed >= 0 && formData.dailyStorageRate > 0;
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

    if (!validateStep(currentStep)) return;

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const clientData = {
        ...formData,
        billingAddress: useSameAddress ? formData.address : formData.billingAddress,
        createdBy: user?.name || 'System',
        updatedBy: user?.name || 'System'
      };

      onSubmit(clientData);
    } catch (error) {
      alert('Error saving client: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-strong animate-slide-in-up max-h-[90vh] overflow-hidden flex flex-col">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedClient ? 'Modifier Client' : 'Nouveau Client'}
                </h3>
                <p className="text-xs text-gray-600">Étape {currentStep} sur 3</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {autoSaving && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Sauvegarde...</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="relative">
              <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200 z-0"></div>
              <div
                className="absolute top-3 left-0 h-0.5 bg-blue-600 z-10 transition-all duration-300"
                style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
              ></div>

              <div className="flex justify-between relative z-20">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                      step <= currentStep
                        ? 'bg-blue-600 text-white border border-blue-600'
                        : 'bg-white text-gray-500 border border-gray-300'
                    }`}>
                      {step}
                    </div>
                    <span className={`mt-1.5 text-xs font-medium transition-colors duration-300 ${
                      step <= currentStep ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step === 1 && 'Informations de base'}
                      {step === 2 && 'Adresse & Contact'}
                      {step === 3 && 'Configuration'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-slide-in-right">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-6 flex items-center">
                    <Building className="h-5 w-5 mr-2" />
                    Informations de Base
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Nom de l'Entreprise *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="form-input w-full"
                        placeholder="Ex: Maersk Line Côte d'Ivoire"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Code Client *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                        className="form-input w-full"
                        placeholder="Ex: MAEU, MSCU, CMDU"
                        maxLength={10}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Email Principal *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="form-input w-full pl-12"
                          placeholder="contact@entreprise.ci"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Téléphone Principal *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="form-input w-full pl-12"
                          placeholder="+225 XX XX XX XX XX"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
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
              </div>
            )}

            {/* Step 2: Address & Contact */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-slide-in-right">

                {/* Address Information */}
                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-6 flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Adresse de l'Entreprise
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        Adresse Complète *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.address.street}
                        onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
                        className="form-input w-full"
                        placeholder="Ex: Rue du Commerce, Zone Portuaire"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
                        Ville *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.address.city}
                        onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
                        className="form-input w-full"
                        placeholder="Ex: Abidjan, San-Pédro"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
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
                      <label className="block text-sm font-medium text-green-800 mb-2">
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
                      <label className="block text-sm font-medium text-green-800 mb-2">
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
                <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-6 flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Personne de Contact
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-2">
                        Nom Complet *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.contactPerson.name}
                        onChange={(e) => handleNestedInputChange('contactPerson', 'name', e.target.value)}
                        className="form-input w-full"
                        placeholder="Ex: Jean-Baptiste Kouassi"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-2">
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
                      <label className="block text-sm font-medium text-purple-800 mb-2">
                        Email de Contact *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-500 h-5 w-5" />
                        <input
                          type="email"
                          required
                          value={formData.contactPerson.email}
                          onChange={(e) => handleNestedInputChange('contactPerson', 'email', e.target.value)}
                          className="form-input w-full pl-12"
                          placeholder="jean.kouassi@entreprise.ci"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-purple-800 mb-2">
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
                <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-orange-900 flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Adresse de Facturation
                    </h4>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSameAddress}
                        onChange={(e) => setUseSameAddress(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-orange-800">Même adresse que l'entreprise</span>
                    </label>
                  </div>

                  {!useSameAddress && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-orange-800 mb-2">
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
                        <label className="block text-sm font-medium text-orange-800 mb-2">
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
                        <label className="block text-sm font-medium text-orange-800 mb-2">
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
              <div className="space-y-6 animate-slide-in-right">

                {/* Financial Configuration */}
                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-6 flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Configuration Financière
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
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
                          className="form-input w-full pl-12"
                          placeholder="30"
                        />
                      </div>
                      <p className="text-xs text-green-600 mt-1">Délai de paiement accordé au client</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
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
                          className="form-input w-full pl-12"
                          placeholder="3"
                        />
                      </div>
                      <p className="text-xs text-green-600 mt-1">Nombre de jours gratuits avant facturation</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
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
                          className="form-input w-full pl-12"
                          placeholder="15000"
                        />
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        Coût par jour après les jours gratuits: {formatCurrency(formData.dailyStorageRate)} FCFA
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-green-800 mb-2">
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
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    Aperçu de la Facturation
                  </h4>

                  <div className="bg-white p-4 rounded-lg border border-blue-200">
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

                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
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
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Notes et Instructions Spéciales
                  </h4>

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
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="btn-secondary"
                >
                  Précédent
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Annuler
              </button>

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!validateStep(currentStep)}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={isLoading || !validateStep(currentStep)}
                  className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>{selectedClient ? 'Mise à jour...' : 'Création...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{selectedClient ? 'Mettre à Jour' : 'Créer Client'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
