import React from 'react';
import { Calendar, Package, User, FileText, Clock, CheckCircle, AlertTriangle, ChevronRight, Eye, Ban, BarChart3 } from 'lucide-react';
import { BookingReference } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { safeToLocaleDateString } from '../../utils/dateHelpers';
import { TableSkeleton } from '../Common/TableSkeleton';
import { t } from 'i18next';

interface MobileReleaseOrderTableProps {
  orders: BookingReference[];
  searchTerm: string;
  selectedFilter: string;
  onViewDetails: (order: BookingReference) => void;
  onCancelBooking?: (order: BookingReference) => void;
  loading?: boolean;
}

export const MobileReleaseOrderTable: React.FC<MobileReleaseOrderTableProps> = ({
  orders,
  searchTerm,
  selectedFilter,
  onViewDetails,
  onCancelBooking,
  loading = false
}) => {
  const { canViewAllData } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <div className="space-y-4 px-4 lg:px-0">
        <div className="lg:hidden">
          <TableSkeleton rows={4} columns={2} />
        </div>
        <div className="hidden lg:block">
          <TableSkeleton rows={6} columns={6} />
        </div>
      </div>
    );
  }

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
        (order.containers && order.containers.some((c: any) => c.containerNumber?.toLowerCase().includes(searchTerm.toLowerCase())))
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
      pending: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700', label: 'Pending', icon: Clock },
      in_process: { color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700', label: 'In Process', icon: AlertTriangle },
      completed: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700', label: 'Completed', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700', label: 'Cancelled', icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) {
      return (
        <span className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600">
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
    if (!dateObj || isNaN(dateObj.getTime())) return '-';
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

  const getProgressPercentage = (order: BookingReference) => {
    // remainingContainers starts at totalContainers and decreases with each gate out
    // When remainingContainers = 0, the booking is completed (100% progress)
    const remaining = order.remainingContainers ?? order.totalContainers;
    const processed = order.totalContainers - remaining;
    return order.totalContainers > 0 ? Math.round((processed / order.totalContainers) * 100) : 0;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 0) return 'bg-gray-300';        // Not started - gray
    if (percentage < 30) return 'bg-blue-500';         // Just started - blue
    if (percentage < 70) return 'bg-yellow-500';       // In progress - yellow
    if (percentage < 100) return 'bg-orange-500';      // Nearly complete - orange
    return 'bg-green-500';                             // Completed - green
  };

  const canCancelBooking = (order: BookingReference) => {
    return canViewAllData() && order.status !== 'cancelled' && order.status !== 'completed';
  };

  const ProgressBar: React.FC<{ order: BookingReference }> = ({ order }) => {
    const percentage = getProgressPercentage(order);
    const remaining = order.remainingContainers ?? order.totalContainers;
    const processed = order.totalContainers - remaining;

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {processed}/{order.totalContainers}
          </span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {percentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(percentage)}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {remaining} remaining
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 px-4 lg:px-0">
      {/* Mobile-First Card Layout */}
      <div className="space-y-4 lg:space-y-0 lg:bg-white lg:dark:bg-gray-800 lg:rounded-lg lg:border lg:border-gray-200 lg:dark:border-gray-700 lg:overflow-hidden">
        {/* Desktop Table Header */}
        <div className="hidden lg:block px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Booking References</h3>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Booking Reference #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Containers (Qty)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <BarChart3 className="h-4 w-4" />
                    <span>Progress</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={() => onViewDetails(order)}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{order.bookingNumber || order.id}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Created {safeToLocaleDateString(order.createdAt)}
                    </div>
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={() => onViewDetails(order)}
                  >
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatContainerCount(order.totalContainers)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {(order.containerQuantities?.size20ft || 0) > 0 && `${order.containerQuantities?.size20ft || 0}×20" `}
                      {(order.containerQuantities?.size40ft || 0) > 0 && `${order.containerQuantities?.size40ft || 0}×40" `}
                    </div>
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={() => onViewDetails(order)}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {canViewAllData() ? order.clientName : t('common.yourCompany')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {order.clientCode}
                    </div>
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={() => onViewDetails(order)}
                  >
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-32">
                      <ProgressBar order={order} />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
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
                      {canCancelBooking(order) && onCancelBooking && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancelBooking(order);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          title="Cancel Booking"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
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
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl active:shadow-md transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer overflow-hidden"
            >
              {/* Card Header with gradient */}
              <div className="bg-gradient-to-r from-gray-50 dark:from-gray-700 to-blue-50 dark:to-blue-900/20 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1.5 bg-blue-600 rounded-lg shadow-sm">
                        <FileText className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-base truncate">
                        {order.bookingNumber || order.id}
                      </span>
                      {order.bookingType && (
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${order.bookingType === 'IMPORT' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
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
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {order.totalContainers}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {order.totalContainers === 1 ? 'container' : 'containers'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="px-5 py-4 space-y-3.5">
                {/* Client Info */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {canViewAllData() ? order.clientName : t('common.yourCompany')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{order.clientCode}</div>
                  </div>
                </div>

                {/* Container Breakdown */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 p-2.5 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm">Container Breakdown</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {(order.containerQuantities?.size20ft || 0) > 0 && `${order.containerQuantities?.size20ft}×20ft `}
                      {(order.containerQuantities?.size40ft || 0) > 0 && `${order.containerQuantities?.size40ft}×40ft`}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                    <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-white text-sm mb-2">Processing Progress</div>
                    <ProgressBar order={order} />
                  </div>
                </div>

                {/* Date & Actions */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Created</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatDate(order.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Remaining</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {order.remainingContainers ?? order.totalContainers}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  {canCancelBooking(order) && onCancelBooking && (
                    <div className="flex lg:justify-end justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelBooking(order);
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      >
                        <Ban className="h-3 w-3 mr-1" />
                        Cancel Booking
                      </button>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {order.notes && (
                  <div className="bg-gradient-to-r from-blue-50 dark:from-blue-900/30 to-blue-100 dark:to-blue-800/30 rounded-xl p-3 border border-blue-200 dark:border-blue-700">
                    <div className="text-xs text-blue-700 dark:text-blue-300 font-bold mb-0.5">Notes</div>
                    <div className="text-sm text-blue-900 dark:text-blue-100 line-clamp-2">{order.notes}</div>
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

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="inline-flex p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No booking references found</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm max-w-sm mx-auto">
              {searchTerm ? t('common.tryAdjusting') : t('common.noData')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
