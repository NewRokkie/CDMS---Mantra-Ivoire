import React from 'react';
import { X, Package, Users, Grid3x3 as Grid3X3, MapPin, Calendar } from 'lucide-react';
import { YardStack } from '../../types/yard';

interface StackDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stack: YardStack | null;
}

export const StackDetailsModal: React.FC<StackDetailsModalProps> = ({
  isOpen,
  onClose,
  stack
}) => {
  if (!isOpen || !stack) return null;

  const utilizationRate = stack.capacity > 0 ? (stack.currentOccupancy / stack.capacity) * 100 : 0;

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
                <h3 className="text-lg font-bold text-gray-900">
                  Stack Details
                </h3>
                <p className="text-sm text-gray-600">
                  Stack {stack.stackNumber.toString().padStart(2, '0')} • {stack.sectionName || 'Zone A'}
                </p>
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">

            {/* Basic Information */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Basic Information
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Stack Number</span>
                  <div className="font-medium text-gray-900">S{stack.stackNumber.toString().padStart(2, '0')}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Section</span>
                  <div className="font-medium text-gray-900">{stack.sectionName || 'Zone A'}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Container Size</span>
                  <div className="font-medium text-gray-900">{stack.containerSize || '20ft'}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Stack Type</span>
                  <div className="font-medium text-gray-900">
                    {stack.isSpecialStack ? 'Special' : 'Regular'}
                  </div>
                </div>
              </div>
            </div>

            {/* Capacity Information */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                <Grid3X3 className="h-5 w-5 mr-2" />
                Capacity & Utilization
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-blue-700">Current Occupancy</span>
                  <div className="font-medium text-blue-900">{stack.currentOccupancy} containers</div>
                </div>
                <div>
                  <span className="text-sm text-blue-700">Total Capacity</span>
                  <div className="font-medium text-blue-900">{stack.capacity} containers</div>
                </div>
                <div>
                  <span className="text-sm text-blue-700">Rows</span>
                  <div className="font-medium text-blue-900">{stack.rows}</div>
                </div>
                <div>
                  <span className="text-sm text-blue-700">Max Tiers</span>
                  <div className="font-medium text-blue-900">{stack.maxTiers}</div>
                </div>
              </div>

              {/* Utilization Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-blue-700 mb-2">
                  <span>Utilization Rate</span>
                  <span>{utilizationRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      utilizationRate >= 90 ? 'bg-red-500' :
                      utilizationRate >= 75 ? 'bg-orange-500' :
                      utilizationRate >= 25 ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Client Assignment */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Client Assignment
              </h4>

              {stack.assignedClientCode ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-green-900">Assigned to Client</div>
                    <div className="text-sm text-green-700">{stack.assignedClientCode}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Not Assigned</div>
                    <div className="text-sm text-gray-600">This stack is available for client assignment</div>
                  </div>
                </div>
              )}
            </div>

            {/* Physical Properties */}
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Physical Properties
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-purple-700">Width</span>
                  <div className="font-medium text-purple-900">{stack.dimensions?.width || 2.5}m</div>
                </div>
                <div>
                  <span className="text-sm text-purple-700">Length</span>
                  <div className="font-medium text-purple-900">{stack.dimensions?.length || 12}m</div>
                </div>
                <div>
                  <span className="text-sm text-purple-700">Position X</span>
                  <div className="font-medium text-purple-900">{stack.position?.x || 0}</div>
                </div>
                <div>
                  <span className="text-sm text-purple-700">Position Y</span>
                  <div className="font-medium text-purple-900">{stack.position?.y || 0}</div>
                </div>
              </div>
            </div>

            {/* Status Information */}
            <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
              <h4 className="font-semibold text-orange-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Status & Activity
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-orange-700">Status</span>
                  <div className="font-medium text-orange-900">
                    {stack.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-orange-700">Stack Type</span>
                  <div className="font-medium text-orange-900">
                    {stack.isOddStack ? 'Odd Stack' : 'Even Stack'}
                  </div>
                </div>
              </div>

              {stack.notes && (
                <div className="mt-4">
                  <span className="text-sm text-orange-700">Notes</span>
                  <div className="mt-1 text-sm text-orange-900 bg-white rounded p-2 border">
                    {stack.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-end">
            <button
              type="button"
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
