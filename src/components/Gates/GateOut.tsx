import React, { useState } from 'react';
import { AlertTriangle, Menu, X, Clock, Plus, Truck, Package, Search, Filter } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { GateOutModal } from './GateOutModal';
import { ReleaseOrder } from '../../types';
import { MobileGateOutHeader } from './GateOut/MobileGateOutHeader';
import { MobileGateOutStats } from './GateOut/MobileGateOutStats';
import { MobileGateOutOperationsTable } from './GateOut/MobileGateOutOperationsTable';
import { PendingOperationsView } from './GateOut/PendingOperationsView';
import { GateOutCompletionModal } from './GateOut/GateOutCompletionModal';
import { PendingGateOut } from './GateOut/types';

// Mock data for available bookings
const mockAvailableBookings: ReleaseOrder[] = [
  {
    id: 'RO-2025-001',
    bookingNumber: 'BK-MAEU-2025-001',
    clientId: '1',
    clientCode: 'MAEU',
    clientName: 'Maersk Line',
    bookingType: 'EXPORT',
    containerQuantities: { size20ft: 2, size40ft: 3 },
    totalContainers: 5,
    remainingContainers: 5,
    status: 'pending',
    createdBy: 'System',
    updatedBy: 'System',
    validatedBy: 'Mike Supervisor',
    createdAt: new Date('2025-01-11T09:00:00'),
    validatedAt: new Date('2025-01-11T10:30:00'),
    estimatedReleaseDate: new Date('2025-01-12T14:00:00'),
    notes: 'Priority booking - handle with care'
  },
  {
    id: 'RO-2025-004',
    bookingNumber: 'BK-CMA-2025-004',
    clientId: '2', 
    clientCode: 'CMA',
    clientName: 'CMA CGM',
    bookingType: 'IMPORT',
    containerQuantities: { size20ft: 1, size40ft: 0 }, 
    totalContainers: 1, 
    remainingContainers: 1, 
    status: 'pending', 
    createdBy: 'System', 
    updatedBy: 'System', 
    validatedBy: 'Mike Supervisor', 
    createdAt: new Date('2025-01-11T11:00:00'),
    validatedAt: new Date('2025-01-11T12:30:00'),
    estimatedReleaseDate: new Date('2025-01-12T16:00:00'),
    notes: 'Single container booking - urgent processing required'
  }
];

// Mock pending operations
const mockPendingOperations: PendingGateOut[] = [
  {
    id: 'PGO-001',
    date: new Date('2025-01-11T14:30:00'),
    bookingNumber: 'BK-MAEU-2025-001',
    clientCode: 'MAEU',
    clientName: 'Maersk Line',
    bookingType: 'EXPORT',
    totalContainers: 5,
    processedContainers: 2,
    remainingContainers: 3,
    transportCompany: 'Swift Transport',
    driverName: 'John Smith',
    vehicleNumber: 'ABC-123',
    status: 'in_process',
    createdBy: 'Jane Operator',
    createdAt: new Date('2025-01-11T14:30:00'),
    updatedBy: 'System',
    estimatedReleaseDate: new Date('2025-01-12T14:00:00'),
    notes: 'Priority booking - handle with care'
  },
  {
    id: 'PGO-002',
    date: new Date('2025-01-11T15:45:00'),
    bookingNumber: 'BK-CMA-2025-004',
    clientCode: 'CMA',
    clientName: 'CMA CGM',
    bookingType: 'IMPORT',
    totalContainers: 1,
    processedContainers: 0,
    remainingContainers: 1,
    transportCompany: 'Express Logistics',
    driverName: 'Maria Garcia',
    vehicleNumber: 'XYZ-456',
    status: 'pending',
    createdBy: 'Sarah Client',
    createdAt: new Date('2025-01-11T15:45:00'),
    updatedBy: 'System',
    estimatedReleaseDate: new Date('2025-01-12T16:00:00'),
    notes: 'Single container booking - urgent processing required'
  }
];

// Mock completed operations
const mockCompletedOperations: PendingGateOut[] = [
  {
    id: 'CGO-001',
    date: new Date('2025-01-11T13:15:00'),
    bookingNumber: 'BK-SHIP-2025-003',
    clientCode: 'SHIP001',
    clientName: 'Shipping Solutions Inc',
    bookingType: 'EXPORT',
    totalContainers: 2,
    processedContainers: 2,
    remainingContainers: 0,
    transportCompany: 'Local Transport Co',
    driverName: 'David Brown',
    vehicleNumber: 'GHI-012',
    status: 'completed',
    createdBy: 'Jane Operator',
    createdAt: new Date('2025-01-11T11:30:00'),
    updatedBy: 'System',
    estimatedReleaseDate: new Date('2025-01-13T09:00:00'),
    notes: 'Client requested release - completed successfully'
  }
];

export const GateOut: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'pending'>('overview');
  const [showForm, setShowForm] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<PendingGateOut | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(mockPendingOperations);
  const [completedOperations, setCompletedOperations] = useState(mockCompletedOperations);
  const [error, setError] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const { t } = useLanguage();
  const { user } = useAuth();
  const { currentYard, validateYardOperation } = useYard();

  const canPerformGateOut = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';

  // Combine all operations for unified display
  const allOperations = [...pendingOperations, ...completedOperations].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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

  const handleCreateGateOut = (data: any) => {
    if (!canPerformGateOut) return;

    // Validate yard operation
    const yardValidation = validateYardOperation('gate_out');
    if (!yardValidation.isValid) {
      alert(`Cannot perform gate out: ${yardValidation.message}`);
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      // Create new pending operation
      const newOperation: PendingGateOut = {
        id: `PGO-${Date.now()}`,
        date: new Date(),
        bookingNumber: data.booking?.bookingNumber || data.booking?.id,
        clientCode: data.booking?.clientCode,
        clientName: data.booking?.clientName,
        bookingType: data.booking?.bookingType,
        totalContainers: data.booking?.totalContainers || 1,
        processedContainers: 0,
        remainingContainers: data.booking?.totalContainers || 1,
        transportCompany: data.transportCompany,
        driverName: data.driverName,
        vehicleNumber: data.vehicleNumber,
        status: 'pending',
        createdBy: user?.name || 'Unknown',
        createdAt: new Date(),
        estimatedReleaseDate: data.booking?.estimatedReleaseDate,
        notes: data.notes,
        updatedBy: user?.name || 'System'
      };

      setPendingOperations(prev => [newOperation, ...prev]);
      setShowForm(false);

      alert(`Gate Out operation created for booking ${newOperation.bookingNumber}`);
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

      alert(statusMessage);
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
    <div className="lg:space-y-6">
      {/* Mobile-First Header */}
      <div className="lg:hidden">
        <MobileGateOutHeader
          pendingCount={pendingOperations.length}
          onShowPending={() => setActiveView('pending')}
          onShowForm={() => setShowForm(true)}
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gate Out Management</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveView('pending')}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Clock className="h-4 w-4" />
            <span>Pending ({pendingOperations.length})</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-success flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Gate Out</span>
          </button>
        </div>
      </div>

      {/* Mobile-Optimized Content */}
      <div className="px-4 py-6 lg:px-0 lg:py-0 space-y-6">
        <div className="lg:hidden">
          <MobileGateOutStats
            todayGateOuts={8}
            pendingOperations={pendingOperations.length}
            containersProcessed={156}
            issuesReported={2}
          />
        </div>

        {/* Desktop Stats */}
        <div className="hidden lg:grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Today's Gate Outs</p>
                <p className="text-lg font-semibold text-gray-900">8</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Pending Operations</p>
                <p className="text-lg font-semibold text-gray-900">{pendingOperations.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Containers Processed</p>
                <p className="text-lg font-semibold text-gray-900">156</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Issues Reported</p>
                <p className="text-lg font-semibold text-gray-900">2</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Filter Chips */}
        <div className="lg:hidden flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {['all', 'pending', 'in_process', 'completed'].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedFilter === filter
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Mobile Search */}
        <div className="lg:hidden bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search operations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-4 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Search and Filter */}
        <div className="hidden lg:block bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search operations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_process">In Process</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="btn-secondary flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </button>
              {searchTerm && (
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {filteredOperations.length} result{filteredOperations.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Mobile-Optimized Operations List */}
        <div className="lg:hidden">
          <MobileGateOutOperationsTable
            operations={filteredOperations}
            searchTerm={searchTerm}
            selectedFilter={selectedFilter}
            onOperationClick={handlePendingOperationClick}
          />
        </div>

        {/* Desktop Operations Table */}
        <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                    <td className="px-6 py-4 whitespace-nowrap">
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
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        operation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        operation.status === 'in_process' ? 'bg-blue-100 text-blue-800' :
                        operation.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {operation.status.charAt(0).toUpperCase() + operation.status.slice(1).replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOperations.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No operations found</h3>
              <p className="text-gray-600">
                {searchTerm ? "Try adjusting your search criteria." : "No gate out operations have been created yet."}
              </p>
            </div>
          )}
        </div>
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

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md">
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
