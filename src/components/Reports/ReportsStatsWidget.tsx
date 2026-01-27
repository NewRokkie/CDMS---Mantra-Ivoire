import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, Zap, RefreshCw } from 'lucide-react';
import { reportService } from '../../services/api';
import { useYard } from '../../hooks/useYard';

interface ReportsStats {
  totalReportsGenerated: number;
  lastExportTime: Date | null;
  activeFilters: number;
  autoRefreshEnabled: boolean;
  dataFreshness: number; // minutes since last update
}

interface ReportsStatsWidgetProps {
  onRefreshData?: () => void;
  lastUpdated?: Date | null;
  activeFiltersCount?: number;
  autoRefreshEnabled?: boolean;
  activeTab?: 'analytics' | 'operations';
}

export const ReportsStatsWidget: React.FC<ReportsStatsWidgetProps> = ({
  onRefreshData,
  lastUpdated,
  activeFiltersCount = 0,
  autoRefreshEnabled = false,
  activeTab = 'analytics'
}) => {
  const { currentYard } = useYard();
  const [stats, setStats] = useState<ReportsStats>({
    totalReportsGenerated: 0,
    lastExportTime: null,
    activeFilters: activeFiltersCount,
    autoRefreshEnabled,
    dataFreshness: 0
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load stats from localStorage
    const savedStats = localStorage.getItem('reports-stats');
    if (savedStats) {
      try {
        const parsed = JSON.parse(savedStats);
        setStats(prev => ({
          ...prev,
          totalReportsGenerated: parsed.totalReportsGenerated || 0,
          lastExportTime: parsed.lastExportTime ? new Date(parsed.lastExportTime) : null
        }));
      } catch (error) {
        console.error('Failed to load reports stats:', error);
      }
    }
  }, []);

  // Function to get auto-refresh status from localStorage
  const getAutoRefreshStatus = () => {
    const key = activeTab === 'analytics' 
      ? 'reports-analytics-auto-refresh' 
      : 'reports-operations-auto-refresh';
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : false;
  };

  useEffect(() => {
    setStats(prev => ({
      ...prev,
      activeFilters: activeFiltersCount,
      autoRefreshEnabled: getAutoRefreshStatus()
    }));
  }, [activeFiltersCount, autoRefreshEnabled, activeTab]);

  // Listen for localStorage changes to update auto-refresh status
  useEffect(() => {
    const handleStorageChange = () => {
      setStats(prev => ({
        ...prev,
        autoRefreshEnabled: getAutoRefreshStatus()
      }));
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Also check periodically for changes within the same tab
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [activeTab]);

  useEffect(() => {
    if (lastUpdated) {
      const freshness = Math.floor((new Date().getTime() - lastUpdated.getTime()) / (1000 * 60));
      setStats(prev => ({
        ...prev,
        dataFreshness: freshness
      }));
    }
  }, [lastUpdated]);

  const incrementReportsGenerated = () => {
    const newStats = {
      ...stats,
      totalReportsGenerated: stats.totalReportsGenerated + 1,
      lastExportTime: new Date()
    };
    setStats(newStats);
    
    // Save to localStorage
    localStorage.setItem('reports-stats', JSON.stringify({
      totalReportsGenerated: newStats.totalReportsGenerated,
      lastExportTime: newStats.lastExportTime?.toISOString()
    }));
  };

  // Expose increment function globally for other components
  useEffect(() => {
    (window as any).incrementReportsGenerated = incrementReportsGenerated;
    return () => {
      delete (window as any).incrementReportsGenerated;
    };
  }, [stats]);

  const handleManualRefresh = async () => {
    if (onRefreshData) {
      setIsLoading(true);
      try {
        await onRefreshData();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getFreshnessColor = () => {
    if (stats.dataFreshness <= 1) return 'text-green-600';
    if (stats.dataFreshness <= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFreshnessText = () => {
    if (stats.dataFreshness === 0) return 'À jour';
    if (stats.dataFreshness === 1) return '1 min';
    return `${stats.dataFreshness} min`;
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h3 className="font-medium text-blue-900">Statistiques des Rapports</h3>
        </div>
        <button
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
          title="Actualiser les données"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Reports Generated */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
            <span className="text-xs text-gray-600">Rapports générés</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {stats.totalReportsGenerated.toLocaleString()}
          </div>
        </div>

        {/* Active Filters */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <svg className="h-4 w-4 text-purple-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-gray-600">Filtres actifs</span>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {stats.activeFilters}
          </div>
        </div>

        {/* Auto-refresh Status */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Zap className="h-4 w-4 text-orange-600 mr-1" />
            <span className="text-xs text-gray-600">Auto-refresh</span>
          </div>
          <div className={`text-sm font-medium ${stats.autoRefreshEnabled ? 'text-green-600' : 'text-gray-500'}`}>
            {stats.autoRefreshEnabled ? 'Activé' : 'Désactivé'}
          </div>
        </div>

        {/* Data Freshness */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Clock className="h-4 w-4 text-blue-600 mr-1" />
            <span className="text-xs text-gray-600">Fraîcheur</span>
          </div>
          <div className={`text-sm font-medium ${getFreshnessColor()}`}>
            {getFreshnessText()}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <div className="flex items-center justify-between text-xs text-blue-700">
          <span>Dépôt: {currentYard?.name || 'Tous'}</span>
          {stats.lastExportTime && (
            <span>
              Dernier export: {stats.lastExportTime.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};