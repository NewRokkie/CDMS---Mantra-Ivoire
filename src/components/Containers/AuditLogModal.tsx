import React from 'react';
import { X, FileText, Calendar, Clock } from 'lucide-react';
import { AuditLog } from '../../types';

interface AuditLogModalProps {
  auditLogs?: AuditLog[];
  onClose: () => void;
  containerNumber: string;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  auditLogs,
  onClose,
  containerNumber
}) => {
  const { hasModuleAccess } = useAuth();
  const canViewAuditLogs = hasModuleAccess('auditLogs');
  
  if (!canViewAuditLogs) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <FileText className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Access Restricted</h3>
                  <p className="text-sm text-gray-600">Audit Log Access</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">You don't have permission to view audit logs.</p>
              <p className="text-sm text-gray-500 mt-2">Contact your administrator to request access.</p>
            </div>
          </div>
        </div>
      </div>
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Audit Log</h3>
                <p className="text-sm text-gray-600">{containerNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedLogs.length > 0 ? (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {sortedLogs.map((log, index) => (
                  <div key={index} className="relative flex items-start space-x-4">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={`w-3 h-3 rounded-full ${getActionColor(log.action)} border-2 border-white`} />
                      <div className="w-0.5 h-full bg-gray-200" />
                    </div>
                    <div className="flex-1 min-w-0 bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{log.user}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getActionColor(log.action)}`}>
                          {log.action.charAt(0).toUpperCase() + log.action.slice(1)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{log.timestamp.toLocaleDateString()}</span>
                        <Clock className="h-3 w-3" />
                        <span>{log.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      {log.details && (
                        <p className="text-sm text-gray-900 mt-2">{log.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Aucun log d'audit disponible pour ce conteneur.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
