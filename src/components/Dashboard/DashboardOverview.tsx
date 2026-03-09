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
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { useTheme } from '../../hooks/useTheme';
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
  <div className={`animate-spin rounded-full border-2 border-t-transparent border-slate-400 ${className}`} />
);

const SkeletonRow: React.FC = () => (
  <div className="animate-pulse flex items-center gap-4 py-3 px-4 border-b border-slate-100">
    <div className="w-12 h-12 bg-slate-200 rounded-md" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-slate-200 rounded w-3/4" />
      <div className="h-3 bg-slate-200 rounded w-1/2" />
    </div>
    <div className="w-16 h-4 bg-slate-200 rounded" />
  </div>
);

export const DashboardOverview: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
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
        damaged: depotContainers.filter(c => (c.damage && c.damage.length > 0) || c.status === 'in_buffer').length,
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

    // Total by damaged or not (include buffer zone as damaged)
    const damagedStats = {
      damaged: filteredContainers.filter(c => (c.damage && c.damage.length > 0) || c.status === 'in_buffer').length,
      undamaged: filteredContainers.filter(c => c.status !== 'in_buffer' && (!c.damage || c.damage.length === 0)).length
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
        damaged: (c.damage && c.damage.length > 0) || c.status === 'in_buffer' ? 'Yes' : 'No'
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
          damaged: (c.damage && c.damage.length > 0) || c.status === 'in_buffer' ? 'Oui' : 'Non'
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

    const config = (statusConfig as any)[status] || { color: 'bg-slate-50 text-slate-700', label: status };

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
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl p-5 ${className} transition-all duration-300 hover:shadow-lg`}
    >
      {children}
    </motion.div>
  );


  if (loading) {
    return (
      <div className="min-h-screen flex items-start justify-center bg-slate-50 dark:bg-gray-900 p-6">
        <div className="w-full max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-7 w-1/3 bg-slate-200 rounded-md animate-pulse" />
            <div className="h-8 w-24 bg-slate-200 rounded-md animate-pulse" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>

          <Card>
            <div className="h-56 bg-slate-200 rounded-md animate-pulse" />
          </Card>

          <Card>
            <div className="h-48 bg-slate-200 rounded-md animate-pulse" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 flex flex-col bg-[#F8FAFC]" 
      style={{
        '--olam-teal': '#00869D', 
        '--olam-teal-light': '#e6f3f5', 
        '--olam-green': '#A0C800', 
        '--olam-green-light': '#f6fae6', 
        '--olam-orange': '#FD4E00', 
        '--olam-orange-light': '#ffede6',
        '--olam-dark': '#1F2937',
        '--olam-gray': '#F3F4F6',
        fontFamily: "'Inter', sans-serif"
      } as React.CSSProperties}
    >
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between px-6 shadow-sm z-50 sticky top-0 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">Overview</h1>
        </div>
        <div className="flex items-center gap-3">
          {(isManager || isAdmin) && (
            <div className="hidden sm:flex bg-slate-100 dark:bg-gray-700 rounded-lg p-1 border border-slate-200 dark:border-gray-600">
              <button 
                onClick={() => setViewMode('current')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm transition-all ${viewMode === 'current' ? 'bg-white text-[var(--olam-teal)]' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Current Depot
              </button>
              <button 
                onClick={() => setViewMode('global')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'global' ? 'bg-white text-[var(--olam-teal)] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Global View
              </button>
            </div>
          )}
          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefresh}
              className="p-2 text-slate-500 hover:text-[var(--olam-teal)] hover:bg-[var(--olam-teal-light)] rounded-md transition-colors relative group" title="Refresh Data"
            >
              {isRefreshing ? <Spinner className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
            </button>
            <button 
              onClick={exportCSV}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors" title="Export CSV"
            >
              <DownloadCloud className="w-5 h-5" />
            </button>
            <button 
              onClick={exportExcel}
              className="flex items-center gap-2 bg-[var(--olam-teal)] hover:bg-[#006c7e] text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm shadow-cyan-900/10"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Report</span>
            </button>
          </div>

        </div>
      </header>

      <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6 bg-gray-50 dark:bg-gray-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 dark:bg-gray-700 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-110"></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Total Clients</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{Object.keys(stats.customerStats).length}</h3>
                <div className="flex items-center mt-1 text-xs text-slate-400 dark:text-gray-500 font-medium">
                  Active
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[var(--olam-green-light)] text-[var(--olam-green)]">
                <User className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">In Depot</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.inYardContainers.length}</h3>
                <div className="w-full bg-slate-100 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                  <div className="bg-[var(--olam-teal)] h-1.5 rounded-full" style={{ width: `${Math.min((stats.inYardContainers.length / (filteredContainers.length || 1)) * 100, 100)}%` }}></div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">{Math.round((stats.inYardContainers.length / (filteredContainers.length || 1)) * 100)}% of total loaded</p>
              </div>
              <div className="p-2 rounded-lg bg-[var(--olam-teal-light)] text-[var(--olam-teal)]">
                <Building className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Total Units</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{filteredContainers.length}</h3>
                <div className="flex gap-1 mt-2">
                  <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-gray-600"></div>
                  <div className="h-1 w-8 rounded-full bg-[var(--olam-orange)]"></div>
                  <div className="h-1 w-1 rounded-full bg-slate-300 dark:bg-gray-600"></div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">All types active</p>
              </div>
              <div className="p-2 rounded-lg bg-[var(--olam-orange-light)] text-[var(--olam-orange)]">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Condition</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <h3 className="text-2xl font-bold text-[var(--olam-green)]">{stats.damagedStats.undamaged}</h3>
                  <span className="text-sm text-slate-400 dark:text-gray-500">/</span>
                  <h3 className="text-lg font-semibold text-[var(--olam-orange)]">{stats.damagedStats.damaged}</h3>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">Good vs Damaged</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-gray-700 text-slate-500 dark:text-gray-400">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Class</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{Math.round(stats.classificationStats.divers / (stats.totalContainers || 1) * 100)}%</h3>
                  <span className="text-xs text-slate-500 dark:text-gray-400 font-medium">Divers</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{Math.round(stats.classificationStats.alimentaire / (stats.totalContainers || 1) * 100)}% Alimentaire</p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Layers className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm p-6" style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f0f9fa 100%)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Client Distribution</h3>
                <p className="text-sm text-slate-500 dark:text-gray-400">Volume by top clients in current depot</p>
              </div>
            </div>
            <div className={`h-64 mt-4 ${customerBarData.length > 8 ? 'overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent' : ''}`}>
               <div style={{ minWidth: '100%', width: customerBarData.length > 8 ? `${customerBarData.length * 60 + 50}px` : '100%', height: '100%' }}>
                 <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                   <BarChart data={customerBarData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
                     <XAxis dataKey="name" tick={{ fill: theme === 'dark' ? '#9ca3af' : '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" />
                     <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: theme === 'dark' ? '1px solid #4b5563' : '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff', color: theme === 'dark' ? '#f9fafb' : '#1f2937' }} />
                     <Bar dataKey="total" radius={[4, 4, 0, 0]} onClick={(data, index) => { const clientKey = Object.keys(stats.customerStats)[index]; handleStatCardClick('customer', clientKey); }} style={{ cursor: 'pointer', minWidth: 20 }}>
                       {customerBarData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--olam-teal)' : 'var(--olam-green)'} opacity={index > 3 ? 0.6 : 1} />
                       ))}
                     </Bar>
                   </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm p-5 flex flex-col">
            <h4 className="text-sm font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--olam-teal)]"></span>
              Container Type
            </h4>
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                  <Pie data={quantityPieData} innerRadius="65%" outerRadius="90%" paddingAngle={2} dataKey="value" nameKey="type">
                    {quantityPieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--olam-teal)' : index === 1 ? 'var(--olam-green)' : index === 2 ? 'var(--olam-orange)' : '#CBD5E1'} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                 </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                <span className="text-xs text-slate-400 dark:text-gray-400 font-medium">Total</span>
                <span className="text-2xl font-bold text-slate-800 dark:text-white">{filteredContainers.length}</span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {quantityPieData.map((d: any, i: number) => (
                 <div key={i} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: i === 0 ? 'var(--olam-teal)' : i === 1 ? 'var(--olam-green)' : i === 2 ? 'var(--olam-orange)' : '#CBD5E1' }}></span>
                    <span className="text-slate-600 dark:text-gray-300">{d.type} ({Math.round((d.value/filteredContainers.length)*100)}%)</span>
                 </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm p-5 flex flex-col">
            <h4 className="text-sm font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--olam-orange)]"></span>
              Condition Status
            </h4>
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="90%" barSize={12} data={statusRadialData} startAngle={90} endAngle={-270}>
                  <RadialBar background dataKey="value" cornerRadius={6}>
                    {statusRadialData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Bon état' ? 'var(--olam-green)' : 'var(--olam-orange)'} />
                    ))}
                  </RadialBar>
                  <RechartsTooltip />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none text-center pt-2">
                 <span className="text-3xl font-bold text-[var(--olam-green)]">{Math.round((stats.damagedStats.undamaged / (stats.totalContainers || 1)) * 100)}%</span>
                 <span className="text-xs text-slate-400">Good Condition</span>
              </div>
            </div>
            <div className="mt-2 text-center">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                {Math.round((stats.damagedStats.damaged / (stats.totalContainers || 1)) * 100)}% Damaged
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm p-5 flex flex-col">
            <h4 className="text-sm font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Classification
            </h4>
            <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
              <ResponsiveContainer width="100%" height={160}>
                 <PieChart>
                  <Pie data={classificationPieData} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius="70%" outerRadius="100%" paddingAngle={0} dataKey="value" nameKey="name">
                    {classificationPieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Divers' ? 'var(--olam-teal)' : 'var(--olam-green)'} stroke="transparent" />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                 </PieChart>
              </ResponsiveContainer>
              <div className="flex w-full justify-between mt-4 px-4 text-xs font-medium">
                <div className="text-center">
                  <div className="text-[var(--olam-teal)] text-lg font-bold">{Math.round((stats.classificationStats.divers / (stats.totalContainers || 1)) * 100)}%</div>
                  <div className="text-slate-500">Divers</div>
                </div>
                <div className="text-center">
                  <div className="text-[var(--olam-green)] text-lg font-bold">{Math.round((stats.classificationStats.alimentaire / (stats.totalContainers || 1)) * 100)}%</div>
                  <div className="text-slate-500">Alimentaire</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Depot Performance Table - Only for Admin and Supervisor */}
        {(isAdmin || isManager) && multiDepotData && (
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h3 className="text-lg font-semibold dark:text-white">Depot Performance Comparison</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">Individual depot metrics and performance indicators</p>
              </div>
              <div className="text-xs sm:text-sm text-slate-400 dark:text-gray-500">Depots: {multiDepotData.globalStats.totalDepots}</div>
            </div>

            {/* Mobile Card View */}
            <div className="block lg:hidden space-y-4">
              {multiDepotData.depotPerformance.map((depot) => (
                <div key={depot.id} className="border border-slate-100 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Building className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate dark:text-white">{depot.name}</div>
                      <div className="text-xs text-slate-400 dark:text-gray-500">{depot.code}</div>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full flex-shrink-0 ${depot.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {depot.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Capacity</div>
                      <div className="font-medium">{depot.occupancy.toLocaleString()} / {depot.capacity.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Containers</div>
                      <div className="font-medium">{depot.containers}</div>
                      <div className="text-xs text-slate-400">{depot.inDepot} in depot</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-500">Utilization</span>
                      <span className={`text-sm font-medium ${
                        depot.utilizationRate >= 90 ? 'text-red-600' :
                        depot.utilizationRate >= 75 ? 'text-orange-600' :
                        depot.utilizationRate >= 25 ? 'text-green-600' : 'text-blue-600'
                      }`}>{depot.utilizationRate.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
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

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500">Efficiency</span>
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
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left text-xs text-slate-500 uppercase">Depot</th>
                    <th className="p-3 text-left text-xs text-slate-500 uppercase">Capacity</th>
                    <th className="p-3 text-left text-xs text-slate-500 uppercase">Utilization</th>
                    <th className="p-3 text-left text-xs text-slate-500 uppercase">Containers</th>
                    <th className="p-3 text-left text-xs text-slate-500 uppercase">Efficiency</th>
                    <th className="p-3 text-left text-xs text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {multiDepotData.depotPerformance.map((depot) => (
                    <tr key={depot.id} className="hover:bg-slate-50 dark:hover:bg-gray-700">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-indigo-50 flex items-center justify-center">
                            <Building className="h-5 w-5 text-indigo-600" />
                          </div>
                          <div>
                            <div className="font-medium">{depot.name}</div>
                            <div className="text-xs text-slate-400">{depot.code}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div>{depot.occupancy.toLocaleString()} / {depot.capacity.toLocaleString()}</div>
                        <div className="text-xs text-slate-400">containers</div>
                      </td>

                      <td className="p-3">
                        <div className={`font-medium ${
                          depot.utilizationRate >= 90 ? 'text-red-600' :
                          depot.utilizationRate >= 75 ? 'text-orange-600' :
                          depot.utilizationRate >= 25 ? 'text-green-600' : 'text-blue-600'
                        }`}>{depot.utilizationRate.toFixed(1)}%</div>
                        <div className="w-40 bg-slate-100 h-2 rounded-full mt-1 overflow-hidden">
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
                        <div className="text-xs text-slate-400">{depot.inDepot} in depot</div>
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
                <h3 className="text-lg font-semibold dark:text-white">{filteredData.title}</h3>
                <div className="text-sm text-slate-500 dark:text-gray-400">{filteredData.description}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[var(--olam-teal-light)] text-[var(--olam-teal)] text-sm font-medium">{filteredData.containers.length} containers</span>
                <button onClick={() => handleStatCardClick(null)} className="p-2 rounded hover:bg-slate-100 text-slate-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Damage Analysis by Customer */}
            {(activeFilter === 'customer' || activeFilter === 'type' || activeFilter === 'damage') && (
              <div className="mb-6">
                <h4 className="text-md font-medium mb-3">Analyse des Dommages par Filtrage</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">Conteneurs Endommagés</span>
                      <span className="text-sm font-bold text-[var(--olam-orange)]">
                        {filteredData.containers.filter(c => (c.damage && c.damage.length > 0) || c.status === 'in_buffer').length}
                        ({Math.round(filteredData.containers.filter(c => (c.damage && c.damage.length > 0) || c.status === 'in_buffer').length / (filteredData.containers.length || 1) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[var(--olam-orange)] h-2 rounded-full"
                        style={{ width: `${Math.round(filteredData.containers.filter(c => (c.damage && c.damage.length > 0) || c.status === 'in_buffer').length / (filteredData.containers.length || 1) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-slate-700">Conteneurs Non Endommagés</span>
                      <span className="text-sm font-bold text-[var(--olam-green)]">
                        {filteredData.containers.filter(c => c.status !== 'in_buffer' && (!c.damage || c.damage.length === 0)).length}
                        ({Math.round(filteredData.containers.filter(c => c.status !== 'in_buffer' && (!c.damage || c.damage.length === 0)).length / (filteredData.containers.length || 1) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[var(--olam-green)] h-2 rounded-full"
                        style={{ width: `${Math.round(filteredData.containers.filter(c => c.status !== 'in_buffer' && (!c.damage || c.damage.length === 0)).length / (filteredData.containers.length || 1) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left text-xs text-slate-500 uppercase">Container</th>
                    <th className="p-3 text-left text-xs text-slate-500 uppercase">Type & Size</th>
                    <th className="p-3 text-left text-xs text-slate-500 uppercase">Status</th>
                    <th className="p-3 text-left text-xs text-slate-500 uppercase">Location</th>
                    {canViewAllData() && <th className="p-3 text-left text-xs text-slate-500 uppercase">Client</th>}
                    <th className="p-3 text-left text-xs text-slate-500 uppercase">Gate In</th>
                    <th className="p-3 text-left text-xs text-slate-500 uppercase">Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.containers.map((container) => (
                    <tr key={container.id} className="hover:bg-slate-50 dark:hover:bg-gray-700">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-[var(--olam-teal-light)] text-[var(--olam-teal)] flex items-center justify-center font-bold text-xl">
                            {getTypeIcon(container.type)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800 dark:text-white">{container.number}</div>
                            <div className="text-xs text-slate-400">ID: {container.id.slice(-6).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="capitalize font-medium text-slate-700 dark:text-gray-200">{container.type?.replace('_', ' ')}</div>
                        <div className="text-xs text-slate-400">{container.size}</div>
                      </td>

                      <td className="p-3">{getStatusBadge(container.status)}</td>

                      <td className="p-3 text-slate-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          <span>{container.location || '-'}</span>
                        </div>
                      </td>

                      {canViewAllData() && (
                        <td className="p-3">
                          <div className="font-medium text-slate-800">{container.clientName}</div>
                          <div className="text-xs text-slate-400">{container.clientCode}</div>
                        </td>
                      )}

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <div>
                            <div className="text-sm font-medium text-slate-800">{container.gateInDate ? new Date(container.gateInDate).toLocaleDateString() : '-'}</div>
                            <div className="text-xs text-slate-400">{container.gateInDate ? new Date(container.gateInDate).toLocaleTimeString() : ''}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {((container.damage && container.damage.length > 0) || container.status === 'in_buffer') ? (
                            <>
                              <XCircle className="h-4 w-4 text-[var(--olam-orange)]" />
                              <span className="text-sm text-[var(--olam-orange)] font-medium">Damaged</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 text-[var(--olam-green)]" />
                              <span className="text-sm text-[var(--olam-green)] font-medium">Good</span>
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
                  <h3 className="text-lg font-medium mt-3">{t('common.noContainers')}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t('common.tryAdjusting')}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Customer type breakdown when customer filter active */}
        {activeFilter === 'customer' && selectedCustomer && (
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Container Types for {stats.customerStats[selectedCustomer]?.name}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.typeByCustomer[selectedCustomer] || {}).map(([type, count]) => {
                if (type === 'clientName') return null;
                return (
                  <div key={type} className="text-center p-4 bg-slate-50 dark:bg-gray-700 rounded-lg hover:shadow-sm transition-shadow">
                    <div className="text-2xl mb-2">{getTypeIcon(type)}</div>
                    <div className="text-sm text-slate-500 dark:text-gray-400 capitalize">{type.replace('_', ' ')}</div>
                    <div className="text-lg font-bold mt-2 text-[var(--olam-teal)] dark:text-teal-400">{count as number}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Damage analysis when damage filter active */}
        {activeFilter === 'damage' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Damage Analysis by Customer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(stats.customerStats).map(([customerKey, customerData]: [string, any]) => {
                const customerContainers = filteredContainers.filter(c =>
                  (c.clientCode || c.clientName) === customerKey
                );
                // Include buffer zone containers as damaged
                const damaged = customerContainers.filter(c => (c.damage && c.damage.length > 0) || c.status === 'in_buffer').length;
                const undamaged = customerContainers.filter(c => c.status !== 'in_buffer' && (!c.damage || c.damage.length === 0)).length;
                const damageRate = customerContainers.length > 0 ? (damaged / customerContainers.length) * 100 : 0;

                return (
                  <div key={customerKey} className="p-4 border border-slate-100 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                      <div>
                        <div className="font-semibold text-slate-800">{customerData?.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{customerData?.code}</div>
                      </div>
                      <div className={`px-2 py-1 text-xs rounded-full font-medium ${damageRate > 20 ? 'bg-red-50 text-red-700' : damageRate > 10 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                        {damageRate.toFixed(1)}% Damaged
                      </div>
                    </div>

                    <div className="space-y-2 text-sm mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--olam-orange)] font-medium flex items-center gap-1"><XCircle className="w-4 h-4" /> Damaged</span>
                        <span className="font-bold text-slate-800">{damaged}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[var(--olam-green)] font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Good</span>
                        <span className="font-bold text-slate-800">{undamaged}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                        <span className="text-slate-500 font-medium">Total Volume</span>
                        <span className="font-bold text-slate-900">{customerContainers.length} units</span>
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
