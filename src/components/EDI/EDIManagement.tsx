import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Settings,
  Server,
  Users,
  FileText,
  RotateCcw,
  Trash2,
  Activity,
  XCircle,
  Search,
  Plus,
  Eye,
  BarChart2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { DesktopOnlyMessage } from '../Common/DesktopOnlyMessage';
import { useToast } from '../../hooks/useToast';
import { EDIConfigurationModal } from './EDIConfigurationModal';
import { EDIFileProcessor } from './EDIFileProcessor';
import { EDIClientModal } from './EDIClientModal';
import { EDIValidator } from './EDIValidator';
import { EDITransmissionDetailsModal } from './EDITransmissionDetailsModal';
import { EDIRealtimeMonitor } from './EDIRealtimeMonitor';
import { ediManagementService, type EDITransmissionLog } from '../../services/edi/ediManagement';
import { ediTransmissionService } from '../../services/edi/ediTransmissionService';
import { ediRealDataService } from '../../services/edi/ediRealDataService';
import { ediConfigurationDatabaseService } from '../../services/edi/ediConfigurationDatabase';
import { ediExportService, type LogFilters } from '../../services/edi/ediExportService';
import { type EDIServerConfig } from '../../services/edi/ediConfiguration';

const EDIManagement: React.FC = () => {
  // State management
  const [transmissionLogs, setTransmissionLogs] = useState<EDITransmissionLog[]>([]);
  const [realStats, setRealStats] = useState<any>(null);
  const [clientMappings, setClientMappings] = useState<any[]>([]);
  const [serverConfigs, setServerConfigs] = useState<EDIServerConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingServers, setIsLoadingServers] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'servers' | 'clients' | 'validator' | 'history'>('overview');
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [availableClients, setAvailableClients] = useState<any[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [deletingClientCode, setDeletingClientCode] = useState<string | null>(null);
  const [togglingClientCode, setTogglingClientCode] = useState<string | null>(null);
  // Bulk retry state
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
  const [isBulkRetrying, setIsBulkRetrying] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  // Details modal state
  const [detailsLog, setDetailsLog] = useState<EDITransmissionLog | null>(null);
  // Chart data
  const [dailyVolume, setDailyVolume] = useState<Array<{ date: string; gateIn: number; gateOut: number; total: number }>>([]);
  const [statusDist, setStatusDist] = useState<{ success: number; failed: number; pending: number; retrying: number } | null>(null);
  // History filters & export
  const [historyFilters, setHistoryFilters] = useState<LogFilters>({});
  const [showExportMenu, setShowExportMenu] = useState(false);

  const { user } = useAuth();
  const { currentYard } = useYard();
  const toast = useToast();

  // Memoize the validation callback to prevent EDIValidator from unmounting
  const handleValidationComplete = React.useCallback((result: any) => {
    console.log('EDI Validation completed:', result);
  }, []);

  useEffect(() => {
    loadRealData();
  }, []);

  const loadRealData = async () => {
    setIsLoading(true);
    setIsLoadingServers(true);
    setIsLoadingClients(true);
    try {
      // Load real data from services
      const [stats, mappings, configs, logs, clients, volume, dist] = await Promise.all([
        ediRealDataService.getRealEDIStatistics(),
        ediRealDataService.getClientServerMappings(),
        ediConfigurationDatabaseService.getConfigurations(),
        ediTransmissionService.getTransmissionHistory(),
        ediRealDataService.getAvailableClients(),
        ediTransmissionService.getDailyVolume(7),
        ediTransmissionService.getStatusDistribution()
      ]);

      setRealStats(stats);
      setClientMappings(mappings);
      setServerConfigs(configs);
      setTransmissionLogs(logs);
      setAvailableClients(clients);
      setDailyVolume(volume);
      setStatusDist(dist);
      setSelectedLogIds(new Set()); // reset selection on refresh
    } catch (error) {
      console.error('Failed to load EDI data:', error);
      toast.error('Failed to load EDI data');
    } finally {
      setIsLoading(false);
      setIsLoadingServers(false);
      setIsLoadingClients(false);
    }
  };

  const refreshData = async () => {
    await loadRealData();
    toast.success('Data refreshed successfully');
  };

  const handleRetryTransmission = async (logId: string) => {
    setIsLoading(true);
    try {
      const result = await ediTransmissionService.retryTransmission(logId);
      if (result.success) {
        await loadRealData();
        toast.success('EDI transmission successful');
      } else {
        toast.error(`Retry failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('Retry failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkRetry = async () => {
    const ids = Array.from(selectedLogIds);
    if (ids.length === 0) return;

    setIsBulkRetrying(true);
    setBulkProgress({ done: 0, total: ids.length });

    const results = { success: 0, failed: 0 };
    for (const logId of ids) {
      const result = await ediTransmissionService.retryTransmission(logId);
      if (result.success) results.success++;
      else results.failed++;
      setBulkProgress(prev => prev ? { ...prev, done: prev.done + 1 } : null);
    }

    setIsBulkRetrying(false);
    setBulkProgress(null);
    setSelectedLogIds(new Set());
    await loadRealData();
    toast.success(`Bulk retry done — Success: ${results.success}, Failed: ${results.failed}`);
  };

  const toggleLogSelection = (logId: string) => {
    setSelectedLogIds(prev => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  const toggleSelectAllFailed = () => {
    const failedIds = recentOperationsDeduplicated
      .filter(l => l.status === 'failed')
      .map(l => l.id);
    const allSelected = failedIds.every(id => selectedLogIds.has(id));
    if (allSelected) {
      setSelectedLogIds(new Set());
    } else {
      setSelectedLogIds(new Set(failedIds));
    }
  };

  const handleToggleClientEDI = async (clientCode: string, enabled: boolean) => {
    try {
      setTogglingClientCode(clientCode);
      await ediRealDataService.toggleClientEDI(clientCode, enabled);
      await loadRealData();
      toast.success(`EDI ${enabled ? 'enabled' : 'disabled'} for client`);
    } catch (error) {
      toast.error('Failed to update client EDI status');
    } finally {
      setTogglingClientCode(null);
    }
  };

  const handleEditClient = (mapping: any) => {
    setEditingClient(mapping);
    setShowClientModal(true);
  };

  const handleCreateClient = () => {
    setEditingClient(null);
    setShowClientModal(true);
  };

  const handleDeleteClient = async (clientCode: string) => {
    if (window.confirm('Are you sure you want to remove EDI configuration for this client?')) {
      try {
        setDeletingClientCode(clientCode);
        await ediRealDataService.deleteClientEDI(clientCode);
        await loadRealData();
        toast.success('Client EDI configuration removed');
      } catch (error) {
        toast.error('Failed to remove client EDI configuration');
      } finally {
        setDeletingClientCode(null);
      }
    }
  };

  const handleSaveClient = async (clientData: any) => {
    try {
      // Use the new saveClientEDISettings function to properly create/update edi_client_settings
      await ediRealDataService.saveClientEDISettings({
        clientCode: clientData.clientCode,
        clientName: clientData.clientName,
        ediEnabled: clientData.ediEnabled,
        enableGateIn: clientData.enableGateIn,
        enableGateOut: clientData.enableGateOut,
        serverId: clientData.serverId,
        priority: clientData.priority,
        notes: clientData.notes,
      });

      toast.success(editingClient ? 'Client EDI configuration updated' : 'Client EDI configuration created');
      await loadRealData();
      setShowClientModal(false);
      setEditingClient(null);
    } catch (error) {
      console.error('Error saving client configuration:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save client configuration');
    }
  };

  const canManageEDI = user?.role === 'admin' || user?.role === 'supervisor';

  // One row per (containerNumber, operation): prefer most recent SUCCESS if any, else most recent by lastAttempt
  const recentOperationsDeduplicated = React.useMemo(() => {
    const byKey = new Map<string, EDITransmissionLog>();
    for (const log of transmissionLogs) {
      const key = `${log.containerNumber}|${log.operation}`;
      const existing = byKey.get(key);
      const logTime = new Date(log.lastAttempt).getTime();
      const existingTime = existing ? new Date(existing.lastAttempt).getTime() : 0;
      if (!existing) {
        byKey.set(key, log);
        continue;
      }
      if (log.status === 'success') {
        if (existing.status !== 'success') byKey.set(key, log);
        else if (logTime > existingTime) byKey.set(key, log);
      } else if (existing.status !== 'success' && logTime > existingTime) {
        byKey.set(key, log);
      }
    }
    return Array.from(byKey.values()).sort(
      (a, b) => new Date(b.lastAttempt).getTime() - new Date(a.lastAttempt).getTime()
    );
  }, [transmissionLogs]);

  // Memoize DesktopContent to prevent unnecessary re-renders and unmounting of child components
  const DesktopContent = React.useMemo(() => () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">EDI Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage EDI transmissions, server configurations, and client settings
          </p>
        </div>
        {currentYard && (
          <div className="text-right text-sm text-gray-600">
            <div>Current Yard: {currentYard.name}</div>
            <div className="text-xs">{currentYard.code}</div>
          </div>
        )}
        <div className="flex space-x-3">
          <EDIRealtimeMonitor onViewDetails={(log) => setDetailsLog(log)} />
          <button
            onClick={() => setShowConfiguration(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Configuration</span>
          </button>
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'servers', label: 'FTP/SFTP Servers', icon: Server },
            { id: 'clients', label: 'Client EDI Settings', icon: Users },
            { id: 'validator', label: 'EDI Validator', icon: CheckCircle },
            { id: 'history', label: 'Transmission History', icon: FileText }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          {realStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-blue-600 mb-2">
                      Total Operations
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {realStats.totalOperations.toLocaleString()}
                    </div>
                  </div>
                  <Activity className="h-8 w-8 text-blue-600 opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-green-600 mb-2">
                      EDI Success Rate
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                      {realStats.successRate.toFixed(1)}%
                    </div>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-purple-600 mb-2">
                      Clients with EDI
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {realStats.clientsWithEdi} / {realStats.totalClients}
                    </div>
                  </div>
                  <Users className="h-8 w-8 text-purple-600 opacity-50" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-orange-600 mb-2">
                      Servers Configured
                    </div>
                    <div className="text-2xl font-bold text-orange-900">
                      {serverConfigs.filter(s => s.enabled).length}
                    </div>
                  </div>
                  <Server className="h-8 w-8 text-orange-600 opacity-50" />
                </div>
              </div>
            </div>
          )}

          {/* File Processor */}
          <EDIFileProcessor 
            onProcessComplete={() => {
              // Don't call refreshData here as it causes re-render and loses file state
              // Files are processed independently
            }} 
          />

          {/* Charts: Daily Volume + Status Distribution */}
          {dailyVolume.length > 0 && statusDist && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Daily Volume Bar Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="h-4 w-4 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-900">EDI Volume — Last 7 Days</h4>
                </div>
                <div className="flex items-end gap-1 h-28">
                  {dailyVolume.map(({ date, gateIn, gateOut }) => {
                    const maxVal = Math.max(...dailyVolume.map(d => d.total), 1);
                    const totalH = Math.round(((gateIn + gateOut) / maxVal) * 100);
                    const inH = Math.round((gateIn / maxVal) * 100);
                    const outH = Math.round((gateOut / maxVal) * 100);
                    return (
                      <div key={date} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '96px' }}>
                          <div
                            className="w-full bg-blue-400 rounded-t-sm transition-all"
                            style={{ height: `${inH}%` }}
                            title={`Gate IN: ${gateIn}`}
                          />
                          <div
                            className="w-full bg-purple-400 rounded-t-sm transition-all"
                            style={{ height: `${outH}%` }}
                            title={`Gate OUT: ${gateOut}`}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 rotate-45 origin-left mt-1">
                          {date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" /> Gate IN</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-400 inline-block" /> Gate OUT</span>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-gray-500" />
                  <h4 className="text-sm font-medium text-gray-900">Status Distribution</h4>
                </div>
                <div className="space-y-2">
                  {([
                    { key: 'success', label: 'Success', color: 'bg-green-500' },
                    { key: 'failed', label: 'Failed', color: 'bg-red-500' },
                    { key: 'pending', label: 'Pending', color: 'bg-yellow-400' },
                    { key: 'retrying', label: 'Retrying', color: 'bg-blue-400' },
                  ] as const).map(({ key, label, color }) => {
                    const count = statusDist[key];
                    const total = Object.values(statusDist).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                          <span>{label}</span>
                          <span>{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Recent EDI Operations: one row per container + operation with actions */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Recent EDI Operations</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    One row per container and operation. Retry, view errors, or copy details.
                  </p>
                </div>
                {/* Bulk retry controls */}
                {recentOperationsDeduplicated.some(l => l.status === 'failed') && (
                  <div className="flex items-center gap-2">
                    {bulkProgress && (
                      <span className="text-sm text-gray-500">
                        Retrying {bulkProgress.done}/{bulkProgress.total}...
                      </span>
                    )}
                    <button
                      onClick={toggleSelectAllFailed}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      {recentOperationsDeduplicated.filter(l => l.status === 'failed').every(l => selectedLogIds.has(l.id))
                        ? 'Deselect all'
                        : 'Select all failed'}
                    </button>
                    {selectedLogIds.size > 0 && (
                      <button
                        onClick={handleBulkRetry}
                        disabled={isBulkRetrying}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isBulkRetrying
                          ? <><RefreshCw className="h-3 w-3 animate-spin" /> Retrying...</>
                          : <><RotateCcw className="h-3 w-3" /> Retry Selected ({selectedLogIds.size})</>
                        }
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              {recentOperationsDeduplicated.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 w-8" />
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Container</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operation</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transmission Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentOperationsDeduplicated.map((log) => (
                      <tr key={log.id} className={`hover:bg-gray-50 ${selectedLogIds.has(log.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-4">
                          {log.status === 'failed' && (
                            <input
                              type="checkbox"
                              checked={selectedLogIds.has(log.id)}
                              onChange={() => toggleLogSelection(log.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{log.containerNumber}</div>
                          <div className="text-sm text-gray-500">{log.fileName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            log.operation === 'GATE_IN' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {log.operation.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {log.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                            {log.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                            {log.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                            {log.status === 'retrying' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              log.status === 'success' ? 'bg-green-100 text-green-800' :
                              log.status === 'failed' ? 'bg-red-100 text-red-800' :
                              log.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {log.status.toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{log.attempts || 0}</span>
                          {log.attempts > 1 && <span className="text-xs text-gray-500 ml-1">retries</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.partnerCode}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{log.lastAttempt.toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{log.lastAttempt.toLocaleTimeString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {log.status === 'failed' && (
                              <button
                                onClick={() => handleRetryTransmission(log.id)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                title="Retry transmission"
                                disabled={isLoading || isBulkRetrying}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setDetailsLog(log)}
                              className="text-gray-500 hover:text-gray-800 p-1 rounded hover:bg-gray-100 transition-colors"
                              title="View transmission details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No recent EDI operations</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'servers' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">FTP/SFTP Server Configuration</h3>
              <button
                onClick={() => setShowConfiguration(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Server className="h-4 w-4" />
                <span>Configure Servers</span>
              </button>
            </div>
          </div>
          <div className="p-6">
            {isLoadingServers ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
                  <span className="text-gray-600">Loading server configurations...</span>
                </div>
              </div>
            ) : serverConfigs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {serverConfigs.map((config) => (
                  <div key={config.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{config.name}</h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        config.enabled
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {config.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {config.type} • {config.host}:{config.port}
                    </p>
                    <p className="text-xs text-gray-500">
                      {config.assignedClients?.length || 0} clients assigned
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Server className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No servers configured</p>
                <button
                  onClick={() => setShowConfiguration(true)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Configure your first server
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Client EDI Settings</h3>
              <button
                onClick={handleCreateClient}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Client</span>
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="p-6">
            {isLoadingClients ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3">
                  <RefreshCw className="h-6 w-6 text-blue-600 animate-spin" />
                  <span className="text-gray-600">Loading client configurations...</span>
                </div>
              </div>
            ) : clientMappings.length > 0 ? (
              <div className="space-y-4">
                {clientMappings
                  .filter(mapping => 
                    !clientSearchTerm || 
                    mapping.clientName.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                    mapping.clientCode.toLowerCase().includes(clientSearchTerm.toLowerCase())
                  )
                  .map((mapping) => (
                  <div key={mapping.clientCode} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{mapping.clientName}</h4>
                          <p className="text-sm text-gray-600">{mapping.clientCode}</p>
                          {mapping.serverConfig ? (
                            <p className="text-xs text-gray-500 mt-1">
                              Server: {mapping.serverConfig.name} ({mapping.serverConfig.host})
                            </p>
                          ) : (
                            <p className="text-xs text-red-500 mt-1">
                              No server assigned
                            </p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              mapping.ediEnabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              EDI: {mapping.ediEnabled ? 'ON' : 'OFF'}
                            </span>
                            {mapping.hasOperations && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                {mapping.recentOperationsCount} recent ops
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditClient(mapping)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit client configuration"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleClientEDI(mapping.clientCode, !mapping.ediEnabled)}
                            disabled={togglingClientCode === mapping.clientCode}
                            className={`px-3 py-1 text-xs font-medium rounded disabled:opacity-50 ${
                              mapping.ediEnabled
                                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {togglingClientCode === mapping.clientCode ? (
                              <div className="flex items-center space-x-1">
                                <RefreshCw className="h-3 w-3 animate-spin" />
                                <span>...</span>
                              </div>
                            ) : (
                              mapping.ediEnabled ? 'Disable' : 'Enable'
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteClient(mapping.clientCode)}
                            disabled={deletingClientCode === mapping.clientCode}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Remove EDI configuration"
                          >
                            {deletingClientCode === mapping.clientCode ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No clients configured for EDI</p>
                <button
                  onClick={handleCreateClient}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Configure your first client
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'validator' && (
        <div className="space-y-6">
          <EDIValidator 
            key="edi-validator-persistent"
            onValidationComplete={handleValidationComplete}
          />
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Transmission History</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All EDI transmission attempts (including every retry). Display only — use Overview for actions.
                </p>
              </div>
              {/* Export dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(prev => !prev)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <button
                      onClick={async () => {
                        setShowExportMenu(false);
                        await ediExportService.exportLogsToCSV(historyFilters);
                        toast.success('Logs exported as CSV');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                    >
                      Export as CSV
                    </button>
                    <button
                      onClick={async () => {
                        setShowExportMenu(false);
                        await ediExportService.exportLogsToExcel(historyFilters);
                        toast.success('Logs exported as Excel');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                    >
                      Export as Excel
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={historyFilters.status || ''}
                onChange={e => setHistoryFilters(f => ({ ...f, status: (e.target.value || undefined) as any }))}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="retrying">Retrying</option>
              </select>
              <select
                value={historyFilters.operation || ''}
                onChange={e => setHistoryFilters(f => ({ ...f, operation: (e.target.value || undefined) as any }))}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All operations</option>
                <option value="GATE_IN">Gate IN</option>
                <option value="GATE_OUT">Gate OUT</option>
              </select>
              <input
                type="text"
                placeholder="Client code..."
                value={historyFilters.clientCode || ''}
                onChange={e => setHistoryFilters(f => ({ ...f, clientCode: e.target.value || undefined }))}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent w-36"
              />
              <input
                type="date"
                value={historyFilters.dateFrom ? historyFilters.dateFrom.toISOString().slice(0, 10) : ''}
                onChange={e => setHistoryFilters(f => ({ ...f, dateFrom: e.target.value ? new Date(e.target.value) : undefined }))}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-xs text-gray-400">→</span>
              <input
                type="date"
                value={historyFilters.dateTo ? historyFilters.dateTo.toISOString().slice(0, 10) : ''}
                onChange={e => setHistoryFilters(f => ({ ...f, dateTo: e.target.value ? new Date(e.target.value) : undefined }))}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {(historyFilters.status || historyFilters.operation || historyFilters.clientCode || historyFilters.dateFrom || historyFilters.dateTo) && (
                <button
                  onClick={() => setHistoryFilters({})}
                  className="text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            {(() => {
              const filtered = transmissionLogs.filter(log => {
                if (historyFilters.status && log.status !== historyFilters.status) return false;
                if (historyFilters.operation && log.operation !== historyFilters.operation) return false;
                if (historyFilters.clientCode && !log.partnerCode?.toLowerCase().includes(historyFilters.clientCode.toLowerCase())) return false;
                if (historyFilters.dateFrom && log.createdAt < historyFilters.dateFrom) return false;
                if (historyFilters.dateTo && log.createdAt > historyFilters.dateTo) return false;
                return true;
              });
              return filtered.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Container</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transmission Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{log.containerNumber}</div>
                        <div className="text-sm text-gray-500">{log.fileName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          log.operation === 'GATE_IN' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {log.operation.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {log.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {log.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                          {log.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500" />}
                          {log.status === 'retrying' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            log.status === 'success' ? 'bg-green-100 text-green-800' :
                            log.status === 'failed' ? 'bg-red-100 text-red-800' :
                            log.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {log.status.toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{log.attempts || 0}</span>
                        {log.attempts > 1 && <span className="text-xs text-gray-500 ml-1">retries</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.partnerCode}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{log.lastAttempt.toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">{log.lastAttempt.toLocaleTimeString()}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No transmission logs found</p>
              </div>
            )
            })()}
          </div>
        </div>
      )}
    </div>
  ), [
    activeTab,
    realStats,
    serverConfigs,
    clientMappings,
    transmissionLogs,
    recentOperationsDeduplicated,
    isLoading,
    isLoadingServers,
    isLoadingClients,
    currentYard,
    clientSearchTerm,
    togglingClientCode,
    deletingClientCode,
    selectedLogIds,
    isBulkRetrying,
    bulkProgress,
    dailyVolume,
    statusDist,
    historyFilters,
    showExportMenu,
    handleRetryTransmission,
    handleBulkRetry,
    toggleLogSelection,
    toggleSelectAllFailed,
    handleValidationComplete,
    toast
  ]);

  if (!canManageEDI) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to access EDI management.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Only Message for Mobile */}
      <div className="lg:hidden">
        <DesktopOnlyMessage
          moduleName="EDI Management"
          reason="Managing EDI messages, server configurations, transmission logs, and technical configurations requires detailed interfaces optimized for desktop."
        />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <DesktopContent />
      </div>

      {/* Configuration Modal */}
      <EDIConfigurationModal
        isOpen={showConfiguration}
        onClose={() => setShowConfiguration(false)}
      />

      {/* Client EDI Modal */}
      <EDIClientModal
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false);
          setEditingClient(null);
        }}
        onSave={handleSaveClient}
        editingClient={editingClient}
        availableClients={availableClients}
        serverConfigs={serverConfigs}
        configuredClients={clientMappings.map(m => m.clientCode)}
      />

      {/* Transmission Details Modal */}
      <EDITransmissionDetailsModal
        log={detailsLog}
        onClose={() => setDetailsLog(null)}
      />
    </>
  );
};

export default EDIManagement;