import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle, AlertTriangle, FileText, Calculator } from 'lucide-react';
import { ReleaseOrderSearchField } from './ReleaseOrderSearchField';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { GateOutModalProps, GateOutFormData } from './types';
import { MultiStepModal } from '../Common/Modal/MultiStepModal';
import { gateService } from '../../services/api';

export const GateOutModal: React.FC<GateOutModalProps> = ({
  showModal,
  setShowModal,
  availableBookings,
  onSubmit,
  isProcessing
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  const [formData, setFormData] = useState<GateOutFormData>({
    selectedReleaseOrderId: '',
    driverName: '',
    vehicleNumber: '',
    transportCompany: '',
    notes: ''
  });

  const [vehicleNumberError, setVehicleNumberError] = useState<string>('');

  // Reset form when modal closes
  useEffect(() => {
    if (!showModal) {
      setCurrentStep(1);
      setFormData({
        selectedReleaseOrderId: '',
        driverName: '',
        vehicleNumber: '',
        transportCompany: '',
        notes: ''
      });
      setVehicleNumberError('');
    }
  }, [showModal]);

  const selectedBooking = (availableBookings || []).find(
    order => order.id === formData.selectedReleaseOrderId
  );

  const handleInputChange = (field: keyof GateOutFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear vehicle number error when user changes it
    if (field === 'vehicleNumber') {
      setVehicleNumberError('');
    }
  };



  const handleReleaseOrderChange = (releaseOrderId: string) => {
    // Handle reset case (empty releaseOrderId)
    if (!releaseOrderId) {
      setFormData(prev => ({
        ...prev,
        selectedReleaseOrderId: '',
        driverName: '',
        vehicleNumber: '',
        transportCompany: ''
      }));
      setVehicleNumberError('');
      return;
    }

    // Handle selection case
    const order = (availableBookings || []).find(o => o.id === releaseOrderId);
    if (order) {
      setFormData(prev => ({
        ...prev,
        selectedReleaseOrderId: releaseOrderId,
        driverName: '',
        vehicleNumber: '',
        transportCompany: ''
      }));
      setVehicleNumberError('');
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.selectedReleaseOrderId !== '';
      case 2:
        return formData.driverName !== '' && formData.vehicleNumber !== '' &&
               formData.transportCompany !== '' && !vehicleNumberError;
      default:
        return true;
    }
  };



  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    if (!selectedBooking) {
      throw new Error(t('gate.out.form.selectBookingMessage'));
    }

    // Check for pending operations with the same truck number
    const hasPendingOperation = await gateService.checkPendingOperationByTruckNumber(formData.vehicleNumber);
    if (hasPendingOperation) {
      setVehicleNumberError(t('gate.out.form.vehicleNumberError').replace('{truck}', formData.vehicleNumber));
      return;
    }

    const submitData = {
      ...formData,
      booking: selectedBooking
    };

    await onSubmit(submitData);
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(totalSteps, prev + 1));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const stepLabels = ['Order & Container Specs', t('gate.out.form.transport')];

  return (
    <MultiStepModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      title={t('gate.out.new')}
      subtitle={t('gate.out.subtitle')}
      icon={Truck}
      currentStep={currentStep}
      totalSteps={totalSteps}
      stepLabels={stepLabels}
      onNextStep={currentStep < totalSteps ? handleNextStep : handleSubmit}
      onPrevStep={handlePrevStep}
      isStepValid={validateStep(currentStep)}
      size="lg"
    >
      <div className="space-y-6">

        {/* Step 1: Release Order & Container Specifications */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Release Order Selection */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                {t('gate.out.form.booking')}
              </h4>

              <div className="space-y-4">
                <ReleaseOrderSearchField
                  bookings={availableBookings}
                  selectedOrderId={formData.selectedReleaseOrderId}
                  onOrderSelect={handleReleaseOrderChange}
                  placeholder={t('gate.out.form.searchBooking')}
                  required
                  canViewAllData={user?.role !== 'client'}
                />

                {/* Release Order Details */}
                {selectedBooking && (
                  <div className="bg-white p-4 rounded-lg border border-blue-200 mt-4">
                    <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      {t('gate.out.form.selectedBooking')}
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('nav.bookingReference')}:</span>
                        <span className="font-medium">{selectedBooking.bookingNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('common.client')}:</span>
                        <span className="font-medium truncate ml-2">
                          {user?.role === 'client' ? t('containers.details.yourCompany') : selectedBooking.clientName}
                        </span>
                      </div>
                      {selectedBooking.bookingType && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('common.type')}:</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            selectedBooking.bookingType === 'IMPORT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {selectedBooking.bookingType}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('common.status')}:</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          selectedBooking.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedBooking.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('common.date')}:</span>
                        <span className="font-medium">{selectedBooking.createdAt.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('containers.quantity')}:</span>
                        <span className="font-medium">{selectedBooking.totalContainers}</span>
                      </div>
                      {selectedBooking.containerQuantities && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('releases.breakdown.summary')}:</span>
                          <span className="font-medium">
                            {selectedBooking.containerQuantities.size20ft > 0 && `${selectedBooking.containerQuantities.size20ft}×20" `}
                            {selectedBooking.containerQuantities.size40ft > 0 && `${selectedBooking.containerQuantities.size40ft}×40"`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!formData.selectedReleaseOrderId && (
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  {t('gate.out.form.selectBookingMessage')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Transport Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            {/* Transport Information */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                {t('gate.out.form.transport')}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="driverName" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('gate.out.form.driver')} *
                  </label>
                  <input
                    id="driverName"
                    type="text"
                    required
                    value={formData.driverName}
                    onChange={(e) => handleInputChange('driverName', e.target.value)}
                    className="form-input w-full"
                    placeholder="Driver full name"
                  />
                </div>

                <div>
                  <label htmlFor="vehicleNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('gate.out.form.vehicle')} *
                  </label>
                  <input
                    id="vehicleNumber"
                    type="text"
                    required
                    value={formData.vehicleNumber}
                    onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                    className={`form-input w-full ${vehicleNumberError ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' : ''}`}
                    placeholder="License plate number"
                  />
                  {vehicleNumberError && (
                    <div className="mt-2 flex items-start p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">{vehicleNumberError}</p>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="transportCompany" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('gate.out.form.company')} *
                  </label>
                  <input
                    id="transportCompany"
                    type="text"
                    required
                    value={formData.transportCompany}
                    onChange={(e) => handleInputChange('transportCompany', e.target.value)}
                    className="form-input w-full"
                    placeholder="Transport company name"
                  />
                </div>
              </div>
            </div>

            {/* Operation Summary */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                {t('gate.out.summary')}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">{t('nav.bookingReference')}:</span>
                  <div className="font-medium">{selectedBooking?.bookingNumber || 'Not selected'}</div>
                </div>
                <div>
                  <span className="text-gray-600">{t('gate.out.form.driver')}:</span>
                  <div className="font-medium">{formData.driverName || 'Not specified'}</div>
                </div>
                <div>
                  <span className="text-gray-600">{t('gate.out.form.vehicle')}:</span>
                  <div className="font-medium">{formData.vehicleNumber || 'Not specified'}</div>
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-600">{t('gate.out.form.company')}:</span>
                  <div className="font-medium">{formData.transportCompany || 'Not specified'}</div>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                {t('gate.in.form.notes')}
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="form-input w-full"
                rows={3}
                placeholder="Enter any additional notes or special instructions..."
              />
            </div>
          </div>
        )}
      </div>
    </MultiStepModal>
  );
};
