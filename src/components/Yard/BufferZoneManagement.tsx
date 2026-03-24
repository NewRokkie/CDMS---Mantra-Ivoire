import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, Truck, Calendar } from 'lucide-react';
import { handleError } from '../../services/errorHandling';
import { containerService } from '../../services/api';
import { bufferZoneService } from '../../services/api';

/**
 * Props for the BufferZoneManagement component
 * Container for managing buffer zone operations and damaged containers
 */
interface BufferZoneManagementProps {}

interface BufferZoneContainer {
  id: string;
  containerNumber: string;
  containerSize: string;
  containerType: string;
  clientName: string;
  clientCode: string;
  transporter: string;
  damageType: string;
  damageDescription: string;
  assignedLocation: string;
  assignedStack: string;
  bufferStackName: string;
  createdAt: Date | string;
  daysInBuffer: number;
}

interface BufferZoneStats {
  totalBufferStacks: number;
  totalCapacity: number;
  currentOccupancy: number;
  availableSpaces: number;
  utilizationRate: number;
}

export const BufferZoneManagement: React.FC<BufferZoneManagementProps> = () => {
  const [containers, setContainers] = useState<BufferZoneContainer[]>([]);
  const [stats, setStats] = useState<BufferZoneStats>({
    totalBufferStacks: 0,
    totalCapacity: 0,
    currentOccupancy: 0,
    availableSpaces: 0,
    utilizationRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBufferZoneData();
  }, []);

  const loadBufferZoneData = async () => {
    setLoading(true);
    try {
      // Get buffer zone entries (empty string for yardId will be ignored in the query)
      const bufferEntries = await bufferZoneService.getActiveBufferZoneEntries('');
      
      // Get container details for each entry
      const allContainers = await containerService.getAll();
      const containerMap = new Map(allContainers.map(c => [c.id || '-', c]));

      const bufferContainers: BufferZoneContainer[] = [];
      
      for (const entry of bufferEntries) {
        const container = containerMap.get(entry.containerId);
        const createdAtDate = new Date(entry.createdAt);
        if (container) {
          bufferContainers.push({
            id: container.id,
            containerNumber: container.number,
            containerSize: container.size,
            containerType: container.type,
            clientName: container.clientName || '—',
            clientCode: container.clientCode || '—',
            transporter: container.transporter || '—',
            damageType: entry.damageType || 'General',
            damageDescription: entry.damageDescription || '—',
            assignedLocation: container.location || '—',  // Use container.location instead of entry.assignedLocation
            // BufferZoneEntry does not expose an assignedStack field, so use buffer stack info instead
            assignedStack: entry.bufferStackName || (entry.bufferStackNumber ? `S${entry.bufferStackNumber}` : '—'),
            bufferStackName: entry.bufferStackName || '—',
            createdAt: entry.createdAt,
            daysInBuffer: Math.floor((Date.now() - createdAtDate.getTime()) / (1000 * 60 * 60 * 24))
          });
        }
      }

      setContainers(bufferContainers);

      // Get stats (empty string for yardId will be ignored)
      const bufferStats = await bufferZoneService.getBufferZoneStats('');
      setStats(bufferStats);

    } catch (error) {
      handleError(error, 'BufferZoneManagement.loadBufferZoneData');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <AlertTriangle className="w-6 h-6 mr-3 text-orange-600" />
              Zone Tampon (Buffer Zone)
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Conteneurs endommagés en attente de traitement
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Stacks Tampon</p>
              <p className="stat text-gray-900"><span className="font-numeric">{stats.totalBufferStacks}</span></p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Capacité Totale</p>
              <p className="stat text-gray-900"><span className="font-numeric">{stats.totalCapacity}</span></p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">En Zone Tampon</p>
              <p className="stat text-orange-600"><span className="font-numeric">{stats.currentOccupancy}</span></p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-600 h-2 rounded-full"
                style={{ width: `${stats.utilizationRate}%` }}
              ></div>
            </div>
            <p className="numeric-text text-gray-500 mt-1"><span className="text-xs">{stats.utilizationRate.toFixed(1)}% utilisé</span></p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Places Disponibles</p>
              <p className="stat text-green-600"><span className="font-numeric">{stats.availableSpaces}</span></p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Containers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            Conteneurs en Zone Tampon (<span className="font-numeric">{containers.length}</span>)
          </h3>
        </div>

        {containers.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Aucun conteneur en zone tampon</p>
            <p className="text-gray-400 text-sm mt-2">
              Les conteneurs endommagés assignés à la zone tampon apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Container
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transporter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dommage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days in Buffer
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {containers.map((container) => (
                  <tr key={container.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {container.containerNumber}
                          </div>
                          <div className="text-xs text-gray-500">
                            {container.containerSize} • {container.containerType}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {container.clientName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {container.clientCode}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Truck className="w-4 h-4 mr-2 text-gray-400" />
                        {container.transporter}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {container.damageType}
                      </div>
                      <div className="text-xs text-gray-500">
                        {container.damageDescription}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {container.assignedLocation}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        <span className={`font-numeric ${container.daysInBuffer > 3 ? 'text-orange-600 font-medium' : ''}`}>
                          {container.daysInBuffer}
                        </span>
                        <span className="ml-1">days</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
