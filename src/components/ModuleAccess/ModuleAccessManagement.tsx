import React, { useState, useMemo, useEffect } from 'react';
import { Shield, Users, Settings, Save, RotateCcw, Search, Filter, CheckCircle, XCircle, Plus, CreditCard as Edit, Trash2, UserPlus, Sparkles, Zap, Lock, Unlock, Eye, EyeOff, Star, Award, Crown, Gem, User as UserIcon } from 'lucide-react';
import type { ModuleAccess, ModulePermission, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { userService, moduleAccessService } from '../../services/api';

// Enhanced module configuration with beautiful icons and colors
const moduleConfig: Record<keyof ModuleAccess, ModulePermission> = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard with statistics and overview',
    category: 'core',
    isSystemModule: true
  },
  containers: {
    id: 'containers',
    name: 'Container Management',
    description: 'View and manage container inventory',
    category: 'operations',
    isSystemModule: false
  },
  gateIn: {
    id: 'gateIn',
    name: 'Gate In Operations',
    description: 'Process container gate-in operations',
    category: 'operations',
    requiredRole: ['admin', 'supervisor', 'operator'],
    isSystemModule: false
  },
  gateOut: {
    id: 'gateOut',
    name: 'Gate Out Operations',
    description: 'Process container gate-out operations',
    category: 'operations',
    requiredRole: ['admin', 'supervisor', 'operator'],
    isSystemModule: false
  },
  releases: {
    id: 'releases',
    name: 'Release Orders',
    description: 'Manage container release orders',
    category: 'operations',
    isSystemModule: false
  },
  edi: {
    id: 'edi',
    name: 'EDI Management',
    description: 'Electronic Data Interchange management',
    category: 'operations',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false
  },
  yard: {
    id: 'yard',
    name: 'Yard Management',
    description: 'Manage yard layout and container positions',
    category: 'operations',
    isSystemModule: false
  },
  clients: {
    id: 'clients',
    name: 'Client Management',
    description: 'Manage client information and relationships',
    category: 'management',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false
  },
  users: {
    id: 'users',
    name: 'User Management',
    description: 'Manage system users and permissions',
    category: 'admin',
    requiredRole: ['admin'],
    isSystemModule: false
  },
  moduleAccess: {
    id: 'moduleAccess',
    name: 'Module Access Control',
    description: 'Configure user access to system modules',
    category: 'admin',
    requiredRole: ['admin'],
    isSystemModule: true
  },
  reports: {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Generate reports and view analytics',
    category: 'management',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false
  },
  depotManagement: {
    id: 'depotManagement',
    name: 'Depot Management',
    description: 'Manage depot configurations and settings',
    category: 'admin',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false
  },
  timeTracking: {
    id: 'timeTracking',
    name: 'Time Tracking',
    description: 'Track operational times and performance',
    category: 'operations',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false
  },
  analytics: {
    id: 'analytics',
    name: 'Advanced Analytics',
    description: 'Advanced data analytics and insights',
    category: 'management',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false
  },
  clientPools: {
    id: 'clientPools',
    name: 'Client Pool Management',
    description: 'Manage client-specific container pools',
    category: 'management',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false
  },
  stackManagement: {
    id: 'stackManagement',
    name: 'Stack Management',
    description: 'Configure and manage yard stacks',
    category: 'operations',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false
  },
  auditLogs: {
    id: 'auditLogs',
    name: 'Audit Logs',
    description: 'View system audit logs and activity',
    category: 'admin',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: true
  },
  billingReports: {
    id: 'billingReports',
    name: 'Billing Reports',
    description: 'Generate billing and financial reports',
    category: 'management',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false
  },
  operationsReports: {
    id: 'operationsReports',
    name: 'Operations Reports',
    description: 'Generate operational performance reports',
    category: 'operations',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false
  }
};

// Mock users data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Administrator',
    email: 'admin@depot.com',
    role: 'admin',
    company: 'Container Depot Ltd',
    phone: '+1-555-1001',
    department: 'Administration',
    isActive: true,
    lastLogin: new Date('2025-01-11T08:30:00'),
    createdAt: new Date('2024-01-01'),
    createdBy: 'System',
    moduleAccess: {
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
    }
  },
  {
    id: '2',
    name: 'Jane Operator',
    email: 'operator@depot.com',
    role: 'operator',
    company: 'Container Depot Ltd',
    phone: '+1-555-1002',
    department: 'Operations',
    isActive: true,
    lastLogin: new Date('2025-01-11T07:15:00'),
    createdAt: new Date('2024-02-15'),
    createdBy: 'System',
    moduleAccess: {
      dashboard: true,
      containers: true,
      gateIn: true,
      gateOut: true,
      releases: true,
      edi: false,
      yard: true,
      clients: false,
      users: false,
      moduleAccess: false,
      reports: false,
      depotManagement: false,
      timeTracking: false,
      analytics: false,
      clientPools: false,
      stackManagement: false,
      auditLogs: true,
      billingReports: false,
      operationsReports: false
    }
  },
  {
    id: '3',
    name: 'Mike Supervisor',
    email: 'supervisor@depot.com',
    role: 'supervisor',
    company: 'Container Depot Ltd',
    phone: '+1-555-1003',
    department: 'Operations',
    isActive: true,
    lastLogin: new Date('2025-01-10T16:45:00'),
    createdAt: new Date('2024-01-20'),
    createdBy: 'System',
    moduleAccess: {
      dashboard: true,
      containers: true,
      gateIn: true,
      gateOut: true,
      releases: true,
      edi: true,
      yard: true,
      clients: true,
      users: false,
      moduleAccess: false,
      reports: true,
      depotManagement: true,
      timeTracking: true,
      analytics: true,
      clientPools: true,
      stackManagement: true,
      auditLogs: true,
      billingReports: true,
      operationsReports: true
    }
  },
  {
    id: '4',
    name: 'Sarah Client',
    email: 'client@shipping.com',
    role: 'client',
    company: 'Shipping Solutions Inc',
    phone: '+1-555-2001',
    department: 'Logistics',
    isActive: true,
    lastLogin: new Date('2025-01-09T14:20:00'),
    createdAt: new Date('2024-03-10'),
    createdBy: 'System',
    moduleAccess: {
      dashboard: true,
      containers: true,
      gateIn: false,
      gateOut: false,
      releases: true,
      edi: false,
      yard: true,
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
    }
  }
];

export const ModuleAccessManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>(''); // Single selection (radio behavior)
  const [bulkSelectedUserIds, setBulkSelectedUserIds] = useState<string[]>([]); // Bulk selection
  const [selectionMode, setSelectionMode] = useState<'single' | 'bulk'>('single'); // Selection mode toggle
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { user: currentUser, refreshUser } = useAuth();

  const canManageModuleAccess = currentUser?.role === 'admin';

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const allUsers = await userService.getAll();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users based on search and role
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  // Get modules by category
  const modulesByCategory = useMemo(() => {
    const categories: Record<string, ModulePermission[]> = {
      core: [],
      operations: [],
      management: [],
      admin: []
    };

    Object.values(moduleConfig).forEach(module => {
      categories[module.category].push(module);
    });

    return categories;
  }, []);

  // Filter modules by category
  const getFilteredModules = () => {
    if (categoryFilter === 'all') {
      return Object.values(moduleConfig);
    }
    return modulesByCategory[categoryFilter] || [];
  };

  const filteredModules = getFilteredModules();

  // Calculate statistics
  const stats = useMemo(() => {
    const totalUsers = filteredUsers.length;
    const totalModules = Object.keys(moduleConfig).length;
    const adminUsers = filteredUsers.filter(u => u.role === 'admin').length;
    const selectedUsers = selectionMode === 'single' ? (selectedUserId ? 1 : 0) : bulkSelectedUserIds.length;

    return { totalUsers, totalModules, adminUsers, selectedUsers };
  }, [filteredUsers, selectedUserId, bulkSelectedUserIds, selectionMode]);

  const getRoleIcon = (role: 'admin' | 'supervisor' | 'operator' | 'client') => {
    switch (role) {
      case 'admin':
        return <Crown className="h-5 w-5 text-red-600" />;
      case 'supervisor':
        return <Star className="h-5 w-5 text-orange-600" />;
      case 'operator':
        return <UserIcon className="h-5 w-5 text-blue-600" />;
      case 'client':
        return <UserIcon className="h-5 w-5 text-green-600" />;
      default:
        return <UserIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  // Single selection handler (radio button behavior)
  const handleSingleUserSelect = (userId: string) => {
    setSelectedUserId(prev => prev === userId ? '' : userId);
  };

  // Bulk selection handler (checkbox behavior)
  const handleBulkUserSelect = (userId: string) => {
    setBulkSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(prev => {
      const newMode = prev === 'single' ? 'bulk' : 'single';
      // Clear selections when switching modes
      if (newMode === 'single') {
        setBulkSelectedUserIds([]);
      } else {
        setSelectedUserId('');
      }
      return newMode;
    });
  };

  // Handle select all for bulk mode
  const handleSelectAllBulk = () => {
    if (bulkSelectedUserIds.length === filteredUsers.length) {
      setBulkSelectedUserIds([]);
    } else {
      setBulkSelectedUserIds(filteredUsers.map(u => u.id));
    }
  };

  const handleModuleToggle = async (moduleKey: keyof ModuleAccess) => {
    if (!currentUser) return;

    const targetUserIds = selectionMode === 'single'
      ? (selectedUserId ? [selectedUserId] : [])
      : bulkSelectedUserIds;

    if (targetUserIds.length === 0) return;

    setUsers(prevUsers =>
      prevUsers.map(user =>
        targetUserIds.includes(user.id)
          ? {
              ...user,
              moduleAccess: {
                ...user.moduleAccess,
                [moduleKey]: !user.moduleAccess[moduleKey]
              }
            }
          : user
      )
    );

    try {
      for (const userId of targetUserIds) {
        const user = users.find(u => u.id === userId);
        if (user) {
          const updatedAccess = {
            ...user.moduleAccess,
            [moduleKey]: !user.moduleAccess[moduleKey]
          };
          await moduleAccessService.setUserModuleAccess(userId, updatedAccess, currentUser.id);
        }
      }

      await loadUsers();

      if (targetUserIds.includes(currentUser.id)) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Error saving module access:', error);
      alert('Error saving module access changes');
    }
  };

  // Bulk actions handler
  const handleBulkActions = () => {
    if (bulkSelectedUserIds.length === 0) return;

    // Show bulk actions menu/modal
    const actions = [
      'Apply Role-Based Access',
      'Enable All Modules',
      'Disable All Modules',
      'Copy Access from Another User'
    ];

    const selectedAction = prompt(
      `Select bulk action for ${bulkSelectedUserIds.length} users:\n\n` +
      actions.map((action, index) => `${index + 1}. ${action}`).join('\n') +
      '\n\nEnter number (1-4):'
    );

    const actionIndex = parseInt(selectedAction || '0') - 1;
    if (actionIndex >= 0 && actionIndex < actions.length) {
      handleBulkAction(actions[actionIndex]);
    }
  };

  // Handle specific bulk actions
  const handleBulkAction = async (action: string) => {
    if (!currentUser) return;

    try {
      const updates: Array<{ userId: string; permissions: ModuleAccess }> = [];

      switch (action) {
        case 'Apply Role-Based Access':
          setUsers(prevUsers =>
            prevUsers.map(user =>
              bulkSelectedUserIds.includes(user.id)
                ? { ...user, moduleAccess: getModuleAccessForRole(user.role) }
                : user
            )
          );
          bulkSelectedUserIds.forEach(userId => {
            const user = users.find(u => u.id === userId);
            if (user) {
              updates.push({
                userId,
                permissions: getModuleAccessForRole(user.role)
              });
            }
          });
          break;

        case 'Enable All Modules':
          setUsers(prevUsers =>
            prevUsers.map(user =>
              bulkSelectedUserIds.includes(user.id)
                ? {
                    ...user,
                    moduleAccess: Object.keys(moduleConfig).reduce((acc, key) => ({
                      ...acc,
                      [key]: true
                    }), {} as ModuleAccess)
                  }
                : user
            )
          );
          bulkSelectedUserIds.forEach(userId => {
            updates.push({
              userId,
              permissions: Object.keys(moduleConfig).reduce((acc, key) => ({
                ...acc,
                [key]: true
              }), {} as ModuleAccess)
            });
          });
          break;

        case 'Disable All Modules':
          setUsers(prevUsers =>
            prevUsers.map(user =>
              bulkSelectedUserIds.includes(user.id)
                ? {
                    ...user,
                    moduleAccess: Object.keys(moduleConfig).reduce((acc, key) => ({
                      ...acc,
                      [key]: key === 'dashboard'
                    }), {} as ModuleAccess)
                  }
                : user
            )
          );
          bulkSelectedUserIds.forEach(userId => {
            updates.push({
              userId,
              permissions: Object.keys(moduleConfig).reduce((acc, key) => ({
                ...acc,
                [key]: key === 'dashboard'
              }), {} as ModuleAccess)
            });
          });
          break;

        default:
          alert('Action not implemented yet');
          return;
      }

      await moduleAccessService.batchUpdateModuleAccess(updates, currentUser.id);

      await loadUsers();

      if (bulkSelectedUserIds.includes(currentUser.id)) {
        await refreshUser();
      }

      alert(`Applied ${action} to ${bulkSelectedUserIds.length} users`);
    } catch (error) {
      console.error('Error applying bulk action:', error);
      alert('Error applying bulk action');
    }
  };

  // Helper function to get default module access based on role
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
        return Object.keys(baseAccess).reduce((acc, key) => ({
          ...acc,
          [key]: true
        }), {} as ModuleAccess);
        
      case 'supervisor':
        return {
          ...baseAccess,
          containers: true,
          gateIn: true,
          gateOut: true,
          releases: true,
          edi: true,
          yard: true,
          clients: true,
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

  const calculateAccessPercentage = (user: User): number => {
    const totalModules = Object.keys(moduleConfig).length;
    const accessibleModules = Object.values(user.moduleAccess).filter(Boolean).length;
    return Math.round((accessibleModules / totalModules) * 100);
  };

  const getModuleIcon = (moduleKey: keyof ModuleAccess) => {
    const iconMap = {
      dashboard: <Sparkles className="h-5 w-5" />,
      containers: <Shield className="h-5 w-5" />,
      gateIn: <Plus className="h-5 w-5" />,
      gateOut: <Zap className="h-5 w-5" />,
      releases: <Eye className="h-5 w-5" />,
      edi: <Settings className="h-5 w-5" />,
      yard: <Users className="h-5 w-5" />,
      clients: <UserIcon className="h-5 w-5" />,
      users: <Users className="h-5 w-5" />,
      moduleAccess: <Lock className="h-5 w-5" />,
      reports: <Award className="h-5 w-5" />,
      depotManagement: <Settings className="h-5 w-5" />,
      timeTracking: <Gem className="h-5 w-5" />,
      analytics: <Star className="h-5 w-5" />,
      clientPools: <Users className="h-5 w-5" />,
      stackManagement: <Settings className="h-5 w-5" />,
      auditLogs: <Eye className="h-5 w-5" />,
      billingReports: <Award className="h-5 w-5" />,
      operationsReports: <Star className="h-5 w-5" />
    };
    return iconMap[moduleKey] || <Settings className="h-5 w-5" />;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      core: 'from-blue-500 to-blue-600',
      operations: 'from-green-500 to-green-600',
      management: 'from-purple-500 to-purple-600',
      admin: 'from-red-500 to-red-600'
    };
    return colors[category as keyof typeof colors] || 'from-gray-500 to-gray-600';
  };

  if (!canManageModuleAccess) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to manage module access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Module Access Management</h2>
          <p className="text-sm lg:text-base text-gray-600 mt-1">Configure user permissions and module access</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3 lg:p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs lg:text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-lg lg:text-xl font-semibold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 lg:p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Settings className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs lg:text-sm font-medium text-gray-500">Available Modules</p>
              <p className="text-lg lg:text-xl font-semibold text-gray-900">{stats.totalModules}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 lg:p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Crown className="h-4 w-4 lg:h-5 lg:w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs lg:text-sm font-medium text-gray-500">Admin Users</p>
              <p className="text-lg lg:text-xl font-semibold text-gray-900">{stats.adminUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-3 lg:p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs lg:text-sm font-medium text-gray-500">Selected Users</p>
              <p className="text-lg lg:text-xl font-semibold text-gray-900">{stats.selectedUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 lg:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 lg:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="supervisor">Supervisor</option>
              <option value="operator">Operator</option>
              <option value="client">Client</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 lg:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="core">Core</option>
              <option value="operations">Operations</option>
              <option value="management">Management</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          </div>

          {/* Selection Mode Toggle and Bulk Actions */}
          <div className="flex items-center space-x-3">
            {/* Selection Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSelectionMode('single')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectionMode === 'single'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Single Select
              </button>
              <button
                onClick={() => setSelectionMode('bulk')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectionMode === 'bulk'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Bulk Select
              </button>
            </div>

            {/* Bulk Actions Button */}
            {selectionMode === 'bulk' && (
              <button
                onClick={handleBulkActions}
                disabled={bulkSelectedUserIds.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Settings className="h-4 w-4" />
                <span>Bulk Actions ({bulkSelectedUserIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        
        {/* Users Section */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base lg:text-lg font-semibold text-gray-900">Users</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {filteredUsers.length}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Selection Mode Indicator - Compact */}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      selectionMode === 'single' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {selectionMode === 'single' ? 'Single' : 'Bulk'}
                    </span>
                    
                    {/* Select All Button - Only in bulk mode */}
                    {selectionMode === 'bulk' && (
                      <button
                        onClick={handleSelectAllBulk}
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1 hover:bg-purple-50 rounded transition-colors"
                      >
                        {bulkSelectedUserIds.length === filteredUsers.length ? 'Clear' : 'All'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200 h-96 lg:h-[500px] overflow-y-auto scrollbar-none">
              {filteredUsers.map((user) => {
                // Determine if user is selected based on current mode
                const isSelected = selectionMode === 'single' 
                  ? selectedUserId === user.id
                  : bulkSelectedUserIds.includes(user.id);
                const accessPercentage = calculateAccessPercentage(user);

                return (
                  <button
                    key={user.id}
                    onClick={() => selectionMode === 'single' 
                      ? handleSingleUserSelect(user.id) 
                      : handleBulkUserSelect(user.id)
                    }
                    className={`w-full text-left p-3 lg:p-4 transition-all duration-200 hover:bg-gray-50 relative ${
                      isSelected 
                        ? selectionMode === 'single'
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : 'bg-purple-50 border-l-4 border-purple-500'
                        : 'border-l-4 border-transparent hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 lg:p-3 rounded-lg transition-all duration-200 flex-shrink-0 ${
                        isSelected 
                          ? selectionMode === 'single' 
                            ? 'bg-blue-100' 
                            : 'bg-purple-100'
                          : 'bg-gray-100'
                      }`}>
                        {getRoleIcon(user.role)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm lg:text-base font-medium text-gray-900 truncate">
                            {user.name}
                            </h4>
                            <p className="text-xs lg:text-sm text-gray-600 truncate mt-1">
                              {user.email}
                            </p>
                          </div>
                          
                          {/* Selection Indicator */}
                          <div className="flex-shrink-0 ml-2">
                            {isSelected && (
                              <div className={`text-white rounded-full p-1 animate-scale-in ${
                                selectionMode === 'single' ? 'bg-blue-500' : 'bg-purple-500'
                              }`}>
                                <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4" />
                              </div>
                            )}
                            {selectionMode === 'bulk' && !isSelected && (
                              <div className="border-2 border-gray-300 rounded-full p-1">
                                <div className="h-3 w-3 lg:h-4 lg:w-4"></div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">Module Access</span>
                            <span className="text-xs font-medium text-gray-700">
                              {Object.values(user.moduleAccess).filter(Boolean).length}/{Object.keys(moduleConfig).length}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 lg:h-2">
                            <div
                              className={`h-1.5 lg:h-2 rounded-full transition-all duration-300 ${
                                accessPercentage >= 80 ? 'bg-green-500' :
                                accessPercentage >= 60 ? 'bg-blue-500' :
                                accessPercentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${accessPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 lg:py-12">
                <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500">No users found</p>
              </div>
            )}
          </div>
        </div>

        {/* Module Access Configuration */}
        <div className="lg:col-span-8 xl:col-span-9">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div>
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900">Module Access Configuration</h3>
                  <p className="text-xs lg:text-sm text-gray-600">
                    {(selectionMode === 'single' ? selectedUserId : bulkSelectedUserIds.length > 0) 
                      ? `Configuring access for ${selectionMode === 'single' ? '1' : bulkSelectedUserIds.length} selected user${(selectionMode === 'single' ? 1 : bulkSelectedUserIds.length) !== 1 ? 's' : ''}`
                      : 'Select users to configure their module access'
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 lg:p-6 h-96 lg:h-[500px] overflow-y-auto scrollbar-none">
              {(selectionMode === 'single' ? !selectedUserId : bulkSelectedUserIds.length === 0) ? (
                <div className="text-center py-8 lg:py-12">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {selectionMode === 'single' ? 'No User Selected' : 'No Users Selected'}
                  </h3>
                  <p className="text-gray-600">
                    {selectionMode === 'single' 
                      ? 'Select a user from the left panel to configure their module access.'
                      : 'Select one or more users from the left panel to configure their module access.'
                    }
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={toggleSelectionMode}
                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                    >
                      Switch to {selectionMode === 'single' ? 'Bulk' : 'Single'} Selection Mode
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Selection Mode Info */}
                  <div className={`p-4 rounded-lg border ${
                    selectionMode === 'single' 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-purple-50 border-purple-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          selectionMode === 'single' ? 'bg-blue-600' : 'bg-purple-600'
                        } text-white`}>
                          {selectionMode === 'single' ? <UserIcon className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                        </div>
                        <div>
                          <h4 className={`font-medium ${
                            selectionMode === 'single' ? 'text-blue-900' : 'text-purple-900'
                          }`}>
                            {selectionMode === 'single' ? 'Single User Configuration' : 'Bulk User Configuration'}
                          </h4>
                          <p className={`text-sm ${
                            selectionMode === 'single' ? 'text-blue-700' : 'text-purple-700'
                          }`}>
                            {selectionMode === 'single' 
                              ? 'Configuring module access for 1 user'
                              : `Configuring module access for ${bulkSelectedUserIds.length} users`
                            }
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={toggleSelectionMode}
                        className="text-sm font-medium text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-white rounded-md transition-colors"
                      >
                        Switch to {selectionMode === 'single' ? 'Bulk' : 'Single'}
                      </button>
                    </div>
                  </div>

                  {/* Modules by Category */}
                  {Object.entries(modulesByCategory).map(([category, modules]) => {
                    if (categoryFilter !== 'all' && categoryFilter !== category) return null;
                    if (modules.length === 0) return null;

                    return (
                      <div key={category} className="space-y-3 lg:space-y-4">
                        <div className="flex items-center space-x-3">
                          <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${getCategoryColor(category)} text-white`}>
                            <span className="text-xs lg:text-sm font-medium capitalize">{category}</span>
                          </div>
                          <h4 className="text-sm lg:text-base font-semibold text-gray-900 capitalize">
                            {category} Modules
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
                          {modules.map((module) => {
                            const moduleKey = module.id as keyof ModuleAccess;
                            const targetUsers = selectionMode === 'single'
                              ? users.filter(u => u.id === selectedUserId)
                              : users.filter(u => bulkSelectedUserIds.includes(u.id));
                            const selectedUsers = targetUsers;
                            const enabledCount = selectedUsers.filter(u => u.moduleAccess[moduleKey]).length;
                            const allEnabled = enabledCount === selectedUsers.length;
                            const someEnabled = enabledCount > 0 && enabledCount < selectedUsers.length;

                            return (
                              <div
                                key={moduleKey}
                                className="bg-gray-50 rounded-lg border border-gray-200 p-3 lg:p-4 hover:shadow-md transition-all duration-200"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center space-x-2 lg:space-x-3 flex-1 min-w-0">
                                    <div className={`p-2 rounded-lg ${getCategoryColor(category)} bg-gradient-to-r`}>
                                      <div className="text-white">
                                        {getModuleIcon(moduleKey)}
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h5 className="text-xs lg:text-sm font-medium text-gray-900 truncate">
                                        {module.name}
                                      </h5>
                                      <p className="text-xs text-gray-600 truncate">
                                        {module.description}
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleModuleToggle(moduleKey)}
                                    className={`relative inline-flex h-5 w-9 lg:h-6 lg:w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-2 ${
                                      allEnabled ? 'bg-blue-600' : someEnabled ? 'bg-yellow-500' : 'bg-gray-200'
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-3 w-3 lg:h-4 lg:w-4 transform rounded-full bg-white transition-transform shadow-lg ${
                                        allEnabled ? 'translate-x-5 lg:translate-x-6' : someEnabled ? 'translate-x-2.5 lg:translate-x-3' : 'translate-x-1'
                                      }`}
                                    />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500">
                                    {enabledCount}/{selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
                                  </span>
                                  <div className="flex items-center space-x-1">
                                    {module.isSystemModule && (
                                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                        System
                                      </span>
                                    )}
                                    {module.requiredRole && (
                                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                        Role Restricted
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};