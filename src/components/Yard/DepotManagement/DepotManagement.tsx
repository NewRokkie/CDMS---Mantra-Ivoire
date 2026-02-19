import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Pencil as Edit, 
  Trash2, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp, 
  MapPin, 
  Users 
} from 'lucide-react';
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
import { StackCapacityCalculator } from '../../../utils/stackCapacityCalculator';
import { useLanguage } from '../../../hooks/useLanguage';

export const DepotManagement: React.FC = () => {
  const { t } = useLanguage();
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

  // Calculate effective capacity for a depot using the new logic
  const calculateDepotEffectiveCapacity = (depot: Yard): number => {
    const allStacks = depot.sections.flatMap(section => section.stacks);
    return StackCapacityCalculator.calculateTotalEffectiveCapacity(allStacks);
  };

  useEffect(() => {
    loadDepots();
  }, []);

  const loadDepots = async () => {
    try {
      setIsLoading(true);
      const availableDepots = await yardsService.getAll();

      setDepots(availableDepots);

      // Calculate stats using effective capacity logic
      const totalCapacity = availableDepots.reduce((sum, depot) => sum + calculateDepotEffectiveCapacity(depot), 0);
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
    const rate = capacity === 0 ? 0 : (occupancy / capacity) * 100;
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
        {isActive ? t('common.active') : t('common.inactive')}
      </span>
    );
  };

  const handleCreateDepot = async (data: any) => {
    try {
      setIsFormLoading(true);
      await yardsService.create(data, user?.id || 'unknown');
      await loadDepots();
      await refreshYards();
      setShowForm(false);
      setSelectedDepot(null);
      toast.success(t('common.success'));
    } catch (error) {
      handleError(error, 'DepotManagement.handleCreateDepot');
      throw error;
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleUpdateDepot = async (data: any) => {
    if (!selectedDepot) return;

    try {
      setIsFormLoading(true);
      const updatedDepot = await yardsService.update(selectedDepot.id, data, user?.id || 'unknown');
      if (updatedDepot) {
        await loadDepots();
        await refreshYards();
        setShowForm(false);
        setSelectedDepot(null);
        toast.success(t('common.success'));
      } else {
        throw new Error('Depot not found');
      }
    } catch (error) {
      handleError(error, 'DepotManagement.handleUpdateDepot');
      throw error;
    } finally {
      setIsFormLoading(false);
    }
  };

  const handleDeleteDepot = async (depot: Yard) => {
    if (depot.id === currentYard?.id) {
      toast.warning(t('depot.delete.errorCurrent'));
      return;
    }

    confirm({
      title: t('depot.delete'),
      message: t('depot.delete.confirm').replace('{name}', depot.name),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          const success = await yardsService.delete(depot.id, user?.id || 'unknown');
          if (success) {
            await loadDepots();
            await refreshYards();
            toast.success(t('depot.delete.success').replace('{name}', depot.name));
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
      // We log userIds to satisfy LSP, but the actual update is handled in DepotAssignmentModal
      console.log(`Assigned ${userIds.length} users to depot ${selectedDepot.name}`);
      toast.success(t('common.success'));
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
        <h3 className="text-lg font-medium text-gray-900 mb-2">{t('common.restricted')}</h3>
        <p className="text-gray-600">{t('common.unauthorized')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="lg:hidden p-6">
        <DesktopOnlyMessage 
          moduleName={t('depot.title')} 
          reason="Detailed depot configuration and layout management require a larger screen."
        />
      </div>

      <div className="hidden lg:block p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('depot.title')}</h2>
            <p className="text-gray-600">{t('depot.subtitle')}</p>
          </div>
          <button
            onClick={() => {
              setSelectedDepot(null);
              setShowForm(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>{t('depot.create')}</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">{t('depot.stats.total')}</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalDepots}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">{t('depot.stats.active')}</p>
                <p className="text-xl font-bold text-gray-900">{stats.activeDepots}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">{t('depot.stats.capacity')}</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalCapacity.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">{t('depot.stats.occupancy')}</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalOccupancy.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder={t('depot.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="all">{t('common.all')}</option>
                <option value="active">{t('common.active')}</option>
                <option value="inactive">{t('common.inactive')}</option>
              </select>
            </div>

            <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="h-4 w-4" />
              <span>{t('common.filter')}</span>
            </button>
          </div>
        </div>

        {/* Depots Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{t('depot.overview')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.location')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.capacity')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.utilization')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('depot.form.layout')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDepots.map((depot) => {
                  const effectiveCapacity = calculateDepotEffectiveCapacity(depot);
                  const utilizationRate = effectiveCapacity === 0
                      ? 0
                      : (depot.currentOccupancy / effectiveCapacity) * 100;

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
                        <div className="text-sm text-gray-900">{depot.currentOccupancy} / {effectiveCapacity}</div>
                        <div className="text-sm text-gray-500">{t('common.containers')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 max-w-[200px]">
                            <div className={`text-xs font-bold mb-1 ${getUtilizationColor(depot.currentOccupancy, effectiveCapacity)} inline-block px-1.5 py-0.5 rounded`}>
                              {utilizationRate.toFixed(1)}%
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-all duration-500 ${
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
                            className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('depot.view')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditDepot(depot)}
                            className="text-gray-600 hover:text-gray-900 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            title={t('depot.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleAssignUsers(depot)}
                            className="text-purple-600 hover:text-purple-900 p-1.5 hover:bg-purple-50 rounded-lg transition-colors"
                            title={t('depot.assign')}
                          >
                            <Users className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDepot(depot)}
                            className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t('depot.delete')}
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
              <Building className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('depot.noDepots')}</h3>
              <p className="text-gray-600">
                {searchTerm ? t('common.tryAdjusting') : t('depot.noDepotsEmpty')}
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
            onEdit={(depot) => {
              setShowDetail(false);
              handleEditDepot(depot);
            }}
            onDelete={(depot) => {
              setShowDetail(false);
              handleDeleteDepot(depot);
            }}
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
    </>
  );
};
