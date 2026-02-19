import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  Layers, 
  Grid3X3, 
  CheckCircle, 
  Container as ContainerIcon,
  Gauge,
  Timer
} from 'lucide-react';
import { Container } from '../../types';
import { YardStack } from '../../types/yard';

interface StackDetailsModalProps {
  stack: YardStack;
  stackViz: any;
  containers: Container[];
  onClose: () => void;
  onSelectContainer: (container: Container) => void;
}

interface ContainerDetails extends Container {
  daysInDepot: number;
  position: string;
}

export const StackDetailsModal: React.FC<StackDetailsModalProps> = ({
  stack,
  containers,
  onClose,
  onSelectContainer
}) => {
  const [containerDetails, setContainerDetails] = useState<ContainerDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStackData = async () => {
      setLoading(true);
      try {
        // Enrichir les données des containers et trier par Row puis Height
        // Ordre de tri: R1H1, R1H2, R1H3, R2H1, R2H2, R2H3, etc.
        const enrichedContainers = containers.map(container => ({
          ...container,
          daysInDepot: container.gateInDate 
            ? Math.floor((new Date().getTime() - new Date(container.gateInDate).getTime()) / (1000 * 60 * 60 * 24))
            : 0,
          position: container.location || `S${String(stack.stackNumber).padStart(2, '0')}-R01-T01`
        })).sort((a, b) => {
          // Extraire Row et Height pour le tri
          const locationMatchA = a.location.match(/S(\d+)[-]?R(\d+)[-]?[TH](\d+)/);
          const locationMatchB = b.location.match(/S(\d+)[-]?R(\d+)[-]?[TH](\d+)/);
          
          if (!locationMatchA && !locationMatchB) return 0;
          if (!locationMatchA) return 1;
          if (!locationMatchB) return -1;
          
          const rowA = parseInt(locationMatchA[2]);
          const heightA = parseInt(locationMatchA[3]);
          const rowB = parseInt(locationMatchB[2]);
          const heightB = parseInt(locationMatchB[3]);
          
          // Trier d'abord par Row, puis par Height
          if (rowA !== rowB) {
            return rowA - rowB;
          }
          return heightA - heightB;
        });
        
        setContainerDetails(enrichedContainers);

      } catch (error) {
        console.error('Error loading stack data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStackData();
  }, [stack, containers]);

  // Calculer les statistiques essentielles (containers réels uniquement)
  const totalContainers = containerDetails.length;
  const occupancyRate = stack.capacity > 0 ? (totalContainers / stack.capacity) * 100 : 0;
  const availableSlots = stack.capacity - totalContainers;
  
  // Calculer la moyenne des jours en dépôt (containers réels uniquement)
  const totalDays = containerDetails.reduce((sum, container) => {
    if (container.gateInDate) {
      const days = Math.floor((new Date().getTime() - new Date(container.gateInDate).getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }
    return sum;
  }, 0);
  const avgDaysInDepot = totalContainers > 0 ? Math.round(totalDays / totalContainers) : 0;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <Grid3X3 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  Stack S{String(stack.stackNumber).padStart(2, '0')} Details
                </h2>
                <p className="text-blue-100 mt-1">
                  {stack.sectionName || 'Zone A'} • {stack.containerSize} Container Stack
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
          {/* PRIORITÉ #1: Containers List */}
          <div className="bg-white border-2 border-blue-200 rounded-xl p-6 mb-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <ContainerIcon className="w-6 h-6 mr-3 text-blue-600" />
                Containers dans ce stack ({containerDetails.length})
              </h3>
            </div>

            {containerDetails.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Aucun container dans ce stack</p>
                <p className="text-gray-400 text-sm mt-2">
                  Ce stack est disponible pour recevoir des containers
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Container Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Transporter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Design
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Row
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Height
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location ID
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {containerDetails.map((container) => {
                      // Extraire Row et Height de la location (format: S07-R02-T03 ou S07R02T03)
                      const locationMatch = container.location.match(/S(\d+)[-]?R(\d+)[-]?[TH](\d+)/);
                      const row = locationMatch ? `R${locationMatch[2]}` : '-';
                      const height = locationMatch ? `H${locationMatch[3]}` : '-';
                      const locationId = locationMatch 
                        ? `S${locationMatch[1].padStart(2, '0')}R${locationMatch[2]}H${locationMatch[3]}`
                        : container.location;
                      
                      // Transporteur : depuis gate_in_operations (saisi à l'entrée)
                      const transporterName = container.transporter ?? '—';

                      // Formater le type de container pour affichage
                      const formatContainerType = (type: string) => {
                        switch (type) {
                          case 'dry': return 'Dry Van';
                          case 'high_cube': return 'High Cube';
                          case 'hard_top': return 'Hard Top';
                          case 'ventilated': return 'Ventilated';
                          case 'reefer': return 'Reefer';
                          case 'tank': return 'Tank';
                          case 'flat_rack': return 'Flat Rack';
                          case 'open_top': return 'Open Top';
                          default: return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                        }
                      };

                      return (
                        <tr
                          key={container.id}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => onSelectContainer(container)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="font-mono text-sm font-bold text-gray-900">
                                {container.number}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {container.clientCode || container.clientName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {transporterName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                              container.size === '40ft' 
                                ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {container.size}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                              container.type === 'reefer' 
                                ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                                : container.type === 'open_top'
                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                : container.type === 'flat_rack'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : container.type === 'tank'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : container.type === 'high_cube'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}>
                              {formatContainerType(container.type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-purple-50 text-purple-700 border border-purple-200">
                              {row}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {height}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 font-mono border border-gray-200">
                              {locationId}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PRIORITÉ #2: Progress Bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Gauge className="w-5 h-5 mr-2 text-blue-600" />
              Utilisation de l'espace
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Occupation actuelle</span>
                <span className="text-xl font-bold text-gray-900">{totalContainers} / {stack.capacity} containers</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden shadow-inner">
                <div
                  className="h-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700 ease-out shadow-sm"
                  style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">0%</span>
                <span className="font-bold text-blue-600 text-lg">{occupancyRate.toFixed(1)}% utilisé</span>
                <span className="text-gray-500">100%</span>
              </div>
            </div>
          </div>

          {/* Stats Cards - Informations complémentaires */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Emplacements libres</p>
                  <p className="text-2xl font-bold text-green-900">
                    {availableSlots}
                  </p>
                  <p className="text-green-600 text-xs">
                    Disponibles maintenant
                  </p>
                </div>
                <div className="bg-green-200 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">Séjour moyen</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {avgDaysInDepot}
                  </p>
                  <p className="text-orange-600 text-xs">
                    Jours en dépôt
                  </p>
                </div>
                <div className="bg-orange-200 p-3 rounded-lg">
                  <Timer className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Row-Tier Configuration */}
          {stack.rowTierConfig && stack.rowTierConfig.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-indigo-600" />
                Configuration par rangée
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {stack.rowTierConfig.map((config, index) => (
                  <div key={index} className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                    <div className="text-center">
                      <div className="text-sm text-indigo-600 font-medium">Rangée {config.row}</div>
                      <div className="text-lg font-bold text-indigo-900">{config.maxTiers}</div>
                      <div className="text-xs text-indigo-600">niveaux max</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {stack.createdAt && (
                <span>Créé le {new Date(stack.createdAt).toLocaleDateString('fr-FR')}</span>
              )}
              {stack.updatedAt && stack.createdAt && stack.updatedAt.getTime() !== stack.createdAt.getTime() && (
                <span> • Modifié le {new Date(stack.updatedAt).toLocaleDateString('fr-FR')}</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};