import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';
import {
  Clock,
  Truck,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  Timer,
  Users,
  Calendar,
  Download,
  Filter,
  BarChart3,
  Zap,
  Target
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { DatePicker } from '../Common/DatePicker';

interface OperationsTabProps {
  viewMode?: 'current' | 'global';
  selectedDepot?: string | null;
  availableYards?: any[];
  currentYard?: any;
}

interface OperationsData {
  dailyOperations: Array<{
    date: string;
    gateInOperations: number;
    gateOutOperations: number;
    avgProcessingTime: number;
    efficiency: number;
  }>;
  operatorPerformance: Array<{
    operatorName: string;
    operationsCompleted: number;
    avgProcessingTime: number;
    errorRate: number;
    efficiency: number;
  }>;
  processingTimes: Array<{
    operation: string;
    avgTime: number;
    target: number;
    variance: number;
  }>;
  hourlyDistribution: Array<{
    hour: string;
    gateIn: number;
    gateOut: number;
    total: number;
  }>;
  equipmentUtilization: Array<{
    equipment: string;
    utilizationRate: number;
    maintenanceHours: number;
    efficiency: number;
  }>;
  qualityMetrics: Array<{
    metric: string;
    current: number;
    target: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

// Generate mock operations data
const generateOperationsData = (): OperationsData => {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyOperations = last30Days.map(date => ({
    date,
    gateInOperations: Math.floor(Math.random() * 25) + 15,
    gateOutOperations: Math.floor(Math.random() * 20) + 10,
    avgProcessingTime: Math.floor(Math.random() * 10) + 15, // minutes
    efficiency: Math.floor(Math.random() * 20) + 80 // percentage
  }));

  const operatorPerformance = [
    { operatorName: 'Jane Operator', operationsCompleted: 245, avgProcessingTime: 12, errorRate: 2.1, efficiency: 94 },
    { operatorName: 'Mike Supervisor', operationsCompleted: 189, avgProcessingTime: 15, errorRate: 1.8, efficiency: 96 },
    { operatorName: 'Tom Wilson', operationsCompleted: 156, avgProcessingTime: 18, errorRate: 3.2, efficiency: 89 },
    { operatorName: 'Lisa Green', operationsCompleted: 134, avgProcessingTime: 14, errorRate: 2.5, efficiency: 92 },
    { operatorName: 'Robert Chen', operationsCompleted: 98, avgProcessingTime: 16, errorRate: 2.8, efficiency: 90 }
  ];

  const processingTimes = [
    { operation: 'Gate In Processing', avgTime: 14.5, target: 15, variance: -3.3 },
    { operation: 'Gate Out Processing', avgTime: 18.2, target: 20, variance: -9.0 },
    { operation: 'Container Inspection', avgTime: 25.8, target: 25, variance: 3.2 },
    { operation: 'Documentation Review', avgTime: 8.3, target: 10, variance: -17.0 },
    { operation: 'Location Assignment', avgTime: 5.2, target: 5, variance: 4.0 }
  ];

  const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
    const isBusinessHour = hour >= 6 && hour <= 18;
    const baseActivity = isBusinessHour ? 15 : 3;
    const variance = Math.floor(Math.random() * 10);

    return {
      hour: `${hour.toString().padStart(2, '0')}:00`,
      gateIn: baseActivity + variance,
      gateOut: Math.floor((baseActivity + variance) * 0.7),
      total: 0
    };
  }).map(item => ({
    ...item,
    total: item.gateIn + item.gateOut
  }));

  const equipmentUtilization = [
    { equipment: 'Reach Stacker #1', utilizationRate: 87, maintenanceHours: 12, efficiency: 94 },
    { equipment: 'Reach Stacker #2', utilizationRate: 92, maintenanceHours: 8, efficiency: 96 },
    { equipment: 'Forklift #1', utilizationRate: 78, maintenanceHours: 15, efficiency: 89 },
    { equipment: 'Forklift #2', utilizationRate: 85, maintenanceHours: 10, efficiency: 91 },
    { equipment: 'Mobile Crane', utilizationRate: 65, maintenanceHours: 20, efficiency: 88 }
  ];

  const qualityMetrics = [
    { metric: 'Processing Accuracy', current: 97.8, target: 98.0, trend: 'up' as const },
    { metric: 'On-Time Performance', current: 94.2, target: 95.0, trend: 'up' as const },
    { metric: 'Customer Satisfaction', current: 96.5, target: 95.0, trend: 'up' as const },
    { metric: 'Error Rate', current: 2.3, target: 2.0, trend: 'down' as const },
    { metric: 'Rework Rate', current: 1.8, target: 2.0, trend: 'stable' as const }
  ];

  return {
    dailyOperations,
    operatorPerformance,
    processingTimes,
    hourlyDistribution,
    equipmentUtilization,
    qualityMetrics
  };
};

export const OperationsTab: React.FC<OperationsTabProps> = ({
  viewMode = 'current',
  selectedDepot = null,
  availableYards = [],
  currentYard = null
}) => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedView, setSelectedView] = useState<'performance' | 'efficiency' | 'quality'>('performance');
  const { user, canViewAllData } = useAuth();

  const operationsData = useMemo(() => generateOperationsData(), []);

  // Generate multi-depot operations data for managers
  const getMultiDepotOperationsData = () => {
    if (viewMode !== 'global') return operationsData;

    if (selectedDepot) {
      // Return data for specific depot
      const depot = availableYards.find(d => d.id === selectedDepot);
      if (!depot) return operationsData;

      // Generate depot-specific operations data
      return {
        ...operationsData,
        depotName: depot.name,
        depotCode: depot.code
      };
    }

    // Return combined operations data for all depots
    if (availableYards.length === 0) {
      // If no yards are available, return base data without scaling
      return operationsData;
    }

    const combinedData = {
      ...operationsData,
      // Scale data by number of depots for global view
      dailyOperations: operationsData.dailyOperations.map(item => ({
        ...item,
        gateInOperations: item.gateInOperations * availableYards.length,
        gateOutOperations: item.gateOutOperations * availableYards.length
      })),
      operatorPerformance: operationsData.operatorPerformance.map(item => ({
        ...item,
        operationsCompleted: item.operationsCompleted * availableYards.length
      })),
      hourlyDistribution: operationsData.hourlyDistribution.map(item => ({
        ...item,
        gateIn: item.gateIn * availableYards.length,
        gateOut: item.gateOut * availableYards.length,
        total: item.total * availableYards.length
      }))
    };

    return combinedData;
  };

  const displayData = getMultiDepotOperationsData();

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes.toFixed(1)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins.toFixed(0)}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      case 'stable': return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isGoodWhenUp: boolean = true) => {
    if (trend === 'stable') return 'text-gray-600';
    const isPositive = isGoodWhenUp ? trend === 'up' : trend === 'down';
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  // Calculate key operational metrics
  const operationalMetrics = useMemo(() => {
    const totalOperations = displayData.dailyOperations.reduce(
      (sum, day) => sum + day.gateInOperations + day.gateOutOperations, 0
    );

    // Prevent division by zero
    const dailyOperationsCount = displayData.dailyOperations.length;
    const avgProcessingTime = dailyOperationsCount > 0
      ? displayData.dailyOperations.reduce((sum, day) => sum + day.avgProcessingTime, 0) / dailyOperationsCount
      : 0;
    const avgEfficiency = dailyOperationsCount > 0
      ? displayData.dailyOperations.reduce((sum, day) => sum + day.efficiency, 0) / dailyOperationsCount
      : 0;

    const peakHour = displayData.hourlyDistribution.length > 0
      ? displayData.hourlyDistribution.reduce((max, hour) => hour.total > max.total ? hour : max)
      : { hour: '00:00', total: 0 };

    return {
      totalOperations,
      avgProcessingTime,
      avgEfficiency,
      peakHour: peakHour.hour,
      peakVolume: peakHour.total
    };
  }, [displayData]);

  const showClientNotice = !canViewAllData() && user?.role === 'client';

  return (
    <div className="space-y-6">
      {/* Client Notice for Limited Data Access */}
      {showClientNotice && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <h3 className="font-medium text-yellow-900">Limited Data Access</h3>
              <p className="text-sm text-yellow-700">
                You are viewing operations data for <strong>{user?.company}</strong> only.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Depot Context Header for Global View */}
      {viewMode === 'global' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-600 text-white rounded-lg">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium text-orange-900">
                {selectedDepot
                  ? `${availableYards.find(d => d.id === selectedDepot)?.name} Operations`
                  : 'Global Operations Dashboard'
                }
              </h3>
              <p className="text-sm text-orange-700">
                {selectedDepot
                  ? 'Individual depot operational metrics and efficiency'
                  : `Combined operations data across ${availableYards.length} depots`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Operational Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Operations</p>
              <p className="text-2xl font-bold text-gray-900">{operationalMetrics.totalOperations.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600 font-medium">+15.2%</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
              <p className="text-2xl font-bold text-gray-900">{formatTime(operationalMetrics.avgProcessingTime)}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1 rotate-180" />
                <span className="text-sm text-green-600 font-medium">-8.5%</span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <Timer className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Efficiency Rate</p>
              <p className="text-2xl font-bold text-gray-900">{operationalMetrics.avgEfficiency.toFixed(1)}%</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600 font-medium">+3.2%</span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Peak Hour</p>
              <p className="text-2xl font-bold text-gray-900">{operationalMetrics.peakHour}</p>
              <div className="text-sm text-gray-600 mt-2">
                {operationalMetrics.peakVolume} operations
              </div>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
            </div>
            <div className="flex items-center space-x-2">
              <DatePicker
                value={dateRange.start}
                onChange={(date) => setDateRange(prev => ({ ...prev, start: date }))}
                placeholder="Start date"
                className="w-40"
              />
              <span className="text-gray-400">to</span>
              <DatePicker
                value={dateRange.end}
                onChange={(date) => setDateRange(prev => ({ ...prev, end: date }))}
                placeholder="End date"
                className="w-40"
                minDate={dateRange.start || undefined}
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { id: 'performance', label: 'Performance', icon: Target },
                { id: 'efficiency', label: 'Efficiency', icon: Zap },
                { id: 'quality', label: 'Quality', icon: CheckCircle }
              ].map(view => {
                const Icon = view.icon;
                return (
                  <button
                    key={view.id}
                    onClick={() => setSelectedView(view.id as any)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-1 ${
                      selectedView === view.id
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{view.label}</span>
                  </button>
                );
              })}
            </div>
            <button className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Daily Operations Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Daily Operations Performance</h3>
              <p className="text-sm text-gray-600">Gate operations and efficiency trends</p>
            </div>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={displayData.dailyOperations.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'efficiency') return [`${value}%`, 'Efficiency'];
                  return [value, name === 'gateInOperations' ? 'Gate In' : 'Gate Out'];
                }}
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar yAxisId="left" dataKey="gateInOperations" fill="#3b82f6" name="Gate In" radius={[2, 2, 0, 0]} />
              <Bar yAxisId="left" dataKey="gateOutOperations" fill="#10b981" name="Gate Out" radius={[2, 2, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Processing Times Analysis */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Processing Times vs Targets</h3>
              <p className="text-sm text-gray-600">Performance against target times</p>
            </div>
            <Timer className="h-5 w-5 text-gray-400" />
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={displayData.processingTimes} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis
                type="category"
                dataKey="operation"
                stroke="#64748b"
                fontSize={11}
                width={120}
              />
              <Tooltip
                formatter={(value, name) => [
                  name === 'avgTime' ? `${value} min (Actual)` : `${value} min (Target)`,
                  name === 'avgTime' ? 'Actual Time' : 'Target Time'
                ]}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="target" fill="#e5e7eb" name="Target" radius={[0, 2, 2, 0]} />
              <Bar dataKey="avgTime" fill="#3b82f6" name="Actual" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Operations Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Hourly Operations Distribution</h3>
              <p className="text-sm text-gray-600">Operations volume throughout the day</p>
            </div>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={displayData.hourlyDistribution}>
              <defs>
                <linearGradient id="operationsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip
                formatter={(value, name) => [value, name === 'total' ? 'Total Operations' : name]}
                labelFormatter={(label) => `Time: ${label}`}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#8b5cf6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#operationsGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quality Metrics */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Quality Metrics</h3>
              <p className="text-sm text-gray-600">Performance indicators and targets</p>
            </div>
            <Target className="h-5 w-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            {displayData.qualityMetrics.map((metric, index) => {
              const isOnTarget = metric.current >= metric.target;
              const isErrorMetric = metric.metric.toLowerCase().includes('error') || metric.metric.toLowerCase().includes('rework');

              return (
                <div key={metric.metric} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getTrendIcon(metric.trend)}
                    <div>
                      <div className="font-medium text-gray-900">{metric.metric}</div>
                      <div className="text-sm text-gray-600">Target: {metric.target}{isErrorMetric ? '%' : '%'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      isErrorMetric
                        ? (metric.current <= metric.target ? 'text-green-600' : 'text-red-600')
                        : (isOnTarget ? 'text-green-600' : 'text-red-600')
                    }`}>
                      {metric.current}%
                    </div>
                    <div className={`text-sm ${getTrendColor(metric.trend, !isErrorMetric)}`}>
                      {metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'} Trending {metric.trend}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Operator Performance Table */}
      {canViewAllData() && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Operator Performance Analysis</h3>
            <p className="text-sm text-gray-600">Individual operator metrics and efficiency</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operations Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Processing Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Efficiency Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayData.operatorPerformance.map((operator, index) => (
                  <tr key={operator.operatorName} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{operator.operatorName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{operator.operationsCompleted.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatTime(operator.avgProcessingTime)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        operator.errorRate <= 2 ? 'bg-green-100 text-green-800' :
                        operator.errorRate <= 3 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {operator.errorRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                          <div
                            className={`h-2 rounded-full ${
                              operator.efficiency >= 95 ? 'bg-green-500' :
                              operator.efficiency >= 90 ? 'bg-blue-500' :
                              operator.efficiency >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${operator.efficiency}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{operator.efficiency}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        operator.efficiency >= 95 ? 'bg-green-100 text-green-800' :
                        operator.efficiency >= 90 ? 'bg-blue-100 text-blue-800' :
                        operator.efficiency >= 85 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {operator.efficiency >= 95 ? 'Excellent' :
                         operator.efficiency >= 90 ? 'Good' :
                         operator.efficiency >= 85 ? 'Average' : 'Needs Improvement'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Equipment Utilization */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Equipment Utilization</h3>
            <p className="text-sm text-gray-600">Yard equipment performance and maintenance</p>
          </div>
          <Truck className="h-5 w-5 text-gray-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayData.equipmentUtilization.map((equipment, index) => (
            <div key={equipment.equipment} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{equipment.equipment}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  equipment.utilizationRate >= 90 ? 'bg-green-100 text-green-800' :
                  equipment.utilizationRate >= 80 ? 'bg-blue-100 text-blue-800' :
                  equipment.utilizationRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {equipment.utilizationRate}% utilized
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Efficiency:</span>
                  <span className="font-medium">{equipment.efficiency}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Maintenance Hours:</span>
                  <span className="font-medium">{equipment.maintenanceHours}h</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Utilization Rate</span>
                  <span>{equipment.utilizationRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      equipment.utilizationRate >= 90 ? 'bg-green-500' :
                      equipment.utilizationRate >= 80 ? 'bg-blue-500' :
                      equipment.utilizationRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${equipment.utilizationRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
