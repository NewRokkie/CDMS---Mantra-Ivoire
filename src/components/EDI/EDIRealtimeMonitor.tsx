/**
 * EDI Realtime Monitor
 * Polls edi_transmission_logs every 30s and shows in-progress / recent transmissions.
 * Displayed as a compact badge in EDIManagement header; expands to a modal on click.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Activity, X, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ediTransmissionService, type EDITransmissionLog } from '../../services/edi/ediTransmissionService';

const POLL_INTERVAL_MS = 30_000;

interface EDIRealtimeMonitorProps {
  /** Called when the user wants to view details of a log (opens EDITransmissionDetailsModal) */
  onViewDetails?: (log: EDITransmissionLog) => void;
}

export const EDIRealtimeMonitor: React.FC<EDIRealtimeMonitorProps> = ({ onViewDetails }) => {
  const [logs, setLogs] = useState<EDITransmissionLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const all = await ediTransmissionService.getTransmissionHistory();
      // Keep only last 20 + any pending/retrying
      const active = all.filter(l => l.status === 'pending' || l.status === 'retrying');
      const recent = all.filter(l => l.status !== 'pending' && l.status !== 'retrying').slice(0, 15);
      const merged = [...active, ...recent].slice(0, 20);
      setLogs(merged);
      setLastRefresh(new Date());
    } catch {
      // silent — non-critical
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const processing = logs.filter(l => l.status === 'pending' || l.status === 'retrying');
  const failed = logs.filter(l => l.status === 'failed');

  const badgeColor =
    processing.length > 0 ? 'bg-blue-500' :
    failed.length > 0     ? 'bg-red-500'  :
                            'bg-green-500';

  const badgeLabel =
    processing.length > 0 ? `Processing: ${processing.length}` :
    failed.length > 0     ? `Failed: ${failed.length}`         :
                            'All clear';

  return (
    <>
      {/* Badge trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm"
        title="EDI Realtime Monitor"
      >
        <span className={`w-2 h-2 rounded-full ${badgeColor} ${processing.length > 0 ? 'animate-pulse' : ''}`} />
        <Activity className="h-3.5 w-3.5 text-gray-500" />
        <span className="text-gray-700 font-medium">
          {badgeLabel.split(': ').map((part, i) => i === 1 ? <span key={i} className="font-numeric">{part}</span> : part)}
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-700 text-white rounded-lg">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">EDI Realtime Monitor</h3>
                  <p className="text-xs text-gray-500">
                    Auto-refresh every 30s
                    {lastRefresh && ` — last: ${lastRefresh.toLocaleTimeString()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLogs}
                  disabled={isRefreshing}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors"
                  title="Refresh now"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Summary pills */}
            <div className="px-6 py-3 flex items-center gap-3 border-b border-gray-100 bg-gray-50">
              <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                <RefreshCw className="h-3 w-3" /> Processing: <span className="font-numeric">{processing.length}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                <XCircle className="h-3 w-3" /> Failed: <span className="font-numeric">{failed.length}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                <CheckCircle className="h-3 w-3" /> Success: <span className="font-numeric">{logs.filter(l => l.status === 'success').length}</span>
              </span>
            </div>

            {/* Log list */}
            <div className="max-h-[50vh] overflow-y-auto divide-y divide-gray-100">
              {logs.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No recent transmissions</div>
              ) : (
                logs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {log.status === 'success'  && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                      {log.status === 'failed'   && <XCircle    className="h-4 w-4 text-red-500 flex-shrink-0" />}
                      {log.status === 'pending'  && <Clock      className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                      {log.status === 'retrying' && <RefreshCw  className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{log.containerNumber}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {log.operation.replace('_', ' ')} · {log.partnerCode} · {log.lastAttempt.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        log.status === 'success'  ? 'bg-green-100 text-green-700' :
                        log.status === 'failed'   ? 'bg-red-100 text-red-700'    :
                        log.status === 'retrying' ? 'bg-blue-100 text-blue-700'  :
                                                    'bg-yellow-100 text-yellow-700'
                      }`}>
                        {log.status.toUpperCase()}
                      </span>
                      {onViewDetails && (
                        <button
                          onClick={() => { setIsOpen(false); onViewDetails(log); }}
                          className="text-xs text-gray-400 hover:text-gray-600 underline"
                        >
                          Details
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button onClick={() => setIsOpen(false)} className="btn-secondary px-4 py-2 text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
