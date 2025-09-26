import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, CreditCard as Edit, Trash2, Eye, Grid3x3 as Grid3X3, Package, MapPin, Settings, AlertTriangle, CheckCircle, Copy, Download, Upload, BarChart3, Layers } from 'lucide-react';
import { Stack, StackFormData } from '../../types/stack';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { stackService } from '../../services/stackService';
import { StackFormModal } from './StackFormModal';
import { StackDetailModal } from './StackDetailModal';
import { StackBulkActionsModal } from './StackBulkActionsModal';

export const StackCRUDManagement: React.FC = () => {
  const [stacks, setStacks] = useState<Stack[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedStack, setSelectedStack] = useState<Stack | null>(null);
  const [selectedStacks, setSelectedStacks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const { user } = useAuth();
  const { currentYard, availableYards } = useYard();

  const canManageStacks = user?.role === 'admin' || user?.role === 'supervisor';

  useEffect(() => {
    if (currentYard) {
      loadStacks();
      loadStatistics();
    }
  }, [currentYard]);

  const loadStacks = async () => {
    if (!currentYard) return;

    try {
      setIsLoading(true);
      const yardStacks = await stackService.getStacksForYard(currentYard.id);
      setStacks(yardStacks);
      console.log(`✅ Loaded ${yardStacks.length} stacks for ${currentYard.name}`);
    } catch (error) {
      console.error('Failed to load stacks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStatistics = async () => {
    if (!currentYard) return;

    try {
      const stackStats = await stackService.getStackStatistics(currentYard.id);
      setStats(stackStats);
    } catch (error) {
      console.error('Failed to load stack statistics:', error);
    }
  };

  const filteredStacks = stacks.filter(stack => {
    const matchesSearch = stack.stackNumber.toString().includes(searchTerm) ||
                         (stack.notes && stack.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSection = sectionFilter === 'all' || stack.sectionId === sectionFilter;
    const matchesSize = sizeFilter === 'all' || stack.containerSize === sizeFilter;
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && stack.isActive) ||
                         (statusFilter === 'inactive' && !stack.isActive) ||
                         (statusFilter === 'assigned' && stack.assignedClientCode) ||
                         (statusFilter === 'unassigned' && !stack.assignedClientCode);

    return matchesSearch && matchesSection && matchesSize && matchesStatus;
  });

  const handleCreateStack = async (stackData: StackFormData) => {
    if (!currentYard) return;

    try {
      await stackService.createStack(currentYard.id, stackData, user?.name || 'System');
      await loadStacks();
      await loadStatistics();
      setShowForm(false);
      alert('Stack created successfully!');
    } catch (error) {
      alert(`Error creating stack: ${error}`);
    }
  };

  const handleUpdateStack = async (stackData: StackFormData) => {
    if (!selectedStack) return;

    try {
      await stackService.updateStack(selectedStack.id, stackData, user?.name || 'System');
      await loadStacks();
      await loadStatistics();
      setShowForm(false);
      setSelectedStack(null);
      alert('Stack updated successfully!');
    } catch (error) {
      alert(`Error updating stack: ${error}`);
    }
  };

  const handleDeleteStack = async (stack: Stack) => {
    if (stack.currentOccupancy > 0) {
      alert('Cannot delete stack with containers. Please move all containers first.');
      return;
    }

    if (confirm(`Are you sure you want to delete Stack ${stack.stackNumber}? This action cannot be undone.`)) {
      try {
        await stackService.deleteStack(stack.id, user?.name || 'System');
        await loadStacks();
        await loadStatistics();
        alert(`Stack ${stack.stackNumber} deleted successfully!`);
      } catch (error) {
        alert(`Error deleting stack: ${error}`);
      }
    }
  };

  const handleGenerateTantarelliLayout = async () => {
    if (!currentYard) return;

    if (stacks.length > 0) {
      if (!confirm('This will create the standard Tantarelli layout. Existing stacks will not be affected. Continue?')) {
        return;
      }
    }

    try {
      setIsLoading(true);
      await stackService.generateTantarelliLayout(currentYard.id, user?.name || 'System');
      await loadStacks();
      await loadStatistics();
      alert('Tantarelli layout generated successfully!');
    } catch (error) {
      alert(`Error generating layout: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloneFromYard = async (sourceYardId: string) => {
    if (!currentYard) return;

    if (confirm('This will clone all stacks from the selected yard. Continue?')) {
      try {
        setIsLoading(true);
        await stackService.cloneStacksFromYard(sourceYardId, currentYard.id, user?.name || 'System');
        await loadStacks();
        await loadStatistics();
        alert('Stacks cloned successfully!');
      } catch (error) {
        alert(`Error cloning stacks: ${error}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedStacks.length === 0) return;

    const stacksWithContainers = stacks.filter(s => 
      selectedStacks.includes(s.id) && s.currentOccupancy > 0
    );

    if (stacksWithContainers.length > 0) {
      alert(`Cannot delete ${stacksWithContainers.length} stacks that contain containers. Please move containers first.`);
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedStacks.length} selected stacks?`)) {
      try {
        setIsLoading(true);
        for (const stackId of selectedStacks) {
          await stackService.deleteStack(stackId, user?.name || 'System');
        }
        await loadStacks();
        await loadStatistics();
        setSelectedStacks([]);
        alert(`${selectedStacks.length} stacks deleted successfully!`);
      } catch (error) {
        alert(`Error deleting stacks: ${error}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleStackSelect = (stackId: string) => {
    setSelectedStacks(prev =>
      prev.includes(stackId)
        ? prev.filter(id => id !== stackId)
        : [...prev, stackId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStacks.length === filteredStacks.length) {
      setSelectedStacks([]);
    } else {
      setSelectedStacks(filteredStacks.map(s => s.id));
    }
  };

  const getUtilizationColor = (occupancy: number, capacity: number) => {
    const rate = capacity > 0 ? (occupancy / capacity) * 100 : 0;
    if (rate >= 90) return 'text-red-600 bg-red-100';
    if (rate >= 75) return 'text-orange-600 bg-orange-100';
    if (rate >= 25) return 'text-green-600 bg-green-100';
    return 'text-blue-600 bg-blue-100';
  };

  const getSizeBadge = (size: Stack['containerSize']) => {
    const config = {
      '20ft': { color: 'bg-blue-100 text-blue-800', label: '20ft' },
      '40ft': { color: 'bg-orange-100 text-orange-800', label: '40ft' },
      'both': { color: 'bg-green-100 text-green-800', label: 'Both' }
    };

    const { color, label } = config[size];
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {label}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  // Get unique sections for filter
  const uniqueSections = [...new Set(stacks.map(s => s.sectionId))];

  if (!canManageStacks) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to manage stacks.</p>
      </div>
    );
  }

  if (!currentYard) {
    return (
      <div className="text-center py-12">
        <Grid3X3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Yard Selected</h3>
        <p className="text-gray-600">Please select a yard to manage stacks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stack Management</h2>
          <p className="text-gray-600">
            Manage stacks for {currentYard.name} ({currentYard.code})
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowBulkActions(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Bulk Actions</span>
          </button>
          <button
            onClick={() => {
              setSelectedStack(null);
              setShowForm(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Stack</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Grid3X3 className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Stacks</p>
                <p className="text-lg font-semibold text-gray-900">{stats.totalStacks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Capacity</p>
                <p className="text-lg font-semibold text-gray-900">{stats.totalCapacity.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Utilization</p>
                <p className="text-lg font-semibold text-gray-900">{stats.utilizationRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Active Stacks</p>
                <p className="text-lg font-semibold text-gray-900">{stats.activeStacks}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search stacks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Sections</option>
              {uniqueSections.map(sectionId => {
                const section = currentYard.sections.find(s => s.id === sectionId);
                return (
                  <option key={sectionId} value={sectionId}>
                    {section?.name || sectionId}
                  </option>
                );
              })}
            </select>

            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Sizes</option>
              <option value="20ft">20ft Only</option>
              <option value="40ft">40ft Only</option>
              <option value="both">Both Sizes</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            {selectedStacks.length > 0 && (
              <span className="text-sm text-gray-600 bg-blue-100 px-3 py-1 rounded-full">
                {selectedStacks.length} selected
              </span>
            )}
            <button
              onClick={handleSelectAll}
              className="text-sm px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {selectedStacks.length === filteredStacks.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedStacks.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {selectedStacks.length} stack{selectedStacks.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSelectedStacks([])}
                className="text-sm px-3 py-1 text-blue-600 hover:text-blue-800 transition-colors"
              >
                Clear Selection
              </button>
              <button
                onClick={handleBulkDelete}
                className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stacks Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Stack Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedStacks.length === filteredStacks.length && filteredStacks.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stack
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dimensions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assignment
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
              {filteredStacks.map((stack) => {
                const section = currentYard.sections.find(s => s.id === stack.sectionId);
                const utilizationRate = stack.capacity > 0 ? (stack.currentOccupancy / stack.capacity) * 100 : 0;

                return (
                  <tr key={stack.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedStacks.includes(stack.id)}
                        onChange={() => handleStackSelect(stack.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Grid3X3 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            Stack {stack.stackNumber.toString().padStart(2, '0')}
                          </div>
                          {stack.isSpecialStack && (
                            <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full inline-block">
                              Special
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{section?.name || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {stack.rows}R × {stack.maxTiers}T
                      </div>
                      <div className="text-xs text-gray-500">
                        {stack.dimensions.width}×{stack.dimensions.length}m
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {stack.currentOccupancy} / {stack.capacity}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${getUtilizationColor(stack.currentOccupancy, stack.capacity)}`}>
                        {utilizationRate.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSizeBadge(stack.containerSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {stack.assignedClientCode ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          {stack.assignedClientCode}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(stack.isActive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedStack(stack);
                            setShowDetail(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStack(stack);
                            setShowForm(true);
                          }}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="Edit Stack"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStack(stack)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Delete Stack"
                          disabled={stack.currentOccupancy > 0}
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

        {filteredStacks.length === 0 && (
          <div className="text-center py-12">
            <Grid3X3 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stacks found</h3>
            <p className="text-gray-600">
              {searchTerm || sectionFilter !== 'all' || sizeFilter !== 'all' || statusFilter !== 'all'
                ? "Try adjusting your search criteria or filters."
                : "No stacks have been created yet."
              }
            </p>
          </div>
        )}
      </div>

      {/* Stack Form Modal */}
      <StackFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedStack(null);
        }}
        onSubmit={selectedStack ? handleUpdateStack : handleCreateStack}
        selectedStack={selectedStack}
        yard={currentYard}
        isLoading={isLoading}
      />

      {/* Stack Detail Modal */}
      <StackDetailModal
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedStack(null);
        }}
        stack={selectedStack}
        yard={currentYard}
      />

      {/* Bulk Actions Modal */}
      <StackBulkActionsModal
        isOpen={showBulkActions}
        onClose={() => setShowBulkActions(false)}
        currentYard={currentYard}
        availableYards={availableYards}
        onGenerateTantarelli={handleGenerateTantarelliLayout}
        onCloneFromYard={handleCloneFromYard}
        isLoading={isLoading}
      />
    </div>
  );
};