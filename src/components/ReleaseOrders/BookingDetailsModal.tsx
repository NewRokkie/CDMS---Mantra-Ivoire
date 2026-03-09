import React, { useState, useEffect } from 'react';
import { FileText, Package, Calendar, User, Clock, AlertTriangle, Ban, CheckCircle, Hash, BarChart3, Edit } from 'lucide-react';
import { BookingReference } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { bookingReferenceService, userService } from '../../services/api';
import { DataDisplayModal } from '../Common/Modal/DataDisplayModal';
import { handleError } from '../../services/errorHandling';
import { LoadingSpinner } from '../Common/LoadingSpinner';
import { useToast } from '../../hooks/useToast';

interface BookingDetailsModalProps {
  booking: BookingReference | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (booking: BookingReference) => void;
  onEdit?: (booking: BookingReference) => void;
  openToCancelForm?: boolean;
}

interface CancellationData {
  reason: string;
  newBookingReference: string;
}

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  booking,
  isOpen,
  onClose,
  onUpdate,
  onEdit,
  openToCancelForm = false
}) => {
  const { canViewAllData } = useAuth();
  const { theme } = useTheme();
  const toast = useToast();
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancellationData, setCancellationData] = useState<CancellationData>({
    reason: '',
    newBookingReference: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdByName, setCreatedByName] = useState<string>('');
  const [loadingCreatedBy, setLoadingCreatedBy] = useState(false);

  // Fetch user name for createdBy field
  useEffect(() => {
    const fetchCreatedByName = async () => {
      if (booking?.createdBy) {
        setLoadingCreatedBy(true);
        try {
          // Try to get user by ID first, if it fails, assume createdBy is already a name
          const user = await userService.getById(booking.createdBy);
          setCreatedByName(user?.name || booking.createdBy);
        } catch (error) {
          handleError(error, 'BookingDetailsModal.fetchCreatedByName');
          setCreatedByName(booking.createdBy);
        } finally {
          setLoadingCreatedBy(false);
        }
      }
    };

    if (booking) {
      fetchCreatedByName();
    }
  }, [booking]);

  // Auto-open cancel form if requested
  useEffect(() => {
    if (openToCancelForm && canCancelBooking()) {
      setShowCancelForm(true);
    }
  }, [openToCancelForm, booking]);

  if (!isOpen || !booking) return null;

  const getStatusBadge = (status: BookingReference['status']) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300', label: 'Pending', icon: Clock },
      in_process: { color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300', label: 'In Process', icon: Package },
      completed: { color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', label: 'Completed', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300', label: 'Cancelled', icon: Ban }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const handleCancel = async () => {
    if (!cancellationData.reason.trim()) {
      toast.warning('Please provide a cancellation reason');
      return;
    }

    setIsProcessing(true);
    try {
      const updatedBooking = await bookingReferenceService.cancel(booking.id, {
        reason: cancellationData.reason,
        newBookingReference: cancellationData.newBookingReference || undefined
      });

      onUpdate(updatedBooking);
      setShowCancelForm(false);
      setCancellationData({ reason: '', newBookingReference: '' });
    } catch (error) {
      handleError(error, 'BookingDetailsModal.handleCancel');
      toast.error('Failed to cancel booking. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const canCancelBooking = () => {
    return canViewAllData() && booking.status !== 'cancelled' && booking.status !== 'completed';
  };

  const modalActions = [];

  // Only show actions when cancel form is not open
  if (!showCancelForm) {
    if (canCancelBooking()) {
      modalActions.push({
        label: 'Cancel Booking',
        onClick: () => setShowCancelForm(true),
        variant: 'danger' as const,
        icon: Ban,
        disabled: false,
        loading: false
      });
    }
    // Add Edit button if in pending status and onEdit handler provided
    if (onEdit && booking.status === 'pending' && canViewAllData()) {
      modalActions.push({
        label: 'Edit Booking',
        onClick: () => {
          onClose(); // Close the details modal first
          onEdit(booking);
        },
        variant: 'primary' as const,
        icon: Edit,
        disabled: false,
        loading: false
      });
    }
  }

  return (
    <DataDisplayModal
      isOpen={isOpen}
      onClose={onClose}
      title="Booking Details"
      subtitle={`Reference: ${booking.bookingNumber}`}
      icon={FileText}
      actions={modalActions}
      data={booking}
    >
      <BookingDetailsContent
        booking={booking}
        createdByName={createdByName}
        loadingCreatedBy={loadingCreatedBy}
        getStatusBadge={getStatusBadge}
        showCancelForm={showCancelForm}
        cancellationData={cancellationData}
        setCancellationData={setCancellationData}
        isProcessing={isProcessing}
        handleCancel={handleCancel}
        setShowCancelForm={setShowCancelForm}
      />
    </DataDisplayModal>
  );
};

// Extract content into separate component for better organization
interface BookingDetailsContentProps {
  booking: BookingReference;
  createdByName: string;
  loadingCreatedBy?: boolean;
  getStatusBadge: (status: BookingReference['status']) => JSX.Element;
  showCancelForm: boolean;
  cancellationData: CancellationData;
  setCancellationData: React.Dispatch<React.SetStateAction<CancellationData>>;
  isProcessing: boolean;
  handleCancel: () => Promise<void>;
  setShowCancelForm: (show: boolean) => void;
}

const BookingDetailsContent: React.FC<BookingDetailsContentProps> = ({
  booking,
  createdByName,
  loadingCreatedBy = false,
  getStatusBadge,
  showCancelForm,
  cancellationData,
  setCancellationData,
  isProcessing,
  handleCancel,
  setShowCancelForm
}) => {
  // If cancel form is open, show only the cancel form
  if (showCancelForm) {
    return (
      <div className="bg-gradient-to-r from-red-50 dark:from-red-900/20 to-orange-50 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <h4 className="text-lg font-semibold text-red-800 dark:text-red-300">Cancel Booking</h4>
        </div>
        <p className="text-sm text-red-700 dark:text-red-400 mb-4">
          This action will cancel the booking and cannot be undone. Please provide a reason for the cancellation.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Cancellation Reason *
            </label>
            <textarea
              value={cancellationData.reason}
              onChange={(e) => setCancellationData(prev => ({ ...prev, reason: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors dark:bg-gray-700 dark:text-white"
              rows={4}
              placeholder="Please provide a detailed reason for cancellation (e.g., client request, operational issues, etc.)"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {cancellationData.reason.length}/500 characters
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              New Booking Reference (Optional)
            </label>
            <input
              type="text"
              value={cancellationData.newBookingReference}
              onChange={(e) => setCancellationData(prev => ({ ...prev, newBookingReference: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors dark:bg-gray-700 dark:text-white"
              placeholder="Enter replacement booking reference if applicable"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              If this booking is being replaced by a new one, enter the new booking reference here
            </p>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-red-200 dark:border-red-800">
            <button
              onClick={() => {
                setShowCancelForm(false);
                setCancellationData({ reason: '', newBookingReference: '' });
              }}
              className="px-6 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              disabled={isProcessing}
            >
              Back
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              disabled={isProcessing || !cancellationData.reason.trim()}
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  Confirm Cancellation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Package className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Booking Reference
          </label>
          <div className="flex items-center">
            <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
            <span className="text-sm text-gray-900 dark:text-white font-mono">{booking.bookingNumber}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          {getStatusBadge(booking.status)}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Total Containers
          </label>
          <div className="flex items-center">
            <Package className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
            <span className="text-sm text-gray-900 dark:text-white">{booking.totalContainers}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Created Date
          </label>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
            <span className="text-sm text-gray-900 dark:text-white">
              {new Date(booking.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Created By
          </label>
          <div className="flex items-center">
            <User className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
              {loadingCreatedBy ? (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">Loading...</span>
                </div>
              ) : (
                <span className="text-sm text-gray-900 dark:text-white">{createdByName}</span>
              )}
          </div>
        </div>

        {booking.updatedAt && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last Updated
            </label>
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2" />
              <span className="text-sm text-gray-900 dark:text-white">
                {new Date(booking.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Container Quantity Breakdown */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
    <Hash className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
    Container Quantity Breakdown
  </h3>

  {/* Original Quantities */}
  <div className="mb-6">
    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
      <Package className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2" />
      Original Booking Quantities
    </h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* 20ft Original */}
      <div className="bg-gradient-to-br from-blue-50 dark:from-blue-900/30 to-blue-100 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-blue-800 dark:text-blue-300">20ft Containers</span>
          <Hash className="w-4 h-4 text-blue-500 dark:text-blue-400" />
        </div>
        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-1">
          {booking.containerQuantities.size20ft}
        </div>
        <div className="text-xs text-blue-700 dark:text-blue-400">Standard Size</div>
      </div>

      {/* 40ft Original */}
      <div className="bg-gradient-to-br from-green-50 dark:from-green-900/30 to-green-100 dark:to-green-800/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-green-800 dark:text-green-300">40ft Containers</span>
          <Hash className="w-4 h-4 text-green-500 dark:text-green-400" />
        </div>
        <div className="text-2xl font-bold text-green-900 dark:text-green-100 mb-1">
          {booking.containerQuantities.size40ft}
        </div>
        <div className="text-xs text-green-700 dark:text-green-400">High Capacity</div>
      </div>
    </div>
  </div>

  {/* Remaining Quantities */}
  <div className="mb-6">
    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
      <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400 mr-2" />
      Remaining to Process
    </h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {(() => {
        // Calculate remaining containers by size based on proportional distribution
        const totalOriginal = booking.totalContainers;
        const totalRemaining = booking.remainingContainers ?? booking.totalContainers;
        const ratio20ft = booking.containerQuantities.size20ft / totalOriginal;

        // Distribute remaining containers proportionally (using ratios to maintain proportion)
        const remaining20ft = Math.round(totalRemaining * ratio20ft);

        // Adjust for rounding differences to ensure exact total
        const adjustedRemaining40ft = totalRemaining - remaining20ft;

        return (
          <>
            {/* 20ft Remaining */}
            <div className="bg-gradient-to-br from-orange-50 dark:from-orange-900/30 to-orange-100 dark:to-orange-800/30 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">20ft Remaining</span>
                <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400" />
              </div>
              <div className="flex items-baseline space-x-2 mb-1">
                <span className="text-2xl font-bold text-orange-900 dark:text-orange-100">{remaining20ft}</span>
                <span className="text-sm text-orange-600 dark:text-orange-400">of {booking.containerQuantities.size20ft}</span>
              </div>
              <div className="w-full bg-orange-200 dark:bg-orange-700 rounded-full h-2 mb-1">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${booking.containerQuantities.size20ft > 0 ? (remaining20ft / booking.containerQuantities.size20ft) * 100 : 0}%`
                  }}
                ></div>
              </div>
              <div className="text-xs text-orange-700 dark:text-orange-400">
                {booking.containerQuantities.size20ft > 0 ?
                  `${Math.round((remaining20ft / booking.containerQuantities.size20ft) * 100)}% remaining` :
                  'No containers'
                }
              </div>
            </div>

            {/* 40ft Remaining */}
            <div className="bg-gradient-to-br from-purple-50 dark:from-purple-900/30 to-purple-100 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-purple-800 dark:text-purple-300">40ft Remaining</span>
                <Clock className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              </div>
              <div className="flex items-baseline space-x-2 mb-1">
                <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">{adjustedRemaining40ft}</span>
                <span className="text-sm text-purple-600 dark:text-purple-400">of {booking.containerQuantities.size40ft}</span>
              </div>
              <div className="w-full bg-purple-200 dark:bg-purple-700 rounded-full h-2 mb-1">
                <div
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${booking.containerQuantities.size40ft > 0 ? (adjustedRemaining40ft / booking.containerQuantities.size40ft) * 100 : 0}%`
                  }}
                ></div>
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-400">
                {booking.containerQuantities.size40ft > 0 ?
                  `${Math.round((adjustedRemaining40ft / booking.containerQuantities.size40ft) * 100)}% remaining` :
                  'No containers'
                }
              </div>
            </div>
          </>
        );
      })()}
    </div>
  </div>

  {/* Overall Progress Summary */}
  <div className="bg-gradient-to-r from-gray-50 dark:from-gray-700 to-blue-50 dark:to-blue-900/20 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center">
        <BarChart3 className="w-4 h-4 text-blue-500 dark:text-blue-400 mr-2" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Overall Progress</span>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
          {Math.round(((booking.totalContainers - (booking.remainingContainers ?? booking.totalContainers)) / booking.totalContainers) * 100)}%
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Complete</div>
      </div>
    </div>

    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
      <span>Processed: {booking.totalContainers - (booking.remainingContainers ?? booking.totalContainers)}</span>
      <span>Remaining: {booking.remainingContainers ?? booking.totalContainers}</span>
      <span>Total: {booking.totalContainers}</span>
    </div>

    <div className="w-full bg-gray-200 rounded-full h-3">
      <div
        className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
        style={{
          width: `${Math.max(5, ((booking.totalContainers - (booking.remainingContainers ?? booking.totalContainers)) / booking.totalContainers) * 100)}%`
        }}
      >
        {((booking.totalContainers - (booking.remainingContainers ?? booking.totalContainers)) / booking.totalContainers) * 100 > 15 && (
          <span className="text-xs font-bold text-white">
            {Math.round(((booking.totalContainers - (booking.remainingContainers ?? booking.totalContainers)) / booking.totalContainers) * 100)}%
          </span>
        )}
      </div>
    </div>

    {booking.remainingContainers === 0 && (
      <div className="mt-2 flex items-center justify-center">
        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
        <span className="text-sm font-semibold text-green-700">All containers processed!</span>
      </div>
    )}
    </div>
      </div>

      {/* Additional Details */}
      {booking.notes && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 text-purple-600 mr-2" />
            Notes
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{booking.notes}</p>
          </div>
        </div>
      )}

      {/* Cancellation Information */}
      {booking.status === 'cancelled' && booking.cancellationReason && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-red-800 mb-1">Cancelled</h4>
              <p className="text-sm text-red-700">{booking.cancellationReason}</p>
              {booking.newBookingReference && (
                <p className="text-sm text-red-700 mt-1">
                  New booking reference: <span className="font-mono">{booking.newBookingReference}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
