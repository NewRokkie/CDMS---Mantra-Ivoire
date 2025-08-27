import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  X,
  Package,
  Calendar,
  User,
  FileText,
  MapPin,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { ReleaseOrder } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface ReleaseOrderTableViewProps {
  orders: ReleaseOrder[];
}

type SortField = 'id' | 'containerCount' | 'clientName' | 'status';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export const ReleaseOrderTableView: React.FC<ReleaseOrderTableViewProps> = ({ orders }) => {
  const { user, canViewAllData } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'id', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<ReleaseOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fixed items per page to 5
  const itemsPerPage = 5;

  // Get unique clients for filter
  const uniqueClients = useMemo(() => {
    const clients = orders.map(order => ({
      code: order.clientCode,
      name: order.clientName
    }));
    const uniqueClientsMap = new Map();
    clients.forEach(client => {
      if (client.code) {
        uniqueClientsMap.set(client.code, client);
      }
    });
    return Array.from(uniqueClientsMap.values());
  }, [orders]);

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = orders.filter(order => {
      const matchesSearch = 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.containers.some(c => c.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesClient = clientFilter === 'all' || order.clientCode === clientFilter;
      
      return matchesSearch && matchesStatus && matchesClient;
    });

    // Sort orders
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.field) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'containerCount':
          aValue = a.containers.length;
          bValue = b.containers.length;
          break;
        case 'clientName':
          aValue = a.clientName;
          bValue = b.clientName;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [orders, searchTerm, statusFilter, clientFilter, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredAndSortedOrders.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleViewDetails = (order: ReleaseOrder) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const getStatusBadge = (status: ReleaseOrder['status']) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      in_process: { color: 'bg-orange-100 text-orange-800', label: 'In Process' },
      validated: { color: 'bg-green-100 text-green-800', label: 'Validated' },
      partial: { color: 'bg-blue-100 text-blue-800', label: 'Partial Release' },
      completed: { color: 'bg-blue-600 text-white', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatContainerCount = (count: number) => {
    return count === 1 ? '1 container' : `${count} containers`;
  };

  const SortButton: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 text-left font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
    >
      <span>{children}</span>
      {sortConfig.field === field && (
        sortConfig.direction === 'asc' ? 
          <ChevronUp className="h-4 w-4" /> : 
          <ChevronDown className="h-4 w-4" />
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search release orders, clients, containers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full lg:w-64"
              />
            </div>
            
            <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-auto min-w-0 md:min-w-[120px]"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_process">In Process</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-auto min-w-0 md:min-w-[180px]"
              >
                <option value="all">All Clients</option>
                {uniqueClients.map((client) => (
                  <option key={client.code} value={client.code}>
                    {client.code} - {client.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs">
                  <SortButton field="id">Booking Reference #</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs">
                  <SortButton field="containerCount">Containers (Qty)</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs">
                  <SortButton field="clientName">Client Name</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs">
                  <SortButton field="status">Status</SortButton>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{order.bookingNumber || order.id}</div>
                    <div className="text-sm text-gray-500">
                      Created {order.createdAt.toLocaleDateString()}
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
                      {order.containerQuantities.size20ft > 0 && `${order.containerQuantities.size20ft}×20" `}
                      {order.containerQuantities.size40ft > 0 && `${order.containerQuantities.size40ft}×40" `}
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
                      onClick={() => handleViewDetails(order)}
                      className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors group relative"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                        View Details
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {paginatedOrders.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No booking references found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' 
                ? "Try adjusting your search criteria or filters."
                : "No booking references have been created yet."
              }
            </p>
          </div>
        )}
      </div>

      {/* Table Footer with Pagination Controls */}
      <div className="bg-white rounded-lg border border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div>
            <span className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredAndSortedOrders.length)} of {filteredAndSortedOrders.length} orders
            </span>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                {/* Page Numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors mx-1 ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center ml-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full h-[90vh] flex flex-col overflow-hidden">
            {/* Fixed Header */}
            <div className="flex-shrink-0 p-6 border-b border-gray-200 bg-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Booking Reference Details
                  </h3>
                  <div className="flex items-center space-x-3 mt-2">
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Order Information and Notes - 2 Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Order Information */}
                <div className="space-y-4 md:col-span-1">
                  <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Booking Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-600">Booking Number:</span>
                        <span className="ml-2 font-medium">{selectedOrder.bookingNumber || selectedOrder.id}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-600">Client:</span>
                        <span className="ml-2 font-medium">
                          {canViewAllData() ? selectedOrder.clientName : 'Your Company'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-600">Created:</span>
                        <span className="ml-2 font-medium">
                          {selectedOrder.createdAt.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-600">Created by:</span>
                        <span className="ml-2 font-medium">{selectedOrder.createdBy}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="text-sm text-gray-600">Total Containers:</span>
                        <span className="ml-2 font-medium">{selectedOrder.totalContainers}</span>
                      </div>
                    </div>
                    {selectedOrder.estimatedReleaseDate && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <span className="text-sm text-gray-600">Est. Release:</span>
                          <span className="ml-2 font-medium">
                            {selectedOrder.estimatedReleaseDate.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-4 md:col-span-1">
                  <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    Notes
                  </h4>
                  {selectedOrder.notes ? (
                    <div className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm leading-relaxed">
                      {selectedOrder.notes}
                    </div>
                  ) : (
                    <div className="text-gray-500 italic text-sm">
                      No notes available
                    </div>
                  )}
                </div>
              </div>

              {/* Container Quantities Breakdown */}
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-6">
                  Container Quantities Breakdown
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 20ft Containers */}
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <Package className="h-6 w-6 text-blue-600" />
                      <div>
                        <h5 className="font-semibold text-blue-900">20" Containers</h5>
                        <p className="text-sm text-blue-700">Standard Size</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-900 mb-2">
                        {selectedOrder.containerQuantities.size20ft}
                      </div>
                      <div className="text-sm text-blue-700">
                        {selectedOrder.containerQuantities.size20ft === 1 ? 'Container' : 'Containers'}
                      </div>
                    </div>
                  </div>

                  {/* 40ft Containers */}
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center space-x-3 mb-4">
                      <Package className="h-6 w-6 text-green-600" />
                      <div>
                        <h5 className="font-semibold text-green-900">40" Containers</h5>
                        <p className="text-sm text-green-700">High Capacity</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-900 mb-2">
                        {selectedOrder.containerQuantities.size40ft}
                      </div>
                      <div className="text-sm text-green-700">
                        {selectedOrder.containerQuantities.size40ft === 1 ? 'Container' : 'Containers'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 mb-2">
                      Total: {selectedOrder.totalContainers} Container{selectedOrder.totalContainers !== 1 ? 's' : ''}
                    </div>
                    {selectedOrder.requiresDetailedBreakdown && (
                      <div className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Requires Detailed Breakdown
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};