import React, { useState, useEffect } from 'react';
import { Calendar, Clock, FileText, Filter, Users } from 'lucide-react';
import { StandardModal } from '../Common/Modal/StandardModal';

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

interface CreateScheduledReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (report: Omit<ScheduledReport, 'id' | 'createdAt' | 'nextSend'>) => void;
  editingReport?: ScheduledReport | null;
}

export const CreateScheduledReportModal: React.FC<CreateScheduledReportModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingReport
}) => {
  const [formData, setFormData] = useState<{
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
  }>({
    name: '',
    description: '',
    reportType: 'analytics',
    schedule: {
      frequency: 'weekly',
      time: '09:00',
      dayOfWeek: 1, // Monday
      dayOfMonth: 1
    },
    recipients: [''],
    filters: {
      dateRange: 'lastMonth',
      containerSizes: [],
      containerStatuses: [],
      clientCodes: []
    },
    format: 'pdf',
    isActive: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load editing data
  useEffect(() => {
    if (editingReport) {
      setFormData({
        name: editingReport.name,
        description: editingReport.description,
        reportType: editingReport.reportType,
        schedule: editingReport.schedule,
        recipients: editingReport.recipients,
        filters: editingReport.filters,
        format: editingReport.format,
        isActive: editingReport.isActive
      });
    } else {
      // Reset form for new report
      setFormData({
        name: '',
        description: '',
        reportType: 'analytics',
        schedule: {
          frequency: 'weekly',
          time: '09:00',
          dayOfWeek: 1,
          dayOfMonth: 1
        },
        recipients: [''],
        filters: {
          dateRange: 'lastMonth',
          containerSizes: [],
          containerStatuses: [],
          clientCodes: []
        },
        format: 'pdf',
        isActive: true
      });
    }
    setErrors({});
  }, [editingReport, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Report name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    const validRecipients = formData.recipients.filter(email => 
      email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    );
    
    if (validRecipients.length === 0) {
      newErrors.recipients = 'At least one valid email address is required';
    }

    if (!formData.schedule.time) {
      newErrors.time = 'Time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      const validRecipients = formData.recipients.filter(email => 
        email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      );

      onSave({
        ...formData,
        recipients: validRecipients
      });
    }
  };

  const handleRecipientsChange = (index: number, value: string) => {
    const newRecipients = [...formData.recipients];
    newRecipients[index] = value;
    setFormData(prev => ({ ...prev, recipients: newRecipients }));
  };

  const addRecipient = () => {
    setFormData(prev => ({
      ...prev,
      recipients: [...prev.recipients, '']
    }));
  };

  const removeRecipient = (index: number) => {
    if (formData.recipients.length > 1) {
      const newRecipients = formData.recipients.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, recipients: newRecipients }));
    }
  };

  const handleFilterChange = (filterType: keyof typeof formData.filters, value: any) => {
    setFormData(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterType]: value
      }
    }));
  };

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingReport ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
      subtitle="Configure automated report delivery settings"
      icon={Calendar}
      size="xl"
      onSubmit={handleSubmit}
      submitLabel={editingReport ? 'Update Report' : 'Create Report'}
      isFormValid={Object.keys(errors).length === 0}
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-gray-600" />
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Weekly Analytics Report"
              />
              {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Type
              </label>
              <select
                value={formData.reportType}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  reportType: e.target.value as 'analytics' | 'operations' | 'both'
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="analytics">Analytics Only</option>
                <option value="operations">Operations Only</option>
                <option value="both">Analytics + Operations</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Describe what this report includes and its purpose..."
            />
            {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
          </div>
        </div>

        {/* Schedule Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-gray-600" />
            Schedule Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency
              </label>
              <select
                value={formData.schedule.frequency}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  schedule: {
                    ...prev.schedule,
                    frequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time *
              </label>
              <input
                type="time"
                value={formData.schedule.time}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  schedule: { ...prev.schedule, time: e.target.value }
                }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.time ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.time && <p className="text-red-600 text-sm mt-1">{errors.time}</p>}
            </div>

            {formData.schedule.frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day of Week
                </label>
                <select
                  value={formData.schedule.dayOfWeek}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, dayOfWeek: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                </select>
              </div>
            )}

            {formData.schedule.frequency === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day of Month
                </label>
                <select
                  value={formData.schedule.dayOfMonth}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, dayOfMonth: Number(e.target.value) }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Recipients */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2 text-gray-600" />
            Recipients
          </h3>

          <div className="space-y-2">
            {formData.recipients.map((email, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleRecipientsChange(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@example.com"
                />
                {formData.recipients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRecipient(index)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            
            <button
              type="button"
              onClick={addRecipient}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              + Add another recipient
            </button>
            
            {errors.recipients && <p className="text-red-600 text-sm">{errors.recipients}</p>}
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Filter className="h-5 w-5 mr-2 text-gray-600" />
            Report Filters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={formData.filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="lastWeek">Last Week</option>
                <option value="lastMonth">Last Month</option>
                <option value="lastQuarter">Last Quarter</option>
                <option value="lastYear">Last Year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Export Format
              </label>
              <select
                value={formData.format}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  format: e.target.value as 'pdf' | 'excel' | 'html'
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="html">HTML</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Container Sizes (Optional)
              </label>
              <div className="space-y-2">
                {['20ft', '40ft'].map(size => (
                  <label key={size} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.filters.containerSizes.includes(size)}
                      onChange={(e) => {
                        const newSizes = e.target.checked
                          ? [...formData.filters.containerSizes, size]
                          : formData.filters.containerSizes.filter(s => s !== size);
                        handleFilterChange('containerSizes', newSizes);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{size}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Container Status (Optional)
              </label>
              <div className="space-y-2">
                {['in_depot', 'out_depot', 'maintenance'].map(status => (
                  <label key={status} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.filters.containerStatuses.includes(status)}
                      onChange={(e) => {
                        const newStatuses = e.target.checked
                          ? [...formData.filters.containerStatuses, status]
                          : formData.filters.containerStatuses.filter(s => s !== status);
                        handleFilterChange('containerStatuses', newStatuses);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Active Status */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            Activate this scheduled report immediately
          </label>
        </div>
      </div>
    </StandardModal>
  );
};