import React, { useState } from 'react';
import { ArrowLeft, Search, X, FileText } from 'lucide-react';
import { LocationValidationModal } from './LocationValidationModal';

interface PendingOperation {
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

interface PendingOperationsViewProps {
  operations: PendingOperation[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onBack: () => void;
  onOperationClick: (operation: PendingOperation) => void;
  onComplete: (operation: PendingOperation, locationData: any) => void;
  isProcessing: boolean;
  mockLocations: any;
}

export const PendingOperationsView: React.FC<PendingOperationsViewProps> = ({
  operations,
  searchTerm,
  onSearchChange,
  onBack,
  onOperationClick,
  onComplete,
  isProcessing,
  mockLocations
}) => {
  const [typeFilter, setTypeFilter] = useState<'all'>('all');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<PendingOperation | null>(null);

  const filteredOperations = operations.filter(operation => {
    const matchesSearch = operation.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all'
    return matchesSearch && matchesType;
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

  return (
    <>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
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
          
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {['all'].map(type => (
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

      {/* Pending Operations Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                    {operation.date.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{operation.containerNumber}</div>
                    {operation.secondContainerNumber && (
                      <div className="text-sm font-medium text-gray-900">{operation.secondContainerNumber}</div>
                    )}
                    <div className="text-sm text-gray-500">
                      {operation.containerSize}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {operation.clientName}
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
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
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
              {searchTerm || typeFilter !== 'all' ? "Try adjusting your search criteria or filters." : "No gate in operations have been created yet."}
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