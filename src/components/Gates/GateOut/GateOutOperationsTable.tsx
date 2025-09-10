import React from 'react';
import { FileText, Eye } from 'lucide-react';
import { PendingGateOut } from './types';
import { getStatusBadge, formatContainerForDisplay } from './utils';

interface GateOutOperationsTableProps {
  operations: PendingGateOut[];
  searchTerm: string;
  onOperationClick: (operation: PendingGateOut) => void;
}

export const GateOutOperationsTable: React.FC<GateOutOperationsTableProps> = ({
  operations,
  searchTerm,
  onOperationClick
}) => {
  const filteredOperations = operations.filter(op =>
    (op.bookingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (op.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (op.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    (op.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                <td>
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
  );
};