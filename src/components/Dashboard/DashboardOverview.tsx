import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  Tooltip as RechartsTooltip
} from 'recharts';
import {
  Building,
  AlertTriangle,
  Package,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  User,
  X,
  Filter,
  Globe,
  Layers,
  RefreshCw,
  DownloadCloud,
  Download,
} from 'lucide-react';
import { exportToExcel, formatDateShortForExport, formatTimeForExport } from '../../utils/excelExport';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { reportService, containerService, stackService } from '../../services/api';
import type { ContainerStats, GateStats } from '../../services/api/reportService';
import { handleError } from '../../services/errorHandling';
import { StackCapacityCalculator } from '../../utils/stackCapacityCalculator';

type FilterType = 'customer' | 'yard' | 'type' | 'damage' | 'classification' | null;

interface FilteredData {
  containers: any[];
  title: string;
  description: string;
}

/* ---------- small UI helpers ---------- */
const Spinner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-spin rounded-full border-2 border-t-transparent border-gray-400 ${className}`} />
);

const SkeletonRow: React.FC = () => (
  <div className="animate-pulse flex items-center gap-4 py-3 px-4 border-b border-gray-100">
    <div className="w-12 h-12 bg-gray-200 rounded-md" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
    <div className="w-16 h-4 bg-gray-200 rounded" />
  </div>
);

export const DashboardOverview: React.FC = () => {
  const { t } = useLanguage();
  const { user, canViewAllData, getClientFilter } = useAuth();
  const { currentYard, availableYards } = useYard();

  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'current' | 'global'>('current');
  const [selectedDepot, setSelectedDepot] = useState<string | null>(null);

  // Remove selectedDepot logic since we don't need it anymore
  // The table will always show all depots


  const [allContainers, setAllContainers] = useState<any[]>([]);
  const [allContainersForMultiDepot, setAllContainersForMultiDepot] = useState<any[]>([]);
  const [containerStats, setContainerStats] = useState<ContainerStats | null>(null);
  const [gateStats, setGateStats] = useState<GateStats | null>(null);
  const [loading, setLoading] = useState(true);

  // export / refresh UI states
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // loadDashboardData extracted so we can re-use for refresh button
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Récupérer les conteneurs selon le mode
      let allContainersData;
      if (viewMode === 'global') {
        allContainersData = await containerService.getAll();
      } else {
        allContainersData = await containerService.getByYardId(currentYard?.id || '');
      }

      // Pour multiDepotData, on a besoin de tous les conteneurs
      const allContainersForMultiDepot = await containerService.getAll();

      // Les conteneurs sont déjà filtrés par l'API selon le yard
      const filteredContainers = allContainersData;

      // Utiliser l'API pour les statistiques, avec yard_id pour current depot
      let containerStats;
      let gateStats;

      if (viewMode === 'global') {
        [containerStats, gateStats] = await Promise.all([
          reportService.getContainerStats(undefined),
          reportService.getGateStats(undefined)
        ]);
      } else {
        [containerStats, gateStats] = await Promise.all([
          reportService.getContainerStats(currentYard?.id),
          reportService.getGateStats(currentYard?.id)
        ]);
      }

      setAllContainers(filteredContainers);
      setAllContainersForMultiDepot(allContainersForMultiDepot);
      setContainerStats(containerStats);
      setGateStats(gateStats);
    } catch (error) {
      handleError(error, 'DashboardOverview.loadDashboardData');
    } finally {
      setLoading(false);
    }
  }, [currentYard?.id, viewMode]);

  useEffect(() => {
    loadDashboardData();
  }, [currentYard?.id, viewMode]); // Use the same dependencies as loadDashboardData instead of the function itself

  const clientFilter = getClientFilter();
  const showClientNotice = !canViewAllData() && user?.role === 'client';
  const isManager = user?.role === 'supervisor';
  const isAdmin = user?.role === 'admin';

  // Filter containers based on user permissions
  const getFilteredContainers = useCallback(() => {
    // Les conteneurs sont déjà filtrés par yard dans loadDashboardData
    let containers = allContainers;

    // Filtrage supplémentaire par client si nécessaire
    if (clientFilter) {
      containers = containers.filter(container =>
        container.clientCode === clientFilter ||
        container.clientName === user?.company
      );
    }

    return containers;
  }, [allContainers, clientFilter, user?.company]);

  const filteredContainers = useMemo(() => getFilteredContainers(), [getFilteredContainers]);

  // Colors for pie chart
  const pieColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#60A5FA'];

  // Get multi-depot data for managers
  const getMultiDepotData = useCallback(async (allContainersForMultiDepot: any[]) => {
    const allDepots = availableYards;
    
    // Calculate effective capacity for each depot using StackCapacityCalculator
    const depotCapacities = new Map<string, number>();
    
    for (const depot of allDepots) {
      try {
        const stacks = await stackService.getByYardId(depot.id);
        const effectiveCapacity = StackCapacityCalculator.calculateTotalEffectiveCapacity(stacks);
        depotCapacities.set(depot.id, effectiveCapacity);
      } catch (error) {
        console.warn(`Failed to calculate capacity for depot ${depot.code}:`, error);
        depotCapacities.set(depot.id, depot.totalCapacity); // Fallback to stored capacity
      }
    }

    const globalStats = {
      totalDepots: allDepots.length,
      activeDepots: allDepots.filter(d => d.isActive).length,
      totalCapacity: Array.from(depotCapacities.values()).reduce((sum, capacity) => sum + capacity, 0),
      totalOccupancy: allDepots.reduce((sum, d) => sum + d.currentOccupancy, 0),
      averageUtilization: 0
    };
    globalStats.averageUtilization = globalStats.totalCapacity > 0
      ? (globalStats.totalOccupancy / globalStats.totalCapacity) * 100
      : 0;

    const depotPerformance = allDepots.map(depot => {
      const depotContainers = allContainersForMultiDepot.filter(c =>
        c.yardId === depot.id
      );
      const inDepotContainers = depotContainers.filter(c => c.status === 'in_depot').length;
      const effectiveCapacity = depotCapacities.get(depot.id) || depot.totalCapacity;
      const utilizationRate = effectiveCapacity > 0 ? (inDepotContainers / effectiveCapacity) * 100 : 0;

      return {
        id: depot.id,
        name: depot.name,
        code: depot.code,
        location: depot.location,
        capacity: effectiveCapacity, // Use effective capacity instead of depot.totalCapacity
        occupancy: inDepotContainers,
        utilizationRate,
        containers: depotContainers.length,
        inDepot: inDepotContainers,
        damaged: depotContainers.filter(c => c.damage && c.damage.length > 0).length,
        revenue: Math.floor(Math.random() * 50000) + 80000, // Mock revenue (UI demo)
        efficiency: depotContainers.length > 0 ? Math.floor((depotContainers.filter(c => !c.damage || c.damage.length === 0).length / depotContainers.length) * 100) : 100,
        status: depot.isActive ? 'active' : 'inactive'
      };
    });

    return { globalStats, depotPerformance };
  }, [availableYards]);

  const [multiDepotData, setMultiDepotData] = useState<{ globalStats: any; depotPerformance: any[] } | null>(null);

  // Calculate multi-depot data when availableYards or allContainersForMultiDepot changes
  useEffect(() => {
    if (availableYards.length > 0 && allContainersForMultiDepot.length >= 0) {
      getMultiDepotData(allContainersForMultiDepot).then(setMultiDepotData);
    }
  }, [getMultiDepotData, availableYards, allContainersForMultiDepot]);

  // Calculate statistics (memoized for performance)
  const stats = useMemo(() => {
    // Total per customer
    const customerStats = filteredContainers.reduce((acc, container) => {
      const key = container.clientCode || container.clientName;
      if (!acc[key]) {
        // Get client name from joined data if available, otherwise use client field
        const clientName = container.clientName && container.clientName !== container.clientCode ? container.clientName : container.clientCode;
        acc[key] = {
          count: 0,
          name: clientName,
          code: container.clientCode || container.clientName
        };
      }
      acc[key].count++;
      return acc;
    }, {} as Record<string, { count: number; name: string; code: string }>);

    // Total quantity in yard (in_depot status)
    const inYardContainers = filteredContainers.filter(c => c.status === 'in_depot');

    // Total by type per customer
    const typeByCustomer = filteredContainers.reduce((acc, container) => {
      const customerKey = container.clientCode || container.clientName;
      if (!acc[customerKey]) {
        acc[customerKey] = { standard: 0, reefer: 0, tank: 0, flat_rack: 0, open_top: 0, clientName: container.clientName };
      }
      acc[customerKey][container.type] = (acc[customerKey][container.type] || 0) + 1;
      return acc;
    }, {} as Record<string, Record<string, any>>);

    // Total by damaged or not
    const damagedStats = {
      damaged: filteredContainers.filter(c => c.damage && c.damage.length > 0).length,
      undamaged: filteredContainers.filter(c => !c.damage || c.damage.length === 0).length
    };

    // Classification stats (Divers or Alimentaire)
    const classificationStats = {
      divers: filteredContainers.filter(c => c.classification === 'divers' || !c.classification).length,
      alimentaire: filteredContainers.filter(c => c.classification === 'alimentaire').length
    };

    return {
      customerStats,
      inYardContainers,
      typeByCustomer,
      damagedStats,
      classificationStats,
      totalContainers: filteredContainers.length
    } as {
      customerStats: Record<string, { count: number; name: string; code: string }>;
      inYardContainers: any[];
      typeByCustomer: Record<string, Record<string, any>>;
      damagedStats: { damaged: number; undamaged: number };
      classificationStats: { divers: number; alimentaire: number };
      totalContainers: number;
    };
  }, [filteredContainers]);

  // Chart data derivations (memoized)
  const customerBarData = useMemo(() => {
    return Object.entries(stats.customerStats).map(([key, v]: [string, { count: number; name: string; code: string }]) => ({
      name: key,
      displayName: v.name || key,
      total: v.count
    }));
  }, [stats.customerStats]);

  const typePieData = useMemo(() => {
    const types = {} as Record<string, number>;
    filteredContainers.forEach(c => {
      const t = c.type || 'unknown';
      types[t] = (types[t] || 0) + 1;
    });
    return Object.entries(types).map(([type, value]) => ({ type, value }));
  }, [filteredContainers]);

  const statusRadialData = useMemo(() => {
    return [
      { name: 'Bon état', value: stats.damagedStats.undamaged, fill: '#10B981' },
      { name: 'Endommagé', value: stats.damagedStats.damaged, fill: '#EF4444' }
    ];
  }, [stats.damagedStats]);

  // Classification chart data
  const classificationPieData = useMemo(() => {
    return [
      { name: 'Divers', value: stats.classificationStats.divers, fill: '#3B82F6' },
      { name: 'Alimentaire', value: stats.classificationStats.alimentaire, fill: '#10B981' }
    ];
  }, [stats.classificationStats]);

  const quantityPieData = useMemo(() => {
    const types = ['dry', 'reefer', 'tank', 'flat_rack', 'open_top'];
    const typeLabels = ['Dry', 'Reefer', 'Tank', 'Flat Rack', 'Open Top'];

    const result = types.map((type, index) => ({
      type: typeLabels[index],
      value: Number(Object.values(stats.typeByCustomer).reduce((sum, customerData: any) =>
        sum + (Number(customerData[type]) || 0), 0
      )),
      color: pieColors[index % pieColors.length]
    })).filter(item => item.value > 0);

    return result;
  }, [stats.typeByCustomer, pieColors])

  // Handle clicking stat cards (keeps original behaviour)
  const getFilteredData = (): FilteredData | null => {
    if (!activeFilter) return null;

    switch (activeFilter) {
      case 'customer':
        if (selectedCustomer) {
          const containers = filteredContainers.filter(c =>
            (c.clientCode || c.clientName) === selectedCustomer
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

      case 'classification':
        if (selectedClassification) {
          const containers = filteredContainers.filter(c => 
            c.classification === selectedClassification || 
            (!c.classification && selectedClassification === 'divers')
          );
          return {
            containers,
            title: `${selectedClassification.charAt(0).toUpperCase() + selectedClassification.slice(1)} Containers`,
            description: `All ${selectedClassification} classification containers`
          };
        }
        return {
          containers: filteredContainers,
          title: 'All Classifications',
          description: 'Container distribution by classification (Divers/Alimentaire)'
        };

      default:
        return null;
    }
  };

  const filteredData = useMemo(() => getFilteredData(), [activeFilter, selectedCustomer, selectedType, selectedClassification, filteredContainers, stats]);

  const handleStatCardClick = (filterType: FilterType, additionalData?: any) => {
    if (activeFilter === filterType) {
      // If clicking the same filter, close it
      setActiveFilter(null);
      setSelectedCustomer(null);
      setSelectedType(null);
      setSelectedClassification(null);
    } else {
      setActiveFilter(filterType);
      if (filterType === 'customer' && additionalData) {
        setSelectedCustomer(additionalData);
      } else if (filterType === 'type' && additionalData) {
        setSelectedType(additionalData);
      } else if (filterType === 'classification' && additionalData) {
        setSelectedClassification(additionalData);
      } else {
        setSelectedCustomer(null);
        setSelectedType(null);
        setSelectedClassification(null);
      }
    }
  };

  // Export CSV (filtered by view)
  const exportCSV = async () => {
    try {
      setIsExporting(true);
      // Choose data to export: filteredData if active, otherwise filteredContainers
      const rows = (filteredData?.containers ?? filteredContainers).map((c) => ({
        id: c.id ? c.id.substring(0, 8) : '', // Keep only first 8 characters of ID
        number: c.number,
        client: c.clientName,
        clientCode: c.clientCode,
        type: c.type,
        size: c.size,
        status: c.status,
        location: c.location,
        gateInDate: c.gateInDate ? new Date(c.gateInDate).toISOString() : '',
        gateOutDate: c.gateOutDate ? new Date(c.gateOutDate).toISOString() : '',
        depot: c.yardName || currentYard?.name || '',
        damaged: c.damage && c.damage.length > 0 ? 'Yes' : 'No'
      }));

      // Build CSV
      const header = Object.keys(rows[0] ?? {}).join(',');
      const csv = [header, ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `containers_export_${viewMode === 'global' ? 'all_depots' : currentYard?.code || 'current'}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      handleError(err, 'DashboardOverview.exportCSV');
    } finally {
      setIsExporting(false);
    }
  };

  // Export Excel (filtered by view)
  const exportExcel = async () => {
    try {
      setIsExporting(true);
      
      // Choose data to export: filteredData if active, otherwise filteredContainers
      const containersToExport = filteredData?.containers ?? filteredContainers;
      
      // Get yard name for each container
      const dataToExport = containersToExport.map((c) => {
        // Find yard name from availableYards
        const yard = availableYards.find(y => y.id === c.yardId);
        const yardName = yard?.name || c.yardName || currentYard?.name || '';
        
        return {
          id: c.id ? c.id.substring(0, 8) : '', // Keep only first 8 characters of ID
          number: c.number || '',
          client: c.clientName || '',
          clientCode: c.clientCode || '',
          type: c.type || '',
          size: c.size || '',
          status: c.status || '',
          location: c.location || '',
          gateInDate: formatDateShortForExport(c.gateInDate),
          gateInTime: formatTimeForExport(c.gateInDate),
          gateOutDate: formatDateShortForExport(c.gateOutDate),
          gateOutTime: formatTimeForExport(c.gateOutDate),
          depot: yardName,
          damaged: c.damage && c.damage.length > 0 ? 'Oui' : 'Non'
        };
      });

      exportToExcel({
        filename: `containers_export_${viewMode === 'global' ? 'all_depots' : currentYard?.code || 'current'}_${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: 'Containers',
        columns: [
          { header: 'ID', key: 'id', width: 12 },
          { header: 'Numéro Conteneur', key: 'number', width: 20 },
          { header: 'Client', key: 'client', width: 25 },
          { header: 'Code Client', key: 'clientCode', width: 15 },
          { header: 'Type', key: 'type', width: 15 },
          { header: 'Taille', key: 'size', width: 12 },
          { header: 'Statut', key: 'status', width: 15 },
          { header: 'Emplacement', key: 'location', width: 20 },
          { header: 'Date Gate In', key: 'gateInDate', width: 15 },
          { header: 'Heure Gate In', key: 'gateInTime', width: 15 },
          { header: 'Date Gate Out', key: 'gateOutDate', width: 15 },
          { header: 'Heure Gate Out', key: 'gateOutTime', width: 15 },
          { header: 'Dépôt', key: 'depot', width: 20 },
          { header: 'Endommagé', key: 'damaged', width: 12 }
        ],
        data: dataToExport
      });
    } catch (err) {
      handleError(err, 'DashboardOverview.exportExcel');
    } finally {
      setIsExporting(false);
    }
  };

  // Refresh handler calling the same load function used in useEffect
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await loadDashboardData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      in_depot: { color: 'bg-green-50 text-green-700', label: 'In Depot' },
      out_depot: { color: 'bg-blue-50 text-blue-700', label: 'Out Depot' },
      in_service: { color: 'bg-yellow-50 text-yellow-800', label: 'In Service' },
      maintenance: { color: 'bg-red-50 text-red-800', label: 'Maintenance' },
      cleaning: { color: 'bg-purple-50 text-purple-800', label: 'Cleaning' }
    };

    const config = (statusConfig as any)[status] || { color: 'bg-gray-50 text-gray-700', label: status };

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

  // Card wrapper with motion (light-only UI)
  const Card: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className = '' }) => (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      className={`bg-white border border-gray-100 rounded-2xl p-5 ${className} transition-shadow hover:shadow-md`}
    >
      {children}
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-start justify-center bg-gray-50 p-6">
        <div className="w-full max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-7 w-1/3 bg-gray-200 rounded-md animate-pulse" />
            <div className="h-8 w-24 bg-gray-200 rounded-md animate-pulse" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>

          <Card>
            <div className="h-56 bg-gray-200 rounded-md animate-pulse" />
          </Card>

          <Card>
            <div className="h-48 bg-gray-200 rounded-md animate-pulse" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Overview</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isManager || isAdmin && (
              <div className="flex items-center gap-1 sm:gap-2 bg-white border border-gray-100 rounded-lg p-1 sm:p-2">
                <button
                  onClick={() => setViewMode('current')}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition ${viewMode === 'current' ? 'bg-gray-100 text-gray-900' : 'text-gray-600'}`}
                >
                  <Building className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Current</span>
                </button>
                <button
                  onClick={() => setViewMode('global')}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition ${viewMode === 'global' ? 'bg-gray-100 text-gray-900' : 'text-gray-600'}`}
                >
                  <Globe className="h-4 w-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">Global</span>
                </button>
              </div>
            )}

            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 sm:gap-2 bg-white border border-gray-100 px-2 sm:px-3 py-2 rounded-lg hover:shadow-sm"
              title="Refresh data"
            >
              {isRefreshing ? <Spinner className="w-4 h-4" /> : <RefreshCw className="h-4 w-4 text-gray-600 flex-shrink-0" />}
              <span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">Rafraîchir</span>
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center gap-1 sm:gap-2 bg-white border border-gray-100 px-2 sm:px-3 py-2 rounded-lg hover:shadow-sm"
              title="Export filtered data to CSV"
            >
              {isExporting ? <Spinner className="w-4 h-4" /> : <DownloadCloud className="h-4 w-4 text-gray-600 flex-shrink-0" />}
              <span className="text-xs sm:text-sm text-gray-700 whitespace-nowrap">CSV</span>
            </button>

            <button
              onClick={exportExcel}
              className="flex items-center gap-1 sm:gap-2 bg-green-600 text-white px-2 sm:px-3 py-2 rounded-lg hover:bg-green-700 hover:shadow-sm"
              title="Export filtered data to Excel"
            >
              {isExporting ? <Spinner className="w-4 h-4" /> : <Download className="h-4 w-4 flex-shrink-0" />}
              <span className="text-xs sm:text-sm whitespace-nowrap">Excel</span>
            </button>
          </div>
        </header>

        {/* Client Notice */}
        {showClientNotice && (
          <Card className="flex items-center gap-4">
            <AlertTriangle className="h-6 w-6 text-blue-600" />
            <div>
              <div className="text-sm font-medium text-blue-800">Welcome to your client portal, <strong>{user?.name}</strong></div>
              <div className="text-xs text-blue-600 mt-1">
                You are viewing data for <strong>{user?.company}</strong>
                {currentYard && <span className="ml-1">in <strong>{currentYard.name}</strong></span>}.
              </div>
            </div>
          </Card>
        )}

        {/* Active Filter bar */}
        {(() => {
          if (activeFilter && filteredData) {
            return (
              <div className="sticky top-4 z-20">
                <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg"><Filter className="h-4 w-4 text-blue-600" /></div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">Active Filter</div>
                      <div className="text-xs text-gray-500">{filteredData?.title}</div>
                    </div>
                  </div>
                  <button onClick={() => handleStatCardClick(null)} className="p-2 rounded-md text-gray-500 hover:bg-gray-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('clients.stats.total')}</p>
                <h3 className="text-2xl font-semibold mt-1">{Object.keys(stats.customerStats).length}</h3>
                <p className="text-xs text-gray-400 mt-1">{t('clients.stats.active')}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <User className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Quantité totale ({viewMode === "current" ? currentYard?.name || 'Current' : 'All'})</p>
                <h3 className="text-2xl font-semibold mt-1">{stats.inYardContainers.length}</h3>
                <p className="text-xs text-gray-400 mt-1">Conteneurs en dépôt (in_depot)</p>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50">
                <Building className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total par type</p>
                <h3 className="text-2xl font-semibold mt-1">
                  {filteredContainers.reduce((acc, c) => acc + 1, 0)}
                </h3>
                <p className="text-xs text-gray-400 mt-1">Tous types confondus</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Bon / Endommagé</p>
                <h3 className="text-2xl font-semibold mt-1">{stats.damagedStats.undamaged} / {stats.damagedStats.damaged}</h3>
                <p className="text-xs text-gray-400 mt-1">Good / Damaged</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Classification</p>
                <h3 className="text-2xl font-semibold mt-1">{stats.classificationStats.divers} / {stats.classificationStats.alimentaire}</h3>
                <p className="text-xs text-gray-400 mt-1">Divers / Alimentaire</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50">
                <Layers className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="space-y-6">
          {/* Row 1: Client Chart (Full Width) */}
          {/* Customers bar chart */}
          <Card className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Client</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // clicking chart toggles customer filter off/on (no outline)
                    if (activeFilter === 'customer') handleStatCardClick(null);
                    else handleStatCardClick('customer');
                  }}
                  className="p-1 rounded hover:bg-gray-100"
                  aria-label="Toggle customer filter"
                >
                  <Layers className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

           <div style={{ height: 240 }}>
             <ResponsiveContainer width="100%" height={240} minWidth={0}>
               <BarChart
                 data={customerBarData}
                 margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
               >
                 <XAxis
                   dataKey="name"
                   tick={{ fill: '#6B7280', fontSize: 12 }}
                   axisLine={false}
                   tickLine={false}
                 />
                 <RechartsTooltip
                   content={({ active, payload, label }) => {
                     if (active && payload && payload.length) {
                       const data = payload[0].payload;
                       const displayName = data.displayName || label;
                       return (
                         <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                           <p className="font-medium text-gray-900">{displayName}</p>
                           <p className="text-sm text-blue-600">
                             Containers: <span className="font-bold">{payload[0].value}</span>
                           </p>
                         </div>
                       );
                     }
                     return null;
                   }}
                 />
                 <Bar
                   dataKey="total"
                   radius={[4, 4, 0, 0]}
                   fill="#3B82F6"
                   onClick={(data, index) => {
                     const clientKey = Object.keys(stats.customerStats)[index];
                     handleStatCardClick('customer', clientKey);
                   }}
                   onMouseDown={(e: any) => e?.preventDefault?.()}
                   style={{ cursor: 'pointer' }}
                   label={{ position: 'top', fill: '#374151', fontSize: 16, fontWeight: 'bold', formatter: (value: any) => `${value}` }}
                 />
               </BarChart>
             </ResponsiveContainer>
           </div>
          </Card>

          {/* Row 2: Three Charts Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Type Pie */}
          <Card className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Type de Conteneur</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // clicking chart toggles customer filter off/on (no outline)
                    if (activeFilter === 'type') handleStatCardClick(null);
                    else handleStatCardClick('type');
                  }}
                  className="p-1 rounded hover:bg-gray-100"
                  aria-label="Toggle type filter"
                >
                  <Layers className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div style={{ height: 240 }} className="flex flex-col items-center justify-between">
              <ResponsiveContainer width="100%" height={220} minWidth={0}>
                <PieChart>
                  <Pie
                    data={quantityPieData}
                    dataKey="value"
                    nameKey="type"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={4}
                    labelLine={false}
                    label={({ index }) => `${quantityPieData[index]?.value}`}
                    onClick={(entry) => handleStatCardClick('type', entry.type)}
                    onMouseDown={(e: any) => e?.preventDefault?.()}
                  >
                    {quantityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>

              {/* Custom legend using quantityPieData */}
              <div className="flex flex-wrap gap-3 mt-1">
                {quantityPieData.map((entry, index) => (
                  <div key={`legend-${index}`} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="capitalize">{String(entry.type)} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Status radial */}
          <Card className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">État des Conteneurs</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // clicking chart toggles damage filter off/on (no outline)
                    if (activeFilter === 'damage') handleStatCardClick(null);
                    else handleStatCardClick('damage');
                  }}
                  className="p-1 rounded hover:bg-gray-100"
                  aria-label="Toggle customer filter"
                >
                  <Layers className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height={240} minWidth={0}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="20%"
                  outerRadius="90%"
                  barSize={18}
                  data={statusRadialData}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={6}
                    onClick={(data) => handleStatCardClick('damage', data.name === 'Endommagé' ? 'damaged' : 'undamaged')}
                    onMouseDown={(e: any) => e?.preventDefault?.()}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-2 border border-gray-200 rounded-md shadow-md">
                            <p className="font-medium">{payload[0].payload.name}</p>
                            <p className="text-sm text-gray-600">{`Quantité: ${payload[0].value}`}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex justify-center gap-6 mt-4">
              {statusRadialData.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.fill }} />
                  {s.name} ({s.value})
                </div>
              ))}
            </div>
          </Card>

          {/* Classification Pie Chart */}
          <Card className="relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Classification</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // clicking chart toggles classification filter off/on
                    if (activeFilter === 'classification') handleStatCardClick(null);
                    else handleStatCardClick('classification');
                  }}
                  className="p-1 rounded hover:bg-gray-100"
                  aria-label="Toggle classification filter"
                >
                  <Layers className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div style={{ height: 240 }} className="flex flex-col items-center justify-between">
              <ResponsiveContainer width="100%" height={220} minWidth={0}>
                <PieChart>
                  <Pie
                    data={classificationPieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={4}
                    labelLine={false}
                    label={({ value }) => `${value}`}
                    onClick={(entry) => handleStatCardClick('classification', entry.name.toLowerCase())}
                    onMouseDown={(e: any) => e?.preventDefault?.()}
                  >
                    {classificationPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>

              {/* Custom legend */}
              <div className="flex flex-wrap gap-3 mt-1">
                {classificationPieData.map((entry, index) => (
                  <div key={`legend-${index}`} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.fill }}
                    />
                    <span>{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          </div>
        </div>

        {/* Depot Performance Table - Only for Admin and Supervisor */}
        {(isAdmin || isManager) && multiDepotData && (
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold">Depot Performance Comparison</h3>
                <p className="text-xs sm:text-sm text-gray-500">Individual depot metrics and performance indicators</p>
              </div>
              <div className="text-xs sm:text-sm text-gray-400">Depots: {multiDepotData.globalStats.totalDepots}</div>
            </div>

            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-4">
              {multiDepotData.depotPerformance.map((depot) => (
                <div key={depot.id} className="border border-gray-100 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Building className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{depot.name}</div>
                      <div className="text-xs text-gray-400">{depot.code}</div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full flex-shrink-0 ${depot.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {depot.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Capacity</div>
                      <div className="font-medium">{depot.occupancy.toLocaleString()} / {depot.capacity.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Containers</div>
                      <div className="font-medium">{depot.containers}</div>
                      <div className="text-xs text-gray-400">{depot.inDepot} in depot</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-500">Utilization</span>
                      <span className={`text-sm font-medium ${
                        depot.utilizationRate >= 90 ? 'text-red-600' :
                        depot.utilizationRate >= 75 ? 'text-orange-600' :
                        depot.utilizationRate >= 25 ? 'text-green-600' : 'text-blue-600'
                      }`}>{depot.utilizationRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          depot.utilizationRate >= 90 ? 'bg-red-500' :
                          depot.utilizationRate >= 75 ? 'bg-orange-500' :
                          depot.utilizationRate >= 25 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(depot.utilizationRate, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">Efficiency</span>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      depot.efficiency >= 95 ? 'bg-green-50 text-green-700' :
                      depot.efficiency >= 85 ? 'bg-blue-50 text-blue-700' :
                      depot.efficiency >= 75 ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-700'
                    }`}>{depot.efficiency}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left text-xs text-gray-500 uppercase">Depot</th>
                    <th className="p-3 text-left text-xs text-gray-500 uppercase">Capacity</th>
                    <th className="p-3 text-left text-xs text-gray-500 uppercase">Utilization</th>
                    <th className="p-3 text-left text-xs text-gray-500 uppercase">Containers</th>
                    <th className="p-3 text-left text-xs text-gray-500 uppercase">Efficiency</th>
                    <th className="p-3 text-left text-xs text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {multiDepotData.depotPerformance.map((depot) => (
                    <tr key={depot.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-indigo-50 flex items-center justify-center">
                            <Building className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-medium">{depot.name}</div>
                            <div className="text-xs text-gray-400">{depot.code}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div>{depot.occupancy.toLocaleString()} / {depot.capacity.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">containers</div>
                      </td>

                      <td className="p-3">
                        <div className={`font-medium ${
                          depot.utilizationRate >= 90 ? 'text-red-600' :
                          depot.utilizationRate >= 75 ? 'text-orange-600' :
                          depot.utilizationRate >= 25 ? 'text-green-600' : 'text-blue-600'
                        }`}>{depot.utilizationRate.toFixed(1)}%</div>
                        <div className="w-40 bg-gray-100 h-2 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${
                              depot.utilizationRate >= 90 ? 'bg-red-500' :
                              depot.utilizationRate >= 75 ? 'bg-orange-500' :
                              depot.utilizationRate >= 25 ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(depot.utilizationRate, 100)}%` }}
                          />
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-medium">{depot.containers}</div>
                        <div className="text-xs text-gray-400">{depot.inDepot} in depot</div>
                      </td>

                      <td className="p-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          depot.efficiency >= 95 ? 'bg-green-50 text-green-700' :
                          depot.efficiency >= 85 ? 'bg-blue-50 text-blue-700' :
                          depot.efficiency >= 75 ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-700'
                        }`}>{depot.efficiency}%</span>
                      </td>

                      <td className="p-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${depot.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {depot.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Filtered Data Table */}
        {filteredData && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{filteredData.title}</h3>
                <div className="text-sm text-gray-500">{filteredData.description}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm">{filteredData.containers.length} containers</span>
                <button onClick={() => handleStatCardClick(null)} className="p-2 rounded hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Damage Analysis by Customer */}
            {(activeFilter === 'customer' || activeFilter === 'type' || activeFilter === 'damage') && (
              <div className="mb-6">
                <h4 className="text-md font-medium mb-3">Analyse des Dommages par Client</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Conteneurs Endommagés</span>
                      <span className="text-sm font-bold text-red-600">
                        {filteredData.containers.filter(c => c.damaged).length}
                        ({Math.round(filteredData.containers.filter(c => c.damaged).length / filteredData.containers.length * 100) || 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${Math.round(filteredData.containers.filter(c => c.damaged).length / filteredData.containers.length * 100) || 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Conteneurs Non Endommagés</span>
                      <span className="text-sm font-bold text-green-600">
                        {filteredData.containers.filter(c => !c.damaged).length}
                        ({Math.round(filteredData.containers.filter(c => !c.damaged).length / filteredData.containers.length * 100) || 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${Math.round(filteredData.containers.filter(c => !c.damaged).length / filteredData.containers.length * 100) || 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left text-xs text-gray-500 uppercase">Container</th>
                    <th className="p-3 text-left text-xs text-gray-500 uppercase">Type & Size</th>
                    <th className="p-3 text-left text-xs text-gray-500 uppercase">Status</th>
                    <th className="p-3 text-left text-xs text-gray-500 uppercase">Location</th>
                    {canViewAllData() && <th className="p-3 text-left text-xs text-gray-500 uppercase">Client</th>}
                    <th className="p-3 text-left text-xs text-gray-500 uppercase">Gate In</th>
                    <th className="p-3 text-left text-xs text-gray-500 uppercase">Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.containers.map((container) => (
                    <tr key={container.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{getTypeIcon(container.type)}</div>
                          <div>
                            <div className="font-medium">{container.number}</div>
                            <div className="text-xs text-gray-400">ID: {container.id.slice(-6).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="capitalize">{container.type?.replace('_', ' ')}</div>
                        <div className="text-xs text-gray-400">{container.size}</div>
                      </td>

                      <td className="p-3">{getStatusBadge(container.status)}</td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{container.location}</span>
                        </div>
                      </td>

                      {canViewAllData() && (
                        <td className="p-3">
                          <div className="font-medium">{container.clientName}</div>
                          <div className="text-xs text-gray-400">{container.clientCode}</div>
                        </td>
                      )}

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm">{container.gateInDate?.toLocaleDateString?.() ?? '-'}</div>
                            <div className="text-xs text-gray-400">{container.gateInDate?.toLocaleTimeString?.() ?? ''}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {(container.damage && container.damage.length > 0) ? (
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

              {filteredData.containers.length === 0 && (
                <div className="text-center py-8">
                  <Package className="h-10 w-10 mx-auto text-gray-300" />
                  <h3 className="text-lg font-medium mt-3">No containers found</h3>
                  <p className="text-sm text-gray-500 mt-1">No containers match the selected filter criteria.</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Customer type breakdown when customer filter active */}
        {activeFilter === 'customer' && selectedCustomer && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Container Types for {stats.customerStats[selectedCustomer]?.name}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.typeByCustomer[selectedCustomer] || {}).map(([type, count]) => {
                if (type === 'clientName') return null;
                return (
                  <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl mb-2">{getTypeIcon(type)}</div>
                    <div className="text-sm text-gray-500 capitalize">{type.replace('_', ' ')}</div>
                    <div className="text-lg font-bold mt-2">{count as number}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Damage analysis when damage filter active */}
        {activeFilter === 'damage' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Damage Analysis by Customer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.customerStats).map(([customerKey, customerData]: [string, { count: number; name: string; code: string }]) => {
                const customerContainers = filteredContainers.filter(c =>
                  (c.clientCode || c.clientName) === customerKey
                );
                const damaged = customerContainers.filter(c => c.damage && c.damage.length > 0).length;
                const undamaged = customerContainers.filter(c => !c.damage || c.damage.length === 0).length;
                const damageRate = customerContainers.length > 0 ? (damaged / customerContainers.length) * 100 : 0;

                return (
                  <div key={customerKey} className="p-4 border border-gray-100 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">{customerData?.name}</div>
                        <div className="text-xs text-gray-400">{customerData?.code}</div>
                      </div>
                      <div className={`px-2 py-1 text-xs rounded-full ${damageRate > 20 ? 'bg-red-50 text-red-700' : damageRate > 10 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
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
                        <span className="text-gray-500">Total:</span>
                        <span className="font-medium">{customerContainers.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;
