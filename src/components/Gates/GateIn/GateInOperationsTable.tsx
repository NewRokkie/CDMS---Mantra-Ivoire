import React from 'react';
import { FileText } from 'lucide-react';

interface GateInOperation {
  id: string;
  date: Date;
  containerNumber: string;
  secondContainerNumber?: string;
  containerSize: string;
  containerType?: string;
  bookingType: 'IMPORT' | 'EXPORT';
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

interface GateInOperationsTableProps {
  operations: GateInOperation[];
  searchTerm: string;
  onOperationClick?: (operation: GateInOperation) => void;
}

export const GateInOperationsTable: React.FC<GateInOperationsTableProps> = ({
  operations,
  searchTerm,
  onOperationClick
}) => {
  const filteredOperations = operations.filter(op =>
    op.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (op.secondContainerNumber && op.secondContainerNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No operations found</h3>
          <p className="text-gray-600">
            {searchTerm ? "Try adjusting your search criteria." : "No gate in operations have been created yet."}
          </p>
        </div>
      )}
    </div>
  );
};