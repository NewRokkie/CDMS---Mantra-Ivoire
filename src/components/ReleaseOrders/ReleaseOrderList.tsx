import React, { useState, useEffect } from 'react';
import { BookingReference } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { bookingReferenceService } from '../../services/api';
import { ReleaseOrderForm } from './ReleaseOrderForm';
import { BookingDetailsModal } from './BookingDetailsModal';
import { MobileReleaseOrderStats } from './MobileReleaseOrderStats';
import { MobileReleaseOrderTable } from './MobileReleaseOrderTable';
import { Search, X, FileText } from 'lucide-react';
import { handleError } from '../../services/errorHandling';
import { logger } from '../../utils/logger';

// REMOVED: Mock data now managed by global store

export const ReleaseOrderList: React.FC = () => {
  const [releaseOrders, setReleaseOrders] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const ordersData = await bookingReferenceService.getAll().catch(err => {
          handleError(err, 'ReleaseOrderList.loadData');
          return [];
        });
        setReleaseOrders(ordersData || []);
      } catch (error) {
        handleError(error, 'ReleaseOrderList.loadData');
        setReleaseOrders([]);
      }
    }
    loadData();
  }, []);



  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<BookingReference | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
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
        <MobileReleaseOrderStats stats={stats} />

        {/* Unified Search and Filter */}
        <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="lg:flex lg:justify-between p-4 lg:p-4">
            {/* Search Bar */}
            <div className="relative mb-4 lg:mb-0">
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
        />
      </div>

      {/* Release Order Form Modal */}
      {showForm && (
        <ReleaseOrderForm
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedOrder(null);
          }}
          onSubmit={(order) => {
            setShowForm(false);
            setSelectedOrder(null);
          }}
          isLoading={false}
        />
      )}

      {/* Booking Details Modal */}
      <BookingDetailsModal
        booking={selectedOrder}
        isOpen={showDetailModal || showCancelModal}
        openToCancelForm={showCancelModal}
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
