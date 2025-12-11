import React, { useState, useEffect } from 'react';
import { Building, Package, Plus, Search, Filter, Pencil as Edit, Trash2, Eye, AlertTriangle, CheckCircle, TrendingUp, MapPin, Users, Clock, X, Loader, Calendar } from 'lucide-react';
import { Yard } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { useYard } from '../../../hooks/useYard';
import { yardsService } from '../../../services/api/yardsService';
import { DepotFormModal } from './DepotFormModal';
import { DepotDetailModal } from './DepotDetailModal';
import { DepotAssignmentModal } from './DepotAssignmentModal';
import { DesktopOnlyMessage } from '../../Common/DesktopOnlyMessage';
import { handleError } from '../../../services/errorHandling';
import { useToast } from '../../../hooks/useToast';
import { useConfirm } from '../../../hooks/useConfirm';

export const DepotManagement: React.FC = () => {
  const [depots, setDepots] = useState<Yard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDepot, setSelectedDepot] = useState<Yard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [isAssignmentLoading, setIsAssignmentLoading] = useState(false);
  const { user } = useAuth();
  const { currentYard, refreshYards } = useYard();
  const toast = useToast();
  const { confirm } = useConfirm();



  const [stats, setStats] = useState({
    totalDepots: 0,
    activeDepots: 0,
    totalCapacity: 0,
    totalOccupancy: 0
  });

  const canManageDepots = user?.role === 'admin' || user?.role === 'supervisor';

  useEffect(() => {
    loadDepots();
  }, []);

  const loadDepots = async () => {
    try {
      setIsLoading(true);
      const availableDepots = await yardsService.getAll();

      setDepots(availableDepots);

      // Calculate stats
      const totalCapacity = availableDepots.reduce((sum, depot) => sum + depot.totalCapacity, 0);
      const totalOccupancy = availableDepots.reduce((sum, depot) => sum + depot.currentOccupancy, 0);
      const activeDepots = availableDepots.filter(depot => depot.isActive).length;

      setStats({
        totalDepots: availableDepots.length,
        activeDepots,
        totalCapacity,
        totalOccupancy
      });
    } catch (error) {
      handleError(error, 'DepotManagement.loadDepots');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDepots = depots.filter(depot => {
    const matchesSearch = depot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         depot.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         depot.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && depot.isActive) ||
                         (statusFilter === 'inactive' && !depot.isActive);
    return matchesSearch && matchesStatus;
  });

  const getUtilizationColor = (occupancy: number, capacity: number) => {
    const rate = (occupancy / capacity) * 100;
    if (rate >= 90) return 'text-red-600 bg-red-100';
    if (rate >= 75) return 'text-orange-600 bg-orange-100';
    if (rate >= 25) return 'text-green-600 bg-green-100';
    return 'text-blue-600 bg-blue-100';
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
        isActive
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const handleCreateDepot = async (data: any) => {
    try {
      setIsFormLoading(true);
      const newDepot = await yardsService.create(data, user?.id || 'unknown');
      await loadDepots();
      await refreshYards(); // Refresh yard context
      setShowForm(false);
      setSelectedDepot(null);
      // Success feedback is now handled in the modal
    } catch (error) {
      handleError(error, 'DepotManagement.handleCreateDepot');
      throw error; // Let the modal handle error display
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleUpdateDepot = async (data: any) => {
    if (!selectedDepot) {
      return;
    }

    try {
      setIsFormLoading(true);
      const updatedDepot = await yardsService.update(selectedDepot.id, data, user?.id || 'unknown');
      if (updatedDepot) {
        await loadDepots();
        await refreshYards(); // Refresh yard context
        // Fermer le modal immédiatement après la mise à jour réussie
        setShowForm(false);
        setSelectedDepot(null);
      } else {
        throw new Error('Depot not found');
      }
    } catch (error) {
      handleError(error, 'DepotManagement.handleUpdateDepot');
      throw error; // Laisser le modal gérer l'affichage de l'erreur
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDeleteDepot = async (depot: Yard) => {
    if (depot.id === currentYard?.id) {
      toast.warning('Cannot delete the currently selected depot. Please switch to another depot first.');
      return;
    }

    confirm({
      title: 'Delete Depot',
      message: `Are you sure you want to delete the depot "${depot.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const success = await yardsService.delete(depot.id, user?.id || 'unknown');
          if (success) {
            await loadDepots();
            await refreshYards();
            toast.success(`Depot "${depot.name}" deleted successfully!`);
          } else {
            toast.error('Error deleting depot: Depot not found or cannot be deleted');
          }
        } catch (error) {
          toast.error(`Error deleting depot: ${error}`);
        }
      }
    });
  };

  const handleViewDepot = (depot: Yard) => {
    setSelectedDepot(depot);
    setShowDetail(true);
  };

  const handleEditDepot = (depot: Yard) => {
    setSelectedDepot(depot);
    setShowForm(true);
  };

  const handleAssignUsers = (depot: Yard) => {
    setSelectedDepot(depot);
    setShowAssignment(true);
  };

  const handleUserAssignment = async (userIds: string[]) => {
    if (!selectedDepot) return;

    try {
      setIsAssignmentLoading(true);
      // The actual assignment is now handled in DepotAssignmentModal
      // This callback is just for UI feedback
      toast.success(`Attribution réussie de ${userIds.length} utilisateur(s) au dépôt ${selectedDepot.name}`);
      setShowAssignment(false);
      setSelectedDepot(null);
    } catch (error) {
      toast.error(`Error assigning users: ${error}`);
    } finally {
      setIsAssignmentLoading(false);
    }
  };

  const handleFormSubmit = async (data: any) => {
    if (selectedDepot) {
      await handleUpdateDepot(data);
    } else {
      await handleCreateDepot(data);
    }
  };

  if (!canManageDepots) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to manage depots.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading depots...</p>
      </div>
    );
  }

  const DesktopContent = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Depot Management</h2>
          <p className="text-gray-600">Manage container depots and their configurations</p>
        </div>
        <button
          onClick={() => {
            setSelectedDepot(null);
            setShowForm(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create Depot</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Depots</p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalDepots}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Depots</p>
              <p className="text-lg font-semibold text-gray-900">{stats.activeDepots}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="h-5 w-5 text-purple-600" />
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
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Occupancy</p>
              <p className="text-lg font-semibold text-gray-900">{stats.totalOccupancy.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search depots..."
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

      {/* Depots Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Depot Overview</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Depot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Layout
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
              {filteredDepots.map((depot) => {

                const utilizationRate = depot.totalCapacity === 0
                    ? 0
                    : (depot.currentOccupancy / depot.totalCapacity) * 100;

                return (
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
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{depot.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{depot.currentOccupancy} / {depot.totalCapacity}</div>
                      <div className="text-sm text-gray-500">containers</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${getUtilizationColor(depot.currentOccupancy, depot.totalCapacity)}`}>
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
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">
                        {depot.layout}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(depot.isActive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDepot(depot)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditDepot(depot)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="Edit Depot"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleAssignUsers(depot)}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded"
                          title="Assign Users"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDepot(depot)}
                          className="text-red-600 hover:text-red-900 p-1 rounded"
                          title="Delete Depot"
                          disabled={depot.id === currentYard?.id}
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

        {filteredDepots.length === 0 && (
          <div className="text-center py-12">
            <Building className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No depots found</h3>
            <p className="text-gray-600">
              {searchTerm ? "Try adjusting your search criteria." : "No depots have been created yet."}
            </p>
          </div>
        )}
      </div>

      {/* Depot Form Modal */}
      {showForm && (
        <DepotFormModal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedDepot(null);
          }}
          onSubmit={handleFormSubmit}
          selectedDepot={selectedDepot}
          isLoading={isFormLoading}
        />
      )}

      {/* Depot Detail Modal */}
      {showDetail && (
        <DepotDetailModal
          isOpen={showDetail}
          onClose={() => {
            setShowDetail(false);
            setSelectedDepot(null);
          }}
          depot={selectedDepot}
        />
      )}

      {/* User Assignment Modal */}
      {showAssignment && (
        <DepotAssignmentModal
          isOpen={showAssignment}
          onClose={() => {
            setShowAssignment(false);
            setSelectedDepot(null);
          }}
          depot={selectedDepot}
          onAssign={handleUserAssignment}
          isLoading={isAssignmentLoading}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Only Message for Mobile */}
      <div className="lg:hidden">
        <DesktopOnlyMessage
          moduleName="Depot Management"
          reason="Managing depots, capacity, and user assignments requires detailed forms and tables best suited for desktop screens."
        />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <DesktopContent />
      </div>
    </>
  );
};
