import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { useAuth, SyncStatus } from '../../hooks/useAuth';

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
      console.error('🔄 [SYNC_STATUS] Manual refresh failed:', error);
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
        color: 'text-green-400',
        bgColor: 'bg-green-900/20',
        borderColor: 'border-green-700/30',
        message: 'Permissions synchronized'
      };
    } else if (syncStatus.inconsistencyCount > 0) {
      return {
        icon: AlertTriangle,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-900/20',
        borderColor: 'border-yellow-700/30',
        message: 'Permission inconsistencies detected'
      };
    } else {
      return {
        icon: AlertCircle,
        color: 'text-red-400',
        bgColor: 'bg-red-900/20',
        borderColor: 'border-red-700/30',
        message: 'Sync issues detected'
      };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div className={`flex items-center ${config.container} ${className}`}>
      {/* Status Icon */}
      <StatusIcon className={`${config.icon} ${statusDisplay.color}`} />
      
      {/* Status Text */}
      <span className={`${config.text} text-slate-300`}>
        {statusDisplay.message}
      </span>
      
      {/* Refresh Button */}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`${config.button} rounded transition-colors ${
          isRefreshing 
            ? 'text-slate-500 cursor-not-allowed' 
            : 'text-slate-400 hover:text-white hover:bg-slate-700'
        }`}
        title="Refresh permissions"
      >
        <RefreshCw className={`${config.icon} ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>

      {/* Detailed Status (when enabled) */}
      {showDetails && !syncStatus.isHealthy && (
        <div className={`ml-4 p-2 ${statusDisplay.bgColor} border ${statusDisplay.borderColor} rounded ${config.text}`}>
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