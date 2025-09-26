import React from 'react';
import { X, Grid3x3 as Grid3X3, Package, MapPin, Calendar, User, BarChart3, Settings, AlertTriangle, CheckCircle, Ruler, Layers } from 'lucide-react';
import { Stack } from '../../types/stack';
import { Yard } from '../../types/yard';

interface StackDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  stack: Stack | null;
  yard: Yard;
}

export const StackDetailModal: React.FC<StackDetailModalProps> = ({
  isOpen,
  onClose,
  stack,
  yard
}) => {
  if (!isOpen || !stack) return null;

  const section = yard.sections.find(s => s.id === stack.sectionId);
  const utilizationRate = stack.capacity > 0 ? (stack.currentOccupancy / stack.capacity) * 100 : 0;

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600 bg-red-100';
    if (rate >= 75) return 'text-orange-600 bg-orange-100';
    if (rate >= 25) return 'text-green-600 bg-green-100';
    return 'text-blue-600 bg-blue-100';
  };

  const getSizeBadge = (size: Stack['containerSize']) => {
    const config = {
      '20ft': { color: 'bg-blue-100 text-blue-800', label: '20ft Only' },
      '40ft': { color: 'bg-orange-100 text-orange-800', label: '40ft Only' },
      'both': { color: 'bg-green-100 text-green-800', label: 'Both Sizes' }
    };

    const { color, label } = config[size];
    return (
      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${color}`}>
        {label}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Grid3X3 className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Stack {stack.stackNumber.toString().padStart(2, '0')} Details
              </h2>
              <p className="text-sm text-gray-600">{yard.name} - {section?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Grid3X3 className="h-5 w-5 mr-2 text-gray-500" />
                Basic Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Stack Number</label>
                  <p className="text-lg font-bold text-gray-900">
                    {stack.stackNumber.toString().padStart(2, '0')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Section</label>
                  <p className="text-sm text-gray-900">{section?.name || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Container Size Support</label>
                  <div className="mt-1">{getSizeBadge(stack.containerSize)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <div className="mt-1">
                    {stack.isSpecialStack ? (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        Special Stack
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Regular Stack
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">{getStatusBadge(stack.isActive)}</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-gray-500" />
                Capacity & Utilization
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Occupancy</label>
                  <p className="text-lg font-bold text-gray-900">
                    {stack.currentOccupancy} / {stack.capacity}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Utilization Rate</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-sm font-medium px-2 py-1 rounded ${getUtilizationColor(utilizationRate)}`}>
                      {utilizationRate.toFixed(1)}%
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          utilizationRate >= 90 ? 'bg-red-500' :
                          utilizationRate >= 75 ? 'bg-orange-500' :
                          utilizationRate >= 25 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Available Positions</label>
                  <p className="text-sm text-gray-900">{stack.capacity - stack.currentOccupancy}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Dimensions</label>
                  <p className="text-sm text-gray-900">
                    {stack.rows} rows × {stack.maxTiers} tiers
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Physical Specifications */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Ruler className="h-5 w-5 mr-2 text-gray-500" />
              Physical Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Physical Width</label>
                <p className="text-sm text-gray-900">{stack.dimensions.width}m</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Physical Length</label>
                <p className="text-sm text-gray-900">{stack.dimensions.length}m</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Position</label>
                <p className="text-sm text-gray-900">
                  X:{stack.position.x}, Y:{stack.position.y}, Z:{stack.position.z}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Area</label>
                <p className="text-sm text-gray-900">
                  {(stack.dimensions.width * stack.dimensions.length).toLocaleString()}m²
                </p>
              </div>
            </div>
          </div>

          {/* Assignment Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-gray-500" />
              Assignment Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Assigned Client</label>
                <p className="text-sm text-gray-900">
                  {stack.assignedClientCode ? (
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {stack.assignedClientCode}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Unassigned</span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Assignment Type</label>
                <p className="text-sm text-gray-900">
                  {stack.assignedClientCode ? 'Client Pool' : 'General Use'}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {stack.notes && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
              <p className="text-sm text-gray-700">{stack.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-gray-500" />
              Metadata
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Created</label>
                <p className="text-sm text-gray-900">
                  {stack.createdAt.toLocaleDateString()} by {stack.createdBy}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm text-gray-900">
                  {stack.updatedAt.toLocaleDateString()} by {stack.updatedBy || stack.createdBy}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};