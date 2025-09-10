import React, { useState } from 'react';
import { Plus, Search, Filter, Edit, Eye, Trash2, User as UserIcon, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';
import { User, ModuleAccess } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { UserFormModal } from './UserFormModal';

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
    reports: false
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
        reports: true
      };
    case 'supervisor':
      return {
        ...baseAccess,
        containers: true,
        gateIn: true,
        gateOut: true,
        releases: true,
        edi: true,
        reports: true,
        users: true
      };
    case 'operator':
      return {
        ...baseAccess,
        containers: true,
        gateIn: true,
        gateOut: true,
        releases: true
      };
    case 'client':
      return {
        ...baseAccess,
        containers: true,
        releases: true
      };
    default:
      return baseAccess;
  }
};

// Mock data
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
    moduleAccess: getModuleAccessForRole('admin'),
    yardAssignments: []
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
    moduleAccess: getModuleAccessForRole('operator'),
    yardAssignments: []
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
    moduleAccess: getModuleAccessForRole('supervisor'),
    yardAssignments: []
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
    moduleAccess: getModuleAccessForRole('client'),
    yardAssignments: []
  },
  {
    id: '5',
    name: 'Bob Operator',
    email: 'bob.operator@depot.com',
    role: 'operator',
    company: 'Container Depot Ltd',
    phone: '+1-555-1004',
    department: 'Operations',
    isActive: false,
    lastLogin: new Date('2024-12-15T10:30:00'),
    createdAt: new Date('2024-06-01'),
    moduleAccess: getModuleAccessForRole('operator'),
    yardAssignments: []
  }
];


export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { user: currentUser } = useAuth();

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

  const handleSubmit = (userData: any) => {
    if (selectedUser) {
      // Edit existing user
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? {
        ...u,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        department: userData.department,
        company: userData.company,
        role: userData.role,
        yardAssignments: userData.yardAssignments,
        isActive: userData.isActive,
        moduleAccess: getModuleAccessForRole(userData.role)
      } : u));
    } else {
      // Create new user
      const newUser: User = {
        id: Date.now().toString(), // Simple ID generation
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        department: userData.department,
        company: userData.company,
        role: userData.role,
        yardAssignments: userData.yardAssignments,
        isActive: userData.isActive,
        createdAt: new Date(),
        moduleAccess: getModuleAccessForRole(userData.role)
      };
      setUsers(prev => [...prev, newUser]);
    }
    setShowForm(false);
    setSelectedUser(null);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowForm(true);
  };

  const handleView = (user: User) => {
    setSelectedUser(user);
    // In a real app, this would open a detailed view modal
    alert(`Viewing details for ${user.name}`);
  };

  const handleDelete = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, isActive: !u.isActive } : u
    ));
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
    const roleConfig = {
      admin: { color: 'bg-red-100 text-red-800', label: 'Administrator' },
      supervisor: { color: 'bg-orange-100 text-orange-800', label: 'Supervisor' },
      operator: { color: 'bg-blue-100 text-blue-800', label: 'Operator' },
      client: { color: 'bg-green-100 text-green-800', label: 'Client' }
    };

    const config = roleConfig[role];
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {getRoleIcon(role)}
        <span className="ml-1">{config.label}</span>
      </span>
    );
  };

  const formatLastLogin = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
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
                  const lastLogin = u.lastLogin;
                  return lastLogin &&
                    lastLogin.toDateString() === today.toDateString();
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
              {filteredUsers.map((user) => (
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
                      disabled={!canManageUsers}
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      } ${canManageUsers ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      {user.isActive ? (
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
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Form Modal */}
      <UserFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        selectedUser={selectedUser}
        onSubmit={handleSubmit}
      />
    </div>
  );
};
