import React from 'react';
import { Package, Truck, Calendar, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
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
  setShowForm,
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
  const { t } = useLanguage();
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
      onClose={() => setShowForm(false)}
      title={t('gate.in.new')}
      subtitle="Process container entry into the depot"
      icon={Package}
      currentStep={currentStep}
      totalSteps={3}
      stepLabels={[t('gate.in.form.containerInfo'), t('gate.in.form.transportInfo'), 'Final Summary']}
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
  const { t } = useLanguage();

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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          <p className="text-xs text-gray-500 mt-2">Only available for 40ft</p>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          <p className="text-xs text-gray-500 mt-2">40ft containers limited to single quantity</p>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          placeholder="Current system date"
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
                          placeholder="Current system time"
                          required={false}
                          includeSeconds={true}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Operation Summary */}
                <div className="depot-section">
                  <h4 className="depot-section-header">
                    <Package className="depot-section-icon text-green-500" />
                    {t('gate.in.summary')}
                  </h4>
                  <div className="space-y-3 text-sm">
                    {/* Mobile: Stack layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-600">Container:</span>
                      <div className="font-medium">{formatContainerNumberForDisplay(formData.containerNumber) || 'Not specified'}</div>
                      {formData.secondContainerNumber && (
                        <div className="font-medium">{formatContainerNumberForDisplay(formData.secondContainerNumber)}</div>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-600">Size & Quantity:</span>
                      <div className="font-medium">{formData.containerSize} • Qty: {formData.containerQuantity}</div>
                    </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <div className="font-medium">
                        {formData.containerType.charAt(0).toUpperCase() + formData.containerType.slice(1).replace('_', ' ')}
                        {formData.containerType && currentContainerType && (
                          <span className="text-blue-600 ml-1">
                            ({formData.containerSize === '20ft'
                              ? currentContainerType.code20
                              : (formData.isHighCube && currentContainerType.code40HC
                                ? currentContainerType.code40HC
                                : currentContainerType.code40)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Client:</span>
                      <div className="font-medium">{formData.clientCode ? `${formData.clientCode} - ${formData.clientName}` : 'Not selected'}</div>
                    </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          formData.status === 'FULL' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {formData.status}
                        </span>

                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Transaction:</span>
                      <div className="font-medium">{formData.transactionType}</div>
                    </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-600">Driver:</span>
                      <div className="font-medium">{formData.driverName || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Truck:</span>
                      <div className="font-medium">{formData.truckNumber || 'Not specified'}</div>
                    </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-600">Transport Company:</span>
                      <div className="font-medium">{formData.transportCompany || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Arrival Date:</span>
                      <div className="font-medium">{formData.truckArrivalDate || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Arrival Time:</span>
                      <div className="font-medium">{formData.truckArrivalTime || 'Not specified'}</div>
                    </div>
                    </div>
                    {formData.bookingReference && (
                      <div className="md:col-span-2">
                        <span className="text-gray-600">Booking Reference:</span>
                        <div className="font-medium">{formData.bookingReference}</div>
                      </div>
                    )}
                    {formData.equipmentReference && (
                      <div className="md:col-span-2">
                        <span className="text-gray-600">Equipment Reference:</span>
                        <div className="font-medium">{formData.equipmentReference}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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

        {/* Step 3: Final Summary */}
        {currentStep === 3 && (
          <div className="depot-step-spacing">

                {/* Pending Operation Notice */}
                <div className="depot-section">
                  <h4 className="depot-section-header">
                    <Clock className="depot-section-icon text-blue-500" />
                    {t('gate.in.pendingNotice.title')}
                  </h4>
                  <div className="text-sm text-gray-600">
                    <p className="mb-2">{t('gate.in.pendingNotice.desc')}</p>
                  </div>
                </div>

                {/* Final Operation Summary */}
                <div className="depot-section">
                  <h4 className="depot-section-header">
                    <Package className="depot-section-icon text-green-500" />
                    {t('gate.in.summary')}
                  </h4>
                  {/* ... Summary Content repeated - should be a component ideally but reusing same structure for now ... */}
                  {/* For brevity, I'm replacing the repeated content with similar translated structure */}
                  <div className="space-y-3 text-sm">
                    {/* Container Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-gray-600">Container:</span>
                        <div className="font-medium">{formatContainerNumberForDisplay(formData.containerNumber) || 'Not specified'}</div>
                        {formData.secondContainerNumber && (
                          <div className="font-medium">{formatContainerNumberForDisplay(formData.secondContainerNumber)}</div>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-600">Size & Quantity:</span>
                        <div className="font-medium">{formData.containerSize} • Qty: {formData.containerQuantity}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-gray-600">Type:</span>
                        <div className="font-medium">
                          {formData.containerType.charAt(0).toUpperCase() + formData.containerType.slice(1).replace('_', ' ')}
                          {formData.containerType && currentContainerType && (
                            <span className="text-blue-600 ml-1">
                              ({formData.containerSize === '20ft'
                                ? currentContainerType.code20
                                : (formData.isHighCube && currentContainerType.code40HC
                                  ? currentContainerType.code40HC
                                  : currentContainerType.code40)})
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Classification:</span>
                        <div className="font-medium capitalize">{formData.classification}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Transaction:</span>
                        <div className="font-medium">{formData.transactionType}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-gray-600">Client:</span>
                        <div className="font-medium">{formData.clientCode ? `${formData.clientCode} - ${formData.clientName}` : 'Not selected'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            formData.status === 'FULL' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {formData.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Transport Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-gray-600">Driver:</span>
                        <div className="font-medium">{formData.driverName || 'Not specified'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Truck:</span>
                        <div className="font-medium">{formData.truckNumber || 'Not specified'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-gray-600">Transport Company:</span>
                        <div className="font-medium">{formData.transportCompany || 'Not specified'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Operation Status:</span>
                        <div className="font-medium">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            Pending Assignment
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timing Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="text-gray-600">Arrival Date:</span>
                        <div className="font-medium">{formData.truckArrivalDate || 'Current date'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Arrival Time:</span>
                        <div className="font-medium">{formData.truckArrivalTime || 'Current time'}</div>
                      </div>
                    </div>

                    {formData.bookingReference && (
                      <div className="md:col-span-2">
                        <span className="text-gray-600">Booking Reference:</span>
                        <div className="font-medium">{formData.bookingReference}</div>
                      </div>
                    )}
                    {formData.equipmentReference && (
                      <div className="md:col-span-2">
                        <span className="text-gray-600">Equipment Reference:</span>
                        <div className="font-medium">{formData.equipmentReference}</div>
                      </div>
                    )}

                    {formData.notes && (
                      <div className="md:col-span-2">
                        <span className="text-gray-600">Notes:</span>
                        <div className="font-medium">{formData.notes}</div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          )}
      </div>
    </>
  );
};
