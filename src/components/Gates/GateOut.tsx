import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { GateOutModal } from './GateOutModal';
import { ReleaseOrder } from '../../types';
import { GateOutHeader } from './GateOut/GateOutHeader';
import { GateOutStats } from './GateOut/GateOutStats';
import { GateOutSearchFilter } from './GateOut/GateOutSearchFilter';
import { GateOutOperationsTable } from './GateOut/GateOutOperationsTable';
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
    status: 'validated',
    createdBy: 'Jane Operator',
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
    status: 'validated',
    createdBy: 'Sarah Client',
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

  const { t } = useLanguage();
  const { user } = useAuth();

  const canPerformGateOut = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';

  // Combine all operations for unified display
  const allOperations = [...pendingOperations, ...completedOperations].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleCreateGateOut = (data: any) => {
    if (!canPerformGateOut) return;

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
        notes: data.notes
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
        status: newRemainingTotal === 0 ? 'completed' : 'in_process'
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

  if (!canPerformGateOut) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to perform gate out operations.</p>
      </div>
    );
  }

  // Pending Operations View
  if (activeView === 'pending') {
    return (
      <PendingOperationsView
        operations={pendingOperations}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onBack={() => setActiveView('overview')}
        onComplete={handleCompleteOperation}
        isProcessing={isProcessing}
      />
    );
  }

  // Main Overview
  return (
    <div className="space-y-6">
      <GateOutHeader
        pendingCount={pendingOperations.length}
        onShowPending={() => setActiveView('pending')}
        onShowForm={() => setShowForm(true)}
      />

      <GateOutStats
        todayGateOuts={8}
        pendingOperations={pendingOperations.length}
        containersProcessed={156}
        issuesReported={2}
      />

      <GateOutSearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filteredCount={allOperations.filter(op =>
          (op.bookingNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
          (op.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
          (op.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
          (op.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
        ).length}
      />

      <GateOutOperationsTable
        operations={allOperations}
        searchTerm={searchTerm}
        onOperationClick={handlePendingOperationClick}
      />

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
        onClose={() => {
          setShowCompletionModal(false);
          setSelectedOperation(null);
        }}
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