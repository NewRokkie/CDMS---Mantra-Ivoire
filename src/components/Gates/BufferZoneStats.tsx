import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { bufferZoneService } from '../../services/bufferZoneService';
import { useYard } from '../../hooks/useYard';
import { handleError } from '../../services/errorHandling';

interface BufferZoneStatsProps {
  className?: string;
}

export const BufferZoneStats: React.FC<BufferZoneStatsProps> = ({ className = '' }) => {
  const { currentYard } = useYard();
  const [stats, setStats] = useState({
    totalBufferStacks: 0,
    totalCapacity: 0,
    currentOccupancy: 0,
    availableSpaces: 0,
    utilizationRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      if (!currentYard?.id) {
        setLoading(false);
        return;
      }

      try {
        const bufferStats = await bufferZoneService.getBufferZoneStats(currentYard.id);
        setStats(bufferStats);
      } catch (error) {
        handleError(error, 'BufferZoneStats.loadStats');
        // Garder les stats par défaut en cas d'erreur
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [currentYard?.id]);

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl lg:rounded-lg border border-gray-100 lg:border-gray-200 p-4 shadow-sm ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
            <div className="w-24 h-4 bg-gray-200 rounded"></div>
          </div>
          <div className="w-8 h-6 bg-gray-200 rounded mb-1"></div>
          <div className="w-20 h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-red-600';
    if (rate >= 60) return 'text-orange-600';
    if (rate >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUtilizationBgColor = (rate: number) => {
    if (rate >= 80) return 'bg-red-100';
    if (rate >= 60) return 'bg-orange-100';
    if (rate >= 40) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  return (
    <div className={`bg-white rounded-2xl lg:rounded-lg border border-gray-100 lg:border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 lg:hover:scale-100 active:scale-95 ${className}`}>
      <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-2 lg:space-y-0">
        <div className={`p-3 lg:p-2 ${getUtilizationBgColor(stats.utilizationRate)} rounded-xl lg:rounded-lg shadow-lg lg:shadow-none`}>
          <Shield className={`h-6 w-6 lg:h-5 lg:w-5 ${getUtilizationColor(stats.utilizationRate)}`} />
        </div>
        <div className="lg:ml-3 flex-1">
          <div className="flex items-center justify-center lg:justify-start space-x-2">
            <p className="text-2xl lg:text-lg font-bold text-gray-900">{stats.currentOccupancy}</p>
            <span className="text-sm text-gray-500">/ {stats.totalCapacity}</span>
          </div>
          <p className="text-xs font-medium text-gray-500 leading-tight">Zones Tampons</p>
          
          {/* Détails supplémentaires pour desktop */}
          <div className="hidden lg:block mt-1 space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Stacks tampons:</span>
              <span className="font-medium">{stats.totalBufferStacks}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Taux d'occupation:</span>
              <span className={`font-medium ${getUtilizationColor(stats.utilizationRate)}`}>
                {stats.utilizationRate}%
              </span>
            </div>
            {stats.availableSpaces > 0 && (
              <div className="flex items-center justify-between text-xs text-green-600">
                <span>Places disponibles:</span>
                <span className="font-medium">{stats.availableSpaces}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerte si taux d'occupation élevé */}
      {stats.utilizationRate >= 80 && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-xs text-red-700 font-medium">
              Zones tampons saturées ({stats.utilizationRate}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};