import React, { useState } from 'react';
import { X, Package, MapPin, Calendar, User, Truck, FileText, AlertTriangle, CheckCircle, Clock, Building, Eye } from 'lucide-react';
import { Container } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { AuditLogModal } from './AuditLogModal';
import { getDaysBetween } from '../../utils/dateHelpers';

interface ContainerViewModalProps {
  container: Container;
  onClose: () => void;
}

export const ContainerViewModal: React.FC<ContainerViewModalProps> = ({
  container,
  onClose
}) => {
  const { canViewAllData, hasModuleAccess } = useAuth();
  const [showAuditModal, setShowAuditModal] = useState(false);

  const canViewAuditLogs = hasModuleAccess('auditLogs');

  const getStatusIcon = (status: Container['status']) => {
    switch (status) {
      case 'in_depot':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'out_depot':
        return <Truck className="h-5 w-5 text-blue-600" />;
      case 'in_service':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'maintenance':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'cleaning':
        return <Package className="h-5 w-5 text-purple-600" />;
      default:
        return <Package className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: Container['status']) => {
    const statusConfig = {
      in_depot: { color: 'bg-green-100 text-green-800', label: 'In Depot' },
      out_depot: { color: 'bg-blue-100 text-blue-800', label: 'Out Depot' },
      in_service: { color: 'bg-yellow-100 text-yellow-800', label: 'In Service' },
      maintenance: { color: 'bg-red-100 text-red-800', label: 'Maintenance' },
      cleaning: { color: 'bg-purple-100 text-purple-800', label: 'Cleaning' }
    };

    const config = statusConfig[status];
    return (
      <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${config.color}`}>
        {getStatusIcon(status)}
        <span className="ml-2">{config.label}</span>
      </span>
    );
  };

  const getTypeIcon = (type: Container['type']) => {
    switch (type) {
      case 'reefer':
        return '❄️';
      case 'tank':
        return '🛢️';
      case 'flat_rack':
        return '📦';
      case 'open_top':
        return '📂';
      default:
        return '📦';
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl w-full max-w-2xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">

          {/* Modal Header */}
          <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-600 text-white rounded-xl">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Container Details</h3>
                  <p className="text-sm text-gray-600 mt-1">{container.number}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Modal Body - Scrollable */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="space-y-6">

              {/* Container Information */}
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Container Information
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-blue-700 font-medium">Container Number:</span>
                      <div className="text-lg font-bold text-gray-900 mt-1">{container.number}</div>
                    </div>

                    <div>
                      <span className="text-sm text-blue-700 font-medium">Type & Size:</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-2xl">{getTypeIcon(container.type)}</span>
                        <span className="font-medium text-gray-900">
                          {container.type.charAt(0).toUpperCase() + container.type.slice(1)} • {container.size}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-sm text-blue-700 font-medium">Status:</span>
                      <div className="mt-1">
                        {getStatusBadge(container.status)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-blue-700 font-medium">Current Location:</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900">{container.location}</span>
                      </div>
                    </div>

                    {container.gateInDate && (
                      <div>
                        <span className="text-sm text-blue-700 font-medium">Gate In Date:</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {container.gateInDate.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}

                    {container.gateOutDate && (
                      <div>
                        <span className="text-sm text-blue-700 font-medium">Gate Out Date:</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {container.gateOutDate.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Client Information */}
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Client Information
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-green-700 font-medium">Client Name:</span>
                    <div className="font-medium text-gray-900 mt-1">
                      {canViewAllData() ? container.client : 'Your Company'}
                    </div>
                  </div>

                  {container.clientCode && (
                    <div>
                      <span className="text-sm text-green-700 font-medium">Client Code:</span>
                      <div className="font-medium text-gray-900 mt-1">{container.clientCode}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Release Order Information */}
              {container.releaseOrderId && (
                <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Release Order Information
                  </h4>

                  <div>
                    <span className="text-sm text-purple-700 font-medium">Release Order ID:</span>
                    <div className="font-medium text-gray-900 mt-1">{container.releaseOrderId}</div>
                  </div>
                </div>
              )}

              {/* Damage Information */}
              {container.damage && container.damage.length > 0 && (
                <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                  <h4 className="font-semibold text-red-900 mb-4 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Damage Reports
                  </h4>

                  <div className="space-y-2">
                    {container.damage.map((damage, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-sm text-gray-900">{damage}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Additional Information</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Container ID:</span>
                    <div className="font-medium text-gray-900">{container.id}</div>
                  </div>

                  <div>
                    <span className="text-gray-600">Days in Depot:</span>
                    <div className="font-medium text-gray-900">
                      {container.gateInDate ? getDaysBetween(container.gateInDate) : 'N/A'} days
                    </div>
                  </div>
                </div>

                {/* Audit Log Button */}
                {canViewAuditLogs && container.auditLogs && container.auditLogs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowAuditModal(true)}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Audit Log ({container.auditLogs.length} entries)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
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

      {/* Audit Log Modal */}
      {showAuditModal && (
        <AuditLogModal
          auditLogs={container.auditLogs}
          onClose={() => setShowAuditModal(false)}
          containerNumber={container.number}
        />
      )}
    </>
  );
};
