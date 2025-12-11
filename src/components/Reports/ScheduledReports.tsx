import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Mail, Plus, Edit, Trash2, Send, History, Users } from 'lucide-react';
import { StandardModal } from '../Common/Modal/StandardModal';
import { format } from 'date-fns';

interface ScheduledReport {
  id: string;
  name: string;
  description: string;
  reportType: 'analytics' | 'operations' | 'both';
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:MM format
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  recipients: string[];
  filters: {
    dateRange: string; // 'last7days', 'lastMonth', etc.
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

interface ScheduledReportsProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ScheduledReports: React.FC<ScheduledReportsProps> = ({
  isVisible,
  onClose
}) => {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);


  // Load scheduled reports from localStorage (in real app, this would be from API)
  useEffect(() => {
    const saved = localStorage.getItem('scheduled-reports');
    if (saved) {
      try {
        const reports = JSON.parse(saved).map((report: any) => ({
          ...report,
          createdAt: new Date(report.createdAt),
          lastSent: report.lastSent ? new Date(report.lastSent) : undefined,
          nextSend: new Date(report.nextSend)
        }));
        setScheduledReports(reports);
      } catch (error) {
        console.error('Failed to load scheduled reports:', error);
      }
    }
  }, []);

  const saveReports = (reports: ScheduledReport[]) => {
    localStorage.setItem('scheduled-reports', JSON.stringify(reports));
    setScheduledReports(reports);
  };

  const handleCreateReport = () => {
    setEditingReport(null);
    setShowCreateModal(true);
  };

  const handleEditReport = (report: ScheduledReport) => {
    setEditingReport(report);
    setShowCreateModal(true);
  };

  const handleDeleteReport = (reportId: string) => {
    if (confirm('Are you sure you want to delete this scheduled report?')) {
      const updatedReports = scheduledReports.filter(r => r.id !== reportId);
      saveReports(updatedReports);
    }
  };

  const handleToggleActive = (reportId: string) => {
    const updatedReports = scheduledReports.map(report =>
      report.id === reportId
        ? { ...report, isActive: !report.isActive }
        : report
    );
    saveReports(updatedReports);
  };

  const handleSendNow = async (reportId: string) => {
    // In real implementation, this would trigger the report generation and sending
    const updatedReports = scheduledReports.map(report =>
      report.id === reportId
        ? { ...report, lastSent: new Date() }
        : report
    );
    saveReports(updatedReports);
    
    // Show success message
    alert('Report sent successfully!');
  };

  const getNextSendText = (report: ScheduledReport) => {
    const now = new Date();
    const diffMs = report.nextSend.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const getFrequencyText = (schedule: ScheduledReport['schedule']) => {
    switch (schedule.frequency) {
      case 'daily':
        return `Daily at ${schedule.time}`;
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Weekly on ${days[schedule.dayOfWeek || 0]} at ${schedule.time}`;
      case 'monthly':
        return `Monthly on day ${schedule.dayOfMonth} at ${schedule.time}`;
      default:
        return 'Unknown';
    }
  };

  return (
    <StandardModal
      isOpen={isVisible}
      onClose={onClose}
      title="Scheduled Reports"
      subtitle="Manage automated report delivery"
      icon={Calendar}
      size="2xl"
      hideDefaultFooter={true}
      customFooter={
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCreateReport}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Scheduled Report</span>
          </button>
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
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-900">{scheduledReports.length}</div>
                <div className="text-sm text-blue-700">Total Reports</div>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-900">
                  {scheduledReports.filter(r => r.isActive).length}
                </div>
                <div className="text-sm text-green-700">Active Reports</div>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <Mail className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-900">
                  {scheduledReports.reduce((sum, r) => sum + r.recipients.length, 0)}
                </div>
                <div className="text-sm text-purple-700">Total Recipients</div>
              </div>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Scheduled Reports</h3>
            <button
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <History className="h-4 w-4" />
              <span>View History</span>
            </button>
          </div>

          {scheduledReports.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Reports</h3>
              <p className="text-gray-600 mb-4">
                Create your first scheduled report to start receiving automated updates.
              </p>
              <button
                onClick={handleCreateReport}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Create Scheduled Report</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledReports.map(report => (
                <div
                  key={report.id}
                  className={`p-4 border rounded-lg transition-all ${
                    report.isActive
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">{report.name}</h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          report.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {report.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {report.reportType === 'both' ? 'Analytics + Operations' : 
                           report.reportType === 'analytics' ? 'Analytics' : 'Operations'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{getFrequencyText(report.schedule)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{report.recipients.length} recipient(s)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Next: {getNextSendText(report)}</span>
                        </div>
                      </div>

                      {report.lastSent && (
                        <div className="mt-2 text-xs text-gray-500">
                          Last sent: {format(report.lastSent, 'MMM dd, yyyy HH:mm')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleSendNow(report.id)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Send now"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditReport(report)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(report.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          report.isActive
                            ? 'text-red-600 hover:bg-red-100'
                            : 'text-green-600 hover:bg-green-100'
                        }`}
                        title={report.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Report Modal */}
      {showCreateModal && (
        <CreateScheduledReportModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={(report) => {
            if (editingReport) {
              // Update existing report
              const updatedReports = scheduledReports.map(r =>
                r.id === editingReport.id ? { 
                  ...report, 
                  id: editingReport.id,
                  createdAt: editingReport.createdAt,
                  nextSend: calculateNextSend(report.schedule)
                } : r
              );
              saveReports(updatedReports);
            } else {
              // Create new report
              const newReport: ScheduledReport = {
                ...report,
                id: Date.now().toString(),
                createdAt: new Date(),
                nextSend: calculateNextSend(report.schedule)
              };
              saveReports([...scheduledReports, newReport]);
            }
            setShowCreateModal(false);
          }}
          editingReport={editingReport}
        />
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <ReportHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          reports={scheduledReports}
        />
      )}
    </StandardModal>
  );
};

// Helper function to calculate next send date
const calculateNextSend = (schedule: ScheduledReport['schedule']): Date => {
  const now = new Date();
  const [hours, minutes] = schedule.time.split(':').map(Number);
  
  const nextSend = new Date();
  nextSend.setHours(hours, minutes, 0, 0);
  
  switch (schedule.frequency) {
    case 'daily':
      if (nextSend <= now) {
        nextSend.setDate(nextSend.getDate() + 1);
      }
      break;
    case 'weekly':
      const targetDay = schedule.dayOfWeek || 0;
      const currentDay = nextSend.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && nextSend <= now)) {
        daysUntilTarget += 7;
      }
      nextSend.setDate(nextSend.getDate() + daysUntilTarget);
      break;
    case 'monthly':
      const targetDate = schedule.dayOfMonth || 1;
      nextSend.setDate(targetDate);
      if (nextSend <= now) {
        nextSend.setMonth(nextSend.getMonth() + 1);
      }
      break;
  }
  
  return nextSend;
};

import { CreateScheduledReportModal } from './CreateScheduledReportModal';
import { ReportHistoryModal } from './ReportHistoryModal';