import React from 'react';
import { Calendar, Package, User, Truck, MapPin, AlertTriangle, CheckCircle, Clock, FileText } from 'lucide-react';
import { PendingGateOut } from './types';

interface MobileGateOutOperationsTableProps {
  operations: PendingGateOut[];
  searchTerm: string;
  selectedFilter: string;
  onOperationClick: (operation: PendingGateOut) => void;
}

export const MobileGateOutOperationsTable: React.FC<MobileGateOutOperationsTableProps> = ({
  operations,
  searchTerm,
  selectedFilter,
  onOperationClick
}) => {
  // Filter operations based on search and filter
  const getFilteredOperations = () => {
    let filtered = operations;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(op =>
        (op.bookingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (op.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (op.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (op.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      );
    }

    // Apply status filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(op => op.status === selectedFilter);
    }

    return filtered;
  };

  const filteredOperations = getFilteredOperations();

  const getStatusBadge = (status: PendingGateOut['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: Clock },
      in_process: { color: 'bg-blue-100 text-blue-800', label: 'In Process', icon: AlertTriangle },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed', icon: CheckCircle }
    };
    
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      {/* Mobile Card Layout */}
      <div className="lg:hidden space-y-4">
        {filteredOperations.map((operation) => (
          <div
            key={operation.id}
            onClick={() => onOperationClick(operation)}
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            {/* Card Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-gray-900 text-lg">
                    {operation.bookingNumber || 'No Booking'}
                  </span>
                  {operation.bookingType && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      operation.bookingType === 'IMPORT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {operation.bookingType}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(operation.status)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {operation.processedContainers}/{operation.totalContainers}
                </div>
                <div className="text-xs text-gray-500">containers</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress</span>
                <span className="text-sm text-gray-500">
                  {Math.round((operation.processedContainers / operation.totalContainers) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    operation.processedContainers === operation.totalContainers
                      ? 'bg-green-500'
                      : operation.processedContainers > 0
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                  }`}
                  style={{ width: `${(operation.processedContainers / operation.totalContainers) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {operation.remainingContainers} containers remaining
              </div>
            </div>

            {/* Card Content */}
            <div className="space-y-3">
              {/* Client Info */}
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <User className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{operation.clientName}</div>
                  <div className="text-sm text-gray-500">{operation.clientCode}</div>
                </div>
              </div>

              {/* Transport Info */}
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Truck className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{operation.driverName}</div>
                  <div className="text-sm text-gray-500">{operation.vehicleNumber} • {operation.transportCompany}</div>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {formatDate(operation.date)}
                  </span>
                </div>
                {operation.estimatedReleaseDate && (
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    Est: {operation.estimatedReleaseDate.toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Notes */}
              {operation.notes && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs text-gray-700 font-medium mb-1">Notes</div>
                  <div className="text-sm text-gray-900">{operation.notes}</div>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredOperations.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No operations found</h3>
            <p className="text-gray-600 text-sm px-4">
              {searchTerm ? "Try adjusting your search criteria." : "No gate out operations have been created yet."}
            </p>
          </div>
        )}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Gate Out Operations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Containers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Truck Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOperations.map((operation) => (
                <tr key={operation.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {operation.date?.toLocaleDateString() || '-'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {operation.date?.toLocaleTimeString() || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {operation.bookingNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {operation.bookingType && (
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        operation.bookingType === 'IMPORT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {operation.bookingType}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {operation.clientName || 'Unknown Client'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {operation.clientCode || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {operation.processedContainers}/{operation.totalContainers}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round((operation.processedContainers / operation.totalContainers) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            operation.processedContainers === operation.totalContainers
                              ? 'bg-green-500'
                              : operation.processedContainers > 0
                              ? 'bg-blue-500'
                              : 'bg-gray-300'
                          }`}
                          style={{ width: `${(operation.processedContainers / operation.totalContainers) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {operation.remainingContainers} remaining
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {operation.vehicleNumber || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {operation.driverName || '-'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {operation.transportCompany || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(operation.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOperations.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No operations found</h3>
            <p className="text-gray-600">
              {searchTerm ? "Try adjusting your search criteria." : "No gate out operations have been created yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};