import React from 'react';
import { Calendar, Package, User, Truck, MapPin, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

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
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed', icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
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
                  <Package className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-gray-900 text-lg">
                    {operation.containerNumber}
                  </span>
                  {operation.secondContainerNumber && (
                    <span className="text-sm text-gray-500">+1</span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(operation.operationStatus)}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    operation.status === 'FULL' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {operation.status}
                  </span>
                  {operation.isDamaged && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      Damaged
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {operation.containerSize}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {operation.containerType?.replace('_', ' ')}
                </div>
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
                  <div className="text-sm text-gray-500">{operation.truckNumber} • {operation.transportCompany}</div>
                </div>
              </div>

              {/* Location & Date */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {operation.assignedLocation || 'Pending assignment'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {formatDate(operation.date)}
                  </span>
                </div>
              </div>

              {/* Booking Reference */}
              {operation.bookingReference && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <div className="text-xs text-blue-700 font-medium">Booking Reference</div>
                  <div className="text-sm text-blue-900 font-mono">{operation.bookingReference}</div>
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
              {searchTerm ? "Try adjusting your search criteria." : "No gate in operations have been created yet."}
            </p>
          </div>
        )}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Gate In Operations</h3>
        </div>
        <div className="overflow-x-auto">
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
                  Driver Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status & Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOperations.map((operation) => (
                <tr key={operation.id} className="hover:bg-gray-50 transition-colors">
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
                      {operation.containerSize}
                    </div>
                    <div className="text-xs text-gray-500">
                      {operation.containerType?.charAt(0).toUpperCase() + operation.containerType?.slice(1).replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{operation.clientCode} - {operation.clientName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.truckNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{operation.driverName}</div>
                    <div className="text-sm text-gray-500">{operation.transportCompany}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
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
                        Booking: {operation.bookingReference}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.assignedLocation || (
                      <span className="text-gray-400 italic">Pending assignment</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOperations.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No operations found</h3>
            <p className="text-gray-600">
              {searchTerm ? "Try adjusting your search criteria." : "No gate in operations have been created yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};