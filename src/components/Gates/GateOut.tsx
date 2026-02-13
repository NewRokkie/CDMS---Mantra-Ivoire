import React, { useState, useEffect } from 'react';
import { AlertTriangle, Menu, X, Clock, Plus, Truck, Package, Search, Filter, CheckCircle, Download } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { gateService, bookingReferenceService, containerService } from '../../services/api';
import { realtimeService } from '../../services/api/realtimeService';
import { GateOutModal } from './GateOutModal';
import { MobileGateOutOperationsTable } from './GateOut/MobileGateOutOperationsTable';
import { PendingOperationsView } from './GateOut/PendingOperationsView';
import { GateOutCompletionModal } from './GateOut/GateOutCompletionModal';
import { PendingGateOut } from './types';
import { handleError } from '../../services/errorHandling';
import { CardSkeleton } from '../Common/CardSkeleton';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { TableSkeleton } from '../Common/TableSkeleton';
import { exportToExcel, formatDateShortForExport, formatTimeForExport, formatDateForExport, formatDurationForExport } from '../../utils/excelExport';
import { useToast } from '../../hooks/useToast';
import { logger } from '../../utils/logger';

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
  const toast = useToast();

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
        setLoading(true);
        const [ordersData, containersData, operationsData] = await Promise.all([
          bookingReferenceService.getAll().catch(err => {
            handleError(err, 'GateOut.loadOrders');
            return [];
          }),
          containerService.getAll().catch(err => {
            handleError(err, 'GateOut.loadContainers');
            return [];
          }),
          gateService.getGateOutOperations().catch(err => {
            handleError(err, 'GateOut.loadOperations');
            return [];
          })
        ]);

        // Ensure we have arrays before setting state
        setReleaseOrders(Array.isArray(ordersData) ? ordersData : []);
        setContainers(Array.isArray(containersData) ? containersData : []);
        setGateOutOperations(Array.isArray(operationsData) ? operationsData : []);
      } catch (error) {
        handleError(error, 'GateOut.loadData');
        setReleaseOrders([]);
        setContainers([]);
        setGateOutOperations([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (!currentYard?.id) return;

    const unsubscribeGateOut = realtimeService.subscribeToGateOutOperations(
      currentYard.id,
      async (payload) => {
        try {
          const operations = await gateService.getGateOutOperations();
          setGateOutOperations(Array.isArray(operations) ? operations : []);
        } catch (error) {
          console.error('Error fetching gate out operations:', error);
          handleError(error, 'GateOut.realtimeUpdate');
        }
      }
    );

    const unsubscribeBookingReferences = realtimeService.subscribeToBookingReferences(
      async (payload) => {
        try {
          const orders = await bookingReferenceService.getAll();
          setReleaseOrders(Array.isArray(orders) ? orders : []);
        } catch (error) {
          console.error('Error fetching booking references:', error);
          handleError(error, 'GateOut.realtimeUpdate');
        }
      }
    );

    const unsubscribeContainers = realtimeService.subscribeToContainers(
      async (payload) => {
        try {
          const containers = await containerService.getAll();
          setContainers(Array.isArray(containers) ? containers : []);
        } catch (error) {
          console.error('Error fetching containers:', error);
          handleError(error, 'GateOut.realtimeUpdate');
        }
      }
    );

    return () => {
      unsubscribeGateOut();
      unsubscribeBookingReferences();
      unsubscribeContainers();
    };
  }, [currentYard?.id]);

  const pendingOperations = gateOutOperations.filter(op => op.status === 'pending');
  const completedOperations = gateOutOperations.filter(op => op.status === 'completed');

  const canPerformGateOut = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';

  // Combine all operations for unified display with robust date handling
  const allOperations = [...pendingOperations, ...completedOperations].sort((a, b) => {
    const dateA = a.date ? (typeof a.date === 'string' ? new Date(a.date) : a.date) : new Date(0);
    const dateB = b.date ? (typeof b.date === 'string' ? new Date(b.date) : b.date) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  // Calculate dynamic statistics with robust date handling
  const today = new Date().toDateString();
  const todaysGateOuts = completedOperations.filter(op => {
    const opDate = op.date ? (typeof op.date === 'string' ? new Date(op.date) : op.date) : new Date();
    return opDate.toDateString() === today;
  }).length;
  const containersProcessed = completedOperations.reduce((sum, op) => sum + (op.processedContainers || 0), 0);
  const issuesReported = completedOperations.filter(op =>
    op.status === 'completed' &&
    op.notes &&
    op.notes.toLowerCase().includes('issue')
  ).length;

  // Filter operations based on search term and selected filter
  const filteredOperations = allOperations.filter(operation => {
    const matchesSearch = !searchTerm ||
      (operation.bookingNumber && operation.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (operation.clientName && operation.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (operation.clientCode && operation.clientCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (operation.driverName && operation.driverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (operation.vehicleNumber && operation.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = selectedFilter === 'all' || operation.status === selectedFilter;

    return matchesSearch && matchesFilter;
  });

  const handleExportGateOut = async () => {
    try {
      // Calculate durations for each operation
      const dataToExport = await Promise.all(
        filteredOperations.map(async (op) => {
          let durations: any = {};

          // Calculate time tracking durations if operation is completed
          if (op.status === 'completed' && op.id) {
            try {
              const { gateTimeTrackingService } = await import('../../services/api/gateTimeTrackingService');
              durations = await gateTimeTrackingService.calculateGateOutDurations(op.id);
            } catch (error) {
              console.warn('Failed to calculate durations for operation:', op.id, error);
            }
          }

          // Find the associated booking to get transaction type
          const associatedBooking = releaseOrders.find(booking => 
            booking.id === op.bookingReferenceId || booking.bookingNumber === op.bookingNumber
          );

          return {
            bookingNumber: op.bookingNumber || '',
            bookingType: op.bookingType || '',
            transactionType: associatedBooking?.transactionType || 'Positionnement', // Default to 'Positionnement'
            clientName: op.clientName || '',
            clientCode: op.clientCode || '',
            status: op.status || '',
            totalContainers: op.totalContainers || 0,
            processedContainers: op.processedContainers || 0,
            remainingContainers: op.remainingContainers || 0,
            driverName: op.driverName || '',
            vehicleNumber: op.vehicleNumber || op.truckNumber || '', // Use vehicleNumber or truckNumber
            transportCompany: op.transportCompany || '',
            yardName: currentYard?.name || '',
            operatorName: op.operatorName || '',
            createdDate: formatDateShortForExport(op.createdAt || op.date),
            createdTime: formatTimeForExport(op.createdAt || op.date),
            updatedAt: formatDateShortForExport(op.updatedAt || op.createdAt || op.date),
            notes: op.notes || '',
            // Time tracking metrics
            totalDuration: formatDurationForExport(durations.totalDuration),
            containerSelectionDuration: formatDurationForExport(durations.containerSelectionDuration),
            ediProcessingDuration: formatDurationForExport(durations.ediProcessingDuration),
            // Additional time tracking fields
            containerSelectionStarted: formatDateForExport(op.container_selection_started),
            containerSelectionCompleted: formatDateForExport(op.container_selection_completed),
            ediProcessingStarted: formatDateForExport(op.edi_processing_started),
            ediTransmissionDate: formatDateForExport(op.edi_transmission_date)
          };
        })
      );

      exportToExcel({
        filename: `gate_out_operations_${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: 'Gate Out Operations',
        columns: [
          { header: 'Numéro Booking', key: 'bookingNumber', width: 20 },
          { header: 'Type Booking', key: 'bookingType', width: 15 },
          { header: 'Transaction', key: 'transactionType', width: 18 },
          { header: 'Client', key: 'clientName', width: 25 },
          { header: 'Code Client', key: 'clientCode', width: 15 },
          { header: 'Statut', key: 'status', width: 15 },
          { header: 'Total Conteneurs', key: 'totalContainers', width: 15 },
          { header: 'Conteneurs Traités', key: 'processedContainers', width: 18 },
          { header: 'Conteneurs Restants', key: 'remainingContainers', width: 18 },
          { header: 'Chauffeur', key: 'driverName', width: 20 },
          { header: 'Véhicule', key: 'vehicleNumber', width: 15 },
          { header: 'Transporteur', key: 'transportCompany', width: 25 },
          { header: 'Dépôt', key: 'yardName', width: 20 },
          { header: 'Opérateur', key: 'operatorName', width: 20 },
          { header: 'Date Création', key: 'createdDate', width: 15 },
          { header: 'Heure Création', key: 'createdTime', width: 15 },
          { header: 'Date Modification', key: 'updatedAt', width: 20 },
          { header: 'Notes', key: 'notes', width: 30 },
          // Time tracking columns
          { header: 'Durée Totale', key: 'totalDuration', width: 15 },
          { header: 'Durée Sélection Conteneurs', key: 'containerSelectionDuration', width: 25 },
          { header: 'Durée Traitement EDI', key: 'ediProcessingDuration', width: 20 },
          // Detailed timestamps
          { header: 'Début Sélection Conteneurs', key: 'containerSelectionStarted', width: 25 },
          { header: 'Fin Sélection Conteneurs', key: 'containerSelectionCompleted', width: 25 },
          { header: 'Début Traitement EDI', key: 'ediProcessingStarted', width: 20 },
          { header: 'Date Transmission EDI', key: 'ediTransmissionDate', width: 20 }
        ],
        data: dataToExport
      });

      toast.success('Export Gate Out completed successfully');
    } catch (error) {
      console.error('Error exporting Gate Out data:', error);
      toast.error('Failed to export Gate Out data');
    }
  };

  const handleCreateGateOut = async (data: GateOutFormData) => {
    if (!canPerformGateOut) return;

    // Validate yard operation
    const yardValidation = validateYardOperation('gate_out');
    if (!yardValidation.isValid) {
      setError(`Cannot perform gate out: ${yardValidation.message || 'Invalid yard operation'}`);
      return;
    }

    if (!data.booking?.id) {
      setError('Please select a valid booking');
      return;
    }

    if (!currentYard?.id || !user?.id) {
      setError('Missing yard or user information');
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      // Create pending gate out operation in database
      const result = await gateService.createPendingGateOut({
        bookingReferenceId: data.booking.id,
        transportCompany: data.transportCompany || '-',
        driverName: data.driverName || '-',
        vehicleNumber: data.vehicleNumber || '-',
        notes: data.notes || '-',
        operatorId: user.id,
        operatorName: user.name || 'System',
        yardId: currentYard.id
      });

      if (!result.success) {
        setError(result.error || 'Failed to create gate out operation');
        return;
      }

      // Reload operations from database
      const operations = await gateService.getGateOutOperations();
      setGateOutOperations(operations);

      setShowForm(false);
      setSuccessMessage(`Gate Out operation created for booking ${data.booking.bookingNumber || data.booking.id}`);
    } catch (error) {
      setError(`Error creating gate out operation: ${error instanceof Error ? error.message : String(error)}`);
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
    if (!user?.id) {
      setError('User information not available');
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      // Find container IDs from container numbers
      const selectedContainers = containers.filter(c => containerNumbers.includes(c.number));
      const containerIds = selectedContainers.map(c => c.id);

      if (containerIds.length !== containerNumbers.length) {
        setError('Some containers were not found in the system');
        return;
      }

      // Update operation in database
      const result = await gateService.updateGateOutOperation(operation.id, {
        containerIds,
        operatorId: user.id,
        operatorName: user.name || 'System'
      });

      if (!result.success) {
        setError(result.error || 'Failed to process containers');
        return;
      }

      // Process EDI CODECO transmission for Gate Out
      try {
        // Import Gate Out CODECO service
        const { gateOutCodecoService } = await import('../../services/edi/gateOutCodecoService');

        // Find the booking reference using bookingReferenceId if available, otherwise fall back to bookingNumber
        const booking = operation.bookingNumber
          ? releaseOrders.find(order => order.id === operation.bookingNumber)
          : operation.bookingNumber
            ? releaseOrders.find(order => order.bookingNumber === operation.bookingNumber)
            : null;

        if (booking && selectedContainers.length > 0) {
          // Create Gate Out CODECO data with all required fields
          const gateOutCodecoData = gateOutCodecoService.createGateOutCodecoDataFromOperation(
            operation,
            selectedContainers,
            booking,
            currentYard?.id || 'unknown',
            user.name || 'System',
            user.id || 'system'
          );

          // Yard information for EDI
          const yardInfo = {
            companyCode: currentYard?.code || 'DEPOT',
            plant: currentYard?.id || 'SYSTEM',
            customer: booking.clientCode || 'UNKNOWN'
          };

          // Generate and transmit CODECO for Gate Out
          const codecoResult = await gateOutCodecoService.generateAndTransmitCodeco(
            gateOutCodecoData,
            yardInfo
          );

          if (codecoResult.success) {
            logger.info('Gate Out CODECO transmitted successfully', 'GateOut', {
              bookingNumber: booking.bookingNumber,
              containerCount: selectedContainers.length,
              transmissionCount: codecoResult.transmissionLogs?.length || 0
            });
          } else {
            logger.warn('Gate Out CODECO transmission failed', 'GateOut', {
              error: codecoResult.error,
              bookingNumber: booking.bookingNumber
            });
          }
        }
      } catch (ediError) {
        // EDI transmission failed, but don't fail the entire Gate Out operation
        logger.error('EDI CODECO transmission failed for Gate Out', 'GateOut', ediError);
        console.error('Gate Out EDI CODECO transmission failed:', ediError);
      }

      // Reload operations and containers from database
      const [operations, updatedContainers] = await Promise.all([
        gateService.getGateOutOperations(),
        containerService.getAll()
      ]);

      setGateOutOperations(operations);
      setContainers(updatedContainers);

      setShowCompletionModal(false);
      setSelectedOperation(null);

      const processedCount = containerNumbers.length;
      const newRemainingTotal = operation.remainingContainers - processedCount;
      const statusMessage = newRemainingTotal === 0
        ? 'Gate Out operation completed successfully!'
        : `${processedCount} container(s) processed. ${newRemainingTotal} remaining.`;

      setSuccessMessage(statusMessage);
    } catch (error) {
      setError(`Error completing operation: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!canPerformGateOut) return (
    <div className="text-center py-12">
      <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{t('common.restricted')}</h3>
      <p className="text-gray-600">{t('common.unauthorized')}</p>
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
  // Show skeletons while initial data is loading
  if (loading) return (
    <div className="min-h-screen bg-gray-50 lg:bg-transparent">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{t('gate.out.title')}</h1>
              <p className="text-sm text-gray-600 hidden lg:block">{t('gate.out.subtitle')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 lg:px-6 lg:py-6 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>

        <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-200 shadow-sm overflow-hidden p-4">
          <TableSkeleton />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 lg:bg-transparent">
      {/* Unified Mobile-First Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 lg:px-6 py-4 lg:py-6">
          {/* Title Section */}
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{t('gate.out.title')}</h1>
              <p className="text-sm text-gray-600 hidden lg:block">{t('gate.out.subtitle')}</p>
            </div>
          </div>

          {/* Action Buttons - Mobile First */}
          <div className="grid grid-cols-2 gap-3 lg:flex lg:justify-end lg:space-x-3">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center space-x-2 px-4 py-3 lg:px-6 lg:py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl lg:rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              <Plus className="h-5 w-5 lg:h-4 lg:w-4" />
              <span className="text-sm lg:text-base">Gate Out</span>
            </button>

            <button
              onClick={() => setActiveView('pending')}
              className="flex items-center justify-center space-x-2 px-4 py-3 lg:px-6 lg:py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl lg:rounded-lg hover:from-orange-700 hover:to-orange-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              <Clock className="h-5 w-5 lg:h-4 lg:w-4" />
              <span className="text-sm lg:text-base">{t('gate.out.pending')} ({pendingOperations.length})</span>
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
                <p className="text-xs font-medium text-blue-700 lg:text-gray-500 leading-tight">{t('gate.out.stats.today')}</p>
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
                <p className="text-xs font-medium text-orange-700 lg:text-gray-500 leading-tight">{t('gate.out.stats.pending')}</p>
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
                <p className="text-xs font-medium text-green-700 lg:text-gray-500 leading-tight">{t('gate.out.stats.processed')}</p>
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
                <p className="text-xs font-medium text-red-700 lg:text-gray-500 leading-tight">{t('gate.out.stats.issues')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Search and Filter */}
        <div className="bg-white rounded-2xl lg:rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="lg:flex lg:justify-between lg:items-center p-4 lg:p-4">
            {/* Search Bar */}
            <div className="relative mb-4 lg:mb-0 lg:flex-1 lg:max-w-md">
              <Search className="absolute left-4 lg:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 lg:h-4 lg:w-4" />
              <input
                type="text"
                placeholder={t('gate.in.search')}
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
                  {filter === 'all' ? t('common.all') : filter === 'in_process' ? t('releases.inProcess') : t(`common.status.${filter}`)}
                </button>
              ))}
            </div>

            <div className="hidden lg:flex items-center space-x-3">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
              >
                <option value="all">{t('common.all')}</option>
                <option value="pending">{t('common.status.pending')}</option>
                <option value="in_process">{t('releases.inProcess')}</option>
                <option value="completed">{t('common.status.completed')}</option>
              </select>
              {searchTerm && (
                <span className="text-sm text-gray-500 bg-gray-100 px-3 py-2 rounded-lg font-medium">
                  {filteredOperations.length} result{filteredOperations.length !== 1 ? 's' : ''}
                </span>
              )}
              <button
                onClick={handleExportGateOut}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title={t('common.export')}
              >
                <Download className="h-4 w-4" />
                <span>{t('common.export')}</span>
              </button>
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
          availableBookings={releaseOrders}
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

      {/* Processing Spinner Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      )}

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
