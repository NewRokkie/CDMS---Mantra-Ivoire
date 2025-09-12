import React from 'react';
import {
  X,
  Building,
  MapPin,
  Settings,
  Clock,
  User,
  Phone,
  Mail,
  Calendar,
  Package,
  TrendingUp,
  Users as UsersIcon
} from 'lucide-react';
import { Yard } from '../../types';

interface DepotDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  depot: Yard | null;
}

export const DepotDetailModal: React.FC<DepotDetailModalProps> = ({
  isOpen,
  onClose,
  depot
}) => {
  if (!isOpen || !depot) return null;

  const utilizationRate = (depot.currentOccupancy / depot.totalCapacity) * 100;

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600 bg-red-100';
    if (rate >= 75) return 'text-orange-600 bg-orange-100';
    if (rate >= 25) return 'text-green-600 bg-green-100';
    return 'text-blue-600 bg-blue-100';
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
        isActive
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'
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
            <Building className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{depot.name}</h2>
              <p className="text-sm text-gray-600">{depot.code}</p>
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
                <Building className="h-5 w-5 mr-2 text-gray-500" />
                Basic Information
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-sm text-gray-900">{depot.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Code</label>
                  <p className="text-sm text-gray-900">{depot.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-sm text-gray-900">{depot.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Layout</label>
                  <p className="text-sm text-gray-900 capitalize">{depot.layout}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">{getStatusBadge(depot.isActive)}</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-gray-500" />
                Location & Capacity
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p className="text-sm text-gray-900">{depot.location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Capacity</label>
                  <p className="text-sm text-gray-900">{depot.totalCapacity.toLocaleString()} containers</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Current Occupancy</label>
                  <p className="text-sm text-gray-900">{depot.currentOccupancy.toLocaleString()} containers</p>
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
              </div>
            </div>
          </div>

          {/* Contact Information */}
          {depot.contactInfo && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-gray-500" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Manager</label>
                  <p className="text-sm text-gray-900">{depot.contactInfo.manager || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-sm text-gray-900">{depot.contactInfo.phone || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm text-gray-900">{depot.contactInfo.email || 'Not specified'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Address */}
          {depot.address && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-gray-500" />
                Address
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Street</label>
                  <p className="text-sm text-gray-900">{depot.address.street || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">City</label>
                  <p className="text-sm text-gray-900">{depot.address.city || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">State/Region</label>
                  <p className="text-sm text-gray-900">{depot.address.state || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">ZIP Code</label>
                  <p className="text-sm text-gray-900">{depot.address.zipCode || 'Not specified'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Country</label>
                  <p className="text-sm text-gray-900">{depot.address.country || 'Not specified'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Operating Settings */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-gray-500" />
              Operating Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Timezone</label>
                <p className="text-sm text-gray-900">{depot.timezone || 'Not specified'}</p>
              </div>
            </div>
          </div>

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
                  {depot.createdAt.toLocaleDateString()} by {depot.createdBy}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm text-gray-900">
                  {depot.updatedAt.toLocaleDateString()} by {depot.updatedBy || depot.createdBy}
                </p>
              </div>
            </div>
          </div>

          {/* Yard Sections Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Package className="h-5 w-5 mr-2 text-gray-500" />
              Yard Structure
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{depot.sections.length}</div>
                <div className="text-sm text-gray-600">Sections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {depot.sections.reduce((total, section) => total + section.stacks.length, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Stacks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {depot.sections.reduce((total, section) =>
                    total + section.stacks.reduce((stackTotal, stack) => stackTotal + stack.capacity, 0), 0
                  )}
                </div>
                <div className="text-sm text-gray-600">Total Stack Capacity</div>
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