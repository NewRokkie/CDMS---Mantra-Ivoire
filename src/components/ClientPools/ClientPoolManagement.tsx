import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  Settings, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  TrendingUp,
  Building,
  X,
  Loader,
  Calendar
} from 'lucide-react';
import { ClientPool, ClientPoolStats } from '../../types/clientPool';
import { useAuth } from '../../hooks/useAuth';
import { clientPoolService } from '../../services/clientPoolService';
import { ClientPoolForm } from './ClientPoolForm';

export const ClientPoolManagement: React.FC = () => {
  const [clientPools, setClientPools] = useState<ClientPool[]>([]);
  const [stats, setStats] = useState<ClientPoolStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedPool, setSelectedPool] = useState<ClientPool | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Mock yard data for the form
  const mockYard = {
    id: 'depot-tantarelli',
    name: 'Depot Tantarelli',
    description: 'Main container depot',
    location: 'Tantarelli Port Complex',
    isActive: true,
    totalCapacity: 2500,
    currentOccupancy: 1847,
    sections: [
      {
        id: 'section-top',
        name: 'Top Section',
        yardId: 'depot-tantarelli',
        stacks: Array.from({ length: 16 }, (_, i) => ({
          id: `stack-${[1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31][i]}`,
          stackNumber: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31][i],
          sectionId: 'section-top',
          rows: i === 0 || i === 15 ? (i === 0 ? 4 : 7) : 5,
          maxTiers: 5,
          currentOccupancy: Math.floor(Math.random() * 25),
          capacity: (i === 0 ? 4 : i === 15 ? 7 : 5) * 5,
          position: { x: 0, y: 0, z: 0 },
          dimensions: { width: 12, length: 6 },
          containerPositions: [],
          isOddStack: true
        })),
        position: { x: 0, y: 0, z: 0 },
        dimensions: { width: 400, length: 120 },
        color: '#3b82f6'
      },
      {
        id: 'section-center',
        name: 'Center Section',
        yardId: 'depot-tantarelli',
        stacks: Array.from({ length: 12 }, (_, i) => ({
          id: `stack-${[33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55][i]}`,
          stackNumber: [33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55][i],
          sectionId: 'section-center',
          rows: i < 4 ? 5 : 4,
          maxTiers: 5,
          currentOccupancy: Math.floor(Math.random() * 25),
          capacity: (i < 4 ? 5 : 4) * 5,
          position: { x: 0, y: 0, z: 0 },
          dimensions: { width: 12, length: 6 },
          containerPositions: [],
          isOddStack: true
        })),
        position: { x: 0, y: 140, z: 0 },
        dimensions: { width: 400, length: 100 },
        color: '#f59e0b'
      },
      {
        id: 'section-bottom',
        name: 'Bottom Section',
        yardId: 'depot-tantarelli',
        stacks: Array.from({ length: 22 }, (_, i) => ({
          id: `stack-${[61, 63, 65, 67, 69, 71, 73, 75, 77, 79, 81, 83, 85, 87, 89, 91, 93, 95, 97, 99, 101, 103][i]}`,
          stackNumber: [61, 63, 65, 67, 69, 71, 73, 75, 77, 79, 81, 83, 85, 87, 89, 91, 93, 95, 97, 99, 101, 103][i],
          sectionId: 'section-bottom',
          rows: i < 6 ? 6 : i < 18 ? 4 : (i === 20 ? 1 : 2),
          maxTiers: 5,
          currentOccupancy: Math.floor(Math.random() * 30),
          capacity: (i < 6 ? 6 : i < 18 ? 4 : (i === 20 ? 1 : 2)) * 5,
          position: { x: 0, y: 0, z: 0 },
          dimensions: { width: 12, length: 6 },
          containerPositions: [],
          isOddStack: true
        })),
        position: { x: 0, y: 260, z: 0 },
        dimensions: { width: 400, length: 140 },
        color: '#10b981'
      }
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    layout: 'tantarelli' as const
  };
  const canManageClientPools = user?.role === 'admin' || user?.role === 'supervisor';

  useEffect(() => {
    loadClientPools();
  }, []);

  const loadClientPools = async () => {
    try {
      setIsLoading(true);
      const pools = clientPoolService.getClientPools();
      const poolStats = clientPoolService.getClientPoolStats();
      
      setClientPools(pools);
      setStats(poolStats);
    } catch (error) {
      console.error('Error loading client pools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPools = clientPools.filter(pool => {
    const matchesSearch = pool.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pool.clientCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && pool.isActive) ||
                         (statusFilter === 'inactive' && !pool.isActive);
    return matchesSearch && matchesStatus;
  });

  const getUtilizationColor = (occupancy: number, capacity: number) => {
    const rate = (occupancy / capacity) * 100;
    if (rate >= 90) return 'text-red-600 bg-red-100';
    if (rate >= 75) return 'text-orange-600 bg-orange-100';
    if (rate >= 25) return 'text-green-600 bg-green-100';
    return 'text-blue-600 bg-blue-100';
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    const config = {
      high: { color: 'bg-red-100 text-red-800', label: 'High' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
      low: { color: 'bg-green-100 text-green-800', label: 'Low' }
    };
    
    const { color, label } = config[priority] || config['low'];
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {label}
      </span>
    );
  };

  const handleCreatePool = (data: any) => {
    try {
      const newPool = clientPoolService.createClientPool(
        data.clientId,
        data.clientCode,
        data.clientName,
        data.assignedStacks,
        data.maxCapacity,
        new Date(data.contractStartDate),
        data.contractEndDate ? new Date(data.contractEndDate) : undefined,
        data.notes
      );
      
      // Assign stacks to the client
      clientPoolService.bulkAssignStacksToClient(
        data.assignedStacks,
        data.clientCode,
        user?.name || 'System'
      );
      
      loadClientPools();
      setShowForm(false);
      setSelectedPool(null);
      alert(`Client pool created successfully for ${data.clientName}!`);
    } catch (error) {
      alert(`Error creating client pool: ${error}`);
    }
  };

  const handleUpdatePool = (data: any) => {
    if (!selectedPool) return;
    
    try {
      clientPoolService.updateClientPool(selectedPool.clientCode, {
        assignedStacks: data.assignedStacks,
        maxCapacity: data.maxCapacity,
        contractStartDate: new Date(data.contractStartDate),
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : undefined,
        notes: data.notes
      });
      
      loadClientPools();
      setShowForm(false);
      setSelectedPool(null);
      alert(`Client pool updated successfully for ${data.clientName}!`);
    } catch (error) {
      alert(`Error updating client pool: ${error}`);
    }
  };


  if (!canManageClientPools) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to manage client pools.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading client pools...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Client Pool Management</h2>
          <p className="text-gray-600">Manage customer-specific stack assignments and capacity allocation</p>
        </div>
        <button
          onClick={() => {
            setSelectedPool(null);
            setShowForm(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Client Pool</span>
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Pools</p>
                <p className="text-lg font-semibold text-gray-900">{stats.totalPools}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Active Clients</p>
                <p className="text-lg font-semibold text-gray-900">{stats.activeClients}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Assigned Stacks</p>
                <p className="text-lg font-semibold text-gray-900">{stats.totalAssignedStacks}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Avg Utilization</p>
                <p className="text-lg font-semibold text-gray-900">{stats.averageOccupancy.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search client pools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4" />
            <span>Advanced Filter</span>
          </button>
        </div>
      </div>

      {/* Client Pools Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Client Pool Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Stacks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
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
              {filteredPools.map((pool) => {
                const utilizationRate = (pool.currentOccupancy / pool.maxCapacity) * 100;
                
                return (
                  <tr key={pool.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{pool.clientName}</div>
                          <div className="text-sm text-gray-500">{pool.clientCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pool.assignedStacks.length} stacks</div>
                      <div className="text-sm text-gray-500">
                        {pool.assignedStacks.slice(0, 3).map(stackId => 
                          `S${clientPoolService['extractStackNumber'](stackId).toString().padStart(2, '0')}`
                        ).join(', ')}
                        {pool.assignedStacks.length > 3 && ` +${pool.assignedStacks.length - 3} more`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pool.currentOccupancy} / {pool.maxCapacity}</div>
                      <div className="text-sm text-gray-500">containers</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${getUtilizationColor(pool.currentOccupancy, pool.maxCapacity)}`}>
                            {utilizationRate.toFixed(1)}%
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full ${
                                utilizationRate >= 90 ? 'bg-red-500' :
                                utilizationRate >= 75 ? 'bg-orange-500' :
                                utilizationRate >= 25 ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPriorityBadge(pool.priority)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        pool.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {pool.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedPool(pool)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPool(pool);
                            setShowForm(true);
                          }}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete the pool for ${pool.clientName}?`)) {
                              // Handle delete
                              console.log('Delete pool:', pool.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredPools.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No client pools found</h3>
            <p className="text-gray-600">
              {searchTerm ? "Try adjusting your search criteria." : "No client pools have been created yet."}
            </p>
          </div>
        )}
      </div>

      {/* Client Pool Form Modal */}
      {showForm && (
        <ClientPoolForm
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedPool(null);
          }}
          onSubmit={selectedPool ? handleUpdatePool : handleCreatePool}
          selectedPool={selectedPool}
          yard={mockYard}
          isLoading={false}
        />
      )}

      {/* Utilization Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Pool Utilization Overview</h3>
          <BarChart3 className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {clientPoolService.getClientPoolUtilization().map((util) => (
            <div key={util.clientCode} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{util.clientCode}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  util.status === 'critical' ? 'bg-red-100 text-red-800' :
                  util.status === 'high' ? 'bg-orange-100 text-orange-800' :
                  util.status === 'optimal' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {util.status}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <div>Utilization: {util.occupancyRate.toFixed(1)}%</div>
                <div>Available: {util.availableCapacity} slots</div>
                <div>Stacks: {util.assignedStacks}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};