import React, { useState } from 'react';
import { ArrowLeft, Search, X, FileText, Package, User, Truck, Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { PendingGateOut } from './types';
import { getStatusBadge, formatContainerForDisplay } from './utils';
import { GateOutCompletionModal } from './GateOutCompletionModal';

interface PendingOperationsViewProps {
  operations: PendingGateOut[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onBack: () => void;
  onComplete: (operation: PendingGateOut, containerNumbers: string[]) => void;
  isProcessing: boolean;
}

export const PendingOperationsView: React.FC<PendingOperationsViewProps> = ({
  operations,
  searchTerm,
  onSearchChange,
  onBack,
  onComplete,
  isProcessing
}) => {
  const [typeFilter, setTypeFilter] = useState<'all' | 'IMPORT' | 'EXPORT'>('all');
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<PendingGateOut | null>(null);

  const filteredOperations = operations.filter(operation => {
    const matchesSearch = (operation.bookingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         (operation.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         (operation.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
                         (operation.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesType = typeFilter === 'all' || operation.bookingType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleOperationClick = (operation: PendingGateOut) => {
    if (operation.remainingContainers > 0) {
      setSelectedOperation(operation);
      setShowCompletionModal(true);
    }
  };

  const handleCompleteOperation = async (operation: PendingGateOut, containerNumbers: string[]) => {
    await onComplete(operation, containerNumbers);
    setShowCompletionModal(false);
    setSelectedOperation(null);
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
              <p className="text-sm text-gray-600">Awaiting processing</p>
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

        {/* Mobile Filter Chips */}
        <div className="lg:hidden px-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            {['all', 'IMPORT', 'EXPORT'].map((filter) => (
              <button
                key={filter}
                onClick={() => setTypeFilter(filter as any)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  typeFilter === filter
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {filter === 'all' ? 'All Types' : filter}
              </button>
            ))}
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
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {['all', 'IMPORT', 'EXPORT'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTypeFilter(type as any)}
                    className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      typeFilter === type
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {type === 'all' ? 'All Types' : type}
                  </button>
                ))}
              </div>
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

                {/* Action Indicator */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 mt-3">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Tap to process containers
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredOperations.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 text-sm px-4">
                {searchTerm ? "Try adjusting your search criteria." : "No pending gate out operations."}
              </p>
            </div>
          )}
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Operations Awaiting Processing</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Truck Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Containers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOperations.map((operation) => (
                  <tr
                    key={operation.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleOperationClick(operation)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {operation.date?.toLocaleDateString() || '-'}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {operation.vehicleNumber || '-'}
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
                {searchTerm ? "Try adjusting your search criteria." : "No pending gate out operations."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Gate Out Completion Modal */}
      <GateOutCompletionModal
        isOpen={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          setSelectedOperation(null);
        }}
        operation={selectedOperation}
        onComplete={handleCompleteOperation}
        isProcessing={isProcessing}
      />
    </>
  );
};