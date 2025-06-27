import React, { useState } from 'react';
import { Shield, Users, Settings, Save, RotateCcw, Search, Filter, CheckCircle, XCircle, Plus, Edit, Trash2, UserPlus } from 'lucide-react';
import { User, ModuleAccess, ModulePermission } from '../../types';
import { useAuth } from '../../hooks/useAuth';

// Available modules configuration
const availableModules: ModulePermission[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Main dashboard with statistics and overview',
    category: 'core',
    isSystemModule: true
  },
  {
    id: 'containers',
    name: 'Container Management',
    description: 'View and manage container inventory',
    category: 'operations',
    requiredRole: ['admin', 'supervisor', 'operator'],
    isSystemModule: false
  },
  {
    id: 'gateIn',
    name: 'Gate In Operations',
    description: 'Process container gate-in operations',
    category: 'operations',
    requiredRole: ['admin', 'supervisor', 'operator'],
    isSystemModule: false
  },
  {
    id: 'gateOut',
    name: 'Gate Out Operations',
    description: 'Process container gate-out operations',
    category: 'operations',
    requiredRole: ['admin', 'supervisor', 'operator'],
    isSystemModule: false
  },
  {
    id: 'releases',
    name: 'Release Orders',
    description: 'Manage container release orders',
    category: 'operations',
    requiredRole: ['admin', 'supervisor', 'operator'],
    isSystemModule: false
  },
  {
    id: 'edi',
    name: 'EDI Management',
    description: 'Electronic Data Interchange management',
    category: 'operations',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false
  },
  {
    id: 'yard',
    name: 'Yard Management',
    description: '3D yard visualization and management',
    category: 'management',
    requiredRole: ['admin', 'supervisor', 'operator'],
    isSystemModule: false
  },
  {
    id: 'clients',
    name: 'Client Master Data',
    description: 'Manage client information and contracts',
    category: 'management',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false
  },
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage system users and their roles',
    category: 'admin',
    requiredRole: ['admin'],
    isSystemModule: false
  },
  {
    id: 'moduleAccess',
    name: 'Module Access Management',
    description: 'Control user access to system modules',
    category: 'admin',
    requiredRole: ['admin'],
    isSystemModule: true
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Generate reports and view analytics',
    category: 'management',
    requiredRole: ['admin', 'supervisor'],
    isSystemModule: false
  }
];

// Mock users data with module access
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
      reports: true
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
      reports: false
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
      reports: true
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
      reports: false
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
  const { user: currentUser } = useAuth();

  const canManageModuleAccess = currentUser?.role === 'admin';

  if (!canManageModuleAccess) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to manage module access.</p>
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
      reports: true
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
      reports: ['admin', 'supervisor'].includes(user.role)
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
          reports: true
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
          reports: ['admin', 'supervisor'].includes(user.role)
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
    // In a real application, this would save to the backend
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

  const getModuleIcon = (category: string) => {
    switch (category) {
      case 'core': return '🏠';
      case 'operations': return '⚙️';
      case 'management': return '📊';
      case 'admin': return '🔐';
      default: return '📋';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core': return 'bg-blue-100 text-blue-800';
      case 'operations': return 'bg-green-100 text-green-800';
      case 'management': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccessCount = (moduleId: keyof ModuleAccess) => {
    return users.filter(user => user.moduleAccess[moduleId]).length;
  };

  const getRoleBadgeColor = (role: User['role']) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'supervisor': return 'bg-orange-100 text-orange-800';
      case 'operator': return 'bg-blue-100 text-blue-800';
      case 'client': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Module Access Management</h2>
          <p className="text-gray-600 mt-1">Control which modules users can access based on their roles and permissions</p>
        </div>
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <>
              <button
                onClick={handleResetChanges}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </button>
              <button
                onClick={handleSaveChanges}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </button>
            </>
          )}
          <button
            onClick={() => setShowBulkActions(!showBulkActions)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              showBulkActions 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Bulk Actions</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
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
              <Settings className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Available Modules</p>
              <p className="text-lg font-semibold text-gray-900">{availableModules.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Admin Users</p>
              <p className="text-lg font-semibold text-gray-900">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Selected Users</p>
              <p className="text-lg font-semibold text-gray-900">{selectedUsers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {showBulkActions && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-purple-900">Bulk Actions</h3>
            <span className="text-sm text-purple-700">
              {selectedUsers.length > 0 ? `${selectedUsers.length} users selected` : 'All users will be affected'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleBulkRoleBasedAccess}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>Apply Role-Based Access</span>
            </button>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkModuleToggle('containers', true)}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Enable Containers
              </button>
              <button
                onClick={() => handleBulkModuleToggle('containers', false)}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Disable Containers
              </button>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkModuleToggle('reports', true)}
                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Enable Reports
              </button>
              <button
                onClick={() => handleBulkModuleToggle('reports', false)}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Disable Reports
              </button>
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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="core">Core</option>
              <option value="operations">Operations</option>
              <option value="management">Management</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSelectAllUsers}
              className="text-sm px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              {selectedUsers.length === filteredUsers.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List with custom scrollbar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Users</h3>
            </div>
            <div className="max-h-96 overflow-y-auto scrollbar-primary">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                    selectedUser?.id === user.id
                      ? 'bg-blue-50 border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div onClick={() => setSelectedUser(user)} className="flex-1">
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </span>
                          {user.role === 'admin' && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              Full Access
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {Object.values(user.moduleAccess).filter(Boolean).length}/{Object.keys(user.moduleAccess).length}
                      </div>
                      <div className="text-xs text-gray-500">modules</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Module Access Matrix with custom scrollbar */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedUser ? `Module Access - ${selectedUser.name}` : 'Module Access Overview'}
                </h3>
                {selectedUser && (
                  <div className="flex items-center space-x-2">
                    {selectedUser.role === 'admin' && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                        Admin - Full Access
                      </span>
                    )}
                    <button
                      onClick={() => handleRoleBasedAccess(selectedUser.id)}
                      className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Apply Role-Based Access
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 max-h-96 overflow-y-auto scrollbar-success">
              {selectedUser ? (
                // Individual user module access
                <div className="space-y-4">
                  {filteredModules.map((module) => {
                    const isEnabled = selectedUser.moduleAccess[module.id as keyof ModuleAccess];
                    const isAllowed = !module.requiredRole || module.requiredRole.includes(selectedUser.role);
                    const isAdminProtected = selectedUser.role === 'admin' && ['dashboard', 'moduleAccess'].includes(module.id);
                    
                    return (
                      <div
                        key={module.id}
                        className={`p-4 border rounded-lg ${
                          isEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{getModuleIcon(module.category)}</span>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{module.name}</span>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(module.category)}`}>
                                  {module.category}
                                </span>
                                {module.isSystemModule && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                                    System
                                  </span>
                                )}
                                {isAdminProtected && (
                                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-600">
                                    Protected
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">{module.description}</div>
                              {module.requiredRole && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Required roles: {module.requiredRole.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {!isAllowed && (
                              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                                Role Restricted
                              </span>
                            )}
                            <button
                              onClick={() => handleModuleToggle(selectedUser.id, module.id as keyof ModuleAccess)}
                              disabled={isAdminProtected || !isAllowed}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                isEnabled ? 'bg-green-600' : 'bg-gray-200'
                              } ${
                                isAdminProtected || !isAllowed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Overview of all modules and user access
                <div className="space-y-4">
                  {filteredModules.map((module) => (
                    <div key={module.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getModuleIcon(module.category)}</span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">{module.name}</span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(module.category)}`}>
                                {module.category}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">{module.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {getAccessCount(module.id as keyof ModuleAccess)}/{users.length}
                          </div>
                          <div className="text-xs text-gray-500">users</div>
                        </div>
                      </div>
                      
                      {!module.isSystemModule && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleBulkModuleToggle(module.id as keyof ModuleAccess, true)}
                            className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            Enable All
                          </button>
                          <button
                            onClick={() => handleBulkModuleToggle(module.id as keyof ModuleAccess, false)}
                            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            Disable All
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};