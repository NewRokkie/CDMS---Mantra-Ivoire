import React from 'react';
import { X, CheckCircle, XCircle, Clock, RefreshCw, Server, FileText, Hash, Calendar } from 'lucide-react';
import { EDITransmissionLog } from '../../services/edi/ediTransmissionService';

interface EDITransmissionDetailsModalProps {
  log: EDITransmissionLog | null;
  onClose: () => void;
}

const StatusIcon = ({ status }: { status: EDITransmissionLog['status'] }) => {
  if (status === 'success') return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (status === 'failed') return <XCircle className="h-5 w-5 text-red-500" />;
  if (status === 'retrying') return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
  return <Clock className="h-5 w-5 text-yellow-500" />;
};

const statusColors: Record<EDITransmissionLog['status'], string> = {
  success: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  retrying: 'bg-blue-100 text-blue-800',
};

export const EDITransmissionDetailsModal: React.FC<EDITransmissionDetailsModalProps> = ({ log, onClose }) => {
  if (!log) return null;

  const rows: { label: string; value: React.ReactNode; icon?: React.ReactNode }[] = [
    { label: 'Log ID', value: <span className="font-mono text-xs break-all">{log.id}</span>, icon: <Hash className="h-4 w-4" /> },
    { label: 'Container', value: log.containerNumber, icon: <FileText className="h-4 w-4" /> },
    { label: 'Operation', value: (
      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
        log.operation === 'GATE_IN' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
      }`}>
        {log.operation.replace('_', ' ')}
      </span>
    )},
    { label: 'Status', value: (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[log.status]}`}>
        <StatusIcon status={log.status} />
        {log.status.toUpperCase()}
      </span>
    )},
    { label: 'File Name', value: <span className="font-mono text-xs">{log.fileName}</span>, icon: <FileText className="h-4 w-4" /> },
    { label: 'File Size', value: log.fileSize ? `${log.fileSize.toLocaleString()} bytes` : '—' },
    { label: 'Partner Code', value: log.partnerCode || '—', icon: <Server className="h-4 w-4" /> },
    { label: 'Uploaded to SFTP', value: log.uploadedToSftp ? 'Yes' : 'No' },
    { label: 'Attempts', value: log.attempts },
    { label: 'Last Attempt', value: log.lastAttempt.toLocaleString(), icon: <Calendar className="h-4 w-4" /> },
    { label: 'Created At', value: log.createdAt.toLocaleString(), icon: <Calendar className="h-4 w-4" /> },
    ...(log.acknowledgmentReceived ? [{ label: 'Acknowledged At', value: log.acknowledgmentReceived.toLocaleString() }] : []),
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-slide-in-up">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 text-white rounded-lg">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Transmission Details</h3>
              <p className="text-xs text-gray-500">{log.containerNumber} — {log.operation.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/50 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <dl className="divide-y divide-gray-100">
            {rows.map(({ label, value, icon }) => (
              <div key={label} className="flex items-start justify-between py-2.5 gap-4">
                <dt className="flex items-center gap-1.5 text-sm text-gray-500 min-w-[130px] flex-shrink-0">
                  {icon && <span className="text-gray-400">{icon}</span>}
                  {label}
                </dt>
                <dd className="text-sm text-gray-900 text-right">{value}</dd>
              </div>
            ))}
          </dl>

          {/* Error message */}
          {log.errorMessage && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-medium text-red-700 mb-1">Error Details</p>
              <p className="text-xs text-red-600 font-mono break-all">{log.errorMessage}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="btn-secondary px-4 py-2 text-sm">Close</button>
        </div>
      </div>
    </div>
  );
};
