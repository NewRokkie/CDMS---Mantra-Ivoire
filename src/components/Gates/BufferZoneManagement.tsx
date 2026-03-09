import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Package, AlertTriangle, CheckCircle, Loader, X, ArrowRight, RotateCcw } from 'lucide-react';
import { StandardModal } from '../Common/Modal/StandardModal';
import { StackSelectionButton } from './GateInModal/StackSelectionButton';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { bufferZoneService, BufferZoneEntry } from '../../services/bufferZoneService';
import { supabase } from '../../services/api/supabaseClient';
import { logger } from '../../utils/logger';
import { useTheme } from '../../hooks/useTheme';

interface BufferZoneManagementProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

interface ReleaseModalState {
  isOpen: boolean;
  entry: BufferZoneEntry | null;
  selectedStackId: string;
  selectedStackLocation: string;
  releaseNotes: string;
  isProcessing: boolean;
  error: string;
}

const INITIAL_RELEASE_STATE: ReleaseModalState = {
  isOpen: false,
  entry: null,
  selectedStackId: '',
  selectedStackLocation: '',
  releaseNotes: '',
  isProcessing: false,
  error: '',
};

export const BufferZoneManagement: React.FC<BufferZoneManagementProps> = ({
  isOpen,
  onClose,
  onRefresh,
}) => {
  const { user } = useAuth();
  const { currentYard } = useYard();
  const { theme } = useTheme();

  const [entries, setEntries] = useState<BufferZoneEntry[]>([]);
  const [stats, setStats] = useState({ totalBufferStacks: 0, totalCapacity: 0, currentOccupancy: 0, availableSpaces: 0, utilizationRate: 0 });
  const [loading, setLoading] = useState(false);
  const [release, setRelease] = useState<ReleaseModalState>(INITIAL_RELEASE_STATE);

  const loadData = useCallback(async () => {
    if (!currentYard?.id) return;
    setLoading(true);
    try {
      const [loadedEntries, loadedStats] = await Promise.all([
        bufferZoneService.getActiveBufferZoneEntries(currentYard.id),
        bufferZoneService.getBufferZoneStats(currentYard.id),
      ]);
      setEntries(loadedEntries);
      setStats(loadedStats);
    } catch (err) {
      logger.error('Impossible de charger les données zone tampon', 'BufferZoneManagement', err);
    } finally {
      setLoading(false);
    }
  }, [currentYard?.id]);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, loadData]);

  // --- Release flow ---
  const openReleaseModal = (entry: BufferZoneEntry) => {
    setRelease({ ...INITIAL_RELEASE_STATE, isOpen: true, entry });
  };

  const closeReleaseModal = () => {
    setRelease(INITIAL_RELEASE_STATE);
  };

  const handleStackSelect = (stackId: string, location: string) => {
    setRelease(prev => ({ ...prev, selectedStackId: stackId, selectedStackLocation: location, error: '' }));
  };

  const handleRelease = async () => {
    if (!release.entry) return;
    if (!release.selectedStackId || !release.selectedStackLocation) {
      setRelease(prev => ({ ...prev, error: 'Veuillez sélectionner un emplacement de destination.' }));
      return;
    }
    if (!release.releaseNotes.trim()) {
      setRelease(prev => ({ ...prev, error: 'Un commentaire est obligatoire (ex: réparation effectuée, date...).' }));
      return;
    }

    setRelease(prev => ({ ...prev, isProcessing: true, error: '' }));
    try {
      await bufferZoneService.releaseContainerFromBufferZone({
        containerId: release.entry!.containerId,
        newLocation: release.selectedStackLocation,
        newStackId: release.selectedStackId,
        releaseNotes: release.releaseNotes.trim(),
        releasedBy: user?.id || 'system',
      });

      // Also update gate_in_damage_assessments: update assigned location
      const { data: container } = await supabase
        .from('containers')
        .select('id')
        .eq('id', release.entry!.containerId)
        .single();

      if (container) {
        // Update gate_in_damage_assessments assigned stack location
        await supabase
          .from('gate_in_damage_assessments')
          .update({
            assigned_location: release.selectedStackLocation,
            assigned_stack: release.selectedStackLocation.match(/^S\d+/)?.[0] || null,
          })
          .eq('gate_in_operation_id', release.entry!.gateInOperationId || '');
      }

      closeReleaseModal();
      await loadData();
      onRefresh?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setRelease(prev => ({ ...prev, isProcessing: false, error: msg }));
    }
  };

  // Get container size from entry
  const getContainerSize = (entry: BufferZoneEntry): '20ft' | '40ft' => {
    if (entry.containerSize?.includes('40')) return '40ft';
    return '20ft';
  };

  if (!isOpen) return null;

  return (
    <>
      <StandardModal
        isOpen={isOpen}
        onClose={onClose}
        title="Gestion des Zones Tampons"
        subtitle="Conteneurs endommagés en attente de traitement"
        icon={Shield}
        size="xl"
        maxHeight="90vh"
      >
        {() => (
          <div className="space-y-6">

            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Stacks Tampons', value: stats.totalBufferStacks, color: 'blue' },
                { label: 'Capacité totale', value: stats.totalCapacity, color: 'gray' },
                { label: 'En zone tampon', value: stats.currentOccupancy, color: 'orange' },
                { label: 'Taux utilisation', value: `${stats.utilizationRate}%`, color: stats.utilizationRate > 80 ? 'red' : 'green' },
              ].map(stat => (
                <div key={stat.label} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                  <div className={`text-2xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}>{stat.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* EDI reminder */}
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300 flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
              <span>
                <strong>Rappel EDI :</strong> L'EDI GATE IN a déjà été transmis lors de l'assignation en zone tampon.
                La libération vers un emplacement physique ne déclenchera <strong>pas</strong> de nouvelle transmission EDI.
              </span>
            </div>

            {/* Containers in buffer */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Conteneurs en Zone Tampon ({entries.length})
              </h4>

              {loading ? (
                <div className="flex items-center justify-center p-8 text-gray-500 dark:text-gray-400">
                  <Loader className="h-5 w-5 animate-spin mr-2" />
                  <span>Chargement...</span>
                </div>
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-gray-400 dark:text-gray-500">
                  <CheckCircle className="h-8 w-8 mb-2 text-green-400 dark:text-green-500" />
                  <p className="text-sm">Aucun conteneur en zone tampon actuellement.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map(entry => (
                    <div
                      key={entry.id}
                      className="border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="h-9 w-9 rounded-full bg-orange-100 dark:bg-orange-800 flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {entry.containerNumber || entry.containerId.slice(0, 8)}
                            {entry.containerSize && (
                              <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">
                                {entry.containerSize}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 space-x-2">
                            {entry.bufferStackName && (
                              <span>Stack: <strong>{entry.bufferStackName}</strong></span>
                            )}
                            {entry.damageType && (
                              <span>• Dommage: <strong className="text-orange-700 dark:text-orange-400">{entry.damageType}</strong></span>
                            )}
                          </div>
                          {entry.damageDescription && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic">{entry.damageDescription}</p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Entré le {new Date(entry.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => openReleaseModal(entry)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>Libérer (Réassigner)</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </StandardModal>

      {/* Release Modal */}
      {release.isOpen && release.entry && (
        <StandardModal
          isOpen={release.isOpen}
          onClose={closeReleaseModal}
          title="Libérer de la Zone Tampon"
          subtitle={`Réassigner ${release.entry.containerNumber || 'le conteneur'} à un emplacement physique`}
          icon={ArrowRight}
          size="lg"
          maxHeight="90vh"
          preventBackdropClose={release.isProcessing}
        >
          {() => (
            <div className="space-y-6">

              {/* Container info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  {release.entry!.containerNumber || release.entry!.containerId}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  {release.entry!.damageType && (
                    <div>Type de dommage: <strong className="text-orange-700 dark:text-orange-400">{release.entry!.damageType}</strong></div>
                  )}
                  {release.entry!.damageDescription && (
                    <div className="italic text-gray-500 dark:text-gray-400">{release.entry!.damageDescription}</div>
                  )}
                </div>
              </div>

              {/* EDI warning */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300 flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
                <span>
                  Aucun EDI ne sera envoyé lors de cette réassignation. Le statut du dommage sera
                  passé à <strong>bon état</strong> et le conteneur sera retiré de la zone tampon.
                </span>
              </div>

              {/* Comment (mandatory) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Commentaire de libération <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={release.releaseNotes}
                  onChange={e => setRelease(prev => ({ ...prev, releaseNotes: e.target.value, error: '' }))}
                  placeholder="Ex: Réparation effectuée le 23/02/2026 par [technicien]..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">Ce commentaire est obligatoire et sera conservé dans l'historique.</p>
              </div>

              {/* Stack selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emplacement de destination <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Sélectionnez un stack {getContainerSize(release.entry!) === '40ft' ? 'virtuel (40ft)' : 'physique (20ft)'} disponible.
                </p>
                <StackSelectionButton
                  selectedStack={release.selectedStackLocation}
                  onStackSelect={handleStackSelect}
                  containerSize={getContainerSize(release.entry!)}
                  containerQuantity={1}
                  yardId={currentYard?.id || ''}
                  required={true}
                  clientCode={undefined}
                />
              </div>

              {/* Error */}
              {release.error && (
                <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{release.error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-2 border-t border-gray-200">
                <button
                  onClick={closeReleaseModal}
                  disabled={release.isProcessing}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleRelease}
                  disabled={release.isProcessing || !release.selectedStackId || !release.releaseNotes.trim()}
                  className="flex items-center space-x-2 px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {release.isProcessing ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Libération...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Confirmer la Libération</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}
        </StandardModal>
      )}
    </>
  );
};