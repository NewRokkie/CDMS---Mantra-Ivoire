/**
 * Dashboard de gestion EDI - Interface principale pour le module EDI Management
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '../UI/card';
import { Button } from '../UI/button';
import { Badge } from '../UI/badge';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Download,
  AlertTriangle
} from 'lucide-react';
import { ediManagementService } from '../../services/edi/ediManagement';
import { EDITransmissionLog, EDIStats } from '../../types/edi';

interface SystemStatus {
  apiHealthy: boolean;
  apiInfo?: any;
  stats: EDIStats;
  lastTransmissions: EDITransmissionLog[];
}

export const EDIManagementDashboard: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const loadSystemStatus = async () => {
    try {
      setLoading(true);
      const status = await ediManagementService.getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('Failed to load EDI system status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSystemStatus();
    setRefreshing(false);
  };

  const handleExportLogs = () => {
    const csvData = ediManagementService.exportTransmissionLogs();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edi_transmission_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getOperationBadge = (operation: string) => {
    return operation === 'GATE_IN' 
      ? <Badge className="bg-blue-100 text-blue-800">Gate In</Badge>
      : <Badge className="bg-purple-100 text-purple-800">Gate Out</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!systemStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load EDI system status</p>
          <Button onClick={loadSystemStatus} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EDI Management</h1>
          <p className="text-gray-600">Monitor and manage EDI CODECO transmissions</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExportLogs}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-2 rounded-full ${systemStatus.apiHealthy ? 'bg-green-100' : 'bg-red-100'}`}>
                {systemStatus.apiHealthy ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">API Status</p>
                <p className="text-2xl font-bold">
                  {systemStatus.apiHealthy ? 'Healthy' : 'Offline'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-blue-100">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Transmissions</p>
                <p className="text-2xl font-bold">{systemStatus.stats.totalTransmissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">{systemStatus.stats.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold">{systemStatus.stats.pendingTransmissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transmissions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transmissions</CardTitle>
        </CardHeader>
        <CardContent>
          {systemStatus.lastTransmissions.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No transmissions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {systemStatus.lastTransmissions.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-medium">{log.containerNumber}</p>
                      <p className="text-sm text-gray-600">
                        {log.lastAttempt.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {getOperationBadge(log.operation)}
                      {getStatusBadge(log.status)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Attempts: {log.attempts}
                      </p>
                      {log.uploadedToSftp && (
                        <p className="text-sm text-green-600">✓ Uploaded to SFTP</p>
                      )}
                    </div>
                    {log.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => ediManagementService.retryTransmission(log.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Information */}
      {systemStatus.apiInfo && (
        <Card>
          <CardHeader>
            <CardTitle>API Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Name</p>
                <p>{systemStatus.apiInfo.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Version</p>
                <p>{systemStatus.apiInfo.version}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="capitalize">{systemStatus.apiInfo.status}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Documentation</p>
                <p>{systemStatus.apiInfo.docs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};