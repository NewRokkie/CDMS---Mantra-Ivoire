import React, { useState, useEffect } from 'react';
import { BookingReference } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { bookingReferenceService } from '../../services/api';
import { ReleaseOrderForm } from './ReleaseOrderForm';
import { BookingDetailsModal } from './BookingDetailsModal';
import { MobileReleaseOrderStats } from './MobileReleaseOrderStats';
import { MobileReleaseOrderTable } from './MobileReleaseOrderTable';
import { CardSkeleton } from '../Common/CardSkeleton';
import { Search, X, FileText, Download } from 'lucide-react';
import { handleError } from '../../services/errorHandling';
import { exportToExcel, formatDateForExport } from '../../utils/excelExport';
import { userService } from '../../services/api';

// REMOVED: Mock data now managed by global store

export const ReleaseOrderList: React.FC = () => {
  const [releaseOrders, setReleaseOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const ordersData = await bookingReferenceService.getAll().catch(err => {
          handleError(err, 'ReleaseOrderList.loadData');
          return [];
        });
        setReleaseOrders(ordersData || []);
      } catch (error) {
        handleError(error, 'ReleaseOrderList.loadData');
        setReleaseOrders([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);



  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<BookingReference | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { user, getClientFilter } = useAuth();
  const { currentYard } = useYard();

  // Filter release orders based on user permissions and search/status filters
  const getFilteredOrders = () => {
    let orders = releaseOrders;

    // Apply client filter for client users
    const clientFilter = getClientFilter();
    if (clientFilter) {
      orders = orders.filter(order =>
        order.clientCode === clientFilter ||
        order.createdBy === user?.name
      );
    }

    // Apply search filter
    if (searchTerm) {
      orders = orders.filter(order =>
        (order.bookingNumber || order.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (selectedFilter !== 'all') {
      orders = orders.filter(order => order.status === selectedFilter);
    }

    return orders;
  };

  const filteredOrders = getFilteredOrders();

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setIsEditMode(false);
    setShowForm(true);
  };

  const handleViewDetails = (order: BookingReference) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const handleCancelBooking = (order: BookingReference) => {
    setSelectedOrder(order);
    setShowCancelModal(true);
  };

  const handleEditOrder = (order: BookingReference) => {
    setSelectedOrder(order);
    setIsEditMode(true);
    setShowDetailModal(false);
    setShowForm(true);
  };

  // Calculate statistics
  const getOrderStats = () => {
    return {
      total: filteredOrders.length,
      pending: filteredOrders.filter(o => o.status === 'pending').length,
      inProcess: filteredOrders.filter(o => o.status === 'in_process').length,
      completed: filteredOrders.filter(o => o.status === 'completed').length,
      totalContainers: filteredOrders.reduce((sum, o) => sum + o.totalContainers, 0),
      readyContainers: filteredOrders.reduce((sum, o) => sum + o.totalContainers, 0)
    };
  };

  const stats = getOrderStats();

  const handleExportBookings = async () => {
    // Get user names for createdBy UUIDs
    const userNamesMap = new Map<string, string>();
    
    for (const order of filteredOrders) {
      if (order.createdBy && !userNamesMap.has(order.createdBy)) {
        try {
          const user = await userService.getById(order.createdBy);
          userNamesMap.set(order.createdBy, user?.name || order.createdBy);
        } catch (error) {
          // If user not found, use the createdBy value as is
          userNamesMap.set(order.createdBy, order.createdBy);
        }
      }
    }

    const dataToExport = filteredOrders.map(order => {
      const quantities = order.containerQuantities || {};
      return {
        bookingNumber: order.bookingNumber || order.id || '',
        bookingType: order.bookingType || '',
        clientName: order.clientName || '',
        clientCode: order.clientCode || '',
        status: order.status || '',
        totalContainers: order.totalContainers || 0,
        size20ft: quantities.size20ft || 0,
        size40ft: quantities.size40ft || 0,
        processedContainers: order.processedContainers || 0,
        remainingContainers: (order.totalContainers || 0) - (order.processedContainers || 0),
        yardName: currentYard?.name || '',
        createdBy: userNamesMap.get(order.createdBy) || order.createdBy || '',
        createdAt: formatDateForExport(order.createdAt),
        updatedAt: formatDateForExport(order.updatedAt),
        notes: order.notes || ''
      };
    });

    exportToExcel({
      filename: `booking_references_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: 'Booking References',
      columns: [
        { header: 'Numéro Booking', key: 'bookingNumber', width: 20 },
        { header: 'Type Booking', key: 'bookingType', width: 15 },
        { header: 'Client', key: 'clientName', width: 25 },
        { header: 'Code Client', key: 'clientCode', width: 15 },
        { header: 'Statut', key: 'status', width: 15 },
        { header: 'Total Conteneurs', key: 'totalContainers', width: 15 },
        { header: 'Conteneurs 20ft', key: 'size20ft', width: 15 },
        { header: 'Conteneurs 40ft', key: 'size40ft', width: 15 },
        { header: 'Conteneurs Traités', key: 'processedContainers', width: 18 },
        { header: 'Conteneurs Restants', key: 'remainingContainers', width: 18 },
        { header: 'Dépôt', key: 'yardName', width: 20 },
        { header: 'Créé par', key: 'createdBy', width: 20 },
        { header: 'Date Création', key: 'createdAt', width: 20 },
        { header: 'Date Modification', key: 'updatedAt', width: 20 },
        { header: 'Notes', key: 'notes', width: 30 }
      ],
      data: dataToExport
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 lg:bg-transparent">
      {/* Unified Mobile-First Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          {/* Title Section */}
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Booking Management</h1>
              <p className="text-sm text-gray-600 hidden lg:block">Release orders & container bookings</p>
            </div>
          </div>

          {/* Action Button - Mobile First */}
          <div className="lg:flex lg:justify-end">
            <button
              onClick={handleCreateOrder}
              className="w-full lg:w-auto flex items-center justify-center space-x-2 px-4 py-3 lg:px-6 lg:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl lg:rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              <FileText className="h-5 w-5 lg:h-4 lg:w-4" />
              <span className="text-sm lg:text-base">Create Booking</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unified Responsive Statistics */}
      <div className="px-4 py-4 lg:px-6 lg:py-6 space-y-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardSkeleton count={4} />
          </div>
        ) : (
          <MobileReleaseOrderStats stats={stats} />
        )}

        {/* Unified Search and Filter */}
        <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="lg:flex lg:justify-between lg:items-center p-4 lg:p-4">
            {/* Search Bar */}
            <div className="relative mb-4 lg:mb-0 lg:flex-1 lg:max-w-md">
              <Search className="absolute left-4 lg:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 lg:h-4 lg:w-4" />
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 lg:pl-10 pr-12 lg:pr-4 py-4 lg:py-2 text-base lg:text-sm border border-gray-300 rounded-xl lg:rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 lg:bg-white focus:bg-white transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 lg:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="h-5 w-5 lg:h-4 lg:w-4" />
                </button>
              )}
            </div>

            {/* Filter Chips (Mobile) / Dropdown (Desktop) */}
            <div className="lg:hidden flex items-center justify-center space-x-2 overflow-x-auto py-2 scrollbar-none -mx-4 px-4">
              {['all', 'pending', 'in_process', 'completed'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    selectedFilter === filter
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white transform scale-105'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter === 'in_process' ? 'In Process' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            <div className="hidden lg:flex items-center space-x-3">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_process">In Process</option>
                <option value="completed">Completed</option>
              </select>
              {searchTerm && (
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg font-medium">
                  {filteredOrders.length} result{filteredOrders.length !== 1 ? 's' : ''}
                </span>
              )}
              <button
                onClick={handleExportBookings}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Export to Excel"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Unified Bookings List - Mobile First */}
        <MobileReleaseOrderTable
          orders={filteredOrders}
          searchTerm={searchTerm}
          selectedFilter={selectedFilter}
          onViewDetails={handleViewDetails}
          onCancelBooking={handleCancelBooking}
          loading={isLoading}
        />
      </div>

      {/* Release Order Form Modal */}
      {showForm && (
        <ReleaseOrderForm
          isOpen={showForm}
          isEditMode={isEditMode}
          initialData={isEditMode && selectedOrder ? {
            bookingNumber: selectedOrder.bookingNumber,
            bookingType: selectedOrder.bookingType,
            clientId: selectedOrder.clientId,
            clientCode: selectedOrder.clientCode,
            clientName: selectedOrder.clientName,
            maxQuantityThreshold: selectedOrder.maxQuantityThreshold,
            containerQuantities: selectedOrder.containerQuantities,
            totalContainers: selectedOrder.totalContainers,
            requiresDetailedBreakdown: selectedOrder.requiresDetailedBreakdown,
            notes: selectedOrder.notes
          } : undefined}
          onClose={() => {
            setShowForm(false);
            setSelectedOrder(null);
            setIsEditMode(false);
          }}
          onSubmit={() => {
            setShowForm(false);
            setSelectedOrder(null);
            setIsEditMode(false);
          }}

          isLoading={false}
        />
      )}

      {/* Booking Details Modal */}
      <BookingDetailsModal
        booking={selectedOrder}
        isOpen={showDetailModal || showCancelModal}
        openToCancelForm={showCancelModal}
        onEdit={handleEditOrder}
        onClose={() => {
          setShowDetailModal(false);
          setShowCancelModal(false);
          setSelectedOrder(null);
        }}
        onUpdate={(updatedBooking) => {
          // Update the booking in the list
          setReleaseOrders(prev =>
            prev.map(order =>
              order.id === updatedBooking.id ? updatedBooking : order
            )
          );
          setSelectedOrder(updatedBooking);
          // Close both modals after update
          setShowDetailModal(false);
          setShowCancelModal(false);
        }}
      />
    </div>
  );
};
