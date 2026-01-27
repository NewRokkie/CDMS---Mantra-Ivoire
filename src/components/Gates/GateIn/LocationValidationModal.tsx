import React, { useState, useEffect } from 'react';
import { Save, Loader, Package, MapPin, Clock } from 'lucide-react';
import { StandardModal } from '../../Common/Modal/StandardModal';
import { DamageAssessmentModal } from '../GateInModal/DamageAssessmentModal';
import { StackSelectionButton } from '../GateInModal/StackSelectionButton';
import { DatePicker } from '../../Common/DatePicker';
import { TimePicker } from '../../Common/TimePicker';
import { useAuth } from '../../../hooks/useAuth';
import { useYard } from '../../../hooks/useYard';
import { DamageAssessment } from '../types';

interface LocationData {
  id: string;
  name: string;
  capacity: number;
  available: number;
  section: string;
  stackId?: string;
  stackNumber?: number;
}

interface LocationValidationOperation {
  id: string;
  date: Date;
  createdAt: Date;
  containerNumber: string;
  secondContainerNumber?: string;
  containerSize: string;
  containerQuantity: number;
  status: 'pending' | 'in_process' | 'completed' | 'cancelled';
  isDamaged: boolean;
  bookingReference?: string;
  clientCode: string;
  clientName: string;
  truckNumber?: string;
  driverName: string;
  transportCompany: string;
  operationStatus: 'pending' | 'completed';
  completedAt?: Date;
}

interface LocationValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: LocationValidationOperation | null;
  onComplete: (operation: LocationValidationOperation, locationData: any) => Promise<void>;
  isProcessing: boolean;
  mockLocations: {
    '20ft': LocationData[];
    '40ft': LocationData[];
    damage: LocationData[];
  };
}

export const LocationValidationModal: React.FC<LocationValidationModalProps> = ({
  isOpen,
  onClose,
  operation,
  onComplete,
  isProcessing
}) => {
  const [selectedStackId, setSelectedStackId] = useState<string>('');
  const [selectedStackLocation, setSelectedStackLocation] = useState<string>('');
  const [truckDepartureDate, setTruckDepartureDate] = useState('');
  const [truckDepartureTime, setTruckDepartureTime] = useState('');
  const [error, setError] = useState<string>('');
  
  // Damage Assessment State
  const [showDamageAssessment, setShowDamageAssessment] = useState(false);

  const [notificationFn, setNotificationFn] = useState<((type: 'success' | 'error' | 'warning' | 'info', message: string, options?: { autoHide?: boolean; duration?: number }) => void) | null>(null);

  const { user } = useAuth();
  const { currentYard } = useYard();
  const canManageTimeTracking = user?.role === 'admin';



  // Reset form when modal opens/closes or operation changes
  React.useEffect(() => {
    if (!isOpen || !operation) {
      setSelectedStackId('');
      setSelectedStackLocation('');
      setShowDamageAssessment(false);
      // Set default system date and time
      const now = new Date();
      setTruckDepartureDate(now.toISOString().split('T')[0]);
      setTruckDepartureTime(now.toTimeString().slice(0, 5));
      setError('');
    } else if (isOpen && operation) {
      // Initialize with current system date/time when opening
      const now = new Date();
      setTruckDepartureDate(now.toISOString().split('T')[0]);
      setTruckDepartureTime(now.toTimeString().slice(0, 5));
    }
  }, [isOpen, operation]);

  if (!isOpen || !operation) return null;

  // Normalize container size (20FT → 20ft, 40FT → 40ft)
  const normalizedSize = operation.containerSize?.toLowerCase().replace('ft', 'ft') as '20ft' | '40ft';

  const handleComplete = async () => {
    setError('');

    if (!selectedStackId || !selectedStackLocation) {
      const errorMsg = 'Please select a stack location for the container.';
      setError(errorMsg);
      if (notificationFn) {
        notificationFn('error', errorMsg, { autoHide: false });
      }
      return;
    }

    // Show damage assessment modal before completing
    setShowDamageAssessment(true);
  };

  const handleStackSelect = (stackId: string, formattedLocation: string) => {
    setSelectedStackId(stackId);
    setSelectedStackLocation(formattedLocation);
    setError(''); // Clear any previous errors
  };



  const isFormValid = selectedStackId && selectedStackLocation;

  // Damage Assessment Handlers
  const handleDamageAssessmentComplete = async (assessment: DamageAssessment) => {
    setShowDamageAssessment(false);
    
    // Complete the operation with the assessment
    const locationData = {
      assignedLocation: selectedStackLocation,
      stackId: selectedStackId,
      truckDepartureDate: truckDepartureDate || new Date().toISOString().split('T')[0],
      truckDepartureTime: truckDepartureTime || new Date().toTimeString().slice(0, 5),
      damageAssessment: assessment
    };

    try {
      await onComplete(operation, locationData);
      if (notificationFn) {
        notificationFn('success', 'Operation completed successfully!');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to complete operation';
      setError(errorMsg);
      if (notificationFn) {
        notificationFn('error', errorMsg, { autoHide: false });
      }
    }
  };

  const handleDamageAssessmentCancel = () => {
    setShowDamageAssessment(false);
  };

  // Validation Summary Component
  const ValidationSummary = () => (
    <div className="text-xs sm:text-sm text-gray-600 hidden sm:block">
      {isFormValid ? (
        <span className="text-green-600 font-medium">✓ Ready to complete</span>
      ) : (
        <span>Please select a stack location</span>
      )}
    </div>
  );

  // Custom Footer Component
  const CustomFooter = () => (
    <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
      <div className="flex items-center justify-between gap-2">
        <ValidationSummary />
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={onClose}
            className="btn-secondary px-3 py-2 sm:px-6 sm:py-2 text-sm"
          >
            <span className="sm:hidden">✕</span>
            <span className="hidden sm:inline">Cancel</span>
          </button>
          <button
            onClick={handleComplete}
            disabled={isProcessing || !isFormValid}
            className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 px-3 py-2 sm:px-6 sm:py-2 text-sm"
          >
            {isProcessing ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span className="sm:hidden">Complete</span>
                <span className="hidden sm:inline">Complete Operation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Location & Validation"
      subtitle={`Assign location for operation ${operation.id}`}
      icon={MapPin}
      size="lg"
      maxHeight="95vh"
      hideDefaultFooter={true}
      customFooter={<CustomFooter />}
      preventBackdropClose={isProcessing}
    >
      {({ showNotification: modalNotificationFn }) => {
        // Store the notification function using useEffect to avoid setState during render
        useEffect(() => {
          if (modalNotificationFn && !notificationFn) {
            setNotificationFn(() => modalNotificationFn);
          }
        }, [modalNotificationFn, notificationFn]);

        return (
          <div className="space-y-6">

            {/* Operation Summary */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Package className="h-5 w-5 text-gray-600" />
                <h4 className="text-lg font-semibold text-gray-900">Operation Details</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-gray-600 font-medium">Container:</span>
                  <div className="font-semibold text-gray-900">{operation.containerNumber}</div>
                  {operation.secondContainerNumber && (
                    <div className="font-semibold text-gray-900">{operation.secondContainerNumber}</div>
                  )}
                </div>
                <div>
                  <span className="text-sm text-gray-600 font-medium">Size & Quantity:</span>
                  <div className="font-semibold text-gray-900">
                    {operation.containerSize} • Qty: {operation.containerQuantity}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600 font-medium">Client:</span>
                  <div className="font-semibold text-gray-900">
                    {operation.clientName}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600 font-medium">Status:</span>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {operation.status.toLocaleUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-gray-600 font-medium">Driver:</span>
                  <div className="font-semibold text-gray-900">{operation.driverName}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600 font-medium">Truck:</span>
                  <div className="font-semibold text-gray-900">{operation.truckNumber}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600 font-medium">Transport Company:</span>
                  <div className="font-semibold text-gray-900">{operation.transportCompany}</div>
                </div>
                {operation.bookingReference && (
                  <div>
                    <span className="text-sm text-gray-600 font-medium">Booking Reference:</span>
                    <div className="font-semibold text-gray-900 break-all">{operation.bookingReference}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Stack Selection */}
            <div>
              <StackSelectionButton
                selectedStack={selectedStackLocation}
                onStackSelect={handleStackSelect}
                containerSize={normalizedSize}
                containerQuantity={operation.containerQuantity as 1 | 2}
                yardId={currentYard?.id || ''}
                required={true}
                error={error && !selectedStackId ? error : undefined}
                clientCode={operation.clientCode}
              />
            </div>

            {/* Time Tracking - Only for Admin Users */}
            {canManageTimeTracking && (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Clock className="h-5 w-5 text-gray-600" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Manual Time Tracking</h4>
                    <p className="text-sm text-gray-600">Optional: Record truck departure time (Admin only) - Defaults to current system time</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Truck Departure Date
                    </label>
                    <DatePicker
                      value={truckDepartureDate}
                      onChange={setTruckDepartureDate}
                      placeholder="Current system date"
                      required={false}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Truck Departure Time
                    </label>
                    <TimePicker
                      value={truckDepartureTime}
                      onChange={setTruckDepartureTime}
                      placeholder="Current system time"
                      required={false}
                      includeSeconds={true}
                    />
                  </div>
                </div>
              </div>
            )}


          </div>
        );
      }}
    </StandardModal>

    {/* Damage Assessment Modal */}
    <DamageAssessmentModal
      isVisible={showDamageAssessment}
      containerNumber={operation.containerNumber}
      operatorName={user?.name || 'Unknown'}
      onAssessmentComplete={handleDamageAssessmentComplete}
      onCancel={handleDamageAssessmentCancel}
    />
  </>
  );
};
