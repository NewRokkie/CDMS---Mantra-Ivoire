import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  Filter,
  Globe,
  Search,
  TrendingUp,
  Clock,
  Package,
  Building,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calculator,
  Eye,
  X
} from 'lucide-react';
import { DesktopOnlyMessage } from '../Common/DesktopOnlyMessage';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { reportService, containerService, clientService } from '../../services/api';
import { yardsService } from '../../services/api/yardsService';
import { DatePicker } from '../Common/DatePicker';
import { AnalyticsTab } from './AnalyticsTab';
import { OperationsTab } from './OperationsTab';

// Constants
const REPORT_TABS = [
  { id: 'billing', label: 'Billing & Free Days', icon: DollarSign },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'operations', label: 'Operations', icon: Package }
] as const;

const DEPOT_STATUS_COLORS = {
  high: 'text-red-600',
  medium: 'text-orange-600',
  low: 'text-green-600',
  normal: 'text-blue-600'
} as const;

const UTILIZATION_THRESHOLDS = {
  high: 90,
  medium: 75,
  low: 25
} as const;

// Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateTime = (date: Date): string => {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatLongDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getStatusBadge = (status: 'active' | 'completed') => {
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
      status === 'active'
        ? 'bg-green-100 text-green-800'
        : 'bg-blue-100 text-blue-800'
    }`}>
      {status === 'active' ? 'Active' : 'Completed'}
    </span>
  );
};

const getUtilizationColor = (rate: number): string => {
  if (rate >= UTILIZATION_THRESHOLDS.high) return DEPOT_STATUS_COLORS.high;
  if (rate >= UTILIZATION_THRESHOLDS.medium) return DEPOT_STATUS_COLORS.medium;
  if (rate >= UTILIZATION_THRESHOLDS.low) return DEPOT_STATUS_COLORS.low;
  return DEPOT_STATUS_COLORS.normal;
};

const getUtilizationBgColor = (rate: number): string => {
  if (rate >= UTILIZATION_THRESHOLDS.high) return 'bg-red-500';
  if (rate >= UTILIZATION_THRESHOLDS.medium) return 'bg-orange-500';
  if (rate >= UTILIZATION_THRESHOLDS.low) return 'bg-green-500';
  return 'bg-blue-500';
};

interface ClientFreeDays {
  clientCode: string;
  clientName: string;
  freeDaysAllowed: number;
  dailyRate: number; // USD per day
  currency: string;
}

interface ContainerBilling {
  id: string;
  containerNumber: string;
  clientCode: string;
  clientName: string;
  depotId: string; // Added depotId to uniquely assign containers to depots
  placedDate: Date;
  outDate?: Date;
  totalDays: number;
  freeDaysUsed: number;
  billableDays: number;
  dailyRate: number;
  totalAmount: number;
  status: 'active' | 'completed';
  location: string;
}

// Import client data from Client Master Data
const mockClientFreeDays: ClientFreeDays[] = [
  { clientCode: 'MAEU', clientName: 'Maersk Line', freeDaysAllowed: 3, dailyRate: 45.00, currency: 'USD' },
  { clientCode: 'MSCU', clientName: 'MSC Mediterranean Shipping', freeDaysAllowed: 2, dailyRate: 42.00, currency: 'USD' },
  { clientCode: 'CMDU', clientName: 'CMA CGM', freeDaysAllowed: 4, dailyRate: 48.00, currency: 'USD' },
  { clientCode: 'SHIP001', clientName: 'Shipping Solutions Inc', freeDaysAllowed: 1, dailyRate: 35.00, currency: 'USD' },
  { clientCode: 'HLCU', clientName: 'Hapag-Lloyd', freeDaysAllowed: 3, dailyRate: 46.00, currency: 'USD' }
];

// Types for container data generation
interface RawContainerData {
  number: string;
  clientCode: string;
  depotId: string;
  placedDaysAgo: number;
  outDaysAgo: number | null;
  location: string;
}

interface DepotData {
  id: string;
  name: string;
}

// Generate billing data from actual containers in global store
const generateBillingDataFromStore = (storeContainers: any[], storeClients: any[]): ContainerBilling[] => {
  try {
    const availableDepots: DepotData[] = [
      { id: 'depot-tantarelli', name: 'Tantarelli Depot' },
      { id: 'depot-vridi', name: 'Vridi Terminal' },
      { id: 'depot-san-pedro', name: 'San Pedro Port' }
    ];

    // Use actual containers from store
    return storeContainers.map((container, index) => {
      const client = storeClients.find(c => c.code === container.clientCode);
      if (!client) {
        console.warn(`No client found for code: ${container.clientCode}`);
        return null;
      }

      const clientConfig = mockClientFreeDays.find(c => c.clientCode === container.clientCode) || {
        clientCode: container.clientCode,
        freeDaysAllowed: client.freeDaysAllowed || 3,
        dailyRate: client.dailyStorageRate || 45.00
      };

      const now = new Date();
      const placedDate = container.gateInDate ? new Date(container.gateInDate) : new Date();
      const outDate = container.gateOutDate ? new Date(container.gateOutDate) : undefined;

      const totalDays = outDate
        ? Math.ceil((outDate.getTime() - placedDate.getTime()) / (1000 * 60 * 60 * 24))
        : Math.ceil((now.getTime() - placedDate.getTime()) / (1000 * 60 * 60 * 24));

      const freeDaysUsed = Math.min(totalDays, clientConfig.freeDaysAllowed);
      const billableDays = Math.max(0, totalDays - clientConfig.freeDaysAllowed);
      const totalAmount = billableDays * clientConfig.dailyRate;

      return {
        id: `billing-${container.id}`,
        containerNumber: container.number,
        clientCode: container.clientCode,
        clientName: client.name,
        depotId: container.yardId || 'depot-tantarelli',
        depotName: 'Current Depot',
        location: container.location || 'Unknown',
        placedDate,
        outDate,
        totalDays,
        freeDaysAllowed: clientConfig.freeDaysAllowed,
        freeDaysUsed,
        billableDays,
        dailyRate: clientConfig.dailyRate,
        totalAmount,
        status: outDate ? 'billed' : (billableDays > 0 ? 'accruing' : 'free_days'),
        currency: client.currency || 'USD'
      };
    }).filter(Boolean) as ContainerBilling[];
  } catch (error) {
    console.error('Error generating mock billing data:', error);
    throw new Error('Failed to generate billing data');
  }
};

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
    console.error('Reports module error:', error, errorInfo);
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
  const [activeTab, setActiveTab] = useState<'billing' | 'analytics' | 'operations'>('billing');
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedContainer, setSelectedContainer] = useState<ContainerBilling | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewMode, setViewMode] = useState<'current' | 'global'>('current');
  const [selectedDepot, setSelectedDepot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, canViewAllData, getClientFilter, hasModuleAccess } = useAuth();
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
        const [containersData, clientsData, stats, revenue] = await Promise.all([
          containerService.getAll(),
          clientService.getAll(),
          reportService.getContainerStats(),
          reportService.getRevenueReport('month')
        ]);
        setContainers(containersData);
        setClients(clientsData);
        setContainerStats(stats);
        setRevenueReport(revenue);
      } catch (error) {
        console.error('Error loading reports data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadReportsData();
  }, []);

  const billingData = useMemo(() => {
    try {
      return generateBillingDataFromStore(containers, clients);
    } catch (err) {
      console.error('Error generating billing data:', err);
      setError('Failed to load billing data');
      return [];
    }
  }, [containers, clients]);

  const isManager = user?.role === 'admin' || user?.role === 'supervisor';
  const showClientNotice = !canViewAllData();

  // Mock available yards for managers
  const availableYards = [
    { id: 'depot-tantarelli', name: 'Tantarelli Depot', code: 'TAN', currentOccupancy: 850, totalCapacity: 1200 },
    { id: 'depot-vridi', name: 'Vridi Terminal', code: 'VRI', currentOccupancy: 650, totalCapacity: 900 },
    { id: 'depot-san-pedro', name: 'San Pedro Port', code: 'SPP', currentOccupancy: 420, totalCapacity: 800 }
  ];


  // Memoized depot statistics calculation for better performance
  const depotStats = useMemo(() => {
    if (!isManager || !billingData.length) return [];

    return availableYards.map(depot => {
      // Filter billing data by depotId for accurate depot-specific statistics
      const depotBilling = billingData.filter(item => item.depotId === depot.id);

      // Use more efficient calculation methods
      const totals = depotBilling.reduce(
        (acc, item) => ({
          revenue: acc.revenue + item.totalAmount,
          activeContainers: acc.activeContainers + (item.status === 'active' ? 1 : 0),
          billableDays: acc.billableDays + item.billableDays,
          totalDays: acc.totalDays + item.totalDays,
          completedContainers: acc.completedContainers + (item.status === 'completed' ? 1 : 0)
        }),
        { revenue: 0, activeContainers: 0, billableDays: 0, totalDays: 0, completedContainers: 0 }
      );

      return {
        id: depot.id,
        name: depot.name,
        code: depot.code,
        revenue: totals.revenue,
        activeContainers: totals.activeContainers,
        completedContainers: totals.completedContainers,
        billableDays: totals.billableDays,
        averageDays: depotBilling.length > 0 ? totals.totalDays / depotBilling.length : 0,
        utilizationRate: (depot.currentOccupancy / depot.totalCapacity) * 100
      };
    });
  }, [isManager, availableYards, billingData]);

  // Memoized global statistics for better performance
  const globalBillingStats = useMemo(() => {
    if (!isManager || !depotStats.length) return null;

    const globalTotals = depotStats.reduce(
      (acc, depot) => ({
        totalRevenue: acc.totalRevenue + depot.revenue,
        totalActiveContainers: acc.totalActiveContainers + depot.activeContainers,
        totalCompletedContainers: acc.totalCompletedContainers + depot.completedContainers,
        totalBillableDays: acc.totalBillableDays + depot.billableDays,
        utilizationSum: acc.utilizationSum + depot.utilizationRate
      }),
      { totalRevenue: 0, totalActiveContainers: 0, totalCompletedContainers: 0, totalBillableDays: 0, utilizationSum: 0 }
    );

    return {
      depotStats,
      globalTotals: {
        ...globalTotals,
        averageUtilization: globalTotals.utilizationSum / depotStats.length
      }
    };
  }, [isManager, depotStats]);

  // Optimized filtering with better performance
  const filteredData = useMemo(() => {
    if (!billingData.length) return [];

    let data = billingData;

    // Apply view mode filtering - combine conditions for better performance
    if (isManager && viewMode === 'global' && selectedDepot) {
      data = data.filter(item => item.depotId === selectedDepot);
    } else if (!isManager || viewMode === 'current') {
      if (currentYard?.id) {
        data = data.filter(item => item.depotId === currentYard.id);
      }
    }

    // Apply client filter for client users
    const clientFilterValue = getClientFilter();
    if (clientFilterValue) {
      data = data.filter(item => item.clientCode === clientFilterValue);
    }

    // Apply search filter - use more efficient search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      data = data.filter(item =>
        item.containerNumber.toLowerCase().includes(searchLower) ||
        item.clientName.toLowerCase().includes(searchLower) ||
        item.clientCode.toLowerCase().includes(searchLower)
      );
    }

    // Apply additional client filter
    if (clientFilter !== 'all') {
      data = data.filter(item => item.clientCode === clientFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      data = data.filter(item => item.status === statusFilter);
    }

    return data;
  }, [isManager, viewMode, selectedDepot, currentYard, billingData, getClientFilter, searchTerm, clientFilter, statusFilter]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum, item) => sum + item.totalAmount, 0);
    const activeContainers = filteredData.filter(item => item.status === 'active').length;
    const completedContainers = filteredData.filter(item => item.status === 'completed').length;
    const totalBillableDays = filteredData.reduce((sum, item) => sum + item.billableDays, 0);
    const averageDaysInDepot = filteredData.length > 0
      ? filteredData.reduce((sum, item) => sum + item.totalDays, 0) / filteredData.length
      : 0;

    return {
      totalRevenue,
      activeContainers,
      completedContainers,
      totalBillableDays,
      averageDaysInDepot
    };
  }, [filteredData]);

  // Get unique clients for filter
  const uniqueClients = useMemo(() => {
    const clients = billingData.map(item => ({
      code: item.clientCode,
      name: item.clientName
    }));
    const uniqueMap = new Map();
    clients.forEach(client => uniqueMap.set(client.code, client));
    return Array.from(uniqueMap.values());
  }, [billingData]);


  const handleViewDetails = (container: ContainerBilling) => {
    setSelectedContainer(container);
    setShowDetailModal(true);
  };

  const canAccessReports = user?.role === 'admin' || user?.role === 'supervisor';
  const canAccessBillingReports = hasModuleAccess('billingReports');
  const canAccessOperationsReports = hasModuleAccess('operationsReports');
  const canAccessAnalytics = hasModuleAccess('analytics');

  // Check if user has access to reports
  if (!canAccessReports) {
    return null;
  }

  const DesktopContent = () => {
    return (
      <div className="space-y-6">
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
            Container billing, free days tracking, and operational analytics
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

      {/* Billing & Free Days Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Global Billing Statistics for Managers */}
          {isManager && viewMode === 'global' && globalBillingStats && !selectedDepot && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Global Billing Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Global Revenue</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(globalBillingStats.globalTotals.totalRevenue)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Active Containers</p>
                      <p className="text-lg font-semibold text-gray-900">{globalBillingStats.globalTotals.totalActiveContainers}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Global Billable Days</p>
                      <p className="text-lg font-semibold text-gray-900">{globalBillingStats.globalTotals.totalBillableDays}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Avg Utilization</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {globalBillingStats.globalTotals.averageUtilization.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Depot Performance Comparison */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Depot Revenue Comparison</h3>
                  <p className="text-sm text-gray-600">Revenue and billing metrics by depot</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200" role="table" aria-label="Depot performance comparison">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depot</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Containers</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billable Days</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Days</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {globalBillingStats.depotStats.map((depot) => (
                        <tr key={depot.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Building className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{depot.name}</div>
                                <div className="text-sm text-gray-500">{depot.code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(depot.revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{depot.activeContainers}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{depot.billableDays}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{depot.averageDays.toFixed(1)} days</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1">
                                <div className={`text-sm font-medium ${getUtilizationColor(depot.utilizationRate)}`}>
                                  {depot.utilizationRate.toFixed(1)}%
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                  <div
                                    className={`h-1.5 rounded-full ${getUtilizationBgColor(depot.utilizationRate)}`}
                                    style={{ width: `${Math.min(depot.utilizationRate, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedDepot(depot.id)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded"
                              title="View Depot Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Individual Depot View for Managers */}
          {isManager && viewMode === 'global' && selectedDepot && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-blue-900">
                      Viewing: {availableYards.find(d => d.id === selectedDepot)?.name}
                    </h3>
                    <p className="text-sm text-blue-700">Individual depot billing and performance</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDepot(null)}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(summaryStats.totalRevenue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Active Containers</p>
                  <p className="text-lg font-semibold text-gray-900">{summaryStats.activeContainers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Billable Days</p>
                  <p className="text-lg font-semibold text-gray-900">{summaryStats.totalBillableDays}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Avg Days in Depot</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {summaryStats.averageDaysInDepot.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search containers, clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                />
              </div>

              <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-3">
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Clients</option>
                  {uniqueClients.map(client => (
                    <option key={client.code} value={client.code}>
                      {client.code} - {client.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Billing Data Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Container Billing Details</h3>
              <p className="text-sm text-gray-600">Free days calculation and billing information</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Container
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days in Depot
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Free Days Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billable Days
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item) => {
                    const clientConfig = mockClientFreeDays.find(c => c.clientCode === item.clientCode);
                    const isOverFreeLimit = item.billableDays > 0;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.containerNumber}</div>
                          <div className="text-sm text-gray-500">{item.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {canViewAllData() ? item.clientName : 'Your Company'}
                          </div>
                          <div className="text-sm text-gray-500">{item.clientCode}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.totalDays} days</div>
                          <div className="text-sm text-gray-500">
                            {formatDate(item.placedDate)} - {item.outDate ? formatDate(item.outDate) : 'Present'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {item.freeDaysUsed}/{clientConfig?.freeDaysAllowed} days
                            </span>
                            {item.freeDaysUsed >= (clientConfig?.freeDaysAllowed || 0) && (
                              <div title="Free days fully used">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${isOverFreeLimit ? 'text-red-600' : 'text-green-600'}`}>
                            {item.billableDays} days
                          </div>
                          {isOverFreeLimit && (
                            <div className="text-xs text-red-500">Over free limit</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.totalAmount)}
                          </div>
                          <div className="text-xs text-gray-500">
                            @ {formatCurrency(item.dailyRate)}/day
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleViewDetails(item)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="View Billing Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredData.length === 0 && (
              <div className="text-center py-12">
                <Calculator className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No billing data found</h3>
                <p className="text-gray-600">
                  {searchTerm || clientFilter !== 'all' || statusFilter !== 'all'
                    ? "Try adjusting your search criteria or filters."
                    : "No container billing data available."
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Billing Detail Modal */}
      {showDetailModal && selectedContainer && (
        <BillingDetailModal
          container={selectedContainer}
          clientConfig={mockClientFreeDays.find(c => c.clientCode === selectedContainer.clientCode)}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedContainer(null);
          }}
          canViewAllData={canViewAllData()}
        />
      )}
    </div>
  );

  return (
    <ReportsErrorBoundary>
      <DesktopContent />
    </ReportsErrorBoundary>
  );
};

// Billing Detail Modal Component
const BillingDetailModal: React.FC<{
  container: ContainerBilling;
  clientConfig?: ClientFreeDays;
  onClose: () => void;
  canViewAllData: boolean;
}> = ({ container, clientConfig, onClose, canViewAllData }) => {

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">

        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-600 text-white rounded-xl">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Billing Details</h3>
                <p className="text-sm text-gray-600 mt-1">{container.containerNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-6">

            {/* Container & Client Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Container Information
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Container Number:</span>
                    <span className="font-medium text-gray-900">{container.containerNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Location:</span>
                    <span className="font-medium text-gray-900">{container.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Status:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      container.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {container.status.charAt(0).toUpperCase() + container.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-4 flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Client Information
                </h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Client:</span>
                    <span className="font-medium text-gray-900">
                      {canViewAllData ? container.clientName : 'Your Company'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Client Code:</span>
                    <span className="font-medium text-gray-900">{container.clientCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Free Days Allowed:</span>
                    <span className="font-medium text-green-600">
                      {clientConfig?.freeDaysAllowed || 0} days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Daily Rate:</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(clientConfig?.dailyRate || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Information */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Timeline & Dates
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Placed Date:</span>
                  <div className="font-medium text-gray-900 mt-1">{formatDateTime(container.placedDate)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Out Date:</span>
                  <div className="font-medium text-gray-900 mt-1">
                    {container.outDate ? formatDateTime(container.outDate) : 'Still in depot'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Total Days:</span>
                  <div className="font-medium text-gray-900 mt-1">{container.totalDays} days</div>
                </div>
                <div>
                  <span className="text-gray-600">Period:</span>
                  <div className="font-medium text-gray-900 mt-1">
                    {container.status === 'active' ? 'Ongoing' : 'Completed'}
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Calculation Breakdown */}
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Billing Calculation
              </h4>

              <div className="space-y-4">
                {/* Calculation Steps */}
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total days in depot:</span>
                      <span className="font-medium text-gray-900">{container.totalDays} days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Free days allowed:</span>
                      <span className="font-medium text-green-600">
                        {clientConfig?.freeDaysAllowed || 0} days
                      </span>
                    </div>
                  </div>
                </div>

                {/* Calculation Formula */}
                <div className="bg-gray-100 p-4 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">Calculation Formula:</h5>
                  <div className="text-sm text-gray-700 font-mono">
                    Billable Days = Max(0, Total Days - Free Days)<br/>
                    Total Amount = Billable Days × Daily Rate<br/>
                    <span className="text-green-600 font-semibold">
                      {container.totalAmount > 0
                        ? `${container.billableDays} × ${formatCurrency(container.dailyRate)} = ${formatCurrency(container.totalAmount)}`
                        : 'No charges (within free days)'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}};
