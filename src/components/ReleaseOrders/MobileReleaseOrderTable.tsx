import React from 'react';
import { Calendar, Package, User, FileText, Clock, CheckCircle, AlertTriangle, ChevronRight, Eye } from 'lucide-react';
import { BookingReference } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { safeToLocaleDateString } from '../../utils/dateHelpers';

interface MobileReleaseOrderTableProps {
  orders: BookingReference[];
  searchTerm: string;
  selectedFilter: string;
  onViewDetails: (order: BookingReference) => void;
}

export const MobileReleaseOrderTable: React.FC<MobileReleaseOrderTableProps> = ({
  orders,
  searchTerm,
  selectedFilter,
  onViewDetails
}) => {
  const { canViewAllData } = useAuth();

  // Filter orders based on search and filter
  const getFilteredOrders = () => {
    let filtered = orders;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.bookingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.containers && order.containers.some(c => c.containerNumber.toLowerCase().includes(searchTerm.toLowerCase())))
      );
    }

    // Apply status filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(order => order.status === selectedFilter);
    }

    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  const getStatusBadge = (status: BookingReference['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pending', icon: Clock },
      in_process: { color: 'bg-orange-100 text-orange-800 border-orange-300', label: 'In Process', icon: AlertTriangle },
      completed: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Completed', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Cancelled', icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) {
      return (
        <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-gray-100 text-gray-800 border-2 border-gray-300">
          Unknown
        </span>
      );
    }

    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full border-2 ${config.color}`}>
        <Icon className="h-3.5 w-3.5 mr-1.5" />
        {config.label}
      </span>
    );
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!dateObj || isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatContainerCount = (count: number) => {
    return count === 1 ? '1 container' : `${count} containers`;
  };

  return (
    <div className="space-y-4 px-4 lg:px-0">
      {/* Mobile-First Card Layout */}
      <div className="space-y-4 lg:space-y-0 lg:bg-white lg:rounded-lg lg:border lg:border-gray-200 lg:overflow-hidden">
        {/* Desktop Table Header */}
        <div className="hidden lg:block px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Booking References</h3>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking Reference #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Containers (Qty)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client Name
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
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => onViewDetails(order)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.bookingNumber || order.id}</div>
                    <div className="text-sm text-gray-500">
                      Created {safeToLocaleDateString(order.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {formatContainerCount(order.totalContainers)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {(order.containerQuantities?.size20ft || 0) > 0 && `${order.containerQuantities?.size20ft || 0}×20" `}
                      {(order.containerQuantities?.size40ft || 0) > 0 && `${order.containerQuantities?.size40ft || 0}×40" `}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {canViewAllData() ? order.clientName : 'Your Company'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.clientCode}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(order);
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout */}
        <div className="lg:hidden space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => onViewDetails(order)}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl active:shadow-md transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer overflow-hidden"
            >
              {/* Card Header with gradient */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-5 py-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 bg-blue-600 rounded-lg shadow-sm">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-bold text-gray-900 text-base truncate">
                        {order.bookingNumber || order.id}
                      </span>
                      {order.bookingType && (
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                          order.bookingType === 'IMPORT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {order.bookingType}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className="text-sm font-bold text-gray-900">
                      {order.totalContainers}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.totalContainers === 1 ? 'container' : 'containers'}
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
                    <div className="font-semibold text-gray-900 text-sm truncate">
                      {canViewAllData() ? order.clientName : 'Your Company'}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">{order.clientCode}</div>
                  </div>
                </div>

                {/* Container Breakdown */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 p-2.5 bg-green-100 rounded-xl">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">Container Breakdown</div>
                    <div className="text-xs text-gray-500">
                      {(order.containerQuantities?.size20ft || 0) > 0 && `${order.containerQuantities?.size20ft}×20ft `}
                      {(order.containerQuantities?.size40ft || 0) > 0 && `${order.containerQuantities?.size40ft}×40ft`}
                    </div>
                  </div>
                </div>

                {/* Date & Progress */}
                <div className="pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 font-medium">Created</div>
                        <div className="text-sm font-bold text-gray-900">
                          {formatDate(order.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-orange-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 font-medium">Remaining</div>
                        <div className="text-sm font-bold text-gray-900">
                          {order.remainingContainers || order.totalContainers}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
                    <div className="text-xs text-blue-700 font-bold mb-0.5">Notes</div>
                    <div className="text-sm text-blue-900 line-clamp-2">{order.notes}</div>
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
        {filteredOrders.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No booking references found</h3>
            <p className="text-gray-600 text-sm max-w-sm mx-auto">
              {searchTerm ? "Try adjusting your search criteria or filters." : "No bookings have been created yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
