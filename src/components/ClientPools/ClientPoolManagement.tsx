import React, { useState, useEffect } from 'react';
import { Users, Package, Plus, Search, Filter, CreditCard as Edit, Trash2, Eye, AlertTriangle, CheckCircle, BarChart3, TrendingUp, Building } from 'lucide-react';
import { ClientPool, ClientPoolStats } from '../../types/clientPool';
import { supabase } from '../../services/api/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { clientPoolService } from '../../services/api';
import { stackService } from '../../services/api';
import { ClientPoolForm } from './ClientPoolForm';
import { StackDetailsModal } from './StackDetailsModal';
import { ClientPoolViewModal } from './ClientPoolViewModal';
import { useYard } from '../../hooks/useYard';
import { DesktopOnlyMessage } from '../Common/DesktopOnlyMessage';
import { handleError } from '../../services/errorHandling';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../hooks/useConfirm';

export const ClientPoolManagement: React.FC = () => {
  const [clientPools, setClientPools] = useState<ClientPool[]>([]);
  const [stats, setStats] = useState<ClientPoolStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedPool, setSelectedPool] = useState<ClientPool | null>(null);
  const [showStackDetails, setShowStackDetails] = useState(false);
  const [selectedStack, setSelectedStack] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [assignedStacksData, setAssignedStacksData] = useState<Map<string, any>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [realYardData, setRealYardData] = useState<any>(null);
  const { user } = useAuth();
  const { currentYard } = useYard();
  const toast = useToast();
  const { confirm } = useConfirm();
  const canManageClientPools = async () => {
    if (!user) return false;

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    return userProfile?.role === 'admin' || userProfile?.role === 'supervisor';
  };

  useEffect(() => {
    loadClientPools();
    loadRealYardData();
  }, [currentYard?.id]);

  const loadRealYardData = async () => {
    if (!currentYard?.id) return;

    try {
      // Fetch real stacks from the database
      const allStacks = await stackService.getAll(currentYard.id);
      
      // Filter out virtual stacks - only show physical stacks
      // Virtual stacks are automatically handled when physical stacks are assigned
      const physicalStacks = allStacks.filter(stack => {
        // Virtual stacks have even stack numbers (S02, S04, S06, etc.)
        // Physical stacks have odd stack numbers (S01, S03, S05, etc.)
        return stack.stackNumber % 2 !== 0;
      });
      
      // Group stacks by section
      const stacksBySection = new Map<string, any[]>();
      
      physicalStacks.forEach(stack => {
        const sectionId = stack.sectionId || 'default-section';
        if (!stacksBySection.has(sectionId)) {
          stacksBySection.set(sectionId, []);
        }
        stacksBySection.get(sectionId)?.push(stack);
      });

      // Create sections from grouped stacks
      const sections = Array.from(stacksBySection.entries()).map(([sectionId, stacks]) => ({
        id: sectionId,
        name: stacks[0]?.sectionName || 'Unknown Section',
        yardId: currentYard.id,
        stacks: stacks,
        position: { x: 0, y: 0, z: 0 },
        dimensions: { width: 400, length: 120 },
        color: '#3b82f6'
      }));

      // Create yard data structure
      const yardData = {
        id: currentYard.id,
        name: currentYard.name,
        code: currentYard.code || 'YARD-01',
        description: currentYard.description || '',
        location: currentYard.location || '',
        isActive: currentYard.isActive,
        totalCapacity: currentYard.totalCapacity || 0,
        currentOccupancy: currentYard.currentOccupancy || 0,
        sections: sections,
        createdAt: currentYard.createdAt,
        updatedAt: currentYard.updatedAt,
        createdBy: currentYard.createdBy,
        layout: currentYard.layout || 'default'
      };

      setRealYardData(yardData);
    } catch (error) {
      handleError(error, 'ClientPoolManagement.loadRealYardData');
      // Fallback to empty yard structure
      setRealYardData({
        id: currentYard.id,
        name: currentYard.name,
        code: currentYard.code || 'YARD-01',
        sections: [],
        isActive: true,
        totalCapacity: 0,
        currentOccupancy: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'System',
        layout: 'default'
      });
    }
  };

  const loadClientPools = async () => {
    try {
      setIsLoading(true);

      const pools = await clientPoolService.getAll(currentYard?.id).catch(err => { 
        handleError(err, 'ClientPoolManagement.loadClientPools');
        return []; 
      });
      const poolStats = await clientPoolService.getStats(currentYard?.id).catch(err => { 
        handleError(err, 'ClientPoolManagement.loadPoolStats');
        return null; 
      });

      setClientPools(pools || []);
      setStats(poolStats);

      // Load stack details for all assigned stacks
      if (pools && pools.length > 0 && currentYard?.id) {
        const allAssignedStackIds = pools.flatMap(pool => pool.assignedStacks);
        const uniqueStackIds = [...new Set(allAssignedStackIds)];

        if (uniqueStackIds.length > 0) {
          try {
            const stacksData = await Promise.all(
              uniqueStackIds.map(async (stackId) => {
                try {
                  const stack = await stackService.getById(stackId);
                  return stack ? [stackId, stack] : null;
                } catch {
                  return null;
                }
              })
            );

            const stacksMap = new Map(stacksData.filter(Boolean) as [string, any][]);
            setAssignedStacksData(stacksMap);
          } catch (error) {
            handleError(error, 'ClientPoolManagement.loadAssignedStacks');
          }
        }
      }
    } catch (error) {
      handleError(error, 'ClientPoolManagement.loadClientPools');
      setClientPools([]);
      setStats(null);
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

  const getPriorityBadge = (
    priority: 'high' | 'medium' | 'low'
  ) => {
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

  const handleViewStackDetails = async (stackId: string) => {
    try {
      const cachedStack = assignedStacksData.get(stackId);
      if (cachedStack) {
        setSelectedStack(cachedStack);
        setShowStackDetails(true);
        return;
      }

      const stackDetails = await stackService.getById(stackId);
      if (stackDetails) {
        setSelectedStack(stackDetails);
        setShowStackDetails(true);
        setAssignedStacksData(prev => new Map(prev.set(stackId, stackDetails)));
      } else {
        toast.warning('Stack details not found')
      }
    } catch (error) {
      handleError(error, 'ClientPoolManagement.handleViewStackDetails');
      toast.error('Error loading stack details')
    }
  };

  const handleCreatePool = async (data: any) => {
    if (!user || !currentYard) return;
    
    // Prevent duplicate submissions
    if (isProcessing) {
      console.warn('Pool creation already in progress, ignoring duplicate submission');
      return;
    }

    try {
      setIsProcessing(true);
      
      const newPool = await clientPoolService.create({
        yardId: currentYard.id,
        clientId: data.clientId,
        clientCode: data.clientCode,
        clientName: data.clientName,
        assignedStacks: data.assignedStacks || [],
        maxCapacity: data.maxCapacity,
        priority: data.priority || 'medium',
        contractStartDate: new Date(data.contractStartDate),
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : undefined,
        notes: data.notes
      }, user.id);

      if (data.assignedStacks && data.assignedStacks.length > 0) {
        for (const stackId of data.assignedStacks) {
          try {
            // Fetch the actual stack data to get the stack number
            const stack = await stackService.getById(stackId);
            if (!stack) {
              console.warn(`Stack ${stackId} not found, skipping assignment`);
              continue;
            }

            await clientPoolService.assignStack({
              yardId: currentYard.id,
              stackId,
              stackNumber: stack.stackNumber,
              clientPoolId: newPool.id,
              clientCode: data.clientCode,
              isExclusive: false,
              priority: 1
            }, user.id);
          } catch (stackError) {
            handleError(stackError, `ClientPoolManagement.assignStack-${stackId}`);
            console.error(`Failed to assign stack ${stackId}:`, stackError);
          }
        }
      }

      await loadClientPools();
      setShowForm(false);
      setSelectedPool(null);
      toast.success(`Client pool created successfully for ${data.clientName}!`)
    } catch (error) {
      handleError(error, 'ClientPoolManagement.handleCreatePool');
      toast.error(`Error creating client pool: ${error}`)
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePool = async (data: any) => {
    if (!selectedPool || !user || !currentYard) return;
    
    // Prevent duplicate submissions
    if (isProcessing) {
      console.warn('Pool update already in progress, ignoring duplicate submission');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Update the client pool
      await clientPoolService.update(selectedPool.id, {
        assignedStacks: data.assignedStacks || [],
        maxCapacity: data.maxCapacity,
        priority: data.priority,
        contractStartDate: new Date(data.contractStartDate),
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : undefined,
        notes: data.notes
      }, user.id);

      // Handle stack assignments
      // Get the difference between old and new assignments
      const oldStacks = new Set<string>(selectedPool.assignedStacks);
      const newStacks = new Set<string>(data.assignedStacks || []);

      // Find stacks to add (in new but not in old)
      const stacksToAdd = Array.from(newStacks).filter(id => !oldStacks.has(id));

      // Find stacks to remove (in old but not in new)
      const stacksToRemove = Array.from(oldStacks).filter(id => !newStacks.has(id));

      // Add new stack assignments
      for (const stackId of stacksToAdd) {
        try {
          const stack = await stackService.getById(stackId as string);
          if (!stack) {
            console.warn(`Stack ${stackId} not found, skipping assignment`);
            continue;
          }

          await clientPoolService.assignStack({
            yardId: currentYard.id,
            stackId: stackId as string,
            stackNumber: stack.stackNumber,
            clientPoolId: selectedPool.id,
            clientCode: data.clientCode,
            isExclusive: false,
            priority: 1
          }, user.id);
        } catch (stackError) {
          handleError(stackError, `ClientPoolManagement.assignStack-${stackId}`);
        }
      }

      // Remove old stack assignments
      // Note: This requires getting the assignment IDs first
      if (stacksToRemove.length > 0) {
        try {
          const assignments = await clientPoolService.getStackAssignments(selectedPool.id);
          for (const stackId of stacksToRemove) {
            const assignment = assignments.find(a => a.stackId === (stackId as string));
            if (assignment) {
              await clientPoolService.unassignStack(assignment.id);
            }
          }
        } catch (removeError) {
          handleError(removeError, 'ClientPoolManagement.removeStackAssignments');
        }
      }

      await loadClientPools();
      setShowForm(false);
      setSelectedPool(null);
      toast.success(`Client pool updated successfully for ${data.clientName}!`)
    } catch (error) {
      handleError(error, 'ClientPoolManagement.handleUpdatePool');
      toast.error(`Error updating client pool: ${error}`)
    } finally {
      setIsProcessing(false);
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

  const DesktopContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Client Pool Management</h2>
          <p className="text-gray-600">
            Manage customer-specific stack assignments and capacity allocation
            {currentYard && (
              <span className="ml-2 text-blue-600 font-medium">
                • {currentYard.name} ({currentYard.code})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            if (!realYardData) {
              toast.info('Loading yard data... Please wait.')
              return;
            }
            if (!realYardData.sections || realYardData.sections.length === 0) {
              toast.warning('No stacks found in this yard. Please create stacks in Stack Management first.')
              return;
            }
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Stacks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                        {pool.assignedStacks.slice(0, 3).map(stackId => {
                          const stack = assignedStacksData.get(stackId);
                          return stack ? `S${stack.stackNumber.toString().padStart(2, '0')}` : stackId;
                        }).join(', ')} {pool.assignedStacks.length > 3 && ` +${pool.assignedStacks.length - 3} more`}
                      </div>
                      {pool.assignedStacks.length > 0 && (
                        <button
                          onClick={() => handleViewStackDetails(pool.assignedStacks[0])}
                          className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                        >
                          View stack details →
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{pool.currentOccupancy} / {pool.maxCapacity}</div>
                      <div className="text-sm text-gray-500">containers</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div
                            className={`text-sm font-medium ${getUtilizationColor(pool.currentOccupancy, pool.maxCapacity)}`}>
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
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${(pool.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}`}>
                        {pool.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedPool(pool);
                            setShowViewModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (!realYardData) {
                              toast.info('Loading yard data... Please wait.')
                              return;
                            }
                            setSelectedPool(pool);
                            setShowForm(true);
                          }}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="Edit Pool"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            confirm({
                              title: 'Delete Client Pool',
                              message: `Are you sure you want to delete the pool for ${pool.clientName}? This action cannot be undone.`,
                              confirmText: 'Delete',
                              cancelText: 'Cancel',
                              variant: 'danger',
                              onConfirm: async () => {
                                try {
                                  await clientPoolService.delete(pool.id);
                                  await loadClientPools();
                                  toast.success(`Client pool for ${pool.clientName} deleted successfully!`);
                                } catch (error) {
                                  handleError(error, 'ClientPoolManagement.deletePool');
                                  toast.error(`Error deleting client pool: ${error}`);
                                }
                              }
                            });
                          }}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Delete Pool"
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
      {showForm && realYardData && (
        <ClientPoolForm
          isOpen={showForm}
          onClose={() => {
            if (!isProcessing) {
              setShowForm(false);
              setSelectedPool(null);
            }
          }}
          onSubmit={selectedPool ? handleUpdatePool : handleCreatePool}
          selectedPool={selectedPool}
          yard={realYardData}
          isLoading={isProcessing}
        />
      )}

      {/* Stack Details Modal */}
      {showStackDetails && (
        <StackDetailsModal
          isOpen={showStackDetails}
          onClose={() => {
            setShowStackDetails(false);
            setSelectedStack(null);
          }}
          stack={selectedStack}
        />
      )}

      {/* Client Pool View Modal */}
      {showViewModal && (
        <ClientPoolViewModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedPool(null);
          }}
          clientPool={selectedPool}
          stacksData={assignedStacksData}
          createdByName={user?.name}
          updatedByName={user?.name}
          yardName={currentYard?.name}
          onEdit={() => {
            setShowViewModal(false);
            setShowForm(true);
          }}
          onDelete={(pool) => {
            confirm({
              title: 'Delete Client Pool',
              message: `Are you sure you want to delete the pool for ${pool.clientName}? This action cannot be undone.`,
              confirmText: 'Delete',
              cancelText: 'Cancel',
              variant: 'danger',
              onConfirm: async () => {
                try {
                  await clientPoolService.delete(pool.id);
                  setShowViewModal(false);
                  setSelectedPool(null);
                  await loadClientPools();
                  toast.success(`Client pool for ${pool.clientName} deleted successfully!`);
                } catch (error) {
                  handleError(error, 'ClientPoolManagement.deletePoolFromModal');
                  toast.error(`Error deleting client pool: ${error}`);
                }
              }
            });
          }}
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
                <span className={`px-2 py-1 text-xs rounded-full ${util.status === 'critical' ? 'bg-red-100 text-red-800' : util.status === 'high' ? 'bg-orange-100 text-orange-800' : util.status === 'optimal' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                  {util.status}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                <div>Utilization: {util.occupancyRate.toFixed(1)}%</div>
                <div>Used: {util.usedSlots} / {util.totalSlots} slots</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Only Message for Mobile */}
      <div className="lg:hidden">
        <DesktopOnlyMessage
          moduleName="Client Pools"
          reason="Managing client groups, capacity assignments, and detailed pool analytics requires comprehensive tables and forms optimized for desktop."
        />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <DesktopContent />
      </div>
    </>
  );
};
