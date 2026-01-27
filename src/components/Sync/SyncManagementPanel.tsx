import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Database, 
  Activity,
  Settings,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { syncManager } from '../../services/sync/SyncManager';
import { moduleAccessService } from '../../services/api/moduleAccessService';
import type { SyncResult, SyncMetrics } from '../../services/sync/SyncManager';
import type { ValidationReport } from '../../services/api/moduleAccessService';
import { handleError } from '../../services/errorHandling';
import { logger } from '../../utils/logger';

interface SyncManagementPanelProps {
  className?: string;
}

export const SyncManagementPanel: React.FC<SyncManagementPanelProps> = ({
  className = ''
}) => {
  const [syncMetrics, setSyncMetrics] = useState<SyncMetrics | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [periodicSyncEnabled, setPeriodicSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState(300000); // 5 minutes default

  // Load initial data
  useEffect(() => {
    loadSyncMetrics();
    loadValidationReport();
  }, []);

  const loadSyncMetrics = async () => {
    try {
      const metrics = syncManager.getSyncMetrics();
      setSyncMetrics(metrics);
    } catch (error) {
      handleError(error, 'SyncManagementPanel.loadSyncMetrics');
    }
  };

  const loadValidationReport = async () => {
    try {
      setIsLoading(true);
      const report = await moduleAccessService.validateDataConsistency();
      setValidationReport(report);
    } catch (error) {
      handleError(error, 'SyncManagementPanel.loadValidationReport');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSyncAll = async () => {
    try {
      setIsLoading(true);
      const result = await syncManager.forceSyncAll();
      setLastSyncResult(result);
      await loadSyncMetrics();
      await loadValidationReport();
    } catch (error) {
      handleError(error, 'SyncManagementPanel.handleForceSyncAll');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePeriodicSync = () => {
    if (periodicSyncEnabled) {
      syncManager.stopPeriodicSync();
      setPeriodicSyncEnabled(false);
    } else {
      syncManager.startPeriodicSync(syncInterval);
      setPeriodicSyncEnabled(true);
    }
  };

  const handlePerformHealthCheck = async () => {
    try {
      setIsLoading(true);
      const healthResult = await syncManager.performHealthCheck();
      logger.info('Health check completed', 'SyncManagementPanel', healthResult);
      await loadSyncMetrics();
    } catch (error) {
      handleError(error, 'SyncManagementPanel.handlePerformHealthCheck');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };

  return (
    <div className={`bg-slate-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
          <Settings className="h-6 w-6" />
          <span>Sync Management</span>
        </h2>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={loadSyncMetrics}
            disabled={isLoading}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sync Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Activity className="h-5 w-5 text-blue-400" />
            <h3 className="font-medium text-white">Sync Operations</h3>
          </div>
          {syncMetrics ? (
            <div className="space-y-1 text-sm">
              <div className="text-slate-300">
                Total: <span className="text-white">{syncMetrics.totalSyncOperations}</span>
              </div>
              <div className="text-slate-300">
                Success: <span className="text-green-400">{syncMetrics.successfulSyncs}</span>
              </div>
              <div className="text-slate-300">
                Failed: <span className="text-red-400">{syncMetrics.failedSyncs}</span>
              </div>
              <div className="text-slate-300">
                Avg Duration: <span className="text-white">{formatDuration(syncMetrics.averageSyncDuration)}</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-400">Loading...</div>
          )}
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Database className="h-5 w-5 text-green-400" />
            <h3 className="font-medium text-white">Data Consistency</h3>
          </div>
          {validationReport ? (
            <div className="space-y-1 text-sm">
              <div className="flex items-center space-x-2">
                {validationReport.isConsistent ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                )}
                <span className={validationReport.isConsistent ? 'text-green-400' : 'text-yellow-400'}>
                  {validationReport.isConsistent ? 'Consistent' : 'Issues Found'}
                </span>
              </div>
              <div className="text-slate-300">
                Inconsistencies: <span className="text-white">{validationReport.inconsistencies.length}</span>
              </div>
              <div className="text-slate-300">
                Recommendations: <span className="text-white">{validationReport.recommendations.length}</span>
              </div>
            </div>
          ) : (
            <div className="text-slate-400">Loading...</div>
          )}
        </div>

        <div className="bg-slate-700 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-5 w-5 text-purple-400" />
            <h3 className="font-medium text-white">Schedule</h3>
          </div>
          <div className="space-y-1 text-sm">
            <div className="text-slate-300">
              Periodic Sync: 
              <span className={`ml-1 ${periodicSyncEnabled ? 'text-green-400' : 'text-red-400'}`}>
                {periodicSyncEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {syncMetrics?.lastSyncTime && (
              <div className="text-slate-300">
                Last Sync: <span className="text-white">{formatDate(syncMetrics.lastSyncTime)}</span>
              </div>
            )}
            {syncMetrics?.nextScheduledSync && (
              <div className="text-slate-300">
                Next Sync: <span className="text-white">{formatDate(syncMetrics.nextScheduledSync)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-3">
          <h3 className="font-medium text-white">Manual Operations</h3>
          
          <button
            onClick={handleForceSyncAll}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Force Sync All Users</span>
          </button>

          <button
            onClick={loadValidationReport}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
          >
            <Database className="h-4 w-4" />
            <span>Validate Data Consistency</span>
          </button>

          <button
            onClick={handlePerformHealthCheck}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors disabled:opacity-50"
          >
            <Activity className="h-4 w-4" />
            <span>Perform Health Check</span>
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-white">Periodic Sync</h3>
          
          <div className="space-y-2">
            <label className="block text-sm text-slate-300">
              Sync Interval (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="1440"
              value={syncInterval / 60000}
              onChange={(e) => setSyncInterval(parseInt(e.target.value) * 60000)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            onClick={handleTogglePeriodicSync}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded transition-colors ${
              periodicSyncEnabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {periodicSyncEnabled ? (
              <>
                <Pause className="h-4 w-4" />
                <span>Stop Periodic Sync</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                <span>Start Periodic Sync</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Last Sync Result */}
      {lastSyncResult && (
        <div className="bg-slate-700 rounded-lg p-4">
          <h3 className="font-medium text-white mb-3 flex items-center space-x-2">
            <RotateCcw className="h-5 w-5" />
            <span>Last Sync Result</span>
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Total Users</div>
              <div className="text-white font-medium">{lastSyncResult.totalUsers}</div>
            </div>
            <div>
              <div className="text-slate-400">Synced</div>
              <div className="text-green-400 font-medium">{lastSyncResult.syncedUsers}</div>
            </div>
            <div>
              <div className="text-slate-400">Failed</div>
              <div className="text-red-400 font-medium">{lastSyncResult.failedUsers.length}</div>
            </div>
            <div>
              <div className="text-slate-400">Duration</div>
              <div className="text-white font-medium">{formatDuration(lastSyncResult.duration)}</div>
            </div>
          </div>

          {lastSyncResult.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-400 mb-2">Errors:</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {lastSyncResult.errors.slice(0, 5).map((error, index) => (
                  <div key={index} className="text-xs text-red-300 bg-red-900/20 p-2 rounded">
                    {error.message}
                  </div>
                ))}
                {lastSyncResult.errors.length > 5 && (
                  <div className="text-xs text-slate-400">
                    ... and {lastSyncResult.errors.length - 5} more errors
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Report Details */}
      {validationReport && !validationReport.isConsistent && (
        <div className="mt-4 bg-slate-700 rounded-lg p-4">
          <h3 className="font-medium text-white mb-3 flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <span>Data Inconsistencies</span>
          </h3>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {validationReport.inconsistencies.slice(0, 10).map((inconsistency, index) => (
              <div key={index} className="text-xs bg-yellow-900/20 border border-yellow-700/30 p-2 rounded">
                <div className="text-yellow-300 font-medium">{inconsistency.field}</div>
                <div className="text-slate-300">{inconsistency.description}</div>
                <div className="text-slate-400 mt-1">Severity: {inconsistency.severity}</div>
              </div>
            ))}
            {validationReport.inconsistencies.length > 10 && (
              <div className="text-xs text-slate-400">
                ... and {validationReport.inconsistencies.length - 10} more inconsistencies
              </div>
            )}
          </div>

          {validationReport.recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-blue-400 mb-2">Recommendations:</h4>
              <div className="space-y-1">
                {validationReport.recommendations.map((recommendation, index) => (
                  <div key={index} className="text-xs text-blue-300">
                    • {recommendation}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};