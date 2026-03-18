import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { useAuth, SyncStatus } from '../../hooks/useAuth';
import { handleError } from '../../services/errorHandling';

interface SyncStatusIndicatorProps {
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onRefresh?: () => void;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  showDetails = false,
  size = 'md',
  className = '',
  onRefresh
}) => {
  const { getSyncStatus, onSyncStatusChange, offSyncStatusChange, refreshModuleAccess } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getSyncStatus());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Monitor sync status changes
  useEffect(() => {
    const handleSyncStatusChange = (status: SyncStatus) => {
      setSyncStatus(status);
    };

    onSyncStatusChange(handleSyncStatusChange);

    // Update initial status
    setSyncStatus(getSyncStatus());

    return () => {
      offSyncStatusChange(handleSyncStatusChange);
    };
  }, [getSyncStatus, onSyncStatusChange, offSyncStatusChange]);

  // Handle manual refresh
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      if (onRefresh) {
        onRefresh();
      } else {
        await refreshModuleAccess();
      }
    } catch (error) {
      handleError(error, 'SyncStatusIndicator.handleRefresh');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      icon: 'h-3 w-3',
      text: 'text-xs',
      button: 'p-1',
      container: 'space-x-1'
    },
    md: {
      icon: 'h-4 w-4',
      text: 'text-sm',
      button: 'p-1.5',
      container: 'space-x-2'
    },
    lg: {
      icon: 'h-5 w-5',
      text: 'text-base',
      button: 'p-2',
      container: 'space-x-3'
    }
  };

  const config = sizeConfig[size];

  // Status icon and color
  const getStatusDisplay = () => {
    if (syncStatus.isHealthy) {
      return {
        icon: CheckCircle,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        message: 'System Synced'
      };
    } else if (syncStatus.inconsistencyCount > 0) {
      return {
        icon: AlertTriangle,
        color: 'text-amber-500',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        message: 'Sync Warnings'
      };
    } else {
      return {
        icon: AlertCircle,
        color: 'text-rose-500',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200',
        message: 'Sync Error'
      };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${syncStatus.isHealthy ? 'bg-olam-green animate-pulse' : syncStatus.inconsistencyCount > 0 ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
          <span className="text-[11px] font-gilroy-bold text-slate-600 uppercase tracking-tight">{statusDisplay.message}</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-slate-400 hover:text-accent-teal transition-colors"
          title="Refresh permissions"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Detailed Status (when enabled) */}
      {showDetails && !syncStatus.isHealthy && (
        <div className={`mt-2 p-2 ${statusDisplay.bgColor} border ${statusDisplay.borderColor} rounded ${config.text}`}>
          <div className={statusDisplay.color}>
            {syncStatus.inconsistencyCount > 0 && (
              <div>• {syncStatus.inconsistencyCount} permission inconsistencies</div>
            )}
            {syncStatus.failedSyncCount > 0 && (
              <div>• {syncStatus.failedSyncCount} failed sync operations</div>
            )}
            {syncStatus.lastSyncAt && (
              <div className="text-slate-400 mt-1 flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Last sync: {syncStatus.lastSyncAt.toLocaleTimeString()}</span>
              </div>
            )}
            {syncStatus.nextScheduledSync && (
              <div className="text-slate-400 mt-1 flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Next sync: {syncStatus.nextScheduledSync.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};