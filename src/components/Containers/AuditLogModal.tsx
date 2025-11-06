import React from 'react';
import { FileText, Calendar, Clock, AlertCircle } from 'lucide-react';
import { AuditLog } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { DataDisplayModal } from '../Common/Modal/DataDisplayModal';

interface AuditLogModalProps {
  auditLogs?: AuditLog[];
  onClose: () => void;
  containerNumber: string;
  isOpen: boolean;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  auditLogs,
  onClose,
  containerNumber,
  isOpen
}) => {
  const { hasModuleAccess } = useAuth();
  const canViewAuditLogs = hasModuleAccess('auditLogs');
  
  if (!canViewAuditLogs) {
    return (
      <DataDisplayModal
        isOpen={isOpen}
        onClose={onClose}
        title="Access Restricted"
        subtitle="Audit Log Access"
        icon={AlertCircle}
        size="md"
        sections={[]}
      >
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You don't have permission to view audit logs.</p>
            <p className="text-sm text-gray-500 mt-2">Contact your administrator to request access.</p>
          </div>
        </div>
      </DataDisplayModal>
    );
  }
  
  const sortedLogs = auditLogs
    ? [...auditLogs].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    : [];

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'bg-green-100 text-green-800';
      case 'viewed': return 'bg-blue-100 text-blue-800';
      case 'edited': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Prepare audit log summary section
  const summarySection = {
    id: 'audit-summary',
    title: 'Audit Log Summary',
    icon: FileText,
    data: {
      totalEntries: sortedLogs.length.toString(),
      containerNumber: containerNumber,
      dateRange: sortedLogs.length > 0 
        ? `${sortedLogs[sortedLogs.length - 1].timestamp.toLocaleDateString()} - ${sortedLogs[0].timestamp.toLocaleDateString()}`
        : 'N/A',
      lastActivity: sortedLogs.length > 0 
        ? sortedLogs[0].timestamp.toLocaleString()
        : 'N/A'
    },
    layout: 'grid' as const
  };

  const sections = sortedLogs.length > 0 ? [summarySection] : [];

  return (
    <DataDisplayModal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Log"
      subtitle={containerNumber}
      icon={FileText}
      size="lg"
      sections={sections}
    >
      {sortedLogs.length > 0 ? (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            Activity Timeline
          </h4>
          
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {sortedLogs.map((log, index) => (
                <div key={index} className="relative flex items-start space-x-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${getActionColor(log.action)} border-2 border-white z-10`} />
                    {index < sortedLogs.length - 1 && (
                      <div className="w-0.5 h-full bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{log.user}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getActionColor(log.action)}`}>
                        {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2 flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{log.timestamp.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{log.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                    {log.details && (
                      <p className="text-sm text-gray-900 bg-white rounded p-2 border border-gray-100">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Audit Logs</h3>
            <p className="text-sm text-gray-500">Aucun log d'audit disponible pour ce conteneur.</p>
          </div>
        </div>
      )}
    </DataDisplayModal>
  );
};
