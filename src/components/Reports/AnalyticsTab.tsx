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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Package, 
  DollarSign, 
  Clock,
  Building,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Filter,
  Download
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { DatePicker } from '../Common/DatePicker';

interface AnalyticsData {
  containerMovements: Array<{
    date: string;
    gateIn: number;
    gateOut: number;
    total: number;
  }>;
  clientDistribution: Array<{
    clientCode: string;
    clientName: string;
    containers: number;
    revenue: number;
    percentage: number;
  }>;
  revenueAnalytics: Array<{
    month: string;
    revenue: number;
    containers: number;
    avgDaysInDepot: number;
  }>;
  occupancyTrends: Array<{
    date: string;
    occupancy: number;
    capacity: number;
    utilizationRate: number;
  }>;
  containerTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

// Generate mock analytics data
const generateAnalyticsData = (): AnalyticsData => {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  const containerMovements = last30Days.map(date => ({
    date,
    gateIn: Math.floor(Math.random() * 20) + 5,
    gateOut: Math.floor(Math.random() * 15) + 3,
    total: 0
  })).map(item => ({
    ...item,
    total: item.gateIn + item.gateOut
  }));

  const clientDistribution = [
    { clientCode: 'MAEU', clientName: 'Maersk Line', containers: 245, revenue: 125600, percentage: 35 },
    { clientCode: 'MSCU', clientName: 'MSC Mediterranean', containers: 189, revenue: 98400, percentage: 27 },
    { clientCode: 'CMDU', clientName: 'CMA CGM', containers: 156, revenue: 78900, percentage: 22 },
    { clientCode: 'SHIP001', clientName: 'Shipping Solutions', containers: 78, revenue: 42300, percentage: 11 },
    { clientCode: 'HLCU', clientName: 'Hapag-Lloyd', containers: 45, revenue: 23800, percentage: 5 }
  ];

  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  });

  const revenueAnalytics = last12Months.map(month => ({
    month,
    revenue: Math.floor(Math.random() * 50000) + 80000,
    containers: Math.floor(Math.random() * 200) + 600,
    avgDaysInDepot: Math.floor(Math.random() * 5) + 8
  }));

  const occupancyTrends = last30Days.map(date => {
    const capacity = 2500;
    const occupancy = Math.floor(Math.random() * 500) + 1800;
    return {
      date,
      occupancy,
      capacity,
      utilizationRate: (occupancy / capacity) * 100
    };
  });

  const containerTypes = [
    { type: 'Dry Container', count: 1456, percentage: 72 },
    { type: 'Reefer', count: 324, percentage: 16 },
    { type: 'Tank', count: 156, percentage: 8 },
    { type: 'Flat Rack', count: 64, percentage: 3 },
    { type: 'Open Top', count: 24, percentage: 1 }
  ];

  return {
    containerMovements,
    clientDistribution,
    revenueAnalytics,
    occupancyTrends,
    containerTypes
  };
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const AnalyticsTab: React.FC = () => {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'containers' | 'occupancy'>('revenue');
  const { user, canViewAllData, getClientFilter } = useAuth();

  const analyticsData = useMemo(() => generateAnalyticsData(), []);

  // Filter data based on user permissions
  const getFilteredData = () => {
    const clientFilter = getClientFilter();
    if (clientFilter) {
      // Filter client distribution to show only user's data
      const filteredClientDistribution = analyticsData.clientDistribution.filter(
        client => client.clientCode === clientFilter
      );
      
      return {
        ...analyticsData,
        clientDistribution: filteredClientDistribution
      };
    }
    return analyticsData;
  };

  const filteredData = getFilteredData();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    const totalRevenue = filteredData.revenueAnalytics.reduce((sum, item) => sum + item.revenue, 0);
    const totalContainers = filteredData.containerMovements.reduce((sum, item) => sum + item.total, 0);
    const avgOccupancy = filteredData.occupancyTrends.reduce((sum, item) => sum + item.utilizationRate, 0) / filteredData.occupancyTrends.length;
    const totalGateIn = filteredData.containerMovements.reduce((sum, item) => sum + item.gateIn, 0);
    const totalGateOut = filteredData.containerMovements.reduce((sum, item) => sum + item.gateOut, 0);

    return {
      totalRevenue,
      totalContainers,
      avgOccupancy,
      totalGateIn,
      totalGateOut,
      netMovement: totalGateIn - totalGateOut
    };
  }, [filteredData]);

  const showClientNotice = !canViewAllData() && user?.role === 'client';

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(keyMetrics.totalRevenue)}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600 font-medium">+12.5%</span>
                <span className="text-xs text-gray-500 ml-1">vs last period</span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Container Movements</p>
              <p className="text-2xl font-bold text-gray-900">{keyMetrics.totalContainers.toLocaleString()}</p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm text-blue-600 font-medium">+8.3%</span>
                <span className="text-xs text-gray-500 ml-1">vs last period</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Occupancy</p>
              <p className="text-2xl font-bold text-gray-900">{keyMetrics.avgOccupancy.toFixed(1)}%</p>
              <div className="flex items-center mt-2">
                <TrendingDown className="h-4 w-4 text-orange-500 mr-1" />
                <span className="text-sm text-orange-600 font-medium">-2.1%</span>
                <span className="text-xs text-gray-500 ml-1">vs last period</span>
              </div>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Movement</p>
              <p className="text-2xl font-bold text-gray-900">{keyMetrics.netMovement > 0 ? '+' : ''}{keyMetrics.netMovement}</p>
              <div className="flex items-center mt-2">
                {keyMetrics.netMovement > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm font-medium ${keyMetrics.netMovement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(keyMetrics.netMovement)} containers
                </span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
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
                minDate={dateRange.start}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="revenue">Revenue Focus</option>
              <option value="containers">Container Focus</option>
              <option value="occupancy">Occupancy Focus</option>
            </select>
            <button className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Container Movements Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Container Movements (Last 30 Days)</h3>
              <p className="text-sm text-gray-600">Daily gate in/out operations</p>
            </div>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filteredData.containerMovements.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip 
                formatter={(value, name) => [value, name === 'gateIn' ? 'Gate In' : 'Gate Out']}
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar dataKey="gateIn" fill="#3b82f6" name="Gate In" radius={[2, 2, 0, 0]} />
              <Bar dataKey="gateOut" fill="#10b981" name="Gate Out" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Client Distribution Pie Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {showClientNotice ? 'Your Container Distribution' : 'Client Distribution'}
              </h3>
              <p className="text-sm text-gray-600">Container volume by client</p>
            </div>
            <PieChartIcon className="h-5 w-5 text-gray-400" />
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={filteredData.clientDistribution}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="containers"
                label={({ clientCode, percentage }) => `${clientCode} (${percentage}%)`}
                labelLine={false}
              >
                {filteredData.clientDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name, props) => [
                  `${value} containers`,
                  canViewAllData ? props.payload.clientName : 'Your Company'
                ]}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Trends */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Revenue Trends (12 Months)</h3>
              <p className="text-sm text-gray-600">Monthly revenue and container volume</p>
            </div>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={filteredData.revenueAnalytics}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `$${value/1000}k`} />
              <Tooltip 
                formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#revenueGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy Trends */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Yard Occupancy Trends</h3>
              <p className="text-sm text-gray-600">Daily utilization rates</p>
            </div>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData.occupancyTrends.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={12}
                domain={[60, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                formatter={(value) => [`${(value as number).toFixed(1)}%`, 'Utilization Rate']}
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="utilizationRate" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Container Types Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Container Types Distribution</h3>
            <p className="text-sm text-gray-600">Breakdown by container type</p>
          </div>
          <Package className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={filteredData.containerTypes}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="count"
              >
                {filteredData.containerTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => [`${value} containers`, 'Count']}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="space-y-3">
            {filteredData.containerTypes.map((type, index) => (
              <div key={type.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="font-medium text-gray-900">{type.type}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{type.count.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">{type.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Client Performance Table */}
      {canViewAllData() && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Client Performance Analysis</h3>
            <p className="text-sm text-gray-600">Revenue and container volume by client</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Containers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Market Share
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Revenue/Container
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.clientDistribution.map((client, index) => (
                  <tr key={client.clientCode} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-3"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{client.clientName}</div>
                          <div className="text-sm text-gray-500">{client.clientCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{client.containers.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(client.revenue)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                          <div
                            className="h-2 rounded-full"
                            style={{ 
                              width: `${client.percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{client.percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(client.revenue / client.containers)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};