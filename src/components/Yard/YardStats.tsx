import React from 'react';
import { Package, TrendingUp, AlertTriangle, Wrench, Building, BarChart3, Activity, Clock, Users } from 'lucide-react';
import { Yard } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';

interface YardStatsProps {
  stats: {
    totalContainers: number;
    inDepot: number;
    maintenance: number;
    cleaning: number;
    damaged: number;
    occupancyRate: number;
    totalStacks: number;
  };
  currentYard: Yard;
}

export const YardStats: React.FC<YardStatsProps> = ({ stats, currentYard }) => {
  const { t } = useLanguage();

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600 bg-red-100';
    if (rate >= 75) return 'text-orange-600 bg-orange-100';
    if (rate >= 50) return 'text-green-600 bg-green-100';
    return 'text-blue-600 bg-blue-100';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900">{t('yard.stats.title')}</h3>
      
      <div className="space-y-3">
      {/* Total Containers */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">{t('dashboard.stats.containers')}</p>
            <p className="text-xl font-bold text-gray-900">{stats.totalContainers}</p>
          </div>
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
        </div>
      </div>

        {/* Occupancy Rate */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">{t('dashboard.stats.occupancy')}</p>
            <p className="text-xl font-bold text-gray-900">{formatPercentage(stats.occupancyRate)}</p>
          </div>
          <div className={`p-2 rounded-lg ${getOccupancyColor(stats.occupancyRate)}`}>
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                stats.occupancyRate >= 90 ? 'bg-red-500' :
                stats.occupancyRate >= 75 ? 'bg-orange-500' :
                stats.occupancyRate >= 50 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(stats.occupancyRate, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

        {/* In Depot */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">{t('yard.stats.activeContainers')}</p>
            <p className="text-xl font-bold text-gray-900">{stats.inDepot}</p>
          </div>
          <div className="p-2 bg-green-100 rounded-lg">
            <Activity className="h-5 w-5 text-green-600" />
          </div>
        </div>
      </div>

        {/* Maintenance */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">{t('yard.stats.maintenance')}</p>
            <p className="text-xl font-bold text-gray-900">{stats.maintenance}</p>
          </div>
          <div className="p-2 bg-orange-100 rounded-lg">
            <Wrench className="h-5 w-5 text-orange-600" />
          </div>
        </div>
      </div>

        {/* Cleaning */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">{t('yard.stats.cleaning')}</p>
            <p className="text-xl font-bold text-gray-900">{stats.cleaning}</p>
          </div>
          <div className="p-2 bg-purple-100 rounded-lg">
            <Clock className="h-5 w-5 text-purple-600" />
          </div>
        </div>
      </div>

        {/* Damaged */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">{t('yard.stats.damaged')}</p>
            <p className="text-xl font-bold text-gray-900">{stats.damaged}</p>
          </div>
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
        </div>
      </div>

        {/* Total Stacks */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-600">{t('yard.stats.totalStacks')}</p>
            <p className="text-xl font-bold text-gray-900">{stats.totalStacks}</p>
          </div>
          <div className="p-2 bg-teal-100 rounded-lg">
            <BarChart3 className="h-5 w-5 text-teal-600" />
          </div>
        </div>
      </div>
      </div>
      
      {/* Yard Information */}
      {currentYard && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">{t('yard.info.title')}</h4>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>{t('yard.info.layout')}</span>
              <span className="font-medium capitalize">{currentYard.layout}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('yard.info.sections')}</span>
              <span className="font-medium">{currentYard.sections.length}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('yard.info.totalCapacity')}</span>
              <span className="font-medium">{currentYard.totalCapacity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('yard.info.currentOccupancy')}</span>
              <span className="font-medium">{currentYard.currentOccupancy.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};