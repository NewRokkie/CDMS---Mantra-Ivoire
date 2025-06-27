import React from 'react';
import { Container, FileCheck, TrendingUp, Building, DollarSign, Activity, BarChart3, AlertTriangle } from 'lucide-react';
import { StatCard } from './StatCard';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { DashboardStats } from '../../types';

// Mock data - in production, this would come from your API
const mockStats: DashboardStats = {
  totalContainers: 1248,
  containersIn: 892,
  containersOut: 356,
  pendingReleaseOrders: 23,
  todayMovements: 47,
  revenue: 125600,
  occupancyRate: 78.5
};

// Mock client-specific data
const mockClientStats = {
  'SHIP001': {
    totalContainers: 15,
    containersIn: 12,
    containersOut: 3,
    pendingReleaseOrders: 2,
    todayMovements: 1,
    revenue: 8500,
    occupancyRate: 85.0
  },
  'MAEU': {
    totalContainers: 45,
    containersIn: 32,
    containersOut: 13,
    pendingReleaseOrders: 5,
    todayMovements: 8,
    revenue: 25600,
    occupancyRate: 92.3
  }
};

export const DashboardOverview: React.FC = () => {
  const { t } = useLanguage();
  const { user, canViewAllData, getClientFilter } = useAuth();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatsForUser = () => {
    const clientFilter = getClientFilter();
    let stats = mockStats;
    
    // Use client-specific stats if user is a client
    if (clientFilter && mockClientStats[clientFilter as keyof typeof mockClientStats]) {
      stats = mockClientStats[clientFilter as keyof typeof mockClientStats];
    }

    const baseStats = [
      {
        title: canViewAllData() ? t('dashboard.stats.containers') : 'Your Containers',
        value: stats.totalContainers.toLocaleString(),
        icon: Container,
        color: 'blue' as const,
        trend: { value: 5.2, isPositive: true }
      },
      {
        title: canViewAllData() ? t('dashboard.stats.in') : 'Containers In Depot',
        value: stats.containersIn.toLocaleString(),
        icon: Building,
        color: 'green' as const,
        trend: { value: 12.1, isPositive: true }
      },
      {
        title: canViewAllData() ? t('dashboard.stats.out') : 'Containers Out',
        value: stats.containersOut.toLocaleString(),
        icon: TrendingUp,
        color: 'teal' as const,
        trend: { value: -2.4, isPositive: false }
      }
    ];

    if (user?.role === 'client') {
      return [
        ...baseStats,
        {
          title: 'Your Release Orders',
          value: stats.pendingReleaseOrders.toString(),
          icon: FileCheck,
          color: 'yellow' as const,
          trend: { value: 8.3, isPositive: false }
        }
      ];
    }

    return [
      ...baseStats,
      {
        title: t('dashboard.stats.pending'),
        value: stats.pendingReleaseOrders.toString(),
        icon: FileCheck,
        color: 'yellow' as const,
        trend: { value: 8.3, isPositive: false }
      },
      {
        title: t('dashboard.stats.movements'),
        value: stats.todayMovements.toString(),
        icon: Activity,
        color: 'purple' as const,
        trend: { value: 15.7, isPositive: true }
      },
      {
        title: t('dashboard.stats.revenue'),
        value: formatCurrency(stats.revenue),
        icon: DollarSign,
        color: 'green' as const,
        trend: { value: 23.5, isPositive: true }
      }
    ];
  };

  const stats = getStatsForUser();
  const showClientNotice = !canViewAllData() && user?.role === 'client';

  // Mock recent activities filtered by client
  const getRecentActivities = () => {
    const allActivities = [
      { container: 'MSKU-123456-7', action: 'Gate In', time: '2 hours ago', status: 'completed', clientCode: 'MAEU' },
      { container: 'TCLU-987654-3', action: 'Gate Out', time: '4 hours ago', status: 'completed', clientCode: 'MSCU' },
      { container: 'GESU-456789-1', action: 'Gate In', time: '6 hours ago', status: 'completed', clientCode: 'CMDU' },
      { container: 'SHIP-111222-8', action: 'Gate In', time: '1 hour ago', status: 'completed', clientCode: 'SHIP001' },
      { container: 'SHIP-333444-9', action: 'Service', time: '8 hours ago', status: 'in_progress', clientCode: 'SHIP001' }
    ];

    const clientFilter = getClientFilter();
    if (clientFilter) {
      return allActivities.filter(activity => activity.clientCode === clientFilter);
    }
    
    return allActivities.slice(0, 4); // Show top 4 for non-client users
  };

  const recentActivities = getRecentActivities();

  // Mock release orders filtered by client
  const getPendingReleaseOrders = () => {
    const allOrders = [
      { id: 'RO-2025-001', container: 'MSKU-123456-7', client: 'Maersk Line', priority: 'high', clientCode: 'MAEU' },
      { id: 'RO-2025-002', container: 'TCLU-987654-3', client: 'MSC', priority: 'medium', clientCode: 'MSCU' },
      { id: 'RO-2025-003', container: 'GESU-456789-1', client: 'CMA CGM', priority: 'low', clientCode: 'CMDU' },
      { id: 'RO-2025-004', container: 'SHIP-111222-8', client: 'Shipping Solutions Inc', priority: 'high', clientCode: 'SHIP001' },
      { id: 'RO-2025-005', container: 'SHIP-333444-9', client: 'Shipping Solutions Inc', priority: 'medium', clientCode: 'SHIP001' }
    ];

    const clientFilter = getClientFilter();
    if (clientFilter) {
      return allOrders.filter(order => order.clientCode === clientFilter);
    }
    
    return allOrders.slice(0, 4); // Show top 4 for non-client users
  };

  const pendingOrders = getPendingReleaseOrders();

  return (
    <div className="space-y-6">
      {/* Client Notice */}
      {showClientNotice && (
        <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-blue-600 mr-3" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Welcome to your client portal, <strong>{user?.name}</strong>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              You are viewing data for <strong>{user?.company}</strong> only. Contact the depot for assistance.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {showClientNotice ? 'Your Recent Container Movements' : 'Recent Container Movements'}
            </h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {recentActivities.map((movement, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">{movement.container}</p>
                  <p className="text-sm text-gray-600">{movement.action}</p>
                  {!canViewAllData() && movement.clientCode && (
                    <p className="text-xs text-blue-600">{movement.clientCode}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">{movement.time}</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    movement.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {movement.status === 'completed' ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No recent activities found</p>
                <p className="text-sm">Your container movements will appear here</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {showClientNotice ? 'Your Release Orders' : 'Pending Release Orders'}
            </h3>
            <FileCheck className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {pendingOrders.map((order, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">{order.id}</p>
                  <p className="text-sm text-gray-600">
                    {order.container} {canViewAllData() && `- ${order.client}`}
                  </p>
                  {!canViewAllData() && order.clientCode && (
                    <p className="text-xs text-blue-600">{order.clientCode}</p>
                  )}
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  order.priority === 'high' 
                    ? 'bg-red-100 text-red-800' 
                    : order.priority === 'medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
                </span>
              </div>
            ))}
            {pendingOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FileCheck className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No pending release orders</p>
                <p className="text-sm">Your release orders will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};