import React from 'react';
import { Calendar, Package, User, Truck, MapPin, AlertTriangle, CheckCircle, Clock, ChevronRight } from 'lucide-react';

interface Operation {
  id: string;
  date: Date;
  containerNumber: string;
  secondContainerNumber?: string;
  containerSize: string;
  containerType?: string;
  clientCode: string;
  clientName: string;
  truckNumber: string;
  driverName: string;
  transportCompany: string;
  operationStatus: 'pending' | 'completed';
  assignedLocation?: string;
  bookingReference?: string;
  status: 'FULL' | 'EMPTY';
  isDamaged: boolean;
}

interface MobileOperationsTableProps {
  operations: Operation[];
  searchTerm: string;
  selectedFilter: string;
  onOperationClick: (operation: Operation) => void;
}

export const MobileOperationsTable: React.FC<MobileOperationsTableProps> = ({
  operations,
  searchTerm,
  selectedFilter,
  onOperationClick
}) => {
  // Filter operations based on selected filter
  const getFilteredOperations = () => {
    let filtered = operations;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(op =>
        op.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (op.secondContainerNumber && op.secondContainerNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (selectedFilter !== 'all') {
      switch (selectedFilter) {
        case 'pending':
          filtered = filtered.filter(op => op.operationStatus === 'pending');
          break;
        case 'completed':
          filtered = filtered.filter(op => op.operationStatus === 'completed');
          break;
        case 'damaged':
          filtered = filtered.filter(op => op.isDamaged);
          break;
      }
    }

    return filtered;
  };

  const filteredOperations = getFilteredOperations();

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pending', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Completed', icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full border-2 ${config.color}`}>
        <Icon className="h-3.5 w-3.5 mr-1.5" />
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
    <div className="space-y-4 px-4 lg:px-0">
      {/* Mobile-First Card Layout */}
      <div className="space-y-4 lg:space-y-0 lg:bg-white lg:rounded-lg lg:border lg:border-gray-200 lg:overflow-hidden">
        {/* Desktop Table Header */}
        <div className="hidden lg:block px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Recent Gate In Operations</h3>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Truck
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOperations.map((operation) => (
                <tr
                  key={operation.id}
                  onClick={() => onOperationClick(operation)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {operation.date.toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {operation.date.toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{operation.containerNumber}</div>
                    {operation.secondContainerNumber && (
                      <div className="text-sm font-medium text-gray-900">{operation.secondContainerNumber}</div>
                    )}
                    <div className="text-sm text-gray-500">
                      {operation.containerSize} • {operation.containerType?.charAt(0).toUpperCase() + operation.containerType?.slice(1).replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{operation.clientCode}</div>
                    <div className="text-sm text-gray-500">{operation.clientName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {operation.truckNumber}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{operation.driverName}</div>
                    <div className="text-sm text-gray-500">{operation.transportCompany}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(operation.operationStatus)}
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        operation.status === 'FULL' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {operation.status}
                      </span>
                      {operation.isDamaged && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Damaged
                        </span>
                      )}
                    </div>
                    {operation.bookingReference && (
                      <div className="text-xs text-gray-500 mt-1">
                        {operation.bookingReference}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.assignedLocation || (
                      <span className="text-gray-400 italic">Pending</span>
                    )}
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
              onClick={() => onOperationClick(operation)}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl active:shadow-md transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer overflow-hidden"
            >
              {/* Card Header with gradient */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-5 py-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 bg-blue-600 rounded-lg shadow-sm">
                        <Package className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-bold text-gray-900 text-base truncate">
                        {operation.containerNumber}
                      </span>
                      {operation.secondContainerNumber && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded-full">
                          +1
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(operation.operationStatus)}
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        operation.status === 'FULL' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {operation.status}
                      </span>
                      {operation.isDamaged && (
                        <span className="flex items-center px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Damaged
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className="text-sm font-bold text-gray-900">
                      {operation.containerSize}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {operation.containerType?.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="px-5 py-4 space-y-3.5">
                {/* Client Info */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 p-2.5 bg-purple-100 rounded-xl">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">{operation.clientName}</div>
                    <div className="text-xs text-gray-500 font-mono">{operation.clientCode}</div>
                  </div>
                </div>

                {/* Transport Info */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 p-2.5 bg-green-100 rounded-xl">
                    <Truck className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{operation.driverName}</div>
                    <div className="text-xs text-gray-500">
                      <span className="font-mono font-medium">{operation.truckNumber}</span>
                      <span className="mx-1.5">•</span>
                      <span>{operation.transportCompany}</span>
                    </div>
                  </div>
                </div>

                {/* Location & Date */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 font-medium">Location</div>
                        <div className="text-sm font-bold text-gray-900 truncate">
                          {operation.assignedLocation || 'Pending'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 font-medium">Date</div>
                        <div className="text-sm font-bold text-gray-900">
                          {formatDate(operation.date)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Reference */}
                {operation.bookingReference && (
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
                    <div className="text-xs text-blue-700 font-bold mb-0.5">Booking Reference</div>
                    <div className="text-sm text-blue-900 font-mono font-bold">{operation.bookingReference}</div>
                  </div>
                )}
              </div>

              {/* Card Footer with action hint */}
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-medium">Tap to view details</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredOperations.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
              <Package className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No operations found</h3>
            <p className="text-gray-600 text-sm max-w-sm mx-auto">
              {searchTerm ? "Try adjusting your search criteria or filters." : "No gate in operations have been created yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
