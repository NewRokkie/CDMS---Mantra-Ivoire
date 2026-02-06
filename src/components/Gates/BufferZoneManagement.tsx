import React, { useState, useEffect } from 'react';
import { Shield, Trash2, AlertTriangle, Package, MapPin, Settings } from 'lucide-react';
import { bufferZoneService } from '../../services/bufferZoneService';
import { useYard } from '../../hooks/useYard';
import { useAuth } from '../../hooks/useAuth';
import { YardStack } from '../../types/yard';
import { handleError } from '../../services/errorHandling';
import { useToast } from '../../hooks/useToast';

interface BufferZoneManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BufferZoneManagement: React.FC<BufferZoneManagementProps> = ({
  isOpen,
  onClose
}) => {
  const { currentYard } = useYard();
  const { user } = useAuth();
  const toast = useToast();
  
  const [bufferStacks, setBufferStacks] = useState<YardStack[]>([]);
  const [stats, setStats] = useState({
    totalBufferStacks: 0,
    totalCapacity: 0,
    currentOccupancy: 0,
    availableSpaces: 0,
    utilizationRate: 0
  });
  const [loading, setLoading] = useState(true);

  const canManageBufferZones = user?.role === 'admin' || user?.role === 'supervisor';

  useEffect(() => {
    if (isOpen && currentYard?.id) {
      loadBufferZones();
    }
  }, [isOpen, currentYard?.id]);

  const loadBufferZones = async () => {
    if (!currentYard?.id) return;

    try {
      setLoading(true);
      const [stacks, statistics] = await Promise.all([
        bufferZoneService.getBufferStacks(currentYard.id),
        bufferZoneService.getBufferZoneStats(currentYard.id)
      ]);

      setBufferStacks(stacks);
      setStats(statistics);
    } catch (error) {
      handleError(error, 'BufferZoneManagement.loadBufferZones');
      toast.error('Erreur lors du chargement des zones tampons');
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupEmpty = async () => {
    if (!currentYard?.id || !canManageBufferZones) return;

    try {
      const deletedCount = await bufferZoneService.cleanupEmptyBufferStacks(currentYard.id);
      
      if (deletedCount > 0) {
        toast.success(`${deletedCount} zone(s) tampon vide(s) supprimée(s)`);
        await loadBufferZones();
      } else {
        toast.info('Aucune zone tampon vide à supprimer');
      }
    } catch (error) {
      handleError(error, 'BufferZoneManagement.handleCleanupEmpty');
      toast.error('Erreur lors du nettoyage des zones tampons');
    }
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-red-600';
    if (rate >= 60) return 'text-orange-600';
    if (rate >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getDamageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      structural: 'Structurel',
      surface: 'Surface',
      door: 'Porte',
      corner: 'Coin',
      seal: 'Joint',
      roof: 'Toit',
      floor: 'Plancher',
      general: 'Général',
      other: 'Autre'
    };
    return labels[type] || type;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-bold">Gestion des Zones Tampons</h2>
                <p className="text-orange-100">
                  Zones de stockage temporaire pour conteneurs endommagés
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-orange-100 hover:text-white p-2 rounded-lg hover:bg-orange-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Stacks Tampons</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalBufferStacks}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Capacité Totale</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-1">{stats.totalCapacity}</p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Occupation</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900 mt-1">
                    {stats.currentOccupancy} / {stats.totalCapacity}
                  </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center space-x-2">
                    <Settings className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Taux d'Occupation</span>
                  </div>
                  <p className={`text-2xl font-bold mt-1 ${getUtilizationColor(stats.utilizationRate)}`}>
                    {stats.utilizationRate}%
                  </p>
                </div>
              </div>

              {/* Actions */}
              {canManageBufferZones && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Actions de Gestion</h3>
                    <p className="text-sm text-gray-600">
                      Gérer les zones tampons et optimiser l'espace
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleCleanupEmpty}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Nettoyer Vides</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Buffer Stacks List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Zones Tampons Actives ({bufferStacks.length})
                </h3>

                {bufferStacks.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      Aucune Zone Tampon
                    </h4>
                    <p className="text-gray-600">
                      Les zones tampons seront créées automatiquement lors de la détection de conteneurs endommagés.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bufferStacks.map((stack) => (
                      <div
                        key={stack.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Stack {String(stack.stackNumber).padStart(4, '0')}
                            </h4>
                            <p className="text-sm text-gray-600">{stack.sectionName}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            stack.bufferZoneType === 'damage' 
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {stack.bufferZoneType || 'Général'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Taille:</span>
                            <span className="font-medium">{stack.containerSize}</span>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Occupation:</span>
                            <span className="font-medium">
                              {stack.currentOccupancy} / {stack.capacity}
                            </span>
                          </div>

                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                stack.currentOccupancy / stack.capacity >= 0.8
                                  ? 'bg-red-500'
                                  : stack.currentOccupancy / stack.capacity >= 0.6
                                  ? 'bg-orange-500'
                                  : 'bg-green-500'
                              }`}
                              style={{
                                width: `${Math.min(100, (stack.currentOccupancy / stack.capacity) * 100)}%`
                              }}
                            ></div>
                          </div>

                          {stack.damageTypesSupported && stack.damageTypesSupported.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-gray-600 mb-1">Types de dommages:</p>
                              <div className="flex flex-wrap gap-1">
                                {stack.damageTypesSupported.map((type) => (
                                  <span
                                    key={type}
                                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                                  >
                                    {getDamageTypeLabel(type)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Information */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">
                      À propos des Zones Tampons
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Les zones tampons sont créées automatiquement pour les conteneurs endommagés</li>
                      <li>• Elles n'existent pas physiquement dans le dépôt</li>
                      <li>• Elles ne font pas partie des stacks virtuels créés par fusion</li>
                      <li>• Elles permettent un suivi temporaire en attendant réparation ou traitement</li>
                      <li>• Les numéros de stack commencent à partir de 9000</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};