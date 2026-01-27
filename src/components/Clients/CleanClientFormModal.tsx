import React, { useState, useEffect } from 'react';
import { X, Building, User, Mail, Phone, MapPin, CreditCard, FileText, Check } from 'lucide-react';
import { Client } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (client: any) => Promise<void>;
  selectedClient?: Client | null;
}

export const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedClient
}) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
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
    taxId: '',
    currency: 'FCFA',
    isActive: true,
    notes: ''
  });

  // Initialize form data when editing
  useEffect(() => {
    if (selectedClient) {
      setFormData({
        code: selectedClient.code,
        name: selectedClient.name,
        address: selectedClient.address,
        contactPerson: selectedClient.contactPerson,
        taxId: selectedClient.taxId || '',
        currency: selectedClient.currency,
        isActive: selectedClient.isActive,
        notes: selectedClient.notes || ''
      });
    }
  }, [selectedClient]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation errors when user starts typing
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { 
        ...(prev[parent as keyof typeof prev] as Record<string, any>), 
        [field]: value 
      }
    }));
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const validateStep = (step: number): string[] => {
    const errors: string[] = [];
    
    switch (step) {
      case 1:
        if (!formData.code.trim()) errors.push('Code client requis');
        if (!formData.name.trim()) errors.push('Nom du client requis');
        break;
      case 2:
        if (!formData.address.street.trim()) errors.push('Adresse requise');
        if (!formData.address.city.trim()) errors.push('Ville requise');
        if (!formData.contactPerson.name.trim()) errors.push('Nom du contact requis');
        if (!formData.contactPerson.email.trim()) errors.push('Email du contact requis');
        break;
      case 3:
        // No additional validations needed
        break;
    }
    
    return errors;
  };

  const handleNext = () => {
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      const clientData = {
        ...formData,
        createdBy: user?.name || 'System',
        updatedBy: user?.name || 'System'
      };
      
      await onSubmit(clientData);
      onClose();
      
      // Reset form
      setFormData({
        code: '',
        name: '',
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
        taxId: '',
        currency: 'FCFA',
        isActive: true,
        notes: ''
      });
      setCurrentStep(1);
      setValidationErrors([]);
    } catch (error) {
      console.error('Error submitting client:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const steps = [
    { number: 1, title: 'Informations de base', icon: Building },
    { number: 2, title: 'Adresse & Contact', icon: MapPin },
    { number: 3, title: 'Finalisation', icon: Check }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600 text-white rounded-xl">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedClient ? 'Modifier le Client' : 'Nouveau Client'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {steps.find(s => s.number === currentStep)?.title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mt-6 space-x-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center space-x-3 ${
                    isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      isActive ? 'border-blue-600 bg-blue-50' : 
                      isCompleted ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-gray-50'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-medium text-sm">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 mb-2">Veuillez corriger les erreurs suivantes :</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center mb-4">
                  <Building className="h-5 w-5 text-blue-600 mr-2" />
                  <h4 className="text-lg font-semibold text-gray-900">Informations de base</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Code Client *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                      className={`form-input w-full ${validationErrors.includes('Code client requis') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                      placeholder="Ex: MAEU, MSCU"
                      disabled={!!selectedClient}
                    />
                    <p className="text-xs text-gray-600 mt-1">Code unique pour identifier le client</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du Client *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`form-input w-full ${validationErrors.includes('Nom du client requis') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                      placeholder="Nom complet de l'entreprise"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro d'identification fiscale
                    </label>
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => handleInputChange('taxId', e.target.value)}
                      className="form-input w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Numéro fiscal ou d'enregistrement"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Address & Contact */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Address Information */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center mb-4">
                  <MapPin className="h-5 w-5 text-green-600 mr-2" />
                  <h4 className="text-lg font-semibold text-gray-900">Adresse</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse *
                    </label>
                    <input
                      type="text"
                      value={formData.address.street}
                      onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
                      className={`form-input w-full ${validationErrors.includes('Adresse requise') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                      placeholder="Adresse complète"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ville *
                    </label>
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
                      className={`form-input w-full ${validationErrors.includes('Ville requise') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                      placeholder="Ville"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commune/État
                    </label>
                    <input
                      type="text"
                      value={formData.address.state}
                      onChange={(e) => handleNestedInputChange('address', 'state', e.target.value)}
                      className="form-input w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Commune ou État"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Person */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center mb-4">
                  <User className="h-5 w-5 text-purple-600 mr-2" />
                  <h4 className="text-lg font-semibold text-gray-900">Personne de Contact</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du Contact *
                    </label>
                    <input
                      type="text"
                      value={formData.contactPerson.name}
                      onChange={(e) => handleNestedInputChange('contactPerson', 'name', e.target.value)}
                      className={`form-input w-full ${validationErrors.includes('Nom du contact requis') ? 'border-red-400 focus:border-red-500 focus:ring-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                      placeholder="Nom complet"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Poste
                    </label>
                    <input
                      type="text"
                      value={formData.contactPerson.position}
                      onChange={(e) => handleNestedInputChange('contactPerson', 'position', e.target.value)}
                      className="form-input w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Fonction ou poste"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.contactPerson.email}
                      onChange={(e) => handleNestedInputChange('contactPerson', 'email', e.target.value)}
                      className={`form-input w-full ${validationErrors.includes('Email du contact requis') ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'}`}
                      placeholder="email@exemple.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={formData.contactPerson.phone}
                      onChange={(e) => handleNestedInputChange('contactPerson', 'phone', e.target.value)}
                      className="form-input w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="+225 XX XX XX XX"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Finalization */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center mb-4">
                  <FileText className="h-5 w-5 text-indigo-600 mr-2" />
                  <h4 className="text-lg font-semibold text-gray-900">Informations Complémentaires</h4>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Devise
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="form-select w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="FCFA">FCFA (Franc CFA)</option>
                      <option value="USD">USD (Dollar américain)</option>
                      <option value="EUR">EUR (Euro)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={4}
                      className="form-textarea w-full border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Notes ou commentaires supplémentaires..."
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => handleInputChange('isActive', e.target.checked)}
                      className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                      Client actif
                    </label>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <h4 className="text-lg font-semibold text-blue-900 mb-4">Résumé</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Code:</span>
                    <span className="ml-2 text-blue-700">{formData.code}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Nom:</span>
                    <span className="ml-2 text-blue-700">{formData.name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Contact:</span>
                    <span className="ml-2 text-blue-700">{formData.contactPerson.name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800">Email:</span>
                    <span className="ml-2 text-blue-700">{formData.contactPerson.email}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Étape {currentStep} sur {steps.length}
            </div>
            <div className="flex items-center space-x-3">
              {currentStep > 1 && (
                <button
                  onClick={handlePrevious}
                  className="btn-secondary"
                  disabled={isSubmitting}
                >
                  Précédent
                </button>
              )}
              {currentStep < steps.length ? (
                <button
                  onClick={handleNext}
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  Suivant
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Enregistrement...' : selectedClient ? 'Mettre à jour' : 'Créer le Client'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};