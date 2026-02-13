import React, { useState, useEffect } from 'react';
import { Save, Loader, Package, MapPin, Clock, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { StandardModal } from '../../Common/Modal/StandardModal';
import { DamageAssessmentModal } from '../GateInModal/DamageAssessmentModal';
import { StackSelectionButton } from '../GateInModal/StackSelectionButton';
import { DatePicker } from '../../Common/DatePicker';
import { TimePicker } from '../../Common/TimePicker';
import { useAuth } from '../../../hooks/useAuth';
import { useYard } from '../../../hooks/useYard';
import { DamageAssessment } from '../types';
import { bufferZoneService } from '../../../services/bufferZoneService';

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
  const [damageAssessment, setDamageAssessment] = useState<DamageAssessment | null>(null);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);

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
      setDamageAssessment(null);
      setAssessmentCompleted(false);
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

  const handleStartDamageAssessment = () => {
    setError('');
    // L'évaluation des dommages est maintenant la première étape
    // Pas besoin de sélection de stack préalable
    setShowDamageAssessment(true);
  };

  const handleComplete = async () => {
    setError('');

    // Vérification de l'évaluation des dommages (obligatoire)
    if (!assessmentCompleted || !damageAssessment) {
      const errorMsg = 'L\'évaluation des dommages doit être complétée avant de finaliser l\'opération.';
      setError(errorMsg);
      if (notificationFn) {
        notificationFn('error', errorMsg, { autoHide: false });
      }
      return;
    }

    // Si pas de dommages, vérifier la sélection de stack
    if (!damageAssessment.hasDamage && (!selectedStackId || !selectedStackLocation)) {
      const errorMsg = 'Veuillez sélectionner un emplacement pour le conteneur en bon état.';
      setError(errorMsg);
      if (notificationFn) {
        notificationFn('error', errorMsg, { autoHide: false });
      }
      return;
    }

    // Procéder à la finalisation
    await finalizeOperation();
  };

  const finalizeOperation = async () => {
    if (!damageAssessment) return;

    let finalLocation = selectedStackLocation;
    let finalStackId = selectedStackId;
    let ediShouldTransmit = true; // Par défaut, EDI est transmis

    // Si le conteneur est endommagé, l'assigner à une zone tampon
    if (damageAssessment.hasDamage && currentYard?.id) {
      try {
        if (notificationFn) {
          notificationFn('info', 'Assignation automatique en zone tampon pour conteneur endommagé...', { autoHide: false });
        }

        const bufferStack = await bufferZoneService.getOrCreateBufferStack(
          currentYard.id,
          operation.containerSize as '20ft' | '40ft',
          damageAssessment.damageType || 'general'
        );

        finalStackId = bufferStack.id;
        finalLocation = `BUFFER-S${String(bufferStack.stackNumber).padStart(4, '0')}-R01-H01`;
        ediShouldTransmit = false; // EDI en PENDING pour conteneurs endommagés

        if (notificationFn) {
          notificationFn('warning', `Conteneur assigné à la zone tampon: ${finalLocation} (EDI en attente)`, { autoHide: false });
        }
      } catch (bufferError) {
        const errorMsg = `Erreur lors de l'assignation en zone tampon: ${bufferError instanceof Error ? bufferError.message : 'Erreur inconnue'}`;
        setError(errorMsg);
        if (notificationFn) {
          notificationFn('error', errorMsg, { autoHide: false });
        }
        return;
      }
    } else {
      // Conteneur en bon état - EDI automatique
      if (notificationFn) {
        notificationFn('info', `Assignation à l'emplacement sélectionné: ${finalLocation} (EDI automatique)`, { autoHide: false });
      }
    }
    
    // Finaliser l'opération avec les données complètes
    const locationData = {
      assignedLocation: finalLocation,
      stackId: finalStackId,
      truckDepartureDate: truckDepartureDate || new Date().toISOString().split('T')[0],
      truckDepartureTime: truckDepartureTime || new Date().toTimeString().slice(0, 5),
      damageAssessment: damageAssessment,
      isBufferZone: damageAssessment.hasDamage,
      ediShouldTransmit: ediShouldTransmit // Nouveau flag pour contrôler l'EDI
    };

    try {
      await onComplete(operation, locationData);
      if (notificationFn) {
        const successMsg = damageAssessment.hasDamage 
          ? `Opération terminée! Conteneur en zone tampon: ${finalLocation} (EDI en attente de traitement manuel)`
          : `Opération terminée! Conteneur assigné: ${finalLocation} (EDI transmis automatiquement)`;
        notificationFn('success', successMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Échec de l\'opération';
      setError(errorMsg);
      if (notificationFn) {
        notificationFn('error', errorMsg, { autoHide: false });
      }
    }
  };

  const handleStackSelect = (stackId: string, formattedLocation: string) => {
    setSelectedStackId(stackId);
    setSelectedStackLocation(formattedLocation);
    setError(''); // Clear any previous errors
  };



  // Validation : Évaluation complétée + (si pas de dommages, stack sélectionné)
  const isFormValid = assessmentCompleted && (
    damageAssessment?.hasDamage || // Si endommagé, pas besoin de stack
    (selectedStackId && selectedStackLocation) // Si OK, stack requis
  );

  // Damage Assessment Handlers
  const handleDamageAssessmentComplete = (assessment: DamageAssessment) => {
    setShowDamageAssessment(false);
    setDamageAssessment(assessment);
    setAssessmentCompleted(true);
    
    if (notificationFn) {
      const message = assessment.hasDamage 
        ? `⚠️ Dommages détectés (${assessment.damageType}). Le conteneur sera assigné en zone tampon lors de la finalisation.`
        : '✅ Aucun dommage détecté. Le conteneur sera assigné à l\'emplacement sélectionné.';
      notificationFn(assessment.hasDamage ? 'warning' : 'success', message);
    }
  };

  const handleDamageAssessmentCancel = () => {
    setShowDamageAssessment(false);
  };

  // Validation Summary Component
  const ValidationSummary = () => (
    <div className="text-xs sm:text-sm text-gray-600 hidden sm:block">
      {!assessmentCompleted ? (
        <span className="text-orange-600">Étape 1: Évaluation des dommages requise</span>
      ) : damageAssessment?.hasDamage ? (
        <span className="text-red-600 font-medium">✓ Zone tampon - Prêt à finaliser</span>
      ) : !selectedStackId ? (
        <span className="text-blue-600">Étape 2: Sélection d'emplacement requise</span>
      ) : (
        <span className="text-green-600 font-medium">✓ Prêt à finaliser l'opération</span>
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
                <span className="sm:hidden">Finaliser</span>
                <span className="hidden sm:inline">Finaliser l'Opération</span>
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

            {/* Damage Assessment Section - ÉTAPE 1 */}
            <div>
              <div className="bg-orange-50 rounded-lg p-4 mb-4 border border-orange-200">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <h4 className="font-semibold text-orange-900">Étape 1: Évaluation des Dommages</h4>
                </div>
                <p className="text-sm text-orange-700 mb-3">
                  L'évaluation des dommages détermine le processus d'assignation du conteneur.
                </p>
                
                {!assessmentCompleted ? (
                  <button
                    onClick={handleStartDamageAssessment}
                    className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Effectuer l'Évaluation des Dommages</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                      damageAssessment?.hasDamage 
                        ? 'bg-red-100 border border-red-200' 
                        : 'bg-green-100 border border-green-200'
                    }`}>
                      {damageAssessment?.hasDamage ? (
                        <>
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="font-medium text-red-800">Dommages Détectés</p>
                            <p className="text-sm text-red-700">
                              Type: {damageAssessment.damageType} - {damageAssessment.damageDescription}
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                              → Assignation automatique en zone tampon (EDI en attente)
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-green-800">Aucun Dommage Détecté</p>
                            <p className="text-sm text-green-700">
                              Le conteneur est en bon état
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              → Sélection d'emplacement requise (EDI automatique)
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <button
                      onClick={handleStartDamageAssessment}
                      className="text-sm text-orange-600 hover:text-orange-800 underline"
                    >
                      Modifier l'évaluation
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stack Selection - ÉTAPE 2 (Seulement si pas de dommages) */}
            {assessmentCompleted && !damageAssessment?.hasDamage && (
              <div>
                <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">Étape 2: Sélection d'Emplacement</h4>
                  </div>
                  <p className="text-sm text-blue-700">
                    Sélectionnez l'emplacement final pour ce conteneur en bon état.
                  </p>
                </div>

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
            )}

            {/* Zone Tampon Info (Si dommages détectés) */}
            {assessmentCompleted && damageAssessment?.hasDamage && (
              <div>
                <div className="bg-red-50 rounded-lg p-4 mb-4 border border-red-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    <h4 className="font-semibold text-red-900">Assignation en Zone Tampon</h4>
                  </div>
                  <div className="text-sm text-red-700 space-y-2">
                    <p>
                      <strong>Conteneur endommagé détecté :</strong> {damageAssessment.damageType}
                    </p>
                    <p>
                      <strong>Description :</strong> {damageAssessment.damageDescription}
                    </p>
                    <div className="bg-red-100 rounded-lg p-3 mt-3">
                      <p className="font-medium text-red-800">Processus automatique :</p>
                      <ul className="text-xs text-red-700 mt-1 space-y-1">
                        <li>• Assignation automatique en zone tampon</li>
                        <li>• EDI marqué comme PENDING (non transmis)</li>
                        <li>• Traitement manuel requis avant transmission EDI</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
