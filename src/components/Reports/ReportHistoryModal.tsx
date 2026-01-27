import React, { useState, useMemo } from 'react';
import { History, Calendar, Mail, FileText, Download, Search } from 'lucide-react';
import { StandardModal } from '../Common/Modal/StandardModal';
import { format } from 'date-fns';

interface ScheduledReport {
  id: string;
  name: string;
  description: string;
  reportType: 'analytics' | 'operations' | 'both';
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
  recipients: string[];
  filters: {
    dateRange: string;
    containerSizes: string[];
    containerStatuses: string[];
    clientCodes: string[];
  };
  format: 'pdf' | 'excel' | 'html';
  isActive: boolean;
  createdAt: Date;
  lastSent?: Date;
  nextSend: Date;
}

interface ReportHistoryEntry {
  id: string;
  reportId: string;
  reportName: string;
  sentAt: Date;
  recipients: string[];
  format: string;
  status: 'sent' | 'failed' | 'pending';
  fileSize?: string;
  errorMessage?: string;
}

interface ReportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: ScheduledReport[];
}

export const ReportHistoryModal: React.FC<ReportHistoryModalProps> = ({
  isOpen,
  onClose,
  reports
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
  const [reportFilter, setReportFilter] = useState<string>('all');

  // Generate mock history data (in real app, this would come from API)
  const historyEntries = useMemo(() => {
    const entries: ReportHistoryEntry[] = [];
    
    reports.forEach(report => {
      if (report.lastSent) {
        // Generate some mock history entries
        const numberOfEntries = Math.floor(Math.random() * 10) + 1;
        
        for (let i = 0; i < numberOfEntries; i++) {
          const sentDate = new Date(report.lastSent);
          sentDate.setDate(sentDate.getDate() - (i * 7)); // Weekly entries going back
          
          entries.push({
            id: `${report.id}-${i}`,
            reportId: report.id,
            reportName: report.name,
            sentAt: sentDate,
            recipients: report.recipients,
            format: report.format.toUpperCase(),
            status: Math.random() > 0.1 ? 'sent' : 'failed', // 90% success rate
            fileSize: `${Math.floor(Math.random() * 500 + 100)}KB`,
            errorMessage: Math.random() > 0.9 ? 'SMTP connection failed' : undefined
          });
        }
      }
    });
    
    return entries.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }, [reports]);

  // Filter history entries
  const filteredEntries = useMemo(() => {
    return historyEntries.filter(entry => {
      const matchesSearch = entry.reportName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           entry.recipients.some(email => email.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      
      const matchesReport = reportFilter === 'all' || entry.reportId === reportFilter;
      
      return matchesSearch && matchesStatus && matchesReport;
    });
  }, [historyEntries, searchTerm, statusFilter, reportFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = historyEntries.length;
    const sent = historyEntries.filter(e => e.status === 'sent').length;
    const failed = historyEntries.filter(e => e.status === 'failed').length;
    const successRate = total > 0 ? ((sent / total) * 100).toFixed(1) : '0';
    
    return { total, sent, failed, successRate };
  }, [historyEntries]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDownload = (entry: ReportHistoryEntry) => {
    // In real implementation, this would download the actual report file
    alert(`Downloading ${entry.reportName} (${entry.format}) sent on ${format(entry.sentAt, 'MMM dd, yyyy')}`);
  };

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Report History"
      subtitle="View sent reports and delivery status"
      icon={History}
      size="2xl"
      hideDefaultFooter={true}
      customFooter={
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <Mail className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
                <div className="text-sm text-blue-700">Total Sent</div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-900">{stats.sent}</div>
                <div className="text-sm text-green-700">Successful</div>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <Mail className="h-8 w-8 text-red-600" />
              <div>
                <div className="text-2xl font-bold text-red-900">{stats.failed}</div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-900">{stats.successRate}%</div>
                <div className="text-sm text-purple-700">Success Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports or recipients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="pending">Pending</option>
            </select>
            
            <select
              value={reportFilter}
              onChange={(e) => setReportFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Reports</option>
              {reports.map(report => (
                <option key={report.id} value={report.id}>{report.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* History Table */}
        <div className="overflow-hidden border border-gray-200 rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recipients
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Format
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium text-gray-900 mb-2">No History Found</p>
                      <p>No reports match your current filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{entry.reportName}</div>
                          {entry.errorMessage && (
                            <div className="text-xs text-red-600">{entry.errorMessage}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {format(entry.sentAt, 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(entry.sentAt, 'HH:mm')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {entry.recipients.length === 1 ? (
                            entry.recipients[0]
                          ) : (
                            <span>
                              {entry.recipients[0]}
                              {entry.recipients.length > 1 && (
                                <span className="text-gray-500">
                                  {' '}+{entry.recipients.length - 1} more
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                          {entry.format}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(entry.status)}`}>
                          {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.fileSize || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {entry.status === 'sent' && (
                          <button
                            onClick={() => handleDownload(entry)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="Download report"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {filteredEntries.length > 0 && (
          <div className="text-sm text-gray-600 text-center">
            Showing {filteredEntries.length} of {historyEntries.length} report deliveries
          </div>
        )}
      </div>
    </StandardModal>
  );
};