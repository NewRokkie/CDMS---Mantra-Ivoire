import React from 'react';
import { X, Package, MapPin, Grid3X3, Ruler, Users, Calendar, BarChart3 } from 'lucide-react';
import { YardStack, YardSection } from '../../../types/yard';

interface StackDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  stack: YardStack | null;
  sections: YardSection[];
}

export const StackDetailModal: React.FC<StackDetailModalProps> = ({
  isOpen,
  onClose,
  stack,
  sections
}) => {
  if (!isOpen || !stack) return null;

  const section = sections.find(s => s.id === stack.sectionId);
  const utilizationRate = stack.capacity > 0 ? (stack.currentOccupancy / stack.capacity) * 100 : 0;

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600 bg-red-100';
    if (rate >= 75) return 'text-orange-600 bg-orange-100';
    if (rate >= 25) return 'text-green-600 bg-green-100';
    return 'text-blue-600 bg-blue-100';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 text-white rounded-lg">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Stack Details</h3>
                <p className="text-sm text-gray-600">Stack {stack.stackNumber.toString().padStart(2, '0')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">

            {/* Basic Information */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Stack Number:</span>
                  <div className="font-bold text-gray-900 text-lg">S{stack.stackNumber.toString().padStart(2, '0')}</div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Section:</span>
                  <div className="font-medium text-gray-900">{section?.name || 'Unknown'}</div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Layout:</span>
                  <div className="font-medium text-gray-900">{stack.rows} Rows × {stack.maxTiers} Tiers</div>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Type:</span>
                  <div className="font-medium text-gray-900">
                    {stack.isOddStack ? 'Odd Stack' : 'Standard Stack'}
                  </div>
                </div>
              </div>
            </div>

            {/* Capacity & Occupancy */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Capacity & Occupancy
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-green-700 font-medium">Total Capacity:</span>
                    <div className="font-bold text-gray-900 text-xl">{stack.capacity}</div>
                    <div className="text-green-600">containers</div>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Current Occupancy:</span>
                    <div className="font-bold text-gray-900 text-xl">{stack.currentOccupancy}</div>
                    <div className="text-green-600">containers</div>
                  </div>
                  <div>
                    <span className="text-green-700 font-medium">Available Space:</span>
                    <div className="font-bold text-gray-900 text-xl">{stack.capacity - stack.currentOccupancy}</div>
                    <div className="text-green-600">containers</div>
                  </div>
                </div>

                {/* Utilization Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800">Utilization Rate</span>
                    <span className={`text-sm font-bold px-2 py-1 rounded ${getUtilizationColor(utilizationRate)}`}>
                      {utilizationRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all duration-300 ${
                        utilizationRate >= 90 ? 'bg-red-500' :
                        utilizationRate >= 75 ? 'bg-orange-500' :
                        utilizationRate >= 25 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Position & Dimensions */}
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Position & Dimensions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-purple-700 font-medium">Position:</span>
                  <div className="font-medium text-gray-900">
                    X: {stack.position.x}, Y: {stack.position.y}, Z: {stack.position.z}
                  </div>
                </div>
                <div>
                  <span className="text-purple-700 font-medium">Dimensions:</span>
                  <div className="font-medium text-gray-900">
                    {stack.dimensions.width}m × {stack.dimensions.length}m
                  </div>
                </div>
                <div>
                  <span className="text-purple-700 font-medium">Physical Area:</span>
                  <div className="font-medium text-gray-900">
                    {(stack.dimensions.width * stack.dimensions.length).toFixed(1)} m²
                  </div>
                </div>
                <div>
                  <span className="text-purple-700 font-medium">Container Density:</span>
                  <div className="font-medium text-gray-900">
                    {((stack.capacity) / (stack.dimensions.width * stack.dimensions.length)).toFixed(1)} containers/m²
                  </div>
                </div>
              </div>
            </div>

            {/* Container Positions */}
            <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-4 flex items-center">
                <Grid3X3 className="h-5 w-5 mr-2" />
                Container Layout
              </h4>
              
              {/* Visual grid representation */}
              <div className="space-y-3">
                <div className="text-sm text-orange-700 mb-2">
                  Container positions (Row × Tier layout):
                </div>
                <div 
                  className="grid gap-1 bg-white p-3 rounded border border-orange-200"
                  style={{ 
                    gridTemplateColumns: `repeat(${stack.rows}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${stack.maxTiers}, minmax(0, 1fr))`
                  }}
                >
                  {Array.from({ length: stack.rows * stack.maxTiers }, (_, index) => {
                    const row = Math.floor(index / stack.rows) + 1;
                    const col = (index % stack.rows) + 1;
                    const isOccupied = Math.random() > 0.7; // Mock occupancy
                    
                    return (
                      <div
                        key={index}
                        className={`aspect-square rounded text-xs flex items-center justify-center font-medium ${
                          isOccupied 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                        title={`Row ${col}, Tier ${row}`}
                      >
                        {col},{row}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center space-x-4 text-xs text-orange-600">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Occupied</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded"></div>
                    <span>Available</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};