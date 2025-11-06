import React, { useState, useEffect, useRef } from 'react';
import {
    Building,
    MapPin,
    User,
    Phone,
    Mail,
    ChevronDown
} from 'lucide-react';
import { Yard } from '../../../types';
import { useDepotForm } from './useDepotForm';
import { MultiStepModal } from '../../Common/Modal/MultiStepModal';
import { createPhoneChangeHandler } from '../../../utils/phoneUtils';

interface DepotFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    selectedDepot: Yard | null;
    isLoading?: boolean;
}

export const DepotFormModal: React.FC<DepotFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    selectedDepot,
    isLoading = false
}) => {
    // Remove unused user import
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const prevIsOpenRef = useRef(isOpen); // Keep track of previous isOpen state

    const {
        formData,
        errors,
        validateForm,
        validateStep,
        handleInputChange,
        getFormDataForSubmission
    } = useDepotForm(selectedDepot, isOpen);

    useEffect(() => {
        console.log('DepotFormModal: useEffect for Escape key setup');
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                console.log('DepotFormModal: Escape key pressed, calling onClose');
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscapeKey);
        return () => {
            console.log('DepotFormModal: Cleaning up Escape key listener');
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [onClose]);

    useEffect(() => {
        console.log('DepotFormModal: useEffect for isOpen triggered. isOpen:', isOpen, 'prevIsOpen:', prevIsOpenRef.current);
        // Reset state only when modal is truly opening (isOpen changes from false to true)
        if (isOpen && !prevIsOpenRef.current) {
            setCurrentStep(1);
            console.log('DepotFormModal: State reset for new modal open');
        }
        prevIsOpenRef.current = isOpen; // Update the ref for the next render
    }, [isOpen]);

    const handlePhoneChange = createPhoneChangeHandler(handleInputChange, 'contactPhone');

    const handleNextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(2, prev + 1));
        }
    };

    const handlePrevStep = () => {
        setCurrentStep(prev => Math.max(1, prev - 1));
    };

    const handleFinish = async () => {
        console.log('DepotFormModal: handleFinish called');

        if (!validateForm()) {
            console.log('DepotFormModal: Form validation failed');
            throw new Error('Please fix the validation errors before submitting.');
        }

        setIsSubmitting(true);
        try {
            console.log('DepotFormModal: Form validation successful, attempting submission');
            const depotData = getFormDataForSubmission();
            console.log('DepotFormModal: Submitting data:', depotData);
            await onSubmit(depotData);
            console.log('DepotFormModal: onSubmit successful');
            // MultiStepModal will handle success notification and modal closing
        } catch (error) {
            console.error('DepotFormModal: onSubmit failed:', error);
            setIsSubmitting(false);
            throw error; // Re-throw to let MultiStepModal handle error display
        } finally {
            setIsSubmitting(false);
        }
    };

    // Check if current step is valid
    const isCurrentStepValid = validateStep(currentStep);

    return (
        <MultiStepModal
            isOpen={isOpen}
            onClose={onClose}
            title={selectedDepot ? 'Modifier le dépôt' : 'Créer un dépôt'}
            subtitle="Configuration du dépôt de conteneurs"
            icon={Building}
            currentStep={currentStep}
            totalSteps={2}
            stepLabels={['Informations', 'Contact & Adresse']}
            onNextStep={currentStep === 2 ? handleFinish : handleNextStep}
            onPrevStep={handlePrevStep}
            isStepValid={isCurrentStepValid}
            showProgressBar={true}
            size="xl"
        >
            <DepotFormContent
                currentStep={currentStep}
                formData={formData}
                errors={errors}
                handleInputChange={handleInputChange}
                handlePhoneChange={handlePhoneChange}
                selectedDepot={selectedDepot}
                isLoading={isLoading || isSubmitting}
            />
        </MultiStepModal>
    );
};

// Extract form content into separate component for better organization
interface DepotFormContentProps {
    currentStep: number;
    formData: any;
    errors: any;
    handleInputChange: (field: any, value: any) => void;
    handlePhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    selectedDepot: Yard | null;
    isLoading: boolean;
}

const DepotFormContent: React.FC<DepotFormContentProps> = ({
    currentStep,
    formData,
    errors,
    handleInputChange,
    handlePhoneChange
}) => {
    return (
        <div className="space-y-8">

            {/* Step 1 */}
            {currentStep === 1 && (
                <div className="depot-step-spacing">
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition">
                        <h4 className="font-semibold text-gray-800 mb-5 flex items-center">
                            <Building className="h-5 w-5 mr-2 text-blue-500" />
                            Informations de base
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="label">Nom du dépôt *</label>
                                <input
                                    value={formData.name}
                                    onChange={(e) => handleInputChange('name', e.target.value)}
                                    className={`input ${errors.name ? 'border-red-400 focus:ring-red-500' : ''}`}
                                    placeholder="Ex: Dépôt Yopougon"
                                />
                                {errors.name && <p className="error-text">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="label">Code *</label>
                                <input
                                    value={formData.code}
                                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                                    className={`input ${errors.code ? 'border-red-400 focus:ring-red-500' : ''}`}
                                    placeholder="DEPOT-01"
                                    maxLength={10}
                                />
                                {errors.code && <p className="error-text">{errors.code}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <label className="label">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => handleInputChange('description', e.target.value)}
                                    className="input resize-none h-24"
                                    placeholder="Description du dépôt..."
                                />
                            </div>

                            <div>
                                <label className="label">Localisation *</label>
                                <div className="relative">
                                    <MapPin className="input-icon text-blue-500" />
                                    <input
                                        value={formData.location}
                                        onChange={(e) => handleInputChange('location', e.target.value)}
                                        className={`input pl-10 ${errors.location ? 'border-red-400' : ''}`}
                                        placeholder="Abidjan, Zone Portuaire"
                                    />
                                </div>
                                {errors.location && <p className="error-text">{errors.location}</p>}
                            </div>

                            <div>
                                <label className="label">Type de Layout</label>
                                <div className="relative">
                                    <select
                                        value={formData.layout}
                                        onChange={(e) => handleInputChange('layout', e.target.value)}
                                        className="input appearance-none pr-10"
                                    >
                                        <option value="yirima">Yirima</option>
                                        <option value="tantarelli">Tantarelli</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                            </div>

                            <div>
                                <label className="label">Statut</label>
                                <div className="depot-toggle-container">
                                    <span className={`depot-toggle-label ${!formData.isActive ? 'inactive' : 'active'}`}>
                                        Inactif
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleInputChange('isActive', !formData.isActive)}
                                        className={`depot-toggle ${formData.isActive ? 'active' : 'inactive'}`}
                                    >
                                        <span
                                            className={`depot-toggle-thumb ${formData.isActive ? 'active' : 'inactive'}`}
                                        />
                                    </button>
                                    <span className={`depot-toggle-label ${formData.isActive ? 'active' : 'inactive'}`}>
                                        Actif
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2 */}
            {currentStep === 2 && (
                <div className="depot-step-spacing">
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition">
                        <h4 className="font-semibold text-gray-800 mb-5 flex items-center">
                            <User className="h-5 w-5 mr-2 text-green-500" />
                            Contact & Adresse
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="label">Nom du Responsable</label>
                                <input
                                    value={formData.contactManager}
                                    onChange={(e) => handleInputChange('contactManager', e.target.value)}
                                    className="input"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="label">Téléphone</label>
                                <div className="relative">
                                    <Phone className="input-icon text-green-500" />
                                    <input
                                        value={formData.contactPhone}
                                        onChange={handlePhoneChange}
                                        className="input pl-10"
                                        placeholder="+225 07 XX XX XX"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="label">Email</label>
                                <div className="relative">
                                    <Mail className="input-icon text-green-500" />
                                    <input
                                        value={formData.contactEmail}
                                        onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                                        className={`input pl-10 ${errors.contactEmail ? 'border-red-400' : ''}`}
                                        placeholder="manager@depot.ci"
                                    />
                                </div>
                                {errors.contactEmail && <p className="error-text">{errors.contactEmail}</p>}
                            </div>

                            <div className="depot-field-separator">
                                <label className="label">Adresse</label>
                                <input
                                    value={formData.addressStreet}
                                    onChange={(e) => handleInputChange('addressStreet', e.target.value)}
                                    className="input"
                                    placeholder="Numéro et nom de rue"
                                />
                            </div>

                            <div>
                                <label className="label">Ville</label>
                                <input
                                    value={formData.addressCity}
                                    onChange={(e) => handleInputChange('addressCity', e.target.value)}
                                    className="input"
                                    placeholder="Abidjan"
                                />
                            </div>

                            <div>
                                <label className="label">Région/État</label>
                                <input
                                    value={formData.addressState}
                                    onChange={(e) => handleInputChange('addressState', e.target.value)}
                                    className="input"
                                    placeholder="Abidjan"
                                />
                            </div>

                            <div>
                                <label className="label">Code postal</label>
                                <input
                                    value={formData.addressZipCode}
                                    onChange={(e) => handleInputChange('addressZipCode', e.target.value)}
                                    className="input"
                                    placeholder="00225"
                                />
                            </div>

                            <div>
                                <label className="label">Pays</label>
                                <input
                                    value={formData.addressCountry}
                                    onChange={(e) => handleInputChange('addressCountry', e.target.value)}
                                    className="input"
                                    placeholder="Côte d'Ivoire"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
