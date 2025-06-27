import React from 'react';
import { X } from 'lucide-react';
import { Yard, YardStack } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface YardStackDetailsProps {
  yard: Yard;
  selectedStack: YardStack;
  onClose: () => void;
}

export const YardStackDetails: React.FC<YardStackDetailsProps> = ({
  yard,
  selectedStack,
  onClose
}) => {
  const { user, getClientFilter } = useAuth();
  const clientFilter = getClientFilter();

  const getOccupancyPercentage = (stack: YardStack) => {
    const occupancy = clientFilter 
      ? stack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length
      : stack.currentOccupancy;
    return Math.round((occupancy / stack.capacity) * 100);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Stack {selectedStack.stackNumber.toString().padStart(2, '0')} Details
          {yard.layout === 'tantarelli' && selectedStack.isOddStack && ' ●'}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Stack Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Stack Number:</span>
              <span className="font-medium">{selectedStack.stackNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Rows:</span>
              <span className="font-medium">{selectedStack.rows}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Max Tiers:</span>
              <span className="font-medium">{selectedStack.maxTiers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Capacity:</span>
              <span className="font-medium">{selectedStack.capacity} containers</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                {clientFilter ? 'Your containers:' : 'Current Occupancy:'}
              </span>
              <span className="font-medium">
                {clientFilter 
                  ? selectedStack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length
                  : selectedStack.currentOccupancy
                } containers
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Available Space:</span>
              <span className="font-medium">
                {selectedStack.capacity - (clientFilter 
                  ? selectedStack.containerPositions.filter(p => p.isOccupied && p.clientCode === clientFilter).length
                  : selectedStack.currentOccupancy
                )} containers
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Utilization:</span>
              <span className="font-medium">{getOccupancyPercentage(selectedStack)}%</span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Physical Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Width:</span>
              <span className="font-medium">{selectedStack.dimensions.width}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Length:</span>
              <span className="font-medium">{selectedStack.dimensions.length}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Max Height:</span>
              <span className="font-medium">{selectedStack.maxTiers * 2.6}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Area:</span>
              <span className="font-medium">
                {(selectedStack.dimensions.width * selectedStack.dimensions.length)}m²
              </span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Location</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Section:</span>
              <span className="font-medium">
                {yard.sections.find(s => s.id === selectedStack.sectionId)?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">X Position:</span>
              <span className="font-medium">{selectedStack.position.x}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Y Position:</span>
              <span className="font-medium">{selectedStack.position.y}m</span>
            </div>
            {yard.layout === 'tantarelli' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">
                  {selectedStack.stackNumber === 1 ? 'Entry Stack' :
                   selectedStack.stackNumber === 31 ? 'End Stack' :
                   selectedStack.stackNumber >= 61 && selectedStack.stackNumber <= 71 ? 'High Capacity' :
                   selectedStack.stackNumber === 101 ? 'Single Row' :
                   selectedStack.stackNumber === 103 ? 'Double Row' :
                   'Standard'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-3">Special Features</h4>
          <div className="space-y-2 text-sm">
            {yard.layout === 'tantarelli' && (
              <>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span className="text-gray-600">Odd-numbered stack</span>
                </div>
                {selectedStack.stackNumber >= 61 && selectedStack.stackNumber <= 71 && (
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                    <span className="text-gray-600">High capacity zone</span>
                  </div>
                )}
                {(selectedStack.stackNumber === 1 || selectedStack.stackNumber === 31) && (
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span className="text-gray-600">Terminal stack</span>
                  </div>
                )}
                {(selectedStack.stackNumber === 101 || selectedStack.stackNumber === 103) && (
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                    <span className="text-gray-600">Special configuration</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};