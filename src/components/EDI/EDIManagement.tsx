import React, { useState, useEffect } from 'react';
import { 
  Send, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Upload,
  Download,
  Settings
} from 'lucide-react';
import { EDIService } from '../../services/edifact/ediService';
import { EDITransmissionLog, EDITransmissionConfig } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';

export const EDIManagement: React.FC = () => {
  const [transmissionLogs, setTransmissionLogs] = useState<EDITransmissionLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'json' | 'xml'>('json');
  const [operation, setOperation] = useState<'GATE_IN' | 'GATE_OUT'>('GATE_IN');
  const [showConfig, setShowConfig] = useState(false);
  const { user } = useAuth();
  const { currentYard } = useYard();

  const ediService = new EDIService();

  useEffect(() => {
    loadTransmissionLogs();
    // Set up periodic acknowledgment checking
    const interval = setInterval(checkAcknowledgments, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadTransmissionLogs = () => {
    const logs = ediService.getTransmissionLogs();
    setTransmissionLogs(logs);
  };

  const checkAcknowledgments = async () => {
    try {
      await ediService.checkPendingAcknowledgments();
      loadTransmissionLogs();
    } catch (error) {
      console.error('Error checking acknowledgments:', error);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      const fileContent = await selectedFile.text();
      
      let log: EDITransmissionLog;
      if (fileType === 'json') {
        log = await ediService.processFromJSON(fileContent, operation);
      } else {
        log = await ediService.processFromXML(fileContent, operation);
      }

      setTransmissionLogs(prev => [log, ...prev]);
      setSelectedFile(null);
      
      alert('EDI file processed and transmitted successfully!');
    } catch (error) {
      alert(`Error processing file: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const retryTransmission = async (logId: string) => {
    setIsLoading(true);
    try {
      const updatedLog = await ediService.retryFailedTransmission(logId);
      setTransmissionLogs(prev => 
        prev.map(log => log.id === logId ? updatedLog : log)
      );
      alert('Transmission retry successful!');
    } catch (error) {
      alert(`Retry failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: EDITransmissionLog['status']) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'SENT':
        return <Send className="h-4 w-4 text-blue-500" />;
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'ACKNOWLEDGED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: EDITransmissionLog['status']) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      SENT: { color: 'bg-blue-100 text-blue-800', label: 'Sent' },
      FAILED: { color: 'bg-red-100 text-red-800', label: 'Failed' },
      ACKNOWLEDGED: { color: 'bg-green-100 text-green-800', label: 'Acknowledged' }
    };
    
    const config = statusConfig[status];
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {getStatusIcon(status)}
        <span className="ml-1">{config.label}</span>
      </span>
    );
  };

  const canManageEDI = user?.role === 'admin' || user?.role === 'supervisor';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">EDI Management</h2>
        {currentYard && (
          <div className="text-right text-sm text-gray-600">
            <div>Current Yard: {currentYard.name}</div>
            <div className="text-xs">{currentYard.code}</div>
          </div>
        )}
        <div className="flex space-x-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Configuration</span>
          </button>
          <button
            onClick={checkAcknowledgments}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Check Acknowledgments</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Send className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Sent</p>
              <p className="text-lg font-semibold text-gray-900">
                {transmissionLogs.filter(l => l.status === 'SENT' || l.status === 'ACKNOWLEDGED').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-lg font-semibold text-gray-900">
                {transmissionLogs.filter(l => l.status === 'PENDING').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="text-lg font-semibold text-gray-900">
                {transmissionLogs.filter(l => l.status === 'FAILED').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Acknowledged</p>
              <p className="text-lg font-semibold text-gray-900">
                {transmissionLogs.filter(l => l.status === 'ACKNOWLEDGED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">EDI Processing Options</h3>
        
        {/* SAP XML Generation */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-3">Generate SAP CODECO XML</h4>
          <p className="text-sm text-blue-700 mb-4">
            Generate SAP-format XML for CODECO transmission (uses sample container data)
          </p>
          <div className="flex items-center space-x-4">
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value as 'GATE_IN' | 'GATE_OUT')}
              className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="GATE_IN">Gate In</option>
              <option value="GATE_OUT">Gate Out</option>
            </select>
            <button
              onClick={handleGenerateSapXml}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span>{isLoading ? 'Generating...' : 'Generate SAP XML'}</span>
            </button>
          </div>
        </div>
        
        {/* File Upload */}
        <h4 className="font-medium text-gray-900 mb-4">Process EDI from File</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File Type
            </label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value as 'json' | 'xml')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="json">JSON</option>
              <option value="xml">XML</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Operation
            </label>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value as 'GATE_IN' | 'GATE_OUT')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="GATE_IN">Gate In</option>
              <option value="GATE_OUT">Gate Out</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <input
              type="file"
              accept={fileType === 'json' ? '.json' : '.xml'}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={handleFileUpload}
            disabled={!selectedFile || isLoading}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="h-4 w-4" />
            <span>{isLoading ? 'Processing...' : 'Process & Send'}</span>
          </button>
        </div>
      </div>

      {/* Transmission Logs */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Transmission History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transmission Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transmissionLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{log.id}</div>
                    <div className="text-sm text-gray-500">{log.fileName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.containerNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      log.operation === 'GATE_IN' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {log.operation.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(log.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.partnerCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.transmissionDate.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {log.status === 'FAILED' && (
                        <button
                          onClick={() => retryTransmission(log.id)}
                          className="text-blue-600 hover:text-blue-900 px-3 py-1 rounded border border-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          Retry
                        </button>
                      )}
                      <button className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded border border-gray-600 hover:bg-gray-50 transition-colors">
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};