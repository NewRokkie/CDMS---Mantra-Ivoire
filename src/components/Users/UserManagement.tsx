import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit, Eye, Trash2, User as UserIcon, Shield, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { User, ModuleAccess } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { userService } from '../../services/api';
import { UserFormModal } from './UserFormModal';
import { UserDetailsModal } from './UserDetailsModal';
import { DesktopOnlyMessage } from '../Common/DesktopOnlyMessage';
import { ConfirmationDialog } from '../Common/ConfirmationDialog';
import { NotificationProvider, useNotifications } from '../Common/NotificationSystem';
import { ErrorBoundary } from '../Common/ErrorBoundary';
import { UserManagementErrorFallback } from '../Common/DatabaseErrorFallback';
import { useUserManagementRetry } from '../../hooks/useRetry';
import { toDate } from '../../utils/dateHelpers';
import { handleError } from '../../services/errorHandling';
import { logger } from '../../utils/logger';

// Helper function to get module access based on role
const getModuleAccessForRole = (role: User['role']): ModuleAccess => {
  const baseAccess: ModuleAccess = {
    dashboard: true,
    containers: false,
    gateIn: false,
    gateOut: false,
    releases: false,
    edi: false,
    yard: false,
    clients: false,
    users: false,
    moduleAccess: false,
    reports: false,
    depotManagement: false,
    timeTracking: false,
    analytics: false,
    clientPools: false,
    stackManagement: false,
    auditLogs: false,
    billingReports: false,
    operationsReports: false
  };

  switch (role) {
    case 'admin':
      return {
        dashboard: true,
        containers: true,
        gateIn: true,
        gateOut: true,
        releases: true,
        edi: true,
        yard: true,
        clients: true,
        users: true,
        moduleAccess: true,
        reports: true,
        depotManagement: true,
        timeTracking: true,
        analytics: true,
        clientPools: true,
        stackManagement: true,
        auditLogs: true,
        billingReports: true,
        operationsReports: true
      };
    case 'supervisor':
      return {
        ...baseAccess,
        containers: true,
        gateIn: true,
        gateOut: true,
        releases: true,
        edi: true,
        yard: true,
        reports: true,
        users: true,
        depotManagement: true,
        analytics: true,
        clientPools: true,
        stackManagement: true,
        auditLogs: true,
        billingReports: true,
        operationsReports: true
      };
    case 'operator':
      return {
        ...baseAccess,
        containers: true,
        gateIn: true,
        gateOut: true,
        releases: true,
        yard: true,
        auditLogs: true
      };
    case 'client':
      return {
        ...baseAccess,
        containers: true,
        releases: true,
        yard: true
      };
    default:
      return baseAccess;
  }
};


const UserManagementContent: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const { showSuccess, showError } = useNotifications();

  // Use retry mechanism for loading users
  const {
    execute: loadUsersWithRetry,
    isRetrying: isRetryingLoad,
    retryCount: loadRetryCount,
    lastError: loadLastError
  } = useUserManagementRetry(async () => {
    const data = await userService.getAll();
    return data || [];
  }, 'read');

  const loadUsers = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await loadUsersWithRetry();
      setUsers(data);
    } catch (error) {
      handleError(error, 'UserManagement.loadUsers');
      const errorInstance = error instanceof Error ? error : new Error('An unexpected error occurred while loading users');
      setLoadError(errorInstance);
      showError('Failed to load users', errorInstance.message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Use retry mechanisms for user operations
  const {
    execute: createUserWithRetry
  } = useUserManagementRetry(async (user: any) => {
    return await userService.create(user);
  }, 'write');

  const {
    execute: updateUserWithRetry
  } = useUserManagementRetry(async (id: string, updates: any) => {
    return await userService.update(id, updates);
  }, 'write');

  const {
    execute: deleteUserWithRetry
  } = useUserManagementRetry(async (id: string, deletedBy: string) => {
    return await userService.softDelete(id, deletedBy);
  }, 'delete');

  const addUser = async (user: any) => {
    const newUser = await createUserWithRetry(user);
    setUsers(prev => [...prev, newUser]);
  };

  const updateUser = async (id: string, updates: any) => {
    await updateUserWithRetry(id, updates);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const deleteUser = async (id: string) => {
    try {
      setOperationLoading(id);
      await deleteUserWithRetry(id, currentUser?.id || 'system');
      setUsers(prev => prev.filter(u => u.id !== id));
      showSuccess('User deleted successfully', 'The user has been safely removed from the system.');
    } catch (error) {
      handleError(error, 'UserManagement.deleteUser');
      showError('Failed to delete user', error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setOperationLoading(null);
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const { user: currentUser } = useAuth();
  const { currentYard } = useYard();

  const canManageUsers = currentUser?.role === 'admin';

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.department?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' ||
                          (statusFilter === 'active' && user.isActive) ||
                          (statusFilter === 'inactive' && !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSubmit = async (userData: any) => {
    try {
      setOperationLoading('form');
      if (selectedUser) {
        // Edit existing user
        await updateUser(selectedUser.id, {
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          department: userData.department,
          company: userData.company,
          role: userData.role,
          isActive: userData.isActive,
          moduleAccess: getModuleAccessForRole(userData.role),
          updatedBy: currentUser?.id
        });
        showSuccess('User updated successfully', 'The user information has been updated.');
      } else {
        // Create new user
        const newUser: User = {
          id: Date.now().toString(),
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          department: userData.department,
          company: userData.company,
          role: userData.role,
          isActive: userData.isActive,
          createdAt: new Date(),
          createdBy: currentUser?.id || 'System',
          moduleAccess: getModuleAccessForRole(userData.role)
        };
        await addUser(newUser);
        showSuccess('User created successfully', 'The new user has been added to the system.');
      }
      setShowForm(false);
      setSelectedUser(null);
    } catch (error) {
      handleError(error, 'UserManagement.handleSubmit');
      showError('Failed to save user', error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setOperationLoading(null);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowForm(true);
  };

  const handleView = (user: User) => {
    setSelectedUser(user);
    setShowDetails(true);
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      await deleteUser(userToDelete.id);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      setOperationLoading(userId);
      const user = users.find(u => u.id === userId);
      if (user) {
        await updateUser(userId, {
          isActive: !user.isActive,
          updatedBy: currentUser?.id
        });
        showSuccess(
          `User ${!user.isActive ? 'activated' : 'deactivated'} successfully`,
          `${user.name} has been ${!user.isActive ? 'activated' : 'deactivated'}.`
        );
      }
    } catch (error) {
      handleError(error, 'UserManagement.handleToggleStatus');
      showError('Failed to update user status', error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setOperationLoading(null);
    }
  };

  const getRoleIcon = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4 text-red-600" />;
      case 'supervisor':
        return <Shield className="h-4 w-4 text-orange-600" />;
      case 'operator':
        return <UserIcon className="h-4 w-4 text-blue-600" />;
      case 'client':
        return <UserIcon className="h-4 w-4 text-green-600" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: User['role']) => {
    const roleConfig: Record<string, { color: string; label: string }> = {
      admin: { color: 'bg-red-100 text-red-800', label: 'Administrator' },
      supervisor: { color: 'bg-orange-100 text-orange-800', label: 'Supervisor' },
      operator: { color: 'bg-blue-100 text-blue-800', label: 'Operator' },
      client: { color: 'bg-green-100 text-green-800', label: 'Client' },
      viewer: { color: 'bg-gray-100 text-gray-800', label: 'Viewer' }
    };

    const config = roleConfig[role] || roleConfig.viewer;
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {getRoleIcon(role)}
        <span className="ml-1">{config.label}</span>
      </span>
    );
  };

  const formatLastLogin = (date: Date | string | undefined) => {
    if (!date) return 'Never';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!dateObj || isNaN(dateObj.getTime())) return 'Never';

    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return dateObj.toLocaleDateString();
  };

  const DesktopContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        {currentYard && (
          <div className="text-right text-sm text-gray-600">
            <div>Managing users for: {currentYard.name}</div>
            <div className="text-xs">{currentYard.code}</div>
          </div>
        )}
        {canManageUsers && (
          <button
            onClick={() => {
              setSelectedUser(null);
              setShowForm(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-lg font-semibold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-lg font-semibold text-gray-900">
                {users.filter(u => u.isActive).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Administrators</p>
              <p className="text-lg font-semibold text-gray-900">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Online Today</p>
              <p className="text-lg font-semibold text-gray-900">
                {users.filter(u => {
                  const today = new Date();
                  const loginDate = toDate(u.lastLogin);
                  if (!loginDate) return false;
                  return loginDate.toDateString() === today.toDateString();
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="supervisor">Supervisor</option>
              <option value="operator">Operator</option>
              <option value="client">Client</option>
            </select>

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

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <Loader className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-600">
                Loading users...
                {isRetryingLoad && loadRetryCount > 0 && (
                  <span className="text-orange-600 ml-2">
                    (Retry {loadRetryCount}/3)
                  </span>
                )}
              </span>
            </div>
          </div>
        ) : loadError ? (
          <div className="p-6">
            <UserManagementErrorFallback
              error={loadError}
              onRetry={loadUsers}
              operation="loading"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
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
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <UserIcon className="h-12 w-12 text-gray-400" />
                      <div className="text-gray-500">
                        <p className="text-lg font-medium">No users found</p>
                        <p className="text-sm">
                          {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                            ? 'Try adjusting your search or filters'
                            : 'Get started by adding your first user'}
                        </p>
                      </div>
                      {canManageUsers && !searchTerm && roleFilter === 'all' && statusFilter === 'all' && (
                        <button
                          onClick={() => {
                            setSelectedUser(null);
                            setShowForm(true);
                          }}
                          className="mt-4 flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add First User</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.department}</div>
                    <div className="text-sm text-gray-500">{user.company}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin ? formatLastLogin(user.lastLogin) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => canManageUsers && handleToggleStatus(user.id)}
                      disabled={!canManageUsers || operationLoading === user.id}
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      } ${canManageUsers ? 'cursor-pointer' : 'cursor-default'} ${
                        operationLoading === user.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {operationLoading === user.id ? (
                        <>
                          <Loader className="h-3 w-3 mr-1 animate-spin" />
                          Processing...
                        </>
                      ) : user.isActive ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleView(user)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canManageUsers && (
                        <>
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={operationLoading === user.id}
                            className={`text-red-600 hover:text-red-900 p-1 rounded ${
                              operationLoading === user.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {operationLoading === user.id ? (
                              <Loader className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        selectedUser={selectedUser}
        onSubmit={handleSubmit}
        loading={operationLoading === 'form'}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onEdit={(user) => {
          setShowDetails(false);
          handleEdit(user);
        }}
        onDelete={(userId) => {
          setShowDetails(false);
          const user = users.find(u => u.id === userId);
          if (user) {
            handleDelete(user);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete ${userToDelete?.name}? This action will safely remove the user from the system while preserving data integrity.`}
        confirmText="Delete User"
        cancelText="Cancel"
        type="danger"
        loading={operationLoading === userToDelete?.id}
      />
    </div>
  );

  return (
    <>
      {/* Desktop Only Message for Mobile */}
      <div className="lg:hidden">
        <DesktopOnlyMessage
          moduleName="User Management"
          reason="Managing user accounts, roles, permissions, and detailed access controls requires comprehensive admin interfaces optimized for desktop."
        />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <DesktopContent />
      </div>
    </>
  );
};

export const UserManagement: React.FC = () => {
  return (
    <ErrorBoundary
      context="User Management Module"
      onError={(error, errorInfo) => {
        logger.error('User Management component error', 'UserManagement', {
          error: error.message,
          componentStack: errorInfo.componentStack
        });
      }}
    >
      <NotificationProvider>
        <UserManagementContent />
      </NotificationProvider>
    </ErrorBoundary>
  );
};
