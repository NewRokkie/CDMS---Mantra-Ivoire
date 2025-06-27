import React from 'react';
import { Yard, YardSection } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface YardSectionCardsProps {
  yard: Yard;
  selectedSection: YardSection | null;
  onSectionSelect: (section: YardSection | null) => void;
}

export const YardSectionCards: React.FC<YardSectionCardsProps> = ({
  yard,
  selectedSection,
  onSectionSelect
}) => {
  const { getClientFilter } = useAuth();
  const clientFilter = getClientFilter();

  const getSectionStats = (section: YardSection) => {
    const totalCapacity = section.stacks.reduce((sum, stack) => sum + stack.capacity, 0);
    const currentOccupancy = clientFilter
      ? section.stacks.reduce((sum, stack) => 
          sum + stack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length, 0)
      : section.stacks.reduce((sum, stack) => sum + stack.currentOccupancy, 0);
    
    return {
      totalCapacity,
      currentOccupancy,
      utilization: totalCapacity > 0 ? Math.round((currentOccupancy / totalCapacity) * 100) : 0,
      stackCount: section.stacks.length
    };
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {yard.sections.map((section) => {
        const stats = getSectionStats(section);
        return (
          <div
            key={section.id}
            onClick={() => onSectionSelect(selectedSection?.id === section.id ? null : section)}
            className={`bg-white rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
              selectedSection?.id === section.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{section.name}</h3>
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: section.color }}
              />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Stacks:</span>
                <span className="font-medium">{stats.stackCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Capacity:</span>
                <span className="font-medium">{stats.totalCapacity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {clientFilter ? 'Your Containers:' : 'Occupied:'}
                </span>
                <span className="font-medium">{stats.currentOccupancy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Utilization:</span>
                <span className={`font-medium ${getOccupancyColor(stats.utilization).split(' ')[0]}`}>
                  {stats.utilization}%
                </span>
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    stats.utilization >= 90
                      ? 'bg-red-500'
                      : stats.utilization >= 70
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${stats.utilization}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};