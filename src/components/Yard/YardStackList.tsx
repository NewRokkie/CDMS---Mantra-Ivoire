import React from 'react';
import { Yard, YardSection, YardStack } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface YardStackListProps {
  yard: Yard;
  selectedSection: YardSection | null;
  selectedStack: YardStack | null;
  onStackSelect: (stack: YardStack | null) => void;
}

export const YardStackList: React.FC<YardStackListProps> = ({
  yard,
  selectedSection,
  selectedStack,
  onStackSelect
}) => {
  const { user, getClientFilter } = useAuth();
  const clientFilter = getClientFilter();

  const getOccupancyPercentage = (stack: YardStack) => {
    const occupancy = clientFilter 
      ? stack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length
      : stack.currentOccupancy;
    return Math.round((occupancy / stack.capacity) * 100);
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {selectedSection ? `${selectedSection.name} Stacks` : 'All Stacks'}
        </h3>
        <p className="text-sm text-gray-600">
          {yard.layout === 'tantarelli' ? 'Odd-numbered stacks only' : 'Standard grid layout'}
        </p>
      </div>
      <div className="max-h-96 overflow-y-auto scrollbar-primary">
        {(selectedSection ? selectedSection.stacks : yard.sections.flatMap(s => s.stacks))
          .sort((a, b) => a.stackNumber - b.stackNumber)
          .map((stack) => {
            const occupancyPercentage = getOccupancyPercentage(stack);
            const isSelected = selectedStack?.id === stack.id;
            
            return (
              <div
                key={stack.id}
                onClick={() => onStackSelect(isSelected ? null : stack)}
                className={`p-3 border-b border-gray-100 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50 border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      Stack {stack.stackNumber.toString().padStart(2, '0')}
                      {yard.layout === 'tantarelli' && stack.isOddStack && ' ●'}
                    </span>
                    {yard.layout === 'tantarelli' && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {stack.stackNumber === 1 ? 'ENTRY' :
                         stack.stackNumber === 31 ? 'END' :
                         stack.stackNumber >= 61 && stack.stackNumber <= 71 ? 'HIGH' :
                         stack.stackNumber === 101 ? 'SINGLE' :
                         stack.stackNumber === 103 ? 'DOUBLE' :
                         `${stack.rows}R`}
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getOccupancyColor(occupancyPercentage)}`}>
                    {occupancyPercentage}%
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Capacity:</span>
                    <span>{stack.capacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      {clientFilter ? 'Your containers:' : 'Occupied:'}
                    </span>
                    <span>
                      {clientFilter 
                        ? stack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length
                        : stack.currentOccupancy
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rows:</span>
                    <span>{stack.rows}</span>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        occupancyPercentage >= 90
                          ? 'bg-red-500'
                          : occupancyPercentage >= 70
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${occupancyPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};