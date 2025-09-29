import React, { useState } from 'react';
import { Shield, Users, Settings, Save, RotateCcw, Search, Filter, CheckCircle, XCircle, Plus, CreditCard as Edit, Trash2, UserPlus, Sparkles, Zap, Lock, Unlock, Eye, EyeOff, Star, Award, Crown, Gem, User } from 'lucide-react';
import type { ModuleAccess, ModulePermission } from '../../types';
import type { User } from '../../types';
import { useAuth } from '../../hooks/useAuth';

// Enhanced module configuration with beautiful icons and colors
const availableModules: (ModulePermission & { icon: any; color: string; gradient: string })[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard with statistics and overview',
    category: 'core',
    isSystemModule: true,
    icon: Sparkles,
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'containers',
    name: 'Container Management',
    description: 'View and manage container inventory',
    category: 'operations',
    requiredRole: ['admin', 'supervisor', 'operator'],
    isSystemModule: false,
    icon: Shield,
    color: 'text-emerald-600',
    gradient: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'gateIn',
    name: 'Gate In Operations',
    description: 'Process container gate-in operations',
    category: 'operations',
    requiredRole: ['admin', 'supervisor', 'operator'],
    isSystemModule: false,
    icon: Plus,
    color: 'text-green-600',
    gradient: 'from-green-500 to-emerald-600'
  },
  {
    id: 'gateOut',
    name: 'Gate Out Operations',
    description: 'Process container gate-out operations',
    category: 'operations',
    requiredRole: ['admin', 'supervisor', 'operator'],
    isSystemModule: false,
    icon: Edit,
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-cyan-600'
  },
  {
    id: 'releases',
    name: 'Release Orders',
    description: 'Manage container release orders',
    category: 'operations',
    requiredRole: ['admin', 'supervisor', 'operator'],
    isSystemModule: false,
    icon: Zap,
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-violet-600'
  },
  {
    id: 'edi',
    name: 'EDI Management',
    description: 'Electronic Data Interchange management',
    category: 'operations',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false,
    icon: Settings,
    color: 'text-orange-600',
    gradient: 'from-orange-500 to-red-600'
  },
  {
    id: 'timeTracking',
    name: 'Time & Date Tracking',
    description: 'Manual date/time entry for Gate In/Out operations',
    category: 'admin',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false,
    icon: Award,
    color: 'text-pink-600',
    gradient: 'from-pink-500 to-rose-600'
  },
  {
    id: 'yard',
    name: 'Yard Management',
    description: '3D yard visualization and management',
    category: 'management',
    requiredRole: ['admin', 'supervisor', 'operator'],
    isSystemModule: false,
    icon: Star,
    color: 'text-indigo-600',
    gradient: 'from-indigo-500 to-purple-600'
  },
  {
    id: 'clients',
    name: 'Client Master Data',
    description: 'Manage client information and contracts',
    category: 'management',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false,
    icon: Users,
    color: 'text-teal-600',
    gradient: 'from-teal-500 to-cyan-600'
  },
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage system users and their roles',
    category: 'admin',
    requiredRole: ['admin'],
    isSystemModule: false,
    icon: Crown,
    color: 'text-red-600',
    gradient: 'from-red-500 to-pink-600'
  },
  {
    id: 'moduleAccess',
    name: 'Module Access Management',
    description: 'Control user access to system modules',
    category: 'admin',
    requiredRole: ['admin'],
    isSystemModule: true,
    icon: Gem,
    color: 'text-violet-600',
    gradient: 'from-violet-500 to-purple-600'
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Generate reports and view analytics',
    category: 'management',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false,
    icon: Eye,
    color: 'text-amber-600',
    gradient: 'from-amber-500 to-orange-600'
  }
];

// Enhanced mock users data
const mockUsersWithAccess: User[] = [
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
  const [users, setUsers] = useState<User[]>(mockUsersWithAccess);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [hasChanges, setHasChanges] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'detailed'>('grid');
  const { user: currentUser } = useAuth();

  const canManageModuleAccess = currentUser?.role === 'admin';

  if (!canManageModuleAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center p-12 bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">Access Restricted</h3>
          <p className="text-gray-600 leading-relaxed">You don't have permission to manage module access. Contact your administrator for assistance.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredModules = availableModules.filter(module => {
    return categoryFilter === 'all' || module.category === categoryFilter;
  });

  const handleModuleToggle = (userId: string, moduleId: keyof ModuleAccess) => {
    const targetUser = users.find(u => u.id === userId);
    
    // Prevent removing admin access from admin users for critical modules
    if (targetUser?.role === 'admin' && ['dashboard', 'moduleAccess'].includes(moduleId)) {
      alert('Cannot remove critical module access from admin users');
      return;
    }

    setUsers(prev => prev.map(user => {
      if (user.id === userId) {
        const updatedUser = {
          ...user,
          moduleAccess: {
            ...user.moduleAccess,
            [moduleId]: !user.moduleAccess[moduleId]
          }
        };
        
        // Update selected user if it's the same user
        if (selectedUser?.id === userId) {
          setSelectedUser(updatedUser);
        }
        
        return updatedUser;
      }
      return user;
    }));
    setHasChanges(true);
  };

  const handleBulkModuleToggle = (moduleId: keyof ModuleAccess, enabled: boolean) => {
    const targetUsers = selectedUsers.length > 0 ? selectedUsers : users.map(u => u.id);
    
    setUsers(prev => prev.map(user => {
      if (targetUsers.includes(user.id)) {
        // Prevent removing critical access from admins
        if (user.role === 'admin' && !enabled && ['dashboard', 'moduleAccess'].includes(moduleId)) {
          return user;
        }
        
        return {
          ...user,
          moduleAccess: {
            ...user.moduleAccess,
            [moduleId]: enabled
          }
        };
      }
      return user;
    }));
    setHasChanges(true);
  };

  const handleRoleBasedAccess = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Admin users always get full access
    const roleBasedAccess: ModuleAccess = user.role === 'admin' ? {
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
    } : {
      dashboard: true, // Always enabled
      containers: ['admin', 'supervisor', 'operator'].includes(user.role),
      gateIn: ['admin', 'supervisor', 'operator'].includes(user.role),
      gateOut: ['admin', 'supervisor', 'operator'].includes(user.role),
      releases: ['admin', 'supervisor', 'operator'].includes(user.role),
      edi: ['admin', 'supervisor'].includes(user.role),
      yard: ['admin', 'supervisor', 'operator'].includes(user.role),
      clients: ['admin', 'supervisor'].includes(user.role),
      users: user.role === 'admin',
      moduleAccess: user.role === 'admin',
      reports: ['admin', 'supervisor'].includes(user.role),
      depotManagement: ['admin', 'supervisor'].includes(user.role),
      timeTracking: user.role === 'admin',
      analytics: ['admin', 'supervisor'].includes(user.role),
      clientPools: ['admin', 'supervisor'].includes(user.role),
      stackManagement: ['admin', 'supervisor'].includes(user.role),
      auditLogs: ['admin', 'supervisor', 'operator'].includes(user.role),
      billingReports: ['admin', 'supervisor'].includes(user.role),
      operationsReports: ['admin', 'supervisor'].includes(user.role)
    };

    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, moduleAccess: roleBasedAccess } : u
    ));
    
    if (selectedUser?.id === userId) {
      setSelectedUser(prev => prev ? { ...prev, moduleAccess: roleBasedAccess } : null);
    }
    
    setHasChanges(true);
  };

  const handleBulkRoleBasedAccess = () => {
    const targetUsers = selectedUsers.length > 0 ? selectedUsers : users.map(u => u.id);
    
    setUsers(prev => prev.map(user => {
      if (targetUsers.includes(user.id)) {
        const roleBasedAccess: ModuleAccess = user.role === 'admin' ? {
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
        } : {
          dashboard: true,
          containers: ['admin', 'supervisor', 'operator'].includes(user.role),
          gateIn: ['admin', 'supervisor', 'operator'].includes(user.role),
          gateOut: ['admin', 'supervisor', 'operator'].includes(user.role),
          releases: ['admin', 'supervisor', 'operator'].includes(user.role),
          edi: ['admin', 'supervisor'].includes(user.role),
          yard: ['admin', 'supervisor', 'operator'].includes(user.role),
          clients: ['admin', 'supervisor'].includes(user.role),
          users: user.role === 'admin',
          moduleAccess: user.role === 'admin',
          reports: ['admin', 'supervisor'].includes(user.role),
          depotManagement: ['admin', 'supervisor'].includes(user.role),
          timeTracking: user.role === 'admin',
          analytics: ['admin', 'supervisor'].includes(user.role),
          clientPools: ['admin', 'supervisor'].includes(user.role),
          stackManagement: ['admin', 'supervisor'].includes(user.role),
          auditLogs: ['admin', 'supervisor', 'operator'].includes(user.role),
          billingReports: ['admin', 'supervisor'].includes(user.role),
          operationsReports: ['admin', 'supervisor'].includes(user.role)
        };
        
        return { ...user, moduleAccess: roleBasedAccess };
      }
      return user;
    }));
    
    setHasChanges(true);
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const handleSaveChanges = () => {
    console.log('Saving module access changes:', users);
    setHasChanges(false);
    setSelectedUsers([]);
    alert('Module access permissions saved successfully!');
  };

  const handleResetChanges = () => {
    setUsers(mockUsersWithAccess);
    setSelectedUser(null);
    setSelectedUsers([]);
    setHasChanges(false);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core': return 'from-blue-500 to-indigo-600';
      case 'operations': return 'from-emerald-500 to-teal-600';
      case 'management': return 'from-purple-500 to-violet-600';
      case 'admin': return 'from-red-500 to-pink-600';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'core': return Sparkles;
      case 'operations': return Zap;
      case 'management': return Star;
      case 'admin': return Crown;
      default: return Shield;
    }
  };

  const getAccessCount = (moduleId: keyof ModuleAccess) => {
    return users.filter(user => user.moduleAccess[moduleId]).length;
  };

  const getRoleBadgeColor = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'from-red-500 to-pink-600';
      case 'supervisor': return 'from-orange-500 to-amber-600';
      case 'operator': return 'from-blue-500 to-indigo-600';
      case 'client': return 'from-green-500 to-emerald-600';
      default: return 'from-gray-500 to-slate-600';
    }
  };

  const getRoleIcon = (role: 'admin' | 'supervisor' | 'operator' | 'client') => {
    switch (role) {
      case 'admin': return Crown;
      case 'supervisor': return Award;
      case 'operator': return Users;
      case 'client': return User;
      default: return Users;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-white rounded-3xl shadow-2xl border border-gray-100">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
          <div className="relative p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Module Access Control
                  </h1>
                  <p className="text-gray-600 mt-2 text-lg">
                    Manage user permissions and module access across the system
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {hasChanges && (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleResetChanges}
                      className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium border border-gray-200 hover:shadow-lg"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Reset</span>
                    </button>
                    <button
                      onClick={handleSaveChanges}
                      className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                    showBulkActions 
                      ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Bulk Actions</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { 
              icon: Users, 
              label: 'Total Users', 
              value: users.length, 
              gradient: 'from-blue-500 to-indigo-600',
              bgGradient: 'from-blue-50 to-indigo-50'
            },
            { 
              icon: Settings, 
              label: 'Available Modules', 
              value: availableModules.length, 
              gradient: 'from-emerald-500 to-teal-600',
              bgGradient: 'from-emerald-50 to-teal-50'
            },
            { 
              icon: Crown, 
              label: 'Admin Users', 
              value: users.filter(u => u.role === 'admin').length, 
              gradient: 'from-red-500 to-pink-600',
              bgGradient: 'from-red-50 to-pink-50'
            },
            { 
              icon: CheckCircle, 
              label: 'Selected Users', 
              value: selectedUsers.length, 
              gradient: 'from-purple-500 to-violet-600',
              bgGradient: 'from-purple-50 to-violet-50'
            }
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className={`relative overflow-hidden bg-gradient-to-br ${stat.bgGradient} rounded-2xl p-6 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`w-14 h-14 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-white/10 rounded-full"></div>
              </div>
            );
          })}
        </div>

        {/* Enhanced Search and Filters */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 w-full md:w-80 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                />
              </div>
              
              <div className="flex space-x-3">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white font-medium"
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
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white font-medium"
                >
                  <option value="all">All Categories</option>
                  <option value="core">Core Modules</option>
                  <option value="operations">Operations</option>
                  <option value="management">Management</option>
                  <option value="admin">Administration</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'grid'
                      ? 'bg-white text-gray-900 shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Grid View
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'detailed'
                      ? 'bg-white text-gray-900 shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Detailed View
                </button>
              </div>
              
              <button
                onClick={handleSelectAllUsers}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium border border-gray-200"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Bulk Actions Panel */}
        {showBulkActions && (
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-purple-900">Bulk Actions</h3>
                  <p className="text-purple-700">
                    {selectedUsers.length > 0 ? `${selectedUsers.length} users selected` : 'All users will be affected'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={handleBulkRoleBasedAccess}
                className="flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <UserPlus className="h-5 w-5" />
                <span>Apply Role-Based Access</span>
              </button>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkModuleToggle('containers', true)}
                  className="flex-1 px-4 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Unlock className="h-4 w-4 mx-auto mb-1" />
                  Enable Containers
                </button>
                <button
                  onClick={() => handleBulkModuleToggle('containers', false)}
                  className="flex-1 px-4 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Lock className="h-4 w-4 mx-auto mb-1" />
                  Disable Containers
                </button>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkModuleToggle('reports', true)}
                  className="flex-1 px-4 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Eye className="h-4 w-4 mx-auto mb-1" />
                  Enable Reports
                </button>
                <button
                  onClick={() => handleBulkModuleToggle('reports', false)}
                  className="flex-1 px-4 py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <EyeOff className="h-4 w-4 mx-auto mb-1" />
                  Disable Reports
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Enhanced User List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Users</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    {filteredUsers.length} users
                  </span>
                </div>
              </div>
              
              <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
                {filteredUsers.map((user) => {
                  const RoleIcon = getRoleIcon(user.role);
                  const accessCount = Object.values(user.moduleAccess).filter(Boolean).length;
                  const totalModules = Object.keys(user.moduleAccess).length;
                  const accessPercentage = (accessCount / totalModules) * 100;
                  
                  return (
                    <div
                      key={user.id}
                      className={`p-6 border-b border-gray-50 cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 ${
                        selectedUser?.id === user.id
                          ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-lg"
                          />
                          
                          <div onClick={() => setSelectedUser(user)} className="flex items-center space-x-4 flex-1">
                            <div className={`w-12 h-12 bg-gradient-to-br ${getRoleBadgeColor(user.role)} rounded-xl flex items-center justify-center shadow-lg`}>
                              <RoleIcon className="h-6 w-6 text-white" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="font-bold text-gray-900">{user.name}</div>
                              <div className="text-sm text-gray-600">{user.email}</div>
                              <div className="flex items-center space-x-2 mt-2">
                                <span className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r ${getRoleBadgeColor(user.role)} text-white shadow-md`}>
                                  {user.role.toUpperCase()}
                                </span>
                                {user.role === 'admin' && (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md">
                                    <Crown className="h-3 w-3 mr-1" />
                                    Full Access
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">{accessCount}/{totalModules}</div>
                          <div className="text-xs text-gray-500 mb-2">modules</div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full bg-gradient-to-r ${
                                accessPercentage >= 80 ? 'from-green-500 to-emerald-600' :
                                accessPercentage >= 50 ? 'from-blue-500 to-indigo-600' :
                                accessPercentage >= 25 ? 'from-yellow-500 to-orange-600' :
                                'from-red-500 to-pink-600'
                              }`}
                              style={{ width: `${accessPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Enhanced Module Access Matrix */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {selectedUser ? `${selectedUser.name}'s Access` : 'Module Access Overview'}
                      </h3>
                      <p className="text-gray-600">
                        {selectedUser ? 'Configure individual module permissions' : 'System-wide module access overview'}
                      </p>
                    </div>
                  </div>
                  
                  {selectedUser && (
                    <div className="flex items-center space-x-3">
                      {selectedUser.role === 'admin' && (
                        <span className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-sm font-bold rounded-xl shadow-lg">
                          <Crown className="h-4 w-4 inline mr-2" />
                          Admin - Full Access
                        </span>
                      )}
                      <button
                        onClick={() => handleRoleBasedAccess(selectedUser.id)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                      >
                        <Zap className="h-4 w-4" />
                        <span>Auto-Configure</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 max-h-[600px] overflow-y-auto scrollbar-thin">
                {selectedUser ? (
                  // Individual user module access with beautiful cards
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredModules.map((module) => {
                      const isEnabled = selectedUser.moduleAccess[module.id as keyof ModuleAccess];
                      const isAllowed = !module.requiredRole || module.requiredRole.includes(selectedUser.role);
                      const isAdminProtected = selectedUser.role === 'admin' && ['dashboard', 'moduleAccess'].includes(module.id);
                      const Icon = module.icon;
                      
                      return (
                        <div
                          key={module.id}
                          className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                            isEnabled 
                              ? `border-transparent bg-gradient-to-br ${module.gradient} shadow-xl` 
                              : 'border-gray-200 bg-white hover:border-gray-300 shadow-lg hover:shadow-xl'
                          }`}
                        >
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                                  isEnabled 
                                    ? 'bg-white/20 backdrop-blur-sm' 
                                    : `bg-gradient-to-br ${module.gradient}`
                                }`}>
                                  <Icon className={`h-6 w-6 ${isEnabled ? 'text-white' : 'text-white'}`} />
                                </div>
                                <div>
                                  <div className={`font-bold text-lg ${isEnabled ? 'text-white' : 'text-gray-900'}`}>
                                    {module.name}
                                  </div>
                                  <div className={`text-sm ${isEnabled ? 'text-white/80' : 'text-gray-600'}`}>
                                    {module.description}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                  isEnabled 
                                    ? 'bg-white/20 text-white backdrop-blur-sm' 
                                    : `bg-gradient-to-r ${getCategoryColor(module.category)} text-white`
                                }`}>
                                  {module.category.toUpperCase()}
                                </span>
                                
                                {module.isSystemModule && (
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    isEnabled ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    System
                                  </span>
                                )}
                                
                                {isAdminProtected && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-400 text-yellow-900">
                                    <Lock className="h-3 w-3 inline mr-1" />
                                    Protected
                                  </span>
                                )}
                              </div>
                              
                              {!isAdminProtected && isAllowed && (
                                <button
                                  onClick={() => handleModuleToggle(selectedUser.id, module.id as keyof ModuleAccess)}
                                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-300 shadow-lg ${
                                    isEnabled 
                                      ? 'bg-white/30 backdrop-blur-sm' 
                                      : 'bg-gray-200 hover:bg-gray-300'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow-md ${
                                      isEnabled ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                                  />
                                  {isEnabled && (
                                    <CheckCircle className="absolute right-1 h-4 w-4 text-white" />
                                  )}
                                </button>
                              )}
                              
                              {!isAllowed && (
                                <span className="text-xs bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium">
                                  <Lock className="h-3 w-3 inline mr-1" />
                                  Role Restricted
                                </span>
                              )}
                            </div>
                            
                            {module.requiredRole && (
                              <div className={`text-xs mt-3 ${isEnabled ? 'text-white/70' : 'text-gray-500'}`}>
                                Required roles: {module.requiredRole.join(', ')}
                              </div>
                            )}
                          </div>
                          
                          {/* Decorative elements */}
                          <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full"></div>
                          <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-white/5 rounded-full"></div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Enhanced overview of all modules with beautiful cards
                  <div className="space-y-6">
                    {['core', 'operations', 'management', 'admin'].map(category => {
                      const categoryModules = filteredModules.filter(m => m.category === category);
                      if (categoryModules.length === 0) return null;
                      
                      const CategoryIcon = getCategoryIcon(category);
                      
                      return (
                        <div key={category} className="space-y-4">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className={`w-10 h-10 bg-gradient-to-br ${getCategoryColor(category)} rounded-xl flex items-center justify-center shadow-lg`}>
                              <CategoryIcon className="h-5 w-5 text-white" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 capitalize">{category} Modules</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {categoryModules.map((module) => {
                              const Icon = module.icon;
                              const accessCount = getAccessCount(module.id as keyof ModuleAccess);
                              const accessPercentage = (accessCount / users.length) * 100;
                              
                              return (
                                <div key={module.id} className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                      <div className={`w-10 h-10 bg-gradient-to-br ${module.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                                        <Icon className="h-5 w-5 text-white" />
                                      </div>
                                      <div>
                                        <div className="font-bold text-gray-900">{module.name}</div>
                                        <div className="text-sm text-gray-600">{module.description}</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-gray-700">User Access</span>
                                    <span className="text-lg font-bold text-gray-900">{accessCount}/{users.length}</span>
                                  </div>
                                  
                                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                                    <div
                                      className={`h-3 rounded-full bg-gradient-to-r ${
                                        accessPercentage >= 75 ? 'from-green-500 to-emerald-600' :
                                        accessPercentage >= 50 ? 'from-blue-500 to-indigo-600' :
                                        accessPercentage >= 25 ? 'from-yellow-500 to-orange-600' :
                                        'from-red-500 to-pink-600'
                                      } shadow-md`}
                                      style={{ width: `${accessPercentage}%` }}
                                    ></div>
                                  </div>
                                  
                                  {!module.isSystemModule && (
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => handleBulkModuleToggle(module.id as keyof ModuleAccess, true)}
                                        className="flex-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 text-xs font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                      >
                                        <Unlock className="h-3 w-3 inline mr-1" />
                                        Enable All
                                      </button>
                                      <button
                                        onClick={() => handleBulkModuleToggle(module.id as keyof ModuleAccess, false)}
                                        className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-200 text-xs font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                                      >
                                        <Lock className="h-3 w-3 inline mr-1" />
                                        Disable All
                                      </button>
                                    </div>
                                  )}
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

        {/* Enhanced Quick Actions Footer */}
        {selectedUser && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${getRoleBadgeColor(selectedUser.role)} rounded-xl flex items-center justify-center shadow-lg`}>
                  {React.createElement(getRoleIcon(selectedUser.role), { className: "h-6 w-6 text-white" })}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Quick Actions for {selectedUser.name}</h4>
                  <p className="text-gray-600">Manage permissions and access levels</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all duration-200 font-medium"
                >
                  Clear Selection
                </button>
                <button
                  onClick={() => handleRoleBasedAccess(selectedUser.id)}
                  className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Apply Role Defaults</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};