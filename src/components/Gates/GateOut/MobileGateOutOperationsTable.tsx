import React, { useState, useEffect } from 'react';
import { Calendar, Package, User, Truck, Clock, FileText, Radio, CheckCircle2 } from 'lucide-react';
import { gateService } from '../../../services/api';

interface GateOutOperationRecord {
  id: string;
  operationId: string;
  exitDate: Date | null;
  containerNumber: string | null;
  containerSize: string | null;
  containerType: string | null;
  bookingNumber: string;
  bookingType: 'IMPORT' | 'EXPORT';
  clientCode: string;
  clientName: string;
  driverName: string;
  truckNumber: string;
  transportCompany: string;
  status: string;
  ediTransmitted?: boolean;
  ediTransmissionDate?: Date | null;
}

interface MobileGateOutOperationsTableProps {
  searchTerm: string;
}

export const MobileGateOutOperationsTable: React.FC<MobileGateOutOperationsTableProps> = ({
  searchTerm
}) => {
  const [recentOperations, setRecentOperations] = useState<GateOutOperationRecord[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // Load recent gate out operations
  useEffect(() => {
    async function loadRecentOperations() {
      try {
        setLoadingRecent(true);
        const operations = await gateService.getRecentGateOutOperations();
        setRecentOperations(Array.isArray(operations) ? operations : []);
      } catch (error) {
        console.error('Error loading recent gate out operations:', error);
        setRecentOperations([]);
      } finally {
        setLoadingRecent(false);
      }
    }
    loadRecentOperations();
  }, []);

  return (
    <div className="space-y-4">
      {/* Mobile Card Layout - Show Recent Operations */}
      <div className="lg:hidden space-y-4">
        <h3 className="text-lg font-bold text-gray-900 px-4">Recent Gate Out Operations</h3>
        
        {loadingRecent ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center mx-4">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-spin" />
            <p className="text-sm text-gray-500">Loading recent operations...</p>
          </div>
        ) : recentOperations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center mx-4">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-600 text-sm">No recent gate out operations</p>
          </div>
        ) : (
          recentOperations
            .filter(operation => {
              if (!searchTerm) return true;
              const search = searchTerm.toLowerCase();
              return (
                operation.containerNumber?.toLowerCase().includes(search) ||
                operation.clientName?.toLowerCase().includes(search) ||
                operation.bookingNumber?.toLowerCase().includes(search) ||
                operation.truckNumber?.toLowerCase().includes(search) ||
                operation.driverName?.toLowerCase().includes(search)
              );
            })
            .map((operation) => (
              <div
                key={operation.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mx-4"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Package className="h-5 w-5 text-blue-600" />
                      <span className="font-bold text-gray-900 text-lg">
                        {operation.containerNumber || operation.bookingNumber}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        operation.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {operation.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                      {operation.bookingType && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          operation.bookingType === 'IMPORT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {operation.bookingType}
                        </span>
                      )}
                    </div>
                  </div>
                  {operation.containerSize && (
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {operation.containerSize}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        {operation.containerType}
                      </div>
                    </div>
                  )}
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

                  {/* Booking Info */}
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{operation.bookingNumber}</div>
                      <div className="text-sm text-gray-500">Booking Reference</div>
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

                  {/* Date and EDI Status */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {operation.exitDate ? new Date(operation.exitDate).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    {operation.status === 'completed' && (
                      operation.ediTransmitted ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          EDI Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          <Radio className="h-3 w-3 mr-1" />
                          EDI Pending
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Desktop Table Layout - Recent Gate Out Operations */}
      <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Gate Out Operations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exit Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Truck Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  EDI Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingRecent ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Clock className="h-5 w-5 text-gray-400 animate-spin" />
                      <span className="text-sm text-gray-500">Loading recent operations...</span>
                    </div>
                  </td>
                </tr>
              ) : recentOperations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No recent gate out operations</p>
                  </td>
                </tr>
              ) : (
                recentOperations
                  .filter(operation => {
                    if (!searchTerm) return true;
                    const search = searchTerm.toLowerCase();
                    return (
                      operation.containerNumber?.toLowerCase().includes(search) ||
                      operation.clientName?.toLowerCase().includes(search) ||
                      operation.bookingNumber?.toLowerCase().includes(search) ||
                      operation.truckNumber?.toLowerCase().includes(search) ||
                      operation.driverName?.toLowerCase().includes(search)
                    );
                  })
                  .map((operation) => (
                    <tr key={operation.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {operation.exitDate ? (
                          <>
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(operation.exitDate).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(operation.exitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {operation.containerNumber ? (
                          <div className="flex items-center">
                            <Package className="h-4 w-4 text-blue-600 mr-2" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {operation.containerNumber}
                              </div>
                              {operation.containerSize && (
                                <div className="text-sm text-gray-500">
                                  {operation.containerSize} • {operation.containerType}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{operation.clientName}</div>
                        <div className="text-sm text-gray-500">{operation.clientCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900">{operation.bookingNumber}</span>
                          {operation.bookingType && (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              operation.bookingType === 'IMPORT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {operation.bookingType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {operation.truckNumber || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{operation.driverName}</div>
                        <div className="text-sm text-gray-500">{operation.transportCompany}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          operation.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {operation.status === 'completed' ? 'Completed' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {operation.status === 'completed' ? (
                          operation.ediTransmitted ? (
                            <div className="flex items-center space-x-2">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Transmitted
                              </span>
                              {operation.ediTransmissionDate && (
                                <span className="text-xs text-gray-500">
                                  {new Date(operation.ediTransmissionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                              <Radio className="h-3 w-3 mr-1" />
                              Pending
                            </span>
                          )
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
