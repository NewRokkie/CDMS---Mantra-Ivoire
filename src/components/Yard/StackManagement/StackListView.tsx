import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Package, 
  Grid3X3, 
  MapPin,
  AlertTriangle,
  CheckCircle,
  Copy,
  Download
} from 'lucide-react';
import { YardStack, YardSection } from '../../../types/yard';
import { useAuth } from '../../../hooks/useAuth';

interface StackListViewProps {
  stacks: YardStack[];
  sections: YardSection[];
  searchTerm: string;
  sectionFilter: string;
  onSearchChange: (value: string) => void;
  onSectionFilterChange: (value: string) => void;
  onCreateStack: () => void;
  onEditStack: (stack: YardStack) => void;
  onDeleteStack: (stack: YardStack) => void;
  onViewStack: (stack: YardStack) => void;
  onBulkCreate: () => void;
}

export const StackListView: React.FC<StackListViewProps> = ({
  stacks,
  sections,
  searchTerm,
  sectionFilter,
  onSearchChange,
  onSectionFilterChange,
  onCreateStack,
  onEditStack,
  onDeleteStack,
  onViewStack,
  onBulkCreate
}) => {
  const { user } = useAuth();
  const [selectedStacks, setSelectedStacks] = useState<string[]>([]);
  const [sortField, setSortField] = useState<'stackNumber' | 'capacity' | 'occupancy'>('stackNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const canManageStacks = user?.role === 'admin' || user?.role === 'supervisor';

  // Filter and sort stacks
  const getFilteredStacks = () => {
    let filtered = stacks;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(stack =>
        stack.stackNumber.toString().includes(searchTerm) ||
        sections.find(s => s.id === stack.sectionId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply section filter
    if (sectionFilter !== 'all') {
      filtered = filtered.filter(stack => stack.sectionId === sectionFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'stackNumber':
          aValue = a.stackNumber;
          bValue = b.stackNumber;
          break;
        case 'capacity':
          aValue = a.capacity;
          bValue = b.capacity;
          break;
        case 'occupancy':
          aValue = a.currentOccupancy;
          bValue = b.currentOccupancy;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    return filtered;
  };

  const filteredStacks = getFilteredStacks();

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectStack = (stackId: string) => {
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

  const handleBulkDelete = () => {
    if (selectedStacks.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedStacks.length} selected stacks?`)) {
      selectedStacks.forEach(stackId => {
        const stack = stacks.find(s => s.id === stackId);
        if (stack) {
          onDeleteStack(stack);
        }
      });
      setSelectedStacks([]);
    }
  };

  const getUtilizationColor = (occupancy: number, capacity: number) => {
    const rate = capacity > 0 ? (occupancy / capacity) * 100 : 0;
    if (rate >= 90) return 'text-red-600 bg-red-100';
    if (rate >= 75) return 'text-orange-600 bg-orange-100';
    if (rate >= 25) return 'text-green-600 bg-green-100';
    return 'text-blue-600 bg-blue-100';
  };

  const getSectionName = (sectionId: string) => {
    return sections.find(s => s.id === sectionId)?.name || 'Unknown Section';
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Stack Management</h3>
          <p className="text-sm text-gray-600">
            Manage individual stacks and their configurations
          </p>
        </div>
        {canManageStacks && (
          <div className="flex items-center space-x-3">
            {selectedStacks.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Selected ({selectedStacks.length})</span>
              </button>
            )}
            <button
              onClick={onBulkCreate}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Grid3X3 className="h-4 w-4" />
              <span>Bulk Create</span>
            </button>
            <button
              onClick={onCreateStack}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Stack</span>
            </button>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search stacks..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={sectionFilter}
              onChange={(e) => onSectionFilterChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Sections</option>
              {sections.map(section => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3">
            {selectedStacks.length > 0 && (
              <span className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
                {selectedStacks.length} selected
              </span>
            )}
            <button
              onClick={handleSelectAll}
              className="text-sm px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              {selectedStacks.length === filteredStacks.length ? 'Deselect All' : 'Select All'}
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stacks Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('stackNumber')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>Stack</span>
                    {sortField === 'stackNumber' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Section
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('capacity')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>Capacity</span>
                    {sortField === 'capacity' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('occupancy')}
                    className="flex items-center space-x-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    <span>Occupancy</span>
                    {sortField === 'occupancy' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStacks.map((stack) => {
                const isSelected = selectedStacks.includes(stack.id);
                const utilizationRate = stack.capacity > 0 ? (stack.currentOccupancy / stack.capacity) * 100 : 0;

                return (
                  <tr key={stack.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectStack(stack.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            Stack {stack.stackNumber.toString().padStart(2, '0')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {stack.rows}R × {stack.maxTiers}T
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        {getSectionName(stack.sectionId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{stack.capacity} containers</div>
                      <div className="text-sm text-gray-500">{stack.rows} × {stack.maxTiers}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${getUtilizationColor(stack.currentOccupancy, stack.capacity)}`}>
                            {stack.currentOccupancy} / {stack.capacity}
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
                      <div className="text-sm text-gray-900">
                        ({stack.position.x}, {stack.position.y})
                      </div>
                      <div className="text-sm text-gray-500">
                        {stack.dimensions.width}m × {stack.dimensions.length}m
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        stack.isOddStack 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {stack.isOddStack ? 'Odd Stack' : 'Standard'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onViewStack(stack)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canManageStacks && (
                          <>
                            <button
                              onClick={() => onEditStack(stack)}
                              className="text-gray-600 hover:text-gray-900 p-1 rounded"
                              title="Edit Stack"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDeleteStack(stack)}
                              className="text-red-600 hover:text-red-900 p-1 rounded"
                              title="Delete Stack"
                              disabled={stack.currentOccupancy > 0}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
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
            <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stacks found</h3>
            <p className="text-gray-600">
              {searchTerm || sectionFilter !== 'all' 
                ? "Try adjusting your search criteria or filters." 
                : "No stacks have been created yet."
              }
            </p>
            {canManageStacks && !searchTerm && sectionFilter === 'all' && (
              <button
                onClick={onCreateStack}
                className="mt-4 flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Stack</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stack Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Stacks</p>
              <p className="text-lg font-semibold text-gray-900">{stacks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Grid3X3 className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Capacity</p>
              <p className="text-lg font-semibold text-gray-900">
                {stacks.reduce((sum, s) => sum + s.capacity, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Current Occupancy</p>
              <p className="text-lg font-semibold text-gray-900">
                {stacks.reduce((sum, s) => sum + s.currentOccupancy, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Avg Utilization</p>
              <p className="text-lg font-semibold text-gray-900">
                {stacks.length > 0 
                  ? ((stacks.reduce((sum, s) => sum + s.currentOccupancy, 0) / stacks.reduce((sum, s) => sum + s.capacity, 0)) * 100).toFixed(1)
                  : 0
                }%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};