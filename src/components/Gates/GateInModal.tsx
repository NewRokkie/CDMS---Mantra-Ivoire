import React from 'react';
import { Package, Truck, Calendar, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { GateInModalProps, GateInFormData } from './types';
import { ClientSearchField } from '../Common/ClientSearchField';
import { TimePicker } from '../Common/TimePicker';
import { DatePicker } from '../Common/DatePicker';
import { ContainerTypeSelect, containerTypeOptions } from './GateInModal/ContainerTypeSelect';
import { Switch } from './GateInModal/Switch';
import { ContainerNumberInput } from './GateInModal/ContainerNumberInput';
import { AlimentaireSwitch } from './GateInModal/AlimentaireSwitch';
import { TransactionSwitch } from './GateInModal/TransactionSwitch';
import { formatContainerNumberForDisplay } from './utils';
import { MultiStepModal } from '../Common/Modal/MultiStepModal';

export const GateInModal: React.FC<GateInModalProps> = ({
  showForm,
  onCloseForm,
  formData,
  currentStep,
  isProcessing,
  // autoSaving, // Not used in MultiStepModal
  isCurrentStepValid,
  handleSubmit,
  handleNextStep,
  handlePrevStep,
  handleInputChange,
  handleContainerSizeChange,
  handleHighCubeChange,
  handleQuantityChange,
  handleStatusChange,
  handleClientChange,
  handleTransactionTypeChange,
  clients,
  submissionError,
  validationErrors = [],
  validationWarnings = [],
}) => {
  const { hasModuleAccess } = useAuth();
  const { t } = useTranslation();
  useTheme();
  const canManageTimeTracking = hasModuleAccess('timeTracking');

  const handleFormSubmit = async () => {
    await handleSubmit();
  };

  // handleStepNavigation is now handled by MultiStepModal

  // Get the current container type option
  const currentContainerType = containerTypeOptions.find(
    option => option.value === formData.containerType
  );

  return (
    <MultiStepModal
      isOpen={showForm}
      onClose={onCloseForm}
      title={t('gate.in.new')}
      subtitle="Process container entry into the depot"
      icon={Package}
      currentStep={currentStep}
      totalSteps={3}
      stepLabels={[t('gate.in.form.containerInfo'), t('gate.in.form.transportInfo'), 'Summary']}
      onNextStep={currentStep === 3 ? handleFormSubmit : handleNextStep}
      onPrevStep={handlePrevStep}
      isStepValid={isCurrentStepValid}
      showProgressBar={true}
      size="lg"
    >
      <GateInFormContent
        currentStep={currentStep}
        formData={formData}
        currentContainerType={currentContainerType}
        canManageTimeTracking={canManageTimeTracking}
        clients={clients}
        submissionError={submissionError}
        validationErrors={validationErrors}
        validationWarnings={validationWarnings}
        isProcessing={isProcessing}
        handleInputChange={handleInputChange}
        handleContainerSizeChange={handleContainerSizeChange}
        handleHighCubeChange={handleHighCubeChange}
        handleQuantityChange={handleQuantityChange}
        handleStatusChange={handleStatusChange}
        handleClientChange={handleClientChange}
        handleTransactionTypeChange={handleTransactionTypeChange}
      />
    </MultiStepModal>
  );
};

// Extract form content into separate component for better organization
interface GateInFormContentProps {
  currentStep: number;
  formData: GateInFormData;
  currentContainerType: any;
  canManageTimeTracking: boolean;
  clients: any[];
  submissionError: string | null | undefined;
  validationErrors: string[];
  validationWarnings: string[];
  isProcessing: boolean;
  handleInputChange: (field: keyof GateInFormData, value: any) => void;
  handleContainerSizeChange: (size: '20ft' | '40ft') => void;
  handleHighCubeChange: (isHighCube: boolean) => void;
  handleQuantityChange: (quantity: 1 | 2) => void;
  handleStatusChange: (isFull: boolean) => void;
  handleClientChange: (clientId: string) => void;
  handleTransactionTypeChange: (transactionType: 'Retour Livraison' | 'Transfert (IN)') => void;
}

const GateInFormContent: React.FC<GateInFormContentProps> = ({
  currentStep,
  formData,
  currentContainerType,
  canManageTimeTracking,
  clients,
  submissionError,
  validationErrors,
  validationWarnings,
  handleInputChange,
  handleContainerSizeChange,
  handleHighCubeChange,
  handleQuantityChange,
  handleStatusChange,
  handleClientChange,
  handleTransactionTypeChange
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Error and Warning Messages */}
      {(submissionError || validationErrors.length > 0 || validationWarnings.length > 0) && (
        <div className="space-y-3 mb-6">
          {/* Submission Error */}
          {submissionError && (
            <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-1">{t('common.submissionFailed')}</h4>
                <p className="text-sm text-red-700">{submissionError}</p>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="flex items-start p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-2">{t('common.fixErrors')}</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-block w-1 h-1 bg-red-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Validation Warnings */}
          {validationWarnings.length > 0 && (
            <div className="flex items-start p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800 mb-2">{t('common.pleaseReview')}</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {validationWarnings.map((warning, index) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-block w-1 h-1 bg-yellow-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="depot-step-spacing">

        {/* Step 1: Container Information */}
        {currentStep === 1 && (
          <div className="depot-step-spacing">

            {/* Container Details */}
            <div className="depot-section">
              <h4 className="depot-section-header">
                <Package className="depot-section-icon text-blue-500" />
                {t('gate.in.form.containerInfo')}
              </h4>

              <div className="depot-step-spacing">
                {/* Container Size, High Cube, and Container Type - Three Part Selection */}
                <div className="depot-form-grid md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('gate.in.form.containerSize')} *
                    </label>
                    <Switch
                      checked={formData.containerSize === '40ft'}
                      onChange={(is40ft) => {
                        const newSize = is40ft ? '40ft' : '20ft';
                        handleContainerSizeChange(newSize);
                        // Reset quantity to 1 if switching to 40ft and current quantity is 2
                        if (newSize === '40ft' && formData.containerQuantity === 2) {
                          handleQuantityChange(1);
                        }
                      }}
                      label=""
                      leftLabel="20ft"
                      rightLabel="40ft"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('gate.in.form.highCube')}
                    </label>
                    <Switch
                      checked={formData.isHighCube}
                      onChange={handleHighCubeChange}
                      label=""
                      leftLabel="No"
                      rightLabel="Yes"
                      disabled={formData.containerSize === '20ft'}
                    />
                    {formData.containerSize === '20ft' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Only available for 40ft</p>
                    )}
                  </div>

                  <div>
                    <ContainerTypeSelect
                      value={formData.containerType}
                      selectedIso={formData.containerIsoCode}
                      onChange={(value: string, iso?: string) => {
                        handleInputChange('containerType', value);
                        handleInputChange('containerIsoCode', iso || '');
                      }}
                      containerSize={formData.containerSize}
                      isHighCube={formData.isHighCube}
                    />
                  </div>
                </div>

                {/* Quantity and Transaction - Side by Side */}
                <div className="depot-form-grid">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('gate.in.form.quantity')} *
                    </label>
                    <Switch
                      checked={formData.containerQuantity === 2}
                      onChange={(isDouble) => handleQuantityChange(isDouble ? 2 : 1)}
                      label=""
                      leftLabel="Single (1)"
                      rightLabel="Double (2)"
                      disabled={formData.containerSize === '40ft'}
                    />
                    {formData.containerSize === '40ft' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">40ft containers limited to single quantity</p>
                    )}
                  </div>

                  <div>
                    <TransactionSwitch
                      value={formData.transactionType}
                      onChange={handleTransactionTypeChange}
                    />
                  </div>
                </div>

                {/* Container Status and Classification - Side by Side on Desktop */}
                <div className="depot-form-grid">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('gate.in.form.status')} *
                    </label>
                    <Switch
                      checked={formData.status === 'FULL'}
                      onChange={handleStatusChange}
                      label=""
                      leftLabel="EMPTY"
                      rightLabel="FULL"
                    />
                  </div>

                  <div>
                    <AlimentaireSwitch
                      value={formData.classification}
                      onChange={(value) => handleInputChange('classification', value)}
                    />
                  </div>
                </div>

                {/* Client Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('gate.in.form.client')} *
                  </label>
                  <ClientSearchField
                    clients={clients}
                    selectedClientId={formData.clientId}
                    onClientSelect={(clientId: string) => {
                      handleClientChange(clientId);
                    }}
                    placeholder={t('gate.in.form.searchClient')}
                    required
                  />
                </div>

                {/* Booking Reference - Only for FULL containers */}
                {formData.status === 'FULL' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('gate.in.form.booking')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.bookingReference}
                      onChange={(e) => handleInputChange('bookingReference', e.target.value)}
                      className="depot-input"
                      placeholder="e.g., ABJE0XXXXXXX"
                    />
                  </div>
                )}

                {/* Equipment Reference - Free text field for EDI transmission */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('gate.in.form.equipmentRef')}
                    <span className="text-xs text-gray-500 ml-1">(for EDI client identification)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.equipmentReference}
                    onChange={(e) => handleInputChange('equipmentReference', e.target.value)}
                    className="depot-input"
                    placeholder="e.g., Booking number, reference code..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional reference sent to clients via EDI to help identify container transfers
                  </p>
                </div>

                {/* Container Numbers with Confirmation */}
                <div className="depot-field-separator">
                  {/* First Container Number */}
                  <ContainerNumberInput
                    label={t('gate.in.form.containerNumber')}
                    value={formData.containerNumber}
                    confirmationValue={formData.containerNumberConfirmation}
                    onChange={(value) => handleInputChange('containerNumber', value)}
                    onConfirmationChange={(value) => handleInputChange('containerNumberConfirmation', value)}
                    placeholder="e.g., MSKU1234567"
                    required
                  />

                  {/* Second Container Number (if quantity is 2) */}
                  {formData.containerQuantity === 2 && (
                    <ContainerNumberInput
                      label="Second Container Number"
                      value={formData.secondContainerNumber}
                      confirmationValue={formData.secondContainerNumberConfirmation}
                      onChange={(value) => handleInputChange('secondContainerNumber', value)}
                      onConfirmationChange={(value) => handleInputChange('secondContainerNumberConfirmation', value)}
                      placeholder="e.g., MSKU1234568"
                      required
                    />
                  )}
                </div>


              </div>
            </div>
          </div>
        )}

        {/* Step 2: Transport Details & Summary */}
        {currentStep === 2 && (
          <div className="depot-step-spacing">

            {/* Transport Information */}
            <div className="depot-section">
              <h4 className="depot-section-header">
                <Truck className="depot-section-icon text-green-500" />
                {t('gate.in.form.transportInfo')}
              </h4>

              <div className="depot-step-spacing">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('gate.in.form.driver')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.driverName}
                      onChange={(e) => handleInputChange('driverName', e.target.value)}
                      className="depot-input"
                      placeholder="Driver full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('gate.in.form.truck')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.truckNumber}
                      onChange={(e) => handleInputChange('truckNumber', e.target.value)}
                      className="depot-input"
                      placeholder="License plate number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('gate.in.form.transport')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.transportCompany}
                      onChange={(e) => handleInputChange('transportCompany', e.target.value)}
                      className="depot-input"
                      placeholder="Transport company name"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Truck Arrival Time Tracking */}
            {canManageTimeTracking && (
              <div className="depot-section">
                <h4 className="depot-section-header">
                  <Calendar className="depot-section-icon text-blue-500" />
                  {t('gate.in.form.arrival')}
                </h4>
                <p className="text-sm text-gray-600 mb-4">Manual time tracking (Admin only) - Defaults to current system time</p>

                <div className="depot-form-grid">
                  <div>
                    <label className="label">
                      {t('gate.in.form.arrivalDate')}
                    </label>
                    <DatePicker
                      value={formData.truckArrivalDate}
                      onChange={(date) => handleInputChange('truckArrivalDate', date)}
                      placeholder="Entry Date"
                      required={false}
                    />
                  </div>
                  <div>
                    <label className="label">
                      {t('gate.in.form.arrivalTime')}
                    </label>
                    <TimePicker
                      value={formData.truckArrivalTime}
                      onChange={(time) => handleInputChange('truckArrivalTime', time)}
                      placeholder="Entry Time"
                      required={false}
                      includeSeconds={true}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('gate.in.form.notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="depot-input resize-none"
                placeholder="Any additional notes or special instructions..."
              />
            </div>
          </div>
        )}

        {/* Step 3: Final Summary — Stitch Optimized Style */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Warning / Status */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/40">
              <Clock className="h-5 w-5 text-blue-500 shrink-0" />
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                L'opération sera mise en attente pour assignation finale après confirmation.
              </p>
            </div>

            {/* Header Summary Card */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Package className="h-24 w-24 text-amber-600" />
              </div>

              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Container Principal</span>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1 font-inter tracking-tight">
                    {formatContainerNumberForDisplay(formData.containerNumber) || 'NON SPÉCIFIÉ'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${formData.status === 'FULL' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                    {formData.status}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-white/80 dark:bg-gray-800/80 text-xs font-bold text-gray-600 dark:text-gray-400 border border-gray-100 dark:border-gray-700 shadow-sm">
                    {formData.containerSize} • {formData.containerQuantity > 1 ? 'Double' : 'Single'}
                  </span>
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Technical Details */}
              <div className="bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  Détails Techniques
                </h4>
                <div className="grid grid-cols-1 gap-y-3">
                  <div className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-700/30">
                    <span className="text-sm text-gray-500">Type de transport</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formData.transactionType}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-700/30">
                    <span className="text-sm text-gray-500">Type de conteneur</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formData.containerType.replace('_', ' ')}
                      {formData.containerType && currentContainerType && (
                        <span className="text-blue-500 ml-1">
                          ({formData.containerSize === '20ft' ? currentContainerType.code20 : (formData.isHighCube ? currentContainerType.code40HC : currentContainerType.code40)})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-700/30">
                    <span className="text-sm text-gray-500">Classification</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white capitalize">{formData.classification}</span>
                  </div>
                </div>
              </div>

              {/* Client & Booking */}
              <div className="bg-white dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Truck className="h-3 w-3" />
                  Client & Référence
                </h4>
                <div className="grid grid-cols-1 gap-y-3">
                  <div className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-700/30">
                    <span className="text-sm text-gray-500">Compagnie (Client)</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px]">
                      {formData.clientName || 'Non sélectionné'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-700/30">
                    <span className="text-sm text-gray-500">Booking Ref</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formData.bookingReference || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-50 dark:border-gray-700/30">
                    <span className="text-sm text-gray-500">Équipement Ref</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {formData.equipmentReference || '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Transport & Driver Card (Full Width) */}
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm">
                    <Truck className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-tight">Transporteur & Chauffeur</h5>
                    <p className="text-base font-bold text-gray-900 dark:text-white leading-tight mt-0.5">
                      {formData.driverName || 'Inconnu'} • <span className="text-emerald-600 font-black">{formData.truckNumber}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{formData.transportCompany || 'Compagnie non spécifiée'}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date & Heure Arrivée</span>
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                    <Calendar className="h-3.5 w-3.5" />
                    {formData.truckArrivalDate || 'Date Actuelle'}
                    <span className="mx-1 text-gray-300">•</span>
                    <Clock className="h-3.5 w-3.5" />
                    {formData.truckArrivalTime || 'Heure Actuelle'}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section (Collapsible in design but flat for now) */}
            {formData.notes && (
              <div className="p-4 rounded-xl border-l-4 border-amber-400 bg-amber-50/50 dark:bg-amber-900/5 text-sm text-gray-600 dark:text-gray-400 italic">
                <p>"{formData.notes}"</p>
              </div>
            )}
          </div>
        )}</div>
    </>
  );
};
