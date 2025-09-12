import React, { useState, useMemo, useCallback } from 'react';
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
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { yardService } from '../../services/yardService';
import { DatePicker } from '../Common/DatePicker';
import { AnalyticsTab } from './AnalyticsTab';
import { OperationsTab } from './OperationsTab';

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

// Mock container billing data
const generateMockBillingData = (): ContainerBilling[] => {
  const containers = [
    { number: 'MSKU-123456-7', clientCode: 'MAEU', placedDaysAgo: 5, outDaysAgo: null, location: 'Block A-12' },
    { number: 'TCLU-987654-3', clientCode: 'MSCU', placedDaysAgo: 8, outDaysAgo: 1, location: 'Gate 2' },
    { number: 'GESU-456789-1', clientCode: 'CMDU', placedDaysAgo: 12, outDaysAgo: null, location: 'Workshop 1' },
    { number: 'SHIP-111222-8', clientCode: 'SHIP001', placedDaysAgo: 3, outDaysAgo: null, location: 'Block B-05' },
    { number: 'SHIP-333444-9', clientCode: 'SHIP001', placedDaysAgo: 15, outDaysAgo: 2, location: 'Workshop 2' },
    { number: 'MAEU-555666-4', clientCode: 'MAEU', placedDaysAgo: 7, outDaysAgo: null, location: 'Block A-08' },
    { number: 'CMDU-789012-5', clientCode: 'CMDU', placedDaysAgo: 20, outDaysAgo: 5, location: 'Block C-03' },
    { number: 'HLCU-345678-9', clientCode: 'HLCU', placedDaysAgo: 6, outDaysAgo: null, location: 'Block D-01' }
  ];

  return containers.map((container, index) => {
    const clientConfig = mockClientFreeDays.find(c => c.clientCode === container.clientCode);
    if (!clientConfig) return null;

    const now = new Date();
    const placedDate = new Date(now.getTime() - (container.placedDaysAgo * 24 * 60 * 60 * 1000));
    const outDate = container.outDaysAgo ? new Date(now.getTime() - (container.outDaysAgo * 24 * 60 * 60 * 1000)) : undefined;

    const totalDays = outDate 
      ? Math.ceil((outDate.getTime() - placedDate.getTime()) / (1000 * 60 * 60 * 24))
      : Math.ceil((now.getTime() - placedDate.getTime()) / (1000 * 60 * 60 * 24));

    const freeDaysUsed = Math.min(totalDays, clientConfig.freeDaysAllowed);
    const billableDays = Math.max(0, totalDays - clientConfig.freeDaysAllowed);
    const totalAmount = billableDays * clientConfig.dailyRate;

    return {
      id: `billing-${index + 1}`,
      containerNumber: container.number,
      clientCode: container.clientCode,
      clientName: clientConfig.clientName,
      placedDate,
      outDate,
      totalDays,
      freeDaysUsed,
      billableDays,
      dailyRate: clientConfig.dailyRate,
      totalAmount,
      status: outDate ? 'completed' : 'active',
      location: container.location
    } as ContainerBilling;
  }).filter(Boolean) as ContainerBilling[];
};

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
  
  const { user, canViewAllData, getClientFilter } = useAuth();
  const { currentYard } = useYard();

  const billingData = useMemo(() => generateMockBillingData(), []);

  const isManager = user?.role === 'admin' || user?.role === 'supervisor';

  // Mock available yards for managers
  const availableYards = [
    { id: 'depot-tantarelli', name: 'Tantarelli Depot', code: 'TAN', currentOccupancy: 850, totalCapacity: 1200 },
    { id: 'depot-vridi', name: 'Vridi Terminal', code: 'VRI', currentOccupancy: 650, totalCapacity: 900 },
    { id: 'depot-san-pedro', name: 'San Pedro Port', code: 'SPP', currentOccupancy: 420, totalCapacity: 800 }
  ];

  // Get multi-depot billing data for managers
  const getMultiDepotBillingData = useCallback(() => {
    if (!isManager) return billingData;

    if (selectedDepot) {
      // Filter data for specific depot
      return billingData.filter(item => {
        // In a real implementation, you'd check which depot the container belongs to
        // For now, we'll use a simple distribution logic
        const depot = availableYards.find(d => d.id === selectedDepot);
        if (!depot) return false;
        
        // Distribute containers across depots based on client codes
        if (selectedDepot === 'depot-tantarelli') {
          return ['MAEU', 'MSCU', 'CMDU'].includes(item.clientCode);
        } else if (selectedDepot === 'depot-vridi') {
          return ['SHIP001', 'HLCU'].includes(item.clientCode);
        } else if (selectedDepot === 'depot-san-pedro') {
          return ['MAEU', 'CMDU'].includes(item.clientCode);
        }
        return true;
      });
    }

    // Return all data for global view
    return billingData;
  }, [isManager, selectedDepot, billingData, availableYards]);

  // Get global billing statistics
  const getGlobalBillingStats = useCallback(() => {
    if (!isManager) return null;

    const depotStats = availableYards.map(depot => {
      const depotBilling = getMultiDepotBillingData().filter(item => {
        // Same distribution logic as above
        if (depot.id === 'depot-tantarelli') {
          return ['MAEU', 'MSCU', 'CMDU'].includes(item.clientCode);
        } else if (depot.id === 'depot-vridi') {
          return ['SHIP001', 'HLCU'].includes(item.clientCode);
        } else if (depot.id === 'depot-san-pedro') {
          return ['MAEU', 'CMDU'].includes(item.clientCode);
        }
        return false;
      });

      const revenue = depotBilling.reduce((sum, item) => sum + item.totalAmount, 0);
      const activeContainers = depotBilling.filter(item => item.status === 'active').length;
      const billableDays = depotBilling.reduce((sum, item) => sum + item.billableDays, 0);

      return {
        id: depot.id,
        name: depot.name,
        code: depot.code,
        revenue,
        activeContainers,
        completedContainers: depotBilling.filter(item => item.status === 'completed').length,
        billableDays,
        averageDays: depotBilling.length > 0 
          ? depotBilling.reduce((sum, item) => sum + item.totalDays, 0) / depotBilling.length 
          : 0,
        utilizationRate: (depot.currentOccupancy / depot.totalCapacity) * 100
      };
    });

    const globalTotals = {
      totalRevenue: depotStats.reduce((sum, d) => sum + d.revenue, 0),
      totalActiveContainers: depotStats.reduce((sum, d) => sum + d.activeContainers, 0),
      totalCompletedContainers: depotStats.reduce((sum, d) => sum + d.completedContainers, 0),
      totalBillableDays: depotStats.reduce((sum, d) => sum + d.billableDays, 0),
      averageUtilization: depotStats.length > 0 
        ? depotStats.reduce((sum, d) => sum + d.utilizationRate, 0) / depotStats.length 
        : 0
    };

    return { depotStats, globalTotals };
  }, [isManager, availableYards, getMultiDepotBillingData]);

  // Filter data based on user permissions
  const getFilteredBillingData = useCallback(() => {
    let data = isManager && viewMode === 'global' ? getMultiDepotBillingData() : billingData;
    
    // Apply client filter for client users
    const clientFilterValue = getClientFilter();
    if (clientFilterValue) {
      data = data.filter(item => item.clientCode === clientFilterValue);
    }
    
    // Apply search filter
    if (searchTerm) {
      data = data.filter(item =>
        item.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clientCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply client filter
    if (clientFilter !== 'all') {
      data = data.filter(item => item.clientCode === clientFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      data = data.filter(item => item.status === statusFilter);
    }
    
    return data;
  }, [isManager, viewMode, getMultiDepotBillingData, billingData, getClientFilter, searchTerm, clientFilter, statusFilter]);

  const filteredData = getFilteredBillingData();
  const globalBillingStats = getGlobalBillingStats();

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  const handleViewDetails = (container: ContainerBilling) => {
    setSelectedContainer(container);
    setShowDetailModal(true);
  };

  const canAccessReports = user?.role === 'admin' || user?.role === 'supervisor';
  const showClientNotice = !canViewAllData() && user?.role === 'client';

  if (!canAccessReports) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to access reports.</p>
      </div>
    );
  }

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
        <div className="flex space-x-1">
          {[
            { id: 'billing', label: 'Billing & Free Days', icon: DollarSign },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'operations', label: 'Operations', icon: Package }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
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
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depot</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Containers</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billable Days</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Days</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                                <div className={`text-sm font-medium ${
                                  depot.utilizationRate >= 90 ? 'text-red-600' :
                                  depot.utilizationRate >= 75 ? 'text-orange-600' :
                                  depot.utilizationRate >= 25 ? 'text-green-600' : 'text-blue-600'
                                }`}>
                                  {depot.utilizationRate.toFixed(1)}%
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      depot.utilizationRate >= 90 ? 'bg-red-500' :
                                      depot.utilizationRate >= 75 ? 'bg-orange-500' :
                                      depot.utilizationRate >= 25 ? 'bg-green-500' : 'bg-blue-500'
                                    }`}
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
                              <CheckCircle className="h-4 w-4 text-green-600" title="Free days fully used" />
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
};

// Billing Detail Modal Component
const BillingDetailModal: React.FC<{
  container: ContainerBilling;
  clientConfig?: ClientFreeDays;
  onClose: () => void;
  canViewAllData: boolean;
}> = ({ container, clientConfig, onClose, canViewAllData }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
};