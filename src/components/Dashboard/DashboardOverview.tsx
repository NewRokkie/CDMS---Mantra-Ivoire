import React, { useState, useMemo } from 'react';
import { Container, FileCheck, TrendingUp, Building, DollarSign, Activity, BarChart3, AlertTriangle, Package, Wrench, CheckCircle, XCircle, Eye, MapPin, Calendar, User, X, Filter, Globe, Layers } from 'lucide-react';
import { StatCard } from './StatCard';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { yardService } from '../../services/yardService';
import { DashboardStats } from '../../types';

// Enhanced mock container data for dashboard analytics
const mockContainerData = [
  { id: '1', number: 'MSKU-123456-7', type: 'dry', size: '40ft', status: 'in_depot', location: 'Stack S1-Row 1-Tier 1', client: 'Maersk Line', clientCode: 'MAEU', gateInDate: new Date('2025-01-10T08:30:00'), isDamaged: false },
  { id: '2', number: 'TCLU-987654-3', type: 'reefer', size: '20ft', status: 'out_depot', location: 'Gate 2', client: 'MSC Mediterranean Shipping', clientCode: 'MSCU', gateInDate: new Date('2025-01-09T14:15:00'), isDamaged: false },
  { id: '3', number: 'GESU-456789-1', type: 'dry', size: '40ft', status: 'in_service', location: 'Workshop 1', client: 'CMA CGM', clientCode: 'CMDU', gateInDate: new Date('2025-01-08T16:45:00'), isDamaged: true },
  { id: '4', number: 'SHIP-111222-8', type: 'dry', size: '20ft', status: 'in_depot', location: 'Stack S33-Row 3-Tier 1', client: 'Shipping Solutions Inc', clientCode: 'SHIP001', gateInDate: new Date('2025-01-11T09:15:00'), isDamaged: false },
  { id: '5', number: 'SHIP-333444-9', type: 'reefer', size: '40ft', status: 'maintenance', location: 'Workshop 2', client: 'Shipping Solutions Inc', clientCode: 'SHIP001', gateInDate: new Date('2025-01-07T13:20:00'), isDamaged: true },
  { id: '6', number: 'MAEU-555666-4', type: 'reefer', size: '40ft', status: 'in_depot', location: 'Stack S61-Row 2-Tier 3', client: 'Maersk Line', clientCode: 'MAEU', gateInDate: new Date('2025-01-07T11:20:00'), isDamaged: false },
  { id: '7', number: 'CMDU-789012-5', type: 'dry', size: '40ft', status: 'out_depot', location: 'Gate 1', client: 'CMA CGM', clientCode: 'CMDU', gateInDate: new Date('2025-01-06T13:30:00'), isDamaged: false },
  { id: '8', number: 'HLCU-345678-9', type: 'dry', size: '20ft', status: 'in_depot', location: 'Stack S101-Row 1-Tier 1', client: 'Hapag-Lloyd', clientCode: 'HLCU', gateInDate: new Date('2025-01-05T15:45:00'), isDamaged: false },
  { id: '9', number: 'SNFW-294074-0', type: 'reefer', size: '40ft', status: 'in_depot', location: 'Stack S67-Row 3-Tier 2', client: 'Shipping Network', clientCode: 'SNFW', gateInDate: new Date('2025-01-04T10:15:00'), isDamaged: false },
  { id: '10', number: 'MAEU-777888-1', type: 'tank', size: '20ft', status: 'cleaning', location: 'Cleaning Bay 1', client: 'Maersk Line', clientCode: 'MAEU', gateInDate: new Date('2025-01-03T09:00:00'), isDamaged: true },
  { id: '11', number: 'MSCU-999000-2', type: 'flat_rack', size: '40ft', status: 'in_depot', location: 'Stack S65-Row 1-Tier 1', client: 'MSC Mediterranean Shipping', clientCode: 'MSCU', gateInDate: new Date('2025-01-02T14:30:00'), isDamaged: false },
  { id: '12', number: 'CMDU-111333-5', type: 'open_top', size: '20ft', status: 'in_depot', location: 'Stack S35-Row 2-Tier 1', client: 'CMA CGM', clientCode: 'CMDU', gateInDate: new Date('2025-01-01T16:00:00'), isDamaged: false },
  { id: '13', number: 'SHIP-444555-6', type: 'dry', size: '20ft', status: 'in_depot', location: 'Stack S17-Row 1-Tier 2', client: 'Shipping Solutions Inc', clientCode: 'SHIP001', gateInDate: new Date('2024-12-30T11:45:00'), isDamaged: false },
  { id: '14', number: 'HLCU-666777-8', type: 'reefer', size: '40ft', status: 'maintenance', location: 'Workshop 3', client: 'Hapag-Lloyd', clientCode: 'HLCU', gateInDate: new Date('2024-12-29T08:20:00'), isDamaged: true },
  { id: '15', number: 'MAEU-888999-0', type: 'dry', size: '20ft', status: 'in_depot', location: 'Stack S3-Row 4-Tier 1', client: 'Maersk Line', clientCode: 'MAEU', gateInDate: new Date('2024-12-28T13:15:00'), isDamaged: false }
];

type FilterType = 'customer' | 'yard' | 'type' | 'damage' | null;

interface FilteredData {
  containers: typeof mockContainerData;
  title: string;
  description: string;
}

export const DashboardOverview: React.FC = () => {
  const { t } = useLanguage();
  const { user, canViewAllData, getClientFilter } = useAuth();
  const { currentYard, availableYards } = useYard();
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'current' | 'global'>('current');
  const [selectedDepot, setSelectedDepot] = useState<string | null>(null);

  const clientFilter = getClientFilter();
  const showClientNotice = !canViewAllData() && user?.role === 'client';
  const isManager = user?.role === 'admin' || user?.role === 'supervisor';

  // Filter containers based on user permissions
  const getFilteredContainers = () => {
    let containers = mockContainerData;
    
    if (clientFilter) {
      containers = containers.filter(container => 
        container.clientCode === clientFilter || 
        container.client === user?.company
      );
    }
    
    return containers;
  };

  const filteredContainers = getFilteredContainers();

  // Get multi-depot data for managers
  const getMultiDepotData = () => {
    if (!isManager) return null;

    const allDepots = availableYards;
    const globalStats = {
      totalDepots: allDepots.length,
      activeDepots: allDepots.filter(d => d.isActive).length,
      totalCapacity: allDepots.reduce((sum, d) => sum + d.totalCapacity, 0),
      totalOccupancy: allDepots.reduce((sum, d) => sum + d.currentOccupancy, 0),
      averageUtilization: 0
    };
    globalStats.averageUtilization = globalStats.totalCapacity > 0 
      ? (globalStats.totalOccupancy / globalStats.totalCapacity) * 100 
      : 0;

    const depotPerformance = allDepots.map(depot => {
      const utilizationRate = (depot.currentOccupancy / depot.totalCapacity) * 100;
      const depotContainers = mockContainerData.filter(c => 
        yardService.isContainerInYard ? yardService.isContainerInYard(c, depot.id) : false
      );
      
      return {
        id: depot.id,
        name: depot.name,
        code: depot.code,
        location: depot.location,
        capacity: depot.totalCapacity,
        occupancy: depot.currentOccupancy,
        utilizationRate,
        containers: depotContainers.length,
        inDepot: depotContainers.filter(c => c.status === 'in_depot').length,
        damaged: depotContainers.filter(c => c.isDamaged).length,
        revenue: Math.floor(Math.random() * 50000) + 80000, // Mock revenue
        efficiency: Math.floor(Math.random() * 20) + 80,
        status: depot.isActive ? 'active' : 'inactive'
      };
    });

    return { globalStats, depotPerformance };
  };

  const multiDepotData = getMultiDepotData();

  // Calculate statistics
  const stats = useMemo(() => {
    // Total per customer
    const customerStats = filteredContainers.reduce((acc, container) => {
      const key = container.clientCode || container.client;
      if (!acc[key]) {
        acc[key] = { count: 0, name: container.client, code: container.clientCode };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, { count: number; name: string; code: string }>);

    // Total quantity in yard (in_depot status)
    const inYardContainers = filteredContainers.filter(c => c.status === 'in_depot');

    // Total by type per customer
    const typeByCustomer = filteredContainers.reduce((acc, container) => {
      const customerKey = container.clientCode || container.client;
      if (!acc[customerKey]) {
        acc[customerKey] = { dry: 0, reefer: 0, tank: 0, flat_rack: 0, open_top: 0, clientName: container.client };
      }
      acc[customerKey][container.type]++;
      return acc;
    }, {} as Record<string, Record<string, any>>);

    // Total by damaged or not
    const damagedStats = {
      damaged: filteredContainers.filter(c => c.isDamaged).length,
      undamaged: filteredContainers.filter(c => !c.isDamaged).length
    };

    return {
      customerStats,
      inYardContainers,
      typeByCustomer,
      damagedStats,
      totalContainers: filteredContainers.length
    };
  }, [filteredContainers]);

  // Get filtered data based on active filter
  const getFilteredData = (): FilteredData | null => {
    if (!activeFilter) return null;

    switch (activeFilter) {
      case 'customer':
        if (selectedCustomer) {
          const containers = filteredContainers.filter(c => 
            (c.clientCode || c.client) === selectedCustomer
          );
          const customerInfo = stats.customerStats[selectedCustomer];
          return {
            containers,
            title: `${customerInfo?.name || selectedCustomer} Containers`,
            description: `All containers for ${customerInfo?.name || selectedCustomer}`
          };
        }
        return {
          containers: filteredContainers,
          title: 'All Customers',
          description: 'Container distribution across all customers'
        };

      case 'yard':
        return {
          containers: stats.inYardContainers,
          title: 'Containers in Yard',
          description: 'All containers currently stored in the depot yard'
        };

      case 'type':
        if (selectedType) {
          const containers = filteredContainers.filter(c => c.type === selectedType);
          return {
            containers,
            title: `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Containers`,
            description: `All ${selectedType} type containers`
          };
        }
        return {
          containers: filteredContainers,
          title: 'All Container Types',
          description: 'Container distribution by type'
        };

      case 'damage':
        return {
          containers: filteredContainers,
          title: 'Damage Status Overview',
          description: 'Container condition and damage reports'
        };

      default:
        return null;
    }
  };

  const handleStatCardClick = (filterType: FilterType, additionalData?: any) => {
    if (activeFilter === filterType) {
      // If clicking the same filter, close it
      setActiveFilter(null);
      setSelectedCustomer(null);
      setSelectedType(null);
    } else {
      setActiveFilter(filterType);
      if (filterType === 'customer' && additionalData) {
        setSelectedCustomer(additionalData);
      } else if (filterType === 'type' && additionalData) {
        setSelectedType(additionalData);
      } else {
        setSelectedCustomer(null);
        setSelectedType(null);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      in_depot: { color: 'bg-green-100 text-green-800', label: 'In Depot' },
      out_depot: { color: 'bg-blue-100 text-blue-800', label: 'Out Depot' },
      in_service: { color: 'bg-yellow-100 text-yellow-800', label: 'In Service' },
      maintenance: { color: 'bg-red-100 text-red-800', label: 'Maintenance' },
      cleaning: { color: 'bg-purple-100 text-purple-800', label: 'Cleaning' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reefer': return '❄️';
      case 'tank': return '🛢️';
      case 'flat_rack': return '📦';
      case 'open_top': return '📂';
      default: return '📦';
    }
  };

  const filteredData = getFilteredData();

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

      {/* Global Stats for Managers */}
      {isManager && viewMode === 'global' && multiDepotData && !selectedDepot && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Global Performance Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Depots</p>
                  <p className="text-2xl font-bold text-gray-900">{multiDepotData.globalStats.totalDepots}</p>
                  <div className="text-sm text-blue-600 mt-1">
                    {multiDepotData.globalStats.activeDepots} active
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Global Capacity</p>
                  <p className="text-2xl font-bold text-gray-900">{multiDepotData.globalStats.totalCapacity.toLocaleString()}</p>
                  <div className="text-sm text-green-600 mt-1">containers</div>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Global Occupancy</p>
                  <p className="text-2xl font-bold text-gray-900">{multiDepotData.globalStats.totalOccupancy.toLocaleString()}</p>
                  <div className="text-sm text-purple-600 mt-1">containers</div>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Container className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Utilization</p>
                  <p className="text-2xl font-bold text-gray-900">{multiDepotData.globalStats.averageUtilization.toFixed(1)}%</p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-600 font-medium">+5.2%</span>
                  </div>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Depot Performance Comparison for Managers */}
      {isManager && viewMode === 'global' && multiDepotData && !selectedDepot && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Depot Performance Comparison</h3>
            <p className="text-sm text-gray-600">Individual depot metrics and performance indicators</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depot</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Containers</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {multiDepotData.depotPerformance.map((depot) => (
                  <tr key={depot.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{depot.name}</div>
                          <div className="text-sm text-gray-500">{depot.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{depot.occupancy.toLocaleString()} / {depot.capacity.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">containers</div>
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
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full ${
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
                      <div className="text-sm text-gray-900">{depot.containers}</div>
                      <div className="text-sm text-gray-500">{depot.inDepot} in depot</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(depot.revenue)}</div>
                      <div className="text-sm text-gray-500">monthly</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        depot.efficiency >= 95 ? 'bg-green-100 text-green-800' :
                        depot.efficiency >= 85 ? 'bg-blue-100 text-blue-800' :
                        depot.efficiency >= 75 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {depot.efficiency}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        depot.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {depot.status}
                      </span>
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
      )}

      {/* Individual Depot View for Managers */}
      {isManager && viewMode === 'global' && selectedDepot && multiDepotData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Building className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-blue-900">
                  Viewing: {multiDepotData.depotPerformance.find(d => d.id === selectedDepot)?.name}
                </h3>
                <p className="text-sm text-blue-700">Individual depot performance metrics</p>
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

      {/* Client Notice */}
      {showClientNotice && (
        <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-blue-600 mr-3" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              Welcome to your client portal, <strong>{user?.name}</strong>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              You are viewing data for <strong>{user?.company}</strong> only
              {currentYard && (
                <span className="ml-1">in <strong>{currentYard.name}</strong></span>
              )}. Contact the depot for assistance.
            </p>
          </div>
        </div>
      )}

      {/* Filter Close Button */}
      {activeFilter && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 text-white rounded-lg">
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-blue-900">Active Filter</h3>
              <p className="text-sm text-blue-700">{filteredData?.title}</p>
            </div>
          </div>
          <button
            onClick={() => handleStatCardClick(null)}
            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Stats Grid - Total Per Customer */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Per Customer</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(stats.customerStats).map(([customerKey, data]) => (
            <div
              key={customerKey}
              onClick={() => handleStatCardClick('customer', customerKey)}
              className={`bg-white rounded-xl p-6 border cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                activeFilter === 'customer' && selectedCustomer === customerKey
                  ? 'border-blue-500 bg-blue-50 shadow-lg'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {canViewAllData() ? data.name : 'Your Containers'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{data.count}</p>
                  <div className="text-sm text-blue-600 mt-1">{data.code}</div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Quantity in Yard */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Quantity in Yard</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => handleStatCardClick('yard')}
            className={`bg-white rounded-xl p-6 border cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
              activeFilter === 'yard'
                ? 'border-green-500 bg-green-50 shadow-lg'
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Containers in Yard</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inYardContainers.length}</p>
                <div className="text-sm text-green-600 mt-1">Currently stored</div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Capacity</p>
                <p className="text-2xl font-bold text-gray-900">2,500</p>
                <div className="text-sm text-gray-600 mt-1">Maximum capacity</div>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {((stats.inYardContainers.length / 2500) * 100).toFixed(1)}%
                </p>
                <div className="text-sm text-purple-600 mt-1">Current utilization</div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Total by Type */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Total by Container Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {['dry', 'reefer', 'tank', 'flat_rack', 'open_top'].map(type => {
            const count = filteredContainers.filter(c => c.type === type).length;
            return (
              <div
                key={type}
                onClick={() => handleStatCardClick('type', type)}
                className={`bg-white rounded-xl p-6 border cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                  activeFilter === 'type' && selectedType === type
                    ? 'border-orange-500 bg-orange-50 shadow-lg'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{getTypeIcon(type)}</div>
                  <p className="text-sm font-medium text-gray-600 capitalize">
                    {type.replace('_', ' ')}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total by Damage Status */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Total by Damage Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => handleStatCardClick('damage')}
            className={`bg-white rounded-xl p-6 border cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
              activeFilter === 'damage'
                ? 'border-red-500 bg-red-50 shadow-lg'
                : 'border-gray-200 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Damaged Containers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.damagedStats.damaged}</p>
                <div className="text-sm text-red-600 mt-1">Require attention</div>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <Wrench className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div
            onClick={() => handleStatCardClick('damage')}
            className={`bg-white rounded-xl p-6 border cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
              activeFilter === 'damage'
                ? 'border-green-500 bg-green-50 shadow-lg'
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Undamaged Containers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.damagedStats.undamaged}</p>
                <div className="text-sm text-green-600 mt-1">Good condition</div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtered Data Table */}
      {filteredData && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-slide-in-up">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{filteredData.title}</h3>
                <p className="text-sm text-gray-600">{filteredData.description}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  {filteredData.containers.length} containers
                </span>
                <button
                  onClick={() => handleStatCardClick(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Container
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  {canViewAllData() && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gate In Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condition
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.containers.map((container) => (
                  <tr key={container.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{getTypeIcon(container.type)}</div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{container.number}</div>
                          <div className="text-xs text-gray-500">ID: {container.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">
                        {container.type.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-500">{container.size}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(container.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{container.location}</span>
                      </div>
                    </td>
                    {canViewAllData() && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{container.client}</div>
                          <div className="text-xs text-gray-500">{container.clientCode}</div>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {container.gateInDate.toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {container.gateInDate.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {container.isDamaged ? (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-red-600 font-medium">Damaged</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600 font-medium">Good</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.containers.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No containers found</h3>
              <p className="text-gray-600">No containers match the selected filter criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* Type by Customer Breakdown (when customer filter is active) */}
      {activeFilter === 'customer' && selectedCustomer && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Container Types for {stats.customerStats[selectedCustomer]?.name}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(stats.typeByCustomer[selectedCustomer] || {}).map(([type, count]) => {
              if (type === 'clientName') return null;
              return (
                <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl mb-2">{getTypeIcon(type)}</div>
                  <div className="text-sm font-medium text-gray-600 capitalize">
                    {type.replace('_', ' ')}
                  </div>
                  <div className="text-lg font-bold text-gray-900">{count as number}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Damage Analysis (when damage filter is active) */}
      {activeFilter === 'damage' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Damage Analysis by Customer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.customerStats).map(([customerKey, customerData]) => {
              const customerContainers = filteredContainers.filter(c => 
                (c.clientCode || c.client) === customerKey
              );
              const damaged = customerContainers.filter(c => c.isDamaged).length;
              const undamaged = customerContainers.filter(c => !c.isDamaged).length;
              const damageRate = customerContainers.length > 0 ? (damaged / customerContainers.length) * 100 : 0;

              return (
                <div key={customerKey} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium text-gray-900">{customerData.name}</div>
                      <div className="text-sm text-gray-500">{customerData.code}</div>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${
                      damageRate > 20 ? 'bg-red-100 text-red-800' :
                      damageRate > 10 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {damageRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-red-600">Damaged:</span>
                      <span className="font-medium">{damaged}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-600">Good:</span>
                      <span className="font-medium">{undamaged}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">{customerContainers.length}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};