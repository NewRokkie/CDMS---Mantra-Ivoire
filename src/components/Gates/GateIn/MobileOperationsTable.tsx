import React from 'react';
import { Calendar, Package, User, Truck, MapPin, AlertTriangle, CheckCircle, Clock, ChevronRight, Wifi, WifiOff, XCircle } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';

interface Operation {
  id: string;
  date: Date;
  createdAt: Date;
  containerNumber: string;
  secondContainerNumber?: string;
  containerSize: string;
  containerType?: string;
  clientCode: string;
  clientName: string;
  truckNumber?: string;
  vehicleNumber?: string;
  driverName: string;
  transportCompany: string;
  operationStatus: 'pending' | 'completed';
  assignedLocation?: string;
  bookingReference?: string;
  status: 'pending' | 'in_process' | 'completed' | 'cancelled';
  classification?: 'divers' | 'alimentaire';
  completedAt?: Date;
  ediTransmitted?: boolean;
  ediLogId?: string;
  ediErrorMessage?: string;
}

interface MobileOperationsTableProps {
  operations: Operation[];
  searchTerm: string;
  selectedFilter: string;
  onClearSearch?: () => void;
  onClearFilter?: () => void;
}

export const MobileOperationsTable: React.FC<MobileOperationsTableProps> = ({
  operations,
  searchTerm,
  selectedFilter,
  onClearSearch,
  onClearFilter
}) => {
  const { theme } = useTheme();

  // Filter operations based on selected filter
  const getFilteredOperations = () => {
    let filtered = operations;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(op =>
        op.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.truckNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (op.secondContainerNumber && op.secondContainerNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (selectedFilter !== 'all') {
      switch (selectedFilter) {
        case 'pending':
          filtered = filtered.filter(op => op.status === 'pending');
          break;
        case 'completed':
          filtered = filtered.filter(op => op.status === 'completed');
          break;
        case 'alimentaire':
          filtered = filtered.filter(op => op.classification === 'alimentaire');
          break;
        case 'divers':
          filtered = filtered.filter(op => op.classification === 'divers');
          break;
      }
    }

    return filtered;
  };

  const filteredOperations = getFilteredOperations();

  const getStatusBadge = (status?: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700', label: 'Pending', icon: Clock },
      in_process: { color: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700', label: 'In Process', icon: Clock },
      completed: { color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700', label: 'Completed', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700', label: 'Cancelled', icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full border-2 ${config.color}`}>
        <Icon className="h-3.5 w-3.5 mr-1.5" />
        {config.label}
      </span>
    );
  };

  const getEDIStatusBadge = (operation: Operation) => {
    // Only show EDI status for completed operations
    if (operation.status !== 'completed') {
      return null;
    }

    if (operation.ediTransmitted === true) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700">
          <Wifi className="h-3 w-3 mr-1" />
          EDI Sent
        </span>
      );
    } else if (operation.ediTransmitted === false) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700">
          <XCircle className="h-3 w-3 mr-1" />
          EDI Failed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
          <WifiOff className="h-3 w-3 mr-1" />
          No EDI
        </span>
      );
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4 px-4 lg:px-0">
      {/* Mobile-First Card Layout */}
      <div className="space-y-4 lg:space-y-0 lg:bg-white dark:bg-gray-800 lg:rounded-lg lg:border lg:border-gray-200 dark:lg:border-gray-700 lg:overflow-hidden">
        {/* Desktop Table Header */}
        <div className="hidden lg:block px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Gate In Operations</h3>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Entry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Container
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Truck
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  EDI Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOperations.map((operation) => (
                <tr
                  key={operation.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {operation.completedAt?.toLocaleDateString() || operation.createdAt.toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {operation.completedAt?.toLocaleTimeString() || operation.createdAt.toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{operation.containerNumber}</div>
                    {operation.secondContainerNumber && (
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{operation.secondContainerNumber}</div>
                    )}
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {operation.containerSize} • {
                        // FIX: Ensure containerType is not null/undefined before processing string methods
                        operation.containerType
                          ? operation.containerType.charAt(0).toUpperCase() + operation.containerType.slice(1).replace('_', ' ')
                          : '' // Render an empty string if containerType is missing
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{operation.clientCode}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{operation.clientName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {operation.truckNumber}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{operation.driverName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{operation.transportCompany}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(operation.status)}
                      {operation.classification === 'alimentaire' && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          Alimentaire
                        </span>
                      )}
                      {operation.classification === 'divers' && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          Divers
                        </span>
                      )}
                    </div>
                    {operation.bookingReference && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {operation.bookingReference}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {operation.assignedLocation || (
                      <span className="text-gray-400 dark:text-gray-500 italic">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getEDIStatusBadge(operation)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout */}
        <div className="lg:hidden space-y-3">
          {filteredOperations.map((operation) => (
            <div
              key={operation.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl active:shadow-md transition-all duration-300 overflow-hidden"
            >
              {/* Card Header with gradient */}
              <div className="bg-gradient-to-r from-gray-50 dark:from-gray-700 to-blue-50 dark:to-gray-600 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 bg-blue-600 rounded-lg shadow-sm">
                        <Package className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-base truncate">
                        {operation.containerNumber}
                      </span>
                      {operation.secondContainerNumber && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                          +1
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(operation.status)}
                      {operation.classification === 'alimentaire' && (
                        <span className="flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Alimentaire
                        </span>
                      )}
                      {getEDIStatusBadge(operation)}
                    </div>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {operation.containerSize}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {/* This version is safer as `undefined` renders as nothing in React */}
                      {operation.containerType?.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="px-5 py-4 space-y-3.5">
                {/* Client Info */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 p-2.5 bg-purple-100 dark:bg-purple-800 rounded-xl">
                    <User className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">{operation.clientName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{operation.clientCode}</div>
                  </div>
                </div>

                {/* Transport Info */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 p-2.5 bg-green-100 dark:bg-green-800 rounded-xl">
                    <Truck className="h-5 w-5 text-green-600 dark:text-green-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">{operation.driverName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-mono font-medium">{operation.truckNumber}</span>
                      <span className="mx-1.5">•</span>
                      <span>{operation.transportCompany}</span>
                    </div>
                  </div>
                </div>

                {/* Location & Date */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Location</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {operation.assignedLocation || 'Pending'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Date</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatDate(operation.completedAt || operation.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Reference */}
                {operation.bookingReference && (
                  <div className="bg-gradient-to-r from-blue-50 dark:from-blue-900/30 to-blue-100 dark:to-blue-800/30 rounded-xl p-3 border border-blue-200 dark:border-blue-700">
                    <div className="text-xs text-blue-700 dark:text-blue-300 font-bold mb-0.5">Booking Reference</div>
                    <div className="text-sm text-blue-900 dark:text-blue-100 font-mono font-bold">{operation.bookingReference}</div>
                  </div>
                )}
              </div>

              {/* Card Footer with action hint */}
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tap to view details</span>
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
            </div>
          ))}
        </div>

        {/* Empty State - No Operations Available */}
        {filteredOperations.length === 0 && (
          <div className="px-4 py-12 lg:py-16 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                <Package className="h-12 w-12 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Operations Available</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  {searchTerm || selectedFilter !== 'all'
                    ? 'No operations match your current search or filter criteria.'
                    : 'No gate in operations have been recorded yet. Create your first operation to get started.'
                  }
                </p>
              </div>
              {(searchTerm || selectedFilter !== 'all') && (
                <button
                  onClick={() => {
                    onClearSearch?.();
                    onClearFilter?.();
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm"
                >
                  Clear filters to see all operations
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
