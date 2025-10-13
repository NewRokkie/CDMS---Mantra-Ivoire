import React, { useState, useEffect } from 'react';
import { AlertTriangle, Menu, X, Clock, Plus, Truck, Package, Search, Filter, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { gateService, releaseService, containerService } from '../../services/api';
import { realtimeService } from '../../services/api/realtimeService';
import { GateOutModal } from './GateOutModal';
import { MobileGateOutOperationsTable } from './GateOut/MobileGateOutOperationsTable';
import { PendingOperationsView } from './GateOut/PendingOperationsView';
import { GateOutCompletionModal } from './GateOut/GateOutCompletionModal';
import { PendingGateOut } from './types';

// Import centralized mock data

interface GateOutFormData {
  booking?: {
    bookingNumber?: string;
    id?: string;
    clientCode?: string;
    clientName?: string;
    bookingType?: string;
    totalContainers?: number;
  };
  transportCompany: string;
  driverName: string;
  vehicleNumber: string;
  notes?: string;
}

export const GateOut: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { currentYard, validateYardOperation } = useYard();

  const [activeView, setActiveView] = useState<'overview' | 'pending'>('overview');
  const [showForm, setShowForm] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<PendingGateOut | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [releaseOrders, setReleaseOrders] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [gateOutOperations, setGateOutOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    async function loadData() {
      try {
        const [ordersData, containersData, operationsData] = await Promise.all([
          releaseService.getAll(),
          containerService.getAll(),
          gateService.getGateOutOperations()
        ]);
        setReleaseOrders(ordersData);
        setContainers(containersData);
        setGateOutOperations(operationsData);
      } catch (error) {
        console.error('Error loading gate out data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!currentYard) return;

    console.log(`🔌 Setting up Gate Out real-time subscriptions for yard: ${currentYard.id}`);

    const unsubscribeGateOut = realtimeService.subscribeToGateOutOperations(
      currentYard.id,
      async (payload) => {
        console.log(`📡 Gate Out ${payload.eventType}:`, payload.new);
        const operations = await gateService.getGateOutOperations();
        setGateOutOperations(operations);
      }
    );

    const unsubscribeReleaseOrders = realtimeService.subscribeToReleaseOrders(
      async (payload) => {
        console.log(`📡 Release Order ${payload.eventType}:`, payload.new);
        const orders = await releaseService.getAll();
        setReleaseOrders(orders);
      }
    );

    const unsubscribeContainers = realtimeService.subscribeToContainers(
      async (payload) => {
        console.log(`📡 Container ${payload.eventType}:`, payload.new);
        const containers = await containerService.getAll();
        setContainers(containers);
      }
    );

    return () => {
      unsubscribeGateOut();
      unsubscribeReleaseOrders();
      unsubscribeContainers();
      console.log(`🔌 Cleaned up Gate Out real-time subscriptions`);
    };
  }, [currentYard?.id]);

  const pendingOperations = gateOutOperations.filter(op => op.status === 'pending');
  const completedOperations = gateOutOperations.filter(op => op.status === 'completed');

  const canPerformGateOut = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';

  // Combine all operations for unified display with robust date handling
  const allOperations = [...pendingOperations, ...completedOperations].sort((a, b) => {
    const dateA = typeof a.date === 'string' ? new Date(a.date) : a.date;
    const dateB = typeof b.date === 'string' ? new Date(b.date) : b.date;
    return dateB.getTime() - dateA.getTime();
  });

  // Calculate dynamic statistics with robust date handling
  const today = new Date().toDateString();
  const todaysGateOuts = completedOperations.filter(op => {
    const opDate = typeof op.date === 'string' ? new Date(op.date) : op.date;
    return opDate.toDateString() === today;
  }).length;
  const containersProcessed = completedOperations.reduce((sum, op) => sum + op.processedContainers, 0);
  const issuesReported = completedOperations.filter(op => op.status === 'completed' && op.notes?.toLowerCase().includes('issue')).length;

  // Filter operations based on search term and selected filter
  const filteredOperations = allOperations.filter(operation => {
    const matchesSearch = !searchTerm ||
      operation.bookingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operation.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operation.clientCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operation.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operation.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = selectedFilter === 'all' || operation.status === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  const handleCreateGateOut = (data: GateOutFormData) => {
    if (!canPerformGateOut) return;

    // Validate yard operation
    const yardValidation = validateYardOperation('gate_out');
    if (!yardValidation.isValid) {
      setError(`Cannot perform gate out: ${yardValidation.message}`);
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      // Create new pending operation
      const newOperation: PendingGateOut = {
        id: `PGO-${Date.now()}`,
        date: new Date(),
        bookingNumber: data.booking?.bookingNumber || data.booking?.id || 'Unknown',
        clientCode: data.booking?.clientCode || 'Unknown',
        clientName: data.booking?.clientName || 'Unknown',
        bookingType: (data.booking?.bookingType as 'IMPORT' | 'EXPORT') || 'EXPORT',
        totalContainers: data.booking?.totalContainers || 1,
        processedContainers: 0,
        remainingContainers: data.booking?.totalContainers || 1,
        transportCompany: data.transportCompany,
        driverName: data.driverName,
        vehicleNumber: data.vehicleNumber,
        status: 'pending',
        createdBy: user?.name || 'Unknown',
        createdAt: new Date(),
        notes: data.notes,
        updatedBy: user?.name || 'System'
      };

      setPendingOperations(prev => [newOperation, ...prev]);
      setShowForm(false);

      setSuccessMessage(`Gate Out operation created for booking ${newOperation.bookingNumber}`);
    } catch (error) {
      setError(`Error creating gate out operation: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePendingOperationClick = (operation: PendingGateOut) => {
    if (operation.remainingContainers > 0) {
      setSelectedOperation(operation);
      setShowCompletionModal(true);
    }
  };

  const handleCompleteOperation = async (operation: PendingGateOut, containerNumbers: string[]) => {
    setIsProcessing(true);
    setError('');
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const processedCount = containerNumbers.length;
      const newProcessedTotal = operation.processedContainers + processedCount;
      const newRemainingTotal = operation.totalContainers - newProcessedTotal;

      const updatedOperation: PendingGateOut = {
        ...operation,
        processedContainers: newProcessedTotal,
        remainingContainers: newRemainingTotal,
        status: newRemainingTotal === 0 ? 'completed' : 'in_process',
        updatedAt: new Date(),
        updatedBy: user?.name || 'System'
      };

      if (updatedOperation.status === 'completed') {
        // Move to completed operations
        setPendingOperations(prev => prev.filter(op => op.id !== operation.id));
        setCompletedOperations(prev => [updatedOperation, ...prev]);
      } else {
        // Update in pending operations
        setPendingOperations(prev =>
          prev.map(op => op.id === operation.id ? updatedOperation : op)
        );
      }

      setShowCompletionModal(false);
      setSelectedOperation(null);

      const statusMessage = updatedOperation.status === 'completed'
        ? 'Gate Out operation completed successfully!'
        : `${processedCount} container(s) processed. ${newRemainingTotal} remaining.`;

      setSuccessMessage(statusMessage);
    } catch (error) {
      setError(`Error completing operation: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!canPerformGateOut) return (
    <div className="text-center py-12">
      <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
      <p className="text-gray-600">You don't have permission to perform gate out operations.</p>
    </div>
  );

  // Pending Operations View
  if (activeView === 'pending') return (
    <PendingOperationsView
      operations={pendingOperations}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onBack={() => setActiveView('overview')}
      onComplete={handleCompleteOperation}
      isProcessing={isProcessing}
    />
  );

  // Main Overview
  return (
    <div className="min-h-screen bg-gray-50 lg:bg-transparent">
      {/* Unified Mobile-First Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          {/* Title Section */}
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Gate Out</h1>
              <p className="text-sm text-gray-600 hidden lg:block">Container exit management</p>
            </div>
          </div>

          {/* Action Buttons - Mobile First */}
          <div className="grid grid-cols-2 gap-3 lg:flex lg:justify-end lg:space-x-3">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center space-x-2 px-4 py-3 lg:px-6 lg:py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl lg:rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              <Plus className="h-5 w-5 lg:h-4 lg:w-4" />
              <span className="text-sm lg:text-base">New Gate Out</span>
            </button>

            <button
              onClick={() => setActiveView('pending')}
              className="flex items-center justify-center space-x-2 px-4 py-3 lg:px-6 lg:py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl lg:rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              <Clock className="h-5 w-5 lg:h-4 lg:w-4" />
              <span className="text-sm lg:text-base">Pending ({pendingOperations.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unified Responsive Statistics */}
      <div className="px-4 py-4 lg:px-6 lg:py-6 space-y-4">
        {/* Mobile: 2x2 Grid | Tablet+: 4x1 Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {/* Today's Gate Outs */}
          <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-100 lg:border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 lg:hover:scale-100 active:scale-95">
            <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-2 lg:space-y-0">
              <div className="p-3 lg:p-2 bg-blue-500 lg:bg-blue-100 rounded-xl lg:rounded-lg shadow-lg lg:shadow-none">
                <Truck className="h-6 w-6 lg:h-5 lg:w-5 text-white lg:text-blue-600" />
              </div>
              <div className="lg:ml-3">
                <p className="text-2xl lg:text-lg font-bold text-gray-900">{todaysGateOuts}</p>
                <p className="text-xs font-medium text-blue-700 lg:text-gray-500 leading-tight">Today's Gate Outs</p>
              </div>
            </div>
          </div>

          {/* Pending Operations */}
          <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-100 lg:border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 lg:hover:scale-100 active:scale-95">
            <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-2 lg:space-y-0">
              <div className="p-3 lg:p-2 bg-orange-500 lg:bg-yellow-100 rounded-xl lg:rounded-lg shadow-lg lg:shadow-none">
                <Clock className="h-6 w-6 lg:h-5 lg:w-5 text-white lg:text-yellow-600" />
              </div>
              <div className="lg:ml-3">
                <p className="text-2xl lg:text-lg font-bold text-gray-900">{pendingOperations.length}</p>
                <p className="text-xs font-medium text-orange-700 lg:text-gray-500 leading-tight">Pending Operations</p>
              </div>
            </div>
          </div>

          {/* Containers Processed */}
          <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-100 lg:border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 lg:hover:scale-100 active:scale-95">
            <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-2 lg:space-y-0">
              <div className="p-3 lg:p-2 bg-green-500 lg:bg-green-100 rounded-xl lg:rounded-lg shadow-lg lg:shadow-none">
                <Package className="h-6 w-6 lg:h-5 lg:w-5 text-white lg:text-green-600" />
              </div>
              <div className="lg:ml-3">
                <p className="text-2xl lg:text-lg font-bold text-gray-900">{containersProcessed}</p>
                <p className="text-xs font-medium text-green-700 lg:text-gray-500 leading-tight">Containers Processed</p>
              </div>
            </div>
          </div>

          {/* Issues Reported */}
          <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-100 lg:border-gray-200 p-4 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105 lg:hover:scale-100 active:scale-95">
            <div className="flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left space-y-2 lg:space-y-0">
              <div className="p-3 lg:p-2 bg-red-500 lg:bg-red-100 rounded-xl lg:rounded-lg shadow-lg lg:shadow-none">
                <AlertTriangle className="h-6 w-6 lg:h-5 lg:w-5 text-white lg:text-red-600" />
              </div>
              <div className="lg:ml-3">
                <p className="text-2xl lg:text-lg font-bold text-gray-900">{issuesReported}</p>
                <p className="text-xs font-medium text-red-700 lg:text-gray-500 leading-tight">Issues Reported</p>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Search and Filter */}
        <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 lg:p-4">
            {/* Search Bar */}
            <div className="relative mb-4 lg:mb-0">
              <Search className="absolute left-4 lg:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 lg:h-4 lg:w-4" />
              <input
                type="text"
                placeholder="Search operations..."
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
            <div className="lg:hidden flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
              {['all', 'pending', 'in_process', 'completed'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    selectedFilter === filter
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg transform scale-105'
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
                  {filteredOperations.length} result{filteredOperations.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Unified Operations List - Mobile First */}
        <MobileGateOutOperationsTable
          operations={filteredOperations}
          searchTerm={searchTerm}
          selectedFilter={selectedFilter}
          onOperationClick={handlePendingOperationClick}
        />
      </div>

      {/* Gate Out Form Modal */}
      {showForm && (
        <GateOutModal
          showModal={showForm}
          setShowModal={setShowForm}
          availableBookings={mockAvailableBookings}
          onSubmit={handleCreateGateOut}
          isProcessing={isProcessing}
        />
      )}

      {/* Gate Out Completion Modal */}
      <GateOutCompletionModal
        isOpen={showCompletionModal}
        onClose={() => { setShowCompletionModal(false); setSelectedOperation(null); }}
        operation={selectedOperation}
        onComplete={handleCompleteOperation}
        isProcessing={isProcessing}
      />

      {/* Success Message Display */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-md z-50">
          <div className="flex items-center">
            <div className="h-5 w-5 bg-green-600 rounded-full flex items-center justify-center mr-2">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <p className="text-sm text-green-800 flex-1">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage('')}
              className="ml-2 text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md z-50">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => setError('')}
              className="ml-2 text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
