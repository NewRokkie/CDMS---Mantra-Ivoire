import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Package,
  Building,
  AlertTriangle,
  CheckCircle,
  FileText,
  Globe
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { reportService, containerService, clientService } from '../../services/api';
import { SimpleAnalyticsTab as AnalyticsTab } from './SimpleAnalyticsTab';
import { SimpleOperationsTab as OperationsTab } from './SimpleOperationsTab';
import { ScheduledReports } from './ScheduledReports';
import { ReportsStatsWidget } from './ReportsStatsWidget';
import { ReportsHelpGuide, useReportsHelp } from './ReportsHelpGuide';
import { handleError } from '../../services/errorHandling';
import { logger } from '../../utils/logger';
import { NotificationProvider } from '../Common/Notifications/NotificationSystem';

// Constants
const REPORT_TABS = [
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'operations', label: 'Operations', icon: Package }
] as const;

// Error Boundary Component
class ReportsErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; resetError: () => void }> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Reports module error', 'ReportsErrorBoundary', { error, errorInfo });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

// Default Error Fallback Component
const DefaultErrorFallback: React.FC<{ error: Error; resetError: () => void }> = ({ error, resetError }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-4">
        We encountered an error while loading the reports. Please try refreshing the page.
      </p>
      <button
        onClick={resetError}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  </div>
);

export const ReportsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'operations'>('analytics');
  const [viewMode, setViewMode] = useState<'current' | 'global'>('current');
  const [selectedDepot, setSelectedDepot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScheduledReports, setShowScheduledReports] = useState(false);
  const { isHelpVisible, showHelp, hideHelp } = useReportsHelp();

  const { user, canViewAllData, hasModuleAccess } = useAuth();
  const { currentYard } = useYard();
  const [containers, setContainers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [containerStats, setContainerStats] = useState<any>(null);
  const [revenueReport, setRevenueReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReportsData() {
      try {
        setLoading(true);
        setError(null);
        
        const [containersData, clientsData, stats, revenue] = await Promise.all([
          containerService.getAll(),
          clientService.getAll(),
          reportService.getContainerStats(currentYard?.id),
          reportService.getRevenueReport('month')
        ]);
        
        setContainers(containersData || []);
        setClients(clientsData || []);
        setContainerStats(stats);
        setRevenueReport(revenue);
        
        logger.info('Reports data loaded successfully', 'ReportsModule', {
          containersCount: containersData?.length || 0,
          clientsCount: clientsData?.length || 0
        });
      } catch (error) {
        handleError(error, 'ReportsModule.loadReportsData');
        setError('Failed to load reports data. Please try again.');
        logger.error('Failed to load reports data', 'ReportsModule', error);
      } finally {
        setLoading(false);
      }
    }
    loadReportsData();
  }, [currentYard?.id]);

  const isManager = user?.role === 'admin' || user?.role === 'supervisor';
  const showClientNotice = !canViewAllData();

  // Mock available yards for managers
  const availableYards = [
    { id: 'depot-tantarelli', name: 'Tantarelli Depot', code: 'TAN', currentOccupancy: 850, totalCapacity: 1200 },
    { id: 'depot-vridi', name: 'Vridi Terminal', code: 'VRI', currentOccupancy: 650, totalCapacity: 900 },
    { id: 'depot-san-pedro', name: 'San Pedro Port', code: 'SPP', currentOccupancy: 420, totalCapacity: 800 }
  ];

  const canAccessAnalytics = hasModuleAccess('analytics');
  const canAccessOperationsReports = hasModuleAccess('operationsReports');

  const DesktopContent = () => {
    // Show loading state
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reports data...</p>
          </div>
        </div>
      );
    }

    // Show error state
    if (error) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Reports</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    // Show empty state if no data
    if (containers.length === 0 && clients.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">There is no data to generate reports. Start by adding containers and clients.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Reports Statistics Widget */}
        <ReportsStatsWidget
          onRefreshData={() => window.location.reload()}
          lastUpdated={new Date()}
          activeFiltersCount={0}
          autoRefreshEnabled={false}
        />

        {/* Multi-Depot View Toggle for Managers */}
        {isManager && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('current')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                      viewMode === 'current'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Building className="h-4 w-4" />
                    <span>Current Depot</span>
                  </button>
                  <button
                    onClick={() => setViewMode('global')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                      viewMode === 'global'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Globe className="h-4 w-4" />
                    <span>All Depots</span>
                  </button>
                </div>

                {viewMode === 'global' && (
                  <select
                    value={selectedDepot || 'all'}
                    onChange={(e) => setSelectedDepot(e.target.value === 'all' ? null : e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Depots Combined</option>
                    {availableYards.map(depot => (
                      <option key={depot.id} value={depot.id}>
                        {depot.name} ({depot.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="text-sm text-gray-600">
                {viewMode === 'current' ? (
                  <span>Viewing: {currentYard?.name || 'No depot selected'}</span>
                ) : selectedDepot ? (
                  <span>Viewing: {availableYards.find(d => d.id === selectedDepot)?.name}</span>
                ) : (
                  <span>Viewing: Global Performance ({availableYards.length} depots)</span>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
            <p className="text-gray-600">
              Container analytics and operational reports
              {viewMode === 'current' && currentYard && (
                <span className="ml-2 text-blue-600 font-medium">
                  • {currentYard.name} ({currentYard.code})
                </span>
              )}
              {viewMode === 'global' && isManager && (
                <span className="ml-2 text-purple-600 font-medium">
                  • {selectedDepot
                    ? availableYards.find(d => d.id === selectedDepot)?.name
                    : `Global View (${availableYards.length} depots)`
                  }
                </span>
              )}
            </p>
            {showClientNotice && (
              <div className="flex items-center mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
                <p className="text-sm text-blue-800">
                  You are viewing reports for <strong>{user?.company}</strong> only.
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={showHelp}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Guide d'utilisation"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span>Guide</span>
            </button>
            <button 
              onClick={() => setShowScheduledReports(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Calendar className="h-4 w-4" />
              <span>Scheduled Reports</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200 p-1">
          <div className="flex space-x-1" role="tablist" aria-label="Reports navigation">
            {REPORT_TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  id={`${tab.id}-tab`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            viewMode={isManager ? viewMode : 'current'}
            selectedDepot={selectedDepot}
            availableYards={availableYards}
            currentYard={currentYard}
          />
        )}

        {/* Operations Tab */}
        {activeTab === 'operations' && (
          <OperationsTab
            viewMode={isManager ? viewMode : 'current'}
            selectedDepot={selectedDepot}
            availableYards={availableYards}
            currentYard={currentYard}
          />
        )}

        {/* Scheduled Reports Modal */}
        <ScheduledReports
          isVisible={showScheduledReports}
          onClose={() => setShowScheduledReports(false)}
        />

        {/* Help Guide */}
        <ReportsHelpGuide
          isVisible={isHelpVisible}
          onClose={hideHelp}
        />
      </div>
    );
  };

  return (
    <NotificationProvider>
      <ReportsErrorBoundary>
        <DesktopContent />
      </ReportsErrorBoundary>
    </NotificationProvider>
  );
};