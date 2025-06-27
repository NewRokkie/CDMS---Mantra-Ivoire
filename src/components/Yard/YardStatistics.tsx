import React from 'react';
import { Building, Package, Grid3X3, MapPin, AlertTriangle } from 'lucide-react';
import { Yard } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface YardStatisticsProps {
  yard: Yard;
}

export const YardStatistics: React.FC<YardStatisticsProps> = ({ yard }) => {
  const { user, getClientFilter } = useAuth();
  const clientFilter = getClientFilter();

  const getYardStats = (yard: Yard) => {
    const totalCapacity = yard.sections.reduce((sum, section) => 
      sum + section.stacks.reduce((stackSum, stack) => stackSum + stack.capacity, 0), 0);
    
    const currentOccupancy = clientFilter
      ? yard.sections.reduce((sum, section) => 
          sum + section.stacks.reduce((stackSum, stack) => 
            stackSum + stack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length, 0), 0)
      : yard.sections.reduce((sum, section) => 
          sum + section.stacks.reduce((stackSum, stack) => stackSum + stack.currentOccupancy, 0), 0);
    
    return {
      totalCapacity,
      currentOccupancy,
      utilization: totalCapacity > 0 ? Math.round((currentOccupancy / totalCapacity) * 100) : 0,
      sectionCount: yard.sections.length,
      stackCount: yard.sections.reduce((sum, section) => sum + section.stacks.length, 0)
    };
  };

  const yardStats = getYardStats(yard);

  return (
    <div className="space-y-4">
      {/* Client Notice */}
      {clientFilter && (
        <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
          <p className="text-sm text-blue-800">
            Viewing containers for <strong>{user?.company}</strong> only
          </p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">
                {clientFilter ? 'Your Containers' : 'Total Containers'}
              </p>
              <p className="text-lg font-semibold text-gray-900">{yardStats.currentOccupancy.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Capacity</p>
              <p className="text-lg font-semibold text-gray-900">{yardStats.totalCapacity.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Grid3X3 className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Stacks</p>
              <p className="text-lg font-semibold text-gray-900">{yardStats.stackCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <MapPin className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Sections</p>
              <p className="text-lg font-semibold text-gray-900">{yardStats.sectionCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <span className="text-lg">📊</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Utilization</p>
              <p className="text-lg font-semibold text-gray-900">{yardStats.utilization}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};