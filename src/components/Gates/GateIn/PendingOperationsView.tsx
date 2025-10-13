import React, { useState } from 'react';
import { ArrowLeft, Search, X, FileText, Package, User, Truck, Calendar, Clock, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';
import { LocationValidationModal } from './LocationValidationModal';

interface PendingOperation {
  id: string;
  date: Date;
  containerNumber: string;
  secondContainerNumber?: string;
  containerSize: string;
  containerQuantity: number;
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

interface PendingOperationsViewProps {
  operations: PendingOperation[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onBack: () => void;
  onComplete: (operation: PendingOperation, locationData: any) => void;
  isProcessing: boolean;
  mockLocations: any;
}

export const PendingOperationsView: React.FC<PendingOperationsViewProps> = ({
  operations,
  searchTerm,
  onSearchChange,
  onBack,
  onComplete,
  isProcessing,
  mockLocations
}) => {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<PendingOperation | null>(null);

  const filteredOperations = operations.filter(operation => {
    const matchesSearch = operation.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleOperationClick = (operation: PendingOperation) => {
    setSelectedOperation(operation);
    setShowLocationModal(true);
  };

  const handleLocationComplete = async (operation: PendingOperation, locationData: any) => {
    await onComplete(operation, locationData);
    setShowLocationModal(false);
    setSelectedOperation(null);
  };

  const getStatusBadge = (status?: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: Clock },
      in_process: { color: 'bg-blue-100 text-blue-800', label: 'In Process', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled', icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-40 px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-3 text-gray-600 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors touch-target"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pending Operations</h1>
              <p className="text-sm text-gray-600">Awaiting location assignment</p>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Pending Operations</h2>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="lg:hidden px-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search operations..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-12 pr-12 py-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Search */}
        <div className="hidden lg:block bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search operations..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center justify-end">
              <span className="text-sm text-gray-500">
                {filteredOperations.length} result{filteredOperations.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Card Layout */}
        <div className="lg:hidden px-4 space-y-4">
          {filteredOperations.map((operation) => (
            <div
              key={operation.id}
              onClick={() => handleOperationClick(operation)}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    <span className="font-bold text-gray-900 text-lg">
                      {operation.truckNumber} • {operation.driverName}
                    </span>
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

                {/* Container Info */}
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Package className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{operation.containerNumber}</div>
                    {operation.secondContainerNumber && (
                      <div className="font-medium text-gray-900">{operation.secondContainerNumber}</div>
                    )}
                  </div>
                </div>

                {/* Date and Booking */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {formatDate(operation.completedAt || operation.createdAt)}
                    </span>
                  </div>
                  {operation.bookingReference && (
                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      {operation.bookingReference}
                    </div>
                  )}
                </div>

                {/* Action Indicator */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 mt-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Tap to assign location
                    </span>
                  </div>
                </div>
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
            <h3 className="text-lg font-semibold text-gray-900">Operations Awaiting Location Assignment</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Truck Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Container
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOperations.map((operation) => (
                  <tr key={operation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(operation.completedAt || operation.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{operation.truckNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{operation.driverName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-blue-600 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {operation.containerNumber}
                          </div>
                          <div className="text-sm text-gray-500">
                            {operation.containerSize} • {operation.containerType?.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{operation.clientName}</div>
                      <div className="text-sm text-gray-500">{operation.clientCode}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(operation.operationStatus)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleOperationClick(operation)}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <MapPin className="h-4 w-4" />
                        <span>Assign Location</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOperations.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No operations found</h3>
              <p className="text-gray-600">
                {searchTerm ? "Try adjusting your search criteria." : "No gate in operations have been created yet."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Location Validation Modal */}
      <LocationValidationModal
        isOpen={showLocationModal}
        onClose={() => {
          setShowLocationModal(false);
          setSelectedOperation(null);
        }}
        operation={selectedOperation}
        onComplete={handleLocationComplete}
        isProcessing={isProcessing}
        mockLocations={mockLocations}
      />
    </>
  );
};
