import React, { useState, useEffect } from 'react';
import { Save, Loader, Package, MapPin, Clock, Shield, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
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

interface BufferStack {
  id: string;
  stackNumber: number;
  sectionName: string;
  capacity: number;
  currentOccupancy: number;
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

  // Buffer Zone Stack Selection
  const [bufferStacks, setBufferStacks] = useState<BufferStack[]>([]);
  const [selectedBufferStackId, setSelectedBufferStackId] = useState<string>('');
  const [loadingBufferStacks, setLoadingBufferStacks] = useState(false);

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
      setSelectedBufferStackId('');
      setBufferStacks([]);
      const now = new Date();
      setTruckDepartureDate(now.toISOString().split('T')[0]);
      setTruckDepartureTime(now.toTimeString().slice(0, 5));
      setError('');
    } else if (isOpen && operation) {
      const now = new Date();
      setTruckDepartureDate(now.toISOString().split('T')[0]);
      setTruckDepartureTime(now.toTimeString().slice(0, 5));
    }
  }, [isOpen, operation]);

  // Charger les stacks tampons lorsque des dommages sont détectés
  useEffect(() => {
    if (assessmentCompleted && damageAssessment?.hasDamage && currentYard?.id) {
      loadBufferStacks();
    }
  }, [assessmentCompleted, damageAssessment, currentYard?.id]);

  const loadBufferStacks = async () => {
    if (!currentYard?.id) return;
    setLoadingBufferStacks(true);
    try {
      const stacks = await bufferZoneService.getBufferStacks(currentYard.id);
      const mapped: BufferStack[] = stacks.map(s => ({
        id: s.id,
        stackNumber: s.stackNumber,
        sectionName: s.sectionName || `Stack #${s.stackNumber}`,
        capacity: s.capacity,
        currentOccupancy: s.currentOccupancy,
      }));
      setBufferStacks(mapped);
      if (mapped.length === 0 && notificationFn) {
        notificationFn('warning', 'Aucun stack tampon configuré dans Stack Management. Veuillez en créer un avant de continuer.', { autoHide: false });
      }
    } catch (e) {
      setError('Impossible de charger les stacks tampons.');
    } finally {
      setLoadingBufferStacks(false);
    }
  };

  if (!isOpen || !operation) return null;

  const normalizedSize = operation.containerSize?.toLowerCase().replace('ft', 'ft') as '20ft' | '40ft';

  const handleStartDamageAssessment = () => {
    setError('');
    setShowDamageAssessment(true);
  };

  const handleComplete = async () => {
    setError('');

    if (!assessmentCompleted || !damageAssessment) {
      const errorMsg = 'L\'évaluation des dommages doit être complétée avant de finaliser l\'opération.';
      setError(errorMsg);
      notificationFn?.('error', errorMsg, { autoHide: false });
      return;
    }

    if (damageAssessment.hasDamage) {
      // Validation : un stack tampon doit être sélectionné
      if (!selectedBufferStackId) {
        const errorMsg = 'Veuillez sélectionner un stack tampon pour ce conteneur endommagé.';
        setError(errorMsg);
        notificationFn?.('error', errorMsg, { autoHide: false });
        return;
      }
      if (bufferStacks.length === 0) {
        const errorMsg = 'Aucun stack tampon disponible. Veuillez en créer un dans Stack Management.';
        setError(errorMsg);
        notificationFn?.('error', errorMsg, { autoHide: false });
        return;
      }
    } else {
      // Pas de dommage → stack physique/virtuel requis
      if (!selectedStackId || !selectedStackLocation) {
        const errorMsg = 'Veuillez sélectionner un emplacement pour le conteneur.';
        setError(errorMsg);
        notificationFn?.('error', errorMsg, { autoHide: false });
        return;
      }
    }

    await finalizeOperation();
  };

  const finalizeOperation = async () => {
    if (!damageAssessment) return;

    let finalLocation = selectedStackLocation;
    let finalStackId = selectedStackId;

    if (damageAssessment.hasDamage) {
      // Obtenir les infos du stack tampon sélectionné
      const chosenBufferStack = bufferStacks.find(s => s.id === selectedBufferStackId);
      if (!chosenBufferStack) {
        setError('Stack tampon sélectionné introuvable.');
        return;
      }
      finalStackId = chosenBufferStack.id;
      finalLocation = `BUF-S${String(chosenBufferStack.stackNumber).padStart(4, '0')}`;

      notificationFn?.('info', `Assignation en zone tampon: ${chosenBufferStack.sectionName} (EDI transmis à la finalisation)`, { autoHide: false });
    }

    const locationData = {
      assignedLocation: finalLocation,
      stackId: finalStackId,
      bufferStackId: damageAssessment.hasDamage ? selectedBufferStackId : null,
      truckDepartureDate: truckDepartureDate || new Date().toISOString().split('T')[0],
      truckDepartureTime: truckDepartureTime || new Date().toTimeString().slice(0, 5),
      damageAssessment: damageAssessment,
      isBufferZone: damageAssessment.hasDamage,
    };

    try {
      await onComplete(operation, locationData);
      const successMsg = damageAssessment.hasDamage
        ? `Conteneur assigné en zone tampon: ${finalLocation} (EDI GATE IN transmis)`
        : `Conteneur assigné: ${finalLocation} (EDI GATE IN transmis)`;
      notificationFn?.('success', successMsg);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Échec de l\'opération';
      setError(errorMsg);
      notificationFn?.('error', errorMsg, { autoHide: false });
    }
  };

  const handleStackSelect = (stackId: string, formattedLocation: string) => {
    setSelectedStackId(stackId);
    setSelectedStackLocation(formattedLocation);
    setError('');
  };

  const isFormValid = assessmentCompleted && (
    (damageAssessment?.hasDamage && selectedBufferStackId !== '' && bufferStacks.length > 0) ||
    (!damageAssessment?.hasDamage && selectedStackId && selectedStackLocation)
  );

  const handleDamageAssessmentComplete = (assessment: DamageAssessment) => {
    setShowDamageAssessment(false);
    setDamageAssessment(assessment);
    setAssessmentCompleted(true);
    setSelectedBufferStackId(''); // Reset buffer selection on re-assessment

    const message = assessment.hasDamage
      ? `⚠️ Dommages détectés (${assessment.damageType}). Sélectionnez un stack tampon.`
      : '✅ Aucun dommage. Sélectionnez un emplacement physique.';
    notificationFn?.(assessment.hasDamage ? 'warning' : 'success', message);
  };

  const handleDamageAssessmentCancel = () => {
    setShowDamageAssessment(false);
  };

  const ValidationSummary = () => (
    <div className="text-xs sm:text-sm text-gray-600 hidden sm:block">
      {!assessmentCompleted ? (
        <span className="text-orange-600">Étape 1: Évaluation des dommages requise</span>
      ) : damageAssessment?.hasDamage && !selectedBufferStackId ? (
        <span className="text-red-600">Étape 2: Sélection du stack tampon requise</span>
      ) : damageAssessment?.hasDamage ? (
        <span className="text-red-600 font-medium">✓ Zone tampon sélectionnée - Prêt à finaliser</span>
      ) : !selectedStackId ? (
        <span className="text-blue-600">Étape 2: Sélection d'emplacement requise</span>
      ) : (
        <span className="text-green-600 font-medium">✓ Prêt à finaliser l'opération</span>
      )}
    </div>
  );

  const CustomFooter = () => (
    <div className="w-full flex items-center justify-between gap-2">
      <ValidationSummary />
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onClose}
          className="btn-secondary px-3 py-2 sm:px-6 sm:py-2 text-sm"
        >
          <span className="sm:hidden">✕</span>
          <span className="hidden sm:inline">Annuler</span>
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
  );

  return (
    <>
      <StandardModal
        isOpen={isOpen}
        onClose={onClose}
        title="Location & Validation"
        subtitle={`Assigner un emplacement - opération ${operation.id}`}
        icon={MapPin}
        size="lg"
        maxHeight="95vh"
        hideDefaultFooter={true}
        customFooter={<CustomFooter />}
        preventBackdropClose={isProcessing}
      >
        {({ showNotification: modalNotificationFn }) => {
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
                  <h4 className="text-lg font-semibold text-gray-900">Détails de l'Opération</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-gray-600 font-medium">Conteneur:</span>
                    <div className="font-semibold text-gray-900">{operation.containerNumber}</div>
                    {operation.secondContainerNumber && (
                      <div className="font-semibold text-gray-900">{operation.secondContainerNumber}</div>
                    )}
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 font-medium">Taille & Quantité:</span>
                    <div className="font-semibold text-gray-900">
                      {operation.containerSize} • Qté: {operation.containerQuantity}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 font-medium">Client:</span>
                    <div className="font-semibold text-gray-900">{operation.clientName}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 font-medium">Statut:</span>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {operation.status.toLocaleUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 font-medium">Chauffeur:</span>
                    <div className="font-semibold text-gray-900">{operation.driverName}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 font-medium">Camion:</span>
                    <div className="font-semibold text-gray-900">{operation.truckNumber}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 font-medium">Transporteur:</span>
                    <div className="font-semibold text-gray-900">{operation.transportCompany}</div>
                  </div>
                  {operation.bookingReference && (
                    <div>
                      <span className="text-sm text-gray-600 font-medium">Booking:</span>
                      <div className="font-semibold text-gray-900 break-all">{operation.bookingReference}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Étape 1: Évaluation des Dommages */}
              <div>
                <div className="bg-orange-50 rounded-lg p-4 mb-4 border border-orange-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <h4 className="font-semibold text-orange-900">Étape 1: Évaluation des Dommages</h4>
                  </div>
                  <p className="text-sm text-orange-700 mb-3">
                    L'évaluation détermine le processus d'assignation. L'EDI GATE IN sera transmis dès la finalisation.
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
                      <div className={`flex items-center space-x-2 p-3 rounded-lg ${damageAssessment?.hasDamage
                        ? 'bg-red-100 border border-red-200'
                        : 'bg-green-100 border border-green-200'
                        }`}>
                        {damageAssessment?.hasDamage ? (
                          <>
                            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-red-800">Dommages Détectés</p>
                              <p className="text-sm text-red-700">Type: {damageAssessment.damageType} — {damageAssessment.damageDescription}</p>
                              <p className="text-xs text-red-600 mt-1">→ Assignation en zone tampon requise</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-green-800">Aucun Dommage Détecté</p>
                              <p className="text-sm text-green-700">Sélection d'emplacement physique requise</p>
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

              {/* Étape 2A: Sélection du Stack Tampon (si dommages) */}
              {assessmentCompleted && damageAssessment?.hasDamage && (
                <div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <Shield className="h-5 w-5 text-red-600" />
                      <h4 className="font-semibold text-red-900">Étape 2: Sélection du Stack Tampon</h4>
                    </div>

                    {loadingBufferStacks ? (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Loader className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Chargement des stacks tampons...</span>
                      </div>
                    ) : bufferStacks.length === 0 ? (
                      <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-800">Aucun stack tampon disponible</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            Veuillez créer un stack tampon dans <strong>Stack Management</strong> en cochant
                            "Zone Tampon" avant de continuer.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-red-700 mb-2">
                          Sélectionnez le stack tampon où ce conteneur endommagé sera stocké en attente de traitement.
                        </p>
                        {bufferStacks.map(stack => {
                          const availableSpaces = stack.capacity - stack.currentOccupancy;
                          const isFull = availableSpaces <= 0;
                          const isSelected = selectedBufferStackId === stack.id;

                          return (
                            <button
                              key={stack.id}
                              onClick={() => !isFull && setSelectedBufferStackId(stack.id)}
                              disabled={isFull}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${isFull
                                ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                : isSelected
                                  ? 'border-red-500 bg-red-50 ring-2 ring-red-300'
                                  : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50 cursor-pointer'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-semibold text-gray-900 text-sm">
                                    {stack.sectionName}
                                  </span>
                                  <span className="ml-2 text-xs text-gray-500">— Stack #{stack.stackNumber}</span>
                                </div>
                                <div className="text-right">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isFull
                                    ? 'bg-red-100 text-red-700'
                                    : availableSpaces <= 2
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-green-100 text-green-700'
                                    }`}>
                                    {isFull ? 'Plein' : `${availableSpaces} libre${availableSpaces > 1 ? 's' : ''}`}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
                                <span>Capacité: {stack.currentOccupancy}/{stack.capacity}</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${isFull ? 'bg-red-500' : 'bg-green-500'
                                      }`}
                                    style={{ width: `${Math.min((stack.currentOccupancy / stack.capacity) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-3 bg-red-100 rounded-lg p-3">
                      <p className="font-medium text-red-800 text-sm">ℹ️ EDI GATE IN automatique</p>
                      <p className="text-xs text-red-700 mt-1">
                        L'EDI GATE IN sera transmis automatiquement lors de la finalisation, même en zone tampon.
                        Aucun renvoi EDI ne sera effectué lors de la réassignation ultérieure.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 2B: Sélection d'emplacement normal (si pas de dommages) */}
              {assessmentCompleted && !damageAssessment?.hasDamage && (
                <div>
                  <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">Étape 2: Sélection d'Emplacement</h4>
                    </div>
                    <p className="text-sm text-blue-700">
                      Sélectionnez l'emplacement final pour ce conteneur. L'EDI GATE IN sera transmis à la finalisation.
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

              {/* Time Tracking - Admin uniquement */}
              {canManageTimeTracking && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Clock className="h-5 w-5 text-gray-600" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Suivi Horaire (Admin)</h4>
                      <p className="text-sm text-gray-600">Optionnel: Heure de départ du camion — Par défaut: heure actuelle</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date de départ du camion
                      </label>
                      <DatePicker
                        value={truckDepartureDate}
                        onChange={setTruckDepartureDate}
                        placeholder="Date actuelle"
                        required={false}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Heure de départ du camion
                      </label>
                      <TimePicker
                        value={truckDepartureTime}
                        onChange={setTruckDepartureTime}
                        placeholder="Heure actuelle"
                        required={false}
                        includeSeconds={true}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
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
