import React from 'react';
import { Package, TrendingUp, AlertTriangle, Wrench, Building, BarChart3 } from 'lucide-react';
import { Yard } from '../../types';

interface YardStatsProps {
  stats: {
    totalContainers: number;
    inDepot: number;
    maintenance: number;
    damaged: number;
    occupancyRate: number;
    totalStacks: number;
  };
  currentYard: Yard;
}

export const YardStats: React.FC<YardStatsProps> = ({ stats, currentYard }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      {/* Total Containers */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Containers</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalContainers}</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      {/* In Depot */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">In Depot</p>
            <p className="text-2xl font-bold text-gray-900">{stats.inDepot}</p>
          </div>
          <div className="p-3 bg-green-100 rounded-lg">
            <Building className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Maintenance */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Maintenance</p>
            <p className="text-2xl font-bold text-gray-900">{stats.maintenance}</p>
          </div>
          <div className="p-3 bg-orange-100 rounded-lg">
            <Wrench className="h-6 w-6 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Damaged */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Damaged</p>
            <p className="text-2xl font-bold text-gray-900">{stats.damaged}</p>
          </div>
          <div className="p-3 bg-red-100 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
        </div>
      </div>

      {/* Occupancy Rate */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Occupancy</p>
            <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate.toFixed(1)}%</p>
          </div>
          <div className="p-3 bg-purple-100 rounded-lg">
            <TrendingUp className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Total Stacks */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Stacks</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalStacks}</p>
          </div>
          <div className="p-3 bg-teal-100 rounded-lg">
            <BarChart3 className="h-6 w-6 text-teal-600" />
          </div>
        </div>
      </div>
    </div>
  );
};